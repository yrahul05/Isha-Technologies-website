'use client';

import { MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Client boundary for Framer Motion's `MotionConfig`, so page templates can
 * stay Server Components (keeping their data modules out of the client
 * bundle) while every animated child still honors prefers-reduced-motion.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
