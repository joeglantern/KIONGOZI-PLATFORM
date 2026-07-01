"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";

// Defer the lottie-web-based player to its own async chunk. It needs `window`,
// so it never renders on the server and stays out of the initial JS payload.
const UseAnimations = dynamic(() => import("react-useanimations"), { ssr: false });

type IconAnimation = ComponentProps<typeof UseAnimations>["animation"];

/**
 * AnimatedIcon — thin wrapper around react-useanimations (MIT license).
 *
 * - SSR-safe: react-useanimations renders via lottie-web (needs `window`), so we
 *   only mount it client-side and reserve the box to avoid layout shift (CLS).
 * - The player is dynamically imported, landing in a separate chunk instead of
 *   the main landing-page bundle.
 * - Accessible: honors `prefers-reduced-motion`. When reduced, the Lottie is
 *   frozen on its first frame (no autoplay, no loop) so users still get a clean
 *   static icon instead of motion.
 */
interface AnimatedIconProps {
  // The imported animation module, e.g. `react-useanimations/lib/activity`.
  animation: IconAnimation;
  size?: number;
  strokeColor?: string;
  loop?: boolean;
  className?: string;
}

export default function AnimatedIcon({
  animation,
  size = 28,
  strokeColor = "#1b2432",
  loop = true,
  className = "",
}: AnimatedIconProps) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Reserve the exact footprint on the server / first paint to prevent CLS.
  if (!mounted) {
    return (
      <span
        className={className}
        style={{ width: size, height: size, display: "inline-block" }}
        aria-hidden="true"
      />
    );
  }

  return (
    <span className={`inline-flex ${className}`} aria-hidden="true">
      <UseAnimations
        animation={animation}
        size={size}
        strokeColor={strokeColor}
        autoplay={!reduce}
        loop={!reduce && loop}
      />
    </span>
  );
}
