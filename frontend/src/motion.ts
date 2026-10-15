/**
 * Shared Framer Motion animation variants & helpers
 * Used across all components for consistent, cinematic motion design.
 */

import type { Variants, Transition } from 'framer-motion';

/* ── Ease curves ──────────────────────────────────────────────── */
export const easeOutExpo: Transition['ease'] = [0.16, 1, 0.3, 1];
export const easeOutQuart: Transition['ease'] = [0.25, 1, 0.5, 1];
export const easeSpring: Transition['ease'] = [0.34, 1.56, 0.64, 1];

/* ── Page / View transitions ─────────────────────────────────── */
export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 20, filter: 'blur(6px)' },
  visible: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.5, ease: easeOutExpo },
  },
  exit: {
    opacity: 0, y: -12, filter: 'blur(4px)',
    transition: { duration: 0.25, ease: 'easeInOut' },
  },
};

/* ── Stagger container ────────────────────────────────────────── */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

export const staggerContainerFast: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

/* ── Fade-up item (for stagger children) ──────────────────────── */
export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.45, ease: easeOutExpo },
  },
};

export const fadeUpItemFast: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.3, ease: easeOutExpo },
  },
};

/* ── Scale-in (cards, badges) ─────────────────────────────────── */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1, scale: 1,
    transition: { duration: 0.4, ease: easeSpring },
  },
};

/* ── Slide-in from direction ──────────────────────────────────── */
export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: easeOutExpo } },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: easeOutExpo } },
};

/* ── Modal overlay + content ──────────────────────────────────── */
export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2, delay: 0.1 } },
};

export const modalVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.95, filter: 'blur(4px)' },
  visible: {
    opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
    transition: { duration: 0.4, ease: easeOutExpo, delay: 0.05 },
  },
  exit: {
    opacity: 0, y: 20, scale: 0.97, filter: 'blur(2px)',
    transition: { duration: 0.2, ease: 'easeInOut' },
  },
};

/* ── Row / table row highlight ────────────────────────────────── */
export const rowFlash: Variants = {
  idle: { backgroundColor: 'rgba(16, 185, 129, 0)' },
  flash: {
    backgroundColor: ['rgba(16, 185, 129, 0.12)', 'rgba(16, 185, 129, 0)'],
    transition: { duration: 1.8, ease: 'easeOut' },
  },
};

/* ── Score badge pulse ────────────────────────────────────────── */
export const scorePulse: Variants = {
  idle: { scale: 1, boxShadow: '0 0 0 0 rgba(16,185,129,0)' },
  pulse: {
    scale: [1, 1.18, 1.06, 1],
    boxShadow: [
      '0 0 0 0 rgba(16,185,129,0)',
      '0 0 24px 4px rgba(16,185,129,0.3)',
      '0 0 12px 2px rgba(16,185,129,0.15)',
      '0 0 0 0 rgba(16,185,129,0)',
    ],
    transition: { duration: 1, ease: easeOutExpo },
  },
};

/* ── Hover lift (cards) ───────────────────────────────────────── */
export const hoverLift = {
  rest: { y: 0, boxShadow: 'var(--shadow-sm)' },
  hover: {
    y: -3,
    boxShadow: 'var(--shadow-lg)',
    transition: { duration: 0.25, ease: easeOutExpo },
  },
};

/* ── Hot queue glow animation ─────────────────────────────────── */
export const hotGlow: Variants = {
  glow: {
    boxShadow: [
      '0 0 0 0 rgba(220,38,38,0), var(--shadow-sm)',
      '0 0 24px 4px rgba(220,38,38,0.12), var(--shadow-sm)',
      '0 0 0 0 rgba(220,38,38,0), var(--shadow-sm)',
    ],
    borderColor: [
      'rgba(220,38,38,0.2)',
      'rgba(220,38,38,0.5)',
      'rgba(220,38,38,0.2)',
    ],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
  },
};

/* ── Animated counter (number tween) ──────────────────────────── */
export const counterVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.6, ease: easeOutExpo },
  },
};

/* ── Banner slide down ────────────────────────────────────────── */
export const bannerSlide: Variants = {
  hidden: { opacity: 0, height: 0, marginTop: 0, overflow: 'hidden' },
  visible: {
    opacity: 1, height: 'auto', marginTop: 16,
    transition: { duration: 0.5, ease: easeOutExpo },
  },
  exit: {
    opacity: 0, height: 0, marginTop: 0,
    transition: { duration: 0.3, ease: 'easeInOut' },
  },
};

/* ── Layout transition config (shared) ────────────────────────── */
export const layoutTransition = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 30,
  mass: 0.8,
};
