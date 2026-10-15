import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Lead } from '../types';
import {
  Search,
  Filter,
  Flame,
  User,
  ChevronRight,
  TrendingUp,
  Zap,
  Building2,
  ArrowUpDown,
  Eye
} from 'lucide-react';
import { pageVariants, staggerContainer, fadeUpItem, easeOutExpo, easeSpring } from '../motion';

interface LeadsTableProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onQuickSimulate: (lead: Lead) => void;
}

const STAGES = ['ALL', 'New', 'Engaged', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed-Won', 'Closed-Lost'];

const getStageColor = (stage: string) => {
  const map: Record<string, { bg: string; text: string; dot: string }> = {
    'New':         { bg: 'rgba(15, 26, 54, 0.06)', text: 'var(--ink-secondary)', dot: '#6b7280' },
    'Engaged':     { bg: 'rgba(14, 165, 233, 0.08)', text: '#0284c7', dot: '#0ea5e9' },
    'Contacted':   { bg: 'rgba(245, 158, 11, 0.08)', text: '#b45309', dot: '#f59e0b' },
    'Qualified':   { bg: 'rgba(26, 102, 220, 0.08)', text: 'var(--blue-500)', dot: '#3b82f6' },
    'Proposal':    { bg: 'rgba(168, 85, 247, 0.08)', text: '#7c3aed', dot: '#a855f7' },
    'Negotiation': { bg: 'rgba(139, 92, 246, 0.08)', text: '#6d28d9', dot: '#8b5cf6' },
    'Closed-Won':  { bg: 'rgba(16, 185, 129, 0.08)', text: '#059669', dot: '#10b981' },
    'Closed-Lost': { bg: 'rgba(244, 63, 94, 0.08)', text: '#e11d48', dot: '#f43f5e' },
  };
  return map[stage] || { bg: 'rgba(15, 26, 54, 0.06)', text: 'var(--ink-secondary)', dot: '#6b7280' };
};

const getScoreClass = (score: number) => {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

export const LeadsTable: React.FC<LeadsTableProps> = ({
  leads,
  onSelectLead,
  onQuickSimulate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [showHotOnly, setShowHotOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'score' | 'priority' | 'name'>('priority');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filteredLeads = useMemo(() => {
    let result = leads.filter((lead) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = !term ||
        lead.company_name.toLowerCase().includes(term) ||
        lead.contact_name.toLowerCase().includes(term) ||
        lead.contact_email.toLowerCase().includes(term);
      const matchesStage = selectedStage === 'ALL' || lead.stage === selectedStage;
      const matchesHot = !showHotOnly || lead.is_hot_queue;
      return matchesSearch && matchesStage && matchesHot;
    });

    const isClosed = (l: Lead) => l.stage === 'Closed-Won' || l.stage === 'Closed-Lost';
    result.sort((a, b) => {
      // Hot Queue pinned to the top, closed deals sink to the bottom.
      if (a.is_hot_queue !== b.is_hot_queue) return a.is_hot_queue ? -1 : 1;
      if (isClosed(a) !== isClosed(b)) return isClosed(a) ? 1 : -1;
      let cmp = 0;
      if (sortBy === 'score') cmp = a.current_score - b.current_score;
      else if (sortBy === 'priority') cmp = a.priority_score - b.priority_score;
      else cmp = a.company_name.localeCompare(b.company_name);
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [leads, searchTerm, selectedStage, showHotOnly, sortBy, sortDir]);

  const toggleSort = (field: 'score' | 'priority' | 'name') => {
    if (sortBy === field) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  return (
    <motion.div
      style={{ maxWidth: 1440, margin: '24px auto', padding: '0 28px' }}
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Controls Bar */}
      <motion.div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
          marginBottom: 18
        }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: easeOutExpo }}
      >
        {/* Left: Search + Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <motion.div
            style={{ position: 'relative', width: 320 }}
            whileHover={{ scale: 1.01 }}
          >
            <Search size={15} style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted)'
            }} />
            <input
              type="text"
              className="swiss-input"
              style={{ paddingLeft: 40, fontSize: 13 }}
              placeholder="Search leads by company, name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </motion.div>
          <motion.span
            key={filteredLeads.length}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: easeSpring }}
            style={{
              fontSize: 12,
              color: 'var(--muted)',
              fontFamily: 'var(--font-heading)',
              fontWeight: 600
            }}
          >
            {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}
          </motion.span>
        </div>

        {/* Right: Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <motion.button
            onClick={() => setShowHotOnly(!showHotOnly)}
            className={`button small ${showHotOnly ? 'danger' : 'ghost'}`}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            <Flame size={13} />
            <span>Hot Only</span>
          </motion.button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Filter size={13} style={{ color: 'var(--muted)' }} />
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="swiss-input"
              style={{ width: 150, height: 34, fontSize: 12, paddingRight: 28 }}
            >
              {STAGES.map((stg) => (
                <option key={stg} value={stg}>{stg === 'ALL' ? 'All Stages' : stg}</option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        className="card"
        style={{ overflow: 'hidden' }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5, ease: easeOutExpo }}
      >
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ padding: '14px 20px', width: '30%' }}>Company & Contact</th>
              <th
                style={{ padding: '14px 16px', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => toggleSort('score')}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  Lead Score
                  <ArrowUpDown size={11} style={{ opacity: sortBy === 'score' ? 1 : 0.3 }} />
                </span>
              </th>
              <th
                style={{ padding: '14px 16px', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => toggleSort('priority')}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  Priority
                  <ArrowUpDown size={11} style={{ opacity: sortBy === 'priority' ? 1 : 0.3 }} />
                </span>
              </th>
              <th style={{ padding: '14px 16px' }}>Stage</th>
              <th style={{ padding: '14px 16px' }}>Assignment</th>
              <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <motion.div
                    className="empty-state"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className="empty-state-icon">
                      <Search size={24} />
                    </div>
                    <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink-secondary)' }}>
                      No leads match your filters
                    </p>
                    <p style={{ fontSize: 12, marginTop: 4 }}>
                      Try adjusting your search term or stage filter
                    </p>
                  </motion.div>
                </td>
              </tr>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredLeads.map((lead, idx) => {
                  const stage = getStageColor(lead.stage);
                  return (
                    <motion.tr
                      key={lead.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{
                        opacity: 1, x: 0,
                        backgroundColor: lead.is_hot_queue ? 'var(--hot-bg)' : 'transparent',
                      }}
                      exit={{ opacity: 0, x: 10, height: 0 }}
                      transition={{
                        layout: { type: 'spring', stiffness: 350, damping: 30 },
                        opacity: { duration: 0.3, delay: idx * 0.02 },
                        x: { duration: 0.3, delay: idx * 0.02, ease: easeOutExpo },
                      }}
                      style={{
                        borderBottom: '1px solid var(--line)',
                      }}
                    >
                      {/* Company & Contact */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <motion.div
                            whileHover={{ scale: 1.08 }}
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 'var(--radius-md)',
                              background: lead.is_hot_queue
                                ? 'linear-gradient(135deg, rgba(220,38,38,0.08), rgba(220,38,38,0.15))'
                                : 'linear-gradient(135deg, rgba(26,102,220,0.06), rgba(26,102,220,0.12))',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: lead.is_hot_queue ? 'var(--hot-text)' : 'var(--blue-500)',
                              flexShrink: 0,
                              border: `1px solid ${lead.is_hot_queue ? 'var(--hot-border)' : 'rgba(26,102,220,0.1)'}`
                            }}
                          >
                            <Building2 size={17} />
                          </motion.div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{
                              fontFamily: 'var(--font-heading)',
                              fontWeight: 700,
                              fontSize: 13.5,
                              color: 'var(--ink)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {lead.company_name}
                              </span>
                              <AnimatePresence>
                                {lead.is_hot_queue && (
                                  <motion.span
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 2,
                                      background: 'linear-gradient(135deg, rgba(220,38,38,0.1), rgba(220,38,38,0.18))',
                                      color: '#dc2626',
                                      padding: '1px 7px',
                                      borderRadius: 'var(--radius-full)',
                                      fontSize: 9.5,
                                      fontWeight: 800,
                                      letterSpacing: '0.04em',
                                      flexShrink: 0
                                    }}
                                  >
                                    <Flame size={9} /> HOT
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </div>
                            <div style={{
                              fontSize: 12,
                              color: 'var(--muted)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                              marginTop: 2
                            }}>
                              <span>{lead.contact_name}</span>
                              <span style={{ opacity: 0.4 }}>•</span>
                              <span style={{ opacity: 0.7, fontSize: 11 }}>{lead.contact_email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Score */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <motion.div
                            className={`score-badge ${getScoreClass(lead.current_score)}`}
                            animate={lead.justUpdated ? {
                              scale: [1, 1.18, 1.06, 1],
                              boxShadow: [
                                '0 0 0 0 rgba(16,185,129,0)',
                                '0 0 24px 4px rgba(16,185,129,0.3)',
                                '0 0 12px 2px rgba(16,185,129,0.15)',
                                '0 0 0 0 rgba(16,185,129,0)',
                              ],
                            } : {}}
                            transition={{ duration: 1, ease: easeOutExpo }}
                          >
                            <AnimatePresence mode="wait">
                              <motion.span
                                key={lead.current_score}
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                transition={{ duration: 0.25 }}
                              >
                                {lead.current_score}
                              </motion.span>
                            </AnimatePresence>
                          </motion.div>
                          <AnimatePresence>
                            {lead.lastDelta !== undefined && (
                              <motion.span
                                initial={{ opacity: 0, scale: 0.5, x: -5 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                transition={{ duration: 0.3, ease: easeSpring }}
                                style={{
                                  fontSize: 11,
                                  fontFamily: 'var(--font-mono)',
                                  fontWeight: 600,
                                  color: lead.lastDelta >= 0 ? 'var(--emerald)' : 'var(--rose)',
                                  background: lead.lastDelta >= 0 ? 'var(--emerald-bg)' : 'var(--rose-bg)',
                                  padding: '1px 6px',
                                  borderRadius: 'var(--radius-xs)',
                                }}
                              >
                                {lead.lastDelta >= 0 ? `+${lead.lastDelta}` : lead.lastDelta}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>
                        <div className="score-bar-track">
                          <motion.div
                            className="score-bar-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, lead.current_score)}%` }}
                            transition={{ duration: 0.8, ease: easeOutExpo, delay: idx * 0.03 }}
                            style={{
                              background: lead.current_score >= 70
                                ? 'var(--gradient-blue)'
                                : lead.current_score >= 40
                                  ? 'var(--gradient-amber)'
                                  : 'var(--line-strong)',
                            }}
                          />
                        </div>
                      </td>

                      {/* Priority */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          fontFamily: 'var(--font-heading)',
                          fontWeight: 700,
                          fontSize: 14,
                          color: 'var(--ink)'
                        }}>
                          <TrendingUp size={14} style={{
                            color: lead.priority_score > 50 ? 'var(--blue-500)' : 'var(--muted)'
                          }} />
                          {lead.priority_score.toFixed(1)}
                        </div>
                        <span style={{
                          fontSize: 10,
                          color: 'var(--muted)',
                          fontWeight: 500
                        }}>
                          Time-decay weighted
                        </span>
                      </td>

                      {/* Stage */}
                      <td style={{ padding: '14px 16px' }}>
                        <motion.span
                          className="stage-pill"
                          style={{ background: stage.bg, color: stage.text }}
                          whileHover={{ scale: 1.05 }}
                          layout
                        >
                          <motion.span
                            layoutId={`stage-dot-${lead.id}`}
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: stage.dot,
                              flexShrink: 0
                            }}
                          />
                          {lead.stage}
                        </motion.span>
                      </td>

                      {/* Assignment */}
                      <td style={{ padding: '14px 16px' }}>
                        {lead.is_hot_queue ? (
                          <motion.div
                            animate={{ opacity: [0.8, 1, 0.8] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                              color: 'var(--hot-text)',
                              fontWeight: 700,
                              fontSize: 12,
                              fontFamily: 'var(--font-heading)'
                            }}
                          >
                            <Flame size={13} />
                            Hot Queue
                          </motion.div>
                        ) : lead.assignee_name ? (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 12.5,
                            fontWeight: 500
                          }}>
                            <div style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              background: 'var(--gradient-blue)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <User size={11} style={{ color: '#fff' }} />
                            </div>
                            <span>{lead.assignee_name}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: 12 }}>Unassigned</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <motion.button
                            className="button ghost tiny"
                            onClick={() => onQuickSimulate(lead)}
                            title="Simulate event"
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Zap size={12} style={{ color: 'var(--blue-500)' }} />
                          </motion.button>
                          <motion.button
                            className="button primary tiny"
                            onClick={() => onSelectLead(lead)}
                            whileHover={{ scale: 1.04, x: 2 }}
                            whileTap={{ scale: 0.96 }}
                          >
                            <Eye size={12} />
                            <span>Details</span>
                            <ChevronRight size={11} />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </motion.div>
    </motion.div>
  );
};
