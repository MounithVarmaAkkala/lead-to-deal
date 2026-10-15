import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Flame,
  ShieldCheck,
  TrendingUp,
  Activity,
  ArrowRight,
  CheckCircle2,
  Sliders,
  Users,
  Layers,
  FileText,
  ChevronRight,
  Sparkles,
  BarChart3,
  Cpu,
  Lock,
  Globe,
  Radio,
  Clock,
  ExternalLink,
  Sun,
  Moon,
  Building2,
  DollarSign
} from 'lucide-react';
import {
  easeOutExpo,
  staggerContainerFast,
  fadeUpItem,
  slideInLeft,
  slideInRight
} from '../motion';
import type { AnalyticsOverview } from '../types';

interface LandingPageProps {
  onEnterPlatform: (view?: string) => void;
  openSimulator: () => void;
  analytics: AnalyticsOverview | null;
  latencyMs: number;
  isNight: boolean;
  toggleNight: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterPlatform,
  openSimulator,
  analytics,
  latencyMs,
  isNight,
  toggleNight,
}) => {
  // Calculator state
  const [inboundLeads, setInboundLeads] = useState<number>(350);
  const [dealValue, setDealValue] = useState<number>(45000);
  const [conversionRate, setConversionRate] = useState<number>(12);

  // Computed ROI
  const currentRevenue = inboundLeads * (conversionRate / 100) * dealValue;
  // With autonomous scoring & instant hot queue assignment, conversion typically increases by +28%
  const improvedConversion = conversionRate * 1.28;
  const projectedRevenue = inboundLeads * (improvedConversion / 100) * dealValue;
  const revenueGain = projectedRevenue - currentRevenue;
  const hoursSavedPerRep = Math.round(inboundLeads * 0.45);

  return (
    <div className="landing-page-container" style={{ minHeight: '100vh', background: 'var(--page)' }}>
      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 60,
        background: 'var(--surface)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid var(--line)',
        padding: '12px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'all 0.25s ease'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <motion.div
            whileHover={{ scale: 1.08, rotate: -2 }}
            style={{
              width: 36,
              height: 36,
              background: 'linear-gradient(135deg, #da291c 0%, #b91c1c 100%)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(218, 41, 28, 0.3)'
            }}
          >
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 16, fontFamily: 'var(--font-heading)' }}>+</span>
          </motion.div>
          <div>
            <div style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 900,
              fontSize: 15,
              letterSpacing: '-0.03em',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--ink)'
            }}>
              <span>ZESIGER INTELLIGENCE</span>
              <span style={{
                fontSize: 10,
                background: 'var(--gradient-blue)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 800
              }}>
                AG
              </span>
            </div>
            <span style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Autonomous Revenue System
            </span>
          </div>
        </div>

        {/* Center Links */}
        <div className="landing-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <a href="#features" className="landing-nav-link">Capabilities</a>
          <a href="#architecture" className="landing-nav-link">Architecture</a>
          <a href="#calculator" className="landing-nav-link">ROI Engine</a>
          <a href="#governance" className="landing-nav-link">Governance (US-03)</a>
          <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="landing-nav-link" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>API Docs</span>
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Right Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Telemetry Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            background: 'var(--surface-solid)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--line)',
            fontSize: 11,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            color: 'var(--emerald)'
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--emerald)', display: 'inline-block' }} />
            <span>{latencyMs}ms p95</span>
          </div>

          {/* Theme Toggle */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={toggleNight}
            className="button ghost small"
            style={{ width: 34, height: 34, padding: 0, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title={isNight ? 'Switch to Day Mode' : 'Switch to Night Mode'}
          >
            {isNight ? <Sun size={16} /> : <Moon size={16} />}
          </motion.button>

          {/* Launch Platform Button */}
          <motion.button
            whileHover={{ scale: 1.04, boxShadow: 'var(--shadow-blue)' }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onEnterPlatform('priority_queue')}
            className="button primary small"
            style={{
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 800,
              gap: 8,
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <span>Launch Platform</span>
            <ArrowRight size={14} />
          </motion.button>
        </div>
      </nav>

      {/* ── Hero Section ─────────────────────────────────────────────── */}
      <section style={{
        position: 'relative',
        padding: '70px 28px 80px',
        maxWidth: 1360,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: 48,
        alignItems: 'center'
      }}>
        {/* Left: Copy & CTAs */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: easeOutExpo }}
        >
          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 14px',
            background: 'var(--blue-soft)',
            border: '1px solid rgba(0, 113, 227, 0.25)',
            borderRadius: 'var(--radius-full)',
            color: 'var(--blue-500)',
            fontSize: 12,
            fontWeight: 800,
            marginBottom: 20
          }}>
            <Sparkles size={14} />
            <span>AUTONOMOUS PIPELINE ACCELERATION • v2.4</span>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(36px, 4.5vw, 56px)',
            fontWeight: 900,
            lineHeight: 1.08,
            letterSpacing: '-0.04em',
            color: 'var(--ink)',
            marginBottom: 20
          }}>
            Precision Revenue Intelligence.{' '}
            <span style={{
              background: 'var(--gradient-blue)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block'
            }}>
              Zero Human Friction.
            </span>
          </h1>

          <p style={{
            fontSize: 'clamp(15px, 1.3vw, 18px)',
            color: 'var(--ink-secondary)',
            lineHeight: 1.6,
            maxWidth: 580,
            marginBottom: 32,
            fontWeight: 500
          }}>
            Autonomous lead-to-deal orchestration that scores inbound buyer behavior in sub-30ms,
            balances opportunities across sales capacity, and guarantees human-verified governance for high-stakes pipeline transitions.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <motion.button
              whileHover={{ scale: 1.04, boxShadow: 'var(--shadow-blue)' }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onEnterPlatform('priority_queue')}
              className="button primary"
              style={{
                padding: '14px 28px',
                fontSize: 15,
                fontWeight: 800,
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}
            >
              <span>Enter Live Intelligence HUD</span>
              <ArrowRight size={18} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={openSimulator}
              className="button ghost"
              style={{
                padding: '14px 24px',
                fontSize: 15,
                fontWeight: 700,
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--surface-solid)'
              }}
            >
              <Zap size={16} style={{ color: 'var(--blue)' }} />
              <span>Autonomous Simulator</span>
            </motion.button>
          </div>

          {/* Trust bullet metrics */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            marginTop: 40,
            paddingTop: 24,
            borderTop: '1px solid var(--line)',
            flexWrap: 'wrap'
          }}>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 22, color: 'var(--ink)' }}>
                &lt; 50ms
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Real-Time Scoring Latency</div>
            </div>
            <div style={{ width: 1, height: 32, background: 'var(--line)' }} />
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 22, color: 'var(--emerald)' }}>
                100%
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Deterministic Audit Trail</div>
            </div>
            <div style={{ width: 1, height: 32, background: 'var(--line)' }} />
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 22, color: 'var(--blue-500)' }}>
                US-03
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Human Gate Verified</div>
            </div>
          </div>
        </motion.div>

        {/* Right: Live Interactive Telemetry Preview Card */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: easeOutExpo, delay: 0.1 }}
          style={{ position: 'relative' }}
        >
          {/* Decorative background glow */}
          <div style={{
            position: 'absolute',
            inset: -20,
            background: 'radial-gradient(circle at center, rgba(0, 113, 227, 0.15) 0%, rgba(0, 113, 227, 0) 70%)',
            filter: 'blur(30px)',
            pointerEvents: 'none',
            zIndex: 0
          }} />

          <div
            className="hud-card"
            style={{
              position: 'relative',
              zIndex: 1,
              background: 'var(--surface-solid)',
              border: '1px solid var(--line-strong)',
              borderRadius: 'var(--radius-l)',
              boxShadow: 'var(--shadow-float)',
              overflow: 'hidden'
            }}
          >
            {/* Card Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--line)',
              background: 'var(--navy-06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                  ACTIVE_TELEMETRY // STREAM_ON
                </span>
              </div>
              <span style={{
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                color: 'var(--muted)',
                background: 'var(--surface-solid)',
                padding: '2px 8px',
                borderRadius: 4,
                border: '1px solid var(--line)'
              }}>
                PORT 8000
              </span>
            </div>

            {/* Simulated Live Lead Card */}
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Incoming Pipeline Lead
                  </span>
                  <h3 style={{ fontSize: 18, marginTop: 2, color: 'var(--ink)' }}>
                    Novartis Oncology Therapeutics
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    Dr. Mathias Vogel • Head of Clinical Systems
                  </div>
                </div>

                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--emerald-bg)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: 'var(--emerald)',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>Current Score</div>
                  <div style={{ fontSize: 24, fontWeight: 900, fontFamily: 'var(--font-heading)', lineHeight: 1 }}>
                    92<span style={{ fontSize: 12, color: 'var(--muted)' }}>/100</span>
                  </div>
                </motion.div>
              </div>

              {/* Real-time event delta stream */}
              <div style={{
                background: 'var(--navy-06)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                border: '1px solid var(--line)',
                marginBottom: 16
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Recent Ingestion Events
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={14} style={{ color: 'var(--emerald)' }} />
                      <span style={{ fontWeight: 600 }}>Executive Demo Booked</span>
                    </div>
                    <span style={{ fontWeight: 800, color: 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>+35 pts</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={14} style={{ color: 'var(--emerald)' }} />
                      <span style={{ fontWeight: 600 }}>Enterprise Pricing Page Visit</span>
                    </div>
                    <span style={{ fontWeight: 800, color: 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>+15 pts</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={14} style={{ color: 'var(--emerald)' }} />
                      <span style={{ fontWeight: 600 }}>Architecture Spec Download</span>
                    </div>
                    <span style={{ fontWeight: 800, color: 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>+20 pts</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Action Trigger Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 14,
                borderTop: '1px solid var(--line)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'rgba(218, 41, 28, 0.1)',
                    color: '#da291c',
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 800
                  }}>
                    <Flame size={12} /> HOT QUEUE
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Auto-routed to Alex Fischer (AE)
                  </span>
                </div>

                <button
                  onClick={() => onEnterPlatform('priority_queue')}
                  className="button primary small"
                  style={{ fontSize: 12, padding: '6px 12px' }}
                >
                  Inspect in HUD ➔
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Architecture Pipeline Flow ────────────────────────────────── */}
      <section id="architecture" style={{
        padding: '70px 28px',
        maxWidth: 1360,
        margin: '0 auto',
        borderTop: '1px solid var(--line)'
      }}>
        <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 48px' }}>
          <div style={{
            fontSize: 12,
            fontWeight: 800,
            color: 'var(--blue-500)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 8
          }}>
            High-Throughput Architecture
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 3.2vw, 40px)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--ink)' }}>
            The 5-Stage Autonomous Engine
          </h2>
          <p style={{ fontSize: 15, color: 'var(--ink-secondary)', marginTop: 12, lineHeight: 1.6 }}>
            Engineered with strict idempotency, microsecond linear decay calculations, and human verification checkpoints.
          </p>
        </div>

        {/* 5 Stages Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20
        }}>
          {[
            {
              step: '01',
              title: 'Idempotent Ingestion',
              icon: Radio,
              desc: 'Ingests external webhook and API payloads with deduplication keys, preventing double-counting of clicks and meetings.'
            },
            {
              step: '02',
              title: 'Linear Scoring & Decay',
              icon: Sliders,
              desc: 'Dynamic rule evaluation weighted by recency decay windows. Configured live in the Admin Weights Matrix.'
            },
            {
              step: '03',
              title: 'Capacity Load Balancer',
              icon: Users,
              desc: 'Round-robin assignment that respects individual rep workload ceilings. Overflow is quarantined into the Hot Queue.'
            },
            {
              step: '04',
              title: 'US-03 Human Gates',
              icon: ShieldCheck,
              desc: 'Retrograde and terminal stage moves (Closed-Won / Lost) require operator confirmation and audit justification.'
            },
            {
              step: '05',
              title: 'Sub-50ms Broadcast',
              icon: Activity,
              desc: 'Real-time WebSocket event dissemination ensuring sales reps observe updates before customer phone calls terminate.'
            }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.step}
                variants={fadeUpItem}
                whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }}
                style={{
                  background: 'var(--surface-solid)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-md)',
                  padding: '24px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      fontWeight: 800,
                      color: 'var(--blue-500)',
                      background: 'var(--blue-soft)',
                      padding: '2px 8px',
                      borderRadius: 6
                    }}>
                      STAGE {item.step}
                    </span>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'var(--navy-06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--ink)'
                    }}>
                      <Icon size={18} />
                    </div>
                  </div>
                  <h4 style={{ fontSize: 16, marginBottom: 8, color: 'var(--ink)' }}>{item.title}</h4>
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55 }}>
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Interactive ROI / Revenue Engine Calculator ──────────────── */}
      <section id="calculator" style={{
        padding: '70px 28px',
        maxWidth: 1360,
        margin: '0 auto',
        borderTop: '1px solid var(--line)'
      }}>
        <div style={{
          background: 'var(--surface-solid)',
          border: '1px solid var(--line-strong)',
          borderRadius: 'var(--radius-xl)',
          padding: '48px 40px',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 40px' }}>
            <div style={{
              fontSize: 12,
              fontWeight: 800,
              color: 'var(--emerald)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 8
            }}>
              ROI & Revenue Impact Modeling
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 3vw, 36px)', fontWeight: 900, color: 'var(--ink)' }}>
              Calculate Your Revenue Acceleration
            </h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8 }}>
              Simulate how eliminating lead response latency and hot-queue bottlenecks elevates ARR.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 40,
            alignItems: 'center'
          }}>
            {/* Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Slider 1: Monthly Leads */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Monthly Inbound Leads</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--blue-500)', fontSize: 15 }}>
                    {inboundLeads} leads/mo
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1500"
                  step="25"
                  value={inboundLeads}
                  onChange={(e) => setInboundLeads(parseInt(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--blue)' }}
                />
              </div>

              {/* Slider 2: Average Deal Value */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Average Deal Size (ACV)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--blue-500)', fontSize: 15 }}>
                    ${dealValue.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min="5000"
                  max="150000"
                  step="5000"
                  value={dealValue}
                  onChange={(e) => setDealValue(parseInt(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--blue)' }}
                />
              </div>

              {/* Slider 3: Current Win Rate */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Current Close Rate</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--blue-500)', fontSize: 15 }}>
                    {conversionRate}%
                  </span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="35"
                  step="1"
                  value={conversionRate}
                  onChange={(e) => setConversionRate(parseInt(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--blue)' }}
                />
              </div>
            </div>

            {/* Calculated Output Box */}
            <div style={{
              background: 'var(--navy-06)',
              borderRadius: 'var(--radius-lg)',
              padding: '32px',
              border: '1px solid var(--line)',
              display: 'flex',
              flexDirection: 'column',
              gap: 24
            }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
                  Projected Annual Revenue Gain
                </span>
                <div style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(28px, 3.5vw, 42px)',
                  fontWeight: 900,
                  color: 'var(--emerald)',
                  lineHeight: 1.1,
                  marginTop: 6
                }}>
                  +${Math.round(revenueGain * 12).toLocaleString()}
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)', marginLeft: 6 }}>/ year</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  Based on +28% lift in speed-to-lead qualification conversion
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                    SDR Hours Saved
                  </span>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', marginTop: 2 }}>
                    {hoursSavedPerRep} hrs / mo
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                    Speed-to-Lead SLA
                  </span>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--blue-500)', marginTop: 2 }}>
                    &lt; 30 Seconds
                  </div>
                </div>
              </div>

              <button
                onClick={() => onEnterPlatform('priority_queue')}
                className="button primary"
                style={{ width: '100%', padding: '12px 20px', fontWeight: 800, fontSize: 14 }}
              >
                Launch Intelligence Platform ➔
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Capabilities & Product Deep Dive ──────────────────────────── */}
      <section id="features" style={{
        padding: '70px 28px',
        maxWidth: 1360,
        margin: '0 auto',
        borderTop: '1px solid var(--line)'
      }}>
        <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 48px' }}>
          <div style={{
            fontSize: 12,
            fontWeight: 800,
            color: 'var(--blue-500)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 8
          }}>
            Autonomous Platform Capabilities
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 3.2vw, 40px)', fontWeight: 900, color: 'var(--ink)' }}>
            Enterprise-Grade Lead Intelligence
          </h2>
          <p style={{ fontSize: 15, color: 'var(--ink-secondary)', marginTop: 12 }}>
            Click any capability below to jump straight to that operational console inside the platform.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24
        }}>
          {/* Card 1: Priority Queue */}
          <motion.div
            whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }}
            style={{
              background: 'var(--surface-solid)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: 'var(--blue-soft)',
                color: 'var(--blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18
              }}>
                <Layers size={22} />
              </div>
              <h3 style={{ fontSize: 18, color: 'var(--ink)', marginBottom: 10 }}>
                Autonomous Priority Queue
              </h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20 }}>
                Real-time tabular ranking of every inbound prospect with instant delta badge animations, search filter, and quick event simulation.
              </p>
            </div>
            <button
              onClick={() => onEnterPlatform('priority_queue')}
              className="button ghost small"
              style={{ justifyContent: 'flex-start', padding: 0, color: 'var(--blue)', fontWeight: 700 }}
            >
              Open Priority Queue ➔
            </button>
          </motion.div>

          {/* Card 2: Pipeline Board */}
          <motion.div
            whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }}
            style={{
              background: 'var(--surface-solid)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: 'var(--emerald-bg)',
                color: 'var(--emerald)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18
              }}>
                <TrendingUp size={22} />
              </div>
              <h3 style={{ fontSize: 18, color: 'var(--ink)', marginBottom: 10 }}>
                Visual Pipeline Kanban
              </h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20 }}>
                Multi-column Kanban with drag-style stage advance, hot-queue indicator tags, and verified terminal stage archiving.
              </p>
            </div>
            <button
              onClick={() => onEnterPlatform('pipeline')}
              className="button ghost small"
              style={{ justifyContent: 'flex-start', padding: 0, color: 'var(--blue)', fontWeight: 700 }}
            >
              Open Pipeline Board ➔
            </button>
          </motion.div>

          {/* Card 3: Rep Workload Load Balancer */}
          <motion.div
            whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }}
            style={{
              background: 'var(--surface-solid)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: 'rgba(218, 41, 28, 0.1)',
                color: '#da291c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18
              }}>
                <Flame size={22} />
              </div>
              <h3 style={{ fontSize: 18, color: 'var(--ink)', marginBottom: 10 }}>
                Hot Queue & Rep Balancer
              </h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20 }}>
                Workload-aware assignment algorithms that prevent sales rep burnout while parking high-intent overflow in the Hot Queue.
              </p>
            </div>
            <button
              onClick={() => onEnterPlatform('reps')}
              className="button ghost small"
              style={{ justifyContent: 'flex-start', padding: 0, color: 'var(--blue)', fontWeight: 700 }}
            >
              Manage Rep Capacity ➔
            </button>
          </motion.div>

          {/* Card 4: Scoring Engine Matrix */}
          <motion.div
            whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }}
            style={{
              background: 'var(--surface-solid)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: 'var(--navy-06)',
                color: 'var(--ink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18
              }}>
                <Sliders size={22} />
              </div>
              <h3 style={{ fontSize: 18, color: 'var(--ink)', marginBottom: 10 }}>
                Scoring Engine Administration
              </h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20 }}>
                Adjust feature weights, half-life decay windows, and activity coefficients in real-time with zero system restarts.
              </p>
            </div>
            <button
              onClick={() => onEnterPlatform('weights')}
              className="button ghost small"
              style={{ justifyContent: 'flex-start', padding: 0, color: 'var(--blue)', fontWeight: 700 }}
            >
              Configure Weights ➔
            </button>
          </motion.div>

          {/* Card 5: Immutable Audit Log */}
          <motion.div
            whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }}
            style={{
              background: 'var(--surface-solid)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: 'var(--blue-soft)',
                color: 'var(--blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18
              }}>
                <FileText size={22} />
              </div>
              <h3 style={{ fontSize: 18, color: 'var(--ink)', marginBottom: 10 }}>
                Immutable Audit Log (US-05)
              </h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20 }}>
                Every score change, weight alteration, and stage transition is permanently recorded with human-readable rationale explanations.
              </p>
            </div>
            <button
              onClick={() => onEnterPlatform('audit')}
              className="button ghost small"
              style={{ justifyContent: 'flex-start', padding: 0, color: 'var(--blue)', fontWeight: 700 }}
            >
              View Audit Logs ➔
            </button>
          </motion.div>

          {/* Card 6: Autonomous Simulator */}
          <motion.div
            whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }}
            style={{
              background: 'var(--surface-solid)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: 'var(--emerald-bg)',
                color: 'var(--emerald)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18
              }}>
                <Zap size={22} />
              </div>
              <h3 style={{ fontSize: 18, color: 'var(--ink)', marginBottom: 10 }}>
                Live Stream Event Simulator
              </h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20 }}>
                Inject synthetic meeting bookings, pricing visits, and form submissions to watch the scoring engine react live.
              </p>
            </div>
            <button
              onClick={openSimulator}
              className="button ghost small"
              style={{ justifyContent: 'flex-start', padding: 0, color: 'var(--blue)', fontWeight: 700 }}
            >
              Launch Simulator ➔
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── Enterprise Governance & Compliance (US-03) ────────────────── */}
      <section id="governance" style={{
        padding: '70px 28px',
        maxWidth: 1360,
        margin: '0 auto',
        borderTop: '1px solid var(--line)'
      }}>
        <div style={{
          background: 'var(--navy-06)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-xl)',
          padding: '48px 40px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 40,
          alignItems: 'center'
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--surface-solid)',
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid var(--line)',
              fontSize: 11,
              fontWeight: 800,
              color: 'var(--ink)',
              marginBottom: 16
            }}>
              <ShieldCheck size={14} style={{ color: 'var(--emerald)' }} />
              <span>STRICT HUMAN-IN-THE-LOOP PROTOCOL</span>
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 3vw, 36px)', fontWeight: 900, color: 'var(--ink)', lineHeight: 1.2 }}>
              Why Automation Without Governance Fails
            </h2>
            <p style={{ fontSize: 14, color: 'var(--ink-secondary)', marginTop: 14, lineHeight: 1.6 }}>
              Legacy CRMs allow silent regressions and automated data corruption. Zesiger Intelligence implements
              <strong> Specification US-03</strong>: Any stage rollback or terminal transition (Closed-Won / Closed-Lost)
              is strictly intercepted by human confirmation modals requiring operator justification.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--ink)' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--emerald)' }} />
                <span>Zero corrupt revenue forecast leakages</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--ink)' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--emerald)' }} />
                <span>Immutable attribution to authorized sales leadership</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--ink)' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--emerald)' }} />
                <span>Automatic rep capacity liberation on closed opportunities</span>
              </div>
            </div>
          </div>

          <div style={{
            background: 'var(--surface-solid)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            border: '1px solid var(--line)',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 12 }}>
              Governance Verification Checkpoint
            </div>
            <div style={{
              background: 'var(--navy-06)',
              padding: '12px 16px',
              borderRadius: 8,
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              color: 'var(--ink)',
              marginBottom: 16
            }}>
              TRANSITION_AUTH: REQUIRED<br />
              SOURCE_STAGE: Proposal<br />
              TARGET_STAGE: Closed-Won (Terminal)<br />
              CONFIRMATION: Human-Signed
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
              All actions trigger persistent entries in the compliance audit journal with timestamp and actor ID.
            </p>
          </div>
        </div>
      </section>

      {/* ── Ready to Accelerate CTA Banner ───────────────────────────── */}
      <section style={{
        padding: '80px 28px',
        maxWidth: 1360,
        margin: '0 auto'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #0f1a36 0%, #1b3263 100%)',
          borderRadius: 'var(--radius-2xl)',
          padding: '60px 48px',
          color: '#ffffff',
          textAlign: 'center',
          boxShadow: '0 20px 50px rgba(15, 26, 54, 0.25)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background ambient shape */}
          <div style={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0, 113, 227, 0.3) 0%, rgba(0, 113, 227, 0) 70%)',
            pointerEvents: 'none'
          }} />

          <span style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#93c5fd',
            marginBottom: 12,
            display: 'inline-block'
          }}>
            PRECISION REVENUE SYSTEM
          </span>
          <h2 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(28px, 3.5vw, 44px)',
            fontWeight: 900,
            lineHeight: 1.15,
            marginBottom: 16
          }}>
            Ready to Run Your Pipeline on Autonomous Intelligence?
          </h2>
          <p style={{
            fontSize: 16,
            color: '#d0ddf0',
            maxWidth: 600,
            margin: '0 auto 36px',
            lineHeight: 1.6
          }}>
            Experience sub-second lead scoring, dynamic hot-queue allocation, and strict human governance in real-time.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 8px 24px rgba(255, 255, 255, 0.2)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onEnterPlatform('priority_queue')}
              style={{
                background: '#ffffff',
                color: '#0f1a36',
                border: 0,
                padding: '14px 32px',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-heading)',
                fontWeight: 900,
                fontSize: 15,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <span>Launch Platform Now</span>
              <ArrowRight size={16} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={openSimulator}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                padding: '14px 28px',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                backdropFilter: 'blur(10px)'
              }}
            >
              <Zap size={16} style={{ color: '#60a5fa' }} />
              <span>Open Event Simulator</span>
            </motion.button>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer style={{
        padding: '40px 28px',
        borderTop: '1px solid var(--line)',
        background: 'var(--surface-solid)'
      }}>
        <div style={{
          maxWidth: 1360,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: '#da291c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 900,
              fontSize: 12
            }}>
              +
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
              Zesiger Intelligence AG
            </span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              • Swiss Engineered Autonomous Revenue Engine
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 12, color: 'var(--muted)' }}>
            <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
              REST API Swagger Docs
            </a>
            <a href="#features" style={{ color: 'inherit', textDecoration: 'none' }}>Capabilities</a>
            <a href="#architecture" style={{ color: 'inherit', textDecoration: 'none' }}>Architecture</a>
            <button
              onClick={() => onEnterPlatform('priority_queue')}
              style={{ border: 0, background: 'transparent', color: 'var(--blue)', fontWeight: 700, cursor: 'pointer' }}
            >
              Enter HUD ➔
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
