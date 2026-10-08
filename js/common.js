(function () {
  function setupLang() {
    const lang = window.KSC_Lang.get();
    document.querySelectorAll(".lang-switch button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lang === lang);
      btn.addEventListener("click", () => {
        window.KSC_Lang.set(btn.dataset.lang);
        document.querySelectorAll(".lang-switch button").forEach((b) => {
          b.classList.toggle("active", b.dataset.lang === btn.dataset.lang);
        });
        window.KSC_Lang.apply();
        document.dispatchEvent(new CustomEvent("ksc:lang"));
      });
    });
    window.KSC_Lang.apply();
  }

  function setupBadge() {
    const el = document.getElementById("modeBadge");
    if (!el) return;
    const mode = window.KSC_API.connectionBadge();
    el.classList.remove("demo", "live");
    if (mode === "live") {
      el.classList.add("live");
      el.setAttribute("data-i18n", "liveBadge");
    } else {
      el.classList.add("demo");
      el.setAttribute("data-i18n", "demoBadge");
    }
    el.textContent = window.KSC_Lang.t(el.getAttribute("data-i18n"));
  }

  function fillSelect(select, items, langKey) {
    if (!select) return;
    const lang = window.KSC_Lang.get();
    const current = select.value;
    select.innerHTML = items
      .map((it) => {
        const label = typeof it === "string" ? it : lang === "ja" ? it.ja : it.vi;
        const value = typeof it === "string" ? it : it.id || it.vi;
        return `<option value="${value}">${label}</option>`;
      })
      .join("");
    if (current) select.value = current;
  }

  function formatDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return window.KSC_Lang.get() === "ja" ? `${y}年${m}月${d}日` : `${d}/${m}/${y}`;
  }

  function formatDateTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString(window.KSC_Lang.get() === "ja" ? "ja-JP" : "vi-VN");
  }

  window.KSC_UI = {
    setupLang,
    setupBadge,
    fillSelect,
    formatDate,
    formatDateTime,
    toast(el, type, message) {
      if (!el) return;
      el.className = "alert " + type;
      el.textContent = message;
      el.classList.remove("hidden");
    },
  };

  document.addEventListener("DOMContentLoaded", () => {
    if (window.KSC_DemoDB) window.KSC_DemoDB.load();
    setupLang();
    setupBadge();
  });
})();
