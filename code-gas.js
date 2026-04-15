// =============================================
//  Google Apps Script — Code.gs
//  ระบบฝากเงินนักเรียน โรงเรียนบ้านใหม่
//  วางโค้ดนี้ใน Google Apps Script แล้ว Deploy
// =============================================

// *** ตั้งค่า: เปลี่ยน SPREADSHEET_ID เป็น ID ของ Google Sheet ของคุณ ***
// ID คือส่วนที่อยู่ใน URL: https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
var SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

var SHEET_STUDENTS     = 'Students';
var SHEET_TRANSACTIONS = 'Transactions';

// -------- MAIN ENTRY POINT --------
function doGet(e) {
  var action = e.parameter.action || '';
  var result;
  try {
    if (action === 'getAll') {
      result = getAllData();
    } else {
      result = { error: 'Unknown action' };
    }
  } catch(err) {
    result = { error: err.message };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var payload;
  var result;
  try {
    payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    if (action === 'addTransaction') {
      result = addTransaction(payload.data);
    } else if (action === 'updateStudents') {
      result = updateStudents(payload.data);
    } else {
      result = { error: 'Unknown action' };
    }
  } catch(err) {
    result = { error: err.message };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// -------- GET ALL DATA --------
function getAllData() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var students     = getStudents(ss);
  var transactions = getTransactions(ss);
  return { students: students, transactions: transactions };
}

// -------- STUDENTS --------
function getStudents(ss) {
  var sheet = getOrCreateSheet(ss, SHEET_STUDENTS, ['rowIndex','class','id','firstName','lastName']);
  var data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  return data.slice(1).map(function(row) {
    return {
      rowIndex:  String(row[0]),
      class:     row[1],
      id:        String(row[2]),
      firstName: row[3],
      lastName:  row[4]
    };
  }).filter(function(s) { return s.rowIndex && s.id; });
}

function updateStudents(students) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = getOrCreateSheet(ss, SHEET_STUDENTS, ['rowIndex','class','id','firstName','lastName']);
  // Clear and rewrite
  sheet.clearContents();
  sheet.appendRow(['rowIndex','class','id','firstName','lastName']);
  students.forEach(function(s) {
    sheet.appendRow([s.rowIndex, s.class, s.id, s.firstName, s.lastName]);
  });
  return { success: true };
}

// -------- TRANSACTIONS --------
function getTransactions(ss) {
  var sheet = getOrCreateSheet(ss, SHEET_TRANSACTIONS,
    ['id','studentRowIndex','type','amount','date','note','createdAt']);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  return data.slice(1).map(function(row) {
    return {
      id:               String(row[0]),
      studentRowIndex:  String(row[1]),
      type:             row[2],
      amount:           parseFloat(row[3]) || 0,
      date:             row[4],
      note:             row[5] || '',
      createdAt:        row[6] || ''
    };
  }).filter(function(t) { return t.id; });
}

function addTransaction(tx) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = getOrCreateSheet(ss, SHEET_TRANSACTIONS,
    ['id','studentRowIndex','type','amount','date','note','createdAt']);
  sheet.appendRow([
    tx.id, tx.studentRowIndex, tx.type,
    tx.amount, tx.date, tx.note || '', tx.createdAt || new Date().toISOString()
  ]);
  return { success: true };
}

// -------- HELPER --------
function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    // Style header row
    var hRange = sheet.getRange(1, 1, 1, headers.length);
    hRange.setBackground('#1e5e3a');
    hRange.setFontColor('#ffffff');
    hRange.setFontWeight('bold');
  }
  return sheet;
}
