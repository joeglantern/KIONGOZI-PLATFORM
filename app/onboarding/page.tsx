"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BriefcaseBusiness,
  Building2,
  Check,
  Clock3,
  Compass,
  Flag,
  HeartHandshake,
  Leaf,
  Lightbulb,
  Loader2,
  MapPin,
  Rocket,
  Sparkles,
  Target,
  Vote,
  Zap,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useUser } from "@/app/contexts/UserContext";
import { createClient } from "@/app/utils/supabase/client";
import { Mwanzo } from "@/components/landing/Characters";
import { KENYA_COUNTIES } from "@/lib/kenya-counties";
import { findStartingCourseIdForPath } from "@/lib/learning/starting-course";

type Goal = "career" | "community" | "project" | "credential" | "explore";
type PathSlug = "civic" | "green" | "digital" | "entrepreneurship";

interface LearningPath {
  id: string;
  slug: PathSlug;
  title: string;
  description: string;
  outcome: string;
  icon_name: string;
  accent_color: string;
  sort_order: number;
  category_name: string | null;
}

const goals: Array<{ id: Goal; title: string; description: string; icon: typeof Target; recommendedPath: PathSlug }> = [
  { id: "career", title: "Build career skills", description: "Develop practical skills that strengthen my opportunities.", icon: BriefcaseBusiness, recommendedPath: "digital" },
  { id: "community", title: "Lead community change", description: "Understand public decisions and organize effective action.", icon: HeartHandshake, recommendedPath: "civic" },
  { id: "project", title: "Start a project", description: "Turn an idea into something useful and visible.", icon: Rocket, recommendedPath: "entrepreneurship" },
  { id: "credential", title: "Earn a credential", description: "Complete structured learning and build proof of mastery.", icon: Award, recommendedPath: "green" },
  { id: "explore", title: "Explore my options", description: "Try different missions before choosing a specialization.", icon: Compass, recommendedPath: "civic" },
];

const interests = [
  "County leadership", "Climate action", "Digital tools", "Entrepreneurship",
  "Public speaking", "Community organizing", "Career readiness", "Project building",
];

const counties = KENYA_COUNTIES;

const pathIcons = { civic: Vote, green: Leaf, digital: Zap, entrepreneurship: Lightbulb };

function OnboardingContent() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { user, profile, refreshProfile } = useUser();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [county, setCounty] = useState("");
  const [institution, setInstitution] = useState("");
  const [dailyGoal, setDailyGoal] = useState<5 | 10 | 15>(10);
  const [focusPath, setFocusPath] = useState<PathSlug>("civic");
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loadingPaths, setLoadingPaths] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile) return;
    if (profile.onboarding_completed_at) {
      router.replace("/dashboard");
      return;
    }
    if (profile.onboarding_goal) setGoal(profile.onboarding_goal);
    if (profile.learning_interests?.length) setSelectedInterests(profile.learning_interests);
    if (profile.county) setCounty(profile.county);
    if (profile.institution_name) setInstitution(profile.institution_name);
    if (profile.daily_goal_minutes) setDailyGoal(profile.daily_goal_minutes);
    if (profile.focus_path) setFocusPath(profile.focus_path);
  }, [profile, router]);

  useEffect(() => {
    const fetchPaths = async () => {
      const { data, error: pathError } = await supabase
        .from("learning_paths")
        .select("id, slug, title, description, outcome, icon_name, accent_color, category_name, sort_order")
        .eq("is_published", true)
        .order("sort_order");

      if (pathError) {
        setError("We could not load the learning paths. Please refresh and try again.");
      } else {
        setPaths((data ?? []) as LearningPath[]);
      }
      setLoadingPaths(false);
    };
    void fetchPaths();
  }, [supabase]);

  const chooseGoal = (nextGoal: Goal) => {
    setGoal(nextGoal);
    setFocusPath(goals.find((item) => item.id === nextGoal)?.recommendedPath ?? "civic");
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((current) => current.includes(interest)
      ? current.filter((item) => item !== interest)
      : current.length < 5 ? [...current, interest] : current);
  };

  const canContinue = [Boolean(goal), selectedInterests.length >= 2, Boolean(county), true, Boolean(focusPath)][step];

  const finish = async () => {
    if (!user || !goal || !county || selectedInterests.length < 2) return;
    setSaving(true);
    setError("");
    const { error: updateError } = await supabase.from("profiles").update({
      onboarding_goal: goal,
      learning_interests: selectedInterests,
      county,
      institution_name: institution.trim() || null,
      daily_goal_minutes: dailyGoal,
      focus_path: focusPath,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);

    if (updateError) {
      setError(updateError.message || "We could not save your learning path.");
      setSaving(false);
      return;
    }

    // Keep enrollment aligned with the final path choice. Existing enrollment is preserved.
    const startingCourseId = await findStartingCourseIdForPath(supabase, focusPath);
    if (startingCourseId) {
      const { error: enrollmentError } = await supabase.from("course_enrollments").upsert({
        user_id: user.id,
        course_id: startingCourseId,
        status: "active",
        progress_percentage: 0,
        enrolled_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
      }, { onConflict: "user_id,course_id", ignoreDuplicates: true });
      if (enrollmentError) console.error("Path enrollment failed:", enrollmentError);
    }
    await refreshProfile();
    router.replace("/dashboard?welcome=1");
  };

  const screens = [
    <ChoiceGrid key="goal" title="What do you want Kiongozi to help you achieve?" subtitle="Choose the result that matters most right now.">
      {goals.map((item) => <ChoiceCard key={item.id} active={goal === item.id} onClick={() => chooseGoal(item.id)} icon={item.icon} title={item.title} description={item.description} />)}
    </ChoiceGrid>,
    <ChoiceGrid key="interests" title="What are you curious about?" subtitle="Choose at least two. You can change these later.">
      <div className="flex flex-wrap justify-center gap-3">{interests.map((item) => <button key={item} onClick={() => toggleInterest(item)} className={`rounded-full border-2 px-5 py-3 text-sm font-black transition-all ${selectedInterests.includes(item) ? "border-brand-primary bg-brand-orange text-white shadow-[3px_3px_0_#1b2432]" : "border-brand-primary/15 bg-white hover:border-brand-primary/50"}`}>{selectedInterests.includes(item) && <Check className="mr-2 inline h-4 w-4" />}{item}</button>)}</div>
      <p className="mt-5 text-center text-xs font-bold text-brand-primary/45">{selectedInterests.length}/5 selected</p>
    </ChoiceGrid>,
    <ChoiceGrid key="identity" title="Where will your impact begin?" subtitle="This helps us recommend relevant communities and challenges.">
      <div className="mx-auto grid max-w-2xl gap-5 text-left sm:grid-cols-2">
        <label className="font-black"><span className="mb-2 flex items-center gap-2"><MapPin className="h-4 w-4 text-brand-orange" /> County</span><select value={county} onChange={(event) => setCounty(event.target.value)} className="input-base min-h-12"><option value="">Select your county</option>{counties.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="font-black"><span className="mb-2 flex items-center gap-2"><Building2 className="h-4 w-4 text-brand-orange" /> School or organization <em className="text-xs font-medium text-brand-primary/40">optional</em></span><input value={institution} onChange={(event) => setInstitution(event.target.value)} className="input-base min-h-12" placeholder="e.g. University of Nairobi" maxLength={120} /></label>
      </div>
    </ChoiceGrid>,
    <ChoiceGrid key="commitment" title="Choose a daily rhythm you can keep." subtitle="Consistency beats intensity. You can adjust this any time.">
      <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-3">{([5, 10, 15] as const).map((minutes) => <button key={minutes} onClick={() => setDailyGoal(minutes)} className={`rounded-3xl border-[3px] p-6 text-center transition-all ${dailyGoal === minutes ? "-translate-y-1 border-brand-primary bg-white shadow-[6px_6px_0_#1b2432]" : "border-brand-primary/10 bg-white/50"}`}><Clock3 className="mx-auto h-6 w-6 text-brand-orange" /><p className="mt-4 text-3xl font-black">{minutes}</p><p className="text-sm font-bold text-brand-primary/50">minutes a day</p>{minutes === 10 && <span className="mt-3 inline-block rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase text-emerald-700">Recommended</span>}</button>)}</div>
    </ChoiceGrid>,
    <ChoiceGrid key="path" title="Your recommended starting path" subtitle="Choose the direction that feels most useful. Nothing is permanent.">
      {loadingPaths ? <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-orange" /> : <div className="grid gap-4 md:grid-cols-2">{paths.map((path) => { const Icon = pathIcons[path.slug] ?? Flag; return <button key={path.id} onClick={() => setFocusPath(path.slug)} className={`rounded-3xl border-[3px] p-5 text-left transition-all ${focusPath === path.slug ? "border-brand-primary bg-white shadow-[6px_6px_0_#1b2432]" : "border-brand-primary/10 bg-white/50"}`}><div className="flex items-start gap-4"><span className="rounded-2xl p-3" style={{ backgroundColor: `${path.accent_color}20`, color: path.accent_color }}><Icon className="h-6 w-6" /></span><div><h3 className="text-xl font-black">{path.title}</h3><p className="mt-1 text-sm font-semibold leading-relaxed text-brand-primary/55">{path.outcome}</p></div></div>{focusPath === path.slug && <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-primary px-3 py-1 text-xs font-black text-white"><Check className="h-3 w-3" /> Selected</span>}</button>; })}</div>}
    </ChoiceGrid>,
  ];

  return (
    <div className="paper-grid min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3"><Mwanzo expression={step === 4 ? "excited" : "happy"} className="h-14 w-14" /><div><p className="text-xs font-black uppercase tracking-[0.18em] text-brand-orange">Build your path</p><p className="font-black">Step {step + 1} of 5</p></div></div>
          <div className="flex flex-1 justify-end gap-2">{screens.map((_, index) => <span key={index} className={`h-2 max-w-16 flex-1 rounded-full ${index <= step ? "bg-brand-orange" : "bg-brand-primary/10"}`} />)}</div>
        </div>

        <div className="min-h-[560px] rounded-[2rem] border-[3px] border-brand-primary bg-[#f8f4e8] p-6 shadow-[10px_10px_0_#1b2432] sm:p-10">
          <AnimatePresence mode="wait"><motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>{screens[step]}</motion.div></AnimatePresence>
          {error && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
          <div className="mt-10 flex items-center justify-between gap-4 border-t-2 border-brand-primary/10 pt-6">
            <button onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || saving} className="inline-flex min-h-12 items-center gap-2 rounded-xl px-5 font-black disabled:opacity-30"><ArrowLeft className="h-4 w-4" /> Back</button>
            {step < 4 ? <button onClick={() => setStep((current) => Math.min(4, current + 1))} disabled={!canContinue} className="btn-pill min-h-12 bg-brand-orange px-6 text-white disabled:cursor-not-allowed disabled:opacity-40">Continue <ArrowRight className="h-4 w-4" /></button> : <button onClick={finish} disabled={!canContinue || saving} className="btn-pill min-h-12 bg-brand-orange px-6 text-white disabled:opacity-40">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Start my path</button>}
          </div>
        </div>
        <p className="mt-6 text-center text-xs font-semibold text-brand-primary/45">Your preferences personalize recommendations. They are not used to determine access or eligibility.</p>
      </div>
    </div>
  );
}

function ChoiceGrid({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <div><div className="mx-auto mb-9 max-w-3xl text-center"><h1 className="font-display text-3xl font-black sm:text-4xl">{title}</h1><p className="mt-3 font-semibold text-brand-primary/55">{subtitle}</p></div>{children}</div>;
}

function ChoiceCard({ active, onClick, icon: Icon, title, description }: { active: boolean; onClick: () => void; icon: typeof Target; title: string; description: string }) {
  return <button onClick={onClick} className={`mb-3 flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all ${active ? "border-brand-primary bg-white shadow-[4px_4px_0_#1b2432]" : "border-brand-primary/10 bg-white/45 hover:border-brand-primary/40"}`}><span className={`rounded-xl p-3 ${active ? "bg-brand-orange text-white" : "bg-brand-primary/5 text-brand-primary"}`}><Icon className="h-5 w-5" /></span><span className="flex-1"><strong className="block font-black">{title}</strong><span className="text-sm font-semibold text-brand-primary/50">{description}</span></span>{active && <Check className="h-5 w-5 text-emerald-600" />}</button>;
}

export default function OnboardingPage() {
  return <ProtectedRoute allowedRoles={["user"]}><OnboardingContent /></ProtectedRoute>;
}
