import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.js';
import { api } from '../../services/api.js';
import { DashboardMetrics, Appointment, AppointmentStatus } from '../../types/index.js';
import { WhatsAppButton } from '../common/WhatsAppButton.js';
import { getOperationDateTime } from '../../utils/datetime.js';
import {
  Calendar,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  UserCheck,
  AlertCircle,
  Clock,
  XCircle,
  Scissors,
  ArrowRight,
  Plus,
  RefreshCw,
  Repeat,
  Zap,
  Activity,
  Flame,
  UserPlus,
  MessageSquareText,
  Send,
  X,
  ShieldAlert,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    openNewAppointmentWith,
    setSelectedCustomerIdForDetail,
    setActiveTab,
    addToast,
    currentUser,
    barbers,
  } = useApp();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Chair filter: defaults to current logged barber's chair, or 'all' if admin
  const [selectedChairFilter, setSelectedChairFilter] = useState<string>(
    currentUser.role === 'BARBER' && currentUser.barberId ? currentUser.barberId : 'all'
  );

  const fetchMetrics = async (chairId?: string) => {
    try {
      setLoading(true);
      const activeFilter = chairId !== undefined ? chairId : selectedChairFilter;
      const targetBarberId = activeFilter !== 'all' ? activeFilter : (currentUser.role === 'BARBER' && currentUser.barberId ? currentUser.barberId : undefined);
      const data = await api.getDashboard(targetBarberId);
      setMetrics(data);
    } catch (err: any) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Erro ao carregar Dashboard',
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChairFilterChange = (chairId: string) => {
    setSelectedChairFilter(chairId);
    fetchMetrics(chairId);
  };

  const [remindersModalOpen, setRemindersModalOpen] = useState(false);
  const [tomorrowAppointments, setTomorrowAppointments] = useState<Appointment[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(false);

  const openRemindersModal = async () => {
    try {
      setLoadingReminders(true);
      setRemindersModalOpen(true);

      // Compute tomorrow's date YYYY-MM-DD
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const params: { date: string; barberId?: string } = { date: tomorrowStr };
      if (currentUser.role === 'BARBER' && currentUser.barberId) {
        params.barberId = currentUser.barberId;
      }

      const apts = await api.getAppointments(params);
      // Filter confirmed or in-progress
      setTomorrowAppointments(apts.filter((a) => a.status === 'CONFIRMED' || a.status === 'IN_PROGRESS'));
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao buscar agendamentos de amanhã',
        message: err.message,
      });
    } finally {
      setLoadingReminders(false);
    }
  };

  useEffect(() => {
    const initialChair =
      currentUser.role === 'BARBER' && currentUser.barberId ? currentUser.barberId : 'all';
    setSelectedChairFilter(initialChair);
    fetchMetrics(initialChair);
  }, [currentUser]);

  const handleStatusChange = async (aptId: string, newStatus: AppointmentStatus) => {
    try {
      setUpdatingId(aptId);
      await api.updateAppointment(aptId, { status: newStatus });
      if (newStatus === 'NO_SHOW') {
        addToast({
          type: 'warning',
          title: 'Falta Registrada (No-Show)',
          message: 'Falta computada no histórico do cliente. Com 2 faltas consecutivas ou acumuladas, o agendamento online é suspenso.',
        });
      } else {
        addToast({
          type: 'success',
          title: 'Status Atualizado',
          message: `Atendimento marcado como ${newStatus === 'IN_PROGRESS' ? 'Em Atendimento' : newStatus === 'COMPLETED' ? 'Concluído' : newStatus}.`,
        });
      }
      await fetchMetrics();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao atualizar',
        message: err.message,
      });
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading && !metrics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-400 space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
        <span className="text-sm font-medium text-zinc-300">
          Carregando dados operacionais...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Matchday Operations Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-[#111114] border border-white/[0.08] shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-1.5 h-10 bg-amber-400 rounded-full shrink-0" />
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Painel Operacional
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Ao Vivo
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 font-normal">
              Controle em tempo real de faturamento, atendimento nas cadeiras e retenção de clientes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            onClick={openRemindersModal}
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/25 transition-all flex items-center gap-2 cursor-pointer"
            title="Relatório de clientes de amanhã para envio de lembretes no WhatsApp"
          >
            <MessageSquareText className="w-4 h-4 text-emerald-400" />
            <span>Lembretes de Amanhã</span>
          </button>
          <button
            onClick={fetchMetrics}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] text-zinc-300 transition-all cursor-pointer"
            title="Atualizar dados operacionais"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
          <button
            onClick={() => openNewAppointmentWith()}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold tracking-tight bg-amber-400 hover:bg-amber-300 text-zinc-950 transition-all flex items-center gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_20px_-4px_rgba(245,158,11,0.3)] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      {/* Quick Chair Filter Bar */}
      <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-[#111114] border border-white/[0.08] shadow-sm flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-400 font-medium">Filtrar por Cadeira:</span>
          <button
            onClick={() => handleChairFilterChange('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedChairFilter === 'all'
                ? 'bg-amber-400 text-zinc-950 font-bold shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/[0.08]'
            }`}
          >
            Todas as Cadeiras
          </button>
          {barbers.map((b, idx) => {
            const isMyChair = currentUser.barberId === b.id;
            const isSelected = selectedChairFilter === b.id;
            return (
              <button
                key={b.id}
                onClick={() => handleChairFilterChange(b.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-amber-400 text-zinc-950 font-bold shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                    : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/[0.08]'
                }`}
              >
                <span>Cadeira 0{idx + 1} ({b.name.split(' ')[0]})</span>
                {isMyChair && (
                  <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                    Minha
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {selectedChairFilter !== 'all' && (
          <div className="text-xs text-amber-300 font-medium flex items-center gap-2 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Exibindo métricas exclusivas da Cadeira 0{barbers.findIndex((b) => b.id === selectedChairFilter) + 1} ({barbers.find((b) => b.id === selectedChairFilter)?.name.split(' ')[0]})
          </div>
        )}
      </div>

      {/* 5 Executive Metric Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Card 1: Faturamento Hoje */}
        <div className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] hover:border-emerald-500/30 transition-all shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
            <span className="font-semibold text-zinc-400 text-xs">
              Faturamento Hoje
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono tracking-tight tabular-nums">
            R$ {metrics?.todayRevenue.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-zinc-400 flex items-center gap-1.5 mt-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-zinc-200 font-medium">{metrics?.todayCompletedCount || 0}</span> cortes concluídos
          </div>
        </div>

        {/* Card 2: Atendimentos Hoje */}
        <div className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] hover:border-amber-400/30 transition-all shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
            <span className="font-semibold text-zinc-400 text-xs">
              Atendimentos Hoje
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-400 border border-amber-400/20">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-zinc-100 font-mono tracking-tight tabular-nums">
            {metrics?.todayAppointmentsCount || 0}
          </div>
          <div className="text-xs text-zinc-400 flex items-center justify-between mt-2.5">
            <span>Concluídos: <strong className="text-emerald-400">{metrics?.todayCompletedCount || 0}</strong></span>
            <span>Restam: <strong className="text-amber-400">{(metrics?.todayAppointmentsCount || 0) - (metrics?.todayCompletedCount || 0)}</strong></span>
          </div>
        </div>

        {/* Card 3: Ticket Médio */}
        <div className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] hover:border-cyan-500/30 transition-all shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
            <span className="font-semibold text-zinc-400 text-xs">
              Ticket Médio
            </span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-cyan-300 font-mono tracking-tight tabular-nums">
            R$ {metrics?.todayAverageTicket.toFixed(2) || '0.00'}
          </div>
          <span className="text-xs text-zinc-400 block mt-2.5">
            Média por corte concluído
          </span>
        </div>

        {/* Card 4: Clientes Novos */}
        <div
          onClick={() => setActiveTab('crm')}
          className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] hover:border-purple-400/30 transition-all cursor-pointer shadow-sm group"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
            <span className="font-semibold text-zinc-400 text-xs">
              Clientes Novos
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-purple-300 font-mono tracking-tight tabular-nums">
            {metrics?.newCustomersCount ?? 0}
          </div>
          <span className="text-xs text-purple-300/80 block mt-2.5 group-hover:text-purple-200 transition-colors">
            Cadastros recentes →
          </span>
        </div>

        {/* Card 5: Radar de Retornos */}
        <div
          onClick={() => setActiveTab('crm')}
          className="p-5 rounded-2xl bg-[#111114] border border-amber-400/30 hover:border-amber-400/60 transition-all cursor-pointer shadow-sm shadow-amber-400/5 col-span-2 md:col-span-1 group"
        >
          <div className="flex items-center justify-between text-amber-400 text-xs mb-3">
            <span className="font-semibold text-amber-400 text-xs">
              Radar de Retornos
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-400/15 flex items-center justify-center text-amber-300 border border-amber-400/30">
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-400 font-mono tracking-tight tabular-nums">
            {metrics?.returnNeededCount || 0}
          </div>
          <span className="text-xs text-amber-300/90 block mt-2.5 font-medium group-hover:text-amber-200 transition-colors">
            21 a 35 dias sem vir →
          </span>
        </div>
      </div>

      {/* Resident Barbers Production */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-400" />
            Desempenho por Cadeira · Hoje
          </span>
          <span className="text-xs font-mono text-zinc-400">
            2 Cadeiras Ativas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics?.barberTodayRevenue.map((b, index) => {
            const totalRev = (metrics?.todayRevenue || 0) > 0 ? metrics.todayRevenue : 1;
            const pct = Math.round((b.revenue / totalRev) * 100);

            return (
              <div
                key={b.barberId}
                className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] hover:border-white/[0.14] transition-all space-y-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-zinc-800/80 border border-white/10 text-amber-400 flex items-center justify-center font-bold text-base shadow-sm">
                      {b.barberName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base text-white">
                          {b.barberName}
                        </h3>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/[0.05] text-amber-300 border border-amber-400/20">
                          Cadeira 0{index + 1}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-400 font-normal">
                        {b.completedCount} cortes executados hoje
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xl font-bold text-emerald-400 font-mono tracking-tight tabular-nums block">
                      R$ {b.revenue.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-normal">
                      {pct}% da produção do dia
                    </span>
                  </div>
                </div>

                {/* Production Bar */}
                <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden border border-white/[0.04]">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(pct, 5)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Operational Timeline & Popular Services */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Appointments Queue (2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          {(() => {
            const { todayStr, formattedDate } = getOperationDateTime();
            const todayQueue = (metrics?.upcomingAppointments || []).filter(
              (apt) =>
                apt.date === todayStr &&
                (apt.status === 'CONFIRMED' || apt.status === 'IN_PROGRESS') &&
                (selectedChairFilter === 'all' || apt.barberId === selectedChairFilter)
            );
            const todayFinishedCount = metrics?.todayCompletedCount || 0;

            return (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <h3 className="font-semibold text-base text-white">
                      Fila de Atendimento de Hoje
                    </h3>
                    <span className="text-xs text-zinc-400">
                      · {formattedDate}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab('agenda')}
                    className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    Abrir Agenda Completa <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {todayQueue.map((apt) => (
                    <div
                      key={apt.id}
                      className="p-4 sm:p-5 rounded-2xl bg-[#111114] border border-white/[0.08] hover:border-white/[0.14] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-sm"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono text-amber-400 font-bold text-sm px-2.5 py-0.5 rounded-lg bg-amber-400/10 border border-amber-400/20 tabular-nums">
                            {apt.time}
                          </span>
                          <button
                            onClick={() => setSelectedCustomerIdForDetail(apt.customerId)}
                            className="font-semibold text-base text-white hover:text-amber-300 transition-colors text-left cursor-pointer"
                          >
                            {apt.customerName}
                          </button>
                          {apt.status === 'CONFIRMED' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                              Confirmado
                            </span>
                          )}
                          {apt.status === 'IN_PROGRESS' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-400/15 text-amber-300 border border-amber-400/30">
                              Em Atendimento
                            </span>
                          )}
                        </div>
                        <div className="text-zinc-400 flex items-center gap-2.5 text-xs">
                          <span>{apt.serviceName} ({apt.durationMinutes} min)</span>
                          <span className="text-zinc-600">·</span>
                          <span>Cadeira: <strong className="text-zinc-200 font-medium">{apt.barberName}</strong></span>
                          <span className="text-zinc-600">·</span>
                          <span className="font-mono text-emerald-400 font-bold tabular-nums">
                            R$ {apt.priceCharged.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Quick Status Transitions & WhatsApp */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <WhatsAppButton
                          phone={apt.customerWhatsapp}
                          customerName={apt.customerName}
                          serviceName={apt.serviceName}
                          barberName={apt.barberName}
                          time={apt.time}
                          date={apt.date}
                          variant="dropdown"
                        />

                        {apt.status === 'CONFIRMED' && (
                          <div className="flex items-center gap-2">
                            <button
                              disabled={updatingId === apt.id}
                              onClick={() => handleStatusChange(apt.id, 'IN_PROGRESS')}
                              className="px-3.5 py-2 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 font-semibold transition-all cursor-pointer text-xs shadow-sm"
                            >
                              Iniciar Atendimento
                            </button>

                            <button
                              disabled={updatingId === apt.id}
                              onClick={() => handleStatusChange(apt.id, 'NO_SHOW')}
                              title="Registrar Falta / No-Show (Faltou sem avisar. 2 faltas bloqueiam agendamento online automático)"
                              className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 font-semibold transition-all cursor-pointer text-xs flex items-center gap-1.5"
                            >
                              <XCircle className="w-3.5 h-3.5 text-rose-400" />
                              Faltou (No-Show)
                            </button>
                          </div>
                        )}

                        {apt.status === 'IN_PROGRESS' && (
                          <button
                            disabled={updatingId === apt.id}
                            onClick={() => handleStatusChange(apt.id, 'COMPLETED')}
                            className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/35 font-semibold transition-all cursor-pointer text-xs shadow-sm"
                          >
                            Concluir
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {todayQueue.length === 0 && (
                    <div className="p-8 sm:p-10 rounded-2xl bg-[#111114] border border-white/[0.08] text-center space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div className="font-semibold text-base text-white">
                        {todayFinishedCount > 0
                          ? `Todos os ${todayFinishedCount} atendimentos de hoje foram finalizados!`
                          : 'Nenhum atendimento na fila para hoje'}
                      </div>
                      <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                        {todayFinishedCount > 0
                          ? 'A grade de hoje está em dia e concluída. Os horários dos próximos dias ficam reservados na aba Agenda.'
                          : 'A fila está livre. Você pode realizar um novo agendamento ou encaixe a qualquer momento.'}
                      </p>
                      <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                        <button
                          onClick={() => openNewAppointmentWith()}
                          className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-amber-400 hover:bg-amber-300 text-zinc-950 transition-all cursor-pointer shadow-md shadow-amber-400/20"
                        >
                          + Novo Agendamento Hoje
                        </button>
                        <button
                          onClick={() => setActiveTab('agenda')}
                          className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.08] transition-all cursor-pointer"
                        >
                          Abrir Agenda Completa →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>

        {/* Popular Services & Operational Control */}
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-4">
            <h3 className="font-semibold text-sm text-zinc-200 flex items-center gap-2">
              <Scissors className="w-4 h-4 text-amber-400" />
              Serviços Mais Procurados
            </h3>

            <div className="space-y-2.5 text-xs">
              {metrics?.popularServices.map((srv, idx) => (
                <div
                  key={srv.serviceName}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]"
                >
                  <span className="text-zinc-200 font-medium truncate">
                    {idx + 1}. {srv.serviceName}
                  </span>
                  <span className="font-mono text-amber-400 font-semibold px-2 py-0.5 rounded-md bg-white/[0.04] border border-amber-400/20 tabular-nums">
                    {srv.count} cortes
                  </span>
                </div>
              ))}

              {(!metrics?.popularServices || metrics.popularServices.length === 0) && (
                <div className="text-zinc-500 text-xs text-center py-4">
                  Dados em consolidação.
                </div>
              )}
            </div>
          </div>

          {/* Cancellations & No-Shows Tracker */}
          <div className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-4 text-xs">
            <h3 className="font-semibold text-sm text-zinc-200">
              Controle de Ocorrências (Hoje)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <span className="text-zinc-400 text-xs font-medium block">
                  Cancelamentos
                </span>
                <span className="text-2xl font-bold font-mono text-white block mt-1.5 tabular-nums">
                  {metrics?.todayCancellationsCount || 0}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <span className="text-rose-400 text-xs font-medium block">
                  Não Compareceu
                </span>
                <span className="text-2xl font-bold font-mono text-rose-400 block mt-1.5 tabular-nums">
                  {metrics?.todayNoShowCount || 0}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Auditoria estrita: cancelamentos e faltas são isolados do faturamento para precisão contábil.
            </p>
          </div>
        </div>
      </div>

      {/* Relatório de Lembretes do Dia Seguinte (Modal Rápido) */}
      {remindersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-[#141418] border border-white/[0.1] rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <MessageSquareText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-white">
                    Lembretes de Amanhã · WhatsApp
                  </h3>
                  <span className="text-xs text-zinc-400">
                    Disparo em 1 clique com mensagem pré-formatada no WhatsApp
                  </span>
                </div>
              </div>
              <button
                onClick={() => setRemindersModalOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white bg-white/[0.04] border border-white/[0.08] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingReminders ? (
              <div className="py-12 text-center text-zinc-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                <span className="text-xs">Buscando agendamentos do dia seguinte...</span>
              </div>
            ) : tomorrowAppointments.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="font-semibold text-white text-base">
                  Nenhum agendamento pendente para amanhã
                </h4>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  {currentUser.role === 'BARBER'
                    ? `Sua cadeira (${currentUser.name}) está livre para o dia seguinte.`
                    : 'A grade de todas as cadeiras está sem agendamentos confirmados para amanhã.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-zinc-400 pb-1">
                  <span>Total de clientes para amanhã: <strong className="text-white">{tomorrowAppointments.length}</strong></span>
                  <span className="text-emerald-400 font-medium">1 toque para abrir o WhatsApp</span>
                </div>

                <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {tomorrowAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-amber-400 font-semibold px-2 py-0.5 rounded-lg bg-amber-400/10 border border-amber-400/20 text-xs">
                            {apt.time}
                          </span>
                          <strong className="text-white text-sm font-semibold">
                            {apt.customerName}
                          </strong>
                        </div>
                        <div className="text-zinc-400 text-xs flex items-center gap-2">
                          <span>{apt.serviceName}</span>
                          <span>·</span>
                          <span>Barbeiro: <strong className="text-zinc-200">{apt.barberName}</strong></span>
                          <span>·</span>
                          <span className="text-emerald-400 font-semibold font-mono">R$ {apt.priceCharged.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="self-end sm:self-center">
                        <WhatsAppButton
                          phone={apt.customerWhatsapp}
                          customerName={apt.customerName}
                          serviceName={apt.serviceName}
                          barberName={apt.barberName}
                          time={apt.time}
                          date={apt.date}
                          variant="button"
                          defaultTemplate="reminder"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-zinc-500">
              <span className="italic">"Da quebrada, para o mundo"</span>
              <button
                onClick={() => setRemindersModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 font-semibold text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
