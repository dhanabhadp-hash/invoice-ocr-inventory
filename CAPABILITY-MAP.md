# Capability Map: Manus Invoice OCR Inventory

| Module id | Responsibility | Depends on |
|---|---|---|
| ui-upload-review | Responsive Tailwind upload, preview, editable OCR review, warnings, save state | api-contract |
| manus-api | Node.js Manus backend, request validation, Manus Vision OCR, VAT normalization | google-bridge, manus-runtime |
| manus-runtime | Manus runtime credentials, multimodal model selection, temporary object storage | — |
| google-bridge | Apps Script authenticated bridge, Drive archival, Sheets A:N append, formula sanitization | google-drive-sheets |
| google-drive-sheets | Existing spreadsheet and Drive folder as system of record | — |

Build order: google-bridge contract → manus-runtime/api → ui-upload-review → deployment review.

Approved direction: Google Drive/Sheets remain authoritative; Manus storage is temporary OCR input only; the published app is accessible to anyone with the link.
