import Link from "next/link";
import { ArrowRight, Check, Clock3, Sparkles } from "lucide-react";
import { getNodeState, type LearningPathRecord, type SkillProgressRecord } from "@/components/dashboard/LearningTree";

export function NextActionCard({ path, progress }: { path: LearningPathRecord | null; progress: SkillProgressRecord[] }) {
  if (!path) return null;
  const progressMap = new Map(progress.map((item) => [item.node_id, item]));
  const nodes = [...path.skill_nodes].sort((a, b) => a.order_index - b.order_index);
  const nextNode = nodes.find((node) => getNodeState(node, progressMap) === "active");
  const completed = nodes.filter((node) => progressMap.get(node.id)?.status === "completed").length;
  if (!nextNode) return <div className="mb-8 rounded-3xl border-2 border-emerald-700/20 bg-emerald-50 p-6"><Check className="h-6 w-6 text-emerald-600" /><h2 className="mt-3 text-xl font-black">Path complete</h2><p className="mt-1 text-sm font-semibold text-brand-primary/55">You completed every currently published skill in {path.title}.</p></div>;

  const href = nextNode.course_id ? `/courses/${nextNode.course_id}` : nextNode.target_href;
  return <div className="mb-8 overflow-hidden rounded-[1.75rem] border-[3px] border-brand-primary bg-brand-primary text-white shadow-[7px_7px_0_#ff6633]"><div className="grid items-center gap-6 p-6 md:grid-cols-[1fr_auto] md:p-8"><div><span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-brand-blue"><Sparkles className="h-4 w-4" /> Your next best action</span><h2 className="mt-3 font-display text-3xl font-black">{nextNode.title}</h2><p className="mt-2 max-w-2xl font-medium text-white/65">{nextNode.description}</p><div className="mt-4 flex gap-4 text-xs font-black text-white/55"><span><Clock3 className="mr-1 inline h-3 w-3" />{nextNode.estimated_minutes ?? 10} min</span><span>{completed}/{nodes.length} skills complete</span></div></div><Link href={href} className="btn-pill min-h-12 bg-brand-orange px-6 text-white">Start now <ArrowRight className="h-4 w-4" /></Link></div><div className="h-2 bg-white/10"><div className="h-full bg-brand-orange" style={{ width: `${nodes.length ? (completed / nodes.length) * 100 : 0}%` }} /></div></div>;
}
