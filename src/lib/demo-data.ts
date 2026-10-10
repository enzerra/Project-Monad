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
    title: "Dishonored 2 in ten seconds",
    description: "Dishonored 2 gameplay. The attached Call is an example, not this video's real metrics.",
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
    title: "A look back at Minecraft Beta",
    description: "Minecraft Beta gameplay. No Call attached.",
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
    title: "The highlight everyone is talking about",
    description: "Example Sports content. Source video and metrics are not connected.",
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
    title: "Bitcoin, explained",
    description: "Example Crypto content. Source video and metrics are not connected.",
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
    title: "The 30,000-view speedrun",
    description: "Entries closed. The example result is available.",
    category: "Speedrun · Result",
    kind: "resolved",
    visual: "blue",
    callId: "speedrun-views",
    minutes: 420,
  },
  {
    id: "cozy-game",
    creator: "Mika Plays",
    handle: "@mikaplays",
    title: "Why are cozy games trending again?",
    description: "A creator's take on cozy games and their communities.",
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
    question: "Will it reach 22,000 views in 6h?",
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
    question: "Will it reach 20,000 views in 6h?",
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
    question: "Will it reach 50,000 views in 24h?",
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
    question: "Will it reach 30,000 views in 24h?",
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

export const formatCount = (value: number) => new Intl.NumberFormat("en-US").format(value);
export const formatTime = (value: string) =>
  `${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value))} GMT+7`;

/** Presentation copy also covers Calls persisted before the English UI release. */
export const callQuestion = (call: Pick<Call, "targetViews" | "horizonHours">) =>
  `Will this Short reach ${formatCount(call.targetViews)} views in ${call.horizonHours}h?`;

export const findContent = (id: string) => contents.find((item) => item.id === id);
export const findCall = (id: string) => calls.find((item) => item.id === id);
