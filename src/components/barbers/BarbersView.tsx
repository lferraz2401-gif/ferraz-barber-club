import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.js';
import { api } from '../../services/api.js';
import { Barber } from '../../types/index.js';
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
  Image,
  Power,
  Check,
  Tag,
  FileText,
  Percent,
} from 'lucide-react';

export const BarbersView: React.FC = () => {
  const { barbers, refreshAll, addToast } = useApp();

  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [description, setDescription] = useState('');
  const [commissionRate, setCommissionRate] = useState<number>(50);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('20:00');
  const [lunchStart, setLunchStart] = useState('12:30');
  const [lunchEnd, setLunchEnd] = useState('13:30');
  const [color, setColor] = useState('#f59e0b');
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const daysLabels = [
    { day: 0, label: 'Dom', fullName: 'Domingo' },
    { day: 1, label: 'Seg', fullName: 'Segunda-feira' },
    { day: 2, label: 'Ter', fullName: 'Terça-feira' },
    { day: 3, label: 'Qua', fullName: 'Quarta-feira' },
    { day: 4, label: 'Qui', fullName: 'Quinta-feira' },
    { day: 5, label: 'Sex', fullName: 'Sexta-feira' },
    { day: 6, label: 'Sáb', fullName: 'Sábado' },
  ];

  const openEdit = (b: Barber) => {
    setEditingBarber(b);
    setName(b.name || '');
    setAvatarUrl(b.avatarUrl || '');
    setSpecialty(b.specialty || '');
    setDescription(b.description || '');
    setCommissionRate(b.defaultCommissionRate ?? 50);
    setStartTime(b.startTime);
    setEndTime(b.endTime);
    setLunchStart(b.lunchStart);
    setLunchEnd(b.lunchEnd);
    setColor(b.color);
    setWorkDays(b.workDays);
    setActive(b.active);
  };

  const toggleDay = (day: number) => {
    if (workDays.includes(day)) {
      setWorkDays(workDays.filter((d) => d !== day));
    } else {
      setWorkDays([...workDays, day].sort());
    }
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
      await api.updateBarber(editingBarber.id, {
        name: name.trim(),
        avatarUrl: avatarUrl.trim() || undefined,
        specialty: specialty.trim() || undefined,
        description: description.trim() || undefined,
        defaultCommissionRate: Number(commissionRate) || 50,
        startTime,
        endTime,
        lunchStart,
        lunchEnd,
        color,
        workDays,
        active,
      });

      addToast({
        type: 'success',
        title: 'Profissional Atualizado',
        message: `Cadastro e configurações de ${name.trim()} salvos com sucesso!`,
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
              Gestão de perfil, fotos, especialidades e turnos de atendimento.
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
              className="p-6 rounded-2xl bg-[#111114] border border-white/[0.08] hover:border-white/[0.16] space-y-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
            >
              {/* Top Identity */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-4">
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

                    <div className="flex items-center gap-2 pt-0.5">
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
                      <span className="text-[11px] font-mono text-zinc-500">
                        {barber.id}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => openEdit(barber)}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-200 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-sm shrink-0"
                >
                  <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                  Editar
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
                    Turno de Trabalho
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

              {/* Work Days Badges & Days Off */}
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-zinc-400 block text-[11px] font-medium uppercase tracking-wider mb-1.5">
                    Dias de Atendimento na Semana:
                  </span>
                  <div className="flex gap-1.5 flex-wrap">
                    {daysLabels.map((d) => {
                      const isWorking = barber.workDays.includes(d.day);
                      return (
                        <span
                          key={d.day}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            isWorking
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              : 'bg-[#17171c] text-zinc-600 border border-white/[0.04]'
                          }`}
                        >
                          {d.label}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {offDays.length > 0 && (
                  <div className="text-xs text-zinc-500 font-mono">
                    Folgas:{' '}
                    <span className="text-zinc-400">
                      {offDays.map((d) => daysLabels.find((dl) => dl.day === d)?.fullName).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Profile & Shift Modal */}
      {editingBarber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#111114] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-4 h-4 text-amber-400" />
                <h3 className="font-semibold text-base text-zinc-100">
                  Configurar Profissional · Cadeira
                </h3>
              </div>
              <button
                onClick={() => setEditingBarber(null)}
                className="text-zinc-400 hover:text-zinc-100 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs sm:text-sm">
              {/* Permanent ID notice */}
              <div className="p-3 rounded-xl bg-[#17171c] border border-white/[0.06] flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>Identificador Permanente:</span>
                <span className="text-amber-400 font-bold">{editingBarber.id}</span>
              </div>

              {/* SECTION: Personal & Profile Info */}
              <div className="space-y-3 p-4 rounded-xl bg-[#17171c]/70 border border-white/[0.06]">
                <span className="block text-amber-400 font-medium uppercase tracking-wider text-[11px]">
                  1. Dados Cadastrais & Apresentação
                </span>

                <div>
                  <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                    Nome Completo do Barbeiro *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Lukinha Ferraz"
                    className="w-full px-3.5 py-2 text-sm bg-[#111114] border border-white/[0.08] rounded-xl text-zinc-100 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                    URL da Foto / Avatar
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

                <div>
                  <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                    Descrição / Biografia
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Breve resumo sobre a técnica, estilo e atendimento do profissional..."
                    className="w-full px-3.5 py-2 text-sm bg-[#111114] border border-white/[0.08] rounded-xl text-zinc-100 focus:outline-none focus:border-amber-400 resize-none"
                  />
                </div>

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
                      placeholder="50"
                      className="w-full px-3.5 py-2 text-sm bg-[#111114] border border-white/[0.08] rounded-xl text-zinc-100 focus:outline-none focus:border-amber-400 font-mono pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 font-mono font-bold text-xs pointer-events-none">
                      %
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400 mt-1 block">
                    Calcula automaticamente a parcela do barbeiro e a margem retida pela barbearia a cada atendimento.
                  </span>
                </div>

                {/* Active / Inactive Status Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="font-medium text-xs text-zinc-200 block">
                      Status Operacional
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Profissionais inativos não recebem agendamentos online.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActive(!active)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      active
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {active ? 'Ativo na Escala' : 'Inativo / Pausado'}
                  </button>
                </div>
              </div>

              {/* SECTION: Shift & Hours */}
              <div className="space-y-3 p-4 rounded-xl bg-[#17171c]/70 border border-white/[0.06]">
                <span className="block text-amber-400 font-medium uppercase tracking-wider text-[11px]">
                  2. Horários & Intervalos do Turno
                </span>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                      Início do Turno *
                    </label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm font-mono bg-[#111114] border border-white/[0.08] rounded-xl text-zinc-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                      Fim do Turno *
                    </label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm font-mono bg-[#111114] border border-white/[0.08] rounded-xl text-zinc-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                      Início Almoço *
                    </label>
                    <input
                      type="time"
                      required
                      value={lunchStart}
                      onChange={(e) => setLunchStart(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm font-mono bg-[#111114] border border-white/[0.08] rounded-xl text-zinc-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                      Fim Almoço *
                    </label>
                    <input
                      type="time"
                      required
                      value={lunchEnd}
                      onChange={(e) => setLunchEnd(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm font-mono bg-[#111114] border border-white/[0.08] rounded-xl text-zinc-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: Days of Work */}
              <div className="space-y-3 p-4 rounded-xl bg-[#17171c]/70 border border-white/[0.06]">
                <span className="block text-amber-400 font-medium uppercase tracking-wider text-[11px]">
                  3. Dias de Atendimento na Semana
                </span>
                <p className="text-xs text-zinc-400">
                  Dias desmarcados são tratados automaticamente como folga do profissional.
                </p>

                <div className="flex gap-2 flex-wrap">
                  {daysLabels.map((d) => {
                    const isWorking = workDays.includes(d.day);
                    return (
                      <button
                        type="button"
                        key={d.day}
                        onClick={() => toggleDay(d.day)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                          isWorking
                            ? 'bg-amber-500 text-zinc-950 shadow-sm'
                            : 'bg-[#111114] text-zinc-400 border border-white/[0.08]'
                        }`}
                      >
                        {isWorking && <Check className="w-3 h-3 stroke-[2.5]" />}
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION: Calendar Color */}
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
                  className="px-5 py-2.5 font-semibold text-xs bg-amber-500 text-zinc-950 hover:bg-amber-400 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {submitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
