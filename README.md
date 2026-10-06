# Invoice OCR Inventory — Drive folder routing

The published application uses Manus Vision OCR and the Google Apps Script bridge. Google Drive and Google Sheets remain the system of record.

## Required Drive structure

- Parent folder: `OCR Inventory`
  - ID: `1XcEv1s4JyvIh02-KmVJ-sA8lEAmyGTtJ`
- Upload child folder: `Inventory_OCR_Uploads`
  - ID: `1_cwXmxuHj5enUq3VWNSWDlXTz_JpnwlY`

`appsscript/Code.gs` now validates that the configured upload folder is the specified child of the specified parent. It does not fall back to Drive root or another Script Property folder.

Google Sheets persistence is locked to the existing tab `บิล Inventory`; the bridge rejects a missing target tab instead of silently falling back to another tab. Successful saves return the spreadsheet ID, tab name, and appended row range.

## Apply the bridge fix

1. Open the Google Apps Script project that serves the configured bridge URL.
2. Replace its `Code.gs` with the current `appsscript/Code.gs` from this repository.
3. Run `setup()` once and confirm it returns `Inventory_OCR_Uploads` with the child folder ID above.
4. Create a new Web App deployment version, or update the existing deployment, using **Execute as me** and the required access policy.
5. Keep the existing `MANUS_BRIDGE_TOKEN` Script Property unchanged.
6. In the bridge project, run `checkDriveFolder()` only if a local helper is available; the web bridge action is `checkDriveFolder` and requires the normal server token.
7. Upload a test invoice from the public app and verify the resulting Drive file appears inside `Inventory_OCR_Uploads`.

The Manus public app URL is https://invocr-fr6cr6ti.manus.space/.
