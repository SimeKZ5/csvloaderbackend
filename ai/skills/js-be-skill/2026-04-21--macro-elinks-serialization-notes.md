# Macro ELINKS Serialization Notes

Date: 2026-04-21

## Context Reviewed

- `CorpuElectronLoader/ai/skills/frontend-apple-blue/SKILL.md`
- `CorpuElectronLoader/ai/skills/frontend-apple-clone/SKILL.md`
- `csvloaderbackend/ai/skills/js-be-skill/SKILL.md`
- `C:\Users\Domagoj\Desktop\New Tekstni dokument.txt`
- `C:\Users\Domagoj\Desktop\DaskaBezMakro.S3D`
- `C:\Users\Domagoj\Desktop\DaskaSaMakro.S3D`

## Key Findings

- The relevant backend convention source is `js-be-skill` and the requested change belongs in `csvloaderbackend` only.
- The critical S3D delta between provided files is the presence of `<ELINKS>` inside each `<ELEMENT>` when macro is applied.
- `C6DAT` is compressed (deflate + base64), not encrypted.
- `MSMA` uses plain `DAT` payload (not compressed).
- Multi-line C6DAT values in S3D should use `&#xA;` line-break entities.

## Implemented Backend Feature

### 1) Pure serializer utility

Added `utils/macroElinksSerializer.js` with:

- XML attribute escape/unescape helpers
- C6DAT encode/decode helpers (deflate + base64)
- Object and INI-style normalization helpers
- Builders for:
  - `MM1/MSVA`
  - `MM1/MSJO`
  - `MM1/MSMA`
  - nested `MAK` nodes (`MSVA`, `MSFO`, `MSJO`, `MSRA[]`, `MSPO[]`)
  - full `ELINKS` document
- INI section parser to transform `.CMK` text into serializer input structure

### 2) convertDaske path

Updated `controllers/convertDaskeValueToS3D.js`:

- Reads macro folder path from request:
  - `macroFolderPath`
  - fallback `pathToMakrosFolder`
  - fallback default `C:\CorpusSoftware\CorpusSolutions\Makro`
- Resolves board macro from row fields (`macro_cmk`, `macro`, `MACRO`, `makro`)
- Loads selected `.CMK`, serializes to ELINKS XML, injects under corresponding `<ELEMENT>`
- If macro is misspelled:
  - finds closest `.CMK` using Levenshtein distance
  - writes suggestion into board notes (`PRIMJEDBALIST` via note aggregation)
- Keeps existing CNC behavior and uses resolved macro filename as fallback for `PROGRAM` when `cnc_1` is empty

### 3) Excel upload path

Updated `controllers/excelConverterController.js`:

- Reads macro folder path with same fallback chain
- Detects `MACRO`/`MAKRO` column in Excel header region (up to `startRow`)
- Resolves macro per row from selected mapping key `MACRO` or detected column
- Injects ELINKS per board when macro exists
- On misspelling, appends closest-match suggestion to notes
- Uses macro file as fallback `PROGRAM` when `CNC_1` is empty

## Validation Done

- `node --check` passed for:
  - `controllers/convertDaskeValueToS3D.js`
  - `controllers/excelConverterController.js`
  - `utils/macroElinksSerializer.js`
- Local serializer smoke test with real `.CMK`:
  - generated `ELINKS` structure
  - decoded `MSRA` payload matched expected comma-separated content

## Important Implementation Notes For Future

- If you provide a dedicated parser later, replace `buildMacroInputFromCmkText` mapping while keeping serializer contracts unchanged.
- If corpus macro files include additional sections, extend section-to-node mapping in `buildMacroInputFromCmkText`.
- Keep C6DAT normalization (`&#xA;`) in save functions to avoid line-break formatting drift.
