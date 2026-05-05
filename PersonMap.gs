const SOURCE_SPREADSHEET_ID = '1UIAJhdKlmVHK9OELsJkYna9vllaWhDp_eYTv3g4FMPQ';
const SOURCE_SHEET_NAME = 'רשימה משולבת';

const REQUESTS_SHEET_NAME = 'בקשות מפה אישית';
const NOTIFY_EMAIL = 'jiluz11@gmail.com';

function doGet(e) {
  const badgeNo = String(e.parameter.badgeNo || '').trim();

  if (!badgeNo) {
    return jsonOutput({
      ok: false,
      error: 'Missing badgeNo'
    });
  }

  const person = findPersonByBadgeNo(badgeNo);

  return jsonOutput({
    ok: true,
    badgeNo: badgeNo,
    found: !!person,
    person: person
  });
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents || '{}');
  const action = String(data.action || 'submitRequest');

  if (action === 'updateEmail') {
    const badgeNo = String(data.badgeNo || '').trim();
    const email = String(data.email || '').trim();

    if (!badgeNo || !email) {
      return jsonOutput({ ok: false, error: 'Missing badgeNo or email' });
    }

    updatePersonEmail(badgeNo, email);
    return jsonOutput({ ok: true });
  }

  return submitMapRequest(data);
}

function findPersonByBadgeNo(badgeNo) {
  const ss = SpreadsheetApp.openById(SOURCE_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SOURCE_SHEET_NAME);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    const nameHe = String(values[i][0] || '').trim(); // A
    const badge = String(values[i][1] || '').trim();  // B
    const email = String(values[i][4] || '').trim();  // E

    if (badge === badgeNo) {
      return {
        nameHe: nameHe,
        email: email
      };
    }
  }

  return null;
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
function updatePersonEmail(badgeNo, email) {
  const ss = SpreadsheetApp.openById(SOURCE_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SOURCE_SHEET_NAME);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    const badge = String(values[i][1] || '').trim(); // B

    if (badge === badgeNo) {
      sheet.getRange(i + 1, 5).setValue(email); // E
      return true;
    }
  }

  return false;
}
function submitMapRequest(data) {
  const badgeNo = String(data.badgeNo || '').trim();
  const nameHe = String(data.nameHe || '').trim();
  const email = String(data.email || '').trim();
  const publishAllowed = !!data.publishAllowed;

  if (!badgeNo || !nameHe || !email) {
    return jsonOutput({
      ok: false,
      error: 'Missing required fields'
    });
  }

  const ss = SpreadsheetApp.openById(SOURCE_SPREADSHEET_ID);
  let sheet = ss.getSheetByName(REQUESTS_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(REQUESTS_SHEET_NAME);
    sheet.appendRow([
      'Timestamp',
      'BadgeNo',
      'שם בעברית',
      'Email',
      'PublishAllowed',
      'Status',
      'MapUrl',
      'Notes'
    ]);
  }

  sheet.appendRow([
    new Date(),
    badgeNo,
    nameHe,
    email,
    publishAllowed ? 'כן' : 'לא',
    'New',
    '',
    ''
  ]);

  // בשלב בדיקה: מייל רק אליך, לא למשתמש
  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: 'בקשה חדשה למפה אישית - יעל #' + badgeNo,
    body:
      'התקבלה בקשה חדשה למפה אישית.\n\n' +
      'מספר יעל: ' + badgeNo + '\n' +
      'שם: ' + nameHe + '\n' +
      'אימייל: ' + email + '\n' +
      'אישור הפצה באתר: ' + (publishAllowed ? 'כן' : 'לא')
  });

  return jsonOutput({ ok: true });
}