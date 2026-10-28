/**
 * Radical Minds Academy plan builder: receives plans from the website,
 * logs them to the "Leads" tab, and emails Garrett + the family.
 *
 * Setup (see README):
 *  1. Create a Google Sheet called "RadAcad Plan Builder Leads".
 *  2. Extensions → Apps Script. Paste this file in as Code.gs.
 *  3. Run setup() once and approve permissions.
 *  4. Deploy → New deployment → Web app. Execute as: Me. Who has access: Anyone.
 *  5. Paste the web app URL into "endpoint" in public/plans.json.
 *
 * Whoever deploys is who the emails come FROM. Deploy from Garrett's account if you can.
 */

var CONFIG = {
  NOTIFY_TO: 'garrett.austen@tetontutors.org',   // who gets new plans (comma-separate to add Kirby)
  REPLY_TO: 'garrett.austen@tetontutors.org',    // where families' replies go
  FROM_NAME: 'Radical Minds Academy',
  BOOKING_URL: 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ1Q8gq1TkHZIXavogiSe8cKRCuFSOzGxsQJu9oksFk7COsEV5nyFfKEbr_3VWSO_biPIfNgQI6-',
  CALL_LENGTH: '45-minute',
  FOLLOW_UP: 'within 1–2 business days',
  SHEET_NAME: 'Leads'
};

var HEADERS = [
  'Submitted', 'Parent first', 'Parent last', 'Email', 'Phone',
  'Student', 'Grade', 'Start', 'Heard about us',
  'Coursework', 'Days asked for', 'Needs most', 'We suggested',
  'Plan', 'Days', 'Line items', 'Monthly total', 'Class fees', 'ESA estimate',
  'Notes', 'Page', 'Status'
];

/** Run once from the editor to create the Leads tab and approve email permissions. */
function setup() {
  getLeadsSheet_();
  Logger.log('Ready. Emails will send from: ' + Session.getEffectiveUser().getEmail() +
             '. Daily email quota left: ' + MailApp.getRemainingDailyQuota());
}

/** Quick health check: open the web app URL in a browser and you should see {"ok":true}. */
function doGet() {
  return json_({ ok: true, service: 'radacad-plan-builder' });
}

function doPost(e) {
  try {
    var d = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // Spam: bots fill the hidden "company" field. Pretend it worked.
    if (d.company) return json_({ ok: true });

    var p = d.parent || {}, s = d.student || {}, plan = d.plan || {}, a = d.answers || {};
    var email = String(p.email || '').trim();
    if (!p.first || !p.last || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !plan.lines || !plan.lines.length) {
      return json_({ ok: false, error: 'Missing required fields' });
    }

    var items = plan.lines.map(function (l) { return clip_(l.label, 120) + ' ' + money_(l.amount); });
    var total = Number(plan.monthly) || 0;

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var sheet = getLeadsSheet_();
      sheet.insertRowAfter(1); // newest at the top
      sheet.getRange(2, 1, 1, HEADERS.length).setValues([[
        new Date(),
        clip_(p.first), clip_(p.last), clip_(email), clip_(p.phone),
        clip_(s.first), clip_(s.grade), clip_(d.start), clip_(d.heard),
        clip_(a.coursework), clip_(a.days), clip_((a.needs || []).join(', ')), clip_(a.suggested),
        clip_(plan.name), clip_((plan.days || []).join(', ')), clip_(items.join('; '), 1000), total,
        clip_(plan.classFees), clip_(plan.esa),
        clip_(d.notes, 2000), clip_(d.page, 300), 'New'
      ]]);
    } finally {
      lock.releaseLock();
    }

    sendStaffEmail_(d, total);
    sendFamilyEmail_(d, total);

    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'Server error' });
  }
}

/* ---------- emails ---------- */

function sendStaffEmail_(d, total) {
  var p = d.parent, s = d.student, a = d.answers || {};
  var subject = 'New plan: ' + p.first + ' ' + p.last + ' (' + s.first + (s.grade ? ', grade ' + s.grade : '') + ') ' + money_(total) + '/mo';
  var rows = [
    ['Parent', p.first + ' ' + p.last],
    ['Email', p.email],
    ['Phone', p.phone],
    ['Student', s.first + (s.grade ? ', grade ' + s.grade : '')],
    ['Starting', d.start || '—'],
    ['Coursework', a.coursework || '—'],
    ['Days asked for', a.days || '—'],
    ['Needs most', (a.needs || []).join(', ') || '—'],
    ['We suggested', a.suggested || '—'],
    ['Heard about us', d.heard || '—'],
    ['Notes', d.notes || '—']
  ];
  var html =
    '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#000">' +
    '<p style="margin:0 0 12px">A family just built a plan on the website. Reply to this email to reach them directly.</p>' +
    planTable_(d.plan, total) +
    '<table cellpadding="6" style="border-collapse:collapse;margin-top:16px">' +
    rows.map(function (r) {
      return '<tr><td style="color:#555;vertical-align:top;white-space:nowrap">' + esc_(r[0]) + '</td><td>' + esc_(r[1]).replace(/\n/g, '<br>') + '</td></tr>';
    }).join('') +
    '</table></div>';

  MailApp.sendEmail({
    to: CONFIG.NOTIFY_TO,
    replyTo: p.email,
    name: 'RadAcad Plan Builder',
    subject: subject,
    htmlBody: html,
    body: 'New plan from ' + p.first + ' ' + p.last + ' (' + p.email + ', ' + p.phone + '). ' +
          'Plan: ' + d.plan.name + '. Estimated total: ' + money_(total) + '/mo.'
  });
}

function sendFamilyEmail_(d, total) {
  var p = d.parent, s = d.student;
  var html =
    '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#000;max-width:560px">' +
    '<p>Hi ' + esc_(p.first) + ',</p>' +
    '<p>Thanks for building a plan for ' + esc_(s.first) + '. Here’s what you put together:</p>' +
    planTable_(d.plan, total) +
    '<p style="margin-top:20px">The next step is a ' + CONFIG.CALL_LENGTH + ' intro call, so we can get to know your family and fine-tune the plan together.</p>' +
    '<p><a href="' + CONFIG.BOOKING_URL + '" style="display:inline-block;background:#000;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">Book your intro call</a></p>' +
    '<p>Not ready to book? No problem. We’ll reach out ' + CONFIG.FOLLOW_UP + '. You can also just reply to this email.</p>' +
    '<p style="margin-top:20px">School differently,<br>Radical Minds Academy</p>' +
    '<p style="font-size:12px;color:#666">Prices are estimated monthly totals. We’ll confirm every detail on your call.</p>' +
    '</div>';

  MailApp.sendEmail({
    to: p.email,
    replyTo: CONFIG.REPLY_TO,
    name: CONFIG.FROM_NAME,
    subject: 'Your RadAcad plan for ' + s.first,
    htmlBody: html,
    body: 'Hi ' + p.first + ', thanks for building a plan for ' + s.first + '. ' +
          'Your plan: ' + d.plan.name + '. Estimated total: ' + money_(total) + '/mo. Book your intro call: ' + CONFIG.BOOKING_URL
  });
}

function planTable_(plan, total) {
  var rows = (plan.lines || []).map(function (l) { return [l.label, l.amount]; });
  return '<table cellpadding="8" style="border-collapse:collapse;width:100%;max-width:520px;border:1px solid #ddd">' +
    rows.map(function (r) {
      return '<tr><td style="border-bottom:1px solid #eee">' + esc_(r[0]) + '</td>' +
             '<td style="border-bottom:1px solid #eee;text-align:right;white-space:nowrap">' + money_(r[1]) + '/mo</td></tr>';
    }).join('') +
    '<tr><td style="font-weight:bold">Estimated monthly total</td>' +
    '<td style="font-weight:bold;text-align:right;color:#259991;white-space:nowrap">' + money_(total) + '/mo</td></tr>' +
    '</table>' +
    (plan.classFees ? '<p style="margin:8px 0 0;font-size:14px">Plus small group class fees: ' + esc_(plan.classFees) + ', billed at enrollment.</p>' : '') +
    (plan.esa ? '<p style="margin:4px 0 0;font-size:14px;color:#1b6f69">' + esc_(plan.esa) + ' (estimate).</p>' : '') +
    (plan.days && plan.days.length ? '<p style="margin:4px 0 0;font-size:14px;color:#555">Days: ' + esc_(plan.days.join(', ')) + '</p>' : '');
}

/* ---------- helpers ---------- */

function getLeadsSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.insertSheet(CONFIG.SHEET_NAME, 0);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.getRange('A:A').setNumberFormat('mmm d, yyyy h:mm am/pm');
    sheet.getRange('Q:Q').setNumberFormat('$#,##0');
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function clip_(v, n) {
  var s = String(v == null ? '' : v);
  // keep spreadsheet formulas from being injected via form fields
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s.slice(0, n || 200);
}
function esc_(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function money_(n) {
  return '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
}
