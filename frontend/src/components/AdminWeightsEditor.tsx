import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ScoringWeight, WeightAudit } from '../types';
import { api } from '../api';
import { Sliders, History, Save, CheckCircle2 } from 'lucide-react';
import { pageVariants, staggerContainer, fadeUpItem, easeOutExpo, easeSpring } from '../motion';

export const AdminWeightsEditor: React.FC = () => {
  const [weights, setWeights] = useState<ScoringWeight[]>([]);
  const [audits, setAudits] = useState<WeightAudit[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadWeightsAndAudits();
  }, []);

  const loadWeightsAndAudits = async () => {
    try {
      setLoading(true);
      const [wData, aData] = await Promise.all([
        api.getScoringWeights(),
        api.getWeightAudits()
      ]);
      setWeights(wData);
      setAudits(aData);
    } catch (err) {
      console.error('Failed to load weights:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWeightChange = (index: number, newWeight: number) => {
    const next = [...weights];
    next[index].weight = newWeight;
    setWeights(next);
  };

  const handleWindowChange = (index: number, newWindow: number) => {
    const next = [...weights];
    next[index].window_hours = newWindow;
    setWeights(next);
  };

  const handleSave = async (item: ScoringWeight) => {
    try {
      setSavingKey(item.feature_name);
      await api.updateScoringWeight({
        feature_name: item.feature_name,
        weight: item.weight,
        window_hours: item.window_hours,
        description: item.description
      });
      setSuccessMsg(`Saved weight configuration for '${item.feature_name}'!`);
      const updatedAudits = await api.getWeightAudits();
      setAudits(updatedAudits);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to save weight:', err);
    } finally {
      setSavingKey(null);
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
      {/* Title */}
      <motion.div
        style={{ marginBottom: 24 }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easeOutExpo }}
      >
        <h2 style={{ fontSize: 22, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sliders size={20} style={{ color: 'var(--blue-500)' }} />
          <span>Scoring Weights &amp; Feature Tuning (US-06)</span>
        </h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          Adjust formula coefficients and decay windows dynamically. Every modification is logged to an immutable audit record and affects future evaluations immediately.
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
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              <CheckCircle2 size={16} />
            </motion.span>
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(600px, 1fr))', gap: 24 }}>
        {/* Weights List */}
        <motion.div
          className="hud-card"
          style={{ padding: '24px' }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: easeOutExpo }}
        >
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>Configured Scoring Features</h3>

          {loading && weights.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)' }}>
              Loading scoring weights...
            </div>
          ) : (
            <motion.div
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {weights.map((w, idx) => (
                <motion.div
                  key={w.id}
                  variants={fadeUpItem}
                  whileHover={{ borderColor: 'var(--line-strong)', boxShadow: 'var(--shadow-sm)' }}
                  style={{
                    padding: '16px',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--surface-solid)',
                    transition: 'border-color 150ms ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <strong style={{ fontSize: 14, color: 'var(--ink)' }}>{w.feature_name}</strong>
                      <span style={{
                        marginLeft: 8,
                        fontSize: 11,
                        background: 'rgba(15,26,54,0.04)',
                        color: 'var(--muted)',
                        padding: '2px 6px',
                        borderRadius: 4,
                        textTransform: 'uppercase'
                      }}>
                        {w.category}
                      </span>
                      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{w.description}</p>
                    </div>

                    <motion.button
                      className="button primary small"
                      disabled={savingKey === w.feature_name}
                      onClick={() => handleSave(w)}
                      whileHover={{ scale: 1.05, y: -1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Save size={13} />
                      <span>{savingKey === w.feature_name ? 'Saving...' : 'Apply'}</span>
                    </motion.button>
                  </div>

                  {/* Sliders row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    {/* Weight Slider */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: 'var(--muted)' }}>Score Delta (Points):</span>
                        <motion.strong
                          key={w.weight}
                          initial={{ scale: 1.2 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.15 }}
                          style={{ color: 'var(--blue-500)' }}
                        >
                          +{w.weight} pts
                        </motion.strong>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="60"
                        step="1"
                        value={w.weight}
                        onChange={(e) => handleWeightChange(idx, parseInt(e.target.value))}
                        style={{ width: '100%', cursor: 'pointer' }}
                      />
                    </div>

                    {/* Window Slider */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: 'var(--muted)' }}>Time Decay Window:</span>
                        <strong style={{ color: 'var(--ink)' }}>{w.window_hours} hours</strong>
                      </div>
                      <input
                        type="range"
                        min="6"
                        max="336"
                        step="6"
                        value={w.window_hours}
                        onChange={(e) => handleWindowChange(idx, parseInt(e.target.value))}
                        style={{ width: '100%', cursor: 'pointer' }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Audit Log Trail */}
        <motion.div
          className="hud-card"
          style={{ padding: '24px' }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: easeOutExpo }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <History size={16} style={{ color: 'var(--blue-500)' }} />
            <h3 style={{ fontSize: 16 }}>Weight Change Audit Trail (Immutable)</h3>
          </div>

          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            {audits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 12 }}>
                No weight adjustments made yet. All features operating on factory defaults.
              </div>
            ) : (
              <motion.div
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {audits.map((a) => (
                  <motion.div
                    key={a.id}
                    variants={fadeUpItem}
                    whileHover={{ scale: 1.01, boxShadow: 'var(--shadow-sm)' }}
                    style={{
                      padding: '12px 14px',
                      background: 'rgba(15,26,54,0.02)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <strong style={{ color: 'var(--ink)' }}>{a.feature_name}</strong>
                      <span style={{ color: 'var(--muted)', fontSize: 11 }}>
                        {new Date(a.changed_at).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ color: 'var(--ink)' }}>
                      Weight adjusted: <span style={{ textDecoration: 'line-through', color: 'var(--muted)' }}>+{a.old_weight}</span> → <strong style={{ color: 'var(--blue-500)' }}>+{a.new_weight}</strong> pts
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      Modified by: {a.changed_by}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
