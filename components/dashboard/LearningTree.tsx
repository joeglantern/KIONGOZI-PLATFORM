"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Award, Check, Clock3, Lock, Play, X } from "lucide-react";

export interface SkillNodeRecord {
  id: string;
  slug: string;
  title: string;
  description: string;
  node_type: "mission" | "course" | "quiz" | "project" | "milestone";
  order_index: number;
  xp_reward: number;
  estimated_minutes: number | null;
  target_href: string;
  prerequisite_node_id: string | null;
  course_id?: string | null;
}

export interface LearningPathRecord {
  id: string;
  slug: string;
  title: string;
  description: string;
  outcome: string;
  accent_color: string;
  skill_nodes: SkillNodeRecord[];
}

export interface SkillProgressRecord {
  node_id: string;
  status: "available" | "in_progress" | "completed";
  progress_percentage: number;
}

export function getNodeState(node: SkillNodeRecord, progress: Map<string, SkillProgressRecord>) {
  const ownProgress = progress.get(node.id);
  if (ownProgress?.status === "completed") return "completed" as const;
  if (!node.prerequisite_node_id || progress.get(node.prerequisite_node_id)?.status === "completed") return "active" as const;
  return "locked" as const;
}

export function LearningTree({ path, progress = [] }: { path: LearningPathRecord | null; progress?: SkillProgressRecord[] }) {
  const [selectedNode, setSelectedNode] = useState<SkillNodeRecord | null>(null);
  const progressMap = useMemo(() => new Map(progress.map((item) => [item.node_id, item])), [progress]);
  const nodes = useMemo(() => [...(path?.skill_nodes ?? [])].sort((a, b) => a.order_index - b.order_index), [path]);

  if (!path) {
    return <div className="rounded-3xl border-2 border-dashed border-brand-primary/15 bg-white p-10 text-center"><p className="font-black">Your learning path is not available yet.</p><Link href="/onboarding" className="mt-4 inline-flex font-black text-brand-orange">Choose a path</Link></div>;
  }

  return (
    <div className="relative mx-auto min-h-[620px] w-full max-w-3xl overflow-hidden rounded-[2rem] border-[3px] border-brand-primary bg-[#f8f4e8] p-6 shadow-[8px_8px_0_#1b2432] sm:p-10">
      <div className="absolute inset-0 bg-[radial-gradient(#1b2432_1px,transparent_1px)] [background-size:24px_24px] opacity-[.06]" />
      <div className="relative text-center"><span className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-white" style={{ backgroundColor: path.accent_color }}>{path.title}</span><h2 className="mt-4 font-display text-3xl font-black">Your skill path</h2><p className="mx-auto mt-2 max-w-lg text-sm font-semibold text-brand-primary/55">{path.outcome}</p></div>

      <div className="relative mx-auto mt-12 max-w-xl space-y-8 before:absolute before:bottom-10 before:left-8 before:top-8 before:border-l-4 before:border-dashed before:border-brand-primary/15 sm:before:left-10">
        {nodes.map((node) => {
          const state = getNodeState(node, progressMap);
          const nodeProgress = progressMap.get(node.id)?.progress_percentage ?? 0;
          return (
            <motion.button key={node.id} onClick={() => setSelectedNode(node)} whileHover={state !== "locked" ? { x: 5 } : undefined} className={`relative flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all sm:p-5 ${state === "active" ? "border-brand-primary bg-white shadow-[5px_5px_0_#1b2432]" : state === "completed" ? "border-emerald-700/20 bg-emerald-50" : "border-brand-primary/10 bg-gray-100 text-gray-400"}`}>
              <span className={`z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-[3px] sm:h-20 sm:w-20 ${state === "completed" ? "border-emerald-800 bg-emerald-500 text-white" : state === "active" ? "border-brand-primary bg-brand-orange text-white" : "border-gray-300 bg-gray-200"}`}>{state === "completed" ? <Check className="h-7 w-7" /> : state === "active" ? <Play className="h-7 w-7 fill-current" /> : <Lock className="h-6 w-6" />}</span>
              <span className="min-w-0 flex-1"><span className="text-[10px] font-black uppercase tracking-[.16em] opacity-50">{node.node_type} · {state}</span><strong className="mt-1 block text-lg font-black leading-tight text-brand-primary">{node.title}</strong><span className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-brand-primary/50"><span><Clock3 className="mr-1 inline h-3 w-3" />{node.estimated_minutes ?? 10} min</span><span><Award className="mr-1 inline h-3 w-3" />{node.xp_reward} XP</span></span>{nodeProgress > 0 && nodeProgress < 100 && <span className="mt-3 block h-2 overflow-hidden rounded-full bg-brand-primary/10"><span className="block h-full bg-brand-orange" style={{ width: `${nodeProgress}%` }} /></span>}</span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>{selectedNode && (() => { const state = getNodeState(selectedNode, progressMap); const href = selectedNode.course_id ? `/courses/${selectedNode.course_id}` : selectedNode.target_href; return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 flex items-end bg-brand-primary/65 p-4 backdrop-blur-sm"><motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} className="mx-auto w-full max-w-xl rounded-3xl border-[3px] border-brand-primary bg-white p-6 shadow-[7px_7px_0_#ff6633]"><button onClick={() => setSelectedNode(null)} aria-label="Close node details" className="float-right rounded-full p-2 hover:bg-gray-100"><X className="h-5 w-5" /></button><span className="text-xs font-black uppercase tracking-wider text-brand-orange">{selectedNode.node_type}</span><h3 className="mt-2 font-display text-2xl font-black">{selectedNode.title}</h3><p className="mt-3 font-semibold leading-relaxed text-brand-primary/60">{selectedNode.description}</p><div className="mt-5 flex gap-4 text-sm font-black"><span>{selectedNode.estimated_minutes ?? 10} minutes</span><span>+{selectedNode.xp_reward} XP</span></div>{state === "locked" ? <div className="mt-6 rounded-xl bg-gray-100 p-4 text-center text-sm font-black text-gray-500"><Lock className="mr-2 inline h-4 w-4" />Complete the previous skill to unlock this node.</div> : <Link href={href} className="btn-pill mt-6 flex min-h-12 w-full bg-brand-orange px-5 text-white">{state === "completed" ? "Review skill" : "Start this skill"}<Play className="h-4 w-4 fill-current" /></Link>}</motion.div></motion.div>; })()}</AnimatePresence>
    </div>
  );
}
