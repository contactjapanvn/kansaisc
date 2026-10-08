/**
 * Demo seed data only — fictional employees, no real personal data.
 */
(function () {
  const KEY = "ksc_demo_db_v1";

  function tomorrowISO() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  }

  function weekDates(startOffset = 1, count = 7) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const d = new Date();
      d.setDate(d.getDate() + startOffset + i);
      out.push(d.toISOString().slice(0, 10));
    }
    return out;
  }

  function seed() {
    const tmr = tomorrowISO();
    const days = weekDates(1, 7);

    const employees = [
      {
        id: "e1",
        empCode: "KSC001",
        nameLatin: "Nguyen Van An",
        nameKana: "グエン　バン　アン",
        birthday: "1998-05-12",
        visaType: "Tokutei Ginou (特定技能)",
        visaExpiry: "2027-03-31",
        busStop: "namba",
        workplace: "osaka-a",
        pin: "1234",
      },
      {
        id: "e2",
        empCode: "KSC002",
        nameLatin: "Tran Thi Bich",
        nameKana: "チャン　ティ　ビック",
        birthday: "1999-11-03",
        visaType: "Thực tập sinh (技能実習)",
        visaExpiry: "2026-12-15",
        busStop: "tennoji",
        workplace: "osaka-a",
        pin: "2345",
      },
      {
        id: "e3",
        empCode: "KSC003",
        nameLatin: "Le Minh Duc",
        nameKana: "レ　ミン　ドゥック",
        birthday: "1997-08-21",
        visaType: "Tokutei Ginou (特定技能)",
        visaExpiry: "2027-06-30",
        busStop: "umeda",
        workplace: "osaka-b",
        pin: "3456",
      },
      {
        id: "e4",
        empCode: "KSC004",
        nameLatin: "Pham Hoang Nam",
        nameKana: "ファム　ホアン　ナム",
        birthday: "2000-01-18",
        visaType: "Du học (留学)",
        visaExpiry: "2026-10-31",
        busStop: "sakai",
        workplace: "kyoto",
        pin: "4567",
      },
      {
        id: "e5",
        empCode: "KSC005",
        nameLatin: "Hoang Thi Lan",
        nameKana: "ホアン　ティ　ラン",
        birthday: "1996-04-09",
        visaType: "Tokutei Ginou (特定技能)",
        visaExpiry: "2028-01-20",
        busStop: "hirakata",
        workplace: "kobe",
        pin: "5678",
      },
    ];

    const registrations = [
      {
        id: "r1",
        empCode: "KSC006",
        nameLatin: "Do Quang Huy",
        nameKana: "ドー　クアン　フイ",
        birthday: "1998-09-30",
        visaType: "Tokutei Ginou (特定技能)",
        visaExpiry: "2027-08-01",
        busStop: "namba",
        workplace: "osaka-a",
        pin: "6789",
        days: [
          { date: days[0], shift: "08:00–17:00" },
          { date: days[1], shift: "08:00–17:00" },
          { date: days[2], shift: "09:00–18:00" },
        ],
        status: "pending",
        createdAt: new Date().toISOString(),
      },
    ];

    const approvedSchedules = [
      {
        id: "s1",
        empCode: "KSC001",
        nameLatin: "Nguyen Van An",
        nameKana: "グエン　バン　アン",
        date: tmr,
        shift: "08:00–17:00",
        workplace: "osaka-a",
        busStop: "namba",
      },
      {
        id: "s2",
        empCode: "KSC002",
        nameLatin: "Tran Thi Bich",
        nameKana: "チャン　ティ　ビック",
        date: tmr,
        shift: "08:00–17:00",
        workplace: "osaka-a",
        busStop: "tennoji",
      },
      {
        id: "s3",
        empCode: "KSC003",
        nameLatin: "Le Minh Duc",
        nameKana: "レ　ミン　ドゥック",
        date: tmr,
        shift: "17:00–01:00",
        workplace: "osaka-b",
        busStop: "umeda",
      },
      {
        id: "s4",
        empCode: "KSC004",
        nameLatin: "Pham Hoang Nam",
        nameKana: "ファム　ホアン　ナム",
        date: tmr,
        shift: "17:00–01:00",
        workplace: "kyoto",
        busStop: "sakai",
      },
      {
        id: "s5",
        empCode: "KSC005",
        nameLatin: "Hoang Thi Lan",
        nameKana: "ホアン　ティ　ラン",
        date: tmr,
        shift: "21:00–06:00",
        workplace: "kobe",
        busStop: "hirakata",
      },
      {
        id: "s6",
        empCode: "KSC001",
        nameLatin: "Nguyen Van An",
        nameKana: "グエン　バン　アン",
        date: tmr,
        shift: "21:00–06:00",
        workplace: "kobe",
        busStop: "namba",
      },
    ];

    const confirmations = [
      {
        id: "c1",
        scheduleId: "s1",
        empCode: "KSC001",
        date: tmr,
        shift: "08:00–17:00",
        confirmedAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ];

    return {
      employees,
      registrations,
      approvedSchedules,
      confirmations,
      settings: { adminUser: "admin", adminPass: "ksc-demo" },
      meta: { seededAt: new Date().toISOString(), tomorrow: tmr },
    };
  }

  window.KSC_DemoDB = {
    KEY,
    tomorrowISO,
    weekDates,
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (!raw) {
          const data = seed();
          localStorage.setItem(KEY, JSON.stringify(data));
          return data;
        }
        const data = JSON.parse(raw);
        // Refresh tomorrow schedules if date rolled over
        if (data.meta && data.meta.tomorrow !== tomorrowISO()) {
          const fresh = seed();
          // Keep pending registrations from old data
          fresh.registrations = (data.registrations || []).map((r) => r);
          localStorage.setItem(KEY, JSON.stringify(fresh));
          return fresh;
        }
        return data;
      } catch {
        const data = seed();
        localStorage.setItem(KEY, JSON.stringify(data));
        return data;
      }
    },
    save(data) {
      localStorage.setItem(KEY, JSON.stringify(data));
    },
    reset() {
      localStorage.removeItem(KEY);
      return this.load();
    },
  };
})();
