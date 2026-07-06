"use client";

import { useEffect, useMemo } from "react";
import { useUser } from "@/app/contexts/UserContext";
import { createClient } from "@/app/utils/supabase/client";

export const PENDING_MISSION_KEY = "kiongozi.pending-intro-mission";

export function PendingMissionClaim() {
  const { user, refreshProfile } = useUser();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!user) return;

    const raw = window.localStorage.getItem(PENDING_MISSION_KEY);
    if (!raw) return;

    let pending: { mission?: string; answer?: string };
    try {
      pending = JSON.parse(raw);
    } catch {
      window.localStorage.removeItem(PENDING_MISSION_KEY);
      return;
    }

    if (!pending.mission || !pending.answer) {
      window.localStorage.removeItem(PENDING_MISSION_KEY);
      return;
    }

    let cancelled = false;
    void supabase.rpc("claim_intro_mission", {
      p_mission_key: pending.mission,
      p_answer: pending.answer,
    }).then(async ({ error }) => {
      if (cancelled || error) return;
      window.localStorage.removeItem(PENDING_MISSION_KEY);
      await refreshProfile();
    });

    return () => { cancelled = true; };
  }, [refreshProfile, supabase, user]);

  return null;
}
