import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, onUnauthorized, getAuthToken } from './api';
import { realTimeService } from './websocket';
import type { Lead, UserProfile, AnalyticsOverview } from './types';
import { HUDHeader } from './components/HUDHeader';
import { HotQueueBanner } from './components/HotQueueBanner';
import { LeadsTable } from './components/LeadsTable';
import { PipelineBoard } from './components/PipelineBoard';
import { RepCapacityManager } from './components/RepCapacityManager';
import { AdminWeightsEditor } from './components/AdminWeightsEditor';
import { AuditLogView } from './components/AuditLogView';
import { LeadDetailModal } from './components/LeadDetailModal';
import { EventSimulatorModal } from './components/EventSimulatorModal';
import { NewLeadModal } from './components/NewLeadModal';
import { StageTransitionModal } from './components/StageTransitionModal';
import { LandingPage } from './components/LandingPage';
import { LoginScreen } from './components/LoginScreen';
import { CommandPalette, type PaletteAction } from './components/CommandPalette';
import {
  Flame,
  Activity,
  Target,
  Trophy,
  Zap,
  TrendingUp,
  X,
  Bell
} from 'lucide-react';
import {
  pageVariants,
  staggerContainerFast,
  fadeUpItem,
  easeOutExpo
} from './motion';
import './App.css';

const hotLeadsForPalette = (leads: Lead[]) =>
  leads.filter((l) => l.is_hot_queue).sort((a, b) => b.priority_score - a.priority_score);

interface LiveToast {
  id: string;
  title: string;
  subtitle: string;
  type: 'score' | 'transition' | 'assign' | 'alert';
  delta?: number;
}

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('landing');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isNight, setIsNight] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [pendingView, setPendingView] = useState<string | null>(null);
  const [toasts, setToasts] = useState<LiveToast[]>([]);

  // Modals state
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [transitionLead, setTransitionLead] = useState<Lead | null>(null);
  const [pendingTargetStage, setPendingTargetStage] = useState<string | null>(null);
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);

  // Helper to push live toasts
  const pushToast = (toast: Omit<LiveToast, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const refreshData = useCallback(async () => {
    if (!getAuthToken()) return;
    try {
      const [leadsData, analyticsData] = await Promise.all([
        api.getLeads(),
        api.getAnalytics()
      ]);
      setLeads(leadsData);
      setAnalytics(analyticsData);
      const health: any = analyticsData.system_health;
      if (health?.samples) setLatencyMs(Math.round(health.p95_latency_ms));
    } catch (err) {
      console.error('Error refreshing leads/analytics:', err);
    }
  }, []);

  // Coalesce bursts of WS events into one refetch.
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(refreshData, 250);
  }, [refreshData]);

  const startSession = useCallback(async (user: UserProfile) => {
    setCurrentUser(user);
    realTimeService.connect(user.tenant_id);
    await refreshData();
  }, [refreshData]);

  const signOut = useCallback(() => {
    api.logout();
    realTimeService.disconnect();
    setCurrentUser(null);
    setLeads([]);
    setAnalytics(null);
    setCurrentView('login');
  }, []);

  // Resume an existing session if the stored token is still good.
  useEffect(() => {
    try {
      if (localStorage.getItem('theme') === 'night') {
        setIsNight(true);
        document.body.classList.add('night');
      }
    } catch { /* storage unavailable */ }
    onUnauthorized(() => {
      realTimeService.disconnect();
      setCurrentUser(null);
      setCurrentView((v) => (v === 'landing' ? v : 'login'));
    });
    if (getAuthToken()) {
      api.getCurrentUser().then(startSession).catch(() => api.logout());
    }
  }, [startSession]);

  const enterPlatform = (view?: string) => {
    const target = view || 'priority_queue';
    if (currentUser) setCurrentView(target);
    else { setPendingView(target); setCurrentView('login'); }
  };

  // Ctrl/⌘+K command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (currentUser) setIsPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentUser]);

  // Real-time WebSocket events
  useEffect(() => {
    const unsubscribe = realTimeService.subscribe((data) => {
      if (data.type === 'connection_status') {
        setWsConnected(data.connected);
        if (data.connected) scheduleRefresh(); // catch up after (re)connect
      } else if (data.type === 'lead_updated') {
        const p95 = realTimeService.getP95Latency();
        if (p95 !== null) setLatencyMs(p95);
        const delta = data.explanation?.delta;
        
        pushToast({
          title: `${data.lead.company_name} scored: ${data.lead.current_score}`,
          subtitle: data.explanation?.reason_text || `Updated in ${data.elapsed_ms || 32}ms`,
          type: 'score',
          delta: delta
        });

        setLeads((prevLeads) => {
          const index = prevLeads.findIndex((l) => l.id === data.lead.id);
          if (index !== -1) {
            const updated = [...prevLeads];
            updated[index] = {
              ...updated[index],
              ...data.lead,
              justUpdated: true,
              lastDelta: delta
            };
            return updated;
          } else {
            return [data.lead, ...prevLeads];
          }
        });

        setTimeout(() => {
          setLeads((prev) =>
            prev.map((l) => (l.id === data.lead.id ? { ...l, justUpdated: false } : l))
          );
        }, 2200);

        if (data.transition) {
          pushToast({
            title: `${data.lead.company_name} → ${data.transition.to_stage}`,
            subtitle: data.transition.reason,
            type: 'transition'
          });
        }
        if (data.assignment_status === 'hot_queue_entered') {
          pushToast({
            title: `${data.lead.company_name} entered the Hot Queue`,
            subtitle: 'All reps are at capacity',
            type: 'alert'
          });
        }
        scheduleRefresh();
      } else if (data.type === 'stage_transitioned') {
        pushToast({
          title: `${data.lead?.company_name || 'Lead'}: ${data.from_stage} → ${data.to_stage}`,
          subtitle: data.reason || `Confirmed by ${data.confirmed_by}`,
          type: 'transition'
        });
        scheduleRefresh();
      } else if (data.type === 'lead_created') {
        pushToast({
          title: `New lead: ${data.lead?.company_name || 'Lead'}`,
          subtitle: data.lead?.is_hot_queue
            ? 'Routed to Hot Queue (reps at capacity)'
            : `Assigned to ${data.lead?.assignee_name || 'a rep'} via round-robin`,
          type: 'assign'
        });
        scheduleRefresh();
      } else if (data.type === 'hot_queue_reassigned') {
        (data.leads || []).forEach((l: Lead) => pushToast({
          title: `${l.company_name} left the Hot Queue`,
          subtitle: `Auto-assigned to ${l.assignee_name || 'a rep'} after capacity freed`,
          type: 'assign'
        }));
        scheduleRefresh();
      } else if (['rep_capacity_updated', 'lead_assigned', 'lead_updated_silent', 'weight_updated', 'resync_required'].includes(data.type)) {
        scheduleRefresh();
      }
    });

    return () => unsubscribe();
  }, [scheduleRefresh]);

  const toggleNight = () => {
    const next = !isNight;
    setIsNight(next);
    if (next) {
      document.body.classList.add('night');
      localStorage.setItem('theme', 'night');
    } else {
      document.body.classList.remove('night');
      localStorage.setItem('theme', 'day');
    }
  };

  // Optimistic stage change with rollback if the server refuses (PRD §5 UI behaviours).
  const handleTransitionStage = async (leadId: string, toStage: string, confirmed: boolean, reason?: string) => {
    const before = leads.find((l) => l.id === leadId);
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: toStage } : l)));
    try {
      await api.transitionStage(leadId, toStage, confirmed, reason, before?.version);
    } catch (err: any) {
      if (before) setLeads((prev) => prev.map((l) => (l.id === leadId ? before : l)));
      if (err?.error === 'version_conflict') {
        pushToast({ title: 'Lead changed elsewhere', subtitle: err.message, type: 'alert' });
        refreshData();
      }
      throw err;
    }
    await refreshData();
  };

  const views: { id: string; label: string; adminOnly?: boolean }[] = [
    { id: 'priority_queue', label: 'Priority Queue' },
    { id: 'pipeline', label: 'Pipeline Board' },
    { id: 'reps', label: 'Rep Capacity' },
    { id: 'weights', label: 'Scoring Weights', adminOnly: true },
    { id: 'audit', label: 'Audit Log' },
  ];
  const paletteActions: PaletteAction[] = [
    ...views
      .filter((v) => !v.adminOnly || currentUser?.role === 'admin')
      .map((v) => ({ id: `view_${v.id}`, label: `Go to ${v.label}`, group: 'Navigate', run: () => setCurrentView(v.id) })),
    { id: 'new_lead', label: 'Create new lead', group: 'Actions', run: () => setIsNewLeadOpen(true) },
    { id: 'simulator', label: 'Open event simulator', group: 'Actions', run: () => setIsSimulatorOpen(true) },
    ...(hotLeadsForPalette(leads).length
      ? [{ id: 'hot', label: `Open hottest queued lead`, hint: hotLeadsForPalette(leads)[0].company_name, group: 'Actions',
           run: () => setSelectedLeadId(hotLeadsForPalette(leads)[0].id) }]
      : []),
    ...(currentUser?.role === 'admin'
      ? [{ id: 'export', label: 'Export audit ledger (CSV)', group: 'Actions', run: () => { api.downloadAuditCsv().catch(() => {}); } }]
      : []),
    { id: 'theme', label: isNight ? 'Switch to day mode' : 'Switch to night mode', group: 'Preferences', run: () => toggleNight() },
    { id: 'landing', label: 'Back to landing page', group: 'Preferences', run: () => setCurrentView('landing') },
    { id: 'signout', label: 'Sign out', hint: currentUser?.email, group: 'Account', run: signOut },
  ];

  const handleQuickSimulate = async (lead: Lead, eventType: string = 'email_open', payload: any = {}) => {
    const eventId = `quick_${Date.now()}`;
    await api.ingestEvent({
      event_id: eventId,
      lead_id: lead.id,
      event_type: eventType,
      payload
    });
  };

  const hotLeads = leads.filter((l) => l.is_hot_queue);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {currentView === 'login' && !currentUser ? (
        <LoginScreen
          onBack={() => setCurrentView('landing')}
          onAuthenticated={async (user) => {
            await startSession(user);
            setCurrentView(pendingView || 'priority_queue');
            setPendingView(null);
          }}
        />
      ) : currentView === 'landing' || !currentUser ? (
        <LandingPage
          onEnterPlatform={enterPlatform}
          openSimulator={() => (currentUser ? setIsSimulatorOpen(true) : enterPlatform('priority_queue'))}
          analytics={analytics}
          latencyMs={latencyMs ?? 0}
          isNight={isNight}
          toggleNight={toggleNight}
        />
      ) : (
        <>
          <HUDHeader
            currentView={currentView}
            setCurrentView={setCurrentView}
            currentUser={currentUser}
            onSwitchUser={signOut}
            isNight={isNight}
            toggleNight={toggleNight}
            wsConnected={wsConnected}
            latencyMs={latencyMs ?? 0}
            hotQueueCount={hotLeads.length}
            openSimulator={() => setIsSimulatorOpen(true)}
            analytics={analytics}
          />

          <main className="main-content">
        {/* Hot Queue Banner */}
        <HotQueueBanner
          hotLeads={hotLeads}
          onSelectLead={(l) => setSelectedLeadId(l.id)}
          onNavigateToReps={() => setCurrentView('reps')}
        />

        {/* Metrics Dashboard */}
        {analytics && (
          <motion.div
            variants={staggerContainerFast}
            initial="hidden"
            animate="visible"
            className="metrics-grid"
          >
            {/* Pipeline Volume */}
            <motion.div
              variants={fadeUpItem}
              whileHover={{ y: -3, boxShadow: 'var(--shadow-md)' }}
              transition={{ duration: 0.2 }}
              className="metric-card"
            >
              <span className="metric-label">Pipeline Volume</span>
              <div className="metric-value count-animate" style={{ color: 'var(--ink)' }}>
                {analytics.total_leads}
                <span className="metric-sub" style={{ marginLeft: 6 }}>leads</span>
              </div>
              <div style={{
                marginTop: 10,
                height: 4,
                background: 'var(--line)',
                borderRadius: 2,
                overflow: 'hidden'
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.8, ease: easeOutExpo }}
                  style={{
                    height: '100%',
                    background: 'var(--gradient-blue)',
                    borderRadius: 2
                  }}
                />
              </div>
            </motion.div>

            <motion.div
              variants={fadeUpItem}
              animate={analytics.hot_queue_count > 0 ? {
                boxShadow: [
                  '0 0 0 0 rgba(220,38,38,0), var(--shadow-sm)',
                  '0 0 24px 4px rgba(220,38,38,0.14), var(--shadow-sm)',
                  '0 0 0 0 rgba(220,38,38,0), var(--shadow-sm)',
                ],
                borderColor: [
                  'rgba(220,38,38,0.2)',
                  'rgba(220,38,38,0.5)',
                  'rgba(220,38,38,0.2)',
                ],
                transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' }
              } : undefined}
              whileHover={{ y: -3, boxShadow: 'var(--shadow-md)' }}
              className={`metric-card ${analytics.hot_queue_count > 0 ? 'hot-queue-card' : ''}`}
              style={analytics.hot_queue_count > 0 ? {
                borderColor: 'var(--hot-border)',
              } : {}}
            >
              <span className="metric-label" style={{
                color: analytics.hot_queue_count > 0 ? 'var(--hot-text)' : undefined
              }}>
                Hot Queue
              </span>
              <div className="metric-value count-animate" style={{
                color: analytics.hot_queue_count > 0 ? 'var(--hot-text)' : 'var(--ink)',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                {analytics.hot_queue_count}
                {analytics.hot_queue_count > 0 && (
                  <motion.div
                    animate={{ scale: [1, 1.25, 1], rotate: [-4, 4, -4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Flame size={22} style={{ color: '#dc2626' }} />
                  </motion.div>
                )}
              </div>
              {analytics.hot_queue_count > 0 ? (
                <p style={{ fontSize: 11, color: 'var(--hot-text)', marginTop: 6, fontWeight: 600 }}>
                  High-intent leads awaiting available rep capacity
                </p>
              ) : (
                <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, fontWeight: 500 }}>
                  All high-intent leads currently assigned
                </p>
              )}
            </motion.div>

            {/* Mean Score */}
            <motion.div
              variants={fadeUpItem}
              whileHover={{ y: -3, boxShadow: 'var(--shadow-md)' }}
              transition={{ duration: 0.2 }}
              className="metric-card"
            >
              <span className="metric-label">Mean Score</span>
              <div className="metric-value count-animate" style={{ color: 'var(--blue-500)' }}>
                {analytics.avg_score}
                <span className="metric-sub" style={{ marginLeft: 6 }}>/ 100</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 8
              }}>
                <Target size={13} style={{ color: 'var(--blue-500)' }} />
                <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>
                  Qualification threshold: 70
                </span>
              </div>
            </motion.div>

            {/* Win Rate */}
            <motion.div
              variants={fadeUpItem}
              whileHover={{ y: -3, boxShadow: 'var(--shadow-md)' }}
              transition={{ duration: 0.2 }}
              className="metric-card"
            >
              <span className="metric-label">Win Rate</span>
              <div className="metric-value count-animate" style={{ color: 'var(--emerald)' }}>
                {analytics.win_rate_pct}%
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 8
              }}>
                <Trophy size={13} style={{ color: 'var(--emerald)' }} />
                <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>
                  {analytics.closed_won_count} won / {analytics.closed_won_count + analytics.closed_lost_count} total
                </span>
              </div>
            </motion.div>

            {/* Latency SLA */}
            <motion.div
              variants={fadeUpItem}
              whileHover={{ y: -3, boxShadow: 'var(--shadow-md)' }}
              transition={{ duration: 0.2 }}
              className="metric-card"
            >
              <span className="metric-label">p95 Latency</span>
              <div className="metric-value count-animate" style={{
                color: (latencyMs ?? 0) < 500 ? 'var(--emerald)' : 'var(--rose)',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{latencyMs === null ? '—' : `${latencyMs}ms`}</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 8
              }}>
                <Activity size={13} style={{ color: (latencyMs ?? 0) < 500 ? 'var(--emerald)' : 'var(--rose)' }} />
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: (latencyMs ?? 0) < 500 ? 'var(--emerald)' : 'var(--rose)'
                }}>
                  {(latencyMs ?? 0) < 500 ? '✓ Within SLA' : '⚠ Above target'}
                </span>
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>(&lt;500ms)</span>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Dynamic Views with smooth Page Transition Animations */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            variants={pageVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {currentView === 'priority_queue' && (
              <LeadsTable
                leads={leads}
                onSelectLead={(l) => setSelectedLeadId(l.id)}
                onQuickSimulate={(l) => handleQuickSimulate(l, 'meeting_booked')}
              />
            )}

            {currentView === 'pipeline' && (
              <PipelineBoard
                leads={leads}
                onSelectLead={(l) => setSelectedLeadId(l.id)}
                onTransitionStage={handleTransitionStage}
                onNewLeadClick={() => setIsNewLeadOpen(true)}
              />
            )}

            {currentView === 'reps' && <RepCapacityManager />}
            {currentView === 'weights' && <AdminWeightsEditor />}
            {currentView === 'audit' && <AuditLogView />}
          </motion.div>
        </AnimatePresence>
      </main>
    </>
  )}

      {/* Floating HUD Real-Time Event Toasts */}
      <div style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none'
      }}>
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ duration: 0.35, ease: easeOutExpo }}
              style={{
                pointerEvents: 'auto',
                background: 'var(--surface-solid)',
                border: '1px solid var(--line-strong)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-float)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                minWidth: 280,
                maxWidth: 380,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)'
              }}
            >
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: toast.type === 'score'
                  ? 'var(--emerald-bg)'
                  : toast.type === 'transition'
                  ? 'var(--blue-soft)'
                  : 'var(--navy-06)',
                color: toast.type === 'score'
                  ? 'var(--emerald)'
                  : toast.type === 'transition'
                  ? 'var(--blue)'
                  : 'var(--ink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {toast.type === 'score' ? (
                  <Zap size={16} />
                ) : toast.type === 'transition' ? (
                  <TrendingUp size={16} />
                ) : (
                  <Bell size={16} />
                )}
              </div>

              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: 'var(--ink)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {toast.title}
                  </span>
                  {toast.delta !== undefined && (
                    <span style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: toast.delta > 0 ? 'var(--emerald)' : 'var(--rose)',
                      background: toast.delta > 0 ? 'var(--emerald-bg)' : 'var(--rose-bg)',
                      padding: '1px 6px',
                      borderRadius: 10
                    }}>
                      {toast.delta > 0 ? `+${toast.delta}` : toast.delta}
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  marginTop: 2,
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}>
                  {toast.subtitle}
                </div>
              </div>

              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                style={{
                  border: 0,
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        actions={paletteActions}
        leads={leads}
        onOpenLead={(l) => setSelectedLeadId(l.id)}
      />

      {/* Modals */}
      <LeadDetailModal
        leadId={selectedLeadId}
        isOpen={Boolean(selectedLeadId)}
        onClose={() => setSelectedLeadId(null)}
        onQuickSimulate={handleQuickSimulate}
        onTriggerTransition={(lead) => {
          setSelectedLeadId(null);
          setTransitionLead(lead);
          setPendingTargetStage('Qualified');
          setIsTransitionModalOpen(true);
        }}
      />

      <EventSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        leads={leads}
        onEventSent={refreshData}
      />

      <NewLeadModal
        isOpen={isNewLeadOpen}
        onClose={() => setIsNewLeadOpen(false)}
        onLeadCreated={refreshData}
      />

      <StageTransitionModal
        isOpen={isTransitionModalOpen}
        lead={transitionLead}
        targetStage={pendingTargetStage}
        onClose={() => setIsTransitionModalOpen(false)}
        onConfirm={handleTransitionStage}
      />
    </div>
  );
};

export default App;
