const SOURCE_SPREADSHEET_ID = '1UIAJhdKlmVHK9OELsJkYna9vllaWhDp_eYTv3g4FMPQ';
const SOURCE_SHEET_NAME = 'רשימה משולבת';

const REQUESTS_SHEET_NAME = 'בקשות מפה אישית';
const NOTIFY_EMAIL = 'jiluz11@gmail.com';
const SCRIPT_VERSION = '2026-05-05-STABLE-GET';

function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const badgeNo = normalizeBadgeNo(params.badgeNo);

    if (!badgeNo) {
      return jsonOutput({
        ok: false,
        version: SCRIPT_VERSION,
        error: 'Missing badgeNo'
      });
    }

    const person = findPersonByBadgeNo(badgeNo);

    return jsonOutput({
      ok: true,
      version: SCRIPT_VERSION,
      badgeNo: badgeNo,
      found: !!person,
      person: person
    });

  } catch (err) {
    return jsonOutput({
      ok: false,
      version: SCRIPT_VERSION,
      error: String(err)
    });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || '{}');
    const action = String(data.action || 'submitRequest').trim();

    if (action === 'updateEmail') {
      return handleUpdateEmail(data);
    }

    if (action === 'submitRequest') {
      return submitMapRequest(data);
    }

    return jsonOutput({
      ok: false,
      version: SCRIPT_VERSION,
      error: 'Unknown action: ' + action
    });

  } catch (err) {
    return jsonOutput({
      ok: false,
      version: SCRIPT_VERSION,
      error: String(err)
    });
  }
}

function handleUpdateEmail(data) {
  const badgeNo = normalizeBadgeNo(data.badgeNo);
  const email = normalizeText(data.email);

  if (!badgeNo || !email) {
    return jsonOutput({
      ok: false,
      version: SCRIPT_VERSION,
      error: 'Missing badgeNo or email'
    });
  }

  const result = updatePersonEmail(badgeNo, email);

  return jsonOutput({
    ok: result.updated,
    version: SCRIPT_VERSION,
    updated: result.updated,
    badgeNo: badgeNo,
    row: result.row,
    oldEmail: result.oldEmail,
    newEmail: result.newEmail,
    error: result.updated ? '' : 'BadgeNo not found'
  });
}

function findPersonByBadgeNo(badgeNo) {
  const ss = SpreadsheetApp.openById(SOURCE_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SOURCE_SHEET_NAME);

  if (!sheet) {
    throw new Error('Sheet not found: ' + SOURCE_SHEET_NAME);
  }

  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    const nameHe = normalizeText(values[i][0]);       // A
    const rowBadgeNo = normalizeBadgeNo(values[i][1]); // B
    const email = normalizeText(values[i][4]);        // E

    if (rowBadgeNo === badgeNo) {
      return {
        nameHe: nameHe,
        email: email,
        row: i + 1
      };
    }
  }

  return null;
}

function updatePersonEmail(badgeNo, email) {
  const ss = SpreadsheetApp.openById(SOURCE_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SOURCE_SHEET_NAME);

  if (!sheet) {
    throw new Error('Sheet not found: ' + SOURCE_SHEET_NAME);
  }

  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    const rowBadgeNo = normalizeBadgeNo(values[i][1]); // B

    if (rowBadgeNo === badgeNo) {
      const rowNumber = i + 1;
      const oldEmail = normalizeText(values[i][4]); // E

      sheet.getRange(rowNumber, 5).setValue(email); // E
      SpreadsheetApp.flush();

      return {
        updated: true,
        row: rowNumber,
        oldEmail: oldEmail,
        newEmail: email
      };
    }
  }

  return {
    updated: false,
    row: null,
    oldEmail: '',
    newEmail: email
  };
}

function submitMapRequest(data) {
  const badgeNo = normalizeBadgeNo(data.badgeNo);
  const nameHe = normalizeText(data.nameHe);
  const email = normalizeText(data.email);
  const publishAllowed = !!data.publishAllowed;

  if (!badgeNo || !nameHe || !email) {
    return jsonOutput({
      ok: false,
      version: SCRIPT_VERSION,
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
      'Notes',
      'ScriptVersion',
      'NotifySent',
      'NotifyError'
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
    '',
    SCRIPT_VERSION,
    '',
    ''
  ]);

  const savedRow = sheet.getLastRow();
  SpreadsheetApp.flush();

  const notifyResult = sendAdminNotificationOnly(
    badgeNo,
    nameHe,
    email,
    publishAllowed
  );

  sheet.getRange(savedRow, 10).setValue(notifyResult.sent ? 'כן' : 'לא');
  sheet.getRange(savedRow, 11).setValue(notifyResult.error || '');
  SpreadsheetApp.flush();

  return jsonOutput({
    ok: true,
    version: SCRIPT_VERSION,
    saved: true,
    row: savedRow,
    notifySent: notifyResult.sent,
    notifyError: notifyResult.error || ''
  });
}

function sendAdminNotificationOnly(badgeNo, nameHe, email, publishAllowed) {
  try {
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: 'בקשה חדשה למפה אישית - יעל #' + badgeNo,
      body:
        'התקבלה בקשה חדשה למפה אישית.\n\n' +
        'מספר יעל: ' + badgeNo + '\n' +
        'שם: ' + nameHe + '\n' +
        'אימייל: ' + email + '\n' +
        'אישור הפצה באתר: ' + (publishAllowed ? 'כן' : 'לא') + '\n\n' +
        'גרסת סקריפט: ' + SCRIPT_VERSION
    });

    return {
      sent: true,
      error: ''
    };

  } catch (err) {
    return {
      sent: false,
      error: String(err)
    };
  }
}

function normalizeBadgeNo(value) {
  if (value === null || value === undefined) {
    return '';
  }

  let s = String(value).trim();
  s = s.replace(/\.0$/, '');
  s = s.replace(/\s+/g, '');

  return s;
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}