import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';
import type { ScoreExplanation } from '../types';
import { FileText, Download, Search } from 'lucide-react';
import { pageVariants, staggerContainer, fadeUpItem, easeOutExpo } from '../motion';

export const AuditLogView: React.FC = () => {
  const [explanations, setExplanations] = useState<ScoreExplanation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAudits();
  }, []);

  const loadAudits = async () => {
    try {
      setLoading(true);
      const leads = await api.getLeads();
      const allExplanations: ScoreExplanation[] = [];
      for (const l of leads.slice(0, 10)) {
        try {
          const detail = await api.getLeadDetail(l.id);
          allExplanations.push(...detail.explanations);
        } catch (e) {}
      }
      allExplanations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setExplanations(allExplanations);
    } catch (err) {
      console.error('Failed to load audits:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = explanations.filter((exp) => {
    return (
      exp.reason_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exp.event_id && exp.event_id.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    <motion.div
      style={{ maxWidth: 1440, margin: '24px auto', padding: '0 24px' }}
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Title & CSV Export */}
      <motion.div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20
        }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easeOutExpo }}
      >
        <div>
          <h2 style={{ fontSize: 22, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={20} style={{ color: 'var(--blue-500)' }} />
            <span>Immutable Explanation Audit Log (P0 / P2)</span>
          </h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            System-wide append-only ledger of every autonomous score evaluation and applied rule formula
          </p>
        </div>

        <motion.div
          style={{ display: 'flex', alignItems: 'center', gap: 10 }}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <motion.button
            type="button"
            onClick={() => api.downloadAuditCsv().catch((e) => alert(e.message || 'Export failed'))}
            className="button primary small"
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Download size={14} />
            <span>Export CSV Ledger</span>
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Filter bar */}
      <motion.div
        style={{ marginBottom: 16, maxWidth: 360, position: 'relative' }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
      >
        <Search size={15} style={{
          position: 'absolute',
          left: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--muted)'
        }} />
        <input
          type="text"
          className="swiss-input"
          style={{ paddingLeft: 36 }}
          placeholder="Filter explanations by reason or event ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </motion.div>

      {/* Table */}
      <motion.div
        className="hud-card"
        style={{ overflow: 'hidden' }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: easeOutExpo }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{
              background: 'rgba(15,26,54,0.02)',
              borderBottom: '1px solid var(--line-strong)',
              color: 'var(--muted)',
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              <th style={{ padding: '12px 20px' }}>Timestamp</th>
              <th style={{ padding: '12px 16px' }}>Delta</th>
              <th style={{ padding: '12px 16px' }}>Score Change</th>
              <th style={{ padding: '12px 20px' }}>Audited Reason &amp; Formula Justification</th>
              <th style={{ padding: '12px 16px' }}>Event Reference</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)' }}>
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    Loading immutable audit records...
                  </motion.div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)' }}>
                  No audit logs matching current query.
                </td>
              </tr>
            ) : (
              filtered.map((exp, idx) => (
                <motion.tr
                  key={exp.id}
                  style={{ borderBottom: '1px solid var(--line)' }}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02, duration: 0.3, ease: easeOutExpo }}
                >
                  <td style={{ padding: '12px 20px', color: 'var(--muted)', fontSize: 12 }}>
                    {new Date(exp.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <motion.span
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: idx * 0.02, type: 'spring', stiffness: 400, damping: 15 }}
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontWeight: 800,
                        fontSize: 12,
                        background: exp.delta >= 0 ? '#d1fae5' : '#fee2e2',
                        color: exp.delta >= 0 ? '#047857' : '#b91c1c'
                      }}
                    >
                      {exp.delta >= 0 ? `+${exp.delta}` : exp.delta}
                    </motion.span>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                    <span style={{ color: 'var(--muted)' }}>{exp.previous_score}</span>
                    <span style={{ margin: '0 4px', color: 'var(--muted)' }}>→</span>
                    <span style={{ color: 'var(--ink)' }}>{exp.new_score}</span>
                  </td>
                  <td style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--ink)' }}>
                    {exp.reason_text}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <code style={{
                      fontSize: 11,
                      background: 'rgba(15,26,54,0.04)',
                      padding: '2px 6px',
                      borderRadius: 4,
                      color: 'var(--muted)'
                    }}>
                      {exp.event_id || 'manual/system'}
                    </code>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </motion.div>
    </motion.div>
  );
};
