import React, { useState } from 'react';
import { Shield, Lock, Scissors, ArrowRight, AlertTriangle, Eye, EyeOff, Mail, KeyRound, ShieldAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext.js';

interface AdminAuthGateProps {
  onSuccess: (user: any) => void;
}

export const AdminAuthGate: React.FC<AdminAuthGateProps> = ({ onSuccess }) => {
  const { settings } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    try {
      setLoading(true);
      setErrorMsg('');

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setIsLocked(true);
        }
        throw new Error(data.error || 'Credenciais inválidas.');
      }

      setIsLocked(false);

      // Persist authenticated session token in sessionStorage (isolated per tab/session)
      sessionStorage.setItem('fbc_staff_auth', JSON.stringify({
        token: data.token,
        user: data.user,
        authenticatedAt: Date.now(),
      }));

      onSuccess(data.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao validar credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-100 flex flex-col items-center justify-center p-4 selection:bg-amber-400 selection:text-zinc-950 bg-sports-grid font-sans">
      <div className="w-full max-w-md bg-[#121215] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        {/* Glow corner */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-400/10 blur-3xl rounded-full pointer-events-none" />

        {/* Brand Crest */}
        <div className="flex flex-col items-center text-center mb-6">
          {settings?.logoUrl ? (
            <div className="relative w-44 h-20 rounded-2xl border border-amber-400/30 bg-[#0a0a0c] p-2 flex items-center justify-center overflow-hidden shadow-lg shadow-amber-500/10 mb-3">
              <img
                src={settings.logoUrl}
                alt={settings?.shopName || 'Logo'}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 p-[1px] shadow-lg shadow-amber-500/20 mb-3">
              <div className="w-full h-full bg-[#0a0a0c] rounded-[15px] flex items-center justify-center text-amber-400">
                <Scissors className="w-6 h-6 -rotate-45" />
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-[10px] font-mono font-bold text-amber-300 uppercase tracking-widest mb-1.5">
            <Shield className="w-3.5 h-3.5" />
            AUTENTICAÇÃO TÁTICA // ÁREA ADMINISTRATIVA
          </div>

          <h2 className="font-display font-black text-xl text-white uppercase tracking-wider">
            FERRAZ BARBER CLUB
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Acesso exclusivo para administradores e barbeiros autorizados.
          </p>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className={`mb-4 p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
            isLocked
              ? 'bg-rose-950/50 border-rose-500 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}>
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="font-medium leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-zinc-300 font-display font-bold uppercase tracking-wider text-xs mb-1.5">
              E-MAIL DE ACESSO
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                autoFocus
                placeholder="exemplo@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-300 font-display font-bold uppercase tracking-wider text-xs mb-1.5">
              SENHA DE ACESSO
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Digite sua senha..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-11 py-3 bg-black/50 border border-white/10 rounded-xl text-white text-sm font-mono tracking-widest placeholder:tracking-normal placeholder:text-zinc-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 cursor-pointer"
                title={showPassword ? 'Ocultar' : 'Mostrar'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email.trim() || !password.trim()}
            className="w-full py-3.5 px-4 rounded-xl font-display font-black text-xs uppercase tracking-wider bg-amber-400 text-zinc-950 hover:bg-amber-300 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.25)] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <span>VERIFICANDO CREDENCIAIS...</span>
            ) : (
              <>
                <span>ENTRAR NO SISTEMA</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Shield Notice */}
        <div className="mt-5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 text-[11px] font-mono text-zinc-400 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-zinc-300 flex items-center gap-1.5 font-semibold">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Proteção Anti-Invasão Ativa
            </span>
            <span className="text-emerald-400 font-bold text-[10px] uppercase">Bloqueio Automático</span>
          </div>
          <div className="text-zinc-500 text-[10px] leading-relaxed">
            Limite de 5 tentativas por IP/Conta com bloqueio de 15 minutos em caso de falhas consecutivas. Senhas verificadas com criptografia resistente a timing attacks.
          </div>
        </div>

        {/* Redirect for Customer */}
        <div className="mt-4 pt-4 border-t border-white/10 text-center">
          <a
            href="/agendar"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/agendar');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="text-xs font-mono text-zinc-400 hover:text-amber-400 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            É cliente? Agende seu corte no Portal Online →
          </a>
        </div>
      </div>
    </div>
  );
};
