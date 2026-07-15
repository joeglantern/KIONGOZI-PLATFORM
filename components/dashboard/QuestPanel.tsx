"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Award, BookOpen, Check, Flame, Loader2, MessageCircle, RotateCcw, Sparkles, Target, Users, Vote } from "lucide-react";
import { createClient } from '@/app/utils/supabase/client';
import { useUser } from "@/app/contexts/UserContext";

interface QuestTemplate {
  title: string;
  description: string;
  quest_type: "daily" | "weekly" | "path" | "community";
  target_count: number;
  xp_reward: number;
  estimated_minutes: number;
  icon_name: string;
}

interface QuestRow {
  id: string;
  progress_count: number;
  status: "active" | "completed" | "expired";
  expires_at: string | null;
  quest_templates: QuestTemplate | null;
}

interface DailyActivity {
  minutes_earned: number;
  goal_minutes: number;
  goal_completed_at: string | null;
}

const icons = { "book-open": BookOpen, vote: Vote, users: Users, flame: Flame, sparkles: Sparkles, target: Target, "message-circle": MessageCircle };

function localDateKey(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function QuestPanel() {
  const { user, profile, refreshProfile } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [activity, setActivity] = useState<DailyActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);
  const [error, setError] = useState("");

  const fetchQuests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    await supabase.rpc("ensure_my_quests");
    const today = localDateKey(new Date(), profile?.timezone || "Africa/Nairobi");
    const [questResult, activityResult] = await Promise.all([
      supabase.from("user_quests").select("id, progress_count, status, expires_at, quest_templates(title, description, quest_type, target_count, xp_reward, estimated_minutes, icon_name)").eq("user_id", user.id).in("status", ["active", "completed"]).or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).order("created_at"),
      supabase.from("daily_learning_activity").select("minutes_earned, goal_minutes, goal_completed_at").eq("user_id", user.id).eq("activity_date", today).maybeSingle(),
    ]);
    if (questResult.error) setError("Quests could not be loaded right now.");
    // Normalize joined relation: Supabase types to-one joins as arrays,
    // runtime returns a single object.
    setQuests((questResult.data ?? []).map((q: any) => ({
      ...q,
      quest_templates: Array.isArray(q.quest_templates) ? (q.quest_templates[0] ?? null) : q.quest_templates,
    })) as QuestRow[]);
    setActivity((activityResult.data ?? null) as DailyActivity | null);
    setLoading(false);
  }, [profile?.timezone, supabase, user]);

  useEffect(() => { void fetchQuests(); }, [fetchQuests]);

  const canRecover = useMemo(() => {
    if (!profile?.last_action_date || !profile.streak_freezes) return false;
    const tz = profile.timezone || "Africa/Nairobi";
    const today = new Date(`${localDateKey(new Date(), tz)}T00:00:00Z`);
    const last = new Date(`${localDateKey(new Date(profile.last_action_date), tz)}T00:00:00Z`);
    return Math.round((today.getTime() - last.getTime()) / 86400000) === 2;
  }, [profile]);

  const recover = async () => {
    setRecovering(true); setError("");
    const { error: recoveryError } = await supabase.rpc("recover_my_streak");
    if (recoveryError) setError("Streak recovery is not available for this gap.");
    else await refreshProfile();
    setRecovering(false);
  };

  const goal = activity?.goal_minutes ?? profile?.daily_goal_minutes ?? 10;
  const minutes = activity?.minutes_earned ?? 0;
  const percentage = Math.min(100, Math.round((minutes / goal) * 100));

  return (
    <section className="mb-8 rounded-[1.75rem] border-2 border-brand-primary/10 bg-white p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><span className="text-xs font-black uppercase tracking-[.18em] text-brand-orange">Today&apos;s momentum</span><h2 className="mt-1 text-2xl font-black">Daily goal and quests</h2></div>
        <div className="flex items-center gap-3 rounded-2xl bg-orange-50 px-4 py-3"><Flame className="h-6 w-6 fill-current text-brand-orange" /><div><p className="text-xl font-black">{profile?.current_streak ?? 0} days</p><p className="text-[10px] font-black uppercase text-brand-primary/45">Current streak</p></div></div>
      </div>

      <div className="mt-6 rounded-2xl border-2 border-brand-primary/10 bg-[#f8f4e8] p-4">
        <div className="flex items-center justify-between text-sm font-black"><span>{minutes} of {goal} focused minutes</span><span>{percentage}%</span></div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-brand-primary/10"><motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} className="h-full rounded-full bg-brand-orange" /></div>
        {percentage >= 100 && <p className="mt-3 flex items-center gap-2 text-sm font-black text-emerald-700"><Check className="h-4 w-4" /> Daily goal complete. Momentum secured.</p>}
      </div>

      {canRecover && <div className="mt-4 flex flex-col justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center"><div><p className="font-black text-amber-900">Your streak can still be recovered.</p><p className="text-sm font-semibold text-amber-800/70">Use one earned freeze, then complete an activity today.</p></div><button onClick={recover} disabled={recovering} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 font-black text-white disabled:opacity-50">{recovering ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Recover</button></div>}
      {error && <p role="alert" className="mt-4 text-sm font-bold text-red-600">{error}</p>}

      {loading ? <div className="flex h-40 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-brand-orange" /></div> : <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{quests.map((quest) => { const template=quest.quest_templates; if(!template) return null; const Icon=icons[template.icon_name as keyof typeof icons] ?? Target; const complete=quest.status==="completed"; const progress=Math.min(100,Math.round((quest.progress_count/template.target_count)*100)); return <article key={quest.id} className={`rounded-2xl border-2 p-4 ${complete ? "border-emerald-200 bg-emerald-50" : "border-brand-primary/10 bg-white"}`}><div className="flex items-start justify-between gap-3"><span className={`rounded-xl p-2 ${complete ? "bg-emerald-500 text-white" : "bg-brand-orange/10 text-brand-orange"}`}>{complete ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}</span><span className="rounded-full bg-brand-primary px-2.5 py-1 text-[10px] font-black uppercase text-white">{template.quest_type}</span></div><h3 className="mt-4 font-black">{template.title}</h3><p className="mt-1 text-sm font-semibold leading-relaxed text-brand-primary/50">{template.description}</p><div className="mt-4 flex items-center justify-between text-xs font-black"><span>{quest.progress_count}/{template.target_count}</span><span className="text-brand-orange"><Award className="mr-1 inline h-3 w-3" />{template.xp_reward} XP</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-primary/10"><div className={`h-full ${complete ? "bg-emerald-500" : "bg-brand-orange"}`} style={{ width: `${progress}%` }} /></div></article>; })}</div>}
    </section>
  );
}
