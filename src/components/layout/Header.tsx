import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.js';
import { Scissors, Plus, User, Shield, Clock, Check, Radio, Globe, Menu, LogOut } from 'lucide-react';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { currentUser, setCurrentUser, availableUsers, openNewAppointmentWith, settings } = useApp();
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setDateStr(
        now.toLocaleDateString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          weekday: 'short',
          day: '2-digit',
          month: 'short',
        })
      );
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#0c0d11]/95 border-b border-white/[0.08] backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between shadow-sm">
      {/* Brand & Concept */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Mobile Hamburger Button */}
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="md:hidden p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white transition-all cursor-pointer"
            title="Abrir menu de navegação"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Brand Crest / Custom Logo Badge */}
        {settings?.logoUrl ? (
          <div className="relative h-10 w-16 sm:w-20 rounded-xl border border-amber-400/30 bg-[#141418] p-1 flex items-center justify-center overflow-hidden shadow-sm">
            <img
              src={settings.logoUrl}
              alt={settings?.shopName || 'Logo'}
              className="w-full h-full object-contain"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0c0d11]" />
          </div>
        ) : (
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 p-[1px] shadow-sm shadow-amber-500/10">
            <div className="w-full h-full bg-[#141418] rounded-[11px] flex items-center justify-center text-amber-400">
              <Scissors className="w-5 h-5 -rotate-45" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0c0d11]" />
          </div>
        )}

        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display font-bold text-base sm:text-lg tracking-tight text-white leading-none">
              FERRAZ <span className="text-amber-400 font-extrabold">BARBER CLUB</span>
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono font-medium text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Operacional Ativo
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 font-normal tracking-tight mt-0.5">
            Gestão Operacional · "Da quebrada, para o mundo"
          </p>
        </div>
      </div>

      {/* Right Controls: Clock, Quick Booking, Profile Switcher */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Real-time São Paulo Clock */}
        <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          <span className="font-mono font-semibold text-zinc-100 tabular-nums">{timeStr}</span>
          <span className="text-zinc-600">·</span>
          <span className="capitalize text-zinc-400 text-xs font-normal">{dateStr}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.05] text-zinc-400 border border-white/[0.06]">
            SP
          </span>
        </div>

        {/* Link / Portal Público de Agendamento */}
        <a
          href="/agendar"
          onClick={(e) => {
            e.preventDefault();
            window.history.pushState({}, '', '/agendar');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] transition-all cursor-pointer"
          title="Abrir o Portal Público de Agendamento dos Clientes (/agendar)"
        >
          <Globe className="w-3.5 h-3.5 text-amber-400" />
          <span>Portal de Agendamento</span>
        </a>

        {/* Quick New Appointment Button */}
        <button
          id="btn-header-new-appointment"
          onClick={() => openNewAppointmentWith()}
          className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold tracking-tight bg-amber-400 hover:bg-amber-300 text-zinc-950 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_20px_-4px_rgba(245,158,11,0.3)] active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline">Novo Agendamento</span>
          <span className="sm:hidden">Agendar</span>
        </button>

        {/* User Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] transition-all text-left text-xs cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-zinc-800/80 flex items-center justify-center text-amber-400 shrink-0 border border-white/10">
              {currentUser.role === 'ADMIN' ? (
                <Shield className="w-3.5 h-3.5" />
              ) : (
                <User className="w-3.5 h-3.5 text-cyan-400" />
              )}
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <div className="font-semibold text-white truncate max-w-[120px] text-xs">
                {currentUser.name.split(' ')[0]}
              </div>
              <div className="text-[10px] text-zinc-400 font-medium">
                {currentUser.role === 'ADMIN' ? 'Gerência' : 'Barbeiro'}
              </div>
            </div>
          </button>

          {userDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#141418] border border-white/[0.1] shadow-2xl z-50 p-1.5 text-xs backdrop-blur-xl">
                {currentUser.role === 'ADMIN' ? (
                  <>
                    <div className="px-3 py-2 text-[11px] font-semibold text-zinc-400 border-b border-white/[0.06]">
                      Alternar Visão de Operador:
                    </div>
                    <div className="py-1 space-y-0.5">
                      {availableUsers.map((u) => {
                        const isActive = u.id === currentUser.id;
                        return (
                          <button
                            key={u.id}
                            onClick={() => {
                              setCurrentUser(u);
                              setUserDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                              isActive
                                ? 'bg-amber-400/10 text-amber-300 font-medium'
                                : 'text-zinc-300 hover:bg-white/[0.05]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              {u.role === 'ADMIN' ? (
                                <Shield className="w-4 h-4 text-amber-400" />
                              ) : (
                                <User className="w-4 h-4 text-cyan-400" />
                              )}
                              <div>
                                <div className="font-semibold text-white text-xs">
                                  {u.name}
                                </div>
                                <span className="text-[10px] text-zinc-400 font-normal">
                                  {u.role === 'ADMIN' ? 'Administrador' : 'Barbeiro Residente'}
                                </span>
                              </div>
                            </div>
                            {isActive && <Check className="w-4 h-4 text-amber-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="px-3.5 py-2.5 text-xs border-b border-white/[0.06] space-y-1">
                    <span className="text-[10px] text-zinc-400 font-medium block">Operador Autenticado:</span>
                    <strong className="text-white font-semibold block text-sm">{currentUser.name}</strong>
                    <span className="text-[11px] text-amber-400 font-mono">PIN Individual Ativo</span>
                  </div>
                )}

                <div className="pt-1 mt-1 border-t border-white/[0.06]">
                  <button
                    onClick={() => {
                      sessionStorage.removeItem('fbc_staff_auth');
                      window.location.reload();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Bloquear Painel (Sair)</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
