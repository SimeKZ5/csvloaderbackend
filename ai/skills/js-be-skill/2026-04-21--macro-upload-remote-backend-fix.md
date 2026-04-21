# Macro Upload Debug Notes (Remote Backend Case)

Date: 2026-04-21

## Reported Problem

Uploading the sample table (`CSV_PRIMJER - MAKRO-TEST.ods`) did not assign macros to boards.

## Root Cause

The Electron app was configured to call a remote backend:

- `CorpuElectronLoader/.env.testlocal`
- `VITE_BASE_URL = http://192.168.100.201:5000/`

Macro folder browsing in Electron reads files from the **client machine** (local filesystem), but macro serialization was happening in backend by reading `macroFolderPath` on the **server machine**.

So when backend tried to read:

- `C:\...<macro-folder>...\*.CMK`

it could fail or have different contents than the local Electron machine.

Result: macro name existed in CSV, but backend could not load matching CMK file and did not inject `ELINKS`.

## Fix Implemented

### 1) Send CMK file contents from Electron to backend

Added Electron IPC endpoint to read `.CMK` text and return a map:

- `CorpuElectronLoader/electron/main.ts`
  - new handler: `get-makro-contents-from-folder`
- `CorpuElectronLoader/electron/preload.ts`
  - exposed API: `window.electronAPI.getMakroContentsFromFolder(...)`
- `CorpuElectronLoader/src/types/global.d.ts`
  - added TS type for new Electron API method

### 2) Build payload only for macros used in uploaded rows

Updated conversion hook to:

- collect macro names from `userDaskeValues[*].macro_cmk`
- normalize names (`.cmk` extension optional)
- fetch matching CMK contents from local folder via Electron
- fetch full local `.CMK` filename list for typo suggestions
- send both map + name list to backend in convert request

Files:

- `CorpuElectronLoader/src/Components/CSVLoader/hook/useConvertDaskeData.ts`
- `CorpuElectronLoader/src/Components/CSVLoader/api/convertDaskeData.ts`

New request field:

- `macroFilesMap: Record<string, string>`
- `macroFileNames: string[]`

### 3) Backend uses uploaded macro map first

Updated backend macro runtime to accept in-memory CMK map (`macroFilesMap`) and resolve by normalized file name.
Also accepts `macroFileNames` so closest-match suggestions still work even when backend cannot access folder path directly.
If provided map exists, backend no longer depends on server filesystem path for exact macro serialization.

Files:

- `csvloaderbackend/controllers/convertDaskeValueToS3D.js`
- `csvloaderbackend/controllers/excelConverterController.js` (same support added for parity)

Behavior now:

1. use `macroFileNames` for available-name matching and typo suggestions,
2. use `macroFilesMap` (request-provided CMK text) for exact macro serialization,
3. fallback to reading from `macroFolderPath` on backend machine.

## CSV/ODS Parsing Status

The parser path now reads `MACRO`/`MAKRO` column into `macro_cmk`, so plain macro names like:

- `X_SCREW_SPACER`
- `X_POLICA_CONNECT`

are carried through conversion and matched against `.CMK` filenames (extension optional).

## Validation

- TypeScript check (Electron frontend): `tsc --noEmit` passed.
- Node syntax check (backend controllers): passed.
- Runtime smoke test:
  - backend with invalid folder path + provided `macroFilesMap`
  - output contained expected `ELINKS` blocks for boards with macro names.
  - typo case with invalid folder path + `macroFileNames` still produced closest-match note in `PRIMJEDBALIST`.

## Practical Note

This fix is specifically important when frontend and backend run on different machines.
Without sending CMK content, folder paths chosen in Electron may not exist on the backend host.
