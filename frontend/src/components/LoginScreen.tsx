import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, LogIn, ShieldCheck, UserRound, Loader2 } from 'lucide-react';
import { api } from '../api';
import type { UserProfile } from '../types';
import { easeOutExpo } from '../motion';

interface LoginScreenProps {
  onAuthenticated: (user: UserProfile) => void;
  onBack: () => void;
}

const DEMO_ACCOUNTS = [
  { label: 'Jordan — Admin / Sales Ops', email: 'admin@zesiger.net', password: 'admin123', icon: ShieldCheck },
  { label: 'Alex — Senior AE', email: 'alex@zesiger.net', password: 'alex123', icon: UserRound },
  { label: 'Taylor — Inbound SDR', email: 'taylor@zesiger.net', password: 'taylor123', icon: UserRound },
];

export const LoginScreen: React.FC<LoginScreenProps> = ({ onAuthenticated, onBack }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [workspace, setWorkspace] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e?: React.FormEvent, creds?: { email: string; password: string }) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = mode === 'register' && !creds
        ? await api.register({ email, password, name, tenant_name: workspace })
        : await api.login(creds?.email ?? email, creds?.password ?? password);
      onAuthenticated(res.user);
    } catch (err: any) {
      setError(err?.message || 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-glow" aria-hidden />
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: easeOutExpo }}
      >
        <button type="button" className="auth-back" onClick={onBack}>
          <ArrowLeft size={14} /> Back
        </button>

        <div className="auth-brand">
          <span className="auth-logo" aria-hidden>Z</span>
          <div>
            <h1>{mode === 'login' ? 'Sign in to the HUD' : 'Create a workspace'}</h1>
            <p>Real-time, explainable lead intelligence.</p>
          </div>
        </div>

        <form onSubmit={submit} className="auth-form">
          {mode === 'register' && (
            <>
              <label>
                <span>Your name</span>
                <input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </label>
              <label>
                <span>Workspace name</span>
                <input required minLength={2} value={workspace} onChange={(e) => setWorkspace(e.target.value)} autoComplete="organization" />
              </label>
            </>
          )}
          <label>
            <span>Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password" required minLength={mode === 'register' ? 8 : 1}
              value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>

          {error && <div className="auth-error" role="alert">{error}</div>}

          <button type="submit" className="button primary" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
            {busy ? <Loader2 size={16} className="spin" /> : <LogIn size={16} />}
            {mode === 'login' ? 'Sign in' : 'Create workspace'}
          </button>
        </form>

        <button type="button" className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}>
          {mode === 'login' ? 'New here? Create a workspace' : 'Have an account? Sign in'}
        </button>

        {mode === 'login' && (
          <div className="auth-demo">
            <span className="auth-demo-label">Demo workspace — one-click sign in</span>
            {DEMO_ACCOUNTS.map(({ label, email: e, password: p, icon: Icon }) => (
              <button key={e} type="button" disabled={busy} className="auth-demo-btn" onClick={() => submit(undefined, { email: e, password: p })}>
                <Icon size={15} />
                <span>{label}</span>
                <code>{e}</code>
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};
