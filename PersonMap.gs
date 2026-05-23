const SOURCE_SPREADSHEET_ID = '1UIAJhdKlmVHK9OELsJkYna9vllaWhDp_eYTv3g4FMPQ';
const SOURCE_SHEET_NAME = 'רשימה משולבת';
const LOCAL_SPREADSHEET_ID = '1KAXwu3vIxssREWIyLdM_tvmvDmeGZhETNvOGgO6PaZA';
const LOCAL_EMAILS_SHEET_NAME = 'מיילים מקומיים';
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

    const person = findPersonByBadgeNo_SWITCH(badgeNo);

    if (!person) {
      return jsonOutput({
        ok: false,
        version: SCRIPT_VERSION,
        badgeNo: badgeNo,
        found: false,
        person: null,
        error: 'BadgeNo not found'
      });
    }


   return jsonOutput({
      ok: true,
      version: SCRIPT_VERSION,
      badgeNo: badgeNo,
      found: !!person,
      person: person
    });
   

   /* return jsonOutput({
      ok: true,
      version: SCRIPT_VERSION,
      useBadgeIndex: USE_BADGE_INDEX,
      badgeNo: badgeNo,
      found: !!person,
      person: person
    });*/
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
function findPersonByBadgeNo_SWITCH(badgeNo) {

  badgeNo = biNormalizeBadgeNo_(badgeNo);

  if (!badgeNo) {
    return null;
  }

  if (USE_BADGE_INDEX) {
    return findPersonByBadgeNoFromIndex(badgeNo);
  }

  return findPersonByBadgeNo(badgeNo);
}
function findPersonByBadgeNo(badgeNo) {
  const sourceSS = SpreadsheetApp.openById(SOURCE_SPREADSHEET_ID);
  const sourceSheet = sourceSS.getSheetByName(SOURCE_SHEET_NAME);

  if (!sourceSheet) {
    throw new Error('Sheet not found: ' + SOURCE_SHEET_NAME);
  }

  const values = sourceSheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    const nameHe = normalizeText(values[i][0]);        // A
    const rowBadgeNo = normalizeBadgeNo(values[i][1]); // B
    const sourceEmail = normalizeText(values[i][4]);   // E

    if (rowBadgeNo === badgeNo) {
      const localEmail = getLocalEmailByBadgeNo(badgeNo);

      return {
        nameHe: nameHe,
        email: localEmail || sourceEmail,
        sourceEmail: sourceEmail,
        localEmail: localEmail,
        row: i + 1
      };
    }
  }

  return null;
}
function getLocalEmailByBadgeNo(badgeNo) {
  const ss = SpreadsheetApp.openById(LOCAL_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(LOCAL_EMAILS_SHEET_NAME);

  if (!sheet) {
    return '';
  }

  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (normalizeBadgeNo(values[i][0]) === badgeNo) {
      return normalizeText(values[i][1]); // Email
    }
  }

  return '';
}
function updatePersonEmail(badgeNo, email) {
  const ss = SpreadsheetApp.openById(LOCAL_SPREADSHEET_ID);
  let sheet = ss.getSheetByName(LOCAL_EMAILS_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(LOCAL_EMAILS_SHEET_NAME);
    sheet.appendRow(['BadgeNo', 'Email', 'UpdatedAt']);
  }

  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (normalizeBadgeNo(values[i][0]) === badgeNo) {
      sheet.getRange(i + 1, 2).setValue(email);
      sheet.getRange(i + 1, 3).setValue(new Date());
      SpreadsheetApp.flush();

      return {
        updated: true,
        row: i + 1,
        oldEmail: normalizeText(values[i][1]),
        newEmail: email
      };
    }
  }

  sheet.appendRow([badgeNo, email, new Date()]);
  SpreadsheetApp.flush();

  return {
    updated: true,
    row: sheet.getLastRow(),
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

  const ss = SpreadsheetApp.openById(LOCAL_SPREADSHEET_ID);
  let sheet = ss.getSheetByName(REQUESTS_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(REQUESTS_SHEET_NAME);
  }

  ensureRequestHeaders(sheet);

  const headerMap = getHeaderMap(sheet);
  const reqId = getNextReqIdByHeader(sheet, headerMap);

  const rowObj = {
    'ReqId': reqId,
    'Timestamp': new Date(),
    'BadgeNo': badgeNo,
    'שם בעברית': nameHe,
    'Email': email,
    'PublishAllowed': publishAllowed ? 'כן' : 'לא',
    'Status': 'New',
    'MapUrl': '',
    'Notes': '',
    'ScriptVersion': SCRIPT_VERSION,
    'NotifySent': '',
    'NotifyError': ''
  };

  const rowValues = buildRowByHeaders(sheet, rowObj);
  sheet.appendRow(rowValues);

  const savedRow = sheet.getLastRow();
  SpreadsheetApp.flush();

  const notifyResult = sendAdminNotificationOnly(
    badgeNo,
    nameHe,
    email,
    publishAllowed
  );

  setCellByHeader(sheet, savedRow, 'NotifySent', notifyResult.sent ? 'כן' : 'לא');
  setCellByHeader(sheet, savedRow, 'NotifyError', notifyResult.error || '');
  SpreadsheetApp.flush();

  return jsonOutput({
    ok: true,
    version: SCRIPT_VERSION,
    saved: true,
    row: savedRow,
    reqId: reqId,
    notifySent: notifyResult.sent,
    notifyError: notifyResult.error || ''
  });
}
function ensureRequestHeaders(sheet) {
  const requiredHeaders = [
    'ReqId',
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
  ];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(requiredHeaders);
    return;
  }

  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
    .map(function (h) {
      return normalizeText(h);
    });

  requiredHeaders.forEach(function (header) {
    if (existingHeaders.indexOf(header) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
    }
  });
}

function getHeaderMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};

  headers.forEach(function (header, index) {
    const key = normalizeText(header);
    if (key) {
      map[key] = index + 1;
    }
  });

  return map;
}

function buildRowByHeaders(sheet, rowObj) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  return headers.map(function (header) {
    const key = normalizeText(header);
    return Object.prototype.hasOwnProperty.call(rowObj, key) ? rowObj[key] : '';
  });
}

function setCellByHeader(sheet, rowNumber, headerName, value) {
  const headerMap = getHeaderMap(sheet);
  const col = headerMap[headerName];

  if (!col) {
    throw new Error('Missing header: ' + headerName);
  }

  sheet.getRange(rowNumber, col).setValue(value);
}

function getNextReqIdByHeader(sheet, headerMap) {
  const reqIdCol = headerMap['ReqId'];

  if (!reqIdCol) {
    throw new Error('Missing header: ReqId');
  }

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return 1;
  }

  const values = sheet.getRange(2, reqIdCol, lastRow - 1, 1).getValues();
  let maxId = 0;

  values.forEach(function (row) {
    const n = Number(row[0]);
    if (!isNaN(n) && n > maxId) {
      maxId = n;
    }
  });

  return maxId + 1;
}
function getNextReqId(sheet) {
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return 1;
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let maxId = 0;

  values.forEach(function (row) {
    const n = Number(row[0]);
    if (!isNaN(n) && n > maxId) {
      maxId = n;
    }
  });

  return maxId + 1;
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