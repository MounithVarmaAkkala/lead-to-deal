import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Lead } from '../types';
import { Flame, AlertTriangle, Users, ChevronRight } from 'lucide-react';
import { bannerSlide, staggerContainerFast, fadeUpItemFast, easeSpring } from '../motion';

interface HotQueueBannerProps {
  hotLeads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onNavigateToReps: () => void;
}

export const HotQueueBanner: React.FC<HotQueueBannerProps> = ({
  hotLeads,
  onSelectLead,
  onNavigateToReps
}) => {
  return (
    <AnimatePresence>
      {hotLeads.length > 0 && (
        <motion.div
          className="hot-banner"
          variants={bannerSlide}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div
            className="hot-banner-inner"
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(220,38,38,0), 0 0 20px rgba(220,38,38,0.08)',
                '0 0 30px 6px rgba(220,38,38,0.12), 0 0 60px rgba(220,38,38,0.06)',
                '0 0 0 0 rgba(220,38,38,0), 0 0 20px rgba(220,38,38,0.08)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <motion.div
                animate={{ rotate: [0, -5, 5, -3, 0] }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 3 }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, rgba(220,38,38,0.1), rgba(220,38,38,0.2))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <AlertTriangle size={20} style={{ color: '#dc2626' }} />
              </motion.div>
              <div>
                <div style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  fontSize: 14,
                  color: 'var(--hot-text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <motion.span
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ display: 'inline-flex' }}
                  >
                    <Flame size={15} />
                  </motion.span>
                  {hotLeads.length} Lead{hotLeads.length > 1 ? 's' : ''} in Hot Queue
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, fontWeight: 500 }}>
                  All active reps are at maximum capacity. These high-score leads need immediate attention.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Show first 3 hot leads */}
              <motion.div
                style={{ display: 'flex', gap: 6 }}
                variants={staggerContainerFast}
                initial="hidden"
                animate="visible"
              >
                {hotLeads.slice(0, 3).map((lead) => (
                  <motion.button
                    key={lead.id}
                    variants={fadeUpItemFast}
                    onClick={() => onSelectLead(lead)}
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      background: 'var(--surface-solid)',
                      border: '1px solid var(--hot-border)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-heading)',
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--ink)',
                      transition: 'all 150ms ease',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#dc2626',
                      background: 'rgba(220,38,38,0.08)',
                      padding: '1px 6px',
                      borderRadius: 'var(--radius-xs)'
                    }}>
                      {lead.current_score}
                    </span>
                    <span>{lead.company_name}</span>
                  </motion.button>
                ))}
              </motion.div>

              <motion.button
                className="button ghost small"
                onClick={onNavigateToReps}
                whileHover={{ scale: 1.04, x: 2 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Users size={13} />
                <span>Manage Capacity</span>
                <motion.span
                  animate={{ x: [0, 3, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ display: 'inline-flex' }}
                >
                  <ChevronRight size={12} />
                </motion.span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
