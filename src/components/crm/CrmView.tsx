import React, { useState, useEffect } from 'react';
import { Customer } from '../../types/index.js';
import { api } from '../../services/api.js';
import { useApp } from '../../context/AppContext.js';
import { WhatsAppButton } from '../common/WhatsAppButton.js';
import {
  Repeat,
  Clock,
  AlertTriangle,
  CheckCircle,
  Phone,
  Calendar,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Zap,
} from 'lucide-react';

export const CrmView: React.FC = () => {
  const { barbers, openNewAppointmentWith, setSelectedCustomerIdForDetail, addToast } = useApp();
  const [activeTab, setActiveTab] = useState<'returnNeeded' | 'inactive' | 'recent'>('returnNeeded');
  const [data, setData] = useState<{
    recent: Customer[];
    returnNeeded: Customer[];
    inactive: Customer[];
    totalCount: number;
    returnNeededCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCrm = async () => {
    try {
      setLoading(true);
      const res = await api.getCrmData();
      setData(res);
    } catch (err: any) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Erro CRM',
        message: 'Não foi possível carregar os dados de retorno.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCrm();
  }, []);

  const getListForCurrentTab = () => {
    if (!data) return [];
    let list: Customer[] = [];
    if (activeTab === 'returnNeeded') list = data.returnNeeded;
    else if (activeTab === 'inactive') list = data.inactive;
    else list = data.recent;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.whatsapp.includes(term.replace(/\D/g, ''))
      );
    }
    return list;
  };

  const list = getListForCurrentTab();

  const getDaysAgo = (dateStr?: string) => {
    if (!dateStr) return null;
    const past = new Date(`${dateStr}T12:00:00`);
    const today = new Date();
    return Math.floor((today.getTime() - past.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111114] p-5 sm:p-6 rounded-2xl border border-white/[0.08] shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Repeat className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg sm:text-xl font-bold text-zinc-100 tracking-tight">
                Radar de Retorno & CRM
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                Retenção Ativa
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Ciclo de corte e reativação inteligente de clientes via WhatsApp.
            </p>
          </div>
        </div>

        <button
          onClick={fetchCrm}
          className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.16] text-zinc-400 hover:text-white transition-all cursor-pointer self-start sm:self-auto"
          title="Recarregar base de CRM"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
        </button>
      </div>

      {/* Logic Segment Filter Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tab 1: Precisam Retornar (21 - 35 dias) */}
        <button
          onClick={() => setActiveTab('returnNeeded')}
          className={`p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden shadow-sm ${
            activeTab === 'returnNeeded'
              ? 'bg-amber-500/[0.08] border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.08)]'
              : 'bg-[#111114] border-white/[0.08] hover:border-white/[0.16]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Clock className="w-4 h-4" />
              Retorno Pendente (21–35d)
            </span>
            <span className="text-3xl font-bold font-mono text-amber-400 tabular-nums">
              {data?.returnNeeded.length || 0}
            </span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Período ideal para alinhamento e disfarce. Momento certeiro de reconvocar.
          </p>
        </button>

        {/* Tab 2: Atrasados / Inativos (36+ dias) */}
        <button
          onClick={() => setActiveTab('inactive')}
          className={`p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden shadow-sm ${
            activeTab === 'inactive'
              ? 'bg-rose-500/[0.08] border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.08)]'
              : 'bg-[#111114] border-white/[0.08] hover:border-white/[0.16]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" />
              Atrasados (+35 dias)
            </span>
            <span className="text-3xl font-bold font-mono text-rose-400 tabular-nums">
              {data?.inactive.length || 0}
            </span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Risco de perda para concorrência. Envie mensagem estratégica de resgate.
          </p>
        </button>

        {/* Tab 3: Recentes (0 - 20 dias) */}
        <button
          onClick={() => setActiveTab('recent')}
          className={`p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden shadow-sm ${
            activeTab === 'recent'
              ? 'bg-emerald-500/[0.08] border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.08)]'
              : 'bg-[#111114] border-white/[0.08] hover:border-white/[0.16]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
              <CheckCircle className="w-4 h-4" />
              Cortes Recentes (0–20d)
            </span>
            <span className="text-3xl font-bold font-mono text-emerald-400 tabular-nums">
              {data?.recent.length || 0}
            </span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Clientes com corte em dia. Alta satisfação e histórico regular.
          </p>
        </button>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-400" />
        <input
          type="text"
          placeholder="Buscar cliente nesta categoria por nome ou WhatsApp..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#111114] border border-white/[0.08] rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-400 font-mono transition-colors shadow-sm"
        />
      </div>

      {/* CRM Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {list.map((cust) => {
          const daysAgo = getDaysAgo(cust.lastVisit);

          return (
            <div
              key={cust.id}
              className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] hover:border-white/[0.16] transition-all flex flex-col justify-between gap-4 text-xs shadow-sm hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <button
                      onClick={() => setSelectedCustomerIdForDetail(cust.id)}
                      className="font-semibold text-base text-zinc-100 hover:text-amber-400 transition-colors text-left cursor-pointer tracking-tight"
                    >
                      {cust.name}
                    </button>
                    <span className="font-mono text-xs text-zinc-400 block mt-0.5">
                      {cust.whatsapp}
                    </span>
                  </div>

                  <span
                    className={`text-[11px] font-mono px-2.5 py-0.5 rounded-md font-medium whitespace-nowrap ${
                      activeTab === 'returnNeeded'
                        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        : activeTab === 'inactive'
                        ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    }`}
                  >
                    {daysAgo !== null ? `${daysAgo} dias sem cortar` : 'Novo Cliente'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-white/[0.06] text-xs font-mono text-zinc-400">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-sans">Última Visita</span>
                    <span className="font-medium text-zinc-200 mt-0.5 block">
                      {cust.lastVisit || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-sans">Total Cortes</span>
                    <span className="font-medium text-zinc-200 mt-0.5 block tabular-nums">
                      {cust.totalVisits}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-sans">Cadeira Pref.</span>
                    <span className="truncate block font-medium text-amber-400 mt-0.5">
                      {cust.preferredBarberName || 'Rotativo'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Fast Booking + WhatsApp */}
              <div className="flex items-center justify-between pt-3.5 border-t border-white/[0.06]">
                <button
                  onClick={() => openNewAppointmentWith({ customerId: cust.id })}
                  className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-amber-500/10 text-amber-400 border border-white/[0.08] hover:border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  Agendar Horário
                </button>

                <WhatsAppButton
                  phone={cust.whatsapp}
                  customerName={cust.name}
                  barberName={cust.preferredBarberName || (barbers && barbers[0]?.name) || 'Barbeiro'}
                  variant="button"
                />
              </div>
            </div>
          );
        })}

        {list.length === 0 && (
          <div className="col-span-full p-12 text-center text-zinc-400 text-sm font-mono rounded-2xl bg-[#111114] border border-white/[0.08]">
            Nenhum cliente registrado nesta categoria no momento.
          </div>
        )}
      </div>
    </div>
  );
};
