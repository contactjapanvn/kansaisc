document.addEventListener("DOMContentLoaded", () => {
  const api = () => window.KSC_API.get();
  const loginSection = document.getElementById("loginSection");
  const adminSection = document.getElementById("adminSection");
  const logoutBtn = document.getElementById("logoutBtn");
  const msg = document.getElementById("msg");
  const loginForm = document.getElementById("loginForm");

  function showAuth() {
    const ok = api().adminAuthed();
    loginSection.classList.toggle("hidden", ok);
    adminSection.classList.toggle("hidden", !ok);
    logoutBtn.classList.toggle("hidden", !ok);
    if (ok) refreshAll();
  }

  function setTab(name) {
    document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("hidden", p.id !== "tab-" + name));
  }

  document.querySelectorAll(".tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      setTab(btn.dataset.tab);
      if (btn.dataset.tab === "regs") renderRegs();
      if (btn.dataset.tab === "schedule") renderSchedule();
      if (btn.dataset.tab === "confirm") renderConfirm();
    });
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.classList.add("hidden");
    const fd = new FormData(loginForm);
    const res = await api().adminLogin({
      username: String(fd.get("username") || ""),
      password: String(fd.get("password") || ""),
    });
    if (!res.ok) {
      window.KSC_UI.toast(msg, "err", window.KSC_Lang.t("loginFail"));
      return;
    }
    showAuth();
  });

  logoutBtn.addEventListener("click", () => {
    api().adminLogout();
    showAuth();
  });

  async function renderRegs() {
    const box = document.getElementById("regList");
    const res = await api().listRegistrations();
    if (!res.ok) {
      box.innerHTML = `<div class="card muted">${window.KSC_Lang.t("noData")}</div>`;
      return;
    }
    if (!res.items.length) {
      box.innerHTML = `<div class="card muted">${window.KSC_Lang.t("noData")}</div>`;
      return;
    }
    const lang = window.KSC_Lang.get();
    box.innerHTML = res.items
      .map((r) => {
        const statusPill =
          r.status === "approved"
            ? `<span class="pill ok">${window.KSC_Lang.t("approved")}</span>`
            : r.status === "rejected"
              ? `<span class="pill bad">${window.KSC_Lang.t("rejected")}</span>`
              : `<span class="pill wait">${window.KSC_Lang.t("regPending")}</span>`;
        const days = (r.days || [])
          .map((d) => `<li>${window.KSC_UI.formatDate(d.date)} · ${d.shift}</li>`)
          .join("");
        return `<div class="card" data-id="${r.id}">
          <div class="row" style="display:flex;justify-content:space-between;gap:.5rem;align-items:center">
            <strong>${r.nameKana}</strong>
            ${statusPill}
          </div>
          <div class="meta muted" style="margin-top:.4rem;font-size:.85rem;display:grid;gap:.2rem">
            <span>${r.nameLatin} · ${r.empCode}</span>
            <span>${window.KSC_Lang.t("workplace")}: ${window.KSC_API.labelPlace(r.workplace, lang)}</span>
            <span>${window.KSC_Lang.t("busStop")}: ${window.KSC_API.labelBus(r.busStop, lang)}</span>
            <span>${window.KSC_Lang.t("visaType")}: ${r.visaType}</span>
            <ul style="margin-left:1rem">${days}</ul>
          </div>
          <div class="admin-actions">
            <button class="btn btn-sm btn-green" data-act="approve" ${r.status !== "pending" ? "disabled" : ""}>${window.KSC_Lang.t("approve")}</button>
            <button class="btn btn-sm btn-danger" data-act="reject" ${r.status !== "pending" ? "disabled" : ""}>${window.KSC_Lang.t("reject")}</button>
            <button class="btn btn-sm btn-blue" data-act="assign">${window.KSC_Lang.t("assign")}</button>
          </div>
        </div>`;
      })
      .join("");

    box.querySelectorAll("[data-act]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const card = btn.closest("[data-id]");
        const id = card.dataset.id;
        const item = res.items.find((x) => x.id === id);
        if (btn.dataset.act === "approve") {
          await api().setRegistrationStatus({ id, status: "approved" });
          renderRegs();
        } else if (btn.dataset.act === "reject") {
          await api().setRegistrationStatus({ id, status: "rejected" });
          renderRegs();
        } else if (btn.dataset.act === "assign") {
          const day = (item.days && item.days[0]) || {
            date: window.KSC_DemoDB.tomorrowISO(),
            shift: window.KSC_CONFIG.shifts[0],
          };
          const date = prompt("Date (YYYY-MM-DD)", day.date);
          if (!date) return;
          const shift = prompt("Shift", day.shift);
          if (!shift) return;
          await api().assignFromRegistration({ regId: id, date, shift });
          renderRegs();
          renderSchedule();
        }
      });
    });
  }

  function setupFilters() {
    const fShift = document.getElementById("fShift");
    const fPlace = document.getElementById("fPlace");
    const fDate = document.getElementById("fDate");
    if (!fDate.value) fDate.value = window.KSC_DemoDB.tomorrowISO();
    fShift.innerHTML =
      `<option value="">—</option>` + window.KSC_CONFIG.shifts.map((s) => `<option value="${s}">${s}</option>`).join("");
    window.KSC_UI.fillSelect(fPlace, [{ id: "", vi: "—", ja: "—" }, ...window.KSC_CONFIG.workplaces]);
    [fDate, fShift, fPlace].forEach((el) => {
      el.onchange = () => {
        renderSchedule();
        renderConfirm();
      };
    });
  }

  async function renderSchedule() {
    const box = document.getElementById("schedList");
    const filters = {
      date: document.getElementById("fDate").value,
      shift: document.getElementById("fShift").value,
      workplace: document.getElementById("fPlace").value,
    };
    const res = await api().listSchedules(filters);
    if (!res.ok || !res.items.length) {
      box.innerHTML = `<div class="card muted">${window.KSC_Lang.t("noData")}</div>`;
      return;
    }
    const lang = window.KSC_Lang.get();
    box.innerHTML = res.items
      .map((s) => {
        const status = s.confirmed
          ? `<span class="pill ok">✓ ${window.KSC_Lang.t("statusConfirmed")}</span>`
          : `<span class="pill wait">${window.KSC_Lang.t("statusUnconfirmed")}</span>`;
        return `<div class="card" data-id="${s.id}">
          <div style="display:flex;justify-content:space-between;gap:.5rem;align-items:center">
            <strong>${s.nameKana}</strong>
            ${status}
          </div>
          <div class="muted" style="margin-top:.35rem;font-size:.85rem;display:grid;gap:.15rem">
            <span>${s.empCode} · ${window.KSC_UI.formatDate(s.date)}</span>
            <span>${s.shift}</span>
            <span>${window.KSC_API.labelPlace(s.workplace, lang)} · ${window.KSC_API.labelBus(s.busStop, lang)}</span>
            ${s.confirmedAt ? `<span>${window.KSC_Lang.t("confirmedAt")}: ${window.KSC_UI.formatDateTime(s.confirmedAt)}</span>` : ""}
          </div>
          <div class="admin-actions">
            <button class="btn btn-sm btn-ghost" data-act="edit">${window.KSC_Lang.t("edit")}</button>
            <button class="btn btn-sm btn-danger" data-act="del">${window.KSC_Lang.t("delete")}</button>
          </div>
        </div>`;
      })
      .join("");

    box.querySelectorAll("[data-act]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.closest("[data-id]").dataset.id;
        const item = res.items.find((x) => x.id === id);
        if (btn.dataset.act === "del") {
          if (!confirm("Delete?")) return;
          await api().deleteSchedule(id);
          renderSchedule();
          renderConfirm();
        } else if (btn.dataset.act === "edit") {
          const shift = prompt("Shift", item.shift);
          if (!shift) return;
          const workplace = prompt("Workplace id", item.workplace);
          if (!workplace) return;
          const busStop = prompt("Bus stop id", item.busStop);
          if (!busStop) return;
          await api().updateSchedule({ id, shift, workplace, busStop });
          renderSchedule();
          renderConfirm();
        }
      });
    });
  }

  async function renderConfirm() {
    const box = document.getElementById("confirmList");
    const filters = {
      date: document.getElementById("fDate").value || window.KSC_DemoDB.tomorrowISO(),
    };
    const res = await api().listSchedules(filters);
    if (!res.ok || !res.items.length) {
      box.innerHTML = `<div class="card muted">${window.KSC_Lang.t("noData")}</div>`;
      return;
    }
    const confirmed = res.items.filter((x) => x.confirmed);
    const pending = res.items.filter((x) => !x.confirmed);
    box.innerHTML = `
      <div class="card">
        <h3>✓ ${window.KSC_Lang.t("statusConfirmed")} (${confirmed.length})</h3>
        <div class="emp-list">${confirmed
          .map(
            (s) => `<div class="emp-item"><div class="row"><strong>${s.nameKana}</strong><span class="pill ok">${s.empCode}</span></div>
            <div class="meta"><span>${s.shift}</span><span>${window.KSC_UI.formatDateTime(s.confirmedAt)}</span></div></div>`
          )
          .join("") || `<p class="muted">${window.KSC_Lang.t("noData")}</p>`}</div>
      </div>
      <div class="card">
        <h3>${window.KSC_Lang.t("statusUnconfirmed")} (${pending.length})</h3>
        <div class="emp-list">${pending
          .map(
            (s) => `<div class="emp-item"><div class="row"><strong>${s.nameKana}</strong><span class="pill wait">${s.empCode}</span></div>
            <div class="meta"><span>${s.shift}</span></div></div>`
          )
          .join("") || `<p class="muted">${window.KSC_Lang.t("noData")}</p>`}</div>
      </div>`;
  }

  async function refreshAll() {
    setupFilters();
    await renderRegs();
    await renderSchedule();
    await renderConfirm();
  }

  document.addEventListener("ksc:lang", () => {
    if (api().adminAuthed()) refreshAll();
  });

  showAuth();
});
