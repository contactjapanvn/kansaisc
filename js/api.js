/**
 * API layer — Demo (localStorage) or Live (Google Apps Script).
 * Never claim Sheets save unless live request succeeds.
 */
(function () {
  const cfg = () => window.KSC_CONFIG;

  function uid(prefix) {
    return prefix + "_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  function labelPlace(id, lang) {
    const list = cfg().workplaces;
    const item = list.find((x) => x.id === id);
    if (!item) return id;
    return lang === "ja" ? item.ja : item.vi;
  }

  function labelBus(id, lang) {
    const list = cfg().busStops;
    const item = list.find((x) => x.id === id);
    if (!item) return id;
    return lang === "ja" ? item.ja : item.vi;
  }

  async function liveRequest(action, payload = {}) {
    const url = cfg().GAS_WEB_APP_URL;
    if (!url) {
      return { ok: false, error: "NO_GAS_URL", message: "Chưa cấu hình GAS_WEB_APP_URL" };
    }
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action, ...payload }),
      });
      if (!res.ok) {
        return { ok: false, error: "HTTP_" + res.status, message: "Không kết nối được Google Sheets" };
      }
      const data = await res.json();
      return data;
    } catch (e) {
      return { ok: false, error: "NETWORK", message: "Không kết nối được Google Sheets" };
    }
  }

  const DemoAPI = {
    mode: "demo",
    async ping() {
      return { ok: true, mode: "demo" };
    },
    async submitRegistration(form) {
      const db = window.KSC_DemoDB.load();
      const row = {
        id: uid("r"),
        ...form,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      db.registrations.unshift(row);
      // Also store pin on employee stub for confirm flow after approve
      const existing = db.employees.find((e) => e.empCode === form.empCode);
      if (!existing) {
        db.employees.push({
          id: uid("e"),
          empCode: form.empCode,
          nameLatin: form.nameLatin,
          nameKana: form.nameKana,
          birthday: form.birthday,
          visaType: form.visaType,
          visaExpiry: form.visaExpiry,
          busStop: form.busStop,
          workplace: form.workplace,
          pin: form.pin,
        });
      } else {
        existing.pin = form.pin;
        existing.nameLatin = form.nameLatin;
        existing.nameKana = form.nameKana;
      }
      window.KSC_DemoDB.save(db);
      return { ok: true, mode: "demo", registration: row };
    },
    async getTomorrowShifts() {
      const db = window.KSC_DemoDB.load();
      const date = window.KSC_DemoDB.tomorrowISO();
      const rows = db.approvedSchedules.filter((s) => s.date === date);
      const byShift = {};
      rows.forEach((s) => {
        if (!byShift[s.shift]) byShift[s.shift] = [];
        const confirmed = db.confirmations.some(
          (c) => c.scheduleId === s.id || (c.empCode === s.empCode && c.date === s.date && c.shift === s.shift)
        );
        const conf = db.confirmations.find(
          (c) => c.scheduleId === s.id || (c.empCode === s.empCode && c.date === s.date && c.shift === s.shift)
        );
        byShift[s.shift].push({
          ...s,
          confirmed,
          confirmedAt: conf ? conf.confirmedAt : null,
        });
      });
      return { ok: true, mode: "demo", date, shifts: byShift };
    },
    async confirmAttendance({ scheduleId, empCode, pin }) {
      const db = window.KSC_DemoDB.load();
      const schedule = db.approvedSchedules.find((s) => s.id === scheduleId);
      if (!schedule || schedule.empCode !== empCode) {
        return { ok: false, error: "NOT_FOUND", messageKey: "notFound" };
      }
      const emp = db.employees.find((e) => e.empCode === empCode);
      if (!emp || String(emp.pin) !== String(pin)) {
        return { ok: false, error: "WRONG_PIN", messageKey: "wrongPin" };
      }
      const dup = db.confirmations.find(
        (c) => c.scheduleId === scheduleId || (c.empCode === empCode && c.date === schedule.date && c.shift === schedule.shift)
      );
      if (dup) {
        return { ok: false, error: "DUPLICATE", messageKey: "alreadyConfirmed", confirmation: dup };
      }
      const row = {
        id: uid("c"),
        scheduleId,
        empCode,
        date: schedule.date,
        shift: schedule.shift,
        confirmedAt: new Date().toISOString(),
      };
      db.confirmations.push(row);
      window.KSC_DemoDB.save(db);
      return { ok: true, mode: "demo", confirmation: row };
    },
    async adminLogin({ username, password }) {
      const db = window.KSC_DemoDB.load();
      if (username === db.settings.adminUser && password === db.settings.adminPass) {
        const token = uid("tok");
        sessionStorage.setItem("ksc_admin_token", token);
        sessionStorage.setItem("ksc_admin_ok", "1");
        return { ok: true, mode: "demo", token };
      }
      return { ok: false, error: "AUTH", messageKey: "loginFail" };
    },
    adminAuthed() {
      return sessionStorage.getItem("ksc_admin_ok") === "1";
    },
    adminLogout() {
      sessionStorage.removeItem("ksc_admin_token");
      sessionStorage.removeItem("ksc_admin_ok");
    },
    async listRegistrations() {
      if (!this.adminAuthed()) return { ok: false, error: "FORBIDDEN" };
      const db = window.KSC_DemoDB.load();
      return { ok: true, mode: "demo", items: db.registrations };
    },
    async setRegistrationStatus({ id, status }) {
      if (!this.adminAuthed()) return { ok: false, error: "FORBIDDEN" };
      const db = window.KSC_DemoDB.load();
      const row = db.registrations.find((r) => r.id === id);
      if (!row) return { ok: false, error: "NOT_FOUND" };
      row.status = status;
      row.reviewedAt = new Date().toISOString();
      window.KSC_DemoDB.save(db);
      return { ok: true, mode: "demo", item: row };
    },
    async assignFromRegistration({ regId, date, shift }) {
      if (!this.adminAuthed()) return { ok: false, error: "FORBIDDEN" };
      const db = window.KSC_DemoDB.load();
      const reg = db.registrations.find((r) => r.id === regId);
      if (!reg) return { ok: false, error: "NOT_FOUND" };
      const row = {
        id: uid("s"),
        empCode: reg.empCode,
        nameLatin: reg.nameLatin,
        nameKana: reg.nameKana,
        date,
        shift,
        workplace: reg.workplace,
        busStop: reg.busStop,
      };
      db.approvedSchedules.push(row);
      if (reg.status === "pending") reg.status = "approved";
      window.KSC_DemoDB.save(db);
      return { ok: true, mode: "demo", item: row };
    },
    async listSchedules({ date, shift, workplace } = {}) {
      if (!this.adminAuthed()) return { ok: false, error: "FORBIDDEN" };
      const db = window.KSC_DemoDB.load();
      let items = db.approvedSchedules.slice();
      if (date) items = items.filter((s) => s.date === date);
      if (shift) items = items.filter((s) => s.shift === shift);
      if (workplace) items = items.filter((s) => s.workplace === workplace);
      items = items.map((s) => {
        const conf = db.confirmations.find(
          (c) => c.scheduleId === s.id || (c.empCode === s.empCode && c.date === s.date && c.shift === s.shift)
        );
        return { ...s, confirmed: !!conf, confirmedAt: conf ? conf.confirmedAt : null };
      });
      return { ok: true, mode: "demo", items };
    },
    async updateSchedule(item) {
      if (!this.adminAuthed()) return { ok: false, error: "FORBIDDEN" };
      const db = window.KSC_DemoDB.load();
      const idx = db.approvedSchedules.findIndex((s) => s.id === item.id);
      if (idx < 0) return { ok: false, error: "NOT_FOUND" };
      db.approvedSchedules[idx] = { ...db.approvedSchedules[idx], ...item };
      window.KSC_DemoDB.save(db);
      return { ok: true, mode: "demo", item: db.approvedSchedules[idx] };
    },
    async deleteSchedule(id) {
      if (!this.adminAuthed()) return { ok: false, error: "FORBIDDEN" };
      const db = window.KSC_DemoDB.load();
      db.approvedSchedules = db.approvedSchedules.filter((s) => s.id !== id);
      window.KSC_DemoDB.save(db);
      return { ok: true, mode: "demo" };
    },
  };

  const LiveAPI = {
    mode: "live",
    async ping() {
      return liveRequest("ping");
    },
    async submitRegistration(form) {
      return liveRequest("submitRegistration", { form });
    },
    async getTomorrowShifts() {
      return liveRequest("getTomorrowShifts");
    },
    async confirmAttendance(payload) {
      return liveRequest("confirmAttendance", payload);
    },
    async adminLogin(payload) {
      const res = await liveRequest("adminLogin", payload);
      if (res.ok && res.token) {
        sessionStorage.setItem("ksc_admin_token", res.token);
        sessionStorage.setItem("ksc_admin_ok", "1");
      }
      return res;
    },
    adminAuthed() {
      return sessionStorage.getItem("ksc_admin_ok") === "1";
    },
    adminLogout() {
      const token = sessionStorage.getItem("ksc_admin_token");
      sessionStorage.removeItem("ksc_admin_token");
      sessionStorage.removeItem("ksc_admin_ok");
      if (token) liveRequest("adminLogout", { token });
    },
    async listRegistrations() {
      return liveRequest("listRegistrations", { token: sessionStorage.getItem("ksc_admin_token") });
    },
    async setRegistrationStatus(payload) {
      return liveRequest("setRegistrationStatus", { ...payload, token: sessionStorage.getItem("ksc_admin_token") });
    },
    async assignFromRegistration(payload) {
      return liveRequest("assignFromRegistration", { ...payload, token: sessionStorage.getItem("ksc_admin_token") });
    },
    async listSchedules(filters) {
      return liveRequest("listSchedules", { ...filters, token: sessionStorage.getItem("ksc_admin_token") });
    },
    async updateSchedule(item) {
      return liveRequest("updateSchedule", { item, token: sessionStorage.getItem("ksc_admin_token") });
    },
    async deleteSchedule(id) {
      return liveRequest("deleteSchedule", { id, token: sessionStorage.getItem("ksc_admin_token") });
    },
  };

  function getAPI() {
    return cfg().mode === "live" && cfg().GAS_WEB_APP_URL ? LiveAPI : DemoAPI;
  }

  window.KSC_API = {
    get: getAPI,
    labelPlace,
    labelBus,
    isDemo() {
      return getAPI().mode === "demo";
    },
    connectionBadge() {
      if (cfg().mode === "live" && cfg().GAS_WEB_APP_URL) return "live";
      return "demo";
    },
  };
})();
