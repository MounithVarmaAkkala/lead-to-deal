import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ScoreExplanation } from '../types';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Sliders
} from 'lucide-react';
import {
  staggerContainerFast,
  fadeUpItem,
  easeOutExpo
} from '../motion';

interface ExplanationTimelineProps {
  explanations: ScoreExplanation[];
}

export const ExplanationTimeline: React.FC<ExplanationTimelineProps> = ({
  explanations,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!explanations || explanations.length === 0) {
    return (
      <motion.div
        className="empty-state"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: easeOutExpo }}
      >
        <div className="empty-state-icon">
          <Clock size={24} />
        </div>
        <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink-secondary)' }}>
          No score explanations yet
        </p>
        <p style={{ fontSize: 12, marginTop: 4, color: 'var(--muted)' }}>
          Ingest engagement events to trigger the real-time scoring engine and observe live calculations.
        </p>
      </motion.div>
    );
  }

  const sorted = [...explanations].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <motion.div
      variants={staggerContainerFast}
      initial="hidden"
      animate="visible"
      style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}
    >
      {sorted.map((exp, idx) => {
        const isPositive = exp.delta > 0;
        const isNegative = exp.delta < 0;
        const isLatest = idx === 0;

        const dotColor = isPositive ? 'var(--emerald)' : isNegative ? 'var(--rose)' : 'var(--muted)';
        const DeltaIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
        const hasFeatures = exp.features && Object.keys(exp.features).length > 0;
        const isExpanded = expandedId === exp.id;

        return (
          <motion.div
            key={exp.id || idx}
            variants={fadeUpItem}
            layout
            style={{ display: 'flex', gap: 16, position: 'relative' }}
          >
            {/* Timeline Line + Node */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: 28,
              flexShrink: 0
            }}>
              {/* Dot with pulse for latest */}
              <div style={{ position: 'relative', marginTop: 8 }}>
                {isLatest && (
                  <motion.div
                    animate={{
                      scale: [1, 2.2, 1],
                      opacity: [0.6, 0, 0.6]
                    }}
                    transition={{
                      duration: 2.2,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                    style={{
                      position: 'absolute',
                      inset: -3,
                      borderRadius: '50%',
                      background: dotColor,
                      zIndex: 1,
                      pointerEvents: 'none'
                    }}
                  />
                )}
                <div style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: dotColor,
                  border: '2px solid var(--surface-solid)',
                  boxShadow: `0 0 0 2px ${dotColor}`,
                  position: 'relative',
                  zIndex: 2,
                  transition: 'transform 0.2s ease',
                }} />
              </div>

              {/* Vertical connector line */}
              {idx < sorted.length - 1 && (
                <div style={{
                  width: 2,
                  flex: 1,
                  background: 'var(--line)',
                  minHeight: 28,
                  margin: '4px 0',
                  borderRadius: 1
                }} />
              )}
            </div>

            {/* Content Card with hover elevation */}
            <motion.div
              whileHover={{ y: -2, boxShadow: 'var(--shadow-md)' }}
              transition={{ duration: 0.2 }}
              style={{
                flex: 1,
                marginBottom: 16,
                padding: '16px 20px',
                background: 'var(--surface-solid)',
                border: isLatest ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--line)',
                borderRadius: 'var(--radius-md)',
                boxShadow: isLatest ? '0 0 16px rgba(16, 185, 129, 0.08)' : 'var(--shadow-xs)',
                transition: 'border-color 0.2s ease',
              }}
            >
              {/* Card Header: Delta Badge + Progression + Timestamp */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Delta Badge */}
                  <motion.span
                    whileHover={{ scale: 1.05 }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-full)',
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 800,
                      fontSize: 12,
                      background: isPositive
                        ? 'var(--emerald-bg)'
                        : isNegative
                        ? 'var(--rose-bg)'
                        : 'rgba(15, 26, 54, 0.05)',
                      color: isPositive
                        ? 'var(--emerald)'
                        : isNegative
                        ? 'var(--rose)'
                        : 'var(--muted)',
                      border: isPositive
                        ? '1px solid rgba(16, 185, 129, 0.25)'
                        : isNegative
                        ? '1px solid rgba(220, 38, 38, 0.25)'
                        : '1px solid var(--line)',
                    }}
                  >
                    <DeltaIcon size={13} />
                    <span>{isPositive ? `+${exp.delta}` : exp.delta === 0 ? '±0' : exp.delta} pts</span>
                  </motion.span>

                  {/* Score progression visual */}
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <span style={{ color: 'var(--ink-secondary)' }}>{exp.previous_score}</span>
                    <span style={{ color: 'var(--line-strong)' }}>➔</span>
                    <strong style={{
                      fontWeight: 800,
                      color: exp.new_score >= 70 ? 'var(--blue-500)' : 'var(--ink)'
                    }}>
                      {exp.new_score}
                    </strong>
                  </span>

                  {isLatest && (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: 'var(--emerald)',
                      background: 'var(--emerald-bg)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3
                    }}>
                      <Sparkles size={10} /> Latest Update
                    </span>
                  )}
                </div>

                {/* Timestamp */}
                <span style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 500
                }}>
                  {new Date(exp.created_at).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </span>
              </div>

              {/* Reason description */}
              <p style={{
                fontSize: 13,
                color: 'var(--ink)',
                fontWeight: 500,
                lineHeight: 1.55,
                margin: '0 0 10px 0'
              }}>
                {exp.reason_text}
              </p>

              {/* Feature Inspector toggle & details */}
              {hasFeatures && (
                <div>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : exp.id)}
                    style={{
                      border: 0,
                      background: 'transparent',
                      padding: '4px 0',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--blue-500)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Sliders size={12} />
                    <span>{isExpanded ? 'Hide feature calculation details' : 'View feature calculation details'}</span>
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: easeOutExpo }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{
                          marginTop: 8,
                          padding: '10px 14px',
                          background: 'rgba(15, 26, 54, 0.025)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--line)',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px 20px',
                          fontSize: 11.5,
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--muted)',
                        }}>
                          {exp.features.feature_name && (
                            <div>
                              rule_feature:{' '}
                              <span style={{ color: 'var(--blue-500)', fontWeight: 700 }}>
                                {exp.features.feature_name}
                              </span>
                            </div>
                          )}
                          {exp.features.weight !== undefined && (
                            <div>
                              weight_coefficient:{' '}
                              <span style={{ color: 'var(--ink)', fontWeight: 700 }}>
                                {exp.features.weight}x
                              </span>
                            </div>
                          )}
                          {exp.features.window_hours !== undefined && (
                            <div>
                              decay_window:{' '}
                              <span style={{ color: 'var(--ink)', fontWeight: 700 }}>
                                {exp.features.window_hours} hrs
                              </span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default ExplanationTimeline;
