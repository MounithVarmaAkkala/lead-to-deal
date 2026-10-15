import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';
import { X, Building2, UserPlus, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { overlayVariants, modalVariants } from '../motion';

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadCreated: () => void;
}

export const NewLeadModal: React.FC<NewLeadModalProps> = ({ isOpen, onClose, onLeadCreated }) => {
  const [companyName, setCompanyName] = useState('');
  const [companySize, setCompanySize] = useState('11-50');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [initialScore, setInitialScore] = useState(15);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !contactEmail.trim() || !contactName.trim()) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      await api.createLead({
        company_name: companyName,
        company_size: companySize,
        contact_name: contactName,
        contact_email: contactEmail,
        initial_score: initialScore
      });
      onLeadCreated();
      onClose();
      // Reset
      setCompanyName('');
      setContactName('');
      setContactEmail('');
      setInitialScore(15);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="new-lead-backdrop"
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
            key="new-lead-modal"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="hud-card"
            style={{
              width: '100%',
              maxWidth: 500,
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
                  whileHover={{ scale: 1.1, rotate: -5 }}
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
                  <UserPlus size={20} />
                </motion.div>
                <div>
                  <h3 style={{ fontSize: 17, margin: 0, letterSpacing: '-0.02em' }}>Create Inbound Lead</h3>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    Auto-evaluated & assigned via Round-Robin load balancer
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

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                  Company Name <span style={{ color: 'var(--rose)' }}>*</span>
                </label>
                <input
                  type="text"
                  className="swiss-input"
                  placeholder="e.g. Roche Precision Diagnostics"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                    Contact Name <span style={{ color: 'var(--rose)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="swiss-input"
                    placeholder="e.g. Sandra Meier"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                    Company Size
                  </label>
                  <select
                    className="swiss-input"
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                  >
                    <option value="1-10">1-10 Empl.</option>
                    <option value="11-50">11-50 Empl.</option>
                    <option value="51-200">51-200 Empl.</option>
                    <option value="201-500">201-500 Empl.</option>
                    <option value="500+">500+ Empl.</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                  Contact Email <span style={{ color: 'var(--rose)' }}>*</span>
                </label>
                <input
                  type="email"
                  className="swiss-input"
                  placeholder="sandra.meier@roche.ch"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  required
                />
              </div>

              {/* Slider for baseline score */}
              <div style={{
                marginBottom: 24,
                padding: '14px 16px',
                background: 'var(--navy-06)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--line)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                    Initial Baseline Score
                  </span>
                  <motion.span
                    key={initialScore}
                    initial={{ scale: 1.2, color: 'var(--blue)' }}
                    animate={{ scale: 1, color: 'var(--blue-500)' }}
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 800,
                      fontSize: 14,
                      background: 'var(--surface-solid)',
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid var(--line)'
                    }}
                  >
                    {initialScore} pts
                  </motion.span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="40"
                  step="5"
                  value={initialScore}
                  onChange={(e) => setInitialScore(parseInt(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--blue)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--muted)', marginTop: 4 }}>
                  <span>Cold (5)</span>
                  <span>Standard (15-20)</span>
                  <span>Warm (40)</span>
                </div>
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
                    fontSize: 12.5,
                    marginBottom: 16,
                    fontWeight: 600
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </motion.div>
              )}

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
                  disabled={loading}
                  style={{ fontWeight: 700, padding: '8px 18px' }}
                >
                  {loading ? 'Creating Lead...' : 'Create & Auto-Assign Lead'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NewLeadModal;
