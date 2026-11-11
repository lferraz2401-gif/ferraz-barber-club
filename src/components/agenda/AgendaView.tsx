import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext.js';
import { api } from '../../services/api.js';
import { Appointment, Barber, ScheduleBlock, AppointmentStatus, PaymentMethod } from '../../types/index.js';
import { WhatsAppButton } from '../common/WhatsAppButton.js';
import { getOperationDateTime, isPastDateTime, timeToMinutes } from '../../utils/datetime.js';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  RefreshCw,
  User,
  Coffee,
  Ban,
  CheckCircle2,
  XCircle,
  Scissors,
  DollarSign,
  AlertTriangle,
  Lock,
  ShieldAlert,
  LayoutList,
  CalendarDays,
  Search,
  Filter,
  Check,
  TrendingUp,
  UserCheck,
  ExternalLink,
  Phone,
  Sparkles,
  CreditCard,
  Banknote,
  QrCode,
  Percent,
} from 'lucide-react';

function getEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const total = h * 60 + m + durationMinutes;
  const endH = Math.floor(total / 60);
  const endM = total % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

export const AgendaView: React.FC = () => {
  const {
    barbers,
    openNewAppointmentWith,
    setSelectedCustomerIdForDetail,
    currentUser,
    addToast,
  } = useApp();

  const { todayStr, nowMinutes, nowTimeStr } = getOperationDateTime();

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedBarberFilter, setSelectedBarberFilter] = useState<string>(
    currentUser.role === 'BARBER' && currentUser.barberId ? currentUser.barberId : 'all'
  );
  const [viewMode, setViewMode] = useState<'cards' | 'grid'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED'>('ALL');

  useEffect(() => {
    if (currentUser.role === 'BARBER' && currentUser.barberId) {
      setSelectedBarberFilter(currentUser.barberId);
    }
  }, [currentUser]);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Detail / Action modal for an appointment
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);

  // Quick Checkout / Caixa modal for closing appointment
  const [checkoutApt, setCheckoutApt] = useState<Appointment | null>(null);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<PaymentMethod>('PIX');
  const [checkoutPrice, setCheckoutPrice] = useState<number>(0);
  const [checkoutCommissionRate, setCheckoutCommissionRate] = useState<number>(50);

  const fetchAgenda = async () => {
    try {
      setLoading(true);
      const [aptsData, blocksData] = await Promise.all([
        api.getAppointments({ date: selectedDate }),
        api.getBlocks(),
      ]);
      setAppointments(aptsData);
      setBlocks(blocksData);
    } catch (err: any) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Erro na Agenda',
        message: 'Não foi possível carregar os agendamentos.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgenda();

    // Auto-sync: automatically update agenda when a new appointment is created
    const interval = setInterval(fetchAgenda, 15000);
    const handleUpdate = () => fetchAgenda();
    window.addEventListener('appointment-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('focus', handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('appointment-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, [selectedDate]);

  const handlePrevDay = () => {
    const d = new Date(`${selectedDate}T12:00:00`);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(`${selectedDate}T12:00:00`);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(getOperationDateTime().todayStr);
  };

  const handleStatusUpdate = async (aptId: string, status: AppointmentStatus) => {
    if (status === 'COMPLETED') {
      const target = appointments.find((a) => a.id === aptId) || selectedApt;
      if (target) {
        setCheckoutApt(target);
        setCheckoutPaymentMethod(target.paymentMethod || (target.priceCharged === 0 ? 'CLUB_PLAN' : 'PIX'));
        setCheckoutPrice(target.priceCharged || 0);
        const b = barbers.find((barber) => barber.id === target.barberId);
        setCheckoutCommissionRate(target.commissionRate ?? (b?.defaultCommissionRate ?? 50));
        return;
      }
    }

    try {
      setUpdatingId(aptId);
      await api.updateAppointment(aptId, { status });
      if (status === 'NO_SHOW') {
        addToast({
          type: 'warning',
          title: 'Falta Registrada (No-Show)',
          message: 'Falta computada no histórico do cliente. Com 2 faltas consecutivas ou acumuladas, o agendamento online é suspenso.',
        });
      } else {
        addToast({
          type: 'success',
          title: 'Status Atualizado',
          message: `Atendimento alterado para ${status === 'IN_PROGRESS' ? 'Em Atendimento' : status}.`,
        });
      }
      setSelectedApt(null);
      await fetchAgenda();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao atualizar status',
        message: err.message,
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmCheckout = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!checkoutApt) return;
    try {
      setUpdatingId(checkoutApt.id);
      const price = Number(checkoutPrice) || 0;
      const rate = Number(checkoutCommissionRate) ?? 50;
      const commissionAmount = Math.round(((price * rate) / 100) * 100) / 100;
      const shopAmount = Math.round((price - commissionAmount) * 100) / 100;

      await api.updateAppointment(checkoutApt.id, {
        status: 'COMPLETED',
        paymentMethod: checkoutPaymentMethod,
        priceCharged: price,
        commissionRate: rate,
        commissionAmount,
        shopAmount,
      });
      addToast({
        type: 'success',
        title: 'Atendimento Finalizado!',
        message: `Recebimento de R$ ${Number(checkoutPrice).toFixed(2)} via ${checkoutPaymentMethod} registrado no fechamento de caixa.`,
      });
      setCheckoutApt(null);
      setSelectedApt(null);
      await fetchAgenda();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao finalizar atendimento',
        message: err.message,
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const displayedBarbers = barbers.filter((b) => {
    if (selectedBarberFilter === 'all') return true;
    return b.id === selectedBarberFilter;
  });

  // Formatted date label
  const formattedDateLabel = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dt = new Date(y, m - 1, d, 12, 0, 0);
      const weekday = dt.toLocaleDateString('pt-BR', { weekday: 'long' });
      const day = dt.getDate();
      const month = dt.toLocaleDateString('pt-BR', { month: 'long' });
      const year = dt.getFullYear();
      return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${day} de ${month} de ${year}`;
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Daily KPIs (Scoped strictly to the selected chair/barber filter)
  const dailyKPIs = useMemo(() => {
    const relevantApts = appointments.filter((a) => {
      if (selectedBarberFilter !== 'all' && a.barberId !== selectedBarberFilter) {
        return false;
      }
      return true;
    });

    const activeApts = relevantApts.filter((a) => a.status !== 'CANCELLED');
    const confirmedCount = relevantApts.filter((a) => a.status === 'CONFIRMED').length;
    const inProgressCount = relevantApts.filter((a) => a.status === 'IN_PROGRESS').length;
    const completedCount = relevantApts.filter((a) => a.status === 'COMPLETED').length;
    const noShowCount = relevantApts.filter((a) => a.status === 'NO_SHOW').length;
    const cancelledCount = relevantApts.filter((a) => a.status === 'CANCELLED').length;
    const revenueCompleted = relevantApts
      .filter((a) => a.status === 'COMPLETED')
      .reduce((sum, a) => sum + (a.priceCharged || 0), 0);
    const revenueExpected = relevantApts
      .filter((a) => a.status !== 'CANCELLED')
      .reduce((sum, a) => sum + (a.priceCharged || 0), 0);

    return {
      totalActive: activeApts.length,
      confirmedCount,
      inProgressCount,
      completedCount,
      noShowCount,
      cancelledCount,
      revenueCompleted,
      revenueExpected,
    };
  }, [appointments, selectedBarberFilter]);

  // Filtered appointments by search and status
  const filterAppointment = (apt: Appointment) => {
    if (statusFilter !== 'ALL' && apt.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const nameMatch = apt.customerName.toLowerCase().includes(q);
      const phoneMatch = apt.customerWhatsapp.replace(/\D/g, '').includes(q.replace(/\D/g, ''));
      const serviceMatch = apt.serviceName.toLowerCase().includes(q);
      if (!nameMatch && !phoneMatch && !serviceMatch) return false;
    }
    return true;
  };

  // Time grid definition: 09:00 to 21:00 in 15-min intervals (for grid mode)
  const timeSlots: string[] = [];
  for (let hour = 9; hour <= 20; hour++) {
    timeSlots.push(`${String(hour).padStart(2, '0')}:00`);
    timeSlots.push(`${String(hour).padStart(2, '0')}:15`);
    timeSlots.push(`${String(hour).padStart(2, '0')}:30`);
    timeSlots.push(`${String(hour).padStart(2, '0')}:45`);
  }
  timeSlots.push('21:00');

  const startGridMinutes = 9 * 60; // 09:00 = 540 min
  const endGridMinutes = 21 * 60; // 21:00 = 1260 min
  const PIXELS_PER_15_MIN = 38;
  const PIXELS_PER_MINUTE = PIXELS_PER_15_MIN / 15;

  const isSelectedDateToday = selectedDate === todayStr;
  const isPastDate = selectedDate < todayStr;
  const currentNowTop =
    isSelectedDateToday && nowMinutes >= startGridMinutes && nowMinutes <= endGridMinutes
      ? (nowMinutes - startGridMinutes) * PIXELS_PER_MINUTE
      : null;

  // Calculate quick vacant slots for each barber (up to 6 suggestions)
  const getFreeSlotsForBarber = (barber: Barber, bApts: Appointment[]) => {
    const startMin = timeToMinutes(barber.startTime || '09:00');
    const endMin = timeToMinutes(barber.endTime || '20:00');
    const lunchStart = timeToMinutes(barber.lunchStart || '12:00');
    const lunchEnd = timeToMinutes(barber.lunchEnd || '13:30');

    const busy = bApts
      .filter((a) => a.status !== 'CANCELLED')
      .map((a) => ({
        start: timeToMinutes(a.time),
        end: timeToMinutes(a.time) + (a.durationMinutes || 30),
      }));

    const free: string[] = [];
    for (let m = startMin; m + 30 <= endMin; m += 30) {
      if (isSelectedDateToday && m <= nowMinutes) continue;
      if (Math.max(m, lunchStart) < Math.min(m + 30, lunchEnd)) continue;
      const conflict = busy.some((b) => Math.max(m, b.start) < Math.min(m + 30, b.end));
      if (!conflict) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        free.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
      }
    }
    return free.slice(0, 6);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header de Controle e Navegação da Data */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#111114] border border-white/[0.08] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-sm">
        {/* Date Navigator */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center rounded-xl bg-white/[0.03] border border-white/[0.08] p-1">
            <button
              onClick={handlePrevDay}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Dia anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className={`px-3 py-1.5 text-xs font-semibold tracking-tight transition-colors cursor-pointer rounded-lg ${
                isSelectedDateToday ? 'bg-amber-400/10 text-amber-300' : 'text-zinc-300 hover:text-white'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={handleNextDay}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Próximo dia"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs">
            <CalendarIcon className="w-4 h-4 text-amber-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
            />
          </div>

          {isSelectedDateToday && (
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Hoje
            </span>
          )}

          {isPastDate && (
            <span className="px-2.5 py-1 rounded-full bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 text-xs font-medium flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-zinc-400" /> Histórico Passado
            </span>
          )}
        </div>

        {/* View Mode Toggle & New Appointment Button */}
        <div className="flex items-center gap-3 flex-wrap justify-between md:justify-end">
          {/* View Mode Segmented Control: Cartões vs Grade */}
          <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/[0.08] text-xs">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                viewMode === 'cards'
                  ? 'bg-amber-400 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Visualização em cartões por cadeira com todos os clientes do dia"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Cartões ({appointments.length})</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                viewMode === 'grid'
                  ? 'bg-amber-400 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Visualização em grade horária de 15 em 15 minutos"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Grade Horária</span>
            </button>
          </div>

          <button
            onClick={fetchAgenda}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] text-zinc-300 transition-all cursor-pointer"
            title="Recarregar grade"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            onClick={() => openNewAppointmentWith({ date: selectedDate })}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold tracking-tight bg-amber-400 hover:bg-amber-300 text-zinc-950 transition-all flex items-center gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_20px_-4px_rgba(245,158,11,0.3)] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      {/* 2. Barra de Resumo do Dia (KPIs em Destaque) */}
      <div className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3.5">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-base text-white">
              {formattedDateLabel}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span>Faturamento Concluído:</span>
            <strong className="text-emerald-400 font-semibold text-sm tabular-nums">
              R$ {dailyKPIs.revenueCompleted.toFixed(2)}
            </strong>
            <span className="text-zinc-600">·</span>
            <span>Previsto:</span>
            <strong className="text-zinc-200 tabular-nums">
              R$ {dailyKPIs.revenueExpected.toFixed(2)}
            </strong>
          </div>
        </div>

        {/* Quick KPI Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
            <span className="text-zinc-400 text-xs">Agendados:</span>
            <strong className="text-white text-base tabular-nums font-bold font-mono">
              {dailyKPIs.totalActive}
            </strong>
          </div>
          <div className="p-3.5 rounded-xl bg-cyan-500/5 border border-cyan-500/20 flex items-center justify-between">
            <span className="text-cyan-300 text-xs">Confirmados:</span>
            <strong className="text-cyan-400 text-base tabular-nums font-bold font-mono">
              {dailyKPIs.confirmedCount}
            </strong>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-400/5 border border-amber-400/20 flex items-center justify-between">
            <span className="text-amber-300 text-xs">Em Atendimento:</span>
            <strong className="text-amber-400 text-base tabular-nums font-bold font-mono">
              {dailyKPIs.inProgressCount}
            </strong>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
            <span className="text-emerald-300 text-xs">Concluídos:</span>
            <strong className="text-emerald-400 text-base tabular-nums font-bold font-mono">
              {dailyKPIs.completedCount}
            </strong>
          </div>
          <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 flex items-center justify-between col-span-2 sm:col-span-1">
            <span className="text-rose-300 text-xs">Faltas (No-Show):</span>
            <strong className="text-rose-400 text-base tabular-nums font-bold font-mono">
              {dailyKPIs.noShowCount}
            </strong>
          </div>
        </div>

        {/* Filter & Search Strip */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          {/* Chair Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-zinc-400 font-medium mr-1">Cadeiras:</span>
            <button
              onClick={() => setSelectedBarberFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                selectedBarberFilter === 'all'
                  ? 'bg-amber-400 text-zinc-950 font-bold'
                  : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/[0.08]'
              }`}
            >
              Todas ({appointments.filter((a) => a.status !== 'CANCELLED').length})
            </button>
            {barbers.map((b, idx) => {
              const count = appointments.filter((a) => a.barberId === b.id && a.status !== 'CANCELLED').length;
              const isMyChair = currentUser.barberId === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedBarberFilter(b.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    selectedBarberFilter === b.id
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
                  <span className="text-[11px] font-mono opacity-80 font-bold">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Quick Client Search in Day */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar cliente ou serviço hoje..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/40 border border-white/[0.08] focus:border-amber-400 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. VISÃO MODO 1: CARTÕES DE ATENDIMENTO (SUPER CLARO E DIRETO!) */}
      {/* ========================================================================= */}
      {viewMode === 'cards' && (
        <div
          className="grid gap-6"
          style={{
            gridTemplateColumns:
              displayedBarbers.length === 1
                ? '1fr'
                : 'repeat(auto-fit, minmax(340px, 1fr))',
          }}
        >
          {displayedBarbers.map((barber, idx) => {
            const barberAllApts = appointments
              .filter((a) => a.barberId === barber.id)
              .sort((a, b) => a.time.localeCompare(b.time));

            const barberFilteredApts = barberAllApts.filter(filterAppointment);

            const completedCount = barberAllApts.filter((a) => a.status === 'COMPLETED').length;
            const confirmedCount = barberAllApts.filter((a) => a.status === 'CONFIRMED').length;
            const inProgressCount = barberAllApts.filter((a) => a.status === 'IN_PROGRESS').length;
            const chairRevenue = barberAllApts
              .filter((a) => a.status === 'COMPLETED')
              .reduce((sum, a) => sum + (a.priceCharged || 0), 0);

            const freeSlots = getFreeSlotsForBarber(barber, barberAllApts);

            return (
              <div
                key={barber.id}
                className="rounded-2xl bg-[#111114] border border-white/[0.08] overflow-hidden shadow-sm flex flex-col"
              >
                {/* Station Header */}
                <div className="p-5 bg-[#141418] border-b border-white/[0.08] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-zinc-950 text-xs shadow-sm shrink-0"
                      style={{ backgroundColor: barber.color || '#f59e0b' }}
                    >
                      C0{idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base text-white">
                          {barber.name}
                        </h3>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      </div>
                      <span className="text-xs text-zinc-400 block mt-0.5">
                        Turno: {barber.startTime} às {barber.endTime} · Almoço {barber.lunchStart}-{barber.lunchEnd}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-400 text-base block tabular-nums">
                      R$ {chairRevenue.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      {completedCount} concluídos
                    </span>
                  </div>
                </div>

                {/* Status Bar Indicator */}
                <div className="px-5 py-2.5 bg-black/25 border-b border-white/[0.05] flex items-center justify-between text-xs text-zinc-400">
                  <span>
                    Total: <strong className="text-white font-medium">{barberAllApts.length}</strong> ({confirmedCount} pendentes, {inProgressCount} em atendimento)
                  </span>
                  <button
                    onClick={() =>
                      openNewAppointmentWith({
                        barberId: barber.id,
                        date: selectedDate,
                      })
                    }
                    className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    + Agendar nesta cadeira
                  </button>
                </div>

                {/* Appointments List for this Chair */}
                <div className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto max-h-[720px]">
                  {barberFilteredApts.length > 0 ? (
                    barberFilteredApts.map((apt) => {
                      const isCompleted = apt.status === 'COMPLETED';
                      const isInProgress = apt.status === 'IN_PROGRESS';
                      const isConfirmed = apt.status === 'CONFIRMED';
                      const isNoShow = apt.status === 'NO_SHOW';
                      const isCancelled = apt.status === 'CANCELLED';
                      const endTimeStr = getEndTime(apt.time, apt.durationMinutes);

                      return (
                        <div
                          key={apt.id}
                          className={`p-4 sm:p-5 rounded-2xl border transition-all text-xs space-y-3 relative overflow-hidden ${
                            isInProgress
                              ? 'bg-[#181510] border-amber-400/40 shadow-sm shadow-amber-400/10'
                              : isCompleted
                              ? 'bg-[#0f1713] border-emerald-500/30 text-zinc-300'
                              : isNoShow || isCancelled
                              ? 'bg-[#181113] border-rose-500/30 opacity-75'
                              : 'bg-[#11141c] border-cyan-500/30 hover:border-cyan-400/50 shadow-sm'
                          }`}
                        >
                          {/* Accent status line */}
                          <div
                            className={`absolute top-0 left-0 right-0 h-[2px] ${
                              isInProgress
                                ? 'bg-amber-400'
                                : isCompleted
                                ? 'bg-emerald-400'
                                : isNoShow || isCancelled
                                ? 'bg-rose-500'
                                : 'bg-cyan-400'
                            }`}
                          />

                          {/* Top Row: Time & Status Badge */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-sm px-2.5 py-0.5 rounded-lg bg-black/40 text-amber-300 tabular-nums border border-white/[0.06]">
                                {apt.time} - {endTimeStr}
                              </span>
                              <span className="text-xs text-zinc-400">
                                ({apt.durationMinutes} min)
                              </span>
                            </div>

                            {/* Status Badges */}
                            {isConfirmed && (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                Confirmado
                              </span>
                            )}
                            {isInProgress && (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-400/15 text-amber-300 border border-amber-400/30 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                Em Atendimento
                              </span>
                            )}
                            {isCompleted && (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                Concluído
                              </span>
                            )}
                            {isNoShow && (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
                                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                Faltou (No-Show)
                              </span>
                            )}
                            {isCancelled && (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                                Cancelado
                              </span>
                            )}
                          </div>

                          {/* Customer Info & WhatsApp */}
                          <div className="flex items-start justify-between gap-3 pt-1">
                            <div className="space-y-1">
                              <button
                                onClick={() => setSelectedCustomerIdForDetail(apt.customerId)}
                                className="font-semibold text-base text-white hover:text-amber-300 transition-colors text-left cursor-pointer block"
                                title="Ver ficha completa do cliente no CRM"
                              >
                                {apt.customerName}
                              </button>
                              <div className="flex items-center gap-1.5 font-mono text-zinc-400 text-xs">
                                <Phone className="w-3 h-3 text-zinc-500" />
                                <span>{apt.customerWhatsapp}</span>
                              </div>
                            </div>

                            <WhatsAppButton
                              phone={apt.customerWhatsapp}
                              customerName={apt.customerName}
                              serviceName={apt.serviceName}
                              barberName={apt.barberName}
                              time={apt.time}
                              date={apt.date}
                              variant="dropdown"
                            />
                          </div>

                          {/* Service, Value and Origin */}
                          <div className="p-3 rounded-xl bg-black/30 border border-white/[0.05] flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-zinc-200">
                              <Scissors className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <strong className="truncate max-w-[200px] font-medium">{apt.serviceName}</strong>
                            </div>

                            <div className="text-right">
                              <span className="font-bold text-emerald-400 font-mono tabular-nums text-sm">
                                R$ {apt.priceCharged.toFixed(2)}
                              </span>
                              {apt.source === 'PUBLIC_BOOKING' && (
                                <span className="text-[10px] block text-cyan-400">
                                  Portal Online
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Fast Action Buttons */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.06]">
                            <div className="flex items-center gap-2 flex-wrap">
                              {isConfirmed && (
                                <>
                                  <button
                                    disabled={updatingId === apt.id}
                                    onClick={() => handleStatusUpdate(apt.id, 'IN_PROGRESS')}
                                    className="px-3.5 py-2 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                                  >
                                    <Scissors className="w-3.5 h-3.5 text-amber-400" />
                                    Iniciar Atendimento
                                  </button>

                                  <button
                                    disabled={updatingId === apt.id}
                                    onClick={() => handleStatusUpdate(apt.id, 'NO_SHOW')}
                                    title="Registrar Falta / No-Show (com 2 faltas suspende agendamento online)"
                                    className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                                  >
                                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                    Faltou
                                  </button>
                                </>
                              )}

                              {isInProgress && (
                                <button
                                  disabled={updatingId === apt.id}
                                  onClick={() => handleStatusUpdate(apt.id, 'COMPLETED')}
                                  className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/35 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                                >
                                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                                  Concluir Atendimento
                                </button>
                              )}
                            </div>

                            <button
                              onClick={() => setSelectedApt(apt)}
                              className="px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] text-zinc-300 hover:text-white border border-white/[0.08] text-xs font-medium transition-all cursor-pointer"
                            >
                              Gerenciar / Detalhes →
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-12 px-4 rounded-2xl bg-black/20 border border-white/[0.05] text-center space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.04] text-zinc-400 mx-auto flex items-center justify-center">
                        <CalendarIcon className="w-5 h-5" />
                      </div>
                      <p className="text-xs text-zinc-400">
                        {searchTerm
                          ? 'Nenhum agendamento encontrado para esta busca.'
                          : 'Nenhum cliente agendado nesta cadeira para esta data.'}
                      </p>
                      <button
                        onClick={() =>
                          openNewAppointmentWith({
                            barberId: barber.id,
                            date: selectedDate,
                          })
                        }
                        className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Agendar Horário
                      </button>
                    </div>
                  )}

                  {/* Quick Vacant Slots Row */}
                  {freeSlots.length > 0 && (
                    <div className="pt-3 border-t border-white/[0.06] space-y-2">
                      <span className="text-[11px] text-zinc-400 font-medium block">
                        Horários livres para encaixe hoje:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {freeSlots.map((slotTime) => (
                          <button
                            key={slotTime}
                            onClick={() =>
                              openNewAppointmentWith({
                                barberId: barber.id,
                                date: selectedDate,
                                time: slotTime,
                              })
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-amber-400/15 text-zinc-300 hover:text-amber-300 border border-white/[0.06] hover:border-amber-400/30 text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1"
                            title={`Clique para agendar horário às ${slotTime}`}
                          >
                            <Plus className="w-3 h-3 text-amber-400" />
                            {slotTime}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. VISÃO MODO 2: GRADE HORÁRIA (TIMELINE DE 15 EM 15 MINUTOS) */}
      {/* ========================================================================= */}
      {viewMode === 'grid' && (
        <div className="rounded-2xl bg-[#121215] border border-white/10 overflow-hidden shadow-2xl">
          {/* Roster Header Columns */}
          <div className="grid grid-cols-[70px_1fr] sm:grid-cols-[80px_1fr] border-b border-white/10 bg-[#16161a]">
            <div className="p-3 text-center border-r border-white/10 text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 flex items-center justify-center">
              HORA
            </div>
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${displayedBarbers.length}, 1fr)`,
              }}
            >
              {displayedBarbers.map((barber, index) => {
                const bApts = appointments.filter(
                  (a) => a.barberId === barber.id && a.status !== 'CANCELLED'
                );
                const bCompleted = bApts.filter((a) => a.status === 'COMPLETED');
                const bRevenue = bCompleted.reduce((sum, a) => sum + (a.priceCharged || 0), 0);

                return (
                  <div
                    key={barber.id}
                    className="p-3 border-r border-white/10 last:border-r-0 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-black text-zinc-950 text-xs shadow-md"
                        style={{ backgroundColor: barber.color || '#f59e0b' }}
                      >
                        C0{index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-display font-black text-sm text-white uppercase tracking-wide">
                            {barber.name}
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400">
                          Turno: {barber.startTime} às {barber.endTime}
                        </span>
                      </div>
                    </div>

                    <div className="text-right hidden sm:block">
                      <span className="text-xs font-mono font-bold text-emerald-400 block tabular-nums">
                        R$ {bRevenue.toFixed(2)}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {bCompleted.length} cortes pagos
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Time Grid Canvas */}
          <div className="relative overflow-x-auto min-w-[650px] max-h-[750px] overflow-y-auto">
            <div className="grid grid-cols-[70px_1fr] sm:grid-cols-[80px_1fr] relative">
              {/* Left Time Slots Column */}
              <div className="border-r border-white/10 bg-[#0e0e11] select-none">
                {timeSlots.map((time) => (
                  <div
                    key={time}
                    className="h-[38px] border-b border-white/5 px-2 py-0.5 text-right text-[11px] font-mono text-zinc-400 flex items-start justify-end tabular-nums"
                  >
                    {time}
                  </div>
                ))}
              </div>

              {/* Barber Columns Canvas */}
              <div
                className="grid relative"
                style={{
                  gridTemplateColumns: `repeat(${displayedBarbers.length}, 1fr)`,
                  height: `${(timeSlots.length - 1) * PIXELS_PER_15_MIN}px`,
                }}
              >
                {/* Real-time Indicator Line across calendar if viewing TODAY */}
                {currentNowTop !== null && (
                  <div
                    style={{ top: `${currentNowTop}px` }}
                    className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                  >
                    <div className="px-2 py-0.5 rounded bg-cyan-400 text-zinc-950 font-mono font-black text-[9px] uppercase tracking-wider shadow-[0_0_10px_rgba(6,182,212,0.8)]">
                      AGORA {nowTimeStr}
                    </div>
                    <div className="flex-1 h-[2px] bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.9)]" />
                  </div>
                )}

                {displayedBarbers.map((barber) => {
                  const barberApts = appointments.filter((a) => a.barberId === barber.id);

                  // Lunch break
                  const lunchStart = timeToMinutes(barber.lunchStart);
                  const lunchEnd = timeToMinutes(barber.lunchEnd);
                  const lunchTop = (lunchStart - startGridMinutes) * PIXELS_PER_MINUTE;
                  const lunchHeight = (lunchEnd - lunchStart) * PIXELS_PER_MINUTE;

                  const barberBlocks = blocks.filter(
                    (blk) =>
                      (!blk.barberId || blk.barberId === barber.id) &&
                      selectedDate >= blk.startDate &&
                      selectedDate <= blk.endDate
                  );

                  return (
                    <div
                      key={barber.id}
                      className="relative border-r border-white/10 last:border-r-0 h-full"
                    >
                      {/* Horizontal 15-min guideline rows & Click-to-Book */}
                      {timeSlots.slice(0, -1).map((slotTime) => {
                        const isPastSlot = isPastDateTime(selectedDate, slotTime).isPast;

                        return (
                          <div
                            key={slotTime}
                            onClick={() => {
                              if (isPastSlot) {
                                addToast({
                                  type: 'error',
                                  title: 'Horário Indisponível',
                                  message: `Não é possível agendar no passado (${slotTime}).`,
                                });
                                return;
                              }
                              openNewAppointmentWith({
                                barberId: barber.id,
                                date: selectedDate,
                                time: slotTime,
                              });
                            }}
                            className={`h-[38px] border-b border-white/5 transition-colors relative group ${
                              isPastSlot
                                ? 'bg-past-slot opacity-60 cursor-not-allowed'
                                : 'hover:bg-amber-400/[0.04] cursor-pointer'
                            }`}
                          >
                            {!isPastSlot && (
                              <span className="opacity-0 group-hover:opacity-100 text-[10px] font-mono text-zinc-400 px-2 transition-opacity">
                                + Vago {slotTime}
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {/* Lunch Break Visual Block */}
                      {lunchTop >= 0 && lunchHeight > 0 && (
                        <div
                          style={{
                            top: `${lunchTop}px`,
                            height: `${lunchHeight}px`,
                          }}
                          className="absolute left-1 right-1 z-10 rounded-xl bg-[#16161a]/95 border border-white/10 p-2 flex items-center justify-center gap-2 text-zinc-300 text-xs shadow-md pointer-events-none"
                        >
                          <Coffee className="w-4 h-4 text-amber-400" />
                          <span className="font-display font-bold uppercase tracking-wider text-[11px] text-zinc-300">
                            Intervalo de Almoço ({barber.lunchStart} - {barber.lunchEnd})
                          </span>
                        </div>
                      )}

                      {/* Schedule Blocks */}
                      {barberBlocks.map((blk) => {
                        let top = 0;
                        let height = (timeSlots.length - 1) * PIXELS_PER_15_MIN;
                        if (blk.startTime && blk.endTime) {
                          const bStart = timeToMinutes(blk.startTime);
                          const bEnd = timeToMinutes(blk.endTime);
                          top = (bStart - startGridMinutes) * PIXELS_PER_MINUTE;
                          height = (bEnd - bStart) * PIXELS_PER_MINUTE;
                        }

                        return (
                          <div
                            key={blk.id}
                            style={{
                              top: `${top}px`,
                              height: `${height}px`,
                            }}
                            className="absolute left-1 right-1 z-10 rounded-xl bg-[#1c0e12]/95 border border-rose-500/40 p-3 flex flex-col justify-center text-rose-300 text-xs shadow-md"
                          >
                            <div className="flex items-center gap-1.5 font-display font-black text-rose-400 uppercase tracking-wide">
                              <Ban className="w-3.5 h-3.5" />
                              <span>{blk.reason || 'Bloqueio de Agenda'}</span>
                            </div>
                            <span className="text-[10px] font-mono text-zinc-400 mt-0.5">
                              {blk.startTime ? `${blk.startTime} às ${blk.endTime}` : 'Dia Inteiro'}
                            </span>
                          </div>
                        );
                      })}

                      {/* Appointments with Real Duration Height */}
                      {barberApts.map((apt) => {
                        const aptStart = timeToMinutes(apt.time);
                        const top = (aptStart - startGridMinutes) * PIXELS_PER_MINUTE;
                        const height = apt.durationMinutes * PIXELS_PER_MINUTE;

                        const isCompleted = apt.status === 'COMPLETED';
                        const isInProgress = apt.status === 'IN_PROGRESS';
                        const isCancelled = apt.status === 'CANCELLED';
                        const isNoShow = apt.status === 'NO_SHOW';

                        return (
                          <div
                            key={apt.id}
                            onClick={() => setSelectedApt(apt)}
                            style={{
                              top: `${top}px`,
                              height: `${height - 2}px`,
                            }}
                            className={`absolute left-1.5 right-1.5 z-20 rounded-xl p-2.5 transition-all cursor-pointer shadow-lg overflow-hidden border flex flex-col justify-between ${
                              isCompleted
                                ? 'bg-[#0d1813] border-emerald-500/40 text-emerald-100 hover:border-emerald-400/80'
                                : isInProgress
                                ? 'bg-[#1c170a] border-amber-400 text-amber-100 hover:border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                                : isCancelled || isNoShow
                                ? 'bg-[#170e12] border-rose-500/30 text-zinc-400 opacity-60'
                                : 'bg-[#0f1724] border-cyan-500/40 text-cyan-100 hover:border-cyan-400/80'
                            }`}
                          >
                            <div
                              className={`absolute top-0 left-0 right-0 h-[3px] ${
                                isCompleted
                                  ? 'bg-emerald-400'
                                  : isInProgress
                                  ? 'bg-amber-400'
                                  : isCancelled || isNoShow
                                  ? 'bg-rose-500'
                                  : 'bg-cyan-400'
                              }`}
                            />

                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono font-bold text-xs px-1.5 py-0.5 rounded bg-black/40 text-white tabular-nums">
                                {apt.time} ({apt.durationMinutes}m)
                              </span>
                              <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full bg-black/30">
                                {apt.status === 'IN_PROGRESS' ? 'EM CORTE' : apt.status}
                              </span>
                            </div>

                            <div className="my-auto py-1">
                              <h4 className="font-display font-black text-sm uppercase tracking-wide truncate text-white">
                                {apt.customerName}
                              </h4>
                              <p className="text-[11px] font-medium text-zinc-300 truncate">
                                {apt.serviceName}
                              </p>
                            </div>

                            <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-white/5">
                              <span className="font-bold text-emerald-400 tabular-nums">
                                R$ {apt.priceCharged.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL DE DETALHES & AÇÕES DO AGENDAMENTO SELECIONADO */}
      {/* ========================================================================= */}
      {selectedApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#141418] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <Scissors className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-lg text-white">
                  Detalhes do Atendimento
                </h3>
              </div>
              <button
                onClick={() => setSelectedApt(null)}
                className="text-zinc-400 hover:text-white p-1.5 rounded-xl hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Appointment Summary Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <button
                    onClick={() => {
                      setSelectedCustomerIdForDetail(selectedApt.customerId);
                      setSelectedApt(null);
                    }}
                    className="font-semibold text-base text-white hover:text-amber-300 text-left cursor-pointer transition-colors"
                  >
                    {selectedApt.customerName}
                  </button>
                  <span className="text-xs font-mono text-zinc-400 block mt-0.5">{selectedApt.customerWhatsapp}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[11px] text-zinc-400">Horário</span>
                  <div className="font-mono font-semibold text-sm text-amber-400 tabular-nums">
                    {selectedApt.time} ({selectedApt.durationMinutes} min)
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs">
                <div>
                  <span className="text-zinc-400">Serviço: </span>
                  <strong className="text-white font-medium">{selectedApt.serviceName}</strong>
                </div>
                <div>
                  <span className="text-zinc-400">Barbeiro: </span>
                  <strong className="text-white font-medium">{selectedApt.barberName}</strong>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-zinc-400">Valor Cobrado:</span>
                <span className="text-base font-bold text-emerald-400 font-mono tabular-nums">
                  R$ {selectedApt.priceCharged.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-zinc-400">Canal / Origem:</span>
                <span className="font-medium text-amber-400">
                  {selectedApt.source === 'PUBLIC_BOOKING' ? 'Portal Online (/agendar)' : 'Agenda Interna'}
                </span>
              </div>
            </div>

            {/* Primary Fast Action: Iniciar Atendimento e Faltou (No-Show) */}
            {selectedApt.status === 'CONFIRMED' && (
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-400">
                    Ação Operacional Imediata:
                  </span>
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1.5 font-mono">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    Regra 2 Faltas = Bloqueio Online
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    disabled={updatingId === selectedApt.id}
                    onClick={() => handleStatusUpdate(selectedApt.id, 'IN_PROGRESS')}
                    className="py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-400/20 cursor-pointer"
                  >
                    <Scissors className="w-4 h-4" />
                    Iniciar Atendimento
                  </button>

                  <button
                    disabled={updatingId === selectedApt.id}
                    onClick={() => handleStatusUpdate(selectedApt.id, 'NO_SHOW')}
                    className="py-2.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4 text-rose-400" />
                    Faltou (No-Show)
                  </button>
                </div>
              </div>
            )}

            {/* Status Change Buttons */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-zinc-400 block">
                Mudar Status Operacional:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  disabled={updatingId === selectedApt.id}
                  onClick={() => handleStatusUpdate(selectedApt.id, 'CONFIRMED')}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedApt.status === 'CONFIRMED'
                      ? 'bg-cyan-500 text-zinc-950 shadow-sm'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08]'
                  }`}
                >
                  Confirmado
                </button>

                <button
                  disabled={updatingId === selectedApt.id}
                  onClick={() => handleStatusUpdate(selectedApt.id, 'IN_PROGRESS')}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedApt.status === 'IN_PROGRESS'
                      ? 'bg-amber-400 text-zinc-950 shadow-sm'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] text-amber-300 border border-amber-400/30'
                  }`}
                >
                  Em Corte
                </button>

                <button
                  disabled={updatingId === selectedApt.id}
                  onClick={() => handleStatusUpdate(selectedApt.id, 'COMPLETED')}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedApt.status === 'COMPLETED'
                      ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  Concluir
                </button>

                <button
                  disabled={updatingId === selectedApt.id}
                  onClick={() => handleStatusUpdate(selectedApt.id, 'NO_SHOW')}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedApt.status === 'NO_SHOW'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] text-rose-400 border border-rose-500/30'
                  }`}
                >
                  Faltou
                </button>

                <button
                  disabled={updatingId === selectedApt.id}
                  onClick={() => handleStatusUpdate(selectedApt.id, 'CANCELLED')}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedApt.status === 'CANCELLED'
                      ? 'bg-zinc-700 text-white'
                      : 'bg-white/[0.04] hover:bg-rose-950/40 text-zinc-400 hover:text-rose-300 border border-white/[0.08]'
                  }`}
                >
                  Cancelar
                </button>
              </div>
            </div>

            {/* Quick Actions Footer: WhatsApp & Close */}
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
              <WhatsAppButton
                phone={selectedApt.customerWhatsapp}
                customerName={selectedApt.customerName}
                serviceName={selectedApt.serviceName}
                barberName={selectedApt.barberName}
                time={selectedApt.time}
                date={selectedApt.date}
                variant="button"
              />

              <button
                onClick={() => setSelectedApt(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white border border-white/[0.08] text-xs font-semibold transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout / Fechamento de Atendimento & Comissão Modal */}
      {checkoutApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#111114] border border-white/[0.08] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-zinc-100">
                    Finalizar Atendimento & Caixa
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Registro de recebimento e apuração de comissão
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCheckoutApt(null)}
                className="text-zinc-400 hover:text-zinc-100 p-1 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            {/* Client and Barber info */}
            <div className="p-3.5 rounded-xl bg-[#17171c] border border-white/[0.06] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Cliente:</span>
                <span className="font-semibold text-zinc-200">{checkoutApt.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Serviço:</span>
                <span className="font-semibold text-amber-400">{checkoutApt.serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Profissional / Cadeira:</span>
                <span className="font-semibold text-zinc-200">{checkoutApt.barberName}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmCheckout} className="space-y-4 text-xs sm:text-sm">
              {/* Payment Method Selector */}
              <div>
                <label className="block text-zinc-300 font-medium text-xs mb-2">
                  Forma de Pagamento *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'PIX', label: 'Pix', icon: QrCode },
                    { id: 'CREDIT_CARD', label: 'Crédito', icon: CreditCard },
                    { id: 'DEBIT_CARD', label: 'Débito', icon: CreditCard },
                    { id: 'CASH', label: 'Dinheiro', icon: Banknote },
                    { id: 'CLUB_PLAN', label: 'Club Ferraz', icon: Sparkles },
                  ].map((pm) => {
                    const Icon = pm.icon;
                    const isSelected = checkoutPaymentMethod === pm.id;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => {
                          setCheckoutPaymentMethod(pm.id as PaymentMethod);
                          if (pm.id === 'CLUB_PLAN') setCheckoutPrice(0);
                        }}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-semibold cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-400 text-amber-300 shadow-sm'
                            : 'bg-[#17171c] border-white/[0.06] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{pm.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Charged & Commission Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                    Valor Cobrado (R$) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    required
                    value={checkoutPrice}
                    onChange={(e) => setCheckoutPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-[#17171c] border border-white/[0.08] rounded-xl text-zinc-100 font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                    Comissão (%) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    required
                    value={checkoutCommissionRate}
                    onChange={(e) => setCheckoutCommissionRate(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-[#17171c] border border-white/[0.08] rounded-xl text-zinc-100 font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Live Commission Breakdown Preview */}
              <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/15 space-y-1.5">
                <span className="text-[11px] font-medium text-amber-400 block uppercase tracking-wider">
                  Divisão Automática:
                </span>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300">Repasse ao Barbeiro ({checkoutCommissionRate}%):</span>
                  <span className="font-mono font-bold text-amber-400">
                    R$ {(((checkoutPrice * checkoutCommissionRate) / 100) || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-500/10">
                  <span className="text-zinc-300">Retido Barbearia ({100 - checkoutCommissionRate}%):</span>
                  <span className="font-mono font-bold text-emerald-400">
                    R$ {((checkoutPrice - (checkoutPrice * checkoutCommissionRate) / 100) || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCheckoutApt(null)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-xs font-semibold cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={updatingId === checkoutApt.id}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  {updatingId === checkoutApt.id ? 'Gravando...' : 'Concluir & Baixar no Caixa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
