"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, CloudUpload, Film, Hash, LoaderCircle, Play, Sparkles, X } from "lucide-react";
import { useAccountAuth } from "@/components/auth-provider";
import type { UploadedContent } from "@/lib/source-calls";
import "./upload-page.css";

const limit = 40 * 1024 * 1024;
const tagsOf = (value: string) => value.split(/[\s,]+/).filter(Boolean).map((tag) => tag.replace(/^#+/, "").toLocaleLowerCase("en-US"));

export function UploadPage() {
  const auth = useAccountAuth();
  const reduceMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [duration, setDuration] = useState(0);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [category, setCategory] = useState("Gaming");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [posted, setPosted] = useState<UploadedContent | null>(null);
  const tags = tagsOf(hashtags);
  const invalidTags = tags.length > 5 || tags.some((tag) => !/^[\p{L}\p{N}_]{2,24}$/u.test(tag)) || new Set(tags).size !== tags.length;
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const chooseFile = (next: File | null) => {
    setError(""); setPosted(null); setDuration(0);
    if (!next) { setFile(null); setPreview(""); return; }
    if (!["video/mp4", "video/webm"].includes(next.type)) { setFile(null); setPreview(""); setError("Choose an MP4 or WebM video."); return; }
    if (next.size > limit) { setFile(null); setPreview(""); setError("Keep your video under 40 MB."); return; }
    setFile(next); setPreview(URL.createObjectURL(next));
    if (!title.trim()) setTitle(next.name.replace(/\.[^.]+$/, "").slice(0, 100));
  };

  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || busy || posted) return;
    if (invalidTags) { setError("Use up to 5 unique hashtags, 2–24 characters each."); return; }
    if (!auth.authenticated) { if (auth.ready) auth.login(); return; }
    setBusy(true); setError("");
    try {
      const data = new FormData();
      data.append("video", file); data.append("title", title.trim()); data.append("caption", caption.trim());
      data.append("hashtags", tags.join(" ")); data.append("category", category); data.append("creator", auth.name);
      const response = await fetch("/api/uploads", { method: "POST", headers: await auth.requestHeaders(), body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not publish your video. Try again.");
      setPosted(result.upload);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Upload failed. Try again."); }
    finally { setBusy(false); }
  };

  return <main className="upload-studio">
    <motion.header className="upload-studio-head" initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4 }}>
      <div><span className="upload-kicker"><Sparkles size={15} /> VIBE STUDIO</span><h1>Create a moment.</h1><p>Preview. Add your story. Publish.</p></div>
      <span className="upload-studio-stage">{file ? "READY TO PUBLISH" : "CHOOSE A VIDEO"}</span>
    </motion.header>

    <form className="upload-studio-grid" onSubmit={(event) => void publish(event)}>
      <motion.section className={`upload-preview-panel ${dragging ? "is-dragging" : ""}`} initial={reduceMotion ? false : { opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .46 }} aria-label="Video preview" onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0] ?? null); }}>
        <div className="upload-panel-title"><span>PREVIEW</span><span>{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB${duration ? ` · ${Math.round(duration)} sec` : ""}` : "9:16 IDEAL"}</span></div>
        <div className="upload-phone"><AnimatePresence mode="wait" initial={false}>{preview ? <motion.div key={preview} className="upload-phone-video" initial={reduceMotion ? false : { opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} exit={reduceMotion ? undefined : { opacity: 0 }} transition={{ duration: .28 }}><video src={preview} controls playsInline preload="metadata" onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} aria-label="Video preview before publishing" /><div className="upload-phone-copy"><strong>{auth.name}</strong><span>{caption || title || "Your caption appears here."}</span>{tags.length > 0 && <small>{tags.slice(0, 5).map((tag) => `#${tag}`).join(" ")}</small>}</div></motion.div> : <motion.div key="empty" className="upload-phone-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><span className="upload-orbit"><Film size={34} /></span><strong>Your next moment</strong><p>Choose a video to preview it.</p></motion.div>}</AnimatePresence></div>
        <input ref={inputRef} className="upload-file-input" type="file" accept="video/mp4,video/webm" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} aria-label="Choose an MP4 or WebM video" />
        <button type="button" className="upload-file-button" onClick={() => inputRef.current?.click()}><CloudUpload size={18} />{file ? "Replace video" : "Choose video"}</button>
        <p className="upload-file-hint">Drop a video here · MP4/WebM · up to 40 MB</p>
      </motion.section>

      <motion.section className="upload-compose-panel" initial={reduceMotion ? false : { opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .46, delay: reduceMotion ? 0 : .08 }} aria-label="Content details">
        <div className="upload-panel-title"><span>THE DETAILS</span><span>{file ? <Check size={17} /> : <span className="upload-step-dot" />}</span></div>
        <label className="upload-field"><span>Title <small>{title.length}/100</small></span><input value={title} onChange={(event) => setTitle(event.target.value)} minLength={3} maxLength={100} placeholder="Give it a short, clear title" required /></label>
        <label className="upload-field"><span>Caption <small>{caption.length}/500</small></span><textarea value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={500} rows={4} placeholder="What is the story behind your video?" /></label>
        <fieldset className="upload-category"><legend>Category</legend><div>{["Gaming", "Sports", "Crypto"].map((item) => <button type="button" key={item} className={category === item ? "is-selected" : ""} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div></fieldset>
        <label className="upload-field"><span>Hashtags <small>{tags.length}/5</small></span><span className="upload-tag-input"><Hash size={17} /><input value={hashtags} onChange={(event) => setHashtags(event.target.value)} placeholder="gaming highlights creator" aria-invalid={invalidTags} /></span><small>Separate with spaces. The # is optional.</small></label>
        {tags.length > 0 && <div className="upload-tag-preview" aria-label="Video hashtags">{tags.slice(0, 5).map((tag, index) => <span key={`${tag}-${index}`}>#{tag}</span>)}</div>}
        {invalidTags && <p className="upload-inline-error">Up to 5 unique hashtags, 2–24 characters each.</p>}
        <div className="upload-publish-area"><div><strong>Ready for Discover</strong><small>Your video goes live when you publish.</small></div>
          {posted ? <Link className="upload-publish-button is-done" href={`/discover?video=${posted.id}`}><Play size={18} />Watch video<ArrowRight size={17} /></Link> : <button type="submit" className="upload-publish-button" disabled={!file || busy || !auth.ready || title.trim().length < 3 || invalidTags}>{busy ? <LoaderCircle className="upload-spin" size={19} /> : <CloudUpload size={19} />}{busy ? "Publishing…" : auth.authenticated ? "Publish" : "Sign in to publish"}<ArrowRight size={17} /></button>}
        </div>
        {error && <p className="upload-feedback is-error" role="alert"><X size={17} />{error}</p>}
        {posted && <p className="upload-feedback is-success" role="status"><Check size={17} />Your video is live.</p>}
      </motion.section>
    </form>
  </main>;
}
