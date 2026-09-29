# Migration Spec: Manus Invoice OCR Inventory

## Objective
ย้ายการประมวลผลจาก Apps Script/Gemini มาเป็น Manus server + Manus Vision OCR โดยคง Google Drive และ Google Sheets เป็นข้อมูลหลัก, คง UX/UI เดิม และเปิดให้ผู้มีลิงก์ใช้งานได้

## Architecture
- Frontend: existing Tailwind CSS / Nothing-style responsive upload-review UI, served as static HTML.
- Backend: Node.js 22 server in Manus Webdev container; endpoints `GET /health`, `POST /api/ocr`, `POST /api/save`.
- OCR: Manus OpenAI-compatible multimodal runtime using explicit `gemini-3-flash-preview` model and strict JSON schema.
- Temporary model input: Manus project storage with a signed download URL; original archival copy is written to Google Drive first.
- Google system of record: Apps Script `doPost` bridge writes the image to Drive and reviewed one-row-per-product records to the existing Sheets A:N schema.
- Secrets: Manus server environment for Manus runtime credentials, Apps Script URL and bridge token; never in browser or Git.

## Request contracts
### `POST /api/ocr`
Input: `{base64, mimeType, fileName}`. Output: `{ok, data:{invoice,items,warnings},warnings}`. The backend archives the source image in Drive through the bridge, sends a temporary Manus-storage URL to Vision OCR, normalizes VAT and returns editable data.

### `POST /api/save`
Input: `{invoice,items,warnings}` after user review. Output: `{ok,data:{rowsSaved}}`. The backend forwards the reviewed payload to Apps Script; Apps Script validates and appends to Sheets.

### Apps Script bridge
`POST /exec` with `{token,action,payload}`. Actions: `saveImage`, `saveInvoice`. Token is checked server-side and is stored in Apps Script Script Properties as `MANUS_BRIDGE_TOKEN`.

## Data rules
- Google Sheets remains the source of truth with columns A:N unchanged.
- One row per product item; invoice-level values repeat per row.
- Monetary fields are VAT-inclusive. `exclusive` applies 1.07; `unknown` produces a visible warning.
- Tax ID is 13 digits when present; GPU/TPU codes are 5–8 digits when present.
- Formula-like cell values are prefixed with an apostrophe before Sheets write.

## Commands
- Syntax: `node --check server.js && node --check < appsscript/Code.gs`
- Start: `PORT=3000 node server.js`
- Health: `curl http://127.0.0.1:3000/health`

## Boundaries
- Always: preserve original Drive image, validate payloads, keep API credentials server-side, review before save, preserve Google columns A:N.
- Ask first: change Drive sharing, change Sheet schema, switch Google system of record to Manus database, add authentication.
- Never: expose secrets in frontend, make Drive files public by default, remove original images, silently change reviewed values.

## Success criteria
- Existing visual UX remains recognizable and responsive on mobile/tablet.
- `/api/ocr` uses Manus Vision, returns structured editable fields and warnings.
- `/api/save` writes through Apps Script to Google Drive/Sheets.
- No Gemini API call or provider key remains in the Apps Script bridge.
- Public deployment serves the frontend and routes API requests to the Manus server.
