"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { formatCount } from "@/lib/demo-data";
import "./animated-view-count.css";

export function getViewCountChange(previous: number, value: number) {
  const delta = value - previous;
  const text = formatCount(value);
  return {
    delta,
    direction: Math.sign(delta),
    glyphs: Array.from(text, (character, index) => ({
      character,
      // Anchor places from the right so a thousands rollover keeps existing digits.
      key: text.length - index - 1,
      isDigit: /\d/.test(character),
    })),
  };
}

const digitMotion = {
  enter: (direction: number) => ({ y: direction >= 0 ? "100%" : "-100%", opacity: 0 }),
  visible: { y: "0%", opacity: 1 },
  exit: (direction: number) => ({ y: direction >= 0 ? "-100%" : "100%", opacity: 0 }),
};

/** Shows observed counts only; rolling glyphs never generate intermediate view totals. */
export function AnimatedViewCount({ value }: { value: number }) {
  const reducedMotion = useReducedMotion();
  const [change, setChange] = useState({ value, previous: value, revision: 0 });
  // Update this component's state before children render, without an effect-delayed frame.
  if (change.value !== value) {
    setChange({ value, previous: change.value, revision: change.revision + 1 });
  }
  const { delta, direction, glyphs } = getViewCountChange(change.previous, value);

  return <span className="animated-view-count" aria-label={formatCount(value)}>
    <span className="view-count-digits" aria-hidden="true">
      {glyphs.map(({ character, key, isDigit }) => isDigit
        ? <span className="view-count-place" key={key}>
          {reducedMotion ? <span className="view-count-glyph">{character}</span> :
            <AnimatePresence initial={false} custom={direction}>
              <motion.span className="view-count-glyph" key={character} custom={direction}
                variants={digitMotion} initial="enter" animate="visible" exit="exit"
                transition={{ duration: .42, ease: [.22, 1, .36, 1] }}>
                {character}
              </motion.span>
            </AnimatePresence>}
        </span>
        : <span className="view-count-separator" key={key}>{character}</span>)}
    </span>
    {delta !== 0 && <motion.span key={change.revision}
      className={`view-count-delta${direction < 0 ? " is-correction" : ""}`} aria-hidden="true"
      initial={{ opacity: 0, y: reducedMotion ? 0 : 5 }}
      animate={{ opacity: [0, 1, 1, 0], y: reducedMotion ? 0 : [5, 0, 0, -3] }}
      transition={{ duration: 2.6, times: [0, .12, .78, 1], ease: "easeOut" }}>
      {direction > 0 ? "↑ +" : "↓ −"}{formatCount(Math.abs(delta))}
    </motion.span>}
  </span>;
}
