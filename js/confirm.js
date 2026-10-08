document.addEventListener("DOMContentLoaded", () => {
  const shiftPick = document.getElementById("shiftPick");
  const peopleCard = document.getElementById("peopleCard");
  const peopleList = document.getElementById("peopleList");
  const pinCard = document.getElementById("pinCard");
  const selectedInfo = document.getElementById("selectedInfo");
  const search = document.getElementById("search");
  const pin = document.getElementById("pin");
  const confirmBtn = document.getElementById("confirmBtn");
  const msg = document.getElementById("msg");
  const successBox = document.getElementById("successBox");
  const successMeta = document.getElementById("successMeta");
  const dateLabel = document.getElementById("dateLabel");

  let data = null;
  let activeShift = null;
  let selected = null;

  async function load() {
    const res = await window.KSC_API.get().getTomorrowShifts();
    data = res;
    if (!res.ok) {
      shiftPick.innerHTML = `<p class="muted">${window.KSC_Lang.t("noShifts")}</p>`;
      return;
    }
    dateLabel.textContent = `${window.KSC_Lang.t("tomorrowDate")}: ${window.KSC_UI.formatDate(res.date)}`;
    const shifts = Object.keys(res.shifts || {});
    if (!shifts.length) {
      shiftPick.innerHTML = `<p class="muted">${window.KSC_Lang.t("noShifts")}</p>`;
      return;
    }
    shiftPick.innerHTML = shifts
      .map(
        (s) => `<button type="button" class="shift-tile" data-shift="${s}">
          <span><strong>${s}</strong><br><span class="count">${res.shifts[s].length} người</span></span>
          <span>›</span>
        </button>`
      )
      .join("");

    shiftPick.querySelectorAll("[data-shift]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeShift = btn.dataset.shift;
        selected = null;
        pinCard.classList.add("hidden");
        peopleCard.classList.remove("hidden");
        renderPeople();
        shiftPick.querySelectorAll(".shift-tile").forEach((b) => {
          b.style.outline = b === btn ? "2px solid #1d7ef5" : "";
        });
      });
    });
  }

  function renderPeople() {
    if (!data || !activeShift) return;
    const lang = window.KSC_Lang.get();
    const q = (search.value || "").trim().toLowerCase();
    const people = (data.shifts[activeShift] || []).filter((p) => {
      if (!q) return true;
      return (
        p.nameKana.toLowerCase().includes(q) ||
        p.nameLatin.toLowerCase().includes(q) ||
        p.empCode.toLowerCase().includes(q)
      );
    });

    if (!people.length) {
      peopleList.innerHTML = `<p class="muted">${window.KSC_Lang.t("notFound")}</p>`;
      return;
    }

    peopleList.innerHTML = people
      .map((p) => {
        const status = p.confirmed
          ? `<span class="pill ok">✓ ${window.KSC_Lang.t("statusConfirmed")}</span>`
          : `<span class="pill wait">${window.KSC_Lang.t("statusUnconfirmed")}</span>`;
        return `<button type="button" class="emp-item" data-id="${p.id}" style="width:100%;text-align:left;cursor:pointer;font:inherit;color:inherit">
          <div class="row">
            <strong>${p.nameKana}</strong>
            ${status}
          </div>
          <div class="meta">
            <span>${p.empCode} · ${window.KSC_API.labelPlace(p.workplace, lang)}</span>
          </div>
        </button>`;
      })
      .join("");

    peopleList.querySelectorAll("[data-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selected = (data.shifts[activeShift] || []).find((p) => p.id === btn.dataset.id);
        if (!selected) return;
        const lang = window.KSC_Lang.get();
        selectedInfo.innerHTML = `
          <div class="row"><strong>${selected.nameKana}</strong><span class="pill wait">${selected.empCode}</span></div>
          <div class="meta">
            <span>${selected.shift}</span>
            <span>${window.KSC_API.labelPlace(selected.workplace, lang)}</span>
          </div>`;
        pinCard.classList.remove("hidden");
        pin.value = "";
        pin.focus();
        msg.classList.add("hidden");
      });
    });
  }

  search.addEventListener("input", renderPeople);

  confirmBtn.addEventListener("click", async () => {
    msg.classList.add("hidden");
    if (!selected) return;
    const res = await window.KSC_API.get().confirmAttendance({
      scheduleId: selected.id,
      empCode: selected.empCode,
      pin: pin.value.trim(),
    });

    if (!res.ok) {
      window.KSC_UI.toast(msg, "err", window.KSC_Lang.t(res.messageKey || "wrongPin"));
      return;
    }

    successBox.classList.remove("hidden");
    successMeta.textContent = `${window.KSC_Lang.t("confirmedAt")}: ${window.KSC_UI.formatDateTime(res.confirmation.confirmedAt)}`;
    window.KSC_UI.toast(msg, "ok", window.KSC_Lang.t("confirmOk"));
    pinCard.classList.add("hidden");
    await load();
    if (activeShift) {
      peopleCard.classList.remove("hidden");
      renderPeople();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  load();
  document.addEventListener("ksc:lang", () => {
    load().then(() => {
      if (activeShift) {
        peopleCard.classList.remove("hidden");
        renderPeople();
      }
    });
  });
});
