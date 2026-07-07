"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useSpring, type MotionStyle } from "framer-motion";
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock3,
  Flame,
  Leaf,
  Lightbulb,
  Map,
  PlayCircle,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  Users,
  Vote,
  X,
  Zap,
} from "lucide-react";
import { useUser } from "@/app/contexts/UserContext";
import { createClient } from "@/app/utils/supabase/client";
import { Mwanzo, Zola, Ken, Tumi } from "@/components/landing/Characters";
import { PENDING_MISSION_KEY } from "@/components/landing/PendingMissionClaim";
import AnimatedIcon from "@/components/landing/AnimatedIcon";
import activity from "react-useanimations/lib/activity";
import LottieScene from "@/components/landing/LottieScene";
import HeroPhoneMockup from "@/components/landing/HeroPhoneMockup";

const MISSION_KEY = "county-youth-centre";

/* ═══════════════════════════════════════════════════════════════════
   Decorative SVG Components
   ═══════════════════════════════════════════════════════════════════ */

function SparkleIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={`fill-current ${className}`}>
      <path d="M12 0c.28 5.67 4.33 9.72 10 10-.28-5.67-4.33-9.72-10-10zm0 24c-.28-5.67-4.33-9.72-10-10 .28 5.67 4.33 9.72 10 10z" />
    </svg>
  );
}

function StarIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`stroke-current ${className}`}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function WavyDivider({ topColor = "#f8f4e8", bottomColor = "#ffffff", variant = 1 }: { topColor?: string; bottomColor?: string; variant?: 1 | 2 | 3 }) {
  const paths: Record<number, string> = {
    1: "M0,40 C320,80 640,0 960,50 C1280,100 1440,30 1440,30 L1440,120 L0,120 Z",
    2: "M0,50 C180,90 360,10 720,50 C1080,90 1260,10 1440,40 L1440,120 L0,120 Z",
    3: "M0,30 C240,90 480,10 720,60 C960,10 1200,90 1440,50 L1440,120 L0,120 Z",
  };
  return (
    <div className="relative w-full overflow-hidden leading-[0]" style={{ backgroundColor: topColor }} aria-hidden="true">
      <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="w-full h-[40px] sm:h-[60px] lg:h-[80px] block">
        <path d={paths[variant]} fill={bottomColor} />
      </svg>
    </div>
  );
}

function HandDrawnUnderline({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 280 14" preserveAspectRatio="none" className={`block ${className}`}>
      <path d="M2,9 Q35,3 70,9 T140,8 T210,9 T280,7" stroke="#FF6633" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M8,12 Q45,6 90,11 T180,10 T270,11" stroke="#FF6633" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}

function LoopDoodle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 60" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.12">
      <path d="M10,30 C10,10 30,10 30,30 C30,50 50,50 50,30 C50,10 70,10 70,30 C70,50 90,50 90,30 C90,10 110,10 110,30" />
    </svg>
  );
}

function CrossDoodle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.08">
      <path d="M12 2v20M2 12h20" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Data
   ═══════════════════════════════════════════════════════════════════ */

const answers = [
  {
    id: "check-budget-records",
    label: "Check the approved budget, procurement records, and project timeline.",
    feedback: "Strong move. Evidence gives you the clearest path to ask precise questions and demand accountable action.",
    correct: true,
  },
  {
    id: "post-accusation",
    label: "Post an accusation immediately so the story spreads quickly.",
    feedback: "Attention can help, but an unsupported accusation is easy to dismiss. Gather verifiable evidence first.",
    correct: false,
  },
  {
    id: "wait-for-update",
    label: "Wait for the next official update before doing anything.",
    feedback: "Waiting protects your time, but it gives away your agency. Public records let you investigate now.",
    correct: false,
  },
] as const;

const learningPaths = [
  {
    key: "civic",
    title: "Civic Leadership",
    outcome: "Spot corruption. Track public budgets. Audit CDF projects.",
    icon: Vote,
    bgColor: "bg-[#fff0e6]",
    accentColor: "#FF6633",
    guide: <Tumi action="cheer" className="h-20 w-20" />,
  },
  {
    key: "green",
    title: "Green Economy",
    outcome: "Track climate action. Earn green XP. Start local eco missions.",
    icon: Leaf,
    bgColor: "bg-[#e8f8ef]",
    accentColor: "#10b981",
    guide: <Zola action="excited" className="h-20 w-20" />,
  },
  {
    key: "digital",
    title: "Digital Skills",
    outcome: "Build civic tech. Map local problems. Code for your community.",
    icon: Zap,
    bgColor: "bg-[#e6f3fa]",
    accentColor: "#0ea5e9",
    guide: <Ken action="adjust" className="h-20 w-20" />,
  },
  {
    key: "entrepreneurship",
    title: "Entrepreneurship",
    outcome: "Pitch community ventures. Fund local ideas. Win county support.",
    icon: Lightbulb,
    bgColor: "bg-[#fef9e7]",
    accentColor: "#f59e0b",
    guide: <Mwanzo expression="excited" className="h-20 w-20" />,
  },
];

const testimonials = [
  {
    persona: "Civic Leadership",
    name: "The Budget Auditor",
    role: "What you'll be able to do",
    quote: "Audit a real county budget, spot where the money stopped, and ask your leaders precise, evidence-backed questions.",
    avatar: <Mwanzo expression="happy" className="h-full w-full" />,
    tilt: "-rotate-[1.5deg]",
  },
  {
    persona: "Green Economy",
    name: "The Eco Champion",
    role: "What you'll be able to do",
    quote: "Run local eco missions, track climate action in your ward, and earn green XP for real environmental work.",
    avatar: <Zola action="cheer" className="h-full w-full" />,
    tilt: "rotate-[1deg]",
  },
  {
    persona: "Digital Skills",
    name: "The Civic Tech Builder",
    role: "What you'll be able to do",
    quote: "Map a local problem, build civic tech for your community, and turn working code into real accountability.",
    avatar: <Ken action="excited" className="h-full w-full" />,
    tilt: "-rotate-[0.5deg]",
  },
];

const faqItems = [
  {
    question: "Is Kiongozi really free?",
    answer: "Yes! Kiongozi is completely free for all Kenyan youth. We're funded by partners who believe in youth civic empowerment across all 47 counties.",
  },
  {
    question: "How long are the missions?",
    answer: "Most missions take 3–5 minutes. They're designed for mobile-first, short-burst learning you can do between classes, on a matatu, or during breaks.",
  },
  {
    question: "Do I earn real credentials?",
    answer: "Absolutely. As you complete learning paths, you earn verified digital credentials you can share on LinkedIn, CVs, and with employers or universities.",
  },
  {
    question: "What counties are active?",
    answer: "All 47 counties are live! County leagues let you compete and collaborate with youth across Kenya. Join your county's team and start climbing the leaderboard.",
  },
  {
    question: "Can I use Kiongozi on my phone?",
    answer: "Yes — Kiongozi is built mobile-first. Every mission, quiz, and leaderboard works perfectly on your phone's browser. No app download needed.",
  },
];

/* ── Motion system · Playful personality (spring overshoot, ease-out-back) ── */
const springPop = { type: "spring", stiffness: 320, damping: 17, mass: 0.7 } as const;
const springSoft = { type: "spring", stiffness: 240, damping: 22, mass: 0.85 } as const;

const fadeUp = {
  hidden: { opacity: 0, y: 26, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: springSoft },
};

const staggerChildren = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.04,
    },
  },
};

const faqAnswerOverrides: Record<string, string> = {
  "How long are the missions?": "Most missions take 3-5 minutes. They're designed for mobile-first, short-burst learning you can do between classes, on a matatu, or during breaks.",
  "Can I use Kiongozi on my phone?": "Yes. Kiongozi is built mobile-first. Every mission, quiz, and leaderboard works perfectly on your phone's browser. No app download needed.",
};

const cleanFeatureTitle = (title: string) => title.replace(/^[^A-Za-z0-9]+/, "");

/* ═══════════════════════════════════════════════════════════════════
   Motion Components (FlowFest-style)
   ═══════════════════════════════════════════════════════════════════ */

/* Infinite scrolling banner band — duplicated content loops seamlessly
   via the existing `marquee` keyframe (0 → -50%). Reduced-motion safe. */
function MarqueeStrip({
  items,
  bg = "bg-brand-primary",
  text = "text-[#f8f4e8]",
  accent = "text-brand-orange",
  rotate = "-rotate-[1.2deg]",
}: {
  items: string[];
  bg?: string;
  text?: string;
  accent?: string;
  rotate?: string;
}) {
  return (
    <div
      className={`relative z-10 -mx-[3%] w-[106%] overflow-hidden border-y-[3px] border-brand-primary py-3.5 shadow-[0_4px_0_#1b2432] sm:py-4 ${bg} ${rotate}`}
      aria-hidden="true"
    >
      <div className="flex w-max animate-marquee whitespace-nowrap will-change-transform">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex items-center">
            {items.map((item, i) => (
              <span key={`${dup}-${i}`} className="flex items-center">
                <span className={`font-syne text-lg font-extrabold uppercase tracking-tight sm:text-2xl ${text}`}>
                  {item}
                </span>
                <StarIcon className={`mx-5 h-4 w-4 shrink-0 sm:mx-8 sm:h-5 sm:w-5 ${accent}`} />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* Magnetic CTA — content springs toward the cursor, settles back on leave. */
function MagneticButton({
  children,
  className = "",
  onClick,
  strength = 0.3,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  strength?: number;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useSpring(0, { stiffness: 300, damping: 18, mass: 0.6 });
  const y = useSpring(0, { stiffness: 300, damping: 18, mass: 0.6 });

  const handleMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    x.set((e.clientX - (rect.left + rect.width / 2)) * strength);
    y.set((e.clientY - (rect.top + rect.height / 2)) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      whileTap={{ scale: 0.96 }}
      style={{ x, y } as MotionStyle}
      className={className}
    >
      {children}
    </motion.button>
  );
}

/* Spinning circular sticker badge — disc + curved text rotate, center icon static.
   The spin uses Tailwind `animate-spin`, which the global reduced-motion rule halts. */
function SpinningSticker({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none select-none ${className}`} aria-hidden="true">
      <div className="relative h-full w-full">
        <svg viewBox="0 0 120 120" className="h-full w-full animate-spin" style={{ animationDuration: "16s" }}>
          <circle cx="60" cy="60" r="58" fill="#fffdf7" stroke="#1b2432" strokeWidth="2.5" />
          <defs>
            <path id="sticker-curve" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
          </defs>
          <text className="fill-brand-primary font-syne" style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "2.5px" }}>
            <textPath href="#sticker-curve" startOffset="0">
              FREE FOREVER · BY YOUTH FOR YOUTH ·
            </textPath>
          </text>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full border-2 border-brand-primary bg-brand-orange p-2 shadow-[2px_2px_0_#1b2432]">
            <Zap className="h-5 w-5 fill-current text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* Static tilted sticker pills — FlowFest "slapped-on sticker" energy, no motion loop. */
function StickerRow({ items }: { items: { label: string; bg: string; text?: string; tilt: string }[] }) {
  return (
    <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 px-5 py-10 sm:gap-4 sm:py-12">
      {items.map((s) => (
        <motion.span
          key={s.label}
          whileHover={{ y: -4, rotate: 0, scale: 1.04 }}
          transition={springPop}
          className={`inline-flex items-center gap-1.5 rounded-full border-[3px] border-brand-primary px-4 py-2 font-syne text-sm font-extrabold uppercase tracking-tight shadow-[3px_3px_0_#1b2432] sm:text-base ${s.bg} ${s.text ?? "text-brand-primary"} ${s.tilt}`}
        >
          <StarIcon className="h-3.5 w-3.5" /> {s.label}
        </motion.span>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const { user, refreshProfile } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [reward, setReward] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [selectedPath, setSelectedPath] = useState("civic");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const answer = answers.find((item) => item.id === selectedAnswer);
  const signupHref = `/signup?path=${selectedPath}${selectedAnswer ? `&mission=${MISSION_KEY}&answer=${selectedAnswer}` : ""}`;

  const completeMission = async (answerId: string) => {
    if (selectedAnswer || claiming) return;
    setSelectedAnswer(answerId);
    const chosen = answers.find((item) => item.id === answerId);
    setReward(chosen?.correct ? 25 : 10);

    if (!user) {
      window.localStorage.setItem(PENDING_MISSION_KEY, JSON.stringify({
        mission: MISSION_KEY,
        answer: answerId,
      }));
      return;
    }
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_intro_mission", {
      p_mission_key: MISSION_KEY,
      p_answer: answerId,
    });
    if (!error) {
      setReward(data?.xp_awarded ?? 0);
      await refreshProfile();
    }
    setClaiming(false);
  };

  return (
    <div className="overflow-hidden bg-[#f8f4e8] text-brand-primary">

      {/* ══════════════════════════════════════════════════════════════
          SECTION 1 · HERO
          ══════════════════════════════════════════════════════════════ */}
      <section className="relative isolate overflow-hidden bg-[#fff8ef] px-4 pb-6 pt-6 sm:px-6 lg:px-8">
        <Image
          src="/hero/kenya-map-bg.png"
          alt=""
          width={1122}
          height={1402}
          aria-hidden="true"
          className="pointer-events-none absolute right-[-18%] top-0 hidden h-full w-[68%] object-cover opacity-85 lg:block"
        />

        <div className="relative mx-auto max-w-[1520px]">
          <div className="grid items-center gap-6 lg:min-h-[650px] lg:grid-cols-[0.94fr_1.06fr]">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerChildren}
              className="relative z-20 max-w-[690px] py-6 lg:py-8"
            >
              <motion.h1
                variants={fadeUp}
                className="max-w-3xl font-display text-5xl font-black leading-[0.94] text-brand-primary sm:text-6xl lg:text-6xl xl:text-7xl"
              >
                Learn skills.
                <br />
                Lead change.
                <br />
                <span className="relative inline-block pt-2 font-display italic text-brand-orange">
                  Put your county on the map.
                  <HandDrawnUnderline className="absolute -bottom-2 left-0 h-3 w-full" />
                </span>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="mt-6 max-w-xl text-base font-semibold leading-relaxed text-brand-primary/68 sm:text-lg"
              >
                Master civic, green, digital, and entrepreneurship skills through short missions that build confidence and create real impact.
              </motion.p>

              <motion.div variants={fadeUp} className="mt-7 flex flex-col gap-4 sm:flex-row">
                <Link
                  href={user ? "/dashboard" : signupHref}
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-brand-orange px-7 py-4 text-base font-black text-white shadow-[0_18px_35px_rgba(255,102,51,0.28)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Zap className="h-5 w-5 fill-current" />
                  {user ? "Continue Learning" : "Start Your First Mission"}
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <button
                  onClick={() => document.getElementById("first-mission")?.scrollIntoView({ behavior: "smooth" })}
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-brand-primary/10 bg-white px-7 py-4 text-base font-black text-brand-primary shadow-[0_15px_35px_rgba(27,36,50,0.08)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  See How It Works
                  <PlayCircle className="h-5 w-5" />
                </button>
              </motion.div>

              <motion.div
                variants={fadeUp}
                className="mt-6 hidden flex-wrap items-center gap-x-6 gap-y-4 text-sm font-bold text-brand-primary/70 sm:flex"
              >
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {["N", "K", "A", "M"].map((initial, index) => (
                      <span
                        key={initial}
                        className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-xs font-black text-white shadow-sm ${
                          ["bg-brand-orange", "bg-emerald-600", "bg-brand-primary", "bg-[#b45cff]"][index]
                        }`}
                      >
                        {initial}
                      </span>
                    ))}
                  </div>
                  <span>Loved by young change makers</span>
                </div>
                <span className="flex items-center gap-1.5"><Award className="h-4 w-4 text-emerald-600" /> 47 County Leagues</span>
                <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 fill-current text-brand-orange" /> 500K+ Missions Completed</span>
                <span className="flex items-center gap-1.5"><Flame className="h-4 w-4 fill-current text-brand-orange" /> 7-Day Streaks</span>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 min-h-[510px] w-full overflow-visible sm:min-h-[590px] lg:min-h-[650px]"
            >
              <Image
                src="/hero/kenya-map-bg.png"
                alt=""
                fill
                aria-hidden="true"
                sizes="(min-width: 1024px) 60vw, 100vw"
                className="pointer-events-none object-cover object-right opacity-70 lg:hidden"
              />

              <Image
                src="/hero/mission-cards.png"
                alt=""
                width={769}
                height={1202}
                priority
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-8 z-20 h-[240px] w-auto rotate-[-4deg] object-contain drop-shadow-[0_22px_30px_rgba(27,36,50,0.14)] sm:left-[4%] sm:top-10 sm:h-[320px] lg:left-[4%] lg:top-[8%] lg:h-[340px]"
              />

              <HeroPhoneMockup className="absolute left-[42%] top-4 z-30 w-[245px] -translate-x-1/2 rotate-[3deg] sm:w-[300px] lg:left-[48%] lg:top-[1%] lg:w-[338px]" />

              <div className="absolute right-0 top-[2%] z-50 hidden w-[238px] rounded-3xl border border-white/70 bg-white p-5 shadow-[0_24px_60px_rgba(27,36,50,0.14)] md:block lg:right-[3%]">
                <p className="mb-4 text-sm font-black text-brand-primary">Achievements</p>
                <div className="flex items-center gap-3">
                  {[
                    { Icon: Leaf, bg: "bg-lime-100", text: "text-emerald-700" },
                    { Icon: Users, bg: "bg-orange-100", text: "text-brand-orange" },
                    { Icon: Lightbulb, bg: "bg-slate-900", text: "text-brand-blue" },
                  ].map(({ Icon, bg, text }, index) => (
                    <span key={index} className={`flex h-14 w-14 items-center justify-center rounded-2xl ${bg} ${text} shadow-sm`}>
                      <Icon className="h-7 w-7" />
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-center text-xs font-bold text-brand-primary/60">+12 more</p>
              </div>

              <Image
                src="/hero/youth-cutout.png"
                alt=""
                width={751}
                height={1359}
                priority
                aria-hidden="true"
                className="pointer-events-none absolute bottom-[-10px] right-[-22%] z-40 h-[310px] w-auto object-contain drop-shadow-[0_24px_30px_rgba(27,36,50,0.15)] sm:right-[-7%] sm:h-[380px] lg:bottom-[-22px] lg:right-[-6%] lg:h-[380px] xl:right-[-1%]"
              />
            </motion.div>
          </div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerChildren}
            className="relative z-20 grid gap-3 pb-3 sm:grid-cols-2 lg:grid-cols-5"
          >
            {[
              { Icon: Target, title: "Short Missions.", copy: "Real Impact.", detail: "Make change in your community, one step at a time.", tint: "bg-emerald-50 text-emerald-700" },
              { Icon: Award, title: "Compete.", copy: "Climb. Lead.", detail: "Climb county leagues and showcase your impact.", tint: "bg-orange-50 text-brand-orange" },
              { Icon: Zap, title: "Earn XP.", copy: "Unlock More.", detail: "Complete missions, build skills, and level up.", tint: "bg-indigo-50 text-indigo-600" },
              { Icon: Smartphone, title: "Built for Youth.", copy: "Mobile First.", detail: "Designed for youth, anywhere.", tint: "bg-emerald-50 text-emerald-700" },
              { Icon: Users, title: "Youth Built.", copy: "Youth Driven.", detail: "A platform shaped by young leaders.", tint: "bg-violet-50 text-violet-700" },
            ].map(({ Icon, title, copy, detail, tint }) => (
              <motion.div
                key={title}
                variants={fadeUp}
                className="flex min-h-[106px] items-center gap-4 rounded-2xl border border-brand-primary/10 bg-white/82 p-4 shadow-[0_16px_45px_rgba(27,36,50,0.08)] backdrop-blur"
              >
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${tint}`}>
                  <Icon className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-base font-black leading-tight text-brand-primary">
                    {title}
                    <br />
                    <span className="text-emerald-700">{copy}</span>
                  </h2>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-brand-primary/60">{detail}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <MarqueeStrip
        items={["Learn skills", "Lead change", "Put your county on the map", "47 counties live", "By youth, for youth"]}
      />

      {/* ══════════════════════════════════════════════════════════════
          SECTION 2 · FIRST MISSION (Interactive Cloud Container)
          ══════════════════════════════════════════════════════════════ */}
      <section id="first-mission" className="bg-[#fcfbf7] px-5 py-20 sm:px-8 lg:py-24 relative">
        <CrossDoodle className="absolute top-16 right-20 w-10 h-10 text-brand-primary hidden lg:block" />
        <SparkleIcon className="absolute bottom-20 left-16 w-6 h-6 text-brand-orange/20 animate-pulse hidden md:block" />

        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-brand-orange">
              <LottieScene src="/lottie/bullseye.json" className="h-5 w-5" ariaLabel="Target" /> Mission 01
            </span>
            <h2 className="mt-4 font-display text-4xl font-black sm:text-5xl text-brand-primary">Don&apos;t take our word for it. Try Kiongozi.</h2>
            <p className="mt-4 text-lg font-semibold text-brand-primary/60">Make one real decision. We&apos;ll show you the skill behind it.</p>
          </div>

          {/* Cloud-shaped mission container */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="grid overflow-hidden rounded-[2.5rem] border-[3px] border-brand-primary bg-white shadow-[10px_10px_0_#1b2432] lg:grid-cols-[.85fr_1.15fr] relative landing-card-shine"
          >
            {/* Decorative corner sparkle */}
            <SparkleIcon className="absolute -top-3 -right-3 w-8 h-8 text-brand-orange/50 z-20 hidden sm:block" />
            <StarIcon className="absolute -bottom-3 -left-3 w-7 h-7 text-brand-blue/40 z-20 hidden sm:block" />

            <div className="relative border-b-[3px] border-brand-primary bg-orange-50/30 p-8 lg:border-b-0 lg:border-r-[3px] lg:p-12 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2"><Map className="h-5 w-5 text-brand-orange" /><span className="text-xs font-black uppercase tracking-[0.18em] text-brand-primary/70">County accountability</span></div>
                <h3 className="mt-6 font-display text-3xl font-black leading-tight text-brand-primary">A youth centre received KSh 10 million, but construction has stopped.</h3>
                <p className="mt-5 font-medium leading-relaxed text-brand-primary/70">Community leaders give conflicting explanations. What should you do first?</p>
              </div>
              <div className="mt-8 inline-flex items-center gap-2 rounded-2xl border-2 border-brand-primary bg-white px-4 py-2 text-xs font-black text-brand-primary/75 max-w-max shadow-[2px_2px_0_#1b2432]">
                <Clock3 className="h-4 w-4 text-brand-blue" /> About 3 minutes · Evidence literacy
              </div>
            </div>

            <div className="p-8 sm:p-10 lg:p-12 bg-white">
              <p className="mb-5 text-xs font-black uppercase tracking-wider text-brand-blue">Choose your first move</p>
              <div className="space-y-4">
                {answers.map((item, index) => {
                  const chosen = selectedAnswer === item.id;
                  const dimmed = selectedAnswer && !chosen;
                  return (
                    <motion.button
                      key={item.id}
                      onClick={() => completeMission(item.id)}
                      disabled={Boolean(selectedAnswer)}
                      whileHover={!selectedAnswer ? { x: 4, y: -2 } : undefined}
                      whileTap={!selectedAnswer ? { scale: 0.99 } : undefined}
                      className={`flex w-full items-start gap-4 rounded-2xl border-2 p-4 text-left transition-colors sm:p-5 ${chosen ? item.correct ? "border-emerald-500 bg-emerald-500/10 text-emerald-800 shadow-[3px_3px_0_#1b2432]" : "border-amber-500 bg-amber-50/20 text-amber-800 shadow-[3px_3px_0_#1b2432]" : dimmed ? "border-brand-primary/5 bg-[#fbfaf6] opacity-35" : "border-brand-primary bg-white hover:bg-slate-50 shadow-[3px_3px_0_#1b2432]"}`}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black ${chosen ? "bg-brand-primary text-white animate-pulse" : "border-brand-primary text-brand-primary"}`}>{String.fromCharCode(65 + index)}</span>
                      <span className="pt-0.5 font-bold leading-snug text-brand-primary">{item.label}</span>
                    </motion.button>
                  );
                })}
              </div>

              <AnimatePresence>
                {answer && (
                  <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className={`mt-6 rounded-2xl border-2 p-5 ${answer.correct ? "border-emerald-500 bg-emerald-500/5 text-emerald-900" : "border-amber-500 bg-amber-50/10 text-amber-900"}`}>
                    <div className="flex items-center justify-between gap-4 border-b border-brand-primary/10 pb-3">
                      <div className="flex items-center gap-2">
                        {answer.correct ? (
                          <LottieScene src="/lottie/success.json" className="h-10 w-10 shrink-0" loop={true} ariaLabel="Success" />
                        ) : (
                          <Lightbulb className="h-6 w-6 shrink-0 text-amber-500" />
                        )}
                        <p className="font-black text-base">{answer.correct ? "Evidence first. Excellent call." : "Useful instinct. Let's strengthen it."}</p>
                      </div>
                      <span className="shrink-0 rounded-full border-2 border-brand-primary bg-brand-orange px-3.5 py-1 text-xs font-black text-white shadow-[2px_2px_0_#1b2432]">+{reward} XP</span>
                    </div>
                    <p className="mt-3 text-sm font-medium leading-relaxed text-brand-primary/75">{answer.feedback}</p>
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <Link href={user ? "/dashboard" : signupHref} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-brand-primary bg-brand-orange px-5 py-3 font-black text-white transition-transform hover:-translate-y-0.5 active:translate-y-0 shadow-[3px_3px_0_#1b2432]">
                        {user ? "Continue your path" : "Keep this progress"} <ArrowRight className="h-4 w-4" />
                      </Link>
                      <button onClick={() => { setSelectedAnswer(null); setReward(0); }} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-brand-primary bg-white px-5 py-3 font-black text-brand-primary hover:bg-slate-50 shadow-[3px_3px_0_#1b2432]"><X className="h-4 w-4" /> Try again</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </section>

      <WavyDivider topColor="#fcfbf7" bottomColor="#f8f4e8" variant={2} />

      {/* ══════════════════════════════════════════════════════════════
          SECTION 3 · LEARNING PATHS ("Flavor Explosion" Style)
          ══════════════════════════════════════════════════════════════ */}
      <section className="px-5 py-20 sm:px-8 lg:py-24 bg-[#f8f4e8] relative overflow-hidden">
        <StarIcon className="absolute top-10 right-20 w-16 h-16 text-brand-primary opacity-[0.03] hidden md:block" />
        <LoopDoodle className="absolute bottom-14 left-[5%] w-20 h-10 text-brand-primary hidden lg:block" />

        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center max-w-3xl mx-auto">
            <span className="text-xs font-black uppercase tracking-[0.25em] text-brand-orange">Choose your direction</span>
            <h2 className="mt-4 font-display text-4xl font-black sm:text-5xl text-brand-primary">One platform. Four ways to lead change.</h2>
            <p className="mt-4 text-lg font-semibold text-brand-primary/60">Pick the learning path that fits your goals today. You can always explore other paths later.</p>
          </div>

          <motion.div
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
            variants={staggerChildren}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            {learningPaths.map((path) => {
              const Icon = path.icon;
              const active = selectedPath === path.key;

              return (
                <motion.button
                  key={path.key}
                  onClick={() => setSelectedPath(path.key)}
                  variants={fadeUp}
                  whileHover={{ y: -7, rotate: active ? -0.4 : -0.8 }}
                  whileTap={{ y: -1, scale: 0.985 }}
                  transition={springPop}
                  className={`group relative overflow-visible rounded-[2.5rem] border-[3px] border-brand-primary p-6 text-left transition-colors duration-200 flex flex-col justify-between min-h-[360px] landing-card-shine ${active ? path.bgColor : "bg-white hover:bg-slate-50"}`}
                  style={{ boxShadow: active ? `7px 7px 0 ${path.accentColor}` : "4px 4px 0 #1b2432" }}
                >
                  {/* Character peeking from top */}
                  <div className={`absolute -top-8 right-4 h-16 w-16 transition-all duration-300 ${active ? "scale-110 -top-10" : "scale-90 opacity-70 group-hover:scale-100 group-hover:opacity-100 group-hover:-top-9"}`}>
                    {path.guide}
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <div className="rounded-xl border-2 border-brand-primary p-2.5 bg-white shadow-[2px_2px_0_#1b2432]">
                        <Icon className="h-6 w-6 text-brand-primary" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full border-2 border-brand-primary bg-white shadow-[1.5px_1.5px_0_#1b2432]">
                        {path.title.split(" ")[0]}
                      </span>
                    </div>

                    <h3 className="mt-5 text-xl font-black text-brand-primary leading-tight">{path.title}</h3>
                    <p className="mt-3 text-xs font-semibold leading-relaxed text-brand-primary/70">{path.outcome}</p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t-2 border-brand-primary/5 pt-4">
                    <div className="text-xs font-black flex items-center gap-1 text-brand-primary">
                      <span>{active ? "Selected" : "Choose"}</span>
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <div className="text-xs font-black text-brand-primary/70 uppercase tracking-wider">
                      {path.key === "civic" ? "12 missions" : path.key === "green" ? "10 missions" : path.key === "digital" ? "14 missions" : "8 missions"}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      </section>

      <WavyDivider topColor="#f8f4e8" bottomColor="#ffffff" variant={3} />

      {/* ══════════════════════════════════════════════════════════════
          SECTION 4 · FEATURES BENTO
          ══════════════════════════════════════════════════════════════ */}
      <section className="bg-white px-5 py-24 sm:px-8 lg:py-28 relative">

        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14 max-w-3xl mx-auto">
            <span className="text-xs font-black uppercase tracking-[0.25em] text-brand-orange">A system, not decoration</span>
            <h2 className="mt-4 font-display text-4xl font-black sm:text-5xl text-brand-primary">Progress you can see. Skills you can use.</h2>
            <p className="mt-4 text-lg font-semibold text-brand-primary/60">Every mission, badge, and credential reflects something you actually did.</p>
          </div>

          <motion.div
            className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4"
            variants={staggerChildren}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            {[
              { icon: BookOpen, title: "Spot corruption.", copy: "Audit public budgets and track CDF funds in under 5 minutes.", stat: "5-min", statLabel: "Budget audits" },
              { icon: BarChart3, title: "Climb leaderboards.", copy: "Earn XP, grow streaks, and climb your county's weekly ranks.", stat: "47", statLabel: "County leagues" },
              { icon: Users, title: "Team up.", copy: "Form ward challenge teams and solve local issues together.", stat: "Ward", statLabel: "Challenge teams" },
              { icon: Award, title: "Win credentials.", copy: "Earn verified digital credentials for real community action.", stat: "Verified", statLabel: "Digital credentials" },
            ].map((feature, idx) => {
              const FeatureIcon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  variants={fadeUp}
                  whileHover={{ y: -5, rotate: idx % 2 === 0 ? -0.35 : 0.35 }}
                  transition={springPop}
                  className="rounded-[2.2rem] border-[3px] border-brand-primary bg-white p-7 shadow-[6px_6px_0_#1b2432] flex flex-col justify-between group landing-card-shine"
                >
                  <div>
                    <div className="inline-flex rounded-2xl border-2 border-brand-primary bg-orange-100 p-2.5 shrink-0 mb-5 shadow-[2px_2px_0_#1b2432]">
                      <FeatureIcon className="h-6 w-6 text-brand-primary" />
                    </div>
                    <h3 className="text-xl font-black text-brand-primary">{cleanFeatureTitle(feature.title)}</h3>
                    <p className="mt-3 text-xs font-semibold leading-relaxed text-brand-primary/70">{feature.copy}</p>
                  </div>
                  <div className="mt-6 flex items-end justify-between border-t-2 border-brand-primary/5 pt-4">
                    <div>
                      <p className="text-2xl font-black text-brand-orange leading-none">{feature.stat}</p>
                      <p className="text-xs font-bold text-brand-primary/70 uppercase tracking-wider mt-1">{feature.statLabel}</p>
                    </div>
                    <span className="text-[10px] font-black text-brand-primary/30 uppercase tracking-wider">0{idx + 1}</span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      <WavyDivider topColor="#ffffff" bottomColor="#fef9f0" variant={1} />

      {/* ══════════════════════════════════════════════════════════════
          SECTION 5 · TESTIMONIALS ("What Youth Are Saying")
          ══════════════════════════════════════════════════════════════ */}
      <section className="bg-[#fef9f0] px-5 py-20 sm:px-8 lg:py-24 relative overflow-hidden">
        <SparkleIcon className="absolute top-10 left-12 w-10 h-10 text-brand-orange/15 animate-pulse hidden md:block" />
        <StarIcon className="absolute bottom-12 right-16 w-12 h-12 text-brand-blue/15 hidden md:block" />
        <LoopDoodle className="absolute top-20 right-[10%] w-24 h-12 text-brand-primary hidden lg:block" />

        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-brand-orange">
              <LottieScene src="/lottie/heart.json" className="h-5 w-5" ariaLabel="Learning paths" /> What you&apos;ll be able to do
            </span>
            <h2 className="mt-4 font-display text-4xl font-black sm:text-5xl text-brand-primary">Four paths. One you.</h2>
            <p className="mt-4 text-lg font-semibold text-brand-primary/70">Here&apos;s the kind of change you&apos;ll be able to lead in your community — pick the path that fits.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((t, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ y: -6, rotate: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ ...springPop, delay: idx * 0.1 }}
                className={`relative rounded-[2.2rem] border-[3px] border-brand-primary bg-white p-7 shadow-[6px_6px_0_#1b2432] flex flex-col justify-between ${t.tilt} landing-card-shine`}
              >
                {/* Quote mark decoration */}
                <div className="absolute -top-3 -left-2 text-4xl font-black text-brand-orange/20 select-none leading-none">&ldquo;</div>

                <div>
                  <div className="mb-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-brand-primary bg-orange-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-brand-primary shadow-[2px_2px_0_#1b2432]">
                      <Sparkles className="h-3 w-3 text-brand-orange" /> {t.persona}
                    </span>
                  </div>
                  <p className="text-sm font-semibold leading-relaxed text-brand-primary/80">{t.quote}</p>
                </div>

                <div className="mt-6 flex items-center gap-3 border-t-2 border-brand-primary/5 pt-4">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border-2 border-brand-primary bg-orange-100 p-0.5 shadow-[2px_2px_0_#1b2432]">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-black text-brand-primary">{t.name}</p>
                    <p className="text-xs font-bold text-brand-primary/70">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <WavyDivider topColor="#fef9f0" bottomColor="#fcfbf7" variant={2} />

      {/* ══════════════════════════════════════════════════════════════
          SECTION 6 · COUNTY LEAGUES & LIVE ACTION (Bento Layout)
          ══════════════════════════════════════════════════════════════ */}
      <section className="bg-[#fcfbf7] px-5 py-20 sm:px-8 lg:py-24 relative">
        <SparkleIcon className="absolute top-12 left-12 w-12 h-12 opacity-5 pointer-events-none text-brand-primary" />
        <CrossDoodle className="absolute bottom-16 right-20 w-8 h-8 text-brand-primary hidden lg:block" />

        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-brand-orange">
              <AnimatedIcon animation={activity} size={18} strokeColor="#FF6633" /> County Leagues
            </span>
            <h2 className="mt-4 font-display text-4xl font-black sm:text-5xl">County Leagues &amp; Live Action</h2>
            <p className="mt-4 text-lg font-semibold text-brand-primary/70">A preview of how weekly county leagues and live activity will look once your county goes live.</p>
            <span className="mt-5 inline-flex items-center gap-1.5 rounded-full border-2 border-brand-primary bg-white px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-brand-primary/70 shadow-[2px_2px_0_#1b2432]">
              <Sparkles className="h-3 w-3 text-brand-orange" /> Sample preview
            </span>
          </div>

          <motion.div
            className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]"
            variants={staggerChildren}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            {/* Left Bento: Weekly County League */}
            <motion.div variants={fadeUp} className="rounded-[2.5rem] border-[3px] border-brand-primary bg-white p-6 sm:p-8 shadow-[8px_8px_0_#ff6633] flex flex-col justify-between landing-card-shine">
              <div>
                <div className="flex items-center justify-between border-b-2 border-brand-primary/10 pb-4">
                  <div>
                    <h3 className="text-xl font-black">Weekly County Leaderboard</h3>
                    <p className="text-xs text-brand-primary/70 font-bold mt-1">Leagues run weekly once your county is live</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-brand-primary bg-[#ff6633] px-3.5 py-1 text-xs font-black uppercase tracking-wider text-white shadow-[2px_2px_0_#1b2432]">
                    <AnimatedIcon animation={activity} size={14} strokeColor="#ffffff" /> Sample
                  </span>
                </div>

                <div className="mt-6 space-y-4">
                  {[
                    { rank: 1, county: "Kisumu County", xp: "14,200 XP", streak: "248 active youth", avatar: <Zola action="excited" className="h-full w-full" /> },
                    { rank: 2, county: "Nairobi County", xp: "12,850 XP", streak: "192 active youth", avatar: <Ken action="adjust" className="h-full w-full" /> },
                    { rank: 3, county: "Mombasa County", xp: "11,400 XP", streak: "154 active youth", avatar: <Tumi action="cheer" className="h-full w-full" /> },
                    { rank: 4, county: "Uasin Gishu County", xp: "9,900 XP", streak: "98 active youth", avatar: <Mwanzo expression="excited" className="h-full w-full" /> },
                    { rank: 5, county: "Kiambu County", xp: "8,500 XP", streak: "84 active youth", avatar: <Zola action="cheer" className="h-full w-full" /> },
                  ].map((c) => (
                    <motion.div key={c.rank} whileHover={{ x: 4 }} className="flex items-center gap-4 bg-[#fbfaf6] border-2 border-brand-primary p-3 rounded-2xl shadow-[3px_3px_0_#1b2432] transition-colors hover:bg-white">
                      <span className={`text-sm font-black w-6 text-center ${c.rank === 1 ? "text-brand-orange text-lg" : c.rank === 2 ? "text-sky-700" : "text-brand-primary/70"}`}>#{c.rank}</span>
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border-2 border-brand-primary bg-orange-100 flex items-center justify-center p-0.5">{c.avatar}</div>
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-sm text-brand-primary truncate">{c.county}</p>
                        <p className="text-xs text-brand-primary/70 font-bold">{c.streak}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-[#ff6633]">{c.xp}</p>
                        <p className="text-xs text-emerald-700 font-bold flex items-center gap-0.5 justify-end"><Flame className="h-3 w-3 fill-current text-brand-orange animate-pulse" /> Up 12%</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Right Bento Stack */}
            <motion.div variants={fadeUp} className="flex flex-col gap-8">
              {/* Live Activity Feed */}
              <div className="rounded-[2.5rem] border-[3px] border-brand-primary bg-white p-6 sm:p-8 flex-1 shadow-[8px_8px_0_#1b2432] landing-card-shine">
                <h3 className="flex items-center gap-2 text-xl font-black border-b-2 border-brand-primary/10 pb-4">
                  <AnimatedIcon animation={activity} size={22} strokeColor="#FF6633" /> Activity Stream
                </h3>
                <div className="mt-6 space-y-4">
                  {[
                    { user: "Elisha (Kisumu)", detail: "claimed 'Budget Auditor' badge (+200 XP)", time: "2 mins ago", avatar: <Mwanzo expression="happy" className="h-full w-full" /> },
                    { user: "Faith (Nairobi)", detail: "started a 5-day study streak", time: "12 mins ago", avatar: <Zola action="cheer" className="h-full w-full" /> },
                    { user: "Otieno (Mombasa)", detail: "completed county waste map mission", time: "24 mins ago", avatar: <Ken action="adjust" className="h-full w-full" /> },
                    { user: "Wambui (Nakuru)", detail: "joined Civic Leadership path", time: "1 hour ago", avatar: <Tumi action="cheer" className="h-full w-full" /> },
                  ].map((feed, idx) => (
                    <motion.div key={idx} whileHover={{ x: 4 }} className="flex gap-3 text-sm border-b border-brand-primary/5 pb-3 last:border-0 last:pb-0">
                      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border-2 border-brand-primary bg-orange-100 p-0.5">{feed.avatar}</div>
                      <div className="flex-1">
                        <p className="font-black text-brand-primary text-xs">{feed.user}</p>
                        <p className="text-brand-primary/70 text-xs mt-0.5 font-semibold leading-relaxed">{feed.detail}</p>
                      </div>
                      <span className="text-xs text-brand-primary/70 font-bold shrink-0">{feed.time}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Trending Challenge */}
              <motion.div whileHover={{ y: -5, rotate: -0.35 }} className="rounded-[2.5rem] border-[3px] border-brand-primary bg-[#fffdf5] p-6 sm:p-8 relative overflow-hidden shadow-[8px_8px_0_#ff6633] flex flex-col justify-between landing-card-shine">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#ff6633]">
                    <Sparkles className="h-4 w-4 text-[#ff6633]" /> Trending Civic Mission
                  </div>
                  <h4 className="mt-3 text-lg font-black text-brand-primary leading-snug">Track Public Ward Development Funds (CDF)</h4>
                  <p className="text-xs text-brand-primary/70 mt-2 font-semibold leading-relaxed">Verify the state of CDF projects in your county and earn bonus XP for your work.</p>
                </div>
                <button
                  onClick={() => document.getElementById("first-mission")?.scrollIntoView({ behavior: "smooth" })}
                  className="mt-6 px-4 py-2 border-2 border-brand-primary text-xs font-black text-brand-primary bg-white hover:-translate-y-0.5 active:translate-y-0 shadow-[2px_2px_0_#1b2432] rounded-xl transition-all self-start"
                >
                  Go to Challenge
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <WavyDivider topColor="#fcfbf7" bottomColor="#f8f4e8" variant={3} />

      {/* ══════════════════════════════════════════════════════════════
          SECTION 7 · FAQ ACCORDION
          ══════════════════════════════════════════════════════════════ */}
      <section className="bg-[#f8f4e8] px-5 py-24 sm:px-8 lg:py-28 relative overflow-hidden">

        <div className="mx-auto max-w-4xl">
          <div className="mb-14 text-center">
            <div className="inline-flex items-center gap-3 mb-4">
              <span className="text-5xl font-black font-display text-brand-orange/20 select-none">FAQ</span>
            </div>
            <h2 className="font-display text-4xl font-black sm:text-5xl text-brand-primary">Frequently Asked Questions</h2>
            <p className="mt-4 text-lg font-semibold text-brand-primary/60">Everything you need to know about Kiongozi.</p>
          </div>

          <motion.div
            className="space-y-5"
            variants={staggerChildren}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            {faqItems.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <motion.div key={idx} variants={fadeUp} whileHover={{ y: -3 }} className="rounded-[1.5rem] border-[3px] border-brand-primary bg-white shadow-[4px_4px_0_#1b2432] overflow-hidden transition-colors landing-card-shine">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 p-5 sm:p-6 text-left hover:bg-slate-50/50 transition-colors"
                  >
                    <span className="text-base font-black text-brand-primary leading-snug">{item.question}</span>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.25 }}
                      className="shrink-0 h-8 w-8 rounded-full border-2 border-brand-primary flex items-center justify-center bg-white shadow-[1.5px_1.5px_0_#1b2432]"
                    >
                      <ChevronDown className="h-4 w-4 text-brand-primary" />
                    </motion.div>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 sm:px-6 sm:pb-6 border-t-2 border-brand-primary/10 pt-4">
                          <p className="text-sm font-semibold leading-relaxed text-brand-primary/70">{faqAnswerOverrides[item.question] ?? item.answer}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      <StickerRow
        items={[
          { label: "100% Free", bg: "bg-brand-orange", text: "text-white", tilt: "-rotate-2" },
          { label: "47 Counties", bg: "bg-brand-blue", tilt: "rotate-2" },
          { label: "Real Credentials", bg: "bg-white", tilt: "-rotate-1" },
          { label: "3-Min Missions", bg: "bg-emerald-400", tilt: "rotate-1" },
          { label: "By Youth, For Youth", bg: "bg-white", tilt: "rotate-2" },
        ]}
      />

      {/* ══════════════════════════════════════════════════════════════
          SECTION 8 · FOOTER CTA (Cloud Banner)
          ══════════════════════════════════════════════════════════════ */}
      <section className="px-5 py-20 sm:px-8 lg:py-28 bg-[#f8f4e8] relative overflow-hidden">
        <SparkleIcon className="absolute top-10 left-10 w-12 h-12 text-brand-orange/10 animate-pulse hidden md:block" />
        <StarIcon className="absolute top-16 right-14 w-10 h-10 text-brand-primary opacity-[0.04] hidden md:block" />

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          whileHover={{ y: -5 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto max-w-5xl rounded-[3rem] border-[3px] border-brand-primary bg-white p-10 text-center shadow-[12px_12px_0_#ff6633] sm:p-16 overflow-hidden landing-card-shine"
        >
          {/* Corner decorations */}
          <SparkleIcon className="absolute top-5 left-5 w-6 h-6 text-brand-orange/20" />
          <StarIcon className="absolute bottom-5 right-5 w-8 h-8 text-brand-blue/15" />
          <LoopDoodle className="absolute top-8 right-8 w-20 h-10 text-brand-primary hidden sm:block" />
          <LottieScene src="/lottie/lights.json" className="pointer-events-none absolute inset-x-0 top-0 h-28 w-full opacity-50" />

          <div className="relative z-10 mx-auto max-w-3xl flex flex-col items-center">
            <div className="rounded-[1.5rem] border-[3px] border-brand-primary bg-orange-100 p-3 shrink-0 mb-8 w-24 h-24 flex items-center justify-center shadow-[4px_4px_0_#1b2432]">
              <Zola action="excited" className="h-20 w-20" />
            </div>

            <h2 className="font-display text-4xl font-black text-brand-primary sm:text-5xl leading-none">
              Your next mission is{" "}
              <span className="relative inline-block text-brand-orange">
                waiting.
                <HandDrawnUnderline className="absolute -bottom-2 left-0 w-full h-3" />
              </span>
            </h2>
            <p className="mt-6 text-lg font-semibold text-brand-primary/65 leading-relaxed max-w-xl">Choose your path, build momentum, and turn learning into visible action across your county.</p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href={user ? "/dashboard" : signupHref}
                className="btn-pill inline-flex min-h-14 items-center justify-center gap-3 border-2 border-brand-primary bg-brand-orange px-8 py-4 text-base font-black text-white shadow-[4px_4px_0_#1b2432] hover:-translate-y-0.5 active:translate-y-0 transition-transform"
              >
                {user ? "Continue learning" : "Create my learning path"} <ArrowRight className="h-5 w-5" />
              </Link>
              <button
                onClick={() => document.getElementById("first-mission")?.scrollIntoView({ behavior: "smooth" })}
                className="btn-pill inline-flex min-h-14 items-center justify-center gap-2 border-2 border-brand-primary bg-white px-8 py-4 text-base font-black shadow-[4px_4px_0_#1b2432] hover:-translate-y-0.5 active:translate-y-0 transition-transform"
              >
                Try a free mission <Zap className="h-5 w-5 text-brand-orange" />
              </button>
            </div>

            {/* Trust signals */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-brand-primary/70">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-600" /> 100% Free</span>
              <span className="text-brand-primary/20">·</span>
              <span className="flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-brand-blue" /> 3-min missions</span>
              <span className="text-brand-primary/20">·</span>
              <span className="flex items-center gap-1.5"><Award className="h-4 w-4 text-brand-orange" /> Real credentials</span>
              <span className="text-brand-primary/20">·</span>
              <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-purple-600" /> 47 counties</span>
            </div>
          </div>
        </motion.div>
      </section>

    </div>
  );
}
