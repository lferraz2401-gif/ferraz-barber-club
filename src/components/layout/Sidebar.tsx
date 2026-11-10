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
  ChevronRight,
  ShieldAlert,
  MessageSquare,
} from 'lucide-react';

interface NavItem {
  id: NavTab;
  label: string;
  shortLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  tag?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, currentUser, barbers } = useApp();

  const sections: NavSection[] = [
    {
      title: 'CENTRAL OPERACIONAL',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, tag: 'LIVE' },
        { id: 'agenda', label: 'Agenda & Atendimento', icon: Calendar },
        { id: 'whatsapp', label: 'WhatsApp & Lembretes', icon: MessageSquare, tag: 'DISPARO' },
        { id: 'clients', label: 'Clientes', icon: Users },
        { id: 'crm', label: 'Radar de Retornos', icon: Repeat },
      ],
    },
    {
      title: 'GESTÃO & FINANÇAS',
      items: [
        { id: 'financial', label: 'Gestão Financeira', icon: DollarSign },
        { id: 'services', label: 'Catálogo de Serviços', icon: Scissors },
        { id: 'barbers', label: 'Equipe Residente', icon: UserCheck, tag: '2 PRO' },
      ],
    },
    {
      title: 'CONTROLE & AJUSTES',
      items: [
        { id: 'schedule', label: 'Horários & Bloqueios', icon: CalendarX2 },
        { id: 'settings', label: 'Configurações', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="hidden md:flex w-64 bg-[#0c0d11]/70 border-r border-white/[0.08] flex-col shrink-0 min-h-[calc(100vh-4rem)] select-none">
      {/* Operating User Card */}
      <div className="px-4 py-3.5 border-b border-white/[0.08] bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Operação Conectada
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-300 font-medium border border-white/[0.08]">
            {currentUser.role === 'ADMIN' ? 'Gerência' : 'Barbeiro'}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-semibold text-sm text-zinc-100 truncate">
            {currentUser.name}
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            FBC v3
          </span>
        </div>
      </div>

      {/* Main Navigation Menu */}
      <nav className="flex-1 p-3 space-y-5 overflow-y-auto">
        {sections.map((sec) => (
          <div key={sec.title} className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
              {sec.title}
            </div>
            {sec.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left group cursor-pointer transition-all duration-150 relative ${
                    isActive
                      ? 'bg-amber-400/[0.09] text-amber-300 border border-amber-400/25 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? 'text-amber-400'
                        : 'text-zinc-500 group-hover:text-zinc-300'
                    }`}
                  />

                  <span className={`flex-1 truncate text-xs ${
                    isActive ? 'font-semibold text-zinc-100' : 'font-medium text-zinc-400 group-hover:text-zinc-200'
                  }`}>
                    {item.label}
                  </span>

                  {item.tag && (
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md font-semibold ${
                        item.tag === 'LIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-white/[0.05] text-zinc-400 border border-white/[0.06]'
                      }`}
                    >
                      {item.tag}
                    </span>
                  )}

                  {isActive && (
                    <ChevronRight className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Resident Barbers Quick Roster Indicator */}
      <div className="p-3.5 m-3 rounded-2xl bg-[#141418] border border-white/[0.08] text-xs space-y-2.5">
        <div className="flex items-center justify-between text-zinc-400 text-[10px] font-medium">
          <span className="text-zinc-300 font-semibold tracking-wide">Cadeiras Residentes</span>
          <span className="text-emerald-400 font-mono font-medium">2 Ativas</span>
        </div>

        <div className="space-y-1.5 pt-0.5">
          {barbers.map((b, idx) => (
            <div
              key={b.id}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/[0.04] text-[11px]"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: b.color }}
                />
                <span className="font-medium text-zinc-200">
                  Cadeira 0{idx + 1} · {b.name.split(' ')[0]}
                </span>
              </div>
              <span className="font-mono text-[10px] text-zinc-400 tabular-nums">
                {b.startTime} - {b.endTime}
              </span>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-zinc-500">
          <span className="italic text-zinc-400">"Da quebrada, para o mundo"</span>
          <span className="text-zinc-500 font-mono">v3.0</span>
        </div>
      </div>
    </aside>
  );
};
