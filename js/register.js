document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("regForm");
  const dayList = document.getElementById("dayList");
  const msg = document.getElementById("msg");
  const shifts = window.KSC_CONFIG.shifts;

  function fillLookups() {
    window.KSC_UI.fillSelect(document.getElementById("visaType"), window.KSC_CONFIG.visaTypes);
    window.KSC_UI.fillSelect(document.getElementById("busStop"), window.KSC_CONFIG.busStops);
    window.KSC_UI.fillSelect(document.getElementById("workplace"), window.KSC_CONFIG.workplaces);
  }

  function renderDays() {
    const dates = window.KSC_DemoDB.weekDates(1, 7);
    const lang = window.KSC_Lang.get();
    dayList.innerHTML = dates
      .map((date, idx) => {
        const label = window.KSC_UI.formatDate(date);
        const weekday = new Date(date + "T12:00:00").toLocaleDateString(lang === "ja" ? "ja-JP" : "vi-VN", {
          weekday: "short",
        });
        return `<div class="day-row">
          <div class="day-top">
            <input type="checkbox" name="dayCheck" value="${date}" id="d${idx}" />
            <label for="d${idx}"><strong>${label}</strong> <span class="muted">(${weekday})</span></label>
          </div>
          <select name="shift_${date}" disabled>
            <option value="">${window.KSC_Lang.t("selectShift")}</option>
            ${shifts.map((s) => `<option value="${s}">${s}</option>`).join("")}
          </select>
        </div>`;
      })
      .join("");

    dayList.querySelectorAll('input[name="dayCheck"]').forEach((cb) => {
      cb.addEventListener("change", () => {
        const sel = dayList.querySelector(`select[name="shift_${cb.value}"]`);
        sel.disabled = !cb.checked;
        if (!cb.checked) sel.value = "";
      });
    });
  }

  fillLookups();
  renderDays();
  document.addEventListener("ksc:lang", () => {
    fillLookups();
    renderDays();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.classList.add("hidden");
    const fd = new FormData(form);
    const days = [];
    dayList.querySelectorAll('input[name="dayCheck"]:checked').forEach((cb) => {
      const shift = fd.get("shift_" + cb.value);
      if (shift) days.push({ date: cb.value, shift: String(shift) });
    });

    if (!days.length) {
      window.KSC_UI.toast(msg, "err", window.KSC_Lang.t("required"));
      return;
    }

    const payload = {
      nameLatin: String(fd.get("nameLatin") || "").trim(),
      nameKana: String(fd.get("nameKana") || "").trim(),
      birthday: String(fd.get("birthday") || ""),
      empCode: String(fd.get("empCode") || "").trim().toUpperCase(),
      pin: String(fd.get("pin") || "").trim(),
      visaType: String(fd.get("visaType") || ""),
      visaExpiry: String(fd.get("visaExpiry") || ""),
      busStop: String(fd.get("busStop") || ""),
      workplace: String(fd.get("workplace") || ""),
      days,
    };

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    const res = await window.KSC_API.get().submitRegistration(payload);
    btn.disabled = false;

    if (!res.ok) {
      window.KSC_UI.toast(msg, "err", res.message || window.KSC_Lang.t("required"));
      return;
    }

    // Only mention Sheets when live mode succeeded
    let text = window.KSC_Lang.t("regSuccess");
    if (res.mode === "demo") {
      text += " [" + window.KSC_Lang.t("demoBadge") + "]";
    }
    window.KSC_UI.toast(msg, "ok", text);
    form.reset();
    renderDays();
    fillLookups();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});
