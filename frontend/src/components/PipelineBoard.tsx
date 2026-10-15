import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Lead } from '../types';
import {
  Flame,
  User,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Plus,
  TrendingUp
} from 'lucide-react';
import { StageTransitionModal } from './StageTransitionModal';
import { pageVariants, staggerContainer, fadeUpItem, easeOutExpo } from '../motion';

interface PipelineBoardProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onTransitionStage: (leadId: string, toStage: string, confirmed: boolean, reason?: string) => Promise<void>;
  onNewLeadClick: () => void;
}

const STAGES = [
  'New',
  'Engaged',
  'Contacted',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Closed-Won',
  'Closed-Lost'
];

const STAGE_META: Record<string, { color: string; gradient: string }> = {
  'New':         { color: '#6b7280', gradient: 'linear-gradient(135deg, #6b7280, #9ca3af)' },
  'Engaged':     { color: '#0ea5e9', gradient: 'linear-gradient(135deg, #0284c7, #38bdf8)' },
  'Contacted':   { color: '#f59e0b', gradient: 'linear-gradient(135deg, #d97706, #fbbf24)' },
  'Qualified':   { color: '#3b82f6', gradient: 'linear-gradient(135deg, #2563eb, #60a5fa)' },
  'Proposal':    { color: '#a855f7', gradient: 'linear-gradient(135deg, #7c3aed, #c084fc)' },
  'Negotiation': { color: '#8b5cf6', gradient: 'linear-gradient(135deg, #6d28d9, #a78bfa)' },
  'Closed-Won':  { color: '#10b981', gradient: 'linear-gradient(135deg, #059669, #34d399)' },
  'Closed-Lost': { color: '#f43f5e', gradient: 'linear-gradient(135deg, #e11d48, #fb7185)' },
};

export const PipelineBoard: React.FC<PipelineBoardProps> = ({
  leads,
  onSelectLead,
  onTransitionStage,
  onNewLeadClick
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [pendingTargetStage, setPendingTargetStage] = useState<string | null>(null);

  const handleStageMove = async (lead: Lead, toStage: string) => {
    const currentIdx = STAGES.indexOf(lead.stage);
    const targetIdx = STAGES.indexOf(toStage);
    const isBackward = targetIdx < currentIdx;
    const isClosed = toStage === 'Closed-Won' || toStage === 'Closed-Lost';

    if (isBackward || isClosed) {
      setSelectedLead(lead);
      setPendingTargetStage(toStage);
      setModalOpen(true);
    } else {
      await onTransitionStage(lead.id, toStage, false);
    }
  };

  return (
    <motion.div
      className="pipeline-container"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Top Action Row */}
      <motion.div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20
        }}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easeOutExpo }}
      >
        <div>
          <h2 style={{ fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <motion.span
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              style={{ display: 'inline-flex' }}
            >
              <TrendingUp size={20} style={{ color: 'var(--blue-500)' }} />
            </motion.span>
            Pipeline Velocity
          </h2>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            Real-time stage transitions driven by score thresholds and confirmed closures
          </p>
        </div>
        <motion.button
          className="button primary small"
          onClick={onNewLeadClick}
          whileHover={{ scale: 1.05, y: -1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus size={14} />
          <span>New Lead</span>
        </motion.button>
      </motion.div>

      {/* Kanban Columns */}
      <motion.div
        className="pipeline-columns"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {STAGES.map((stage, idx) => {
          const stageLeads = leads.filter((l) => l.stage === stage);
          const totalScore = stageLeads.reduce((acc, l) => acc + l.current_score, 0);
          const meta = STAGE_META[stage];

          return (
            <motion.div
              key={stage}
              className="pipeline-column"
              variants={fadeUpItem}
              whileHover={{ borderColor: 'var(--line-strong)', y: -2 }}
              transition={{ duration: 0.25 }}
            >
              {/* Column Header */}
              <div className="pipeline-column-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <motion.div
                    className="pipeline-stage-indicator"
                    style={{ background: meta.gradient }}
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: idx * 0.3, ease: 'easeInOut' }}
                  />
                  <span style={{
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 800,
                    fontSize: 12.5,
                    color: 'var(--ink)',
                    letterSpacing: '-0.01em'
                  }}>
                    {stage}
                  </span>
                  <motion.span
                    key={stageLeads.length}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      color: 'var(--muted)',
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: 'var(--font-heading)',
                      padding: '1px 7px',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    {stageLeads.length}
                  </motion.span>
                </div>
                <span style={{
                  fontSize: 10,
                  color: 'var(--muted)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 500
                }}>
                  avg {stageLeads.length > 0 ? Math.round(totalScore / stageLeads.length) : 0}
                </span>
              </div>

              {/* Stage Progress Bar */}
              <div style={{
                height: 3,
                background: 'var(--line)',
                borderRadius: 2,
                marginBottom: 14,
                overflow: 'hidden'
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, stageLeads.length * 14)}%` }}
                  transition={{ duration: 0.8, ease: easeOutExpo, delay: idx * 0.08 }}
                  style={{
                    height: '100%',
                    background: meta.gradient,
                    borderRadius: 2,
                  }}
                />
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                {stageLeads.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    style={{
                      textAlign: 'center',
                      padding: '40px 12px',
                      color: 'var(--muted)',
                      fontSize: 11,
                      border: '1px dashed var(--line)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--surface)',
                      fontWeight: 500
                    }}
                  >
                    No leads in this stage
                  </motion.div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {stageLeads.map((lead) => (
                      <motion.div
                        key={lead.id}
                        className={`pipeline-card ${lead.is_hot_queue ? 'is-hot' : ''}`}
                        layout
                        initial={{ opacity: 0, scale: 0.92, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: -10 }}
                        whileHover={{ y: -2, boxShadow: 'var(--shadow-md)', borderColor: 'var(--line-strong)' }}
                        transition={{
                          layout: { type: 'spring', stiffness: 350, damping: 30 },
                          opacity: { duration: 0.3 },
                        }}
                      >
                        {/* Company + Score */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 8
                        }}>
                          <div
                            onClick={() => onSelectLead(lead)}
                            style={{ cursor: 'pointer', flex: 1, minWidth: 0 }}
                          >
                            <div style={{
                              fontFamily: 'var(--font-heading)',
                              fontWeight: 700,
                              fontSize: 12.5,
                              color: 'var(--ink)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              overflow: 'hidden'
                            }}>
                              <span style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {lead.company_name}
                              </span>
                              {lead.is_hot_queue && (
                                <motion.span
                                  animate={{ scale: [1, 1.15, 1] }}
                                  transition={{ duration: 1.5, repeat: Infinity }}
                                >
                                  <Flame size={11} style={{ color: '#dc2626', flexShrink: 0 }} />
                                </motion.span>
                              )}
                            </div>
                            <div style={{
                              fontSize: 11,
                              color: 'var(--muted)',
                              marginTop: 2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {lead.contact_name}
                            </div>
                          </div>

                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            style={{
                              fontFamily: 'var(--font-heading)',
                              fontWeight: 800,
                              fontSize: 12,
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-xs)',
                              background: lead.current_score >= 70
                                ? 'rgba(26,102,220,0.08)'
                                : 'rgba(15,26,54,0.04)',
                              color: lead.current_score >= 70
                                ? 'var(--blue-500)'
                                : 'var(--ink-secondary)',
                              flexShrink: 0
                            }}
                          >
                            {lead.current_score}
                          </motion.div>
                        </div>

                        {/* Mini score bar */}
                        <div style={{
                          height: 2,
                          background: 'var(--line)',
                          borderRadius: 1,
                          marginTop: 10,
                          overflow: 'hidden'
                        }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, lead.current_score)}%` }}
                            transition={{ duration: 0.7, ease: easeOutExpo }}
                            style={{
                              height: '100%',
                              background: meta.gradient,
                              borderRadius: 1,
                            }}
                          />
                        </div>

                        {/* Bottom: Rep + Controls */}
                        <div style={{
                          marginTop: 10,
                          paddingTop: 10,
                          borderTop: '1px solid var(--line)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: 10
                        }}>
                          <div style={{
                            color: lead.is_hot_queue ? 'var(--hot-text)' : 'var(--muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontWeight: 600,
                            fontFamily: 'var(--font-heading)'
                          }}>
                            {lead.is_hot_queue ? <Flame size={11} /> : <User size={11} />}
                            <span>
                              {lead.is_hot_queue
                                ? 'Hot Queue'
                                : (lead.assignee_name?.split(' ')[0] || 'Unassigned')
                              }
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {idx > 0 && (
                              <motion.button
                                onClick={() => handleStageMove(lead, STAGES[idx - 1])}
                                title={`Move to ${STAGES[idx - 1]}`}
                                whileHover={{ scale: 1.2, backgroundColor: 'var(--surface)' }}
                                whileTap={{ scale: 0.9 }}
                                style={{
                                  border: 0,
                                  background: 'transparent',
                                  cursor: 'pointer',
                                  padding: 3,
                                  borderRadius: 'var(--radius-xs)',
                                  color: 'var(--muted)',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <ChevronLeft size={13} />
                              </motion.button>
                            )}

                            {idx < STAGES.length - 2 && (
                              <motion.button
                                onClick={() => handleStageMove(lead, STAGES[idx + 1])}
                                title={`Advance to ${STAGES[idx + 1]}`}
                                whileHover={{ scale: 1.2, backgroundColor: 'rgba(26,102,220,0.06)' }}
                                whileTap={{ scale: 0.9 }}
                                style={{
                                  border: 0,
                                  background: 'transparent',
                                  cursor: 'pointer',
                                  padding: 3,
                                  borderRadius: 'var(--radius-xs)',
                                  color: 'var(--blue-500)',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <ChevronRight size={13} />
                              </motion.button>
                            )}

                            {stage !== 'Closed-Won' && stage !== 'Closed-Lost' && (
                              <>
                                <motion.button
                                  onClick={() => handleStageMove(lead, 'Closed-Won')}
                                  title="Close Won"
                                  whileHover={{ scale: 1.25 }}
                                  whileTap={{ scale: 0.9 }}
                                  style={{
                                    border: 0,
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    padding: 3,
                                    borderRadius: 'var(--radius-xs)',
                                    color: 'var(--emerald)',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  <CheckCircle2 size={12} />
                                </motion.button>
                                <motion.button
                                  onClick={() => handleStageMove(lead, 'Closed-Lost')}
                                  title="Close Lost"
                                  whileHover={{ scale: 1.25 }}
                                  whileTap={{ scale: 0.9 }}
                                  style={{
                                    border: 0,
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    padding: 3,
                                    borderRadius: 'var(--radius-xs)',
                                    color: 'var(--rose)',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  <XCircle size={12} />
                                </motion.button>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <StageTransitionModal
        isOpen={modalOpen}
        lead={selectedLead}
        targetStage={pendingTargetStage}
        onClose={() => setModalOpen(false)}
        onConfirm={onTransitionStage}
      />
    </motion.div>
  );
};
