export type CallStatus = "open" | "pending" | "locked" | "closed" | "revealing" | "resolved" | "void";
export type Choice = "yes" | "no";
export type PredictionCategory = "sport" | "gaming" | "crypto";

export type Content = {
  id: string;
  creator: string;
  handle: string;
  title: string;
  description: string;
  hashtags?: string[];
  category: string;
  kind: "insight" | "predictable" | "resolved";
  visual: "purple" | "orange" | "blue" | "green";
  callId?: string;
  minutes: number;
  video?: {
    provider?: "local";
    src: string;
    sourceUrl: string;
    author: string;
    license: string;
    licenseUrl: string;
    cropPosition: string;
    hasAudio: boolean;
  } | {
    provider: "youtube";
    videoId: string;
    sourceUrl: string;
    hasAudio: true;
  } | {
    provider: "upload";
    src: string;
    sourceUrl: string;
    cropPosition: string;
    hasAudio: true;
  };
};

export type Call = {
  id: string;
  contentId: string;
  predictionCategory: PredictionCategory;
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
    creator: "Xbox México",
    handle: "@xboxmexico",
    title: "Aksi Dishonored 2 dalam sepuluh detik",
    description: "Cuplikan gameplay Dishonored 2. Pertanyaan views di samping adalah skenario VIBE, bukan metrik video ini.",
    category: "Action stealth · Demo Call",
    kind: "predictable",
    visual: "purple",
    callId: "rush-views",
    minutes: 38,
    video: {
      src: "/videos/dishonored-2-gameplay.webm",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Dishonored_2_gameplay_clip.webm",
      author: "Xbox México",
      license: "CC BY 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
      cropPosition: "50% 50%",
      hasAudio: false,
    },
  },
  {
    id: "indie-world",
    creator: "Xbox México",
    handle: "@xboxmexico",
    title: "Kembali melihat dunia Minecraft Beta",
    description: "Cuplikan gameplay Minecraft Beta. Konten insight ini tidak memiliki prediksi.",
    category: "Minecraft · Insight",
    kind: "insight",
    visual: "orange",
    minutes: 84,
    video: {
      src: "/videos/minecraft-beta-gameplay.webm",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Minecraft_Beta_Gameplay.webm",
      author: "Xbox México",
      license: "CC BY 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
      cropPosition: "50% 50%",
      hasAudio: false,
    },
  },
  {
    id: "matchday-highlight",
    creator: "VIBE Demo",
    handle: "@vibe-demo",
    title: "Cuplikan laga yang jadi bahan obrolan",
    description: "Contoh konten Sports untuk menguji tampilan katalog. Video dan metrik sumber belum terhubung.",
    category: "Sports · Demo Call",
    kind: "predictable",
    visual: "blue",
    callId: "matchday-views",
    minutes: 28,
  },
  {
    id: "crypto-explainer",
    creator: "VIBE Demo",
    handle: "@vibe-demo",
    title: "Video edukasi Bitcoin di feed",
    description: "Contoh konten Crypto untuk menguji katalog. Video dan metrik sumber Call demo ini belum terhubung.",
    category: "Crypto · Demo Call",
    kind: "predictable",
    visual: "orange",
    callId: "crypto-explainer-views",
    minutes: 41,
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
    predictionCategory: "gaming",
    question: "Tembus 22.000 views dalam 6 jam?",
    baselineViews: 12000,
    targetViews: 22000,
    currentViews: 14380,
    horizonHours: 6,
    scheduledClosesAt: "2026-10-02T15:30:00+07:00",
    evaluationAt: "2026-10-02T20:00:00+07:00",
    status: "open",
  },
  {
    id: "matchday-views",
    contentId: "matchday-highlight",
    predictionCategory: "sport",
    question: "Cuplikan laga ini tembus 20.000 views dalam 6 jam?",
    baselineViews: 9000,
    targetViews: 20000,
    currentViews: 9000,
    horizonHours: 6,
    scheduledClosesAt: "2026-10-03T15:30:00+07:00",
    evaluationAt: "2026-10-03T20:00:00+07:00",
    status: "open",
  },
  {
    id: "crypto-explainer-views",
    contentId: "crypto-explainer",
    predictionCategory: "crypto",
    question: "Video edukasi Bitcoin ini tembus 50.000 views dalam 24 jam?",
    baselineViews: 35000,
    targetViews: 50000,
    currentViews: 35000,
    horizonHours: 24,
    scheduledClosesAt: "2026-10-03T18:00:00+07:00",
    evaluationAt: "2026-10-04T12:00:00+07:00",
    status: "open",
  },
  {
    id: "speedrun-views",
    contentId: "speedrun",
    predictionCategory: "gaming",
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
