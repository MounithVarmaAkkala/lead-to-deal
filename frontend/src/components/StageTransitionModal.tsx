import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Lead } from '../types';
import { AlertCircle, X, ShieldAlert, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { overlayVariants, modalVariants } from '../motion';

interface StageTransitionModalProps {
  lead: Lead | null;
  targetStage: string | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (leadId: string, toStage: string, confirmed: boolean, reason: string) => Promise<void>;
}

export const StageTransitionModal: React.FC<StageTransitionModalProps> = ({
  lead,
  targetStage,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !lead || !targetStage) return null;

  const STAGE_ORDER = [
    'New', 'Engaged', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed-Won', 'Closed-Lost'
  ];
  const currentIdx = STAGE_ORDER.indexOf(lead.stage);
  const targetIdx = STAGE_ORDER.indexOf(targetStage);
  const isBackward = targetIdx < currentIdx;
  const isClosed = targetStage === 'Closed-Won' || targetStage === 'Closed-Lost';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acknowledged) {
      setErrorMsg('You must check the confirmation box to proceed with this transition.');
      return;
    }
    if (!reason.trim()) {
      setErrorMsg('Please specify a rationale or reason for this change.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      await onConfirm(lead.id, targetStage, true, reason);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.detail?.message || 'Transition failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="transition-backdrop"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11, 20, 38, 0.72)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16
          }}
        >
          <motion.div
            key="transition-modal"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="hud-card"
            style={{
              width: '100%',
              maxWidth: 540,
              background: 'var(--surface-solid)',
              borderRadius: 'var(--radius-l)',
              boxShadow: 'var(--shadow-float)',
              overflow: 'hidden',
              border: '1px solid var(--line)'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--surface)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <motion.div
                  animate={{
                    boxShadow: [
                      '0 0 0 0 rgba(218, 41, 28, 0.3)',
                      '0 0 0 8px rgba(218, 41, 28, 0)',
                    ],
                  }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: isClosed && targetStage === 'Closed-Won' ? '#d1fae5' : 'rgba(218, 41, 28, 0.12)',
                    color: isClosed && targetStage === 'Closed-Won' ? '#047857' : '#da291c',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <ShieldAlert size={20} />
                </motion.div>
                <div>
                  <h3 style={{ fontSize: 17, margin: 0, letterSpacing: '-0.02em' }}>
                    Confirm Stage Transition (US-03)
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    Manual human confirmation required for backward or terminal transitions
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ rotate: 90, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="button ghost small"
                style={{ padding: '0 8px', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Close (Esc)"
              >
                <X size={16} />
              </motion.button>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              {/* Transition details pill */}
              <div style={{
                background: 'var(--navy-06)',
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid var(--line)'
              }}>
                <div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Current Stage
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)', marginTop: 2 }}>
                    {lead.stage}
                  </div>
                </div>

                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <ArrowRight size={20} style={{ color: 'var(--blue)' }} />
                </motion.div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Target Stage
                  </div>
                  <div style={{
                    fontWeight: 900,
                    fontSize: 15,
                    color: targetStage === 'Closed-Won' ? 'var(--emerald)' : (targetStage === 'Closed-Lost' ? 'var(--rose)' : 'var(--blue-500)'),
                    marginTop: 2
                  }}>
                    {targetStage}
                  </div>
                </div>
              </div>

              <div style={{
                fontSize: 13,
                color: 'var(--ink-secondary)',
                marginBottom: 18,
                lineHeight: 1.55,
                background: 'rgba(15, 26, 54, 0.02)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--line)'
              }}>
                {isClosed ? (
                  <span>
                    Moving <strong>{lead.company_name}</strong> to <strong>{targetStage}</strong> archives this opportunity and frees up assigned sales rep capacity, automatically triggering round-robin reassignment for any waiting hot-queue leads.
                  </span>
                ) : (
                  <span>
                    Moving <strong>{lead.company_name}</strong> backward ({isBackward ? 'regressing stage' : 'stage adjustment'}) from <strong>{lead.stage}</strong> to <strong>{targetStage}</strong> requires human verification to prevent pipeline metric corruption.
                  </span>
                )}
              </div>

              {/* Rationale Input */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                  Transition Reason / Customer Rationale <span style={{ color: 'var(--rose)' }}>*</span>
                </label>
                <textarea
                  className="swiss-input"
                  rows={3}
                  style={{ height: 'auto', padding: '10px 14px', resize: 'vertical', fontSize: 13 }}
                  placeholder={isClosed && targetStage === 'Closed-Won' ? "e.g. Master Services Agreement finalized for $120k ARR" : "e.g. Prospect requested delayed procurement cycle to Q4"}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>

              {/* Confirmation Checkbox */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                marginBottom: 20,
                padding: '12px 14px',
                background: acknowledged ? 'var(--blue-soft)' : 'var(--navy-06)',
                borderRadius: 'var(--radius-sm)',
                border: acknowledged ? '1px solid rgba(0, 113, 227, 0.3)' : '1px solid var(--line)',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="checkbox"
                  id="confirm-ack"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  style={{ marginTop: 2, cursor: 'pointer', accentColor: 'var(--blue)', width: 16, height: 16 }}
                />
                <label htmlFor="confirm-ack" style={{ fontSize: 12.5, color: 'var(--ink)', cursor: 'pointer', lineHeight: 1.45 }}>
                  <strong>I explicitly confirm this transition.</strong> I understand this creates an immutable pipeline transition audit entry with my operator identity.
                </label>
              </div>

              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    background: '#fee2e2',
                    color: '#b91c1c',
                    borderRadius: 8,
                    fontSize: 12,
                    marginBottom: 16,
                    fontWeight: 600
                  }}
                >
                  <AlertCircle size={15} />
                  <span>{errorMsg}</span>
                </motion.div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  className="button ghost small"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="button primary small"
                  disabled={loading || !acknowledged}
                  style={{
                    background: targetStage === 'Closed-Won' ? 'var(--emerald)' : (targetStage === 'Closed-Lost' ? 'var(--rose)' : 'var(--blue)'),
                    fontWeight: 700,
                    padding: '8px 18px'
                  }}
                >
                  {loading ? 'Processing...' : `Confirm Move to ${targetStage}`}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StageTransitionModal;
