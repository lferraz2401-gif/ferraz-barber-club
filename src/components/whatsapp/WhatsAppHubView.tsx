import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.js';
import { api } from '../../services/api.js';
import { Appointment } from '../../types/index.js';
import { WhatsAppButton } from '../common/WhatsAppButton.js';
import { DEFAULT_WHATSAPP_TEMPLATES, normalizeSettings } from '../../utils/settingsDefaults.js';
import {
  MessageSquare,
  Send,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  Sparkles,
  Info,
  Save,
  RotateCcw,
  RefreshCw,
  Phone,
  Flame,
  Radio,
} from 'lucide-react';

export const WhatsAppHubView: React.FC = () => {
  const { settings, refreshAll, addToast, currentUser, barbers } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'reminders' | 'templates' | 'direct'>('reminders');

  // Reminders state (Agendamentos de Amanhã)
  const [tomorrowApts, setTomorrowApts] = useState<Appointment[]>([]);
  const [loadingApts, setLoadingApts] = useState(false);
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });

  // Templates state
  const [templates, setTemplates] = useState(() => {
    const current = settings?.whatsappTemplates || settings?.whatsapp?.messages || DEFAULT_WHATSAPP_TEMPLATES;
    return { ...DEFAULT_WHATSAPP_TEMPLATES, ...current };
  });
  const [savingTemplates, setSavingTemplates] = useState(false);

  // Direct Message state
  const [directPhone, setDirectPhone] = useState('');
  const [directClientName, setDirectClientName] = useState('');
  const [directTemplateKey, setDirectTemplateKey] = useState<keyof typeof DEFAULT_WHATSAPP_TEMPLATES>('confirmation');
  const [customMsg, setCustomMsg] = useState('');

  // Load reminders
  const loadReminders = async (dateStr: string) => {
    try {
      setLoadingApts(true);
      const params: { date: string; barberId?: string } = { date: dateStr };
      if (currentUser.role === 'BARBER' && currentUser.barberId) {
        params.barberId = currentUser.barberId;
      }
      const data = await api.getAppointments(params);
      setTomorrowApts(data.filter((a) => a.status === 'CONFIRMED' || a.status === 'IN_PROGRESS'));
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao carregar agendamentos',
        message: err.message,
      });
    } finally {
      setLoadingApts(false);
    }
  };

  useEffect(() => {
    loadReminders(targetDate);
  }, [targetDate, currentUser]);

  useEffect(() => {
    if (settings) {
      const cur = settings.whatsappTemplates || settings.whatsapp?.messages || DEFAULT_WHATSAPP_TEMPLATES;
      setTemplates({ ...DEFAULT_WHATSAPP_TEMPLATES, ...cur });
    }
  }, [settings]);

  // Save templates to backend settings
  const handleSaveTemplates = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingTemplates(true);
      const safe = normalizeSettings(settings);
      const payload = {
        ...safe,
        whatsappTemplates: templates,
        whatsapp: {
          messages: templates,
        },
      };
      await api.updateSettings(payload);
      await refreshAll();
      addToast({
        type: 'success',
        title: 'Templates Salvos',
        message: 'Modelos de mensagens do WhatsApp atualizados com sucesso.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao salvar',
        message: err.message,
      });
    } finally {
      setSavingTemplates(false);
    }
  };

  const handleResetTemplates = () => {
    setTemplates({ ...DEFAULT_WHATSAPP_TEMPLATES });
    addToast({
      type: 'info',
      title: 'Templates Restaurados',
      message: 'Padrão da Ferraz Barber Club recarregado (clique em Salvar para aplicar).',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-[#111114] border border-white/[0.08] shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg sm:text-xl font-bold text-zinc-100 tracking-tight">
                  Central do WhatsApp
                </h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  Disparo Rápido
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                Lembretes automáticos, confirmações de horário e personalização de mensagens.
              </p>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center bg-[#17171c] p-1 rounded-xl border border-white/[0.08] text-xs self-start sm:self-auto">
            <button
              onClick={() => setActiveSubTab('reminders')}
              className={`px-3.5 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
                activeSubTab === 'reminders'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Lembretes ({tomorrowApts.length})
            </button>
            <button
              onClick={() => setActiveSubTab('templates')}
              className={`px-3.5 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
                activeSubTab === 'templates'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Modelos de Mensagens
            </button>
            <button
              onClick={() => setActiveSubTab('direct')}
              className={`px-3.5 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
                activeSubTab === 'direct'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Disparo Avulso
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: LEMBRETES DE AMANHÃ (OU DATA ESCOLHIDA) */}
      {/* ========================================================================= */}
      {activeSubTab === 'reminders' && (
        <div className="space-y-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#111114] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-sm font-semibold text-zinc-100 block">
                  Fila de Disparo por Data
                </span>
                <span className="text-xs text-zinc-400">
                  {currentUser.role === 'BARBER'
                    ? `Filtrado para sua cadeira (${currentUser.name})`
                    : 'Visão unificada de todas as cadeiras da barbearia'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#17171c] border border-white/[0.08] text-zinc-100 font-mono focus:outline-none focus:border-amber-400 cursor-pointer"
              />
              <button
                onClick={() => loadReminders(targetDate)}
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 transition-all cursor-pointer"
                title="Recarregar"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingApts ? 'animate-spin text-amber-400' : ''}`} />
              </button>
            </div>
          </div>

          {loadingApts ? (
            <div className="p-12 text-center rounded-2xl bg-[#111114] border border-white/[0.08] flex flex-col items-center justify-center gap-2 text-zinc-400">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
              <span className="text-xs font-mono">Buscando clientes para disparo...</span>
            </div>
          ) : tomorrowApts.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#111114] border border-white/[0.08] space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="font-semibold text-zinc-100 text-base">
                Nenhum agendamento confirmado para {targetDate.split('-').reverse().join('/')}
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                Não há mensagens pendentes de disparo para a data selecionada.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tomorrowApts.map((apt) => (
                <div
                  key={apt.id}
                  className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] hover:border-white/[0.16] transition-all flex flex-col justify-between gap-3 shadow-sm hover:shadow-md"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-bold text-xs">
                          {apt.time}
                        </span>
                        <strong className="font-semibold text-base text-zinc-100 tracking-tight">
                          {apt.customerName}
                        </strong>
                      </div>
                      <span className="text-xs font-mono tabular-nums text-emerald-400 font-bold">
                        R$ {apt.priceCharged.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono text-zinc-400">
                      <span>✂️ {apt.serviceName}</span>
                      <span>·</span>
                      <span>💈 {apt.barberName}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-400">
                      {apt.customerWhatsapp}
                    </span>
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
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: MODELOS DE MENSAGENS (CONFIGURAÇÃO DE TEMPLATES) */}
      {/* ========================================================================= */}
      {activeSubTab === 'templates' && (
        <form onSubmit={handleSaveTemplates} className="space-y-4">
          <div className="p-6 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/[0.08]">
              <div className="space-y-0.5">
                <h3 className="font-semibold text-base text-zinc-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Personalizar Textos Automáticos
                </h3>
                <p className="text-xs text-zinc-400">
                  Edite os textos disparados ao agendar, confirmar ou enviar lembrete.
                </p>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#17171c] border border-white/[0.06] text-xs font-mono text-zinc-400">
                <Info className="w-3.5 h-3.5 text-amber-400" />
                <span>Variáveis: {'{cliente}'}, {'{barbeiro}'}, {'{servico}'}, {'{data}'}, {'{horario}'}</span>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-zinc-300 font-medium text-xs mb-1.5 flex items-center justify-between">
                  <span>1. Confirmação Imediata de Agendamento</span>
                  <span className="text-[11px] font-mono text-emerald-400">Disparada ao reservar</span>
                </label>
                <textarea
                  rows={2}
                  value={templates.confirmation}
                  onChange={(e) => setTemplates({ ...templates, confirmation: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#17171c] border border-white/[0.08] rounded-xl text-zinc-100 font-mono text-xs focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium text-xs mb-1.5 flex items-center justify-between">
                  <span>2. Lembrete de Horário (Véspera ou Horas Antes)</span>
                  <span className="text-[11px] font-mono text-amber-400">Disparo na aba Lembretes</span>
                </label>
                <textarea
                  rows={2}
                  value={templates.reminder}
                  onChange={(e) => setTemplates({ ...templates, reminder: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#17171c] border border-white/[0.08] rounded-xl text-zinc-100 font-mono text-xs focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium text-xs mb-1.5 flex items-center justify-between">
                  <span>3. Conclusão do Atendimento · Pós-Corte & Agradecimento</span>
                  <span className="text-[11px] font-mono text-sky-400">Fidelização</span>
                </label>
                <textarea
                  rows={2}
                  value={templates.completed}
                  onChange={(e) => setTemplates({ ...templates, completed: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#17171c] border border-white/[0.08] rounded-xl text-zinc-100 font-mono text-xs focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium text-xs mb-1.5 flex items-center justify-between">
                  <span>4. Radar de Retorno (Clientes a mais de 21 dias sem corte)</span>
                  <span className="text-[11px] font-mono text-violet-400">Reativação de clientes</span>
                </label>
                <textarea
                  rows={2}
                  value={templates.returnInvite}
                  onChange={(e) => setTemplates({ ...templates, returnInvite: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#17171c] border border-white/[0.08] rounded-xl text-zinc-100 font-mono text-xs focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium text-xs mb-1.5 flex items-center justify-between">
                  <span>5. Cancelamento de Horário</span>
                  <span className="text-[11px] font-mono text-rose-400">Aviso formal</span>
                </label>
                <textarea
                  rows={2}
                  value={templates.cancellation}
                  onChange={(e) => setTemplates({ ...templates, cancellation: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#17171c] border border-white/[0.08] rounded-xl text-zinc-100 font-mono text-xs focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetTemplates}
                className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.08] text-xs font-mono transition-colors flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Padrão da Ferraz</span>
              </button>

              <button
                type="submit"
                disabled={savingTemplates}
                className="px-5 py-2.5 rounded-xl font-semibold text-xs bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-all flex items-center gap-2 shadow-sm active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingTemplates ? 'Salvando...' : 'Salvar Modelos'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: DISPARO DIRETO E MENSAGEM AVULSA */}
      {/* ========================================================================= */}
      {activeSubTab === 'direct' && (
        <div className="p-6 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-5 shadow-lg">
          <div className="pb-4 border-b border-white/[0.08]">
            <h3 className="font-semibold text-base text-zinc-100 flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              Disparo Avulso para Qualquer Cliente
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Informe o telefone com DDD e selecione um modelo pronto ou digite seu texto.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div>
              <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                Número do WhatsApp (com DDD)
              </label>
              <input
                type="tel"
                placeholder="(11) 99999-9999"
                value={directPhone}
                onChange={(e) => setDirectPhone(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#17171c] border border-white/[0.08] rounded-xl text-zinc-100 font-mono text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                Nome do Cliente
              </label>
              <input
                type="text"
                placeholder="Ex: Gabriel"
                value={directClientName}
                onChange={(e) => setDirectClientName(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#17171c] border border-white/[0.08] rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-300 font-medium text-xs mb-2">
              Escolher Modelo Pré-formatado
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { key: 'confirmation', label: 'Confirmação' },
                { key: 'reminder', label: 'Lembrete' },
                { key: 'completed', label: 'Agradecimento' },
                { key: 'returnInvite', label: 'Convidar Retorno' },
              ].map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => {
                    const k = m.key as keyof typeof DEFAULT_WHATSAPP_TEMPLATES;
                    setDirectTemplateKey(k);
                    setCustomMsg(
                      templates[k]
                        .replace(/{cliente}/gi, directClientName.trim() || 'Cliente')
                        .replace(/{barbeiro}/gi, currentUser.name)
                        .replace(/{servico}/gi, 'seu corte')
                        .replace(/{data}/gi, 'hoje')
                        .replace(/{horario}/gi, 'no seu horário')
                    );
                  }}
                  className={`py-2 px-3 rounded-xl font-medium text-xs border cursor-pointer transition-colors ${
                    directTemplateKey === m.key
                      ? 'bg-amber-500 text-zinc-950 border-amber-500 font-semibold'
                      : 'bg-[#17171c] text-zinc-400 border-white/[0.08] hover:border-white/[0.16]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-zinc-300 font-medium text-xs mb-1.5">
              Texto Final da Mensagem
            </label>
            <textarea
              rows={3}
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              placeholder="Digite a mensagem personalizada..."
              className="w-full px-3.5 py-2.5 bg-[#17171c] border border-white/[0.08] rounded-xl text-zinc-100 font-mono text-xs focus:outline-none focus:border-amber-400 resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <WhatsAppButton
              phone={directPhone}
              customerName={directClientName || 'Cliente'}
              variant="button"
              defaultTemplate="direct"
            />
          </div>
        </div>
      )}
    </div>
  );
};
