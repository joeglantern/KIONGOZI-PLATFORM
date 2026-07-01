"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";

// Defer the player library to its own async chunk. It needs the DOM/canvas, so
// it never runs on the server — keeping it out of the initial JS payload.
const DotLottieReact = dynamic(
  () => import("@lottiefiles/dotlottie-react").then((m) => m.DotLottieReact),
  { ssr: false }
);

/**
 * LottieScene — reduced-motion-aware dotLottie player.
 *
 * - Loads Lottie JSON from /public at runtime via `src` (not bundled).
 * - The player library is dynamically imported, so it lands in a separate chunk
 *   instead of the main landing-page bundle.
 * - Viewport-gated: below-the-fold scenes only mount their player once scrolled
 *   near, so the page doesn't spin up several Lottie players on first paint.
 *   Pass `eager` for above-the-fold scenes (e.g. the hero mascot).
 * - SSR-safe: the wrapper <div> reserves the box on the server; the player
 *   mounts client-side only.
 * - Accessible: honors `prefers-reduced-motion` by not autoplaying or looping,
 *   leaving a clean static first frame instead of motion.
 */
interface LottieSceneProps {
  src: string;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
  ariaLabel?: string;
  /** Load immediately instead of waiting for the viewport (above-the-fold use). */
  eager?: boolean;
}

export default function LottieScene({
  src,
  className = "",
  loop = true,
  autoplay = true,
  ariaLabel,
  eager = false,
}: LottieSceneProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(eager);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div
      ref={ref}
      className={className}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {visible && (
        <DotLottieReact
          src={src}
          loop={!reduce && loop}
          autoplay={!reduce && autoplay}
          style={{ width: "100%", height: "100%" }}
        />
      )}
    </div>
  );
}
