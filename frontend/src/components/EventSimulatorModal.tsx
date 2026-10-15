import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Lead } from '../types';
import { api } from '../api';
import { Zap, Play, Pause, X, Radio, Terminal, Sparkles, CheckCircle2 } from 'lucide-react';
import { overlayVariants, modalVariants } from '../motion';

interface EventSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  onEventSent: () => void;
}

export const EventSimulatorModal: React.FC<EventSimulatorModalProps> = ({
  isOpen,
  onClose,
  leads,
  onEventSent,
}) => {
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [eventType, setEventType] = useState('meeting_booked');
  const [isAutoStreaming, setIsAutoStreaming] = useState(false);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const streamTimerRef = useRef<any>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (leads.length > 0 && !selectedLeadId) {
      setSelectedLeadId(leads[0].id);
    }
  }, [leads]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isAutoStreaming) {
      streamTimerRef.current = setInterval(() => {
        fireRandomEvent();
      }, 3000);
    } else {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    }
    return () => {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    };
  }, [isAutoStreaming, leads]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logMessages]);

  const fireRandomEvent = async () => {
    if (leads.length === 0) return;
    const randomLead = leads[Math.floor(Math.random() * leads.length)];
    const eventTypes = [
      { type: 'email_open', label: 'Email Open (+5)', payload: { subject: 'Automated Pilot Pitch' } },
      { type: 'pricing_page_visit', label: 'Pricing Visit (+15)', payload: { url: '/pricing', duration: 120 } },
      { type: 'form_submission', label: 'Form Submission (+20)', payload: { form: 'Request Technical Review' } },
      { type: 'meeting_booked', label: 'Meeting Booked (+35)', payload: { title: 'Executive Demo with Head of Sales' } },
      { type: 'call_logged', label: 'Call Logged (+15)', payload: { outcome: 'Connected with decision maker' } }
    ];
    const picked = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    const eventId = `sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    try {
      const res = await api.ingestEvent({
        event_id: eventId,
        lead_id: randomLead.id,
        event_type: picked.type,
        payload: picked.payload
      });
      addLog(`[STREAM] ${randomLead.company_name} ➔ ${picked.type} (${res.message || 'OK'})`);
      onEventSent();
    } catch (err) {
      addLog(`[STREAM ERROR] Ingestion failed`);
    }
  };

  const handleManualSend = async () => {
    if (!selectedLeadId) return;
    const lead = leads.find(l => l.id === selectedLeadId);
    if (!lead) return;

    try {
      setSending(true);
      const eventId = `manual_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const payload: any = {};
      if (eventType === 'pricing_page_visit') payload.url = '/pricing';
      if (eventType === 'meeting_booked') payload.meeting = 'Enterprise Discovery Call';

      const res = await api.ingestEvent({
        event_id: eventId,
        lead_id: lead.id,
        event_type: eventType,
        payload
      });
      addLog(`[MANUAL] Ingested '${eventType}' for ${lead.company_name} (${res.message || 'OK'})`);
      onEventSent();
    } catch (err) {
      addLog(`[ERROR] Manual ingestion failed`);
    } finally {
      setSending(false);
    }
  };

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogMessages(prev => [...prev.slice(-40), `[${time}] ${msg}`]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="simulator-backdrop"
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
            key="simulator-modal"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="hud-card"
            style={{
              width: '100%',
              maxWidth: 720,
              background: 'var(--surface-solid)',
              borderRadius: 'var(--radius-l)',
              boxShadow: 'var(--shadow-float)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '92vh',
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
                  whileHover={{ scale: 1.1, rotate: 10 }}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: 'var(--blue-soft)',
                    color: 'var(--blue)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Zap size={20} />
                </motion.div>
                <div>
                  <h3 style={{ fontSize: 17, margin: 0, letterSpacing: '-0.02em' }}>Autonomous Event Simulator</h3>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    Ingest real-time engagement events to observe instant scoring, stage transitions, and WebSocket broadcasts
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

            {/* Body */}
            <div style={{ padding: '24px', overflowY: 'auto' }}>
              {/* Auto Simulator Banner */}
              <motion.div
                animate={{
                  borderColor: isAutoStreaming ? 'rgba(16, 185, 129, 0.4)' : 'var(--line)',
                  boxShadow: isAutoStreaming ? '0 0 20px rgba(16, 185, 129, 0.15)' : 'none'
                }}
                style={{
                  background: isAutoStreaming ? 'var(--emerald-bg)' : 'var(--navy-06)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 20,
                  transition: 'background 0.3s ease'
                }}
              >
                <div>
                  <div style={{
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 800,
                    fontSize: 14,
                    color: isAutoStreaming ? 'var(--emerald)' : 'var(--ink)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    {isAutoStreaming && (
                      <motion.span
                        animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: 'var(--emerald)',
                          display: 'inline-block'
                        }}
                      />
                    )}
                    {isAutoStreaming ? 'Auto-Pilot Stream Active' : 'Auto-Pilot Stream Inactive'}
                  </div>
                  <div style={{ fontSize: 12, color: isAutoStreaming ? 'var(--emerald)' : 'var(--muted)', marginTop: 4, fontWeight: 500 }}>
                    {isAutoStreaming
                      ? 'Emitting synthetic customer activity every 3 seconds across active leads...'
                      : 'Enable to continuously broadcast synthetic buyer activity and observe live system dynamics.'}
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className={`button small ${isAutoStreaming ? 'ghost' : 'primary'}`}
                  onClick={() => setIsAutoStreaming(!isAutoStreaming)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    fontWeight: 700
                  }}
                >
                  {isAutoStreaming ? <Pause size={14} /> : <Play size={14} />}
                  <span>{isAutoStreaming ? 'Pause Stream' : 'Start Auto-Pilot'}</span>
                </motion.button>
              </motion.div>

              {/* Manual Trigger Form */}
              <div style={{
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                marginBottom: 20,
                background: 'var(--surface-solid)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                  <Sparkles size={14} style={{ color: 'var(--blue)' }} />
                  <h4 style={{ fontSize: 14, margin: 0 }}>Single Event Injection</h4>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                      Target Lead
                    </label>
                    <select
                      className="swiss-input"
                      value={selectedLeadId}
                      onChange={(e) => setSelectedLeadId(e.target.value)}
                    >
                      {leads.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.company_name} (Score: {l.current_score}, {l.stage})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                      Event Type
                    </label>
                    <select
                      className="swiss-input"
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                    >
                      <option value="meeting_booked">Meeting Booked (+35 pts, Auto-Qualified)</option>
                      <option value="pricing_page_visit">High-Intent Pricing Visit (+15 pts)</option>
                      <option value="form_submission">Form Submission (+20 pts)</option>
                      <option value="email_click">Email Click (+12 pts)</option>
                      <option value="call_logged">Call Logged (+15 pts)</option>
                      <option value="email_open">Email Open (+5 pts)</option>
                    </select>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="button primary small"
                  onClick={handleManualSend}
                  disabled={sending}
                  style={{ width: '100%', height: 40, fontWeight: 700, fontSize: 13 }}
                >
                  <Zap size={14} />
                  <span>{sending ? 'Injecting into Engine...' : 'Inject Event into Pipeline Engine'}</span>
                </motion.button>
              </div>

              {/* Live Output Terminal */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Terminal size={13} style={{ color: 'var(--emerald)' }} />
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Live Ingestion Stream Console
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                    {logMessages.length} entries
                  </span>
                </div>
                <div
                  ref={terminalRef}
                  style={{
                    background: '#070d18',
                    color: '#dce8ff',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 11.5,
                    height: 160,
                    overflowY: 'auto',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.4)'
                  }}
                >
                  {logMessages.length === 0 ? (
                    <div style={{ color: 'rgba(220, 232, 255, 0.4)', fontStyle: 'italic' }}>
                      Ready. Fire an event or start Auto-Pilot to view live throughput, delta calculations, and latency measurements.
                    </div>
                  ) : (
                    logMessages.map((log, idx) => (
                      <div key={idx} style={{ marginBottom: 4, lineHeight: 1.5 }}>
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EventSimulatorModal;
