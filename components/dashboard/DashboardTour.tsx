"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mwanzo, Tumi } from '@/components/landing/Characters';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, Check } from 'lucide-react';

interface TourStep {
  targetId?: string;
  title: string;
  content: string;
  mascot: 'mwanzo' | 'tumi';
  mascotAction: string;
  placement: 'center' | 'bottom' | 'top' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Habari! Welcome to Kiongozi! 👋",
    content: "I'm Mwanzo, your sprout guide. Let's take a 1-minute tour to see how you can lead and grow in your community!",
    mascot: 'mwanzo',
    mascotAction: 'happy',
    placement: 'center'
  },
  {
    targetId: 'bento-courses',
    title: "1. The Courses Quest Hub 📚",
    content: "Start learning civic leadership, climate advocacy, and digital builder skills. Complete lessons to earn verified certificates!",
    mascot: 'mwanzo',
    mascotAction: 'excited',
    placement: 'bottom'
  },
  {
    targetId: 'bento-community',
    title: "2. Youth Community Space 📣",
    content: "Speak up! Join live town halls, draft petitions with peers, and share your voice on the Policy Pulse swipe board.",
    mascot: 'tumi',
    mascotAction: 'cheer',
    placement: 'bottom'
  },
  {
    targetId: 'bento-impact',
    title: "3. Green Impact Action Map 🌿",
    content: "Track public funds and green projects in your county. Spot an issue? Upload a photo to audit municipal projects directly!",
    mascot: 'mwanzo',
    mascotAction: 'thinking',
    placement: 'top'
  },
  {
    targetId: 'bento-leaderboard',
    title: "4. Leaderboard & Streaks 🏆",
    content: "Keep your daily study streak hot! Earn XP, unlock badges, and race to the top of your county's leadership board.",
    mascot: 'tumi',
    mascotAction: 'spin',
    placement: 'top'
  }
];

export function DashboardTour() {
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    // Check if user has completed the tour already
    const completed = localStorage.getItem('kiongozi_dashboard_tour_completed');
    if (!completed) {
      setCurrentStep(0);
    }
  }, []);

  useEffect(() => {
    if (currentStep === null || currentStep >= TOUR_STEPS.length) {
      setHighlightStyle({});
      return;
    }

    const step = TOUR_STEPS[currentStep];
    if (!step.targetId) {
      setHighlightStyle({});
      return;
    }

    const updateHighlight = () => {
      const el = document.getElementById(step.targetId!);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const rect = el.getBoundingClientRect();
        setHighlightStyle({
          position: 'absolute',
          top: `${rect.top + window.scrollY - 8}px`,
          left: `${rect.left + window.scrollX - 8}px`,
          width: `${rect.width + 16}px`,
          height: `${rect.height + 16}px`,
          opacity: 1,
        });
      }
    };

    // Delay slightly to allow scroll/render
    const timer = setTimeout(updateHighlight, 300);
    window.addEventListener('resize', updateHighlight);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateHighlight);
    };
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep === null) return;
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setCurrentStep(null);
    localStorage.setItem('kiongozi_dashboard_tour_completed', 'true');
  };

  if (currentStep === null) return null;

  const stepData = TOUR_STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-50 overflow-x-hidden overflow-y-auto pointer-events-none">
      {/* Dimmed Overlay Background */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        className="fixed inset-0 bg-brand-primary/80 backdrop-blur-sm pointer-events-auto"
        onClick={handleSkip}
      />

      {/* Spotlight highlight box around target */}
      {stepData.targetId && highlightStyle.top && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={highlightStyle}
          className="absolute border-4 border-dashed border-brand-orange bg-white/10 rounded-3xl pointer-events-none z-50 shadow-[0_0_40px_rgba(249,115,22,0.5)]"
        />
      )}

      {/* Floating Dialog Box Container */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', damping: 25 }}
          className="relative bg-brand-cream border-4 border-brand-primary rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-solid pointer-events-auto z-50"
        >
          {/* Skip Icon */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-brand-primary/10 border-2 border-transparent hover:border-brand-primary transition-all"
            title="Skip Tour"
          >
            <X className="w-5 h-5 text-brand-primary" />
          </button>

          {/* Mascot Presentation Row */}
          <div className="flex flex-col sm:flex-row gap-6 items-center">
            {/* Mascot Container */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
              className="shrink-0"
            >
              {stepData.mascot === 'mwanzo' ? (
                <Mwanzo expression={stepData.mascotAction as any} className="w-24 h-24 drop-shadow-md" />
              ) : (
                <Tumi action={stepData.mascotAction as any} className="w-24 h-24 drop-shadow-md" />
              )}
            </motion.div>

            {/* Content Column */}
            <div className="flex-1 text-center sm:text-left">
              <span className="text-xs font-black uppercase text-brand-orange tracking-widest bg-brand-orange/10 px-2.5 py-1 rounded-full border border-brand-orange/30">
                Step {currentStep + 1} of {TOUR_STEPS.length}
              </span>
              <h3 className="font-display font-extrabold text-2xl text-brand-primary mt-2">
                {stepData.title}
              </h3>
              <p className="text-sm font-medium text-brand-primary/80 mt-2 leading-relaxed">
                {stepData.content}
              </p>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex justify-between items-center mt-8 pt-4 border-t-2 border-brand-primary/10">
            <button
              onClick={handleSkip}
              className="text-xs font-bold text-brand-primary/60 hover:text-brand-primary transition-colors"
            >
              Skip Tour
            </button>

            <Button
              onClick={handleNext}
              className="bg-brand-orange hover:bg-brand-orange/90 text-white font-black text-sm px-6 py-4 rounded-xl border-2 border-brand-primary shadow-solid active:translate-y-1 active:shadow-none transition-all flex items-center gap-2"
            >
              {currentStep === TOUR_STEPS.length - 1 ? (
                <>
                  Let's Begin! <Check className="w-4 h-4" />
                </>
              ) : (
                <>
                  Continue <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
