"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

type Player = {
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  destroy: () => void;
};
type YoutubeApi = {
  Player: new (element: HTMLElement, options: {
    videoId: string;
    playerVars: Record<string, string | number>;
    events: { onReady: () => void; onStateChange: (event: { data: number }) => void; onAutoplayBlocked: () => void; onError: () => void };
  }) => Player;
};
declare global {
  interface Window { YT?: YoutubeApi; onYouTubeIframeAPIReady?: () => void }
}

let apiPromise: Promise<YoutubeApi> | undefined;
function loadApi(): Promise<YoutubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise<YoutubeApi>((resolve, reject) => {
      const prior = window.onYouTubeIframeAPIReady;
      const timeout = window.setTimeout(() => reject(new Error("YouTube Player timed out")), 15000);
      window.onYouTubeIframeAPIReady = () => { prior?.(); window.clearTimeout(timeout); if (window.YT?.Player) resolve(window.YT); else reject(new Error("YouTube Player unavailable")); };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.onerror = () => { window.clearTimeout(timeout); reject(new Error("YouTube Player failed to load")); };
      document.head.appendChild(script);
    }).catch((error) => { apiPromise = undefined; throw error; });
  }
  return apiPromise;
}

export type YoutubePlayerHandle = { playWithSound: () => void; pause: () => void };

export const YoutubePlayer = forwardRef<YoutubePlayerHandle, {
  videoId: string;
  title: string;
  onReady: () => void;
  onPlayingChange: (playing: boolean) => void;
  onMutedChange: (muted: boolean) => void;
  onError: () => void;
}>(function YoutubePlayer({ videoId, title, onReady, onPlayingChange, onMutedChange, onError }, ref) {
  const mount = useRef<HTMLDivElement>(null);
  const player = useRef<Player | null>(null);
  const usedMutedFallback = useRef(false);
  const ready = useRef(false);

  useImperativeHandle(ref, () => ({
    playWithSound: () => { if (!ready.current) return; player.current?.unMute?.(); onMutedChange(false); player.current?.playVideo?.(); },
    pause: () => { if (ready.current) player.current?.pauseVideo?.(); },
  }), [onMutedChange]);

  useEffect(() => {
    let disposed = false;
    ready.current = false;
    usedMutedFallback.current = false;
    const target = mount.current;
    if (!target) return;
    loadApi().then((YT) => {
      if (disposed) return;
      const frame = document.createElement("div");
      target.appendChild(frame);
      player.current = new YT.Player(frame, {
        videoId,
        playerVars: { autoplay: 1, mute: 0, playsinline: 1, controls: 1, loop: 1, playlist: videoId, rel: 0, origin: window.location.origin },
        events: {
          onReady: () => { if (disposed) return; ready.current = true; player.current?.unMute?.(); onReady(); if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) player.current?.playVideo?.(); },
          onStateChange: (event) => { if (!disposed) onPlayingChange(event.data === 1); },
          onAutoplayBlocked: () => {
            if (disposed) return;
            if (usedMutedFallback.current) { onPlayingChange(false); return; }
            usedMutedFallback.current = true;
            player.current?.mute();
            onMutedChange(true);
            player.current?.playVideo();
          },
          onError: () => { if (!disposed) onError(); },
        },
      });
    }).catch(() => { if (!disposed) onError(); });
    return () => { disposed = true; ready.current = false; player.current?.destroy?.(); player.current = null; target.replaceChildren(); };
  }, [videoId, onReady, onPlayingChange, onMutedChange, onError]);

  return <div ref={mount} className="discover-youtube-player" aria-label={title} />;
});
