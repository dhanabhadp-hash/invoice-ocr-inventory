const CONFIG = Object.freeze({
  SPREADSHEET_ID: '1ogoM0vXPndiRcjNgbkN3Bsitd5JTcoT4rsj7hkerZqQ',
  SPREADSHEET_URL: 'https://docs.google.com/spreadsheets/d/1ogoM0vXPndiRcjNgbkN3Bsitd5JTcoT4rsj7hkerZqQ/edit?usp=drivesdk',
  SHEET_NAME: 'Sheet1',
  DRIVE_FOLDER_PROPERTY: 'INV_OCR_DRIVE_FOLDER_ID',
  BRIDGE_TOKEN_PROPERTY: 'MANUS_BRIDGE_TOKEN',
  MAX_BYTES: 12 * 1024 * 1024,
  HEADERS: ['ATimestamp','BInvoice No','CCompany Name','DTax ID','EInvoice Date','FSalesperson','GGPU Code','HTPU Code','IProduct Name','JQuantity','KUnit Price (Incl. VAT)','LTotal Price (Incl. VAT)','MGrand Total (Incl. VAT)','NImage URL']
});

function doGet() {
  return jsonResponse_({ ok: true, service: 'invoice-ocr-google-bridge' });
}
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const expected = PropertiesService.getScriptProperties().getProperty(CONFIG.BRIDGE_TOKEN_PROPERTY);
    if (!expected || body.token !== expected) throw new Error('ไม่ได้รับอนุญาต');
    if (body.action === 'saveImage') {
      validatePayload_(body.payload);
      return jsonResponse_({ ok: true, data: saveDriveFile_(body.payload) });
    }
    if (body.action === 'checkSheet') {
      return jsonResponse_({ ok: true, data: { spreadsheetId: CONFIG.SPREADSHEET_ID, sheetName: getTargetSheet_().getName() } });
    }
    if (body.action === 'saveInvoice') return jsonResponse_(saveInvoice(body.payload));
    throw new Error('ไม่รู้จัก bridge action');
  } catch (error) { return jsonResponse_({ ok: false, error: error.message || String(error) }); }
}
function jsonResponse_(body) { return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON); }
function getTargetSheet_() {
  const workbook = SpreadsheetApp.openByUrl(CONFIG.SPREADSHEET_URL);
  return workbook.getSheetByName(CONFIG.SHEET_NAME) || workbook.getSheets()[0] || workbook.insertSheet(CONFIG.SHEET_NAME);
}
function setup() {
  const sheet = getTargetSheet_();
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, CONFIG.HEADERS.length).setValues([CONFIG.HEADERS]);
  sheet.setFrozenRows(1);
  PropertiesService.getScriptProperties().setProperty('INV_OCR_SETUP_AT', new Date().toISOString());
  return { ok: true, message: 'Setup complete. Set MANUS_BRIDGE_TOKEN and optionally INV_OCR_DRIVE_FOLDER_ID in Script Properties.' };
}
function getConfig() {
  return { ok: true, data: { configured: Boolean(PropertiesService.getScriptProperties().getProperty(CONFIG.BRIDGE_TOKEN_PROPERTY)), sheetName: getTargetSheet_().getName(), provider: 'Manus OCR bridge' } };
}
function saveInvoice(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (!payload || !Array.isArray(payload.items) || !payload.items.length) throw new Error('ไม่พบรายการสินค้า');
    const sheet = getTargetSheet_();
    const normalized = normalizeInvoice_(payload);
    if (!normalized.items.length || normalized.items.some(item => !item.productName || item.quantity <= 0 || item.unitPriceInclVat < 0 || item.totalPriceInclVat < 0)) throw new Error('กรุณากรอกชื่อสินค้า จำนวน และราคาที่ถูกต้อง');
    const invoice = normalized.invoice || {};
    const safe = value => sanitizeCell_(value);
    const rows = normalized.items.map(item => [new Date(), safe(invoice.invoiceNo), safe(invoice.companyName), safe(invoice.taxId), safe(invoice.invoiceDate), safe(invoice.salesperson), safe(item.gpuCode), safe(item.tpuCode), safe(item.productName), item.quantity, item.unitPriceInclVat, item.totalPriceInclVat, invoice.grandTotalInclVat, safe(invoice.imageUrl)]);
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, CONFIG.HEADERS.length).setValues(rows);
    return { ok: true, data: { rowsSaved: rows.length } };
  } finally { lock.releaseLock(); }
}
function validatePayload_(payload) {
  if (!payload || !payload.base64 || !payload.mimeType) throw new Error('กรุณาเลือกไฟล์ภาพบิล');
  if (!/^image\/(jpeg|png|webp)$|^application\/pdf$/.test(payload.mimeType)) throw new Error('รองรับ JPG, PNG, WEBP หรือ PDF เท่านั้น');
  if (Utilities.base64Decode(payload.base64).length > CONFIG.MAX_BYTES) throw new Error('ไฟล์ใหญ่เกิน 12 MB');
}
function saveDriveFile_(payload) {
  const folderId = PropertiesService.getScriptProperties().getProperty(CONFIG.DRIVE_FOLDER_PROPERTY);
  const blob = Utilities.newBlob(Utilities.base64Decode(payload.base64), payload.mimeType, payload.fileName || ('invoice-' + Date.now()));
  const file = folderId ? DriveApp.getFolderById(folderId).createFile(blob) : DriveApp.createFile(blob);
  return { id: file.getId(), url: file.getUrl() };
}
function normalizeInvoice_(data) {
  data = data || {};
  const invoice = data.invoice || data;
  const warnings = [];
  const vatStatus = invoice.vatStatus || data.vatStatus || 'unknown';
  const multiplier = vatStatus === 'exclusive' ? 1.07 : 1;
  if (vatStatus === 'unknown') warnings.push('ไม่พบหลักฐานชัดเจนว่า VAT รวมแล้วหรือไม่ กรุณาตรวจสอบราคา');
  const taxId = String(invoice.taxId || '').replace(/[- ]/g,'');
  if (taxId && !/^\d{13}$/.test(taxId)) warnings.push('เลขประจำตัวผู้เสียภาษีควรมี 13 หลัก');
  const items = (Array.isArray(data.items) ? data.items : []).map(item => {
    const gpu = String(item.gpuCode || ''); const tpu = String(item.tpuCode || '');
    if (gpu && !/^\d{5,8}$/.test(gpu)) warnings.push('GPU Code ต้องมี 5–8 หลัก');
    if (tpu && !/^\d{5,8}$/.test(tpu)) warnings.push('TPU Code ต้องมี 5–8 หลัก');
    const quantity = toNumber_(item.quantity);
    const unit = roundMoney_(toNumber_(item.unitPriceInclVat) * multiplier);
    const total = roundMoney_(toNumber_(item.totalPriceInclVat) * multiplier);
    if (quantity && unit && total && Math.abs(quantity * unit - total) > 0.05) warnings.push('ยอดรวมรายการไม่ตรงกับ จำนวน × ราคา/หน่วย: ' + (item.productName || 'รายการ'));
    return { gpuCode:gpu, tpuCode:tpu, productName:String(item.productName || ''), quantity, unitPriceInclVat:unit, totalPriceInclVat:total };
  });
  const grandTotalInclVat = roundMoney_(toNumber_(invoice.grandTotalInclVat) * multiplier);
  const sum = items.reduce((acc, item) => acc + item.totalPriceInclVat, 0);
  if (grandTotalInclVat && sum && Math.abs(sum - grandTotalInclVat) > 0.1) warnings.push('ยอดรวมสุทธิไม่ตรงกับผลรวมรายการ');
  return { invoice:{ invoiceNo:String(invoice.invoiceNo || ''), companyName:String(invoice.companyName || ''), taxId, invoiceDate:String(invoice.invoiceDate || ''), salesperson:String(invoice.salesperson || ''), grandTotalInclVat, imageUrl:String(invoice.imageUrl || data.imageUrl || ''), vatStatus }, items, warnings:[...new Set(warnings)] };
}
function roundMoney_(n) { return Math.round(n * 100) / 100; }
function sanitizeCell_(value) { const text = String(value == null ? '' : value); return /^[=+\-@]/.test(text) ? "'" + text : text; }
function toNumber_(value) { if (value === null || value === '' || value === undefined) return 0; const n = Number(String(value).replace(/,/g,'')); return isFinite(n) ? n : 0; }
function testNormalizeInvoice_() { const result = normalizeInvoice_({ taxId:'123', items:[{productName:'x', quantity:2, unitPriceInclVat:10, totalPriceInclVat:21}] }); if (!result.warnings.length) throw new Error('Expected validation warnings'); }
