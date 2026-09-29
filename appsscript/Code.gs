const CONFIG = Object.freeze({
  SPREADSHEET_ID: '1ogoM0vXPndiRcjNgbkN3Bsitd5JTcoT4rsj7hkerZQ',
  SHEET_NAME: 'Sheet1',
  DRIVE_FOLDER_PROPERTY: 'INV_OCR_DRIVE_FOLDER_ID',
  GEMINI_KEY_PROPERTY: 'GEMINI_API_KEY',
  MODEL: 'gemini-2.5-flash',
  MAX_BYTES: 12 * 1024 * 1024,
  HEADERS: ['ATimestamp','BInvoice No','CCompany Name','DTax ID','EInvoice Date','FSalesperson','GGPU Code','HTPU Code','IProduct Name','JQuantity','KUnit Price (Incl. VAT)','LTotal Price (Incl. VAT)','MGrand Total (Incl. VAT)','NImage URL']
});

function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate().setTitle('Invoice OCR Inventory');
}
function include(name) { return HtmlService.createHtmlOutputFromFile(name).getContent(); }
function setup() {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAME) || SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).insertSheet(CONFIG.SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, CONFIG.HEADERS.length).setValues([CONFIG.HEADERS]);
  sheet.setFrozenRows(1);
  PropertiesService.getScriptProperties().setProperty('INV_OCR_SETUP_AT', new Date().toISOString());
  return { ok: true, message: 'Setup complete. Set GEMINI_API_KEY and optionally INV_OCR_DRIVE_FOLDER_ID in Script Properties.' };
}
function getConfig() {
  return { ok: true, data: { configured: Boolean(PropertiesService.getScriptProperties().getProperty(CONFIG.GEMINI_KEY_PROPERTY)), sheetName: CONFIG.SHEET_NAME } };
}
function extractInvoice(payload) {
  try {
    validatePayload_(payload);
    const file = saveDriveFile_(payload);
    const extracted = callGemini_(payload.mimeType, payload.base64);
    const normalized = normalizeInvoice_(extracted);
    normalized.invoice.imageUrl = file.url;
    normalized.invoice.fileId = file.id;
    return { ok: true, data: normalized, warnings: normalized.warnings };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}
function saveInvoice(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (!payload || !Array.isArray(payload.items) || !payload.items.length) throw new Error('ไม่พบรายการสินค้า');
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) throw new Error('ไม่พบชีตปลายทาง: ' + CONFIG.SHEET_NAME);
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
function callGemini_(mimeType, base64) {
  const key = PropertiesService.getScriptProperties().getProperty(CONFIG.GEMINI_KEY_PROPERTY);
  if (!key) throw new Error('ยังไม่ได้ตั้งค่า GEMINI_API_KEY ใน Script Properties');
  const schema = { type: 'OBJECT', properties: { invoiceNo:{type:'STRING'}, companyName:{type:'STRING'}, taxId:{type:'STRING'}, invoiceDate:{type:'STRING'}, salesperson:{type:'STRING'}, grandTotalInclVat:{type:'NUMBER'}, vatStatus:{type:'STRING', enum:['inclusive','exclusive','unknown']}, vatRate:{type:'NUMBER'}, items:{type:'ARRAY', items:{type:'OBJECT', properties:{gpuCode:{type:'STRING'}, tpuCode:{type:'STRING'}, productName:{type:'STRING'}, quantity:{type:'NUMBER'}, unitPriceInclVat:{type:'NUMBER'}, totalPriceInclVat:{type:'NUMBER'}}, required:['productName','quantity','unitPriceInclVat','totalPriceInclVat']} } }, required:['items'] };
  const prompt = 'อ่านข้อความจากใบกำกับภาษี/บิล inventory ภาษาไทยหรืออังกฤษ แล้วคืน JSON ตาม schema เท่านั้น. กำหนด vatStatus เป็น inclusive เมื่อเอกสารระบุว่ารวม VAT แล้ว, exclusive เมื่อมีหลักฐานชัดเจนว่าไม่รวม VAT, มิฉะนั้น unknown. ราคา unit/total/grand total ที่ส่งออกต้องเป็น VAT 7% inclusive เสมอ; ระบบจะคูณ 1.07 เมื่อ vatStatus=exclusive และจะแจ้งเตือนเมื่อ unknown. รหัส GPU/TPU เป็นตัวเลข 5-8 หลัก';
  const response = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + CONFIG.MODEL + ':generateContent?key=' + encodeURIComponent(key), { method:'post', contentType:'application/json', muteHttpExceptions:true, payload: JSON.stringify({ contents:[{parts:[{text:prompt},{inlineData:{mimeType:mimeType,data:base64}}]}], generationConfig:{responseMimeType:'application/json', responseSchema:schema, temperature:0.1} }) });
  const body = JSON.parse(response.getContentText());
  if (response.getResponseCode() >= 400 || body.error) throw new Error(body.error?.message || 'Gemini OCR ไม่สำเร็จ');
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('ไม่พบผลลัพธ์จาก OCR');
  return JSON.parse(text);
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
