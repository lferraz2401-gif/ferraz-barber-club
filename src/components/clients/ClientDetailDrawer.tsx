import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.js';
import { api } from '../../services/api.js';
import { Customer, Appointment } from '../../types/index.js';
import { WhatsAppButton } from '../common/WhatsAppButton.js';
import {
  X,
  Phone,
  Mail,
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  UserCheck,
  Plus,
  Scissors,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Crown,
  Sparkles,
  Gift,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { CLUB_FERRAZ_PLANS } from '../../constants/clubPlans.js';
import { ClubPlanTier } from '../../types/index.js';

interface ClientDetailProps {
  customerId: string | null;
  onClose: () => void;
  onEditClient?: (customer: Customer) => void;
}

export const ClientDetailDrawer: React.FC<ClientDetailProps> = ({
  customerId,
  onClose,
  onEditClient,
}) => {
  const { openNewAppointmentWith, addToast, refreshAll } = useApp();
  const [customer, setCustomer] = useState<(Customer & { appointments: Appointment[] }) | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customerId) {
      setLoading(true);
      api
        .getCustomerById(customerId)
        .then((data) => setCustomer(data))
        .catch((err) => {
          console.error(err);
          addToast({
            type: 'error',
            title: 'Erro ao carregar',
            message: 'Não foi possível carregar os detalhes do cliente.',
          });
        })
        .finally(() => setLoading(false));
    } else {
      setCustomer(null);
    }
  }, [customerId, addToast]);

  const [updatingMembership, setUpdatingMembership] = useState(false);
  const [selectedPlanToAssign, setSelectedPlanToAssign] = useState<ClubPlanTier>('STANDARD');

  const handleAssignPlan = async (tier: ClubPlanTier) => {
    if (!customer) return;
    try {
      setUpdatingMembership(true);
      const updated = await api.setCustomerMembership(customer.id, tier);
      setCustomer((prev) => (prev ? { ...prev, membership: updated.membership } : null));
      await refreshAll();
      addToast({
        type: 'success',
        title: 'Club Ferraz Ativado!',
        message: `${customer.name} agora é membro ${tier} do Club Ferraz.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao ativar plano',
        message: err.message,
      });
    } finally {
      setUpdatingMembership(false);
    }
  };

  const handleRemovePlan = async () => {
    if (!customer) return;
    if (!confirm('Deseja realmente cancelar a assinatura do Club Ferraz deste cliente?')) return;
    try {
      setUpdatingMembership(true);
      await api.removeCustomerMembership(customer.id);
      setCustomer((prev) => (prev ? { ...prev, membership: undefined } : null));
      await refreshAll();
      addToast({
        type: 'info',
        title: 'Assinatura Cancelada',
        message: 'O plano Club Ferraz foi desvinculado.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao remover plano',
        message: err.message,
      });
    } finally {
      setUpdatingMembership(false);
    }
  };

  const handleManualCreditAdjust = async (key: string, delta: number) => {
    if (!customer || !customer.membership) return;
    const currentCredits = customer.membership.credits;
    const updatedCredits = { ...currentCredits };

    if (key === 'haircut') {
      updatedCredits.haircutsUsed = Math.max(0, Math.min(updatedCredits.haircutsTotal, updatedCredits.haircutsUsed + delta));
    } else if (key === 'beard') {
      updatedCredits.beardsUsed = Math.max(0, Math.min(updatedCredits.beardsTotal, updatedCredits.beardsUsed + delta));
    } else if (key === 'eyebrow') {
      updatedCredits.eyebrowsUsed = Math.max(0, Math.min(updatedCredits.eyebrowsTotal, updatedCredits.eyebrowsUsed + delta));
    } else if (key === 'skincare') {
      updatedCredits.skinCareUsed = Math.max(0, Math.min(updatedCredits.skinCareTotal, updatedCredits.skinCareUsed + delta));
    } else if (key === 'pomade') {
      updatedCredits.pomadeGiftClaimed = !updatedCredits.pomadeGiftClaimed;
    }

    try {
      setUpdatingMembership(true);
      const updated = await api.updateCustomerMembership(customer.id, { credits: updatedCredits });
      setCustomer((prev) => (prev ? { ...prev, membership: updated.membership } : null));
      await refreshAll();
      addToast({
        type: 'success',
        title: 'Saldo Atualizado',
        message: 'Créditos do plano ajustados com sucesso.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao ajustar',
        message: err.message,
      });
    } finally {
      setUpdatingMembership(false);
    }
  };

  const [updatingBlock, setUpdatingBlock] = useState(false);

  const handleToggleOnlineBlock = async (shouldBlock: boolean) => {
    if (!customer) return;
    try {
      setUpdatingBlock(true);
      const updated = await api.updateCustomer(customer.id, {
        isBlockedFromOnlineBooking: shouldBlock,
        blockedReason: shouldBlock ? 'Bloqueio manual administrativo' : '',
      });
      setCustomer((prev) =>
        prev
          ? {
              ...prev,
              isBlockedFromOnlineBooking: updated.isBlockedFromOnlineBooking,
              blockedReason: updated.blockedReason,
            }
          : null
      );
      await refreshAll();
      addToast({
        type: shouldBlock ? 'warning' : 'success',
        title: shouldBlock ? 'Agendamento Online Bloqueado' : 'Agendamento Online Liberado',
        message: shouldBlock
          ? 'O cliente agora precisa de aprovação manual via WhatsApp para agendar horários.'
          : 'O cliente agora pode agendar online normalmente no portal /agendar.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao alterar bloqueio',
        message: err.message,
      });
    } finally {
      setUpdatingBlock(false);
    }
  };

  if (!customerId) return null;

  const completedAppointments = customer?.appointments.filter((a) => a.status === 'COMPLETED') || [];
  const nextAppointment = customer?.appointments.find(
    (a) =>
      (a.status === 'CONFIRMED' || a.status === 'IN_PROGRESS') &&
      a.date >= new Date().toISOString().split('T')[0]
  );

  const avgTicket =
    customer && customer.totalVisits > 0
      ? (customer.totalSpent / customer.totalVisits).toFixed(2)
      : '0.00';

  // Calculate service frequency
  const serviceFreq: Record<string, number> = {};
  for (const apt of completedAppointments) {
    serviceFreq[apt.serviceName] = (serviceFreq[apt.serviceName] || 0) + 1;
  }
  const topServices = Object.entries(serviceFreq).sort((a, b) => b[1] - a[1]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-[#0c1018] border-l border-[#1a2333] h-full flex flex-col z-10 shadow-2xl overflow-hidden">
        {/* Drawer Header (FC 25 Athletic Style) */}
        <div className="px-6 py-4 border-b border-[#1a2333] flex items-center justify-between bg-[#0e1420]">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-6 bg-amber-400 rounded-sm" />
            <span className="text-xs uppercase tracking-wider font-display font-black text-amber-400">
              DOSSIÊ DO CLIENTE // HISTÓRICO & PERFORMANCE
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-[#151c2a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading || !customer ? (
            <div className="text-center py-16 text-zinc-500 text-xs font-mono">
              Carregando dados completos do cliente...
            </div>
          ) : (
            <>
              {/* Primary Identity Card (FC 25 Player Bio Profile) */}
              <div className="p-5 rounded-2xl bg-[#111724] border border-[#1e283b] space-y-4 shadow-xl">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display font-black text-2xl text-zinc-100 uppercase tracking-wide">
                      {customer.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-zinc-400 font-mono flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-zinc-500" />
                        {customer.whatsapp}
                      </span>
                      {customer.status === 'ACTIVE' && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                          Recente
                        </span>
                      )}
                      {customer.status === 'RETURN_NEEDED' && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-amber-400/10 text-amber-300 border border-amber-400/30">
                          Retorno Pendente
                        </span>
                      )}
                      {customer.status === 'INACTIVE' && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-rose-500/10 text-rose-300 border border-rose-500/30">
                          Atrasado
                        </span>
                      )}
                      {customer.isBlockedFromOnlineBooking && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-rose-400" />
                          Bloqueado Online ({customer.noShowCount || 0} faltas)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onEditClient && (
                      <button
                        onClick={() => onEditClient(customer)}
                        className="p-2 rounded-xl bg-[#182133] hover:bg-[#202b42] text-zinc-300 border border-[#263552] transition-colors cursor-pointer"
                        title="Editar Dados do Cliente"
                      >
                        <Edit2 className="w-4 h-4 text-amber-400" />
                      </button>
                    )}
                    <WhatsAppButton
                      phone={customer.whatsapp}
                      customerName={customer.name}
                      variant="dropdown"
                    />
                  </div>
                </div>

                {customer.email && (
                  <div className="text-xs text-zinc-400 flex items-center gap-1.5 pt-1 font-mono">
                    <Mail className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{customer.email}</span>
                  </div>
                )}

                {customer.birthDate && (
                  <div className="text-xs text-zinc-400 flex items-center gap-1.5 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Nascimento: {customer.birthDate}</span>
                  </div>
                )}

                {customer.notes && (
                  <div className="p-3 rounded-xl bg-[#090d14] border border-[#1a2333] text-xs text-zinc-300">
                    <span className="font-display font-bold uppercase tracking-wider text-amber-400 block mb-0.5 text-[11px]">
                      Observações & Preferências:
                    </span>
                    {customer.notes}
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={() => {
                      onClose();
                      openNewAppointmentWith({ customerId: customer.id });
                    }}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-display font-black uppercase tracking-wider bg-amber-400 text-zinc-950 hover:bg-amber-300 flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-400/20 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    Agendar Novo Horário para {customer.name.split(' ')[0]}
                  </button>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* ANTI NO-SHOW & CONTROLE DE AGENDAMENTO ONLINE */}
              {/* ========================================================================= */}
              <div className="p-4 rounded-2xl bg-[#111724] border border-[#1e283b] space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        customer.isBlockedFromOnlineBooking
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      }`}
                    >
                      {customer.isBlockedFromOnlineBooking ? (
                        <ShieldAlert className="w-4 h-4" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 block">
                        POLÍTICA DE FALTAS & PORTAL ONLINE
                      </span>
                      <h4 className="font-display font-black text-sm text-zinc-100 uppercase tracking-wide">
                        {customer.isBlockedFromOnlineBooking
                          ? 'Agendamento Online Suspenso'
                          : 'Agendamento Online Liberado'}
                      </h4>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                      customer.isBlockedFromOnlineBooking
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {customer.isBlockedFromOnlineBooking ? 'Bloqueado' : 'Liberado'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-[#090d14] border border-[#1a2333]">
                    <span className="text-zinc-500 block text-[10px] uppercase">Faltas no Histórico:</span>
                    <strong
                      className={`text-sm ${
                        customer.noShowCount && customer.noShowCount > 0 ? 'text-rose-400' : 'text-zinc-300'
                      }`}
                    >
                      {customer.noShowCount || 0} falta(s)
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#090d14] border border-[#1a2333]">
                    <span className="text-zinc-500 block text-[10px] uppercase">Faltas Consecutivas:</span>
                    <strong
                      className={`text-sm ${
                        customer.consecutiveNoShows && customer.consecutiveNoShows > 0 ? 'text-rose-400' : 'text-zinc-300'
                      }`}
                    >
                      {customer.consecutiveNoShows || 0} consecutiva(s)
                    </strong>
                  </div>
                </div>

                {customer.isBlockedFromOnlineBooking && customer.blockedReason && (
                  <p className="text-[11px] text-rose-300 font-mono bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                    Motivo: {customer.blockedReason}
                  </p>
                )}

                <div className="pt-1">
                  {customer.isBlockedFromOnlineBooking ? (
                    <button
                      disabled={updatingBlock}
                      onClick={() => handleToggleOnlineBlock(false)}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-display font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Desbloquear Agendamento Online (Perdoar Faltas)
                    </button>
                  ) : (
                    <button
                      disabled={updatingBlock}
                      onClick={() => handleToggleOnlineBlock(true)}
                      className="w-full py-2.5 px-3 rounded-xl bg-white/[0.04] hover:bg-rose-500/15 text-zinc-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 text-xs font-display font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      Bloquear Agendamento Online Manualmente
                    </button>
                  )}
                </div>
              </div>

              {/* ========================================================================= */}
              {/* CLUB FERRAZ // IDENTIFICAÇÃO E CONTROLE DE USO MENSAL */}
              {/* ========================================================================= */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-[#1c180a] to-[#111724] border-2 border-amber-400/60 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-amber-400/20">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center">
                      <Crown className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-display font-black text-sm uppercase tracking-wider text-white flex items-center gap-2">
                        CLUB FERRAZ // MENSALIDADE
                      </h4>
                      <span className="text-[11px] font-mono text-zinc-400">
                        {customer.membership && customer.membership.active
                          ? `Plano Ativo • Renova em ${customer.membership.renewsAt.split('-').reverse().join('/')}`
                          : 'Cliente ainda não possui assinatura ativa'}
                      </span>
                    </div>
                  </div>

                  {customer.membership?.active ? (
                    <span className="px-3 py-1 rounded-full text-xs font-display font-black uppercase tracking-wider bg-amber-400 text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                      {customer.membership.tier} VIP
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-white/5 text-zinc-400 border border-white/10">
                      Sem Plano
                    </span>
                  )}
                </div>

                {customer.membership && customer.membership.active ? (
                  <div className="space-y-4">
                    {/* Consumo de Créditos no Mês */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
                        <span className="font-bold text-amber-400 uppercase text-[11px] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          CONTROLE DE CRÉDITOS NESTE MÊS:
                        </span>
                        <span className="text-zinc-500 text-[10px]">Baixa real ao finalizar corte</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        {/* Cortes */}
                        <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-2">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-zinc-300 font-bold">✂️ Cortes:</span>
                            <span className="text-amber-400 font-bold">
                              {customer.membership.credits.haircutsUsed} / {customer.membership.credits.haircutsTotal}
                            </span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-amber-400 h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (customer.membership.credits.haircutsUsed / customer.membership.credits.haircutsTotal) * 100
                                )}%`,
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] font-mono text-zinc-400">
                              Resta: {Math.max(0, customer.membership.credits.haircutsTotal - customer.membership.credits.haircutsUsed)}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                disabled={updatingMembership || customer.membership.credits.haircutsUsed <= 0}
                                onClick={() => handleManualCreditAdjust('haircut', -1)}
                                className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-zinc-300 flex items-center justify-center text-xs font-mono disabled:opacity-30 cursor-pointer"
                                title="Estornar 1 crédito"
                              >
                                -
                              </button>
                              <button
                                disabled={updatingMembership || customer.membership.credits.haircutsUsed >= customer.membership.credits.haircutsTotal}
                                onClick={() => handleManualCreditAdjust('haircut', 1)}
                                className="w-5 h-5 rounded bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 flex items-center justify-center text-xs font-mono disabled:opacity-30 cursor-pointer"
                                title="Debitar 1 corte manualmente"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Barbas */}
                        <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-2">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-zinc-300 font-bold">🪒 Barbas:</span>
                            <span className="text-amber-400 font-bold">
                              {customer.membership.credits.beardsUsed} / {customer.membership.credits.beardsTotal}
                            </span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-400 h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(
                                  100,
                                  customer.membership.credits.beardsTotal > 0
                                    ? (customer.membership.credits.beardsUsed / customer.membership.credits.beardsTotal) * 100
                                    : 0
                                )}%`,
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] font-mono text-zinc-400">
                              Resta: {Math.max(0, customer.membership.credits.beardsTotal - customer.membership.credits.beardsUsed)}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                disabled={updatingMembership || customer.membership.credits.beardsUsed <= 0}
                                onClick={() => handleManualCreditAdjust('beard', -1)}
                                className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-zinc-300 flex items-center justify-center text-xs font-mono disabled:opacity-30 cursor-pointer"
                              >
                                -
                              </button>
                              <button
                                disabled={updatingMembership || customer.membership.credits.beardsUsed >= customer.membership.credits.beardsTotal}
                                onClick={() => handleManualCreditAdjust('beard', 1)}
                                className="w-5 h-5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 flex items-center justify-center text-xs font-mono disabled:opacity-30 cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Limpeza de Pele */}
                        {customer.membership.credits.skinCareTotal > 0 && (
                          <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-2 col-span-2 sm:col-span-1">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="text-zinc-300 font-bold">💆 Limpeza Pele:</span>
                              <span className="text-cyan-400 font-bold">
                                {customer.membership.credits.skinCareUsed} / {customer.membership.credits.skinCareTotal}
                              </span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-cyan-400 h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    (customer.membership.credits.skinCareUsed / customer.membership.credits.skinCareTotal) * 100
                                  )}%`,
                                }}
                              />
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[10px] font-mono text-zinc-400">
                                Resta: {Math.max(0, customer.membership.credits.skinCareTotal - customer.membership.credits.skinCareUsed)}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  disabled={updatingMembership || customer.membership.credits.skinCareUsed <= 0}
                                  onClick={() => handleManualCreditAdjust('skincare', -1)}
                                  className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-zinc-300 flex items-center justify-center text-xs font-mono disabled:opacity-30 cursor-pointer"
                                >
                                  -
                                </button>
                                <button
                                  disabled={updatingMembership || customer.membership.credits.skinCareUsed >= customer.membership.credits.skinCareTotal}
                                  onClick={() => handleManualCreditAdjust('skincare', 1)}
                                  className="w-5 h-5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 flex items-center justify-center text-xs font-mono disabled:opacity-30 cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Brinde Pomada (Apenas PRO) */}
                        {customer.membership.credits.pomadeGiftTotal > 0 && (
                          <div className="p-3 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between col-span-2 sm:col-span-1">
                            <div className="space-y-0.5">
                              <span className="text-xs font-mono text-zinc-300 font-bold flex items-center gap-1">
                                <Gift className="w-3.5 h-3.5 text-amber-400" />
                                Pomada Brinde:
                              </span>
                              <span className="text-[10px] font-mono text-zinc-400 block">
                                {customer.membership.credits.pomadeGiftClaimed ? 'Entregue ao cliente' : 'Pendente de retirada'}
                              </span>
                            </div>
                            <button
                              onClick={() => handleManualCreditAdjust('pomade', 0)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold uppercase transition-all cursor-pointer ${
                                customer.membership.credits.pomadeGiftClaimed
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-400 text-zinc-950 hover:bg-amber-300'
                              }`}
                            >
                              {customer.membership.credits.pomadeGiftClaimed ? 'Entregue ✓' : 'Entregar Brinde'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ações da Assinatura */}
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                      <button
                        disabled={updatingMembership}
                        onClick={() => handleAssignPlan(customer.membership!.tier)}
                        className="text-amber-400 hover:text-amber-300 font-mono text-[11px] flex items-center gap-1 cursor-pointer"
                        title="Reiniciar créditos para novo mês de assinatura"
                      >
                        <RefreshCw className="w-3 h-3" /> Renovar Ciclo Mensal
                      </button>
                      <button
                        disabled={updatingMembership}
                        onClick={handleRemovePlan}
                        className="text-rose-400 hover:text-rose-300 font-mono text-[11px] cursor-pointer"
                      >
                        Cancelar Assinatura
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Ativação de Plano para o Cliente */
                  <div className="space-y-3">
                    <p className="text-xs text-zinc-300">
                      Vincule este cliente a um dos 3 planos do <strong>Club Ferraz</strong> para liberar agendamento VIP a R$ 0,00 e controle de cortes mensais:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {(['STANDARD', 'PLUS', 'PRO'] as ClubPlanTier[]).map((tierKey) => {
                        const plan = CLUB_FERRAZ_PLANS[tierKey];
                        return (
                          <button
                            key={tierKey}
                            type="button"
                            onClick={() => setSelectedPlanToAssign(tierKey)}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer space-y-1 ${
                              selectedPlanToAssign === tierKey
                                ? 'bg-amber-400/20 border-amber-400 text-white shadow-lg shadow-amber-400/10'
                                : 'bg-black/40 border-white/10 text-zinc-400 hover:border-white/20'
                            }`}
                          >
                            <span className="font-display font-black text-xs uppercase block text-white">
                              {plan.badge}
                            </span>
                            <span className="text-sm font-display font-black text-amber-400 block tabular-nums">
                              R$ {plan.priceMonthly}/mês
                            </span>
                            <span className="text-[10px] text-zinc-400 block leading-tight">
                              {tierKey === 'STANDARD' && '4 cortes + sob + 1 barba brinde'}
                              {tierKey === 'PLUS' && '4 cortes + sob + 2 barbas + limpeza'}
                              {tierKey === 'PRO' && '4 cortes + sob + 4 barbas + 2 limp + pomada'}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      disabled={updatingMembership}
                      onClick={() => handleAssignPlan(selectedPlanToAssign)}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-display font-black uppercase tracking-wider bg-amber-400 text-zinc-950 hover:bg-amber-300 flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer disabled:opacity-50"
                    >
                      <Crown className="w-4 h-4 stroke-[2.5]" />
                      <span>{updatingMembership ? 'Ativando Assinatura...' : `Ativar ${CLUB_FERRAZ_PLANS[selectedPlanToAssign].name}`}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Next Scheduled Appointment (if exists) */}
              {nextAppointment && (
                <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/30 space-y-2 shadow-md">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-display font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-400" />
                      Próximo Agendamento
                    </span>
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-400/20 text-amber-300">
                      {nextAppointment.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-display font-bold uppercase text-zinc-100">
                      {nextAppointment.serviceName}
                    </span>
                    <span className="font-mono font-bold text-amber-400">
                      {nextAppointment.date} às {nextAppointment.time}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 font-medium">
                    Barbeiro: <strong className="text-zinc-200">{nextAppointment.barberName}</strong> • Duração: {nextAppointment.durationMinutes} min
                  </div>
                </div>
              )}

              {/* CRM & Frequency KPIs (FC 25 Performance Hex/Grid) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-[#111724] border border-[#1e283b] shadow-sm">
                  <span className="text-[10px] text-zinc-400 uppercase font-display font-bold tracking-wider block">Total Visitas</span>
                  <span className="text-2xl font-display font-black text-zinc-100">
                    {customer.totalVisits}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#111724] border border-[#1e283b] shadow-sm">
                  <span className="text-[10px] text-zinc-400 uppercase font-display font-bold tracking-wider block">Total Gasto</span>
                  <span className="text-2xl font-display font-black text-amber-400">
                    R$ {customer.totalSpent.toFixed(0)}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#111724] border border-[#1e283b] shadow-sm">
                  <span className="text-[10px] text-zinc-400 uppercase font-display font-bold tracking-wider block">Ticket Médio</span>
                  <span className="text-2xl font-display font-black text-zinc-100">
                    R$ {avgTicket}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#111724] border border-[#1e283b] shadow-sm">
                  <span className="text-[10px] text-zinc-400 uppercase font-display font-bold tracking-wider block">Frequência</span>
                  <span className="text-2xl font-display font-black text-zinc-100">
                    {customer.avgFrequencyDays ? `${customer.avgFrequencyDays}d` : '—'}
                  </span>
                </div>
              </div>

              {/* Preferred Barber & Top Services */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-xl bg-[#111724] border border-[#1e283b] space-y-2">
                  <span className="text-zinc-400 block font-display font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-amber-400" />
                    Barbeiro Preferido
                  </span>
                  <div className="text-sm font-display font-black uppercase text-zinc-100">
                    {customer.preferredBarberName || 'Rotativo / Sem preferência'}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#111724] border border-[#1e283b] space-y-2">
                  <span className="text-zinc-400 block font-display font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Scissors className="w-4 h-4 text-amber-400" />
                    Serviços Mais Realizados
                  </span>
                  <div className="space-y-1">
                    {topServices.slice(0, 2).map(([name, count]) => (
                      <div key={name} className="flex justify-between text-zinc-300 font-medium">
                        <span className="truncate">{name}</span>
                        <span className="font-mono font-bold text-amber-400">{count}x</span>
                      </div>
                    ))}
                    {topServices.length === 0 && (
                      <span className="text-zinc-500 font-mono">Nenhum serviço registrado ainda.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Complete Appointment History (Preserving Frozen Prices!) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-black text-sm text-zinc-200 uppercase tracking-wide">
                    Histórico de Atendimentos ({customer.appointments.length})
                  </h4>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">
                    Valores congelados na data
                  </span>
                </div>

                <div className="space-y-2">
                  {customer.appointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="p-3.5 rounded-xl bg-[#111724] border border-[#1e283b] hover:border-zinc-700 flex items-center justify-between text-xs transition-colors shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-sm text-zinc-100 uppercase">
                            {apt.serviceName}
                          </span>
                          <span
                            className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                              apt.status === 'COMPLETED'
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                                : apt.status === 'CONFIRMED'
                                ? 'bg-sky-500/10 text-sky-300 border border-sky-500/30'
                                : apt.status === 'IN_PROGRESS'
                                ? 'bg-amber-400/10 text-amber-300 border border-amber-400/30'
                                : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {apt.status}
                          </span>
                        </div>
                        <div className="text-zinc-400 flex items-center gap-3 font-mono text-xs">
                          <span>{apt.date} • {apt.time}</span>
                          <span>Barbeiro: <strong className="text-zinc-200">{apt.barberName}</strong></span>
                          <span>{apt.durationMinutes} min</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-display font-black text-amber-400 block">
                          R$ {apt.priceCharged?.toFixed(2) || '0.00'}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">Preço Congelado</span>
                      </div>
                    </div>
                  ))}

                  {customer.appointments.length === 0 && (
                    <div className="text-center py-6 text-zinc-500 text-xs font-mono">
                      Nenhum atendimento realizado até o momento.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
