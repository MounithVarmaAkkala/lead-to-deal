import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserProfile, AnalyticsOverview } from '../types';
import {
  Flame,
  Activity,
  Sun,
  Moon,
  Zap,
  Layers,
  Users,
  Sliders,
  FileText,
  GitBranch,
  Globe
} from 'lucide-react';
import { easeOutExpo, easeSpring } from '../motion';
import '../App.css';

interface HUDHeaderProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  currentUser: UserProfile | null;
  onSwitchUser: () => void;
  isNight: boolean;
  toggleNight: () => void;
  wsConnected: boolean;
  latencyMs: number;
  hotQueueCount: number;
  openSimulator: () => void;
  analytics: AnalyticsOverview | null;
}

export const HUDHeader: React.FC<HUDHeaderProps> = ({
  currentView,
  setCurrentView,
  currentUser,
  onSwitchUser,
  isNight,
  toggleNight,
  wsConnected,
  latencyMs,
  hotQueueCount,
  openSimulator,
}) => {
  const navItems = [
    { id: 'landing', label: 'Overview', icon: Globe },
    { id: 'priority_queue', label: 'Priority Queue', icon: Layers },
    { id: 'pipeline', label: 'Pipeline', icon: GitBranch },
    { id: 'reps', label: 'Rep Capacity', icon: Users },
    { id: 'weights', label: 'Scoring', icon: Sliders },
    { id: 'audit', label: 'Audit Log', icon: FileText },
  ];

  const userInitials = currentUser?.name
    ? currentUser.name.split(' ').slice(0, 2).map(w => w[0]).join('')
    : '?';

  return (
    <motion.header
      className="app-header"
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: easeOutExpo, delay: 0.1 }}
    >
      <div className="app-header-inner">
        {/* Left Section: Brand + Telemetry */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Swiss Brand Mark */}
          <motion.div
            className="brand-logo"
            onClick={() => setCurrentView('landing')}
            style={{ cursor: 'pointer' }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            title="Go to Product Overview & Landing Page"
          >
            <motion.div
              className="brand-icon"
              whileHover={{ scale: 1.08, rotate: -3 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff">
                <path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z" />
              </svg>
            </motion.div>
            <div className="brand-text">
              <span className="brand-name">
                ZESIGER
                <span className="brand-suffix">// INTEL</span>
              </span>
              <span className="brand-subtitle">Lead-to-Deal Engine v1.1</span>
            </div>
          </motion.div>

          {/* Live Telemetry Badge */}
          <motion.div
            className="telemetry-badge"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.4, ease: easeSpring }}
          >
            <motion.span
              className={`status-dot ${wsConnected ? 'pulse' : ''}`}
              style={{ background: wsConnected ? 'var(--emerald)' : 'var(--rose)' }}
              animate={wsConnected ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <AnimatePresence mode="wait">
              <motion.span
                key={wsConnected ? 'live' : 'dc'}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.2 }}
                style={{ color: wsConnected ? 'var(--ink)' : 'var(--muted)' }}
              >
                {wsConnected ? 'LIVE' : 'RECONNECT'}
              </motion.span>
            </AnimatePresence>
            <div className="telemetry-divider" />
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--muted)' }}>
              <Activity size={12} style={{ color: latencyMs < 500 ? 'var(--emerald)' : 'var(--rose)' }} />
              <motion.span
                key={latencyMs}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, ease: easeSpring }}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: latencyMs < 500 ? 'var(--emerald)' : 'var(--rose)',
                  fontWeight: 600
                }}
              >
                {latencyMs}ms
              </motion.span>
            </span>
          </motion.div>

          {/* Hot Queue Floating Pill */}
          <AnimatePresence>
            {hotQueueCount > 0 && (
              <motion.button
                className="hot-pill"
                onClick={() => setCurrentView('priority_queue')}
                initial={{ opacity: 0, scale: 0.8, x: -10 }}
                animate={{
                  opacity: 1, scale: 1, x: 0,
                  boxShadow: [
                    '0 0 0 0 rgba(220,38,38,0)',
                    '0 0 20px 4px rgba(220,38,38,0.15)',
                    '0 0 0 0 rgba(220,38,38,0)',
                  ],
                }}
                exit={{ opacity: 0, scale: 0.8, x: -10 }}
                transition={{
                  opacity: { duration: 0.3 },
                  scale: { duration: 0.3, ease: easeSpring },
                  boxShadow: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
                }}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.span
                  animate={{ rotate: [0, -10, 10, -5, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
                  style={{ display: 'inline-flex' }}
                >
                  <Flame size={13} />
                </motion.span>
                <span>{hotQueueCount} HOT</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Center: Segmented Navigation */}
        <motion.div
          className="segmented"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: easeOutExpo }}
        >
          {navItems.map(({ id, label, icon: Icon }) => (
            <motion.button
              key={id}
              className={currentView === id ? 'active' : ''}
              onClick={() => setCurrentView(id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              layout
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <Icon size={14} />
              <span>{label}</span>
              {currentView === id && (
                <motion.div
                  layoutId="nav-indicator"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--surface-solid)',
                    boxShadow: 'var(--shadow-md)',
                    zIndex: -1,
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                />
              )}
            </motion.button>
          ))}
        </motion.div>

        {/* Right: Actions */}
        <motion.div
          className="header-actions"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35, duration: 0.4, ease: easeOutExpo }}
        >
          <motion.button
            className="button primary small simulate-btn"
            onClick={openSimulator}
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.96 }}
          >
            <Zap size={14} />
            <span>Simulate</span>
          </motion.button>

          <motion.button
            className="theme-toggle"
            onClick={toggleNight}
            title="Toggle Day/Night theme"
            whileHover={{ rotate: 20, scale: 1.08 }}
            whileTap={{ scale: 0.9, rotate: -10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 12 }}
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={isNight ? 'sun' : 'moon'}
                initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                transition={{ duration: 0.25 }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {isNight ? <Sun size={15} style={{ color: '#f59e0b' }} /> : <Moon size={15} />}
              </motion.span>
            </AnimatePresence>
          </motion.button>

          <motion.button
            className="user-chip"
            onClick={onSwitchUser}
            title="Click to switch between Admin and Sales Rep"
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
          >
            <motion.div
              className="user-avatar"
              style={{
                background: currentUser?.role === 'admin'
                  ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
                  : 'var(--gradient-blue)'
              }}
              animate={{ rotate: [0, 0] }}
              whileHover={{ scale: 1.1 }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={userInitials}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.2 }}
                >
                  {userInitials}
                </motion.span>
              </AnimatePresence>
            </motion.div>
            <span style={{ color: 'var(--ink)' }}>
              {currentUser?.name?.split(' ')[0] || '...'}
            </span>
            <kbd>{currentUser?.role === 'admin' ? 'ADMIN' : 'REP'}</kbd>
          </motion.button>
        </motion.div>
      </div>
    </motion.header>
  );
};
