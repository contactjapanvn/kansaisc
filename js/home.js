document.addEventListener("DOMContentLoaded", async () => {
  const panel = document.getElementById("tomorrowPanel");
  const toggle = document.getElementById("tomorrowToggle");
  const preview = document.getElementById("tomorrowPreview");

  async function renderPreview() {
    const res = await window.KSC_API.get().getTomorrowShifts();
    if (!res.ok) {
      preview.innerHTML = `<p class="muted">${window.KSC_Lang.t("noShifts")}</p>`;
      return;
    }
    const shifts = Object.keys(res.shifts || {});
    if (!shifts.length) {
      preview.innerHTML = `<p class="muted">${window.KSC_Lang.t("noShifts")}</p>`;
      return;
    }
    preview.innerHTML =
      `<p class="muted" style="margin-bottom:.65rem">${window.KSC_Lang.t("tomorrowDate")}: <strong>${window.KSC_UI.formatDate(res.date)}</strong></p>` +
      shifts
        .map((shift) => {
          const count = res.shifts[shift].length;
          return `<a class="shift-tile" href="schedule.html?shift=${encodeURIComponent(shift)}">
            <span><strong>${shift}</strong><br><span class="count">${count} người / 名</span></span>
            <span class="chev">›</span>
          </a>`;
        })
        .join("") +
      `<a class="btn btn-ghost btn-sm" href="schedule.html" style="width:100%;margin-top:.35rem">${window.KSC_Lang.t("btnTomorrow")}</a>`;
  }

  toggle.addEventListener("click", async () => {
    panel.classList.toggle("open");
    if (panel.classList.contains("open")) await renderPreview();
  });

  document.addEventListener("ksc:lang", () => {
    if (panel.classList.contains("open")) renderPreview();
  });
});
