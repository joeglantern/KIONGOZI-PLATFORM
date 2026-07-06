"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { PolicySwiper } from '@/components/social/PolicySwiper';
import PolicyPollCard from '@/components/social/PolicyPollCard';
import { createClient } from '@/app/utils/supabase/client';
import { useUser } from '@/app/contexts/UserContext';
import { BarChart2, PlusCircle, LayoutGrid, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';

interface PolicyPulseClientProps {
  initialPolls: any[];
  initialRespondedIds: string[];
}

export default function PolicyPulseClient({ initialPolls, initialRespondedIds }: PolicyPulseClientProps) {
  const { user, profile } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();

  const [polls, setPolls] = useState<any[]>(initialPolls);
  const [respondedIds, setRespondedIds] = useState<Set<string>>(new Set(initialRespondedIds));
  const [viewMode, setViewMode] = useState<'classic' | 'swipe'>('swipe'); // Default to Swipe Mode for high gamification!

  const activePolls = polls.filter(p => p.status === 'active' && (!p.closes_at || new Date(p.closes_at) > new Date()));
  const closedPolls = polls.filter(p => p.status === 'closed' || (p.closes_at && new Date(p.closes_at) <= new Date()));

  const handleVote = async (pollId: string, choice: 'approve' | 'oppose', points: number) => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please create an account or sign in to vote and earn XP.' });
      return;
    }

    try {
      // 1. Fetch the first question for this poll
      const { data: questions } = await supabase
        .from('poll_questions')
        .select('*, poll_options(*)')
        .eq('poll_id', pollId)
        .order('question_order');

      const question = questions?.[0];
      const identityFields = { user_id: user.id, anon_session_id: null };

      if (question) {
        let optionId = null;
        if (question.question_type === 'single_choice' && question.poll_options?.length > 0) {
          // Attempt to map choice to options (first option usually yes/approve, second no/oppose)
          const opts = question.poll_options;
          if (choice === 'approve') {
            optionId = opts[0]?.id;
          } else {
            optionId = opts[opts.length - 1]?.id; // last option
          }
        }

        // Insert response
        if (optionId) {
          await supabase.from('poll_responses').insert({
            poll_id: pollId,
            question_id: question.id,
            option_id: optionId,
            ...identityFields
          });
        } else if (question.question_type === 'scale') {
          await supabase.from('poll_responses').insert({
            poll_id: pollId,
            question_id: question.id,
            scale_value: choice === 'approve' ? 5 : 1,
            ...identityFields
          });
        }
      }

      // 2. Insert poll submission
      const { error: subError } = await supabase
        .from('poll_submissions')
        .insert({
          poll_id: pollId,
          ...identityFields
        });

      if (subError && subError.code !== '23505') throw subError;

      // The database verifies the submission and awards this poll only once.
      const { error: rewardError } = await supabase.rpc('claim_poll_submission', {
        p_poll_id: pollId
      });
      if (rewardError) console.error('Poll reward failed:', rewardError);

      // Add to local responded Set
      setRespondedIds(prev => {
        const next = new Set(prev);
        next.add(pollId);
        return next;
      });

      // Update response count locally
      setPolls(prev => prev.map(p => {
        if (p.id === pollId) {
          return { ...p, response_count: (p.response_count || 0) + 1 };
        }
        return p;
      }));

      toast({
        title: `Swiped! Earned +${points} XP`,
        description: `You voted on the policy and helped shape decisions. Keep it up!`,
        className: 'bg-emerald-500 text-white border-none'
      });

    } catch (err: any) {
      console.error('Failed to submit swipe vote:', err);
      toast({
        title: 'Submit failed',
        description: err.message || 'Something went wrong.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header section */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 border-b border-brand-primary/10 pb-6">
        <div>
          <h1 className="text-3xl font-display font-black tracking-tight text-brand-primary flex items-center gap-3">
            <BarChart2 className="h-8 w-8 text-brand-orange animate-pulse" />
            Youth Policy Pulse
          </h1>
          <p className="text-brand-primary/60 text-sm font-semibold mt-2 max-w-xl">
            Swipe policies to vote, double your XP reward by listening to debates, and make municipal decisions transparent.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Mode Toggle Switch */}
          <div className="flex bg-gray-200 p-1 rounded-2xl border-2 border-brand-primary select-none w-fit">
            <button
              onClick={() => setViewMode('swipe')}
              className={`px-4 py-2 rounded-xl font-bold font-display text-xs transition-all flex items-center gap-1.5 ${
                viewMode === 'swipe'
                  ? 'bg-white border-2 border-brand-primary text-brand-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 border-2 border-transparent'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-orange fill-current" /> Swipe Board
            </button>
            <button
              onClick={() => setViewMode('classic')}
              className={`px-4 py-2 rounded-xl font-bold font-display text-xs transition-all flex items-center gap-1.5 ${
                viewMode === 'classic'
                  ? 'bg-white border-2 border-brand-primary text-brand-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 border-2 border-transparent'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-brand-primary" /> List View
            </button>
          </div>

          {user && (
            <Button asChild className="bg-brand-orange hover:bg-brand-orange/90 text-white rounded-xl border-2 border-brand-primary shadow-solid active:translate-y-1 active:shadow-none font-bold text-xs shrink-0 h-10 px-4">
              <Link href="/community/policy-pulse/create">
                <PlusCircle className="mr-1.5 h-4 w-4" /> Create Poll
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Main Switchable Panels */}
      <AnimatePresence mode="wait">
        {viewMode === 'swipe' ? (
          <motion.div
            key="swipe"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <PolicySwiper
              polls={activePolls}
              userRespondedIds={respondedIds}
              onVote={handleVote}
            />
          </motion.div>
        ) : (
          <motion.div
            key="classic"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {/* Active Polls */}
            {activePolls.length > 0 && (
              <section>
                <h2 className="font-display font-black text-xl mb-4 text-brand-primary">Active Polls</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activePolls.map(poll => (
                    <PolicyPollCard
                      key={poll.id}
                      poll={poll}
                      hasResponded={respondedIds.has(poll.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Closed / Completed Polls */}
            {closedPolls.length > 0 && (
              <section>
                <h2 className="font-display font-black text-xl mb-4 text-brand-primary flex items-center gap-2">
                  Completed Polls
                  <span className="text-xs font-semibold text-brand-primary/60">— view results & AI insights</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {closedPolls.map(poll => (
                    <PolicyPollCard
                      key={poll.id}
                      poll={poll}
                      hasResponded={respondedIds.has(poll.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {polls.length === 0 && (
              <div className="text-center py-20 bg-brand-cream/30 rounded-3xl border-4 border-dashed border-brand-primary/20 max-w-lg mx-auto">
                <BarChart2 className="h-12 w-12 mx-auto mb-4 text-brand-primary/20" />
                <h3 className="font-display font-extrabold text-xl text-brand-primary mb-2">No Polls Yet</h3>
                <p className="text-xs font-medium text-brand-primary/60 mb-6">Be the first to start a policy conversation.</p>
                {user && (
                  <Button asChild className="bg-brand-primary hover:bg-black text-white rounded-xl border-2 border-brand-primary shadow-solid active:translate-y-1 active:shadow-none font-bold text-xs">
                    <Link href="/community/policy-pulse/create">Create a Poll</Link>
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
