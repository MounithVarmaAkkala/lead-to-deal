import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LeadDetail, Lead } from '../types';
import { api } from '../api';
import { ExplanationTimeline } from './ExplanationTimeline';
import {
  X,
  Building2,
  User,
  Flame,
  Zap,
  History,
  ShieldCheck,
  Radio,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Mail,
  Calendar,
  FileSpreadsheet
} from 'lucide-react';
import {
  overlayVariants,
  modalVariants,
  staggerContainerFast,
  fadeUpItem,
  easeOutExpo
} from '../motion';

interface LeadDetailModalProps {
  leadId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onQuickSimulate: (lead: Lead, eventType: string, payload?: any) => Promise<void>;
  onTriggerTransition: (lead: Lead) => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  leadId,
  isOpen,
  onClose,
  onQuickSimulate,
  onTriggerTransition,
}) => {
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'explanations' | 'transitions' | 'assignments' | 'events'>('explanations');
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    if (isOpen && leadId) {
      loadDetail(leadId);
    } else {
      setDetail(null);
    }
  }, [isOpen, leadId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const loadDetail = async (id: string) => {
    try {
      setLoading(true);
      const data = await api.getLeadDetail(id);
      setDetail(data);
    } catch (err) {
      console.error('Failed to load lead detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async (eventType: string, payload: any = {}) => {
    if (!detail) return;
    try {
      setSimulating(true);
      await onQuickSimulate(detail, eventType, payload);
      await loadDetail(detail.id);
    } finally {
      setSimulating(false);
    }
  };

  const tabs = [
    { id: 'explanations', label: 'Score Explanations', icon: ShieldCheck, count: detail?.explanations?.length },
    { id: 'transitions', label: 'Stage Transitions', icon: History, count: detail?.transitions?.length },
    { id: 'assignments', label: 'Assignments', icon: User, count: detail?.assignments?.length },
    { id: 'events', label: 'Raw Ingested Events', icon: Radio, count: detail?.events?.length },
  ] as const;

  return (
    <AnimatePresence>
      {isOpen && leadId && (
        <motion.div
          key="lead-detail-backdrop"
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
            zIndex: 90,
            padding: 16
          }}
        >
          <motion.div
            key="lead-detail-modal"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="hud-card"
            style={{
              width: '100%',
              maxWidth: 900,
              maxHeight: '92vh',
              background: 'var(--surface-solid)',
              borderRadius: 'var(--radius-l)',
              boxShadow: 'var(--shadow-float)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid var(--line)'
            }}
          >
            {/* Modal Top Bar */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--surface)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <motion.div
                  whileHover={{ scale: 1.08, rotate: -3 }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'var(--blue-soft)',
                    color: 'var(--blue)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0, 113, 227, 0.15)'
                  }}
                >
                  <Building2 size={22} />
                </motion.div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: 19, letterSpacing: '-0.02em', margin: 0 }}>
                      {detail?.company_name || 'Loading details...'}
                    </h3>
                    {detail?.is_hot_queue && (
                      <motion.span
                        animate={{
                          boxShadow: [
                            '0 0 0 0 rgba(220, 38, 38, 0.3)',
                            '0 0 0 6px rgba(220, 38, 38, 0)',
                          ],
                        }}
                        transition={{ duration: 1.6, repeat: Infinity }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          background: 'rgba(218, 41, 28, 0.15)',
                          color: '#da291c',
                          padding: '3px 9px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 800,
                          border: '1px solid rgba(218, 41, 28, 0.3)'
                        }}
                      >
                        <Flame size={12} /> HOT QUEUE
                      </motion.span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>
                    {detail?.contact_name} • <span style={{ fontFamily: 'var(--font-mono)' }}>{detail?.contact_email}</span> • {detail?.company_size} Employees
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {detail && (
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="button ghost small"
                    onClick={() => onTriggerTransition(detail)}
                    style={{ fontWeight: 700 }}
                  >
                    Change Stage
                  </motion.button>
                )}
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
            </div>

            {/* Lead Metrics Header Card */}
            {detail && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: easeOutExpo }}
                style={{
                  padding: '16px 24px',
                  background: 'var(--navy-06)',
                  borderBottom: '1px solid var(--line)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: 16
                }}
              >
                <div>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Current Score
                  </span>
                  <div style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 26,
                    fontWeight: 900,
                    color: detail.current_score >= 70 ? 'var(--blue-500)' : 'var(--ink)',
                    lineHeight: 1.2,
                    marginTop: 2,
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 4
                  }}>
                    {detail.current_score}
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                      / 100
                    </span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Priority Index
                  </span>
                  <div style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 22,
                    fontWeight: 800,
                    color: 'var(--ink)',
                    lineHeight: 1.2,
                    marginTop: 2
                  }}>
                    {detail.priority_score.toFixed(1)}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Pipeline Stage
                  </span>
                  <div style={{
                    fontWeight: 800,
                    fontSize: 15,
                    color: 'var(--ink)',
                    marginTop: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: detail.stage === 'Closed-Won' ? 'var(--emerald)' : (detail.stage === 'Closed-Lost' ? 'var(--rose)' : 'var(--blue-500)')
                    }} />
                    {detail.stage}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Assigned Sales Rep
                  </span>
                  <div style={{
                    fontWeight: 700,
                    fontSize: 13,
                    color: detail.is_hot_queue ? '#da291c' : 'var(--ink)',
                    marginTop: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    {detail.is_hot_queue ? <Flame size={14} /> : <User size={14} />}
                    <span>{detail.is_hot_queue ? 'Hot Queue (At Rep Capacity)' : (detail.assignee_name || 'Unassigned')}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Quick Simulator Bar directly on Lead */}
            {detail && (
              <div style={{
                padding: '12px 24px',
                background: 'var(--surface)',
                borderBottom: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12
              }}>
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <Zap size={15} style={{ color: 'var(--blue)' }} />
                  Inject Lead Activity:
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="button ghost small"
                    disabled={simulating}
                    onClick={() => handleSimulate('email_open', { subject: 'Swiss Platform Architecture' })}
                  >
                    <Mail size={12} />
                    <span>+5 Email Open</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="button ghost small"
                    disabled={simulating}
                    onClick={() => handleSimulate('pricing_page_visit', { url: '/pricing', dwell_sec: 140 })}
                  >
                    <FileSpreadsheet size={12} />
                    <span>+15 Pricing Visit</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="button ghost small"
                    disabled={simulating}
                    onClick={() => handleSimulate('form_submission', { form: 'Contact Enterprise Sales' })}
                  >
                    <Sparkles size={12} />
                    <span>+20 Form Submit</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: 'var(--shadow-blue)' }}
                    whileTap={{ scale: 0.95 }}
                    className="button primary small"
                    disabled={simulating}
                    onClick={() => handleSimulate('meeting_booked', { calendar: 'Executive Demo with VP' })}
                  >
                    <Calendar size={12} />
                    <span>+35 Meeting Booked</span>
                  </motion.button>
                </div>
              </div>
            )}

            {/* Navigation Tabs with smooth animated indicator pill */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid var(--line)',
              background: 'var(--navy-06)',
              padding: '0 24px',
              position: 'relative'
            }}>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      padding: '12px 18px',
                      border: 0,
                      background: 'transparent',
                      fontFamily: 'var(--font-heading)',
                      fontWeight: isActive ? 800 : 600,
                      fontSize: 13,
                      color: isActive ? 'var(--blue-500)' : 'var(--muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      position: 'relative',
                      transition: 'color 0.2s ease',
                      outline: 'none'
                    }}
                  >
                    <Icon size={15} />
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span style={{
                        fontSize: 11,
                        padding: '1px 6px',
                        borderRadius: 10,
                        background: isActive ? 'var(--blue-soft)' : 'rgba(15, 26, 54, 0.05)',
                        color: isActive ? 'var(--blue-500)' : 'var(--muted)',
                        fontWeight: 700
                      }}>
                        {tab.count}
                      </span>
                    )}

                    {isActive && (
                      <motion.div
                        layoutId="activeTabUnderline"
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: 2,
                          background: 'var(--blue)',
                          borderRadius: '2px 2px 0 0'
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Modal Scrollable Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{ display: 'inline-block', marginBottom: 12 }}
                  >
                    <Radio size={24} style={{ color: 'var(--blue)' }} />
                  </motion.div>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>Loading lead details & audit records...</p>
                </div>
              ) : detail ? (
                <AnimatePresence mode="wait">
                  {activeTab === 'explanations' && (
                    <motion.div
                      key="tab-explanations"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div style={{ marginBottom: 16 }}>
                        <h4 style={{ fontSize: 15, margin: 0 }}>Immutable Score Explanation Timeline (US-05)</h4>
                        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                          Reverse-chronological log of every rule calculation, weight delta, and contextual justification
                        </p>
                      </div>
                      <ExplanationTimeline explanations={detail.explanations || []} />
                    </motion.div>
                  )}

                  {activeTab === 'transitions' && (
                    <motion.div
                      key="tab-transitions"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                    >
                      <div style={{ marginBottom: 8 }}>
                        <h4 style={{ fontSize: 15, margin: 0 }}>Pipeline Stage Progression Audit</h4>
                        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                          Tracks automatic forward advances and human-confirmed backward/terminal moves
                        </p>
                      </div>
                      {detail.transitions.length === 0 ? (
                        <div className="empty-state">
                          <p style={{ color: 'var(--muted)', fontSize: 13 }}>No stage transitions recorded yet.</p>
                        </div>
                      ) : (
                        <motion.div
                          variants={staggerContainerFast}
                          initial="hidden"
                          animate="visible"
                          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                        >
                          {detail.transitions.map((tr) => (
                            <motion.div
                              key={tr.id}
                              variants={fadeUpItem}
                              whileHover={{ y: -2 }}
                              style={{
                                padding: '14px 18px',
                                border: '1px solid var(--line)',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--surface-solid)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                boxShadow: 'var(--shadow-xs)'
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span>{tr.from_stage}</span>
                                  <ArrowRight size={14} style={{ color: 'var(--blue)' }} />
                                  <span style={{ color: 'var(--blue-500)' }}>{tr.to_stage}</span>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--ink-secondary)', marginTop: 4 }}>
                                  Reason: {tr.reason || 'Threshold met'}
                                </div>
                                {tr.confirmed_by && (
                                  <div style={{ fontSize: 11, color: 'var(--emerald)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <CheckCircle2 size={12} />
                                    <span>Human confirmation verified: {tr.confirmed_by} (US-03)</span>
                                  </div>
                                )}
                              </div>
                              <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                                {new Date(tr.created_at).toLocaleString()}
                              </span>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'assignments' && (
                    <motion.div
                      key="tab-assignments"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                    >
                      <div style={{ marginBottom: 8 }}>
                        <h4 style={{ fontSize: 15, margin: 0 }}>Round-Robin &amp; Capacity Assignment Log</h4>
                        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                          Full history of owner allocation, hot queue entries, and automatic reassignments
                        </p>
                      </div>
                      {detail.assignments.length === 0 ? (
                        <div className="empty-state">
                          <p style={{ color: 'var(--muted)', fontSize: 13 }}>No assignment history recorded.</p>
                        </div>
                      ) : (
                        <motion.div
                          variants={staggerContainerFast}
                          initial="hidden"
                          animate="visible"
                          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                        >
                          {detail.assignments.map((asg) => (
                            <motion.div
                              key={asg.id}
                              variants={fadeUpItem}
                              whileHover={{ y: -2 }}
                              style={{
                                padding: '14px 18px',
                                border: '1px solid var(--line)',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--surface-solid)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                boxShadow: 'var(--shadow-xs)'
                              }}
                            >
                              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>
                                {asg.reason}
                              </div>
                              <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                                {new Date(asg.created_at).toLocaleString()}
                              </span>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'events' && (
                    <motion.div
                      key="tab-events"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                    >
                      <div style={{ marginBottom: 8 }}>
                        <h4 style={{ fontSize: 15, margin: 0 }}>Idempotent Ingestion Log</h4>
                        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                          Exact incoming events ingested via API or Webhook with unique deduplication IDs
                        </p>
                      </div>
                      {detail.events.length === 0 ? (
                        <div className="empty-state">
                          <p style={{ color: 'var(--muted)', fontSize: 13 }}>No raw events stored for this lead.</p>
                        </div>
                      ) : (
                        <motion.div
                          variants={staggerContainerFast}
                          initial="hidden"
                          animate="visible"
                          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                        >
                          {detail.events.map((evt) => (
                            <motion.div
                              key={evt.id}
                              variants={fadeUpItem}
                              style={{
                                padding: '14px 18px',
                                border: '1px solid var(--line)',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--surface-solid)',
                                boxShadow: 'var(--shadow-xs)'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{
                                  fontWeight: 800,
                                  fontSize: 13,
                                  color: 'var(--blue-500)',
                                  background: 'var(--blue-soft)',
                                  padding: '2px 8px',
                                  borderRadius: 6
                                }}>
                                  {evt.event_type}
                                </span>
                                <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                                  {new Date(evt.received_at).toLocaleString()}
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
                                Event ID: <code style={{ color: 'var(--ink)' }}>{evt.event_id}</code>
                              </div>
                              {evt.payload && Object.keys(evt.payload).length > 0 && (
                                <pre style={{
                                  marginTop: 10,
                                  padding: '10px 14px',
                                  background: 'var(--navy-06)',
                                  borderRadius: 8,
                                  fontSize: 11,
                                  fontFamily: 'JetBrains Mono, monospace',
                                  overflowX: 'auto',
                                  border: '1px solid var(--line)'
                                }}>
                                  {JSON.stringify(evt.payload, null, 2)}
                                </pre>
                              )}
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LeadDetailModal;
