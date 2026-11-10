import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.js';
import { api } from '../../services/api.js';
import { Service } from '../../types/index.js';
import {
  Scissors,
  Plus,
  Edit2,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  Save,
  X,
  Sparkles,
  Crown,
  Gift,
  Power,
  AlertTriangle,
} from 'lucide-react';
import { CLUB_FERRAZ_PLANS, ClubPlanDefinition } from '../../constants/clubPlans.js';
import { ClubPlanTier } from '../../types/index.js';

export const ServicesView: React.FC = () => {
  const { services, settings, refreshAll, addToast } = useApp();
  const [updatingClub, setUpdatingClub] = useState(false);
  const isClubActive = settings?.isClubActive !== false;

  const handleToggleClubStatus = async () => {
    try {
      setUpdatingClub(true);
      const nextStatus = !isClubActive;
      await api.updateSettings({ isClubActive: nextStatus });
      await refreshAll();
      addToast({
        type: nextStatus ? 'success' : 'warning',
        title: nextStatus ? 'Club Ferraz Ativado!' : 'Club Ferraz Pausado!',
        message: nextStatus
          ? 'O Club Ferraz está ATIVO. Clientes podem usar cotas de cortes e assinar planos normalmente.'
          : 'O Club Ferraz foi PAUSADO. Benefícios de assinatura estão temporariamente desabilitados.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao alterar status do Club',
        message: err.message,
      });
    } finally {
      setUpdatingClub(false);
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Club Ferraz Plans state & editing
  const [clubPlans, setClubPlans] = useState<Record<ClubPlanTier, ClubPlanDefinition>>(() => {
    try {
      const saved = localStorage.getItem('fbc_club_plans');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { ...CLUB_FERRAZ_PLANS };
  });

  const [isEditingPlanModalOpen, setIsEditingPlanModalOpen] = useState(false);
  const [editingPlanTier, setEditingPlanTier] = useState<ClubPlanTier | null>(null);
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState(140);
  const [planDescription, setPlanDescription] = useState('');
  const [planGift, setPlanGift] = useState('');

  const openEditPlan = (tier: ClubPlanTier) => {
    const plan = clubPlans[tier];
    setEditingPlanTier(tier);
    setPlanName(plan.name);
    setPlanPrice(plan.priceMonthly);
    setPlanDescription(plan.description);
    setPlanGift(plan.gift);
    setIsEditingPlanModalOpen(true);
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlanTier) return;

    const updatedPlans = {
      ...clubPlans,
      [editingPlanTier]: {
        ...clubPlans[editingPlanTier],
        name: planName.trim(),
        priceMonthly: Number(planPrice),
        description: planDescription.trim(),
        gift: planGift.trim(),
      },
    };

    setClubPlans(updatedPlans);
    try {
      localStorage.setItem('fbc_club_plans', JSON.stringify(updatedPlans));
    } catch {}

    addToast({
      type: 'success',
      title: 'Plano do Club Atualizado!',
      message: `${planName} agora está com valor de R$ ${planPrice}/mês e novas diretrizes salvas.`,
    });
    setIsEditingPlanModalOpen(false);
  };

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(40);
  const [price, setPrice] = useState(50);
  const [active, setActive] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const openCreate = () => {
    setEditingService(null);
    setName('');
    setDescription('');
    setDurationMinutes(40);
    setPrice(50);
    setActive(true);
    setFeatured(false);
    setIsModalOpen(true);
  };

  const openEdit = (srv: Service) => {
    setEditingService(srv);
    setName(srv.name);
    setDescription(srv.description);
    setDurationMinutes(srv.durationMinutes);
    setPrice(srv.price);
    setActive(srv.active);
    setFeatured(srv.featured || false);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (srv: Service) => {
    try {
      await api.updateService(srv.id, { active: !srv.active });
      addToast({
        type: 'success',
        title: 'Status do Serviço Atualizado',
        message: `${srv.name} foi ${!srv.active ? 'ativado' : 'desativado'}.`,
      });
      await refreshAll();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao atualizar',
        message: err.message,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      if (editingService) {
        await api.updateService(editingService.id, {
          name: name.trim(),
          description: description.trim(),
          durationMinutes: Number(durationMinutes),
          price: Number(price),
          active,
          featured,
        });
        addToast({
          type: 'success',
          title: 'Serviço Atualizado',
          message: `${name} foi atualizado com sucesso. Históricos passados permanecem congelados.`,
        });
      } else {
        await api.createService({
          name: name.trim(),
          description: description.trim(),
          durationMinutes: Number(durationMinutes),
          price: Number(price),
          active,
          featured,
        });
        addToast({
          type: 'success',
          title: 'Serviço Criado',
          message: `${name} foi adicionado ao cardápio da barbearia.`,
        });
      }
      await refreshAll();
      setIsModalOpen(false);
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
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg sm:text-xl font-bold text-zinc-100 tracking-tight">
                Catálogo de Serviços & Preços
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                {services.length} Serviços
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Defina tempo de cadeira e precificação para cálculo automático na agenda.
            </p>
          </div>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-amber-500 text-zinc-950 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Novo Serviço
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO ESPECIAL: PLANOS MENSAIS DO CLUB FERRAZ (EDITÁVEIS) */}
      {/* ========================================================================= */}
      <div className={`p-6 rounded-2xl bg-gradient-to-br from-[#16140f] via-[#111114] to-[#111114] border shadow-xl space-y-5 transition-all ${
        isClubActive ? 'border-amber-500/30' : 'border-white/[0.08] opacity-80'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3.5">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
              isClubActive
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}>
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-zinc-100 tracking-tight">
                  Club Ferraz · Assinaturas Mensais
                </h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  isClubActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-400 border border-white/10'
                }`}>
                  {isClubActive ? '● CLUB ATIVO' : '○ CLUB PAUSADO'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {isClubActive
                  ? 'Planos com desconto automático, cotas de cortes e benefícios exclusivos ativos para clientes.'
                  : 'O Club Ferraz está pausado. Assinaturas e vantagens de membros estão temporariamente desabilitadas.'}
              </p>
            </div>
          </div>

          {/* Master ON/OFF Toggle Button */}
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button
              onClick={handleToggleClubStatus}
              disabled={updatingClub}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                isClubActive
                  ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 font-bold shadow-emerald-500/20'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>
                {updatingClub ? 'Alterando...' : isClubActive ? 'Pausar / Desativar Club' : 'Ativar Club Ferraz Agora'}
              </span>
            </button>
          </div>
        </div>

        {/* Warning banner when paused */}
        {!isClubActive && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-3 text-xs leading-relaxed">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <strong className="font-semibold block text-amber-200">
                O Club Ferraz está pausado temporariamente no sistema.
              </strong>
              <span>
                Enquanto pausado, novos planos não são oferecidos no agendamento público e as vantagens automáticas ficam suspensas. Você pode reativar a qualquer instante com 1 clique no botão acima.
              </span>
            </div>
          </div>
        )}

        {/* Club Plans Cards Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${!isClubActive ? 'opacity-70' : ''}`}>
          {(['STANDARD', 'PLUS', 'PRO'] as ClubPlanTier[]).map((tierKey) => {
            const plan = clubPlans[tierKey];
            return (
              <div
                key={tierKey}
                className="p-5 rounded-2xl bg-[#17171c] border border-white/[0.08] hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                      {plan.badge}
                    </span>
                    <button
                      onClick={() => openEditPlan(tierKey)}
                      className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-amber-500/10 text-zinc-400 hover:text-amber-300 border border-white/[0.06] transition-colors cursor-pointer"
                      title="Editar Valores e Descrição do Plano"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <h4 className="font-semibold text-base text-zinc-100">
                      {plan.name}
                    </h4>
                    <span className="font-mono text-2xl font-bold text-emerald-400 tabular-nums">
                      R$ {plan.priceMonthly.toFixed(2)}
                      <span className="text-xs text-zinc-400 font-sans font-normal"> / mês</span>
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {plan.description}
                  </p>

                  <div className="space-y-1.5 pt-1">
                    {plan.includedItems.map((item, idx) => (
                      <div key={idx} className="text-xs text-zinc-300 flex items-center gap-2 font-mono">
                        <span className="text-amber-400">✓</span> {item}
                      </div>
                    ))}
                  </div>

                  {plan.gift && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 font-medium flex items-center gap-2">
                      <Gift className="w-4 h-4 shrink-0" />
                      <span>Brinde: {plan.gift}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => openEditPlan(tierKey)}
                  className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-amber-500/10 text-amber-400 border border-white/[0.08] hover:border-amber-500/30 text-xs font-semibold tracking-wide transition-colors cursor-pointer"
                >
                  Editar Detalhes & Preço
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((srv) => (
          <div
            key={srv.id}
            className={`p-5 rounded-2xl bg-[#111114] border transition-all flex flex-col justify-between shadow-sm hover:shadow-md ${
              srv.active
                ? 'border-white/[0.08] hover:border-white/[0.16]'
                : 'border-white/[0.04] opacity-60'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-base text-zinc-100 tracking-tight">
                    {srv.name}
                  </h3>
                  {srv.featured && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      Popular
                    </span>
                  )}
                </div>

                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-medium ${
                    srv.active
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      : 'bg-zinc-800 text-zinc-400 border border-white/[0.04]'
                  }`}
                >
                  {srv.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                {srv.description || 'Sem descrição cadastrada.'}
              </p>
            </div>

            <div className="mt-5 pt-3.5 border-t border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 flex items-center gap-1.5 font-mono text-xs">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  {srv.durationMinutes} min de cadeira
                </span>

                <span className="text-xl font-bold font-mono tabular-nums text-amber-400">
                  R$ {srv.price.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => handleToggleActive(srv)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    srv.active
                      ? 'text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10'
                      : 'text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                >
                  {srv.active ? 'Desativar' : 'Ativar'}
                </button>

                <button
                  onClick={() => openEdit(srv)}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3 h-3 text-amber-400" />
                  Editar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Create / Edit Service */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#111114] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="font-semibold text-base text-zinc-100 flex items-center gap-2">
                <Scissors className="w-4 h-4 text-amber-400" />
                {editingService ? 'Editar Serviço' : 'Novo Serviço'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-100 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                  Nome do Serviço *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Corte Degradê + Barba Navalhada"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-sans bg-[#17171c] border border-white/[0.08] rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                  Descrição
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Finalização com toalha quente e pomada matte..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-[#17171c] border border-white/[0.08] rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                    Duração na Grade (min) *
                  </label>
                  <input
                    type="number"
                    min="15"
                    step="5"
                    required
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm bg-[#17171c] border border-white/[0.08] rounded-xl text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
                  />
                  <span className="text-[11px] text-zinc-500 mt-1 block">
                    Bloqueio na agenda
                  </span>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                    Preço (R$) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm bg-[#17171c] border border-white/[0.08] rounded-xl text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
                  />
                  <span className="text-[11px] text-zinc-500 mt-1 block">
                    Valor cobrado
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-5 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-zinc-300 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded accent-amber-500 cursor-pointer"
                  />
                  <span>Serviço Ativo</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-zinc-300 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="rounded accent-amber-500 cursor-pointer"
                  />
                  <span>Destaque no Topo</span>
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 font-semibold text-xs bg-amber-500 text-zinc-950 hover:bg-amber-400 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {submitting ? 'Salvando...' : 'Salvar Serviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE EDIÇÃO DO PLANO CLUB FERRAZ */}
      {/* ========================================================================= */}
      {isEditingPlanModalOpen && editingPlanTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111114] border border-amber-500/30 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <Crown className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-base text-zinc-100">
                  Editar {editingPlanTier} · Club Ferraz
                </h3>
              </div>
              <button
                onClick={() => setIsEditingPlanModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                  Nome do Plano *
                </label>
                <input
                  type="text"
                  required
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-sans bg-[#17171c] border border-white/[0.08] rounded-xl text-zinc-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                  Mensalidade (R$) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={planPrice}
                  onChange={(e) => setPlanPrice(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm bg-[#17171c] border border-white/[0.08] rounded-xl text-emerald-400 font-bold focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                  Descrição Geral do Plano
                </label>
                <textarea
                  rows={2}
                  value={planDescription}
                  onChange={(e) => setPlanDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-[#17171c] border border-white/[0.08] rounded-xl text-zinc-100 focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-amber-400 font-medium text-xs mb-1.5 flex items-center gap-1.5">
                  <Gift className="w-4 h-4" /> Brinde Mensal Exclusivo
                </label>
                <input
                  type="text"
                  placeholder="Ex: 1 Barba Completa de Brinde no Mês"
                  value={planGift}
                  onChange={(e) => setPlanGift(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-[#17171c] border border-amber-500/30 rounded-xl text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsEditingPlanModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-xs bg-amber-500 text-zinc-950 hover:bg-amber-400 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
