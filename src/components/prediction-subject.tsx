import Image from "next/image";
import { Coins, Gamepad2, Trophy } from "lucide-react";
import type { Call, Content } from "@/lib/demo-data";

export const predictionCategoryLabels = { gaming: "Gaming", sport: "Sports", crypto: "Crypto" } as const;

export function PredictionSubject({ contentId, category, className = "" }: { contentId: string; category?: Call["predictionCategory"]; className?: string }) {
  return <span className={`prediction-subject-art ${className}`} aria-hidden="true">
    {contentId === "pixel-rush" ? <Image src="/prediction-brands/dishonored-2.png" alt="" width={625} height={89} />
      : contentId === "crypto-explainer" ? <Image src="/prediction-brands/bitcoin.svg" alt="" width={64} height={64} />
      : contentId === "matchday-highlight" || category === "sport" ? <Trophy size={25} strokeWidth={1.7} />
      : category === "crypto" ? <Coins size={25} strokeWidth={1.7} />
      : <Gamepad2 size={25} strokeWidth={1.7} />}
  </span>;
}

export function PredictionIdentity({ call, content }: { call: Call; content: Content }) {
  return <div className="prediction-identity"><PredictionSubject contentId={content.id} category={call.predictionCategory} /><div><strong>{content.title}</strong><span>{predictionCategoryLabels[call.predictionCategory]} · {content.creator}</span></div></div>;
}
