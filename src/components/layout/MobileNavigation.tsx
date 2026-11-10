import React from 'react';
import { useApp, NavTab } from '../../context/AppContext.js';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Repeat,
  DollarSign,
  Scissors,
  UserCheck,
  CalendarX2,
  Settings,
  X,
  Globe,
  Plus,
  Shield,
  User as UserIcon,
  MessageSquare,
} from 'lucide-react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNavigation: React.FC<MobileDrawerProps> = ({ isOpen, onClose }) => {
  const { activeTab, setActiveTab, currentUser, barbers, openNewAppointmentWith } = useApp();

  const primaryTabs: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Hoje', icon: LayoutDashboard },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'whatsapp', label: 'Whats', icon: MessageSquare },
    { id: 'financial', label: 'Valores', icon: DollarSign },
  ];

  const allNavItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }>; category: string }[] = [
    { id: 'dashboard', label: 'Dashboard do Dia', icon: LayoutDashboard, category: 'Operação' },
    { id: 'agenda', label: 'Agenda & Atendimento', icon: Calendar, category: 'Operação' },
    { id: 'whatsapp', label: 'Central do WhatsApp & Lembretes', icon: MessageSquare, category: 'Operação' },
    { id: 'financial', label: 'Gestão Financeira & Caixa', icon: DollarSign, category: 'Financeiro' },
    { id: 'clients', label: 'Clientes Cadastrados', icon: Users, category: 'Operação' },
    { id: 'crm', label: 'Radar de Retornos', icon: Repeat, category: 'Operação' },
    { id: 'services', label: 'Catálogo de Serviços', icon: Scissors, category: 'Configuração' },
    { id: 'barbers', label: 'Equipe de Barbeiros', icon: UserCheck, category: 'Configuração' },
    { id: 'schedule', label: 'Horários & Bloqueios', icon: CalendarX2, category: 'Configuração' },
    { id: 'settings', label: 'Configurações da Barbearia', icon: Settings, category: 'Configuração' },
  ];

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. FIXED BOTTOM BAR FOR MOBILE */}
      {/* ========================================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0c0d11]/95 border-t border-white/[0.08] backdrop-blur-2xl px-3 py-2 shadow-2xl select-none">
        <div className="grid grid-cols-5 items-center gap-1.5">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  onClose();
                }}
                className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? 'text-amber-400 bg-amber-400/10 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.75]'}`} />
                <span className="text-[10px] font-medium tracking-tight mt-0.5">
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* Quick Action Button: Novo Agendamento */}
          <button
            onClick={() => {
              openNewAppointmentWith();
              onClose();
            }}
            className="flex flex-col items-center justify-center py-1.5 rounded-xl bg-amber-400 text-zinc-950 font-semibold transition-all shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_15px_rgba(245,158,11,0.25)] active:scale-95 cursor-pointer"
            title="Novo Agendamento Rápido"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span className="text-[10px] tracking-tight leading-none mt-0.5">
              +Agendar
            </span>
          </button>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* 2. FULL DRAWER MODAL */}
      {/* ========================================================================= */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />

          {/* Drawer Sheet */}
          <div className="relative w-4/5 max-w-xs bg-[#111114] border-r border-white/[0.08] h-full flex flex-col z-10 shadow-2xl overflow-y-auto">
            {/* Header */}
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
              <div>
                <span className="text-[10px] font-mono text-amber-400 font-semibold tracking-wider block">
                  FERRAZ BARBER CLUB
                </span>
                <div className="font-semibold text-white text-base">
                  Menu Operacional
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-zinc-400 hover:text-white bg-white/[0.05] border border-white/[0.08] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Pill */}
            <div className="p-3 mx-3 my-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-400/10 text-amber-400 flex items-center justify-center font-bold">
                  {currentUser.role === 'ADMIN' ? <Shield className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                </div>
                <div>
                  <div className="font-semibold text-white text-xs">
                    {currentUser.name}
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {currentUser.role === 'ADMIN' ? 'Gerência Geral' : 'Cadeira Residente'}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation List */}
            <div className="flex-1 p-3 space-y-1">
              {allNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      onClose();
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-400 text-zinc-950 font-semibold shadow-md shadow-amber-400/20'
                        : 'text-zinc-300 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-zinc-950' : 'text-amber-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Public Link Shortcut */}
            <div className="p-3 border-t border-white/[0.08] space-y-2 bg-white/[0.02]">
              <a
                href="/agendar"
                onClick={(e) => {
                  e.preventDefault();
                  onClose();
                  window.history.pushState({}, '', '/agendar');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-zinc-200 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] transition-colors"
              >
                <Globe className="w-4 h-4 text-amber-400" />
                <span>Portal de Agendamento</span>
              </a>

              <div className="text-center text-[10px] font-mono text-zinc-500 pt-1">
                "Da quebrada, para o mundo"
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
