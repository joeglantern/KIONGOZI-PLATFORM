"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Award, Check, Clock3, Lightbulb, Loader2, RotateCcw, ShieldCheck, Sparkles, Target, X } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { createClient } from '@/app/utils/supabase/client';
import { useUser } from "@/app/contexts/UserContext";
import { Mwanzo } from "@/components/landing/Characters";
import { Confetti } from "@/components/landing/Confetti";

interface MissionOption { id: string; order_index: number; label: string }
interface MissionStep { id: string; slug: string; order_index: number; title: string; prompt: string; context: string | null; options: MissionOption[]; selected_option_id: string | null; is_correct: boolean | null }
interface Mission { id: string; slug: string; title: string; description: string; estimated_minutes: number; passing_score: number; attempt_id: string; status: "in_progress" | "completed"; best_score: number; steps: MissionStep[] }
interface Feedback { correct: boolean; feedback: string; learning_point: string; answered: number; total: number; score: number }
interface Result { mastered: boolean; score: number; passing_score: number; xp_awarded?: number }

function MissionPlayer() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { refreshProfile } = useUser();
  const [mission, setMission] = useState<Mission | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    void supabase.rpc("get_learning_mission", { p_slug: slug }).then(({ data, error: loadError }) => {
      if (loadError || !data) setError(loadError?.message || "Mission not found.");
      else {
        const loaded = data as Mission;
        setMission(loaded);
        if (loaded.status === "completed") setResult({ mastered: true, score: loaded.best_score, passing_score: loaded.passing_score, xp_awarded: 0 });
        else {
          const firstOpen = loaded.steps.findIndex((step) => step.is_correct !== true);
          setIndex(firstOpen >= 0 ? firstOpen : loaded.steps.length - 1);
        }
      }
      setLoading(false);
    });
  }, [slug, supabase]);

  const step = mission?.steps[index];
  const answered = mission?.steps.filter((item) => item.selected_option_id).length ?? 0;

  const answer = async (optionId: string) => {
    if (!step || submitting || feedback) return;
    setSelected(optionId); setSubmitting(true); setError("");
    const { data, error: answerError } = await supabase.rpc("submit_mission_answer", { p_step: step.id, p_option: optionId });
    if (answerError) setError(answerError.message);
    else {
      const nextFeedback = data as Feedback;
      setFeedback(nextFeedback);
      setMission((current) => current ? { ...current, steps: current.steps.map((item) => item.id === step.id ? { ...item, selected_option_id: optionId, is_correct: nextFeedback.correct } : item) } : current);
    }
    setSubmitting(false);
  };

  const continueMission = async () => {
    if (!mission || !feedback) return;
    const allAnswered = mission.steps.every((item) => item.selected_option_id);
    if (!allAnswered) {
      const nextOpen = mission.steps.findIndex((item, itemIndex) => itemIndex > index && !item.selected_option_id);
      setIndex(nextOpen >= 0 ? nextOpen : Math.min(index + 1, mission.steps.length - 1)); setSelected(null); setFeedback(null); return;
    }
    setSubmitting(true);
    const { data, error: completeError } = await supabase.rpc("complete_learning_mission", { p_attempt: mission.attempt_id });
    if (completeError) setError(completeError.message);
    else {
      const completion = data as Result; setResult(completion);
      if (completion.mastered) await refreshProfile();
    }
    setSubmitting(false);
  };

  const retryIncorrect = () => {
    if (!mission) return;
    const firstIncorrect = mission.steps.findIndex((item) => item.is_correct !== true);
    setIndex(Math.max(0, firstIncorrect)); setSelected(null); setFeedback(null); setResult(null);
  };

  if (loading) return <div className="flex min-h-[70vh] items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-brand-orange" /></div>;
  if (error && !mission) return <div className="mx-auto max-w-lg px-5 py-24 text-center"><X className="mx-auto h-10 w-10 text-red-500" /><h1 className="mt-4 text-2xl font-black">Mission unavailable</h1><p className="mt-2 text-brand-primary/60">{error}</p><Link href="/dashboard" className="btn-pill mt-6 bg-brand-primary px-6 py-3 text-white">Back to dashboard</Link></div>;
  if (!mission || !step) return null;

  if (result) return <MissionSummary mission={mission} result={result} onRetry={retryIncorrect} />;

  const progress = Math.round(((index + 1) / mission.steps.length) * 100);
  return (
    <div className="min-h-screen bg-[#f8f4e8]">
      <header className="sticky top-16 z-20 border-b-2 border-brand-primary/10 bg-[#f8f4e8]/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-4"><button onClick={() => router.push("/dashboard")} aria-label="Exit mission" className="rounded-full p-2 hover:bg-brand-primary/5"><X className="h-5 w-5" /></button><div className="h-3 flex-1 overflow-hidden rounded-full bg-brand-primary/10"><motion.div animate={{ width: `${progress}%` }} className="h-full rounded-full bg-brand-orange" /></div><span className="text-sm font-black">{index + 1}/{mission.steps.length}</span></div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <div className="mb-6 flex items-center justify-between"><div><span className="text-[10px] font-black uppercase tracking-[.2em] text-brand-orange">{mission.title}</span><h1 className="mt-1 font-display text-3xl font-black">{step.title}</h1></div><Mwanzo expression={feedback?.correct ? "excited" : feedback ? "thinking" : "happy"} className="h-16 w-16" /></div>
        <AnimatePresence mode="wait"><motion.section key={step.id} initial={{ opacity: 0, x: 25 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -25 }} className="rounded-[2rem] border-[3px] border-brand-primary bg-white p-5 shadow-[8px_8px_0_#1b2432] sm:p-8">
          {step.context && <div className="rounded-2xl border border-brand-blue/40 bg-brand-blue/15 p-4 text-sm font-semibold leading-relaxed text-brand-primary/70"><ShieldCheck className="mr-2 inline h-4 w-4" />{step.context}</div>}
          <h2 className="mt-6 text-xl font-black leading-snug sm:text-2xl">{step.prompt}</h2>
          <div className="mt-6 space-y-3">{step.options.map((option, optionIndex) => { const chosen=selected===option.id; return <button key={option.id} onClick={() => answer(option.id)} disabled={Boolean(feedback)||submitting} className={`flex min-h-16 w-full items-center gap-4 rounded-2xl border-2 p-4 text-left font-bold transition-all ${chosen && feedback ? feedback.correct ? "border-emerald-500 bg-emerald-50" : "border-red-400 bg-red-50" : "border-brand-primary/10 hover:-translate-y-0.5 hover:border-brand-orange"}`}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-current text-sm font-black">{String.fromCharCode(65+optionIndex)}</span><span>{option.label}</span>{submitting&&chosen&&<Loader2 className="ml-auto h-4 w-4 animate-spin" />}</button>})}</div>
          {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
        </motion.section></AnimatePresence>
        <AnimatePresence>{feedback && <motion.div role="status" aria-live="polite" initial={{ opacity:0,y:20 }} animate={{opacity:1,y:0}} className={`mt-6 rounded-[1.5rem] border-2 p-5 ${feedback.correct?"border-emerald-300 bg-emerald-50":"border-amber-300 bg-amber-50"}`}><div className="flex gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${feedback.correct?"bg-emerald-500":"bg-amber-500"}`}>{feedback.correct?<Check className="h-5 w-5"/>:<Lightbulb className="h-5 w-5"/>}</span><div><h3 className="font-black">{feedback.correct?"Strong reasoning":"Not quite. Build the stronger habit."}</h3><p className="mt-1 text-sm font-semibold leading-relaxed text-brand-primary/65">{feedback.feedback}</p><div className="mt-3 rounded-xl bg-white/70 p-3 text-sm font-bold"><Sparkles className="mr-2 inline h-4 w-4 text-brand-orange" />{feedback.learning_point}</div></div></div><button onClick={continueMission} disabled={submitting} className="btn-pill mt-5 min-h-12 w-full bg-brand-orange px-6 text-white">{submitting?<Loader2 className="h-4 w-4 animate-spin"/>:<>Continue <ArrowRight className="h-4 w-4"/></>}</button></motion.div>}</AnimatePresence>
        <p className="mt-6 text-center text-xs font-bold text-brand-primary/40"><Clock3 className="mr-1 inline h-3 w-3" />{answered} answered · progress saves automatically</p>
      </main>
    </div>
  );
}

function MissionSummary({ mission, result, onRetry }: { mission: Mission; result: Result; onRetry: () => void }) {
  return <div className="paper-grid min-h-screen px-5 py-16"><Confetti active={result.mastered} /><div className="mx-auto max-w-2xl rounded-[2rem] border-[3px] border-brand-primary bg-white p-7 text-center shadow-[10px_10px_0_#1b2432] sm:p-10"><div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-brand-primary ${result.mastered?"bg-emerald-500 text-white":"bg-amber-400"}`}>{result.mastered?<Award className="h-10 w-10"/>:<Target className="h-10 w-10"/>}</div><span className="mt-6 inline-block text-xs font-black uppercase tracking-[.2em] text-brand-orange">Mission summary</span><h1 className="mt-3 font-display text-4xl font-black">{result.mastered?"Skill mastered":"Almost there"}</h1><p className="mt-3 font-semibold text-brand-primary/60">{result.mastered?"You used evidence, budget reasoning, verification, and proportionate action.":`You scored ${result.score}%. Reach ${result.passing_score}% to master this skill.`}</p><div className="mx-auto mt-7 grid max-w-md grid-cols-2 gap-4"><div className="rounded-2xl bg-brand-primary p-5 text-white"><p className="text-3xl font-black">{result.score}%</p><p className="text-xs font-bold uppercase opacity-60">Mastery</p></div><div className="rounded-2xl bg-orange-50 p-5"><p className="text-3xl font-black text-brand-orange">+{result.xp_awarded??0}</p><p className="text-xs font-bold uppercase text-brand-primary/45">XP earned</p></div></div><div className="mt-8 flex flex-col gap-3 sm:flex-row">{!result.mastered&&<button onClick={onRetry} className="btn-pill min-h-12 flex-1 bg-amber-400 px-5"><RotateCcw className="h-4 w-4"/>Retry missed steps</button>}<Link href="/dashboard" className="btn-pill min-h-12 flex-1 bg-brand-primary px-5 text-white">Continue path <ArrowRight className="h-4 w-4"/></Link></div></div></div>;
}

export default function MissionPage(){return <ProtectedRoute><MissionPlayer/></ProtectedRoute>}

