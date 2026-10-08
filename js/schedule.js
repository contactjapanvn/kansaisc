document.addEventListener("DOMContentLoaded", () => {
  const list = document.getElementById("shiftList");
  const dateLabel = document.getElementById("dateLabel");
  const params = new URLSearchParams(location.search);
  const focusShift = params.get("shift");

  async function render() {
    const lang = window.KSC_Lang.get();
    const res = await window.KSC_API.get().getTomorrowShifts();
    if (!res.ok) {
      list.innerHTML = `<div class="card muted">${window.KSC_Lang.t("noShifts")}</div>`;
      return;
    }
    dateLabel.textContent = `${window.KSC_Lang.t("tomorrowDate")}: ${window.KSC_UI.formatDate(res.date)}`;
    const shifts = Object.keys(res.shifts || {});
    if (!shifts.length) {
      list.innerHTML = `<div class="card muted">${window.KSC_Lang.t("noShifts")}</div>`;
      return;
    }

    list.innerHTML = shifts
      .map((shift) => {
        const people = res.shifts[shift];
        const open = focusShift === shift ? " open" : "";
        const rows = people
          .map((p) => {
            const status = p.confirmed
              ? `<span class="pill ok">✓ ${window.KSC_Lang.t("statusConfirmed")}</span>`
              : `<span class="pill wait">${window.KSC_Lang.t("statusUnconfirmed")}</span>`;
            return `<div class="emp-item">
              <div class="row">
                <strong>${p.nameKana}</strong>
                ${status}
              </div>
              <div class="meta">
                <span>${window.KSC_Lang.t("empCode")}: ${p.empCode}</span>
                <span>${window.KSC_Lang.t("shift")}: ${p.shift}</span>
                <span>${window.KSC_Lang.t("workplace")}: ${window.KSC_API.labelPlace(p.workplace, lang)}</span>
                <span>${window.KSC_Lang.t("busStop")}: ${window.KSC_API.labelBus(p.busStop, lang)}</span>
              </div>
            </div>`;
          })
          .join("");

        return `<div class="collapse-panel${open}" data-shift="${shift}">
          <button type="button" class="collapse-head">
            <span>
              <strong>${shift}</strong><br>
              <small class="muted">${people.length} — ${window.KSC_Lang.t("employeesInShift")}</small>
            </span>
            <span class="chev">▼</span>
          </button>
          <div class="collapse-body">
            <div class="emp-list">${rows}</div>
          </div>
        </div>`;
      })
      .join("");

    list.querySelectorAll(".collapse-head").forEach((btn) => {
      btn.addEventListener("click", () => {
        btn.parentElement.classList.toggle("open");
      });
    });
  }

  render();
  document.addEventListener("ksc:lang", render);
});
