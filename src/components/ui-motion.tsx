"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/** One motion policy for every page, including dialogs and the entrance. */
export function UiMotion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user" transition={{ duration: .28, ease: [.22, 1, .36, 1] }}>{children}</MotionConfig>;
}
