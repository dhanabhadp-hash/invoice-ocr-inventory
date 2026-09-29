# Spec: Invoice OCR Inventory (Google Apps Script + Google Sheets)

## Objective
Build a responsive Thai-first web app for uploading invoice images, extracting key inventory fields with Gemini multimodal OCR, reviewing/editing results, and saving normalized line items to the user's Google Sheet while storing original images in Google Drive.

## Assumptions
1. The provided spreadsheet is the system of record and the user will authorize the Apps Script web app to access it.
2. The app is deployed as a Google Apps Script Web App, with HTMLService frontend and Apps Script server functions.
3. Gemini API access is configured by storing the API key in Script Properties; no key is embedded in source code.
4. One invoice may contain multiple product rows; each row repeats invoice-level fields.
5. Unit price and line total are stored VAT-inclusive. If the invoice is VAT-exclusive, the extractor/normalizer applies 7% VAT when evidence supports it and flags low-confidence cases for review.

## Tech Stack
- Google Apps Script (V8), HTMLService, DriveApp, SpreadsheetApp, PropertiesService, LockService
- Vanilla HTML/CSS/JS with responsive layout; Nothing-inspired visual language
- Gemini API using REST from Apps Script (structured JSON response)
- Google Sheets columns A:N as specified by the user

## Required behavior
- Accept JPG, PNG, WEBP, and PDF up to a configurable size limit.
- Preview selected image and show processing state.
- Extract: Invoice No, Company Name, Tax ID, Invoice Date, Salesperson, GPU Code, TPU Code, Product Name, Quantity, Unit Price (Incl. VAT), Total Price (Incl. VAT), Grand Total (Incl. VAT), Image URL.
- Support multiple products per invoice.
- Validate Tax ID as 13 digits when present; GPU/TPU as 5–8 digits when present.
- Compare arithmetic: quantity × VAT-inclusive unit price ≈ VAT-inclusive line total; line totals ≈ grand total. Show warnings, never silently overwrite user edits.
- Save Drive image first, then append one row per product to the configured spreadsheet.
- Do not expose the Gemini API key to browser code.
- Provide review-and-edit before saving.

## Commands
- Apps Script: open script in Apps Script editor, run `setup()` once, then Deploy → New deployment → Web app.
- Local syntax check: `node --check appsscript/Code.gs` (after converting Apps Script syntax if needed).

## Project structure
- `appsscript/Code.gs` — server/API and configuration
- `appsscript/Index.html` — frontend shell
- `appsscript/styles.html` — responsive Nothing-style CSS
- `appsscript/client.html` — upload, preview, extract, review, save logic
- `appsscript/README.md` — setup/deployment instructions
- `tasks/plan.md`, `tasks/todo.md` — implementation plan and tasks

## Code style
Use small pure helpers and explicit names. Server responses are `{ok: boolean, data?: any, error?: string, warnings?: string[]}`. Never log secrets. Use `const`/`let`, early returns, and `escapeHtml` for user-controlled display.

## Testing strategy
- Unit-like Apps Script functions for VAT normalization and field validation.
- Manual test with one single-line and one multi-line Thai invoice image.
- Verify Drive file created, Sheets rows appended in A:N order, and warnings visible for arithmetic mismatch.
- Review with security checklist: no secrets in HTML, input validation, safe Drive sharing, lock around writes.

## Boundaries
- Always: validate input, preserve original image, keep audit timestamp, use document lock for writes, show uncertainty to user.
- Ask first: changing spreadsheet schema, changing Drive sharing policy, enabling anonymous access, adding external services.
- Never: commit API keys, make Drive files public by default, delete source images, silently alter extracted values.

## Success criteria
- Mobile viewport can upload and preview an invoice with no horizontal overflow.
- Extraction returns editable structured rows in under the configured timeout for supported images.
- Save creates a Drive file and exactly one Sheet row per product item with all 14 columns.
- VAT-inclusive monetary values are consistent or a clear warning is shown.
- API key is absent from all client HTML/JS.

## Open questions
- Exact Drive folder ID and whether files should be shared with a domain or remain private.
- Whether the deployed web app should be restricted to the user's domain or accessible to anyone with the link.
