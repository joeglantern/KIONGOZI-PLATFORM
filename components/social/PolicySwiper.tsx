"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Zola, Ken } from '@/components/landing/Characters';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, MessageSquare, Award, ArrowRight, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PollItem {
  id: string;
  title: string;
  description: string;
  category: string;
  response_count?: number;
  zolaDebate?: string;
  kenDebate?: string;
}

interface PolicySwiperProps {
  polls: PollItem[];
  userRespondedIds: Set<string>;
  onVote: (pollId: string, choice: 'approve' | 'oppose', points: number) => Promise<void>;
}

export function PolicySwiper({ polls, userRespondedIds, onVote }: PolicySwiperProps) {
  // Filter out polls user has already voted on to show only active stack
  const activePolls = useMemo(() => {
    return polls.filter(p => !userRespondedIds.has(p.id));
  }, [polls, userRespondedIds]);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showDebate, setShowDebate] = useState<boolean>(false);
  const [hasDebated, setHasDebated] = useState<boolean>(false);
  const [xpFloats, setXpFloats] = useState<{ id: number; text: string; x: number; y: number }[]>([]);
  const [voteCount, setVoteCount] = useState<number>(0);

  // Framer Motion motion values for swipe effect
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0.5, 1, 1, 1, 0.5]);
  const yesOpacity = useTransform(x, [0, 100], [0, 1]);
  const noOpacity = useTransform(x, [-100, 0], [1, 0]);

  const currentPoll = activePolls[currentIndex];

  // Mock debates if not present in database
  const zolaDebateText = currentPoll?.zolaDebate || "We must support this policy to ensure our community assets are preserved for the next generation. Climate resilience is our top priority! 🌿";
  const kenDebateText = currentPoll?.kenDebate || "We need to audit the implementation budget first. We must deploy transparent tracking systems to avoid funds leaking! 💻";

  const handleDragEnd = async (event: any, info: any) => {
    const swipeThreshold = 120;
    if (info.offset.x > swipeThreshold) {
      // Swipe Right -> Approve
      await triggerVote('approve', info.point.x, info.point.y);
    } else if (info.offset.x < -swipeThreshold) {
      // Swipe Left -> Oppose
      await triggerVote('oppose', info.point.x, info.point.y);
    }
  };

  const triggerVote = async (choice: 'approve' | 'oppose', clickX?: number, clickY?: number) => {
    if (!currentPoll) return;

    // Calculate XP: 10 XP normal, 20 XP if they read the mascot debate!
    const earnedXp = hasDebated ? 20 : 10;
    
    // Spawn floating XP label
    const pageX = clickX || window.innerWidth / 2;
    const pageY = clickY || window.innerHeight / 2 - 100;
    const floatId = Date.now();
    setXpFloats(prev => [...prev, {
      id: floatId,
      text: `+${earnedXp} XP ${hasDebated ? 'Double Bonus!' : ''}`,
      x: pageX - 60,
      y: pageY - 30
    }]);

    // Cleanup float label after animation
    setTimeout(() => {
      setXpFloats(prev => prev.filter(f => f.id !== floatId));
    }, 1200);

    // Call Supabase API through prop function
    await onVote(currentPoll.id, choice, earnedXp);

    // Clean up local states for next card
    setShowDebate(false);
    setHasDebated(false);
    
    // Trigger success audio-visual feedback
    if (typeof window !== 'undefined') {
      try {
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.8 },
          colors: choice === 'approve' ? ['#10b981', '#6ee7b7'] : ['#f43f5e', '#fda4af']
        });
      } catch (e) {}
    }

    // Go to next card
    setCurrentIndex(prev => prev + 1);
    setVoteCount(prev => prev + 1);
  };

  const startDebate = () => {
    setShowDebate(true);
    setHasDebated(true);
  };

  if (currentIndex >= activePolls.length) {
    return (
      <div className="bg-brand-cream/40 border-4 border-dashed border-brand-primary rounded-3xl p-8 text-center max-w-md mx-auto my-10 shadow-solid">
        <Award className="w-16 h-16 text-brand-orange mx-auto mb-4 animate-bounce" />
        <h3 className="font-display font-extrabold text-2xl text-brand-primary">Stack Complete! 🎉</h3>
        <p className="text-sm font-semibold text-brand-primary/70 mt-2">
          You've swiped all available policy cards. You voted on {voteCount} policies and earned up to {voteCount * 20} XP!
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => setCurrentIndex(0)} className="bg-brand-primary hover:bg-black text-white rounded-xl border-2 border-brand-primary shadow-solid active:translate-y-1 active:shadow-none font-bold text-xs flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Start Over
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto relative select-none px-4 py-8">
      {/* Dynamic Floating XP labels */}
      <AnimatePresence>
        {xpFloats.map(f => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: f.y, x: f.x, scale: 0.8 }}
            animate={{ opacity: 1, y: f.y - 100, scale: 1.1, rotate: [-5, 5, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className="absolute z-50 pointer-events-none font-black text-emerald-600 font-display bg-white px-3 py-1.5 rounded-full border-2 border-brand-primary shadow-solid text-sm"
          >
            {f.text}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Progress HUD */}
      <div className="flex justify-between items-center mb-6 text-xs font-black text-brand-primary/60 uppercase">
        <span>Active Deck</span>
        <span className="bg-brand-primary/10 px-3 py-1 rounded-full border border-brand-primary/20">
          Card {currentIndex + 1} of {activePolls.length}
        </span>
      </div>

      {/* Swiper Card stack container */}
      <div className="relative h-[410px] w-full flex items-center justify-center">
        {/* Next Card preview behind current */}
        {currentIndex + 1 < activePolls.length && (
          <div className="absolute w-[94%] h-[370px] bg-white/70 border-4 border-brand-primary rounded-3xl z-0 scale-[0.94] translate-y-6 opacity-60 pointer-events-none" />
        )}

        {/* Current Active Swiping Card */}
        <motion.div
          style={{ x, rotate, opacity }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
          className="absolute w-full h-[370px] bg-brand-cream border-4 border-brand-primary rounded-3xl p-6 shadow-solid z-10 cursor-grab active:cursor-grabbing flex flex-col justify-between"
        >
          {/* Swiping HUD overlays */}
          <motion.div
            style={{ opacity: yesOpacity }}
            className="absolute top-6 left-6 border-4 border-emerald-500 text-emerald-500 font-black text-xl px-4 py-2 rounded-xl rotate-[-12] bg-white z-20 pointer-events-none"
          >
            AGREE
          </motion.div>
          <motion.div
            style={{ opacity: noOpacity }}
            className="absolute top-6 right-6 border-4 border-rose-500 text-rose-500 font-black text-xl px-4 py-2 rounded-xl rotate-[12] bg-white z-20 pointer-events-none"
          >
            OPPOSE
          </motion.div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-orange bg-brand-orange/10 px-2.5 py-1 rounded-full border border-brand-orange/30">
                {currentPoll.category}
              </span>
              <span className="text-[10px] font-bold text-brand-primary/50">
                {currentPoll.response_count || 0} Votes logged
              </span>
            </div>

            <h3 className="font-display font-extrabold text-xl text-brand-primary leading-snug line-clamp-3">
              {currentPoll.title}
            </h3>
            <p className="text-xs font-medium text-brand-primary/80 mt-3 leading-relaxed line-clamp-5">
              {currentPoll.description}
            </p>
          </div>

          {/* Action Row */}
          <div className="flex gap-3 mt-6 border-t-2 border-brand-primary/10 pt-4 z-10 relative">
            <button
              onClick={startDebate}
              className="flex-1 bg-white hover:bg-amber-50/50 border-2 border-brand-primary text-brand-primary font-black text-xs py-3 px-4 rounded-xl shadow-solid active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4 text-brand-orange" />
              Listen to Debate (+10 XP)
            </button>
          </div>
        </motion.div>
      </div>

      {/* Mascot Debate Bubble Panel */}
      <AnimatePresence>
        {showDebate && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mt-6 bg-white border-4 border-brand-primary rounded-3xl p-5 shadow-solid space-y-4"
          >
            <h4 className="text-xs font-black text-brand-primary uppercase tracking-widest flex items-center gap-1.5 border-b-2 border-brand-primary/10 pb-2">
              <MessageSquare className="w-4 h-4 text-brand-orange" /> Mascot Perspectives
            </h4>
            
            {/* Zola eco debate */}
            <div className="flex gap-3 items-start">
              <Zola action="excited" className="w-12 h-12 shrink-0 drop-shadow-sm" />
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-3 text-xs text-brand-primary font-medium leading-relaxed relative">
                <div className="absolute top-4 -left-2 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-emerald-300 border-b-8 border-b-transparent" />
                <span className="font-bold text-emerald-800 block mb-0.5">Zola (Climate Defender):</span>
                {zolaDebateText}
              </div>
            </div>

            {/* Ken tech debate */}
            <div className="flex gap-3 items-start">
              <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-3 text-xs text-brand-primary font-medium leading-relaxed relative order-1">
                <div className="absolute top-4 -right-2 w-0 h-0 border-t-8 border-t-transparent border-l-8 border-l-blue-300 border-b-8 border-b-transparent" />
                <span className="font-bold text-blue-800 block mb-0.5">Ken (Civic Developer):</span>
                {kenDebateText}
              </div>
              <Ken action="adjust" className="w-12 h-12 shrink-0 drop-shadow-sm order-2" />
            </div>

            <div className="flex justify-end pt-2 border-t border-brand-primary/10">
              <Button
                onClick={() => setShowDebate(false)}
                className="bg-brand-primary hover:bg-black text-white font-bold text-xs py-2 px-4 rounded-xl border-2 border-brand-primary shadow-solid active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1"
              >
                Close Debate <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual buttons for desktop/non-drag users */}
      <div className="flex gap-4 justify-center mt-6">
        <button
          onClick={() => triggerVote('oppose')}
          className="w-14 h-14 bg-white hover:bg-rose-50 border-4 border-brand-primary text-rose-500 rounded-full flex items-center justify-center shadow-solid active:translate-y-1 active:shadow-none transition-all hover:scale-105"
          title="Oppose Policy"
        >
          <ThumbsDown className="w-6 h-6 fill-current" />
        </button>
        <button
          onClick={() => triggerVote('approve')}
          className="w-14 h-14 bg-white hover:bg-emerald-50 border-4 border-brand-primary text-emerald-500 rounded-full flex items-center justify-center shadow-solid active:translate-y-1 active:shadow-none transition-all hover:scale-105"
          title="Approve Policy"
        >
          <ThumbsUp className="w-6 h-6 fill-current" />
        </button>
      </div>
    </div>
  );
}
