import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.js';
import { api } from '../../services/api.js';
import { Barber, DaySchedule } from '../../types/index.js';
import {
  UserCheck,
  Clock,
  Coffee,
  Calendar,
  Edit2,
  Save,
  X,
  Lock,
  User,
  Sparkles,
  Power,
  Check,
  Percent,
  Copy,
} from 'lucide-react';

const DAYS_LIST = [
  { day: 1, label: 'Segunda-feira', short: 'Seg' },
  { day: 2, label: 'Terça-feira', short: 'Ter' },
  { day: 3, label: 'Quarta-feira', short: 'Qua' },
  { day: 4, label: 'Quinta-feira', short: 'Qui' },
  { day: 5, label: 'Sexta-feira', short: 'Sex' },
  { day: 6, label: 'Sábado', short: 'Sáb' },
  { day: 0, label: 'Domingo', short: 'Dom' },
];

export const BarbersView: React.FC = () => {
  const { barbers, refreshAll, addToast } = useApp();

  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [description, setDescription] = useState('');
  const [commissionRate, setCommissionRate] = useState<number>(50);
  const [color, setColor] = useState('#f59e0b');
  const [active, setActive] = useState(true);
  const [dailySchedule, setDailySchedule] = useState<Record<number, DaySchedule>>({});
  const [submitting, setSubmitting] = useState(false);

  const openEdit = (b: Barber) => {
    setEditingBarber(b);
    setName(b.name || '');
    setAvatarUrl(b.avatarUrl || '');
    setSpecialty(b.specialty || '');
    setDescription(b.description || '');
    setCommissionRate(b.defaultCommissionRate ?? 50);
    setColor(b.color);
    setActive(b.active);

    const initialSchedule: Record<number, DaySchedule> = {};
    DAYS_LIST.forEach(({ day }) => {
      if (b.dailySchedule && b.dailySchedule[day]) {
        initialSchedule[day] = { ...b.dailySchedule[day] };
      } else {
        const isWorking = b.workDays.includes(day);
        initialSchedule[day] = {
          active: isWorking,
          startTime: b.startTime || '09:00',
          endTime: b.endTime || '20:00',
          lunchStart: b.lunchStart || '12:30',
          lunchEnd: b.lunchEnd || '13:30',
        };
      }
    });

    setDailySchedule(initialSchedule);
  };

  const handleDayChange = (day: number, field: keyof DaySchedule, value: any) => {
    setDailySchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleCopyWeekdays = (sourceDay: number = 1) => {
    const source = dailySchedule[sourceDay];
    if (!source) return;

    setDailySchedule((prev) => {
      const updated = { ...prev };
      [1, 2, 3, 4, 5].forEach((d) => {
        updated[d] = {
          ...updated[d],
          startTime: source.startTime,
          endTime: source.endTime,
          lunchStart: source.lunchStart,
          lunchEnd: source.lunchEnd,
          active: true,
        };
      });
      return updated;
    });

    addToast({
      type: 'success',
      title: 'Horários Copiados',
      message: 'Os horários de segunda a sexta foram equalizados.',
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBarber) return;

    if (!name.trim()) {
      addToast({
        type: 'error',
        title: 'Nome Obrigatório',
        message: 'Por favor, informe o nome do profissional.',
      });
      return;
    }

    try {
      setSubmitting(true);

      const activeDays = (Object.entries(dailySchedule) as [string, DaySchedule][])
        .filter(([_, sched]) => sched.active)
        .map(([day]) => Number(day));

      const schedulesList = Object.values(dailySchedule) as DaySchedule[];
      const firstActive = schedulesList.find((s) => s.active);
      const defaultStartTime = firstActive?.startTime || editingBarber.startTime || '09:00';
      const defaultEndTime = firstActive?.endTime || editingBarber.endTime || '20:00';
      const defaultLunchStart = firstActive?.lunchStart || editingBarber.lunchStart || '12:30';
      const defaultLunchEnd = firstActive?.lunchEnd || editingBarber.lunchEnd || '13:30';

      await api.updateBarber(editingBarber.id, {
        name: name.trim(),
        avatarUrl: avatarUrl.trim() || undefined,
        specialty: specialty.trim() || undefined,
        description: description.trim() || undefined,
        defaultCommissionRate: Number(commissionRate) || 50,
        startTime: defaultStartTime,
        endTime: defaultEndTime,
        lunchStart: defaultLunchStart,
        lunchEnd: defaultLunchEnd,
        color,
        workDays: activeDays,
        dailySchedule,
        active,
      });

      addToast({
        type: 'success',
        title: 'Profissional Atualizado',
        message: `Grade de horários por dia e configurações de ${name.trim()} salvas com sucesso!`,
      });
      await refreshAll();
      setEditingBarber(null);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao salvar',
        message: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111114] p-5 sm:p-6 rounded-2xl border border-white/[0.08] shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg sm:text-xl font-bold text-zinc-100 tracking-tight">
                Cadeiras & Profissionais Residentes
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                2 Cadeiras Titulares
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Gestão de perfil, comissão e grade de horários individual por dia de trabalho.
            </p>
          </div>
        </div>

        {/* Locked Rule Badge */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#17171c] border border-white/[0.08] text-xs font-mono text-zinc-300 self-start sm:self-auto shadow-sm">
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>Equipe Residente (2 Cadeiras)</span>
        </div>
      </div>

      {/* Strict 2 Resident Barbers Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {barbers.map((barber, idx) => {
          const offDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !barber.workDays.includes(d));

          return (
            <div
              key={barber.id}
              className="p-5 sm:p-6 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-5 shadow-lg hover:border-white/[0.14] transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Top info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    {barber.avatarUrl ? (
                      <img
                        src={barber.avatarUrl}
                        alt={barber.name}
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-2xl object-cover border-2 shadow-md shrink-0"
                        style={{ borderColor: barber.color || '#f59e0b' }}
                      />
                    ) : (
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold font-mono text-base text-zinc-950 shadow-md shrink-0"
                        style={{ backgroundColor: barber.color || '#f59e0b' }}
                      >
                        C0{idx + 1}
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg text-zinc-100 tracking-tight">
                          {barber.name}
                        </h3>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-400 border border-white/[0.08]">
                          Cadeira 0{idx + 1}
                        </span>
                      </div>

                      {barber.specialty && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                          <Sparkles className="w-3.5 h-3.5 shrink-0" />
                          <span>{barber.specialty}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-medium ${
                            barber.active
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                          }`}
                        >
                          {barber.active ? 'Escala Ativa' : 'Inativo / Pausado'}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                          <Percent className="w-2.5 h-2.5" />
                          Comissão: {barber.defaultCommissionRate ?? 50}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => openEdit(barber)}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-200 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-sm shrink-0"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                    Editar Grade
                  </button>
                </div>

                {/* Bio / Description */}
                {barber.description && (
                  <p className="text-xs text-zinc-400 leading-relaxed bg-[#17171c] p-3 rounded-xl border border-white/[0.04]">
                    {barber.description}
                  </p>
                )}

                {/* Schedule Info */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#17171c] border border-white/[0.04] space-y-1">
                    <span className="text-zinc-400 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      Horário Padrão
                    </span>
                    <span className="font-mono font-bold text-zinc-100 text-sm block">
                      {barber.startTime} às {barber.endTime}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#17171c] border border-white/[0.04] space-y-1">
                    <span className="text-zinc-400 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider">
                      <Coffee className="w-3.5 h-3.5 text-amber-400" />
                      Intervalo Almoço
                    </span>
                    <span className="font-mono font-bold text-amber-400 text-sm block">
                      {barber.lunchStart} às {barber.lunchEnd}
                    </span>
                  </div>
                </div>

                {/* Work Days & Schedule by Day */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 block text-[11px] font-medium uppercase tracking-wider">
                      Dias & Horários de Trabalho:
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {DAYS_LIST.map(({ day, short }) => {
                      const isWorking = barber.workDays.includes(day);
                      const sched = barber.dailySchedule?.[day];
                      const start = sched?.startTime || barber.startTime;
                      const end = sched?.endTime || barber.endTime;

                      return (
                        <div
                          key={day}
                          className={`p-2 rounded-xl border text-[11px] font-mono ${
                            isWorking
                              ? 'bg-amber-500/5 text-zinc-200 border-amber-500/20'
                              : 'bg-[#17171c]/50 text-zinc-500 border-white/[0.04]'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span>{short}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded ${
                                isWorking ? 'bg-amber-400/20 text-amber-300' : 'bg-zinc-800 text-zinc-500'
                              }`}
                            >
                              {isWorking ? 'Atende' : 'Folga'}
                            </span>
                          </div>
                          {isWorking ? (
                            <div className="text-[10px] text-zinc-400 mt-1">
                              {start} - {end}
                            </div>
                          ) : (
                            <div className="text-[10px] text-zinc-600 mt-1 italic">
                              Sem atendimento
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom quick action */}
              <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-xs">
                <span className="text-zinc-500 font-mono text-[11px]">
                  {barber.workDays.length} dias na escala semanal
                </span>
                <button
                  type="button"
                  onClick={() => openEdit(barber)}
                  className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                >
                  Alterar horários por dia →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Barber Modal com Grade de Horários por Dia */}
      {editingBarber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#111114] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.08] bg-[#141418]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-100">
                    Configurar Profissional & Grade: {editingBarber.name}
                  </h3>
                  <span className="text-xs text-zinc-400 font-mono">
                    Ajuste os dados e a grade de horários individual de cada dia da semana.
                  </span>
                </div>
              </div>
              <button
                onClick={() => setEditingBarber(null)}
                className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-white/[0.04] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* SECTION: Profile & Commission */}
              <div className="space-y-4 p-4 rounded-xl bg-[#17171c]/70 border border-white/[0.06]">
                <span className="block text-amber-400 font-medium uppercase tracking-wider text-[11px]">
                  1. Perfil & Dados da Cadeira
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                      Nome do Barbeiro *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-[#111114] border border-white/[0.08] rounded-xl text-zinc-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                      Especialidade / Título Profissional
                    </label>
                    <input
                      type="text"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      placeholder="Ex: Fade, Barboterapia & Visagismo"
                      className="w-full px-3.5 py-2 text-sm bg-[#111114] border border-white/[0.08] rounded-xl text-zinc-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                    URL da Foto de Perfil
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://exemplo.com/foto.jpg"
                      className="w-full px-3.5 py-2 text-sm bg-[#111114] border border-white/[0.08] rounded-xl text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
                    />
                    {avatarUrl && (
                      <img
                        src={avatarUrl}
                        alt="Preview"
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-xl object-cover border border-amber-400 shrink-0"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                    Descrição / Biografia
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Breve resumo sobre o atendimento..."
                    className="w-full px-3.5 py-2 text-sm bg-[#111114] border border-white/[0.08] rounded-xl text-zinc-100 focus:outline-none focus:border-amber-400 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-zinc-300 font-medium text-xs mb-1.5 flex items-center justify-between">
                      <span>Taxa de Repasse de Comissão (%) *</span>
                      <span className="text-[11px] font-mono text-amber-400">Padrão da Cadeira</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        required
                        value={commissionRate}
                        onChange={(e) => setCommissionRate(Number(e.target.value))}
                        className="w-full px-3.5 py-2 text-sm bg-[#111114] border border-white/[0.08] rounded-xl text-zinc-100 focus:outline-none focus:border-amber-400 font-mono pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 font-mono font-bold text-xs pointer-events-none">
                        %
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                      Status Operacional
                    </label>
                    <button
                      type="button"
                      onClick={() => setActive(!active)}
                      className={`w-full py-2 px-3.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 border ${
                        active
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      {active ? 'Ativo na Escala' : 'Inativo / Pausado'}
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION: Grade de Horários por Dia da Semana */}
              <div className="space-y-4 p-4 rounded-xl bg-[#17171c]/70 border border-white/[0.06]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="block text-amber-400 font-medium uppercase tracking-wider text-[11px]">
                      2. Grade de Horários por Dia da Semana
                    </span>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Defina o horário de entrada, saída e almoço para cada dia específico.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyWeekdays(1)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-[#111114] hover:bg-white/[0.06] border border-white/[0.08] flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                    title="Copiar horários de Segunda-feira para Terça a Sexta"
                  >
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                    Copiar Seg → Sex
                  </button>
                </div>

                <div className="space-y-3">
                  {DAYS_LIST.map(({ day, label }) => {
                    const sched = dailySchedule[day] || {
                      active: false,
                      startTime: '09:00',
                      endTime: '20:00',
                      lunchStart: '12:30',
                      lunchEnd: '13:30',
                    };

                    return (
                      <div
                        key={day}
                        className={`p-3.5 rounded-xl border transition-all ${
                          sched.active
                            ? 'bg-[#111114] border-white/[0.08]'
                            : 'bg-[#111114]/50 border-white/[0.04] opacity-60'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/[0.04]">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sched.active}
                              onChange={(e) => handleDayChange(day, 'active', e.target.checked)}
                              className="w-4 h-4 rounded accent-amber-400 cursor-pointer"
                            />
                            <span className="font-semibold text-sm text-zinc-100">
                              {label}
                            </span>
                          </label>

                          <span
                            className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                              sched.active
                                ? 'bg-emerald-500/10 text-emerald-300'
                                : 'bg-zinc-800 text-zinc-500'
                            }`}
                          >
                            {sched.active ? 'Trabalha neste dia' : 'Dia de Folga'}
                          </span>
                        </div>

                        {sched.active ? (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                            <div>
                              <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                                Entrada
                              </label>
                              <input
                                type="time"
                                required
                                value={sched.startTime}
                                onChange={(e) => handleDayChange(day, 'startTime', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#17171c] border border-white/[0.08] rounded-lg text-zinc-100 focus:outline-none focus:border-amber-400"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                                Saída
                              </label>
                              <input
                                type="time"
                                required
                                value={sched.endTime}
                                onChange={(e) => handleDayChange(day, 'endTime', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#17171c] border border-white/[0.08] rounded-lg text-zinc-100 focus:outline-none focus:border-amber-400"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                                Início Almoço
                              </label>
                              <input
                                type="time"
                                required
                                value={sched.lunchStart || '12:30'}
                                onChange={(e) => handleDayChange(day, 'lunchStart', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#17171c] border border-white/[0.08] rounded-lg text-zinc-100 focus:outline-none focus:border-amber-400"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                                Fim Almoço
                              </label>
                              <input
                                type="time"
                                required
                                value={sched.lunchEnd || '13:30'}
                                onChange={(e) => handleDayChange(day, 'lunchEnd', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#17171c] border border-white/[0.08] rounded-lg text-zinc-100 focus:outline-none focus:border-amber-400"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="pt-2 text-xs font-mono text-zinc-500 italic">
                            Sem expediente agendável neste dia da semana.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION: Color */}
              <div className="p-4 rounded-xl bg-[#17171c]/70 border border-white/[0.06] flex items-center justify-between gap-4">
                <div>
                  <label className="block text-zinc-300 font-medium text-xs mb-0.5">
                    Cor da Cadeira na Grade
                  </label>
                  <span className="text-xs text-zinc-400">
                    Utilizada nos cartões e blocos da agenda.
                  </span>
                </div>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-12 h-9 bg-[#111114] border border-white/[0.08] rounded-xl cursor-pointer p-1 shrink-0"
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setEditingBarber(null)}
                  className="px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 font-bold text-xs bg-amber-400 text-zinc-950 hover:bg-amber-300 rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-400/20 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {submitting ? 'Salvando...' : 'Salvar Grade & Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
