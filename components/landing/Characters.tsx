"use client";

import React from 'react';
import { Mwanzo as ModernMwanzo } from '../characters/Mwanzo';
import { Zola as ModernZola } from '../characters/Zola';
import { Ken as ModernKen } from '../characters/Ken';
import { Tumi as ModernTumi } from '../characters/Tumi';
import { TreasureChest as ModernTreasureChest } from '../characters/TreasureChest';
import { CharacterState } from '../characters/CharacterRig';

// --- Mwanzo (The Sprout Guide) ---
export function Mwanzo({ expression = 'happy', className = '' }: { expression?: 'happy' | 'excited' | 'wave' | 'thinking'; className?: string }) {
  let state: CharacterState = 'idle';
  if (expression === 'happy') state = 'happy';
  if (expression === 'excited' || expression === 'wave') state = 'excited';
  if (expression === 'thinking') state = 'thinking';

  return <ModernMwanzo state={state} className={className} />;
}

// --- Zola (The Climate Defender) ---
export function Zola({ action = 'idle', className = '' }: { action?: 'idle' | 'cheer' | 'thinking' | 'excited'; className?: string }) {
  let state: CharacterState = 'idle';
  if (action === 'cheer' || action === 'excited') state = 'excited';
  if (action === 'thinking') state = 'thinking';

  return <ModernZola state={state} className={className} />;
}

// --- Ken (The Civic Innovator) ---
export function Ken({ action = 'idle', className = '' }: { action?: 'idle' | 'adjust' | 'thinking' | 'excited'; className?: string }) {
  let state: CharacterState = 'idle';
  if (action === 'excited') state = 'excited';
  if (action === 'thinking' || action === 'adjust') state = 'thinking';

  return <ModernKen state={state} className={className} />;
}

// --- Tumi (The Community Organizer) ---
export function Tumi({ action = 'idle', className = '' }: { action?: 'idle' | 'spin' | 'cheer'; className?: string }) {
  let state: CharacterState = 'idle';
  if (action === 'cheer') state = 'excited';
  if (action === 'spin') state = 'celebrating'; // Map spin to the new celebrating state

  return <ModernTumi state={state} className={className} />;
}

// --- Treasure Chest (Onboarding Reward) ---
export function TreasureChest({ isOpen = false, className = '' }: { isOpen: boolean; className?: string }) {
  return <ModernTreasureChest isOpen={isOpen} className={className} />;
}
