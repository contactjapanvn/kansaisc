/**
 * KSC Work Schedule — Config
 * mode: "demo" | "live"
 * In live mode, set GAS_WEB_APP_URL to your deployed Apps Script URL.
 */
window.KSC_CONFIG = {
  mode: "demo", // change to "live" after Google Sheets is connected
  GAS_WEB_APP_URL: "", // e.g. https://script.google.com/macros/s/XXXX/exec
  company: {
    nameVi: "Công ty KSC",
    nameJa: "株式会社関西SCシステム",
    short: "KSC",
  },
  shifts: [
    "08:00–17:00",
    "09:00–18:00",
    "14:00–22:00",
    "17:00–01:00",
    "18:00–02:00",
    "20:00–05:00",
    "21:00–06:00",
    "23:00–09:00",
  ],
  visaTypes: [
    { vi: "Tokutei Ginou (特定技能)", ja: "特定技能" },
    { vi: "Thực tập sinh (技能実習)", ja: "技能実習" },
    { vi: "Kỹ sư (技術・人文知識・国際業務)", ja: "技術・人文知識・国際業務" },
    { vi: "Du học (留学)", ja: "留学" },
    { vi: "Khác", ja: "その他" },
  ],
  workplaces: [
    { id: "osaka-a", vi: "Nhà máy Osaka A", ja: "大阪工場A" },
    { id: "osaka-b", vi: "Nhà máy Osaka B", ja: "大阪工場B" },
    { id: "kyoto", vi: "Kho Kyoto", ja: "京都倉庫" },
    { id: "kobe", vi: "Công trường Kobe", ja: "神戸現場" },
  ],
  busStops: [
    { id: "namba", vi: "Namba", ja: "なんば" },
    { id: "tennoji", vi: "Tennoji", ja: "天王寺" },
    { id: "umeda", vi: "Umeda", ja: "梅田" },
    { id: "sakai", vi: "Sakai Higashi", ja: "堺東" },
    { id: "hirakata", vi: "Hirakata", ja: "枚方" },
  ],
  demoAdmin: {
    username: "admin",
    password: "ksc-demo",
  },
};
