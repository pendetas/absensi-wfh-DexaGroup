import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

/** With reduced motion every tween jumps to its end, so state changes stay correct but still. */
function applyMotionPreference() {
  gsap.globalTimeline.timeScale(reducedMotionQuery.matches ? 1000 : 1);
}
applyMotionPreference();
reducedMotionQuery.addEventListener('change', applyMotionPreference);

/** Durations and easing shared by every animation, so both apps move the same way. */
export const MOTION = {
  hover: 0.18,
  enter: 0.45,
  stagger: 0.05,
  ease: 'power3.out',
} as const;

export { gsap, ScrollTrigger, useGSAP };
