export type CallStatus = "open" | "pending" | "locked" | "closed" | "revealing" | "resolved" | "void";
export type Choice = "yes" | "no";

export type Content = {
  id: string;
  creator: string;
  handle: string;
  title: string;
  description: string;
  category: string;
  kind: "insight" | "predictable" | "resolved";
  visual: "purple" | "orange" | "blue" | "green";
  callId?: string;
  minutes: number;
};

export type Call = {
  id: string;
  contentId: string;
  question: string;
  baselineViews: number;
  targetViews: number;
  currentViews: number;
  horizonHours: 6 | 24;
  scheduledClosesAt: string;
  evaluationAt: string;
  status: CallStatus;
  result?: Choice;
  voidReason?: string;
};

export const contents: Content[] = [
  {
    id: "pixel-rush",
    creator: "NARA PLAY",
    handle: "@naraplay",
    title: "Satu detik sebelum clutch paling absurd minggu ini",
    description: "Klip ranked yang mulai ramai dibagikan di komunitas FPS Indonesia. Apakah momentumnya akan terus naik?",
    category: "FPS · Indonesia",
    kind: "predictable",
    visual: "purple",
    callId: "rush-views",
    minutes: 38,
  },
  {
    id: "indie-world",
    creator: "Ruang Indie",
    handle: "@ruangindie",
    title: "Game buatan lokal ini punya dunia yang terasa hidup",
    description: "Insight komunitas: desain dunia dan detail animasinya layak diperhatikan. Konten ini tidak punya Call.",
    category: "Indie · Insight",
    kind: "insight",
    visual: "orange",
    minutes: 84,
  },
  {
    id: "speedrun",
    creator: "Kibo",
    handle: "@kibogames",
    title: "Speedrun yang diprediksi menembus 30 ribu views",
    description: "Pilihan sudah ditutup dan hasilnya tersedia bersama bukti pemeriksaan.",
    category: "Speedrun · Hasil",
    kind: "resolved",
    visual: "blue",
    callId: "speedrun-views",
    minutes: 420,
  },
  {
    id: "cozy-game",
    creator: "Mika Plays",
    handle: "@mikaplays",
    title: "Kenapa cozy games tiba-tiba dibahas lagi?",
    description: "Potongan pendapat kreator tentang game santai, budaya bermain, dan komunitasnya.",
    category: "Culture · Insight",
    kind: "insight",
    visual: "green",
    minutes: 176,
  },
];

export const calls: Call[] = [
  {
    id: "rush-views",
    contentId: "pixel-rush",
    question: "Apakah klip ini mencapai 22.000 views dalam 6 jam?",
    baselineViews: 12000,
    targetViews: 22000,
    currentViews: 14380,
    horizonHours: 6,
    scheduledClosesAt: "2026-10-02T15:30:00+07:00",
    evaluationAt: "2026-10-02T20:00:00+07:00",
    status: "open",
  },
  {
    id: "speedrun-views",
    contentId: "speedrun",
    question: "Apakah speedrun ini mencapai 30.000 views dalam 24 jam?",
    baselineViews: 17400,
    targetViews: 30000,
    currentViews: 32184,
    horizonHours: 24,
    scheduledClosesAt: "2026-10-01T10:00:00+07:00",
    evaluationAt: "2026-10-02T04:00:00+07:00",
    status: "resolved",
    result: "yes",
  },
];

export const formatCount = (value: number) => new Intl.NumberFormat("id-ID").format(value);
export const formatTime = (value: string) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));

export const findContent = (id: string) => contents.find((item) => item.id === id);
export const findCall = (id: string) => calls.find((item) => item.id === id);
