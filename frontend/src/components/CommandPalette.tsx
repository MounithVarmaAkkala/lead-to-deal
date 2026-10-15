import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, CornerDownLeft, Flame, ArrowRight } from 'lucide-react';
import type { Lead } from '../types';

export interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  group: string;
  run: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  actions: PaletteAction[];
  leads: Lead[];
  onOpenLead: (lead: Lead) => void;
}

type Item =
  | { kind: 'action'; action: PaletteAction }
  | { kind: 'lead'; lead: Lead };

const matches = (q: string, ...fields: (string | undefined | null)[]) =>
  fields.some((f) => f?.toLowerCase().includes(q));

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, actions, leads, onOpenLead }) => {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  const items: Item[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const acts = actions.filter((a) => !q || matches(q, a.label, a.group, a.hint));
    const ls = q
      ? leads.filter((l) => matches(q, l.company_name, l.contact_name, l.contact_email, l.stage)).slice(0, 8)
      : leads.filter((l) => l.is_hot_queue).concat(leads.filter((l) => !l.is_hot_queue)).slice(0, 5);
    return [
      ...acts.map((action) => ({ kind: 'action' as const, action })),
      ...ls.map((lead) => ({ kind: 'lead' as const, lead })),
    ];
  }, [query, actions, leads]);

  useEffect(() => { setActive(0); }, [query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (item: Item | undefined) => {
    if (!item) return;
    onClose();
    if (item.kind === 'action') item.action.run();
    else onOpenLead(item.lead);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(items.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(items[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  let lastGroup = '';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="palette-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.div
            className="palette"
            role="dialog" aria-modal="true" aria-label="Command palette"
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={onKeyDown}
          >
            <div className="palette-input">
              <Search size={16} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Jump to a view, run an action, or search leads…"
                aria-label="Search commands and leads"
                role="combobox"
                aria-expanded="true"
                aria-controls="palette-list"
                aria-activedescendant={items[active] ? `palette-item-${active}` : undefined}
              />
              <kbd>esc</kbd>
            </div>
            <div className="palette-list" id="palette-list" role="listbox" ref={listRef}>
              {items.length === 0 && <div className="palette-empty">No matches for “{query}”</div>}
              {items.map((item, idx) => {
                const group = item.kind === 'action' ? item.action.group : (query ? 'Leads' : 'Top leads');
                const header = group !== lastGroup ? <div className="palette-group" key={`g_${group}`}>{group}</div> : null;
                lastGroup = group;
                return (
                  <React.Fragment key={item.kind === 'action' ? item.action.id : item.lead.id}>
                    {header}
                    <div
                      id={`palette-item-${idx}`}
                      data-idx={idx}
                      role="option"
                      aria-selected={idx === active}
                      className={`palette-item ${idx === active ? 'active' : ''}`}
                      onMouseMove={() => setActive(idx)}
                      onClick={() => choose(item)}
                    >
                      {item.kind === 'action' ? (
                        <>
                          <ArrowRight size={14} className="palette-icon" />
                          <span className="palette-label">{item.action.label}</span>
                          {item.action.hint && <span className="palette-hint">{item.action.hint}</span>}
                        </>
                      ) : (
                        <>
                          {item.lead.is_hot_queue ? <Flame size={14} className="palette-icon hot" /> : <span className="palette-score">{item.lead.current_score}</span>}
                          <span className="palette-label">
                            {item.lead.company_name}
                            <span className="palette-sub"> · {item.lead.contact_name}</span>
                          </span>
                          <span className="palette-hint">{item.lead.stage}</span>
                        </>
                      )}
                      {idx === active && <CornerDownLeft size={13} className="palette-enter" />}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
            <div className="palette-footer">
              <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
              <span><kbd>↵</kbd> select</span>
              <span><kbd>Ctrl</kbd><kbd>K</kbd> toggle</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
