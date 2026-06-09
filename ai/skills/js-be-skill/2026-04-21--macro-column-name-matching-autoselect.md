# Macro Column Name Matching + Auto Select

Date: 2026-04-21

## Requirement Clarification

When a user uploads CSV/Excel/ODS:

1. Column `MACRO` contains text macro names per row.
2. Macro names should match `.CMK` files from selected macro folder.
3. Example names:
   - `X_SCREW_SPACER`
   - `X_POLICA_CONNECT`
4. Matching macro should be auto-selected in UI select field and used for S3D ELINKS conversion.

## What Was Not Working

- CSV parser could provide macro text without extension (`X_SCREW_SPACER`).
- UI select options use full filenames (`X_SCREW_SPACER.CMK`).
- Without normalization+mapping, select field can appear unselected and downstream payload may carry non-canonical names.

## Implemented Fix

### 1) Auto-select matching `.CMK` in UI

In `UpisDaskeDialog`, when macro list is loaded:

- normalize each filename/key by stripping `.cmk`, trimming, lowercase
- normalize each row `macro_cmk`
- if normalized keys match, replace row `macro_cmk` with exact filename from folder list

File:

- `CorpuElectronLoader/src/Components/CSVLoader/dialog/UpisDaskeDialog.tsx`

Result:

- macro select box now shows selected value after upload when names correspond.

### 2) Normalize + resolve before sending convert request

In convert hook:

- build macro lookup from available `macroFileNames` and payload `macroFilesMap` keys
- resolve each row `macro_cmk` to exact filename
- use resolved macro for `cnc_1` fallback

File:

- `CorpuElectronLoader/src/Components/CSVLoader/hook/useConvertDaskeData.ts`

## Related Existing Behavior

- Backend matching already normalizes extension/case and supports closest-match note.
- For remote backend deployments, CMK file content and macro filename list are sent from Electron to backend to avoid filesystem mismatch.

## Validation

- Frontend TypeScript check passed (`tsc --noEmit`).
- Backend syntax checks passed for modified controllers.
