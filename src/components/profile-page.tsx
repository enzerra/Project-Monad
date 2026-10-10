"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, Clapperboard, LogOut, Play, TrendingUp, UserRound, X } from "lucide-react";
import { useAccountAuth } from "@/components/auth-provider";
import { AuthControl } from "@/components/auth-control";
import { formatCount } from "@/lib/demo-data";
import type { UploadedContent } from "@/lib/source-calls";
import type { VirtualAccount } from "@/components/virtual-wallet";
import "./profile-page.css";

export function ProfilePage({ account, initialUploads }: { account: VirtualAccount; initialUploads: UploadedContent[] }) {
  const auth = useAccountAuth();
  const reduceMotion = useReducedMotion();
  const mine = initialUploads.filter((item) => item.ownerId === auth.accountId);
  return <main className="vibe-profile">
    <motion.header className="vibe-profile-head" initial={reduceMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .42 }}>
      <div className="vibe-profile-avatar"><UserRound size={34} /></div>
      <div><p className="vibe-profile-kicker">YOUR SPACE</p><h1>{auth.authenticated ? auth.name : "Your profile"}</h1><p>{auth.authenticated ? "Your moments. Your Calls." : "Sign in to make this space yours."}</p></div>
      {auth.authenticated ? <button className="vibe-profile-logout" onClick={() => void auth.logout()}><LogOut size={17} />Sign out</button> : <AuthControl />}
    </motion.header>

    {auth.authenticated && <div className="vibe-profile-stats">
      <div><Image src="/brand/vibe-token.png" alt="" width={30} height={30} /><strong>{account.walletReady ? formatCount(account.balance) : "—"}</strong><span>VIBE</span></div>
      <div><TrendingUp size={22} /><strong>{account.choices.length}</strong><span>Choices</span></div>
      <div><Clapperboard size={22} /><strong>{mine.length}</strong><span>Video</span></div>
    </div>}

    <div className="vibe-profile-grid">
      <section className="vibe-profile-panel"><div className="vibe-profile-section-head"><div><span>ACTIVITY</span><h2>Your Calls</h2></div><TrendingUp size={23} /></div>
        {account.choices.length ? account.choices.slice().reverse().slice(0, 5).map((choice) => { const call = account.calls?.find((item) => item.id === choice.callId) ?? account.footballCalls?.find(item => item.id === choice.callId); return <Link className="vibe-profile-row" key={choice.callId} href={`/calls/${choice.callId}`}><span className="vibe-profile-result">{choice.settlement === "won" ? <Check size={18} /> : choice.settlement === "lost" ? <X size={18} /> : <TrendingUp size={18} />}</span><span><strong>{call?.question ?? "Call VIBE"}</strong><small>{choice.choice === "yes" ? "Yes" : "No"} · {formatCount(choice.amount)} VIBE</small></span><ArrowRight size={17} /></Link>; }) : <div className="vibe-profile-empty"><p>Your next Call is waiting.</p><Link href="/predictions">Explore Calls <ArrowRight size={16} /></Link></div>}
      </section>
    </div>
    {auth.authenticated && <motion.section className="vibe-profile-content" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35, delay: .1 }}><div className="vibe-profile-section-head"><div><span>YOUR VIDEOS</span><h2>Your videos</h2></div><Link className="profile-create-link" href="/upload"><Clapperboard size={16} />Create a video</Link></div>{mine.length ? <div className="vibe-profile-videos">{mine.map((item) => <Link key={item.id} href={`/discover?video=${item.id}`}><span className="vibe-profile-video-icon"><Play size={20} /></span><span><strong>{item.title}</strong><small>{item.category}</small></span><ArrowRight size={18} /></Link>)}</div> : <p>Your first moment starts here.</p>}</motion.section>}
  </main>;
}
