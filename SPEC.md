# Spec: Invoice OCR Inventory — Manus Migration

## Objective
Build a public-link web app for mobile and tablet invoice upload. Manus handles the server, multimodal OCR/Vision, normalization, validation, and API orchestration. Google Drive stores the original invoice image and Google Sheets remains the system of record for extracted inventory rows.

## Approved assumptions
1. Anyone with the published link may use the app; no Manus login is required in this phase.
2. Google Drive and Google Sheets remain authoritative; Manus storage is temporary OCR input only.
3. The existing Tailwind/Nothing-style UI is preserved.
4. The Google Apps Script bridge is deployed as a web app and authorizes Manus using `MANUS_BRIDGE_TOKEN`.
5. API keys and bridge credentials stay server-side in protected configuration.

## Tech stack
- Manus Webdev hybrid deployment: static frontend plus Node.js 22 container backend.
- Tailwind CSS via the existing HTML shell and responsive utility classes.
- Manus OpenAI-compatible multimodal runtime with explicit `gemini-3-flash-preview` model.
- Google Apps Script V8 bridge using DriveApp, SpreadsheetApp, PropertiesService and LockService.
- Google Sheets columns A:N unchanged.

## Functional behavior
The app accepts JPG, PNG, WEBP and PDF up to 12 MB, previews the selection, sends it to `POST /api/ocr`, displays structured editable invoice and product rows, shows VAT/arithmetic warnings, and sends the reviewed payload to `POST /api/save`. OCR output includes company, tax ID, invoice number/date, salesperson, GPU/TPU codes, product, quantity, VAT-inclusive unit/line/grand totals, and Drive image URL. GPU/TPU values may use `G:`/`T:` shorthand; only 5–8 digit codes are retained and masked/unreadable values remain blank.

VAT-inclusive evidence on the source bill (VAT 7%, ภาษีมูลค่าเพิ่ม, ราคารวม VAT, or a VAT-inclusive grand total) takes precedence and preserves OCR prices exactly. The server applies 1.07 only for an explicit before-VAT or VAT-added-separately indication. Save success clears the file, preview, and reviewed data; save failure retains all reviewed values. Status and error notifications are centered persistent modals with no automatic timeout and are replaced by the next successful OCR/load or save result.

The bridge writes the source image to Drive and appends one row per product item to the configured sheet. The server validates MIME/size, uses a signed Manus-storage URL for Vision OCR, applies 1.07 only when `vatStatus=exclusive`, flags unknown VAT, normalizes shorthand GPU/TPU fields, rejects invalid reviewed rows, and sanitizes formula-like cell text.

## Project structure
- `server.js` — Manus API server, Vision OCR, Manus temporary storage, route handlers.
- `Dockerfile` — production container contract.
- `index.html` — generated standalone frontend shell.
- `appsscript/Code.gs` — Google Drive/Sheets bridge and validation.
- `appsscript/Index.html`, `styles.html`, `client.html` — original Google Apps Script-compatible UI source and styles.
- `MIGRATION-SPEC.md` — migration architecture and acceptance criteria.
- `README.md` — deployment and bridge setup.

## Commands
- Syntax: `node --check server.js && node --check < appsscript/Code.gs`
- Local server: `PORT=3000 node server.js`
- Health: `curl http://127.0.0.1:3000/health`
- Production build: Manus runs the declared Dockerfile and static build contract.

## Boundaries
- Always: preserve source images, keep Drive/Sheets schema A:N, validate all inputs, keep secrets server-side, require review before saving.
- Ask first: schema changes, public Drive sharing changes, adding authentication, replacing Google as source of truth.
- Never: commit API keys/tokens, expose protected values in client JavaScript, silently rewrite reviewed values, delete original images.

## Success criteria
- Public deployment serves the preserved responsive UI and routes `/api/*` to the Manus backend.
- Manus Vision returns structured editable OCR fields using the tested model/request shape.
- Google Drive receives the original upload and Google Sheets receives exactly one row per reviewed product item.
- Apps Script no longer calls Gemini; Manus is the only OCR engine.
- Frontend contains no secret values.
