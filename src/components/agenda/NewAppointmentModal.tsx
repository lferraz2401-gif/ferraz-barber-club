import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext.js';
import { api } from '../../services/api.js';
import { Customer, Service, Barber } from '../../types/index.js';
import { getOperationDateTime, isPastDateTime } from '../../utils/datetime.js';
import {
  X,
  Search,
  UserPlus,
  Scissors,
  UserCheck,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
  Plus,
  Check,
} from 'lucide-react';

export const NewAppointmentModal: React.FC = () => {
  const {
    isNewAppointmentOpen,
    setIsNewAppointmentOpen,
    newAppointmentPreselect,
    barbers,
    services,
    currentUser,
    refreshAll,
    addToast,
  } = useApp();

  const { todayStr, nowTimeStr } = getOperationDateTime();

  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Client Selection / Quick Creation
  const [searchClient, setSearchClient] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isQuickCreateClient, setIsQuickCreateClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientWhatsapp, setNewClientWhatsapp] = useState('');

  // Service Selection (Primary + Add-on / Combo Services)
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [additionalServices, setAdditionalServices] = useState<Service[]>([]);

  // Computed totals for combo/multi-service
  const totalDurationMinutes = useMemo(() => {
    return (
      (selectedService?.durationMinutes || 0) +
      additionalServices.reduce((sum, s) => sum + s.durationMinutes, 0)
    );
  }, [selectedService, additionalServices]);

  const totalPrice = useMemo(() => {
    return (
      (selectedService?.price || 0) +
      additionalServices.reduce((sum, s) => sum + s.price, 0)
    );
  }, [selectedService, additionalServices]);

  const combinedServiceName = useMemo(() => {
    return [selectedService?.name, ...additionalServices.map((s) => s.name)]
      .filter(Boolean)
      .join(' + ');
  }, [selectedService, additionalServices]);

  // Barber Selection
  const [selectedBarberId, setSelectedBarberId] = useState<string>('any'); // 'any', 'barber_cadeira_01', 'barber_cadeira_02'

  // Date & Time Selection
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [availableSlots, setAvailableSlots] = useState<
    { time: string; available: boolean; reason?: string; barberIds?: string[] }[]
  >([]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isFitIn, setIsFitIn] = useState(false);
  const [notes, setNotes] = useState('');

  // Reset or initialize state
  useEffect(() => {
    if (isNewAppointmentOpen) {
      const currentToday = getOperationDateTime().todayStr;
      setStep(1);
      setIsQuickCreateClient(false);
      setNewClientName('');
      setNewClientWhatsapp('');
      setSelectedTime('');
      setNotes('');
      setIsFitIn(false);

      if (newAppointmentPreselect?.customerId) {
        api.getCustomerById(newAppointmentPreselect.customerId).then((c) => {
          setSelectedCustomer(c);
          setStep(2);
        });
      } else {
        setSelectedCustomer(null);
      }

      if (newAppointmentPreselect?.barberId) {
        setSelectedBarberId(newAppointmentPreselect.barberId);
      } else if (currentUser.barberId) {
        setSelectedBarberId(currentUser.barberId);
      } else {
        setSelectedBarberId('any');
      }

      const initialDate = newAppointmentPreselect?.date || currentToday;
      setSelectedDate(initialDate < currentToday ? currentToday : initialDate);

      if (newAppointmentPreselect?.time) {
        const { isPast } = isPastDateTime(initialDate, newAppointmentPreselect.time);
        if (!isPast) {
          setSelectedTime(newAppointmentPreselect.time);
        }
      }

      // Pre-select first active service
      const activeServices = services.filter((s) => s.active);
      if (activeServices.length > 0) {
        setSelectedService(activeServices[0]);
      }
      setAdditionalServices([]);
    }
  }, [isNewAppointmentOpen, newAppointmentPreselect, currentUser, services]);

  // Search clients with debounce
  useEffect(() => {
    if (isNewAppointmentOpen && !selectedCustomer && !isQuickCreateClient) {
      const timer = setTimeout(async () => {
        try {
          const list = await api.getCustomers(searchClient);
          setCustomerResults(list.slice(0, 8));
        } catch (e) {
          console.error(e);
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [searchClient, isNewAppointmentOpen, selectedCustomer, isQuickCreateClient]);

  // Fetch slots whenever date, service, duration or barber changes
  useEffect(() => {
    if (selectedDate && selectedService) {
      setLoading(true);
      api
        .getAvailability(selectedDate, selectedBarberId, selectedService.id, totalDurationMinutes)
        .then((slots) => {
          setAvailableSlots(slots);
          // If selectedTime became invalid or past, clear it
          if (selectedTime) {
            const currentSlot = slots.find((s) => s.time === selectedTime);
            const { isPast } = isPastDateTime(selectedDate, selectedTime);
            if (!currentSlot || !currentSlot.available || isPast) {
              setSelectedTime('');
            }
          }
        })
        .catch((err) => {
          console.error(err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [selectedDate, selectedBarberId, selectedService, totalDurationMinutes]);

  if (!isNewAppointmentOpen) return null;

  const handleSelectCustomer = (cust: Customer) => {
    setSelectedCustomer(cust);
    setIsQuickCreateClient(false);
    setStep(2);
  };

  const handleQuickCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newClientWhatsapp.trim()) {
      addToast({
        type: 'error',
        title: 'Dados Incompletos',
        message: 'Nome e WhatsApp são obrigatórios.',
      });
      return;
    }

    try {
      setLoading(true);
      const created = await api.createCustomer({
        name: newClientName.trim(),
        whatsapp: newClientWhatsapp.trim(),
      });
      setSelectedCustomer(created);
      setIsQuickCreateClient(false);
      setStep(2);
      addToast({
        type: 'success',
        title: 'Cliente Cadastrado',
        message: `${created.name} cadastrado e selecionado!`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao cadastrar',
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCustomer || !selectedService || !selectedDate || !selectedTime) {
      addToast({
        type: 'error',
        title: 'Atenção',
        message: 'Preencha todos os campos do agendamento.',
      });
      return;
    }

    // Safety check: Never book in the past
    const { isPast, reason } = isPastDateTime(selectedDate, selectedTime);
    if (isPast) {
      addToast({
        type: 'error',
        title: 'Horário Inválido',
        message: reason || 'Não é permitido criar agendamentos no passado.',
      });
      return;
    }

    try {
      setSubmitting(true);
      await api.createAppointment({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerWhatsapp: selectedCustomer.whatsapp,
        serviceId: selectedService.id,
        serviceName: combinedServiceName,
        durationMinutes: totalDurationMinutes,
        priceCharged: totalPrice,
        barberId: selectedBarberId,
        date: selectedDate,
        time: selectedTime,
        notes: notes.trim() || undefined,
        isFitIn,
      });

      addToast({
        type: 'success',
        title: 'Agendamento Confirmado!',
        message: `${combinedServiceName} marcado para ${selectedCustomer.name} às ${selectedTime}.`,
      });

      await refreshAll();
      setIsNewAppointmentOpen(false);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Não foi possível agendar',
        message: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const activeServices = services.filter((s) => s.active);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#111114] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#141418]">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold shrink-0">
              <Scissors className="w-4 h-4 -rotate-45" />
            </div>
            <div>
              <h2 className="font-semibold text-base sm:text-lg text-zinc-100 tracking-tight">
                Novo Agendamento
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Passo {step} de 5 —{' '}
                {step === 1 && 'Identificação do Cliente'}
                {step === 2 && 'Escolha do Serviço'}
                {step === 3 && 'Escolha do Barbeiro Residente'}
                {step === 4 && 'Data e Horário (Validação de Tempo)'}
                {step === 5 && 'Revisão e Confirmação'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsNewAppointmentOpen(false)}
            className="text-zinc-400 hover:text-zinc-100 p-2 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Indicator Bar */}
        <div className="grid grid-cols-5 bg-[#0e0e12] border-b border-white/[0.08]">
          {[
            { s: 1, label: '01 Cliente' },
            { s: 2, label: '02 Serviço' },
            { s: 3, label: '03 Cadeira' },
            { s: 4, label: '04 Horário' },
            { s: 5, label: '05 Confirmar' },
          ].map(({ s, label }) => (
            <div
              key={s}
              className={`py-2.5 text-center text-[11px] font-medium transition-all border-b-2 ${
                step === s
                  ? 'border-amber-400 text-amber-300 bg-amber-400/[0.04]'
                  : step > s
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-zinc-600'
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* STEP 1: CLIENT SELECTION */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="font-display font-black text-sm uppercase tracking-wide text-zinc-200">
                  QUEM É O CLIENTE?
                </label>
                <button
                  type="button"
                  onClick={() => setIsQuickCreateClient(!isQuickCreateClient)}
                  className="text-xs font-display font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {isQuickCreateClient ? 'Buscar Existente' : '+ Cadastrar Novo Cliente'}
                </button>
              </div>

              {isQuickCreateClient ? (
                <form
                  onSubmit={handleQuickCreateCustomer}
                  className="p-4 rounded-xl bg-[#111724] border border-[#1a2333] space-y-4 shadow-sm"
                >
                  <div className="text-xs text-amber-300 font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Cadastro rápido com vinculação instantânea ao CRM.</span>
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 mb-1">
                      NOME COMPLETO *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Gabriel Moreira"
                      value={newClientName}
                      onChange={(e) =>
                        setNewClientName(e.target.value.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, ''))
                      }
                      className="w-full px-3 py-2 text-sm bg-[#090c13] border border-[#1e283b] rounded-lg text-zinc-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 mb-1">
                      WHATSAPP (COM DDD) *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Ex: 11987654321"
                      value={newClientWhatsapp}
                      onChange={(e) =>
                        setNewClientWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 11))
                      }
                      className="w-full px-3 py-2 text-sm bg-[#090c13] border border-[#1e283b] rounded-lg text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsQuickCreateClient(false)}
                      className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 text-xs font-display font-black uppercase tracking-wider bg-amber-400 text-zinc-950 hover:bg-amber-300 rounded-lg cursor-pointer"
                    >
                      Salvar e Prosseguir
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nome ou WhatsApp..."
                      value={searchClient}
                      onChange={(e) => setSearchClient(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#111724] border border-[#1e283b] rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Results List */}
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {customerResults.map((cust) => (
                      <button
                        key={cust.id}
                        type="button"
                        onClick={() => handleSelectCustomer(cust)}
                        className="w-full text-left p-3 rounded-xl bg-[#111724] hover:bg-[#182133] border border-[#1e283b] hover:border-amber-400/40 transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-display font-bold text-sm text-zinc-100 uppercase tracking-wide group-hover:text-amber-300">
                              {cust.name}
                            </span>
                            {cust.isBlockedFromOnlineBooking && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                                <ShieldAlert className="w-2.5 h-2.5 text-rose-400" />
                                Bloqueado Online ({cust.noShowCount || 0} faltas)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-400 font-mono">
                            {cust.whatsapp}
                          </div>
                        </div>
                        <div className="text-right text-xs">
                          <span className="font-mono text-zinc-400">
                            {cust.totalAppointments} visitas
                          </span>
                          <span className="text-[10px] text-zinc-500 block font-mono">
                            Gasto: R$ {cust.totalSpent.toFixed(2)}
                          </span>
                        </div>
                      </button>
                    ))}

                    {customerResults.length === 0 && searchClient && (
                      <div className="text-center py-6 text-zinc-500 text-xs">
                        Nenhum cliente encontrado com esse termo.{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setNewClientName(searchClient);
                            setIsQuickCreateClient(true);
                          }}
                          className="text-amber-400 underline font-bold ml-1 cursor-pointer"
                        >
                          Cadastrar como novo
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: SERVICE SELECTION */}
          {step === 2 && (
            <div className="space-y-4">
              {selectedCustomer?.isBlockedFromOnlineBooking && (
                <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center gap-2 text-xs text-amber-200 font-mono">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>Cliente com agendamento online suspenso ({selectedCustomer.noShowCount || 0} faltas).</strong>{' '}
                    Como você é administrador, o agendamento manual está sendo autorizado diretamente na cadeira.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="font-display font-black text-sm uppercase tracking-wide text-zinc-200">
                  ESCOLHA O SERVIÇO PRINCIPAL
                </label>
                <span className="text-xs font-mono text-zinc-400">
                  {activeServices.length} disponíveis
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeServices.map((srv) => {
                  const isSelected = selectedService?.id === srv.id;

                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => {
                        setSelectedService(srv);
                        // Remove from additional if it was there
                        setAdditionalServices((prev) => prev.filter((s) => s.id !== srv.id));
                      }}
                      className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#182030] border-amber-400 text-amber-200 shadow-md shadow-amber-400/10'
                          : 'bg-[#111724] border-[#1e283b] hover:border-zinc-600 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-display font-black text-base text-zinc-100 uppercase tracking-wide flex items-center gap-2">
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                          )}
                          {srv.name}
                        </span>
                        <Scissors className="w-4 h-4 text-amber-400" />
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-2 mb-3">
                        {srv.description || 'Serviço profissional de alta precisão.'}
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t border-[#1a2333]">
                        <span className="text-xs font-mono text-zinc-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" />
                          {srv.durationMinutes} min
                        </span>
                        <span className="font-display font-black text-lg text-amber-400">
                          R$ {srv.price.toFixed(2)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Multi-Service Combos / Add-ons Section */}
              {selectedService && (
                <div className="pt-3 border-t border-[#1a2333] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-display font-bold text-xs uppercase tracking-wider text-amber-300 block">
                        + Deseja adicionar mais serviços? (Combos / Adicionais)
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400">
                        Ex: Cabelo + Sobrancelha, Barba, etc. O tempo e valor são somados automaticamente.
                      </span>
                    </div>
                    {additionalServices.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAdditionalServices([])}
                        className="text-[10px] font-mono text-zinc-400 hover:text-white underline cursor-pointer"
                      >
                        Limpar adicionais
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeServices
                      .filter((s) => s.id !== selectedService.id)
                      .map((srv) => {
                        const isAdded = additionalServices.some((s) => s.id === srv.id);
                        return (
                          <button
                            key={srv.id}
                            type="button"
                            onClick={() => {
                              if (isAdded) {
                                setAdditionalServices((prev) =>
                                  prev.filter((s) => s.id !== srv.id)
                                );
                              } else {
                                setAdditionalServices((prev) => [...prev, srv]);
                              }
                            }}
                            className={`p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                              isAdded
                                ? 'bg-amber-400/10 border-amber-400 text-amber-200'
                                : 'bg-[#0e1422] border-[#1e283b] hover:border-zinc-500 text-zinc-400'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-5 h-5 rounded flex items-center justify-center border text-xs ${
                                  isAdded
                                    ? 'bg-amber-400 text-zinc-950 border-amber-400 font-bold'
                                    : 'border-white/20 text-transparent'
                                }`}
                              >
                                ✓
                              </div>
                              <div>
                                <span className="font-display font-bold text-xs uppercase text-zinc-200 block">
                                  {srv.name}
                                </span>
                                <span className="text-[10px] font-mono text-zinc-500">
                                  +{srv.durationMinutes} min
                                </span>
                              </div>
                            </div>
                            <span className="font-mono font-bold text-xs text-amber-400">
                              +R$ {srv.price.toFixed(2)}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Selection Summary and Continue Button */}
              {selectedService && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-[#182030] to-[#111724] border border-amber-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">
                      Serviço(s) Selecionado(s)
                    </span>
                    <strong className="text-sm font-display font-black uppercase tracking-wide text-white block">
                      {combinedServiceName}
                    </strong>
                    <div className="flex items-center gap-3 text-xs font-mono pt-0.5">
                      <span className="text-cyan-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {totalDurationMinutes} minutos na cadeira
                      </span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-emerald-400 font-bold">
                        Total: R$ {totalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-display font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-400/20 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <span>Continuar para Barbeiro</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: BARBER SELECTION (Strict 2 resident barbers or Any) */}
          {step === 3 && (
            <div className="space-y-4">
              <label className="font-display font-black text-sm uppercase tracking-wide text-zinc-200">
                SELECIONE A CADEIRA / BARBEIRO RESIDENTE
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Qualquer Barbeiro Option */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBarberId('any');
                    setStep(4);
                  }}
                  className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
                    selectedBarberId === 'any'
                      ? 'bg-[#182030] border-amber-400 text-amber-200 shadow-md shadow-amber-400/10'
                      : 'bg-[#111724] border-[#1e283b] hover:border-zinc-600 text-zinc-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-[#192233] flex items-center justify-center text-amber-400 mb-3 border border-[#25324d]">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="font-display font-black text-base text-zinc-100 uppercase tracking-wide">
                    Qualquer Barbeiro
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Atendimento com a primeira cadeira que tiver disponibilidade.
                  </p>
                </button>

                {/* Resident Barbers (2 cadeiras) */}
                {barbers
                  .filter((b) => isFitIn || b.active)
                  .map((b, idx) => {
                    const isSelected = selectedBarberId === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setSelectedBarberId(b.id);
                          setStep(4);
                        }}
                        className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#182030] border-amber-400 text-amber-200 shadow-md shadow-amber-400/10'
                            : 'bg-[#111724] border-[#1e283b] hover:border-zinc-600 text-zinc-300'
                        }`}
                      >
                        {b.avatarUrl ? (
                          <img
                            src={b.avatarUrl}
                            alt={b.name}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-lg object-cover mb-3 border shadow"
                            style={{ borderColor: b.color || '#f59e0b' }}
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center font-display font-black text-zinc-950 text-base mb-3 shadow"
                            style={{ backgroundColor: b.color || '#f59e0b' }}
                          >
                            C0{idx + 1}
                          </div>
                        )}
                        <div className="font-display font-black text-base text-zinc-100 uppercase tracking-wide">
                          {b.name}
                        </div>
                        {b.specialty && (
                          <p className="text-[11px] text-amber-400 font-medium truncate">
                            {b.specialty}
                          </p>
                        )}
                        <p className="text-xs text-zinc-400 mt-1 font-mono">
                          Turno: {b.startTime} - {b.endTime}
                        </p>
                        <span className="inline-block mt-2 text-[10px] font-mono px-2 py-0.5 rounded bg-[#090c13] text-zinc-400 border border-[#1a2333]">
                          Almoço: {b.lunchStart} - {b.lunchEnd}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* STEP 4: DATE & TIME SELECTION (BUG FIX: Strict prevention of past time booking) */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#111724] border border-[#1a2333]">
                <div>
                  <span className="font-display font-black text-sm uppercase tracking-wide text-zinc-200 block">
                    DATA DO ATENDIMENTO
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Horário de Brasília (SP). Horários que já passaram hoje estão automaticamente bloqueados.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-amber-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    min={todayStr}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setSelectedTime('');
                    }}
                    className="px-3 py-1.5 bg-[#090c13] border border-[#1e283b] rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-400 font-mono cursor-pointer"
                  />
                </div>
              </div>

              {/* Slots Grid */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-zinc-400 font-semibold">
                    HORÁRIOS DISPONÍVEIS ({selectedService?.durationMinutes} MIN):
                  </span>
                  {currentUser.role === 'ADMIN' && (
                    <label className="flex items-center gap-2 text-xs text-amber-300 cursor-pointer font-mono">
                      <input
                        type="checkbox"
                        checked={isFitIn}
                        onChange={(e) => setIsFitIn(e.target.checked)}
                        className="rounded accent-amber-400"
                      />
                      <span>Encaixe manual administrativo</span>
                    </label>
                  )}
                </div>

                {loading ? (
                  <div className="text-center py-10 text-zinc-400 text-xs font-mono">
                    Verificando disponibilidade de horários no servidor...
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-56 overflow-y-auto p-1">
                    {availableSlots.map((slot) => {
                      const isSelected = selectedTime === slot.time;
                      const { isPast, reason: pastReason } = isPastDateTime(selectedDate, slot.time);

                      // CRITICAL RULE: Past time slots on today CANNOT be selected even with normal click
                      const canSelect = (!isPast && slot.available) || (!isPast && isFitIn);

                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!canSelect}
                          onClick={() => setSelectedTime(slot.time)}
                          title={
                            isPast
                              ? `Horário já passou hoje (${slot.time})`
                              : slot.reason || 'Disponível'
                          }
                          className={`py-2 px-2.5 rounded-lg text-xs font-mono font-bold transition-all ${
                            isSelected
                              ? 'bg-amber-400 text-zinc-950 shadow-md shadow-amber-400/30 ring-2 ring-amber-300'
                              : isPast
                              ? 'bg-[#090c13] text-zinc-600 border border-[#151b26] cursor-not-allowed line-through'
                              : canSelect
                              ? 'bg-[#111724] hover:bg-[#182133] text-zinc-200 border border-[#1e283b]'
                              : 'bg-[#090c13] text-zinc-600 border border-[#151b26] cursor-not-allowed'
                          }`}
                        >
                          {slot.time}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  OBSERVAÇÕES ADICIONAIS (OPCIONAL)
                </label>
                <input
                  type="text"
                  placeholder="Ex: cliente prefere tesoura no topo, acabamento navalhado fino"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#111724] border border-[#1e283b] rounded-lg text-zinc-200 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW & CONFIRM */}
          {step === 5 && selectedCustomer && selectedService && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#111724] border border-[#1a2333] space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-[#1a2333]">
                  <span className="text-xs font-mono text-zinc-400 uppercase">Cliente</span>
                  <div className="text-right">
                    <span className="font-display font-black text-base text-zinc-100 uppercase tracking-wide">
                      {selectedCustomer.name}
                    </span>
                    <span className="text-xs text-zinc-400 block font-mono">
                      {selectedCustomer.whatsapp}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-[#1a2333]">
                  <span className="text-xs font-mono text-zinc-400 uppercase">Serviço</span>
                  <div className="text-right">
                    <span className="font-display font-black text-sm text-zinc-200 uppercase">
                      {selectedService.name}
                    </span>
                    <span className="text-xs text-zinc-400 block font-mono">
                      Duração: {selectedService.durationMinutes} minutos
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-[#1a2333]">
                  <span className="text-xs font-mono text-zinc-400 uppercase">Cadeira / Barbeiro</span>
                  <div className="text-right font-display font-black text-sm text-zinc-200 uppercase">
                    {selectedBarberId === 'any'
                      ? 'Qualquer Barbeiro (Primeiro Disponível)'
                      : barbers.find((b) => b.id === selectedBarberId)?.name || 'Barbeiro Residente'}
                  </div>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-[#1a2333]">
                  <span className="text-xs font-mono text-zinc-400 uppercase">Data e Horário</span>
                  <div className="text-right font-mono text-sm text-amber-400 font-bold">
                    {selectedDate} às {selectedTime}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-mono text-zinc-400 uppercase font-bold">
                    Valor Cobrado (Congelado):
                  </span>
                  <span className="font-display font-black text-2xl text-emerald-400">
                    R$ {selectedService.price.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Navigation Footer */}
        <div className="px-6 py-4 border-t border-white/[0.08] bg-[#141418] flex items-center justify-between">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 5 ? (
              <button
                type="button"
                disabled={
                  (step === 1 && !selectedCustomer) ||
                  (step === 2 && !selectedService) ||
                  (step === 3 && !selectedBarberId) ||
                  (step === 4 && (!selectedDate || !selectedTime))
                }
                onClick={() => setStep(step + 1)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Avançar <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                {submitting ? 'Confirmando...' : 'Confirmar Agendamento'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
