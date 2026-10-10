"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import "./vibe-entry.css";

const introDuration = 4200;
const fragments = [
  { x: -90, y: -65, rotate: -115 },
  { x: 95, y: -15, rotate: 100 },
  { x: -15, y: 95, rotate: -80 },
];
const sparks = Array.from({ length: 12 }, (_, index) => {
  const angle = index * Math.PI / 6;
  return { x: Math.round(Math.cos(angle) * 148), y: Math.round(Math.sin(angle) * 148) };
});

/** Show the entrance on each page load, then mount the feed automatically. */
export function VibeEntry({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const [checked, setChecked] = useState(false);
  const [pulse, setPulse] = useState(0);
  const finished = useRef(false);
  const timer = useRef<number | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 120, damping: 18 });
  const springY = useSpring(y, { stiffness: 120, damping: 18 });
  const tiltX = useTransform(springY, [-24, 24], [12, -12]);
  const tiltY = useTransform(springX, [-24, 24], [-14, 14]);

  const enter = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    if (timer.current) window.clearTimeout(timer.current);
    setVisible(false);
    const params = new URLSearchParams(window.location.search);
    const hasIntroParam = params.has("intro");
    params.delete("intro");
    const query = params.size ? `?${params.toString()}` : "";
    if (window.location.pathname === "/" || hasIntroParam) {
      // Both paths use the same catch-all page. Commit the URL before the feed
      // mounts, so its video-link effect cannot overwrite a pending redirect.
      window.history.replaceState(null, "", `${window.location.pathname === "/" ? "/discover" : window.location.pathname}${query}`);
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    queueMicrotask(() => {
      if (disposed) return;
      setChecked(true);
    });
    timer.current = window.setTimeout(enter, reduced ? 250 : introDuration);
    return () => {
      disposed = true;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [enter, reduced]);

  const burst = () => { if (!finished.current) setPulse(value => value + 1); };

  if (!checked) return <main className="vibe-entry" aria-label="Memuat VIBE"><div className="vibe-entry-stage"><div className="vibe-entry-symbol"><Image src="/brand/vibe-symbol.png" alt="VIBE" width={280} height={280} priority /></div></div></main>;

  return <AnimatePresence mode="wait">
    {visible ? <motion.main key="entry" className="vibe-entry" aria-label="Selamat datang di VIBE"
      initial={false} exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : .5, delay: reduced ? 0 : .16 }}
      onKeyDown={event => { if (event.key === "Escape") enter(); }}
      onPointerMove={event => {
        if (reduced || event.pointerType !== "mouse") return;
        const bounds = event.currentTarget.getBoundingClientRect();
        x.set(((event.clientX - bounds.left) / bounds.width - .5) * 48);
        y.set(((event.clientY - bounds.top) / bounds.height - .5) * 48);
      }} onPointerLeave={() => { x.set(0); y.set(0); }}>
      <motion.div className="vibe-entry-aura" aria-hidden="true"
        initial={reduced ? false : { opacity: 0, scale: .4 }}
        animate={{ opacity: 1, scale: 1 }} exit={reduced ? { opacity: 0 } : { scale: 2.5, opacity: 0, transition: { duration: .55 } }}
        transition={{ duration: reduced ? 0 : 1.8, ease: [.16, 1, .3, 1] }} />
      <motion.div className="vibe-entry-stage" style={reduced ? undefined : { x: springX, y: springY }}
        exit={reduced ? { opacity: 0 } : { scale: 1.32, y: -24, opacity: 0 }}
        transition={{ duration: reduced ? 0 : .45, ease: [.65, 0, .35, 1] }}>
        <div className="vibe-entry-orbits" aria-hidden="true">
          {[0, 1, 2].map(ring => <motion.span key={ring} className={`vibe-entry-orbit orbit-${ring}`}
            initial={reduced ? false : { opacity: 0, scale: .3, rotate: -160 + ring * 55 }}
            animate={{ opacity: [0, .8, .35], scale: 1, rotate: [null, 95 - ring * 60, 155 - ring * 55] }}
            transition={{ duration: reduced ? 0 : 3.2, delay: reduced ? 0 : ring * .14, ease: [.16, 1, .3, 1] }} />)}
        </div>
        <motion.div className="vibe-entry-object" style={reduced ? undefined : { rotateX: tiltX, rotateY: tiltY }}>
          <motion.button type="button" className="vibe-entry-symbol" aria-label="Sentuh atau gerakkan logo VIBE"
            drag={!reduced} dragConstraints={{ left: -44, right: 44, top: -44, bottom: 44 }}
            dragElastic={.25} dragSnapToOrigin onDragEnd={burst}
            whileHover={reduced ? undefined : { scale: 1.08, rotate: 8 }}
            whileTap={reduced ? undefined : { scale: .92, rotate: -5 }}
            transition={{ type: "spring", stiffness: 240, damping: 16 }}
            onPointerDown={burst}
            onClick={event => { if (event.detail === 0) burst(); }}>
            {reduced ? <Image src="/brand/vibe-symbol.png" alt="" width={280} height={280} priority /> :
              fragments.map((fragment, index) => <motion.span className={`vibe-entry-fragment fragment-${index}`} key={index}
                initial={{ ...fragment, opacity: 0, scale: .48 }}
                animate={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 1.35, delay: .12 + index * .1, ease: [.16, 1, .3, 1] }}>
                <Image src="/brand/vibe-symbol.png" alt="" width={280} height={280} priority />
              </motion.span>)}
            {!reduced && <motion.span className="vibe-entry-glint" aria-hidden="true"
              initial={{ opacity: 0, rotate: -50 }} animate={{ opacity: [0, .9, 0], rotate: 170 }}
              transition={{ duration: 1.5, delay: .75 }} />}
          </motion.button>
          <AnimatePresence>{pulse > 0 && <motion.div className="vibe-entry-burst" key={pulse} aria-hidden="true"
            initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 1.4 }}>
            {[0, 1].map(ring => <motion.span className="vibe-entry-ripple" key={ring}
              initial={{ scale: .75, opacity: .8 }} animate={{ scale: reduced ? 1 : 2.4 + ring * .45, opacity: 0 }}
              transition={{ duration: reduced ? 0 : 1.1, delay: ring * .1, ease: [.16, 1, .3, 1] }} />)}
            {!reduced && sparks.map((spark, index) => <motion.i className="vibe-entry-spark" key={index}
              initial={{ x: spark.x * .3, y: spark.y * .3, scale: 0 }}
              animate={{ x: spark.x, y: spark.y, scale: [0, 1, 0] }}
              transition={{ duration: .85, delay: index % 3 * .03, ease: "easeOut" }} />)}
          </motion.div>}</AnimatePresence>
        </motion.div>
        <div className="vibe-entry-word" aria-label="VIBE">
          <span className="vibe-entry-letters" aria-hidden="true">{Array.from("VIBE", (letter, index) =>
            <motion.span key={letter} initial={reduced ? false : { opacity: 0, y: 30, rotateX: -70 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: reduced ? 0 : .8, delay: reduced ? 0 : .65 + index * .09, ease: [.16, 1, .3, 1] }}>{letter}</motion.span>)}</span>
          <motion.span className="vibe-entry-tagline" initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : .6, delay: reduced ? 0 : 1.2 }}>Temukan lebih awal.</motion.span>
        </div>
      </motion.div>
    </motion.main> : <motion.div key="content" className="vibe-entry-content" initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : .4 }}>{children}</motion.div>}
  </AnimatePresence>;
}
