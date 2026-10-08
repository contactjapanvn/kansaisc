/**
 * KSC Work Schedule — Google Apps Script backend
 *
 * Setup:
 * 1. Create a Google Spreadsheet with sheets:
 *    Employees, Registrations, ApprovedSchedules, Confirmations, Settings
 * 2. Extensions → Apps Script → paste this file
 * 3. Set Script Properties: ADMIN_USER, ADMIN_PASS, ADMIN_TOKEN_SECRET
 * 4. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone (or Anyone with Google account — then adjust fetch auth)
 * 5. Copy Web App URL into js/config.js → GAS_WEB_APP_URL and set mode: "live"
 *
 * Security notes:
 * - PIN is verified only on the server; never return PIN to clients.
 * - Admin actions require token issued by adminLogin.
 * - Do not put real employee data into the public GitHub HTML.
 */

var SHEETS = {
  Employees: ["id", "empCode", "nameLatin", "nameKana", "birthday", "visaType", "visaExpiry", "busStop", "workplace", "pin"],
  Registrations: ["id", "empCode", "nameLatin", "nameKana", "birthday", "visaType", "visaExpiry", "busStop", "workplace", "pin", "daysJson", "status", "createdAt", "reviewedAt"],
  ApprovedSchedules: ["id", "empCode", "nameLatin", "nameKana", "date", "shift", "workplace", "busStop"],
  Confirmations: ["id", "scheduleId", "empCode", "date", "shift", "confirmedAt"],
  Settings: ["key", "value"],
};

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, service: "KSC", hint: "Use POST" })).setMimeType(
    ContentService.MimeType.JSON
  );
}

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    var action = body.action;
    var result;
    switch (action) {
      case "ping":
        result = { ok: true, mode: "live" };
        break;
      case "submitRegistration":
        result = submitRegistration_(body.form || {});
        break;
      case "getTomorrowShifts":
        result = getTomorrowShifts_();
        break;
      case "confirmAttendance":
        result = confirmAttendance_(body);
        break;
      case "adminLogin":
        result = adminLogin_(body);
        break;
      case "adminLogout":
        result = adminLogout_(body.token);
        break;
      case "listRegistrations":
        result = requireAdmin_(body.token) || listRegistrations_();
        break;
      case "setRegistrationStatus":
        result = requireAdmin_(body.token) || setRegistrationStatus_(body);
        break;
      case "assignFromRegistration":
        result = requireAdmin_(body.token) || assignFromRegistration_(body);
        break;
      case "listSchedules":
        result = requireAdmin_(body.token) || listSchedules_(body);
        break;
      case "updateSchedule":
        result = requireAdmin_(body.token) || updateSchedule_(body.item || {});
        break;
      case "deleteSchedule":
        result = requireAdmin_(body.token) || deleteSchedule_(body.id);
        break;
      default:
        result = { ok: false, error: "UNKNOWN_ACTION" };
    }
    return json_(result);
  } catch (err) {
    return json_({ ok: false, error: "SERVER", message: String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function ss_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function ensureSheets_() {
  Object.keys(SHEETS).forEach(function (name) {
    var sh = ss_().getSheetByName(name);
    if (!sh) {
      sh = ss_().insertSheet(name);
      sh.appendRow(SHEETS[name]);
    } else if (sh.getLastRow() === 0) {
      sh.appendRow(SHEETS[name]);
    }
  });
}

function sheetToObjects_(name) {
  ensureSheets_();
  var sh = ss_().getSheetByName(name);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      obj[headers[c]] = values[i][c];
    }
    rows.push(obj);
  }
  return rows;
}

function appendObject_(name, obj) {
  ensureSheets_();
  var headers = SHEETS[name];
  var sh = ss_().getSheetByName(name);
  var row = headers.map(function (h) {
    return obj[h] != null ? obj[h] : "";
  });
  sh.appendRow(row);
}

function updateObjectById_(name, id, patch) {
  ensureSheets_();
  var sh = ss_().getSheetByName(name);
  var values = sh.getDataRange().getValues();
  var headers = values[0];
  var idCol = headers.indexOf("id");
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(id)) {
      Object.keys(patch).forEach(function (k) {
        var col = headers.indexOf(k);
        if (col >= 0) sh.getRange(i + 1, col + 1).setValue(patch[k]);
      });
      return true;
    }
  }
  return false;
}

function deleteById_(name, id) {
  ensureSheets_();
  var sh = ss_().getSheetByName(name);
  var values = sh.getDataRange().getValues();
  var idCol = values[0].indexOf("id");
  for (var i = values.length - 1; i >= 1; i--) {
    if (String(values[i][idCol]) === String(id)) {
      sh.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function uid_(prefix) {
  return prefix + "_" + Utilities.getUuid().replace(/-/g, "").slice(0, 12);
}

function tomorrowISO_() {
  var d = new Date();
  d.setDate(d.getDate() + 1);
  return Utilities.formatDate(d, Session.getScriptTimeZone() || "Asia/Tokyo", "yyyy-MM-dd");
}

function prop_(key, fallback) {
  var v = PropertiesService.getScriptProperties().getProperty(key);
  return v != null && v !== "" ? v : fallback;
}

function adminLogin_(body) {
  var user = prop_("ADMIN_USER", "admin");
  var pass = prop_("ADMIN_PASS", "");
  if (!pass) return { ok: false, error: "ADMIN_NOT_CONFIGURED" };
  if (String(body.username) !== user || String(body.password) !== pass) {
    return { ok: false, error: "AUTH", messageKey: "loginFail" };
  }
  var token = uid_("tok");
  var cache = CacheService.getScriptCache();
  cache.put("admin:" + token, "1", 21600); // 6h
  return { ok: true, mode: "live", token: token };
}

function adminLogout_(token) {
  if (token) CacheService.getScriptCache().remove("admin:" + token);
  return { ok: true };
}

function requireAdmin_(token) {
  if (!token || CacheService.getScriptCache().get("admin:" + token) !== "1") {
    return { ok: false, error: "FORBIDDEN" };
  }
  return null;
}

function submitRegistration_(form) {
  ensureSheets_();
  var id = uid_("r");
  var row = {
    id: id,
    empCode: String(form.empCode || "").toUpperCase(),
    nameLatin: form.nameLatin || "",
    nameKana: form.nameKana || "",
    birthday: form.birthday || "",
    visaType: form.visaType || "",
    visaExpiry: form.visaExpiry || "",
    busStop: form.busStop || "",
    workplace: form.workplace || "",
    pin: String(form.pin || ""),
    daysJson: JSON.stringify(form.days || []),
    status: "pending",
    createdAt: new Date().toISOString(),
    reviewedAt: "",
  };
  appendObject_("Registrations", row);

  // Upsert employee pin (server-side only)
  var emps = sheetToObjects_("Employees");
  var found = emps.filter(function (e) {
    return String(e.empCode) === row.empCode;
  })[0];
  if (!found) {
    appendObject_("Employees", {
      id: uid_("e"),
      empCode: row.empCode,
      nameLatin: row.nameLatin,
      nameKana: row.nameKana,
      birthday: row.birthday,
      visaType: row.visaType,
      visaExpiry: row.visaExpiry,
      busStop: row.busStop,
      workplace: row.workplace,
      pin: row.pin,
    });
  } else {
    updateObjectById_("Employees", found.id, {
      pin: row.pin,
      nameLatin: row.nameLatin,
      nameKana: row.nameKana,
      busStop: row.busStop,
      workplace: row.workplace,
    });
  }

  // Never echo PIN back
  delete row.pin;
  return { ok: true, mode: "live", registration: row };
}

function getTomorrowShifts_() {
  var date = tomorrowISO_();
  var schedules = sheetToObjects_("ApprovedSchedules").filter(function (s) {
    return String(s.date) === date || String(s.date).indexOf(date) === 0;
  });
  var confs = sheetToObjects_("Confirmations");
  var byShift = {};
  schedules.forEach(function (s) {
    if (!byShift[s.shift]) byShift[s.shift] = [];
    var conf = confs.filter(function (c) {
      return String(c.scheduleId) === String(s.id) || (String(c.empCode) === String(s.empCode) && String(c.date).indexOf(date) === 0 && c.shift === s.shift);
    })[0];
    byShift[s.shift].push({
      id: s.id,
      empCode: s.empCode,
      nameLatin: s.nameLatin,
      nameKana: s.nameKana,
      date: date,
      shift: s.shift,
      workplace: s.workplace,
      busStop: s.busStop,
      confirmed: !!conf,
      confirmedAt: conf ? conf.confirmedAt : null,
    });
  });
  return { ok: true, mode: "live", date: date, shifts: byShift };
}

function confirmAttendance_(body) {
  var scheduleId = body.scheduleId;
  var empCode = String(body.empCode || "").toUpperCase();
  var pin = String(body.pin || "");
  var schedules = sheetToObjects_("ApprovedSchedules");
  var schedule = schedules.filter(function (s) {
    return String(s.id) === String(scheduleId);
  })[0];
  if (!schedule || String(schedule.empCode).toUpperCase() !== empCode) {
    return { ok: false, error: "NOT_FOUND", messageKey: "notFound" };
  }
  var emp = sheetToObjects_("Employees").filter(function (e) {
    return String(e.empCode).toUpperCase() === empCode;
  })[0];
  if (!emp || String(emp.pin) !== pin) {
    return { ok: false, error: "WRONG_PIN", messageKey: "wrongPin" };
  }
  var confs = sheetToObjects_("Confirmations");
  var dup = confs.filter(function (c) {
    return String(c.scheduleId) === String(scheduleId);
  })[0];
  if (dup) {
    return { ok: false, error: "DUPLICATE", messageKey: "alreadyConfirmed", confirmation: { id: dup.id, confirmedAt: dup.confirmedAt } };
  }
  var row = {
    id: uid_("c"),
    scheduleId: scheduleId,
    empCode: empCode,
    date: schedule.date,
    shift: schedule.shift,
    confirmedAt: new Date().toISOString(),
  };
  appendObject_("Confirmations", row);
  return { ok: true, mode: "live", confirmation: row };
}

function listRegistrations_() {
  var items = sheetToObjects_("Registrations").map(function (r) {
    var copy = {};
    Object.keys(r).forEach(function (k) {
      if (k !== "pin") copy[k] = r[k];
    });
    try {
      copy.days = JSON.parse(r.daysJson || "[]");
    } catch (e) {
      copy.days = [];
    }
    return copy;
  });
  return { ok: true, mode: "live", items: items };
}

function setRegistrationStatus_(body) {
  var ok = updateObjectById_("Registrations", body.id, {
    status: body.status,
    reviewedAt: new Date().toISOString(),
  });
  return ok ? { ok: true, mode: "live" } : { ok: false, error: "NOT_FOUND" };
}

function assignFromRegistration_(body) {
  var regs = sheetToObjects_("Registrations");
  var reg = regs.filter(function (r) {
    return String(r.id) === String(body.regId);
  })[0];
  if (!reg) return { ok: false, error: "NOT_FOUND" };
  var row = {
    id: uid_("s"),
    empCode: reg.empCode,
    nameLatin: reg.nameLatin,
    nameKana: reg.nameKana,
    date: body.date,
    shift: body.shift,
    workplace: reg.workplace,
    busStop: reg.busStop,
  };
  appendObject_("ApprovedSchedules", row);
  if (reg.status === "pending") {
    updateObjectById_("Registrations", reg.id, { status: "approved", reviewedAt: new Date().toISOString() });
  }
  return { ok: true, mode: "live", item: row };
}

function listSchedules_(body) {
  var confs = sheetToObjects_("Confirmations");
  var items = sheetToObjects_("ApprovedSchedules").filter(function (s) {
    if (body.date && String(s.date).indexOf(String(body.date)) !== 0) return false;
    if (body.shift && s.shift !== body.shift) return false;
    if (body.workplace && s.workplace !== body.workplace) return false;
    return true;
  }).map(function (s) {
    var conf = confs.filter(function (c) {
      return String(c.scheduleId) === String(s.id);
    })[0];
    return {
      id: s.id,
      empCode: s.empCode,
      nameLatin: s.nameLatin,
      nameKana: s.nameKana,
      date: s.date,
      shift: s.shift,
      workplace: s.workplace,
      busStop: s.busStop,
      confirmed: !!conf,
      confirmedAt: conf ? conf.confirmedAt : null,
    };
  });
  return { ok: true, mode: "live", items: items };
}

function updateSchedule_(item) {
  if (!item.id) return { ok: false, error: "NOT_FOUND" };
  var patch = {};
  ["shift", "workplace", "busStop", "date", "nameKana", "nameLatin"].forEach(function (k) {
    if (item[k] != null) patch[k] = item[k];
  });
  var ok = updateObjectById_("ApprovedSchedules", item.id, patch);
  return ok ? { ok: true, mode: "live", item: item } : { ok: false, error: "NOT_FOUND" };
}

function deleteSchedule_(id) {
  var ok = deleteById_("ApprovedSchedules", id);
  return ok ? { ok: true, mode: "live" } : { ok: false, error: "NOT_FOUND" };
}
