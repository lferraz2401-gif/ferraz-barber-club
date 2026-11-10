import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.js';
import { api } from '../../services/api.js';
import { ScheduleBlock } from '../../types/index.js';
import { getOperationDateTime } from '../../utils/datetime.js';
import {
  CalendarX2,
  Plus,
  Trash2,
  Clock,
  Calendar,
  AlertCircle,
  ShieldAlert,
  Save,
  X,
  UserCheck,
  Ban,
} from 'lucide-react';

export const ScheduleBlocksView: React.FC = () => {
  const { barbers, addToast } = useApp();
  const { todayStr } = getOperationDateTime();

  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New block form fields
  const [targetBarberId, setTargetBarberId] = useState<string>('all');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [isFullDay, setIsFullDay] = useState(true);
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('18:00');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBlocks = async () => {
    try {
      setLoading(true);
      const data = await api.getBlocks();
      setBlocks(data);
    } catch (err: any) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Erro ao carregar bloqueios',
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocks();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.deleteBlock(id);
      addToast({
        type: 'success',
        title: 'Bloqueio Removido',
        message: 'Horário liberado na agenda para novos agendamentos.',
      });
      await fetchBlocks();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao remover',
        message: err.message,
      });
    }
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      addToast({
        type: 'error',
        title: 'Motivo obrigatório',
        message: 'Informe o motivo do bloqueio para o histórico da barbearia.',
      });
      return;
    }

    try {
      setSubmitting(true);
      await api.createBlock({
        barberId: targetBarberId === 'all' ? undefined : targetBarberId,
        startDate,
        endDate,
        startTime: isFullDay ? undefined : startTime,
        endTime: isFullDay ? undefined : endTime,
        reason: reason.trim(),
      });

      addToast({
        type: 'success',
        title: 'Bloqueio Criado',
        message: 'Horário bloqueado com sucesso na grade de atendimento.',
      });
      setIsModalOpen(false);
      setReason('');
      await fetchBlocks();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao criar bloqueio',
        message: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header (FC 25 Athletic Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0c1018] p-4 rounded-xl border border-[#1a2333] shadow-lg shadow-black/30">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-9 bg-rose-500 rounded-sm shrink-0" />
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-display font-black text-xl text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                BLOQUEIOS DE GRADE // INTERDIÇÃO OPERACIONAL
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30 font-bold uppercase tracking-wider">
                {blocks.length} INTERDIÇÕES ATIVAS
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5 font-medium">
              Interdite cadeiras para folgas, reformas ou feriados para blindar a agenda contra reservas indevidas.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-display font-black uppercase tracking-wider bg-rose-500 text-zinc-100 hover:bg-rose-400 transition-all shadow-md shadow-rose-500/20 active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          + Novo Bloqueio
        </button>
      </div>

      {/* Blocks List */}
      <div className="space-y-2.5">
        {blocks.map((blk) => {
          const barber = barbers.find((b) => b.id === blk.barberId);

          return (
            <div
              key={blk.id}
              className="p-4 rounded-xl bg-[#0c1018] border border-[#1a2333] hover:border-zinc-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors shadow-lg"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-display font-black text-base text-zinc-100 uppercase tracking-wide">
                    {blk.reason}
                  </span>
                  <span
                    className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                      blk.barberId
                        ? 'bg-amber-400/10 text-amber-300 border border-amber-400/30'
                        : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {blk.barberId ? `Cadeira: ${barber?.name || 'Específico'}` : 'Toda a Barbearia'}
                  </span>
                </div>

                <div className="text-zinc-400 flex items-center gap-3 font-mono text-xs">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    {blk.startDate} até {blk.endDate}
                  </span>
                  <span className="text-zinc-600">//</span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    {blk.startTime && blk.endTime
                      ? `${blk.startTime} às ${blk.endTime}`
                      : 'Dia Inteiro'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => handleDelete(blk.id)}
                  title="Remover Bloqueio"
                  className="p-2.5 rounded-lg bg-[#111724] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-[#1e283b] hover:border-rose-500/40 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {blocks.length === 0 && (
          <div className="p-12 text-center text-zinc-500 text-xs font-mono rounded-xl bg-[#0c1018] border border-[#1a2333]">
            Nenhum bloqueio configurado no momento. Todas as cadeiras estão operando normalmente.
          </div>
        )}
      </div>

      {/* Modal New Block */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0c1018] border border-[#1a2333] rounded-2xl shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1a2333]">
              <h3 className="font-display font-black text-base text-zinc-100 flex items-center gap-2 uppercase tracking-wider">
                <Ban className="w-4 h-4 text-rose-400" />
                CRIAR BLOQUEIO DE HORÁRIO
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-100 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBlock} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-300 font-display font-bold uppercase tracking-wider text-xs mb-1">
                  CADEIRA / DESTINO *
                </label>
                <select
                  value={targetBarberId}
                  onChange={(e) => setTargetBarberId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-display font-bold uppercase bg-[#111724] border border-[#1e283b] rounded-lg text-zinc-100 focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="all">TODA A BARBEARIA (TODOS OS BARBEIROS)</option>
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name.toUpperCase()} (CADEIRA ESPECÍFICA)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-display font-bold uppercase tracking-wider text-xs mb-1">
                  MOTIVO DA INTERDIÇÃO *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Folga semanal, Curso de especialização, Reforma..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#111724] border border-[#1e283b] rounded-lg text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-display font-bold uppercase tracking-wider text-xs mb-1">
                    DATA INICIAL *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#111724] border border-[#1e283b] rounded-lg text-zinc-100 focus:outline-none focus:border-amber-400 font-mono cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-display font-bold uppercase tracking-wider text-xs mb-1">
                    DATA FINAL *
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#111724] border border-[#1e283b] rounded-lg text-zinc-100 focus:outline-none focus:border-amber-400 font-mono cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer text-zinc-300 text-xs font-display font-bold uppercase tracking-wider my-2">
                  <input
                    type="checkbox"
                    checked={isFullDay}
                    onChange={(e) => setIsFullDay(e.target.checked)}
                    className="rounded accent-rose-500 cursor-pointer"
                  />
                  <span>BLOQUEAR O DIA INTEIRO</span>
                </label>
              </div>

              {!isFullDay && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-zinc-300 font-display font-bold uppercase tracking-wider text-xs mb-1">
                      HORA INICIAL *
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#111724] border border-[#1e283b] rounded-lg text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-display font-bold uppercase tracking-wider text-xs mb-1">
                      HORA FINAL *
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#111724] border border-[#1e283b] rounded-lg text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1a2333]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 font-display font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 font-display font-black uppercase tracking-wider bg-rose-500 text-zinc-100 hover:bg-rose-400 rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {submitting ? 'BLOQUEANDO...' : 'CONFIRMAR BLOQUEIO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
