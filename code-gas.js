// =============================================
//  Google Apps Script — Code.gs
//  ระบบฝากเงินนักเรียน โรงเรียนบ้านใหม่
//  วางโค้ดทั้งหมดนี้ใน Apps Script แทนที่โค้ดเดิม
// =============================================
//
//  *** ไม่ต้องแก้ไข SPREADSHEET_ID ***
//  ระบบจะเปิด Spreadsheet ที่ Script ผูกอยู่อัตโนมัติ
//  (Deploy จาก Spreadsheet ที่ต้องการเลย)

var SHEET_STUDENTS     = 'Students';
var SHEET_TRANSACTIONS = 'Transactions';

/* -------- ENTRY POINTS -------- */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  var result;
  try {
    if (action === 'getAll') result = getAllData();
    else result = { error: 'Unknown GET action: ' + action };
  } catch(err) {
    result = { error: err.message };
  }
  return out(result);
}

function doPost(e) {
  var result;
  try {
    var payload = JSON.parse(e.postData.contents);
    var action  = payload.action;
    if      (action === 'addTransaction') result = addTransaction(payload.data);
    else if (action === 'updateStudents') result = updateStudents(payload.data);
    else result = { error: 'Unknown POST action: ' + action };
  } catch(err) {
    result = { error: err.message };
  }
  return out(result);
}

function out(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* -------- GET ALL -------- */
function getAllData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    students:     getStudents(ss),
    transactions: getTransactions(ss)
  };
}

/* -------- STUDENTS -------- */
function getStudents(ss) {
  var sheet = getOrCreate(ss, SHEET_STUDENTS, ['rowIndex','class','id','firstName','lastName']);
  var data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  return data.slice(1).map(function(r) {
    return { rowIndex: String(r[0]), class: r[1], id: String(r[2]), firstName: r[3], lastName: r[4] };
  }).filter(function(s) { return s.rowIndex && s.id; });
}

function updateStudents(students) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getOrCreate(ss, SHEET_STUDENTS, ['rowIndex','class','id','firstName','lastName']);
  sheet.clearContents();
  sheet.appendRow(['rowIndex','class','id','firstName','lastName']);
  students.forEach(function(s) {
    sheet.appendRow([s.rowIndex, s.class, s.id, s.firstName, s.lastName]);
  });
  styleHeader(sheet, 5);
  return { success: true };
}

/* -------- TRANSACTIONS -------- */
function getTransactions(ss) {
  var sheet = getOrCreate(ss, SHEET_TRANSACTIONS,
    ['id','studentRowIndex','type','amount','date','note','createdAt']);
  var data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  return data.slice(1).map(function(r) {
    return {
      id: String(r[0]), studentRowIndex: String(r[1]),
      type: r[2], amount: parseFloat(r[3]) || 0,
      date: r[4], note: r[5] || '', createdAt: r[6] || ''
    };
  }).filter(function(t) { return t.id; });
}

function addTransaction(tx) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getOrCreate(ss, SHEET_TRANSACTIONS,
    ['id','studentRowIndex','type','amount','date','note','createdAt']);
  sheet.appendRow([
    tx.id, tx.studentRowIndex, tx.type,
    tx.amount, tx.date, tx.note || '', tx.createdAt || new Date().toISOString()
  ]);
  return { success: true };
}

/* -------- HELPERS -------- */
function getOrCreate(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    styleHeader(sheet, headers.length);
  }
  return sheet;
}

function styleHeader(sheet, cols) {
  var r = sheet.getRange(1, 1, 1, cols);
  r.setBackground('#065f46');
  r.setFontColor('#ffffff');
  r.setFontWeight('bold');
}
