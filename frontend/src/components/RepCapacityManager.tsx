import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserProfile } from '../types';
import { api } from '../api';
import { Users, Flame, CheckCircle2 } from 'lucide-react';
import { pageVariants, staggerContainer, fadeUpItem, easeOutExpo } from '../motion';

export const RepCapacityManager: React.FC = () => {
  const [reps, setReps] = useState<UserProfile[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadReps();
  }, []);

  const loadReps = async () => {
    try {
      const data = await api.getReps();
      setReps(data);
    } catch (err) {
      console.error('Failed to load reps:', err);
    }
  };

  const handleCapacityChange = (userId: string, newCapacity: number) => {
    setReps(reps.map(r => r.id === userId ? { ...r, max_concurrent_leads: newCapacity } : r));
  };

  const handleToggleAvailable = async (rep: UserProfile) => {
    try {
      setUpdatingId(rep.id);
      const updated = await api.updateRepCapacity(rep.id, { is_available: !rep.is_available });
      setReps(reps.map(r => r.id === rep.id ? { ...r, is_available: updated.is_available } : r));
      setSuccessMsg(`Availability updated for ${rep.name}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to update availability:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveCapacity = async (rep: UserProfile) => {
    try {
      setUpdatingId(rep.id);
      const updated = await api.updateRepCapacity(rep.id, { max_concurrent_leads: rep.max_concurrent_leads });
      setReps(reps.map(r => r.id === rep.id ? { ...r, max_concurrent_leads: updated.max_concurrent_leads } : r));
      setSuccessMsg(`Capacity updated for ${rep.name} to ${rep.max_concurrent_leads} max concurrent leads. Any eligible hot-queue leads have been auto-assigned!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to update capacity:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <motion.div
      style={{ maxWidth: 1440, margin: '24px auto', padding: '0 24px' }}
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div
        style={{ marginBottom: 24 }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easeOutExpo }}
      >
        <h2 style={{ fontSize: 22, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={20} style={{ color: 'var(--blue-500)' }} />
          <span>Sales Rep Capacity &amp; Load Balancing (US-04)</span>
        </h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          Defines maximum concurrent open leads per representative. When reps reach capacity, new incoming leads route to the Hot Queue and trigger instant reassignment once leads close.
        </p>
      </motion.div>

      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.3, ease: easeOutExpo }}
            style={{
              padding: '12px 16px',
              background: '#d1fae5',
              color: '#047857',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 20,
              overflow: 'hidden'
            }}
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              <CheckCircle2 size={16} />
            </motion.span>
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 20
        }}
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {reps.map((rep) => {
          const activeLeads = rep.current_leads_count || 0;
          const isAtCapacity = activeLeads >= rep.max_concurrent_leads;
          const utilizationPct = Math.round((activeLeads / Math.max(1, rep.max_concurrent_leads)) * 100);

          return (
            <motion.div
              key={rep.id}
              className="hud-card"
              variants={fadeUpItem}
              whileHover={{ y: -3, boxShadow: 'var(--shadow-lg)' }}
              style={{
                padding: '20px',
                background: 'var(--surface-solid)',
                border: isAtCapacity ? '1px solid rgba(218, 41, 28, 0.4)' : '1px solid var(--line)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 16 }}>{rep.name}</h3>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{rep.email} • {rep.role.toUpperCase()}</p>
                </div>
                <motion.button
                  onClick={() => handleToggleAvailable(rep)}
                  className={`button small ${rep.is_available ? 'ghost' : 'danger'}`}
                  style={{ fontSize: 11, padding: '0 8px' }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {rep.is_available ? 'Available' : 'Unavailable'}
                </motion.button>
              </div>

              {/* Capacity Meter */}
              <div style={{
                background: 'rgba(15,26,54,0.02)',
                padding: '14px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 16
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: 'var(--muted)' }}>Active Load / Capacity:</span>
                  <strong style={{ color: isAtCapacity ? '#da291c' : 'var(--ink)' }}>
                    {activeLeads} / {rep.max_concurrent_leads} leads ({utilizationPct}%)
                  </strong>
                </div>

                {/* Progress bar */}
                <div style={{
                  height: 6,
                  background: 'var(--line)',
                  borderRadius: 3,
                  overflow: 'hidden'
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, utilizationPct)}%` }}
                    transition={{ duration: 0.8, ease: easeOutExpo }}
                    style={{
                      height: '100%',
                      background: isAtCapacity ? '#da291c' : (utilizationPct > 70 ? 'var(--amber)' : 'var(--blue-500)'),
                      borderRadius: 3
                    }}
                  />
                </div>

                <AnimatePresence>
                  {isAtCapacity && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{
                        marginTop: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#da291c',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        overflow: 'hidden'
                      }}
                    >
                      <motion.span
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        style={{ display: 'inline-flex' }}
                      >
                        <Flame size={12} />
                      </motion.span>
                      <span>AT MAX CONCURRENT CAPACITY (Routing excess to Hot Queue)</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Adjust limit slider */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: 'var(--muted)' }}>Max Concurrent Leads:</span>
                  <motion.strong
                    key={rep.max_concurrent_leads}
                    initial={{ scale: 1.3, color: 'var(--blue-500)' }}
                    animate={{ scale: 1, color: 'var(--blue-500)' }}
                    transition={{ duration: 0.2 }}
                  >
                    {rep.max_concurrent_leads}
                  </motion.strong>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={rep.max_concurrent_leads}
                  onChange={(e) => handleCapacityChange(rep.id, parseInt(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              <motion.button
                className="button primary small"
                style={{ width: '100%' }}
                disabled={updatingId === rep.id}
                onClick={() => handleSaveCapacity(rep)}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                {updatingId === rep.id ? 'Updating...' : 'Save Capacity Limit'}
              </motion.button>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
};
