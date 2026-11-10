import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api.js';
import { Service, Barber, Appointment, ShopSettings } from '../../types/index.js';
import { getOperationDateTime } from '../../utils/datetime.js';
import {
  Scissors,
  Calendar as CalendarIcon,
  Clock,
  User,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CalendarPlus,
  RefreshCw,
  Phone,
  ShieldCheck,
  Check,
  ExternalLink,
  MessageSquare,
  Crown,
  Gift,
  ShieldAlert,
  Plus,
  X,
} from 'lucide-react';

type BookingStep = 'service' | 'barber' | 'date' | 'time' | 'customer' | 'review' | 'confirmed';

export const PublicBookingView: React.FC = () => {
  const [step, setStep] = useState<BookingStep>('service');
  const [showAddonPromptModal, setShowAddonPromptModal] = useState(false);
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Shop data
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [settings, setSettings] = useState<ShopSettings | null>(null);

  // Booking selections
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedAdditionalServices, setSelectedAdditionalServices] = useState<Service[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string>('any'); // 'any' | 'barber-1' | 'barber-2'
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  // Total duration & price calculations including extra combo services
  const totalDurationMinutes = useMemo(() => {
    return (selectedService?.durationMinutes || 0) + selectedAdditionalServices.reduce((sum, s) => sum + s.durationMinutes, 0);
  }, [selectedService, selectedAdditionalServices]);

  const totalPrice = useMemo(() => {
    return (selectedService?.price || 0) + selectedAdditionalServices.reduce((sum, s) => sum + s.price, 0);
  }, [selectedService, selectedAdditionalServices]);

  const combinedServiceName = useMemo(() => {
    return [selectedService?.name, ...selectedAdditionalServices.map((s) => s.name)].filter(Boolean).join(' + ');
  }, [selectedService, selectedAdditionalServices]);

  // Availability slots for selectedDate & selectedBarberId & selectedService
  const [availableSlots, setAvailableSlots] = useState<{ time: string; available: boolean; barberIds?: string[] }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Customer input & Smart Recognition
  const [customerName, setCustomerName] = useState('');
  const [customerWhatsapp, setCustomerWhatsapp] = useState('');
  const [identifyingPhone, setIdentifyingPhone] = useState(false);
  const [recognizedData, setRecognizedData] = useState<{
    recognized: boolean;
    customer: { id: string; name: string; whatsapp: string; totalVisits: number; membership?: any; isBlockedFromOnlineBooking?: boolean; blockedReason?: string; noShowCount?: number };
    isBlocked?: boolean;
    noShowCount?: number;
    blockedReason?: string;
    lastAppointment: {
      id: string;
      serviceId: string;
      serviceName: string;
      servicePrice: number;
      durationMinutes: number;
      barberId: string;
      barberName: string;
      date: string;
      time: string;
    } | null;
    lastService: Service | null;
    preferredBarber: Barber | null;
  } | null>(null);
  const [dismissedRecognition, setDismissedRecognition] = useState(false);

  // Confirmed appointment result
  const [confirmedApt, setConfirmedApt] = useState<Appointment | null>(null);

  // Initial load
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [servList, barbList, setts] = await Promise.all([
          api.getServices(),
          api.getBarbers(),
          api.getSettings(),
        ]);
        setServices(servList.filter((s) => s.active));
        setBarbers(barbList.filter((b) => b.active));
        setSettings(setts);

        // Set default date to today in America/Sao_Paulo
        const { todayStr } = getOperationDateTime();
        setSelectedDate(todayStr);
      } catch (err: any) {
        setErrorMessage('Não foi possível carregar as informações do salão. Tente novamente.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Fetch slots whenever selectedDate, selectedBarberId, selectedService or extra services change
  useEffect(() => {
    if (!selectedDate || !selectedService) return;

    let isMounted = true;
    async function fetchSlots() {
      try {
        setLoadingSlots(true);
        setErrorMessage(null);
        const slots = await api.getAvailability(
          selectedDate,
          selectedBarberId,
          selectedService?.id,
          totalDurationMinutes || selectedService?.durationMinutes
        );
        if (isMounted) {
          // Keep only slots that are truly available
          const validSlots = slots.filter((s) => s.available);
          setAvailableSlots(validSlots);
          // If previously selected time is no longer in validSlots, clear it
          if (selectedTime && !validSlots.some((s) => s.time === selectedTime)) {
            setSelectedTime('');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage('Erro ao consultar horários disponíveis.');
        }
      } finally {
        if (isMounted) setLoadingSlots(false);
      }
    }

    fetchSlots();
    return () => {
      isMounted = false;
    };
  }, [selectedDate, selectedBarberId, selectedService, totalDurationMinutes]);

  // Quick days array (Hoje, Amanhã, +5 dias)
  const quickDays = useMemo(() => {
    const list: { label: string; date: string; dayOfWeek: string }[] = [];
    const { todayStr } = getOperationDateTime();
    const [y, m, d] = todayStr.split('-').map(Number);
    const baseDate = new Date(y, m - 1, d);

    for (let i = 0; i < 7; i++) {
      const curr = new Date(baseDate);
      curr.setDate(baseDate.getDate() + i);
      const yyyy = curr.getFullYear();
      const mm = String(curr.getMonth() + 1).padStart(2, '0');
      const dd = String(curr.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      let label = '';
      if (i === 0) label = 'Hoje';
      else if (i === 1) label = 'Amanhã';
      else {
        label = curr.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
      }

      const dayOfWeek = curr.toLocaleDateString('pt-BR', { weekday: 'long' });
      list.push({ label, date: dateStr, dayOfWeek });
    }
    return list;
  }, []);

  // WhatsApp mask helper & Automatic Recognition Trigger (ao bater 10 ou 11 dígitos)
  const lookupClientByPhone = async (cleanDigits: string) => {
    if (cleanDigits.length < 10) return;
    try {
      setIdentifyingPhone(true);
      const res = await fetch(`/api/public/recognize-client?phone=${cleanDigits}`);
      if (res.ok) {
        const data = await res.json();
        if (data.recognized && data.customer) {
          setRecognizedData(data);
          // Autofill customer name if empty or existing
          if (data.customer.name) {
            setCustomerName(data.customer.name);
          }
        } else {
          setRecognizedData(null);
        }
      }
    } catch {
      // Non-blocking
    } finally {
      setIdentifyingPhone(false);
    }
  };

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 11) val = val.slice(0, 11);

    // Format (XX) XXXXX-XXXX
    let formatted = val;
    if (val.length > 2) {
      formatted = `(${val.slice(0, 2)}) ${val.slice(2)}`;
    }
    if (val.length > 7) {
      formatted = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
    }
    setCustomerWhatsapp(formatted);

    // Quando atinge os 11 dígitos (ou 10 com DDD), dispara o reconhecimento inteligente
    if (val.length >= 10) {
      lookupClientByPhone(val);
    } else {
      setRecognizedData(null);
      setDismissedRecognition(false);
    }
  };

  // Ação 1: [ SIM, REPETIR ] ➔ Seleciona o serviço anterior e pula direto para a escolha da data/horário
  const handleRepeatLastChoice = () => {
    if (!recognizedData?.lastAppointment) return;

    // Localiza o serviço ativo correspondente
    const targetService =
      services.find((s) => s.id === recognizedData.lastAppointment?.serviceId) ||
      recognizedData.lastService ||
      services[0];

    if (targetService) {
      setSelectedService(targetService);
    }

    // Se tiver barbeiro de preferência, pré-seleciona ou deixa 'any'
    if (recognizedData.lastAppointment.barberId) {
      const barberStillActive = barbers.some((b) => b.id === recognizedData.lastAppointment?.barberId);
      if (barberStillActive) {
        setSelectedBarberId(recognizedData.lastAppointment.barberId);
      } else {
        setSelectedBarberId('any');
      }
    }

    // Pula direto para a etapa de escolha da data!
    setStep('date');
  };

  // Ação 2: [ NÃO, OUTRO SERVIÇO ] ➔ Mantém dados preenchidos e permite escolher do zero
  const handleChooseAnotherService = () => {
    setDismissedRecognition(true);
    setStep('service');
  };

  // Submission handler with concurrency check
  const handleConfirmBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      setErrorMessage('Por favor, selecione serviço, data e horário.');
      return;
    }

    const cleanWhatsapp = customerWhatsapp.replace(/\D/g, '');
    if (!customerName.trim()) {
      setErrorMessage('Por favor, informe seu nome completo.');
      return;
    }
    if (cleanWhatsapp.length < 10) {
      setErrorMessage('Por favor, informe um WhatsApp válido com DDD.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const created = await api.createAppointment({
        customerName: customerName.trim(),
        customerWhatsapp: cleanWhatsapp,
        serviceId: selectedService.id,
        serviceName: combinedServiceName || selectedService.name,
        durationMinutes: totalDurationMinutes || selectedService.durationMinutes,
        priceCharged: recognizedData?.customer?.membership?.active ? 0 : (totalPrice || selectedService.price),
        barberId: selectedBarberId, // 'any' or barberId
        date: selectedDate,
        time: selectedTime,
        source: 'PUBLIC_BOOKING',
      });

      setConfirmedApt(created);
      setStep('confirmed');

      // Instantly notify internal agenda views and other tabs
      try {
        window.dispatchEvent(new CustomEvent('appointment-updated', { detail: created }));
        localStorage.setItem('fbc_last_appointment_created', JSON.stringify({ id: created.id, timestamp: Date.now() }));
      } catch {}
    } catch (err: any) {
      const msg = err.message || 'Erro ao realizar agendamento.';
      setErrorMessage(msg);
      // If conflict, return user to time selection to pick another slot
      if (msg.includes('já possui atendimento') || msg.includes('acabou de ser reservado') || msg.includes('Conflito')) {
        setStep('time');
        // Refresh slots
        api.getAvailability(selectedDate, selectedBarberId, selectedService.id, totalDurationMinutes || selectedService.durationMinutes)
          .then((slots) => setAvailableSlots(slots.filter((s) => s.available)))
          .catch(() => {});
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Helper for "Ver próxima data disponível"
  const handleNextAvailableDate = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const next = new Date(y, m - 1, d + 1);
    const yyyy = next.getFullYear();
    const mm = String(next.getMonth() + 1).padStart(2, '0');
    const dd = String(next.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  // Helper to generate Google Calendar Link
  const getGoogleCalendarUrl = (apt: Appointment) => {
    const [y, m, d] = apt.date.split('-').map(Number);
    const [hh, mm] = apt.time.split(':').map(Number);
    const startDate = new Date(Date.UTC(y, m - 1, d, hh + 3, mm)); // America/Sao_Paulo is UTC-3
    const endDate = new Date(startDate.getTime() + apt.durationMinutes * 60000);

    const formatGTime = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, '');
    const startIso = formatGTime(startDate);
    const endIso = formatGTime(endDate);

    const title = encodeURIComponent(`Ferraz Barber Club - ${apt.serviceName}`);
    const details = encodeURIComponent(
      `Agendamento confirmado na Ferraz Barber Club.\nServiço: ${apt.serviceName}\nProfissional: ${apt.barberName}\nValor: R$ ${apt.priceCharged.toFixed(2)}`
    );
    const location = encodeURIComponent('Ferraz Barber Club');

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
  };

  // Download .ics file
  const downloadIcs = (apt: Appointment) => {
    const [y, m, d] = apt.date.split('-').map(Number);
    const [hh, mm] = apt.time.split(':').map(Number);
    const startStr = `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}T${String(hh).padStart(2, '0')}${String(mm).padStart(2, '0')}00`;
    const endMin = hh * 60 + mm + apt.durationMinutes;
    const endH = Math.floor(endMin / 60);
    const endM = endMin % 60;
    const endStr = `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}T${String(endH).padStart(2, '0')}${String(endM).padStart(2, '0')}00`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Ferraz Barber Club//Agendamento//PT',
      'BEGIN:VEVENT',
      `SUMMARY:Ferraz Barber Club - ${apt.serviceName}`,
      `DESCRIPTION:Corte com ${apt.barberName}. Valor: R$ ${apt.priceCharged.toFixed(2)}`,
      'LOCATION:Ferraz Barber Club',
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `agendamento-ferraz-${apt.date}-${apt.time.replace(':', '')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper to generate WhatsApp link for the customer to confirm or save their ticket
  const getWhatsAppConfirmationUrl = (apt: Appointment) => {
    const formattedDate = apt.date.split('-').reverse().join('/');
    const firstName = (apt.customerName || 'Cliente').trim().split(' ')[0];
    
    // Shop phone from settings or default
    const rawShopPhone = (settings?.phone || '11999998888').replace(/\D/g, '');
    const fullShopPhone = rawShopPhone.length <= 11 ? `55${rawShopPhone}` : rawShopPhone;

    const message = `Fala equipe Ferraz Barber Club! Sou o ${firstName}. Acabei de agendar meu horário pelo site:\n\n💈 *Serviço:* ${apt.serviceName}\n✂️ *Barbeiro:* ${apt.barberName}\n📅 *Data:* ${formattedDate} às ${apt.time}\n💰 *Valor:* R$ ${apt.priceCharged.toFixed(2)}\n\nPodem me enviar o comprovante por aqui? Valeu!`;

    return `https://wa.me/${fullShopPhone}?text=${encodeURIComponent(message)}`;
  };

  // Helper for Barber name display
  const getSelectedBarberLabel = () => {
    if (selectedBarberId === 'any') return 'Qualquer Barbeiro (Primeiro disponível)';
    const b = barbers.find((barb) => barb.id === selectedBarberId);
    return b ? `${b.name} (${b.nickname})` : 'Barbeiro';
  };

  const stepsOrder: BookingStep[] = ['service', 'barber', 'date', 'time', 'customer', 'review'];
  const currentStepIndex = stepsOrder.indexOf(step);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-100 flex flex-col items-center selection:bg-amber-400 selection:text-zinc-950 bg-sports-grid font-sans">
      {/* Top Header / Brand Identity */}
      <header className="w-full max-w-2xl px-4 pt-6 pb-4 flex flex-col items-center text-center">
        <div className="w-full flex justify-center items-center mb-3">
          <span className="text-[10px] font-mono uppercase text-amber-400/80 px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20">
            Portal do Cliente
          </span>
        </div>

        {/* Athletic Crest or Custom Logo */}
        {settings?.logoUrl ? (
          <div className="relative w-44 sm:w-56 h-20 sm:h-24 rounded-2xl border border-amber-400/40 bg-[#121215] p-2 flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(245,158,11,0.25)] mb-3">
            <img
              src={settings.logoUrl}
              alt={settings?.shopName || 'Logo'}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="relative w-12 h-12 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 p-[1px] shadow-[0_0_25px_rgba(245,158,11,0.3)] mb-2.5">
            <div className="w-full h-full bg-[#121215] rounded-[11px] flex items-center justify-center text-amber-400">
              <Scissors className="w-6 h-6 -rotate-45" />
            </div>
          </div>
        )}

        <h1 className="font-display font-black text-2xl tracking-wider text-white uppercase leading-none">
          FERRAZ <span className="text-amber-400">BARBER CLUB</span>
        </h1>
        <p className="text-xs text-zinc-400 font-medium tracking-tight mt-1">
          "Da quebrada, para o mundo."
        </p>

        {step !== 'confirmed' && (
          <div className="mt-4 pb-2">
            <h2 className="text-sm font-display font-black tracking-widest text-zinc-200 uppercase">
              AGENDAMENTO ONLINE
            </h2>
            <p className="text-[12px] text-zinc-400">
              Escolha seu serviço, horário e barbeiro em poucos cliques.
            </p>
          </div>
        )}

        {/* Step Progress Pills (Mobile-First) */}
        {step !== 'confirmed' && (
          <div className="w-full mt-3 flex items-center justify-between gap-1 border-t border-b border-white/10 py-2.5">
            {[
              { key: 'service', label: '1. Serviço' },
              { key: 'barber', label: '2. Barbeiro' },
              { key: 'date', label: '3. Data' },
              { key: 'time', label: '4. Horário' },
              { key: 'customer', label: '5. Dados' },
              { key: 'review', label: '6. Confirmação' },
            ].map((s, idx) => {
              const isActive = step === s.key;
              const isPassed = currentStepIndex > idx;
              return (
                <div
                  key={s.key}
                  className={`flex-1 text-center py-1 rounded text-[10px] sm:text-[11px] font-mono font-bold transition-all ${
                    isActive
                      ? 'bg-amber-400 text-zinc-950 shadow-sm'
                      : isPassed
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : 'text-zinc-500'
                  }`}
                >
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{idx + 1}</span>
                </div>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="w-full max-w-2xl px-4 pb-12 flex-1 flex flex-col">
        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 shadow-lg">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="flex-1 font-medium">{errorMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ETAPA 1: IDENTIFICAÇÃO RÁPIDA & ESCOLHA DO SERVIÇO */}
        {/* ========================================================================= */}
        {step === 'service' && (
          <div className="space-y-4">
            {/* 1. Quick Phone Identification Banner */}
            <div className="p-4 rounded-2xl bg-[#121215] border border-white/10 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Identificação Rápida // Cliente Frequente
                </span>
                {identifyingPhone && (
                  <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Buscando cadastro...
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 focus-within:border-amber-400 transition-colors">
                  <Phone className="w-4 h-4 text-zinc-500 shrink-0" />
                  <input
                    type="tel"
                    placeholder="Digite seu WhatsApp com DDD..."
                    value={customerWhatsapp}
                    onChange={handleWhatsappChange}
                    className="w-full bg-transparent text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none"
                  />
                </div>
                {customerWhatsapp && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerWhatsapp('');
                      setRecognizedData(null);
                      setDismissedRecognition(false);
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white bg-white/[0.04] border border-white/10 cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>

              <p className="text-[11px] text-zinc-400">
                Já cortou com a gente? Digite seu número para carregar seus dados e repetir seu último corte em 1 clique!
              </p>
            </div>

            {/* 1.5. CARD DE SUSPENSÃO ONLINE (Histórico de Faltas / No-Show) */}
            {recognizedData && recognizedData.isBlocked ? (
              <div className="p-6 rounded-2xl bg-gradient-to-b from-[#2a0c10] to-[#121215] border-2 border-rose-500/80 shadow-[0_0_30px_rgba(244,63,94,0.3)] space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono font-bold uppercase tracking-wider">
                      AGENDAMENTO ONLINE SUSPENSO
                    </div>
                    <h3 className="font-display font-black text-lg text-white uppercase tracking-wide">
                      ATENÇÃO, {recognizedData.customer.name.split(' ')[0]}
                    </h3>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {recognizedData.blockedReason ||
                        `Identificamos ${recognizedData.noShowCount || 2} faltas registradas sem aviso prévio no seu histórico.`}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-black/60 border border-rose-500/30 space-y-2 text-xs font-mono text-zinc-300">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Faltas Computadas:</span>
                    <strong className="text-rose-400">{recognizedData.noShowCount || 2} falta(s)</strong>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Para blindar as cadeiras e evitar horários perdidos na barbearia, novos agendamentos para este número precisam de aprovação manual direta.
                  </p>
                </div>

                <a
                  href={`https://wa.me/55${(settings?.phone || '11999998888').replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Olá equipe Ferraz Barber Club! Sou o ${recognizedData.customer.name} (${customerWhatsapp}). Gostaria de verificar a liberação para agendar um horário com vocês.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3.5 px-4 rounded-xl font-display font-black text-xs uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Falar no WhatsApp para Liberar Horário</span>
                </a>
              </div>
            ) : (
              <>
                {/* 1.5. CARD VIP CLUB FERRAZ (Aparece se o Club estiver ativo e o cliente for membro ativo de um plano) */}
                {recognizedData && settings?.isClubActive !== false && recognizedData.customer?.membership && recognizedData.customer.membership.active && (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-[#1c180a] via-[#161208] to-[#121215] border-2 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.25)] space-y-3.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/50 text-amber-300 flex items-center justify-center">
                          <Crown className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block">
                            ASSINATURA IDENTIFICADA
                          </span>
                          <h4 className="font-display font-black text-base text-white uppercase tracking-wider">
                            MEMBRO {recognizedData.customer.membership.tier} VIP
                          </h4>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-400 text-zinc-950 uppercase shadow-sm">
                        R$ 0,00 NO PLANO
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
                        <span className="text-zinc-400">Seus créditos para este mês:</span>
                        <span className="text-amber-400 font-bold">
                          Renova em {recognizedData.customer.membership.renewsAt.split('-').reverse().join('/')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                          <span className="text-zinc-400 block text-[10px]">Cortes:</span>
                          <strong className="text-white">
                            {Math.max(0, recognizedData.customer.membership.credits.haircutsTotal - recognizedData.customer.membership.credits.haircutsUsed)} restantes
                          </strong>
                        </div>

                        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                          <span className="text-zinc-400 block text-[10px]">Barbas:</span>
                          <strong className="text-white">
                            {Math.max(0, recognizedData.customer.membership.credits.beardsTotal - recognizedData.customer.membership.credits.beardsUsed)} restantes
                          </strong>
                        </div>

                        {recognizedData.customer.membership.credits.skinCareTotal > 0 && (
                          <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                            <span className="text-zinc-400 block text-[10px]">Limpeza Pele:</span>
                            <strong className="text-cyan-400">
                              {Math.max(0, recognizedData.customer.membership.credits.skinCareTotal - recognizedData.customer.membership.credits.skinCareUsed)} disponível
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-400 font-mono">
                      ✨ Escolha o serviço abaixo normalmente. O valor será <strong className="text-emerald-400">R$ 0,00</strong> e o crédito só é debitado após o barbeiro concluir o atendimento na cadeira!
                    </p>
                  </div>
                )}

                {/* 2. CARD DE RECONHECIMENTO AUTOMÁTICO (Aparece assim que atinge os 11 dígitos se for cliente existente) */}
                {recognizedData && recognizedData.lastAppointment && !dismissedRecognition && (
                  <div className="p-5 rounded-2xl bg-gradient-to-b from-[#1c170a] to-[#121215] border-2 border-amber-400/80 shadow-[0_0_30px_rgba(245,158,11,0.25)] space-y-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-mono font-bold uppercase tracking-wider">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          CLIENTE RECONHECIDO COM SUCESSO
                        </div>
                        <h3 className="font-display font-black text-xl text-white uppercase tracking-wide">
                          FALA, <span className="text-amber-400">{recognizedData.customer.name.split(' ')[0]}</span>!
                        </h3>
                        <p className="text-xs text-zinc-300">
                          Identificamos o seu último agendamento na FERRAZ BARBER CLUB:
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                        <Scissors className="w-5 h-5 -rotate-45" />
                      </div>
                    </div>

                    {/* Details of Last Choice */}
                    <div className="p-4 rounded-xl bg-black/50 border border-amber-400/20 space-y-2.5 font-mono text-xs">
                      <div className="flex items-center justify-between text-white font-bold text-sm">
                        <span className="flex items-center gap-2">
                          ✂️ <strong className="font-display uppercase tracking-wide">{recognizedData.lastAppointment.serviceName}</strong>
                        </span>
                        <span className="text-emerald-400 font-bold text-base tabular-nums">
                          R$ {recognizedData.lastAppointment.servicePrice.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-zinc-400 text-[11px] pt-1 border-t border-white/5">
                        <span>⏱️ Duração: <strong className="text-zinc-200">{recognizedData.lastAppointment.durationMinutes} min</strong></span>
                        <span>💈 Cadeira: <strong className="text-zinc-200">{recognizedData.lastAppointment.barberName}</strong></span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs font-display font-bold text-zinc-200 uppercase tracking-wide block">
                        Deseja repetir essa escolha?
                      </span>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={handleRepeatLastChoice}
                          className="py-3 px-4 rounded-xl font-display font-black text-xs uppercase tracking-wider bg-amber-400 text-zinc-950 hover:bg-amber-300 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-[0.98] cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                          <span>[ SIM, REPETIR ]</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleChooseAnotherService}
                          className="py-3 px-4 rounded-xl font-display font-bold text-xs uppercase tracking-wider bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 border border-white/10 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <span>[ NÃO, OUTRO SERVIÇO ]</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. CARD DE BOAS-VINDAS PARA NOVO CLIENTE (Aparece se digitou 10/11 dígitos e não é cadastrado ainda) */}
                {customerWhatsapp.replace(/\D/g, '').length >= 10 && !identifyingPhone && (!recognizedData || !recognizedData.recognized) && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#121215] border border-amber-400/30 space-y-3 animate-in fade-in duration-200 shadow-xl">
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider">
                      <Sparkles className="w-4 h-4" />
                      <span>SEJA BEM-VINDO(A) À FERRAZ BARBER CLUB!</span>
                    </div>
                    <p className="text-xs text-zinc-300">
                      Notamos que é o seu primeiro agendamento com a gente. Como prefere ser chamado(a)?
                    </p>
                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 focus-within:border-amber-400 transition-colors">
                      <User className="w-4 h-4 text-zinc-400 shrink-0" />
                      <input
                        type="text"
                        required
                        placeholder="Digite seu nome completo (Ex: Lucas Oliveira)..."
                        value={customerName}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '');
                          setCustomerName(val);
                        }}
                        className="w-full bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
                      />
                    </div>
                    {customerName.trim().length > 2 && (
                      <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Nome registrado! Agora selecione o corte desejado abaixo:</span>
                      </div>
                    )}
                  </div>
                )}

                {/* List Header */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5" />
                    Passo 1 de 6 // Escolha o Serviço
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400">
                    {services.length} opções disponíveis
                  </span>
                </div>

                {/* Primary Services Grid */}
                <div className="grid grid-cols-1 gap-2.5">
                  {services.map((svc) => {
                    const isPrimary = selectedService?.id === svc.id;
                    const hasAddons = isPrimary && selectedAdditionalServices.length > 0;
                    return (
                      <div
                        key={svc.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedService(svc);
                          setSelectedAdditionalServices((prev) => prev.filter((s) => s.id !== svc.id));
                          setShowAddonPromptModal(true);
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-4 ${
                          isPrimary
                            ? 'bg-[#1c170a] border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/80'
                            : 'bg-[#121215] border-white/10 hover:border-white/20 active:scale-[0.99]'
                        }`}
                      >
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-display font-black text-base text-white uppercase tracking-wide truncate">
                              {svc.name}
                            </h3>
                            {svc.featured && (
                              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold uppercase shrink-0">
                                Destaque
                              </span>
                            )}
                          </div>
                          {svc.description && (
                            <p className="text-xs text-zinc-400 line-clamp-2">{svc.description}</p>
                          )}
                          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 pt-1">
                            <Clock className="w-3 h-3 text-cyan-400" />
                            <span>{svc.durationMinutes} minutos</span>
                            {hasAddons && (
                              <span className="text-emerald-400 font-bold">
                                • +{selectedAdditionalServices.length} extra(s)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-lg font-mono font-black text-emerald-400 tabular-nums">
                            R$ {svc.price.toFixed(2)}
                          </div>
                          <div className="text-[10px] font-mono text-amber-400 uppercase font-bold mt-1">
                            {isPrimary ? '✓ Selecionado' : 'Escolher'} →
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* POPUP 1: PERGUNTA SE O CLIENTE DESEJA ADICIONAR OUTRO SERVIÇO (SIM OU NÃO) */}
        {/* ========================================================================= */}
        {showAddonPromptModal && selectedService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
            <div className="w-full max-w-md bg-[#121215] border border-amber-400/50 rounded-3xl p-6 shadow-[0_0_50px_rgba(245,158,11,0.3)] space-y-5 text-center">
              {/* Icon badge */}
              <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(245,158,11,0.3)]">
                <Sparkles className="w-8 h-8" />
              </div>

              {/* Title & Selected Service Details */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20">
                  SERVIÇO SELECIONADO
                </span>
                <h3 className="font-display font-black text-xl text-white uppercase tracking-wider pt-1">
                  {selectedService.name}
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  {selectedService.durationMinutes} min • R$ {selectedService.price.toFixed(2)}
                </p>
              </div>

              {/* Question */}
              <div className="p-4 rounded-2xl bg-black/50 border border-white/10">
                <p className="text-sm font-display font-bold text-zinc-100 uppercase tracking-wide">
                  Deseja adicionar outro serviço?
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  Ex: Sobrancelha navalhada, Barba completa ou Acabamento no mesmo horário.
                </p>
              </div>

              {/* SIM / NÃO Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* NÃO: Avança direto para escolher o barbeiro */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAddonPromptModal(false);
                    setStep('barber');
                  }}
                  className="py-3.5 px-4 rounded-xl font-display font-bold text-xs uppercase tracking-wider bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 border border-white/15 transition-all cursor-pointer hover:border-white/30 active:scale-[0.98]"
                >
                  Não, só esse
                </button>

                {/* SIM: Abre a seleção de serviços extras */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAddonPromptModal(false);
                    setShowAddonModal(true);
                  }}
                  className="py-3.5 px-4 rounded-xl font-display font-black text-xs uppercase tracking-wider bg-amber-400 hover:bg-amber-300 text-zinc-950 transition-all cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.45)] active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  Sim, adicionar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL / POPUP DE COMBO: ADICIONAR MAIS SERVIÇOS SEM ROLAGEM */}
        {/* ========================================================================= */}
        {showAddonModal && selectedService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-[#121215] border border-amber-400/40 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.25)] space-y-4 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-sm uppercase text-white tracking-wide">
                      Montar Combo // Serviços Adicionais
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      Serviço principal: <span className="text-amber-400">{selectedService.name}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddonModal(false)}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Addons List */}
              <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                <p className="text-xs text-zinc-300">
                  Selecione outros serviços para fazer no mesmo horário:
                </p>

                {services
                  .filter((s) => s.id !== selectedService.id)
                  .map((svc) => {
                    const isAdded = selectedAdditionalServices.some((s) => s.id === svc.id);
                    return (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => {
                          if (isAdded) {
                            setSelectedAdditionalServices((prev) => prev.filter((s) => s.id !== svc.id));
                          } else {
                            setSelectedAdditionalServices((prev) => [...prev, svc]);
                          }
                        }}
                        className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isAdded
                            ? 'bg-amber-400/10 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                            : 'bg-black/40 border-white/10 hover:border-white/20 text-zinc-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold truncate text-white">{svc.name}</div>
                          <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                            +{svc.durationMinutes} min • R$ {svc.price.toFixed(2)}
                          </div>
                        </div>

                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                            isAdded
                              ? 'bg-amber-400 text-zinc-950 font-black'
                              : 'border border-white/20 text-zinc-400'
                          }`}
                        >
                          {isAdded ? '✓' : '+'}
                        </div>
                      </button>
                    );
                  })}
              </div>

              {/* Modal Footer Summary */}
              <div className="border-t border-white/10 pt-3 space-y-3">
                <div className="p-3 rounded-xl bg-black/60 border border-white/10 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">Atendimento Total</span>
                    <strong className="text-white font-display text-sm truncate block">
                      {combinedServiceName}
                    </strong>
                    <span className="text-zinc-400 text-[11px]">Tempo estimado: {totalDurationMinutes} min</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 uppercase block">Valor Total</span>
                    <strong className="text-emerald-400 font-mono text-base font-black">
                      R$ {totalPrice.toFixed(2)}
                    </strong>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddonModal(false)}
                    className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 border border-white/10 font-display font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddonModal(false);
                      setStep('barber');
                    }}
                    className="flex-1 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-display font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    Avançar para Barbeiro <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ETAPA 2: ESCOLHER BARBEIRO */}
        {/* ========================================================================= */}
        {step === 'barber' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Passo 2 de 6 // Escolha o Barbeiro
              </span>
              <button
                onClick={() => setStep('service')}
                className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" /> Voltar
              </button>
            </div>

            {selectedService && (
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                <div>
                  <span className="text-zinc-500 uppercase text-[10px] font-mono block">Serviço(s) Selecionado(s)</span>
                  <strong className="text-white font-display uppercase">{combinedServiceName || selectedService.name}</strong>
                  <span className="text-zinc-400 ml-2 font-mono">({totalDurationMinutes} min)</span>
                  {selectedAdditionalServices.length > 0 && (
                    <span className="ml-2 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40">
                      Combo com {selectedAdditionalServices.length + 1} itens
                    </span>
                  )}
                </div>
                <div className="text-right flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddonModal(true)}
                    className="text-[11px] font-mono text-amber-400 hover:underline cursor-pointer"
                  >
                    + Ajustar Serviços
                  </button>
                  <span className="text-emerald-400 font-mono font-bold text-sm">
                    R$ {totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {/* Option: Qualquer Barbeiro */}
              <button
                onClick={() => {
                  setSelectedBarberId('any');
                  setStep('date');
                }}
                className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  selectedBarberId === 'any'
                    ? 'bg-[#1c170a] border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                    : 'bg-[#121215] border-white/10 hover:border-white/20 active:scale-[0.99]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-base text-white uppercase tracking-wide">
                      QUALQUER BARBEIRO
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Escolher automaticamente o primeiro horário disponível.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-amber-400 uppercase">
                  Mais Rápido →
                </span>
              </button>

              {/* Resident Barbers */}
              {barbers
                .filter((barber) => barber.active)
                .map((barber, idx) => {
                  const isSelected = selectedBarberId === barber.id;
                  return (
                    <button
                      key={barber.id}
                      onClick={() => {
                        setSelectedBarberId(barber.id);
                        setStep('date');
                      }}
                      className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-[#1c170a] border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                          : 'bg-[#121215] border-white/10 hover:border-white/20 active:scale-[0.99]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {barber.avatarUrl ? (
                          <img
                            src={barber.avatarUrl}
                            alt={barber.name}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-xl object-cover border"
                            style={{ borderColor: barber.color || '#f59e0b' }}
                          />
                        ) : (
                          <div
                            className="w-11 h-11 rounded-xl border flex items-center justify-center font-display font-black text-sm"
                            style={{
                              backgroundColor: `${barber.color}20`,
                              borderColor: barber.color,
                              color: barber.color,
                            }}
                          >
                            C0{idx + 1}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-display font-black text-base text-white uppercase tracking-wide">
                              {barber.name}
                            </h3>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/10">
                              Cadeira 0{idx + 1}
                            </span>
                          </div>
                          {barber.specialty && (
                            <p className="text-[11px] text-amber-400 font-medium line-clamp-1">
                              {barber.specialty}
                            </p>
                          )}
                          <p className="text-xs text-zinc-400">
                            Expediente das {barber.startTime} às {barber.endTime}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-zinc-400 uppercase">
                        Escolher →
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ETAPA 3: ESCOLHER DATA */}
        {/* ========================================================================= */}
        {step === 'date' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5" />
                Passo 3 de 6 // Escolha a Data
              </span>
              <button
                onClick={() => setStep('barber')}
                className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" /> Voltar
              </button>
            </div>

            {/* Quick Summary Pill */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
              <div>
                <span className="text-zinc-500 uppercase text-[10px] font-mono block">Profissional & Serviço</span>
                <strong className="text-white font-display uppercase">{getSelectedBarberLabel()}</strong>
                <span className="text-zinc-400 block text-[11px] font-mono">
                  {selectedService?.name} • {selectedService?.durationMinutes} min
                </span>
              </div>
            </div>

            {/* Quick Days Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-zinc-400 uppercase block">
                Selecione um dos próximos dias:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {quickDays.map((qd) => {
                  const isSelected = selectedDate === qd.date;
                  return (
                    <button
                      key={qd.date}
                      onClick={() => {
                        setSelectedDate(qd.date);
                        setStep('time');
                      }}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#1c170a] border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                          : 'bg-[#121215] border-white/10 hover:border-white/20 text-zinc-200'
                      }`}
                    >
                      <div className="font-display font-black text-sm uppercase">{qd.label}</div>
                      <div className="text-[10px] font-mono text-zinc-400 capitalize mt-0.5">{qd.dayOfWeek}</div>
                      <div className="text-[9px] font-mono text-zinc-500 mt-1">{qd.date.split('-').reverse().join('/')}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Manual Date Input Picker */}
            <div className="pt-2">
              <label className="text-xs font-mono text-zinc-400 uppercase block mb-1.5">
                Ou escolha outra data no calendário:
              </label>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#121215] border border-white/10">
                <CalendarIcon className="w-4 h-4 text-amber-400" />
                <input
                  type="date"
                  value={selectedDate}
                  min={getOperationDateTime().todayStr}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                  }}
                  className="bg-transparent text-white font-mono text-xs focus:outline-none flex-1 cursor-pointer"
                />
                <button
                  onClick={() => setStep('time')}
                  disabled={!selectedDate}
                  className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-display font-black text-xs uppercase cursor-pointer disabled:opacity-50"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ETAPA 4: ESCOLHER HORÁRIO */}
        {/* ========================================================================= */}
        {step === 'time' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Passo 4 de 6 // Escolha o Horário
              </span>
              <button
                onClick={() => setStep('date')}
                className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" /> Voltar
              </button>
            </div>

            {/* Selected Date Header */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
              <div>
                <span className="text-zinc-500 uppercase text-[10px] font-mono block">Data Selecionada</span>
                <strong className="text-white font-display uppercase">
                  {selectedDate.split('-').reverse().join('/')}
                </strong>
                <span className="text-zinc-400 ml-2 font-mono">({getSelectedBarberLabel()})</span>
              </div>
              <button
                onClick={() => setStep('date')}
                className="text-[11px] font-mono text-amber-400 hover:underline cursor-pointer"
              >
                Alterar Data
              </button>
            </div>

            {/* Slots Loading Indicator */}
            {loadingSlots && (
              <div className="p-10 text-center rounded-2xl bg-[#121215] border border-white/10 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 text-amber-400 animate-spin" />
                <span className="text-xs font-mono text-zinc-400">
                  Calculando horários livres em tempo real...
                </span>
              </div>
            )}

            {/* Slots Grid */}
            {!loadingSlots && availableSlots.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-mono text-zinc-400 uppercase block">
                  Horários livres confirmados ({availableSlots.length} disponíveis):
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {availableSlots.map((slot) => {
                    const isSelected = selectedTime === slot.time;
                    return (
                      <button
                        key={slot.time}
                        onClick={() => {
                          setSelectedTime(slot.time);
                          setStep('customer');
                        }}
                        className={`py-3 px-2 rounded-xl border font-mono font-bold text-sm tracking-wider transition-all cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-[#1c170a] border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)] ring-1 ring-amber-400'
                            : 'bg-[#121215] border-white/10 hover:border-white/20 text-white active:scale-[0.98]'
                        }`}
                      >
                        <span className="tabular-nums">{slot.time}</span>
                        <span className="text-[9px] text-emerald-400 font-sans mt-0.5">Disponível</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No Slots Available Alert */}
            {!loadingSlots && availableSlots.length === 0 && (
              <div className="p-8 text-center rounded-2xl bg-[#121215] border border-white/10 space-y-4">
                <Clock className="w-8 h-8 text-zinc-600 mx-auto" />
                <div>
                  <h4 className="font-display font-black text-sm uppercase text-white">
                    Não encontramos horários disponíveis para esta data
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                    Os horários para este dia já foram preenchidos ou estão fora do expediente regular.
                  </p>
                </div>
                <button
                  onClick={handleNextAvailableDate}
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                >
                  Ver próxima data disponível →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ETAPA 5: DADOS DO CLIENTE */}
        {/* ========================================================================= */}
        {step === 'customer' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Passo 5 de 6 // Seus Dados
              </span>
              <button
                onClick={() => setStep('time')}
                className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" /> Voltar
              </button>
            </div>

            {/* Chosen Slot Summary */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
              <div>
                <span className="text-zinc-500 uppercase text-[10px] font-mono block">Data e Horário</span>
                <strong className="text-white font-mono text-sm">
                  {selectedDate.split('-').reverse().join('/')} às {selectedTime}
                </strong>
                <span className="text-zinc-400 block text-[11px] font-mono mt-0.5">
                  {selectedService?.name} • R$ {selectedService?.price.toFixed(2)}
                </span>
              </div>
              <button
                onClick={() => setStep('time')}
                className="text-[11px] font-mono text-amber-400 hover:underline cursor-pointer"
              >
                Alterar
              </button>
            </div>

            {/* Form Fields */}
            <div className="p-5 rounded-2xl bg-[#121215] border border-white/10 space-y-4">
              <div>
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 block mb-1.5">
                  Nome Completo <span className="text-amber-400">*</span>
                </label>
                <div className="flex items-center gap-2 px-3.5 py-3 rounded-xl bg-black/40 border border-white/10 focus-within:border-amber-400 transition-colors">
                  <User className="w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Ex: Gabriel Santos"
                    value={customerName}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '');
                      setCustomerName(val);
                    }}
                    className="w-full bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 block mb-1.5">
                  WhatsApp com DDD <span className="text-amber-400">*</span>
                </label>
                <div className="flex items-center gap-2 px-3.5 py-3 rounded-xl bg-black/40 border border-white/10 focus-within:border-amber-400 transition-colors">
                  <Phone className="w-4 h-4 text-zinc-500" />
                  <input
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={customerWhatsapp}
                    onChange={handleWhatsappChange}
                    className="w-full bg-transparent text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1.5">
                  Utilizado para confirmar sua reserva e enviar o lembrete de horário. Sem senhas ou cadastros longos.
                </p>
              </div>

              <button
                onClick={() => {
                  const clean = customerWhatsapp.replace(/\D/g, '');
                  if (!customerName.trim()) {
                    setErrorMessage('Por favor, informe seu nome.');
                    return;
                  }
                  if (clean.length < 10) {
                    setErrorMessage('Por favor, informe um WhatsApp válido com DDD.');
                    return;
                  }
                  setErrorMessage(null);
                  setStep('review');
                }}
                className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-display font-black text-sm uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
              >
                Revisar Agendamento <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ETAPA 6: REVISÃO ANTES DE CONFIRMAR */}
        {/* ========================================================================= */}
        {step === 'review' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Passo 6 de 6 // Revisão Final
              </span>
              <button
                onClick={() => setStep('customer')}
                className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" /> Alterar Dados
              </button>
            </div>

            {/* Tactical Review Card */}
            <div className="p-5 rounded-2xl bg-[#121215] border border-white/10 space-y-4 shadow-2xl">
              <div className="border-b border-white/10 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-black text-lg text-white uppercase tracking-wider">
                    RESUMO DO AGENDAMENTO
                  </h3>
                  <span className="text-xs text-amber-400 font-mono">FERRAZ BARBER CLUB</span>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 uppercase font-bold">
                  SÃO PAULO (BRT)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-zinc-500 uppercase text-[10px] font-mono block">Serviço(s)</span>
                  <div className="font-display font-black text-sm text-white uppercase">
                    {combinedServiceName || selectedService?.name}
                  </div>
                  <span className="text-zinc-400 text-[11px] font-mono">
                    Duração Total: {totalDurationMinutes} min
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-zinc-500 uppercase text-[10px] font-mono block">Profissional</span>
                  <div className="font-display font-black text-sm text-white uppercase">
                    {getSelectedBarberLabel()}
                  </div>
                  <span className="text-zinc-400 text-[11px] font-mono">Cadeira Residente</span>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-zinc-500 uppercase text-[10px] font-mono block">Data & Horário</span>
                  <div className="font-mono font-bold text-sm text-amber-400">
                    {selectedDate.split('-').reverse().join('/')}
                  </div>
                  <span className="font-mono font-black text-base text-white">{selectedTime}</span>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-zinc-500 uppercase text-[10px] font-mono block">Valor a Pagar</span>
                  {recognizedData?.customer?.membership?.active ? (
                    <div>
                      <div className="font-mono font-black text-base text-emerald-400">
                        R$ 0,00
                      </div>
                      <span className="text-[10px] font-mono text-amber-400 font-bold uppercase block">
                        ★ Incluso no {recognizedData.customer.membership.tier}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div className="font-mono font-black text-base text-emerald-400">
                        R$ {totalPrice.toFixed(2)}
                      </div>
                      <span className="text-zinc-400 text-[10px] font-mono">
                        {selectedAdditionalServices.length > 0 ? 'Combo unificado' : 'Preço Congelado'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Info Box */}
              <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-xs flex items-center justify-between">
                <div>
                  <span className="text-zinc-500 text-[10px] font-mono uppercase block">Cliente</span>
                  <strong className="text-white">{customerName}</strong>
                </div>
                <div className="text-right">
                  <span className="text-zinc-500 text-[10px] font-mono uppercase block">WhatsApp</span>
                  <strong className="text-zinc-300 font-mono">{customerWhatsapp}</strong>
                </div>
              </div>

              {/* Confirmation Action Button */}
              <div className="pt-2 space-y-2">
                <button
                  onClick={handleConfirmBooking}
                  disabled={submitting}
                  className="w-full py-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-display font-black text-base uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.45)] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Reservando horário...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5 stroke-[3]" />
                      CONFIRMAR AGENDAMENTO
                    </>
                  )}
                </button>

                <button
                  onClick={() => setStep('service')}
                  disabled={submitting}
                  className="w-full py-2 text-xs font-mono text-zinc-400 hover:text-white uppercase transition-colors cursor-pointer"
                >
                  Alterar Seleção
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ETAPA 7: CONFIRMAÇÃO DE SUCESSO */}
        {/* ========================================================================= */}
        {step === 'confirmed' && confirmedApt && (
          <div className="p-6 rounded-2xl bg-[#121215] border border-emerald-500/40 space-y-5 text-center shadow-[0_0_40px_rgba(16,185,129,0.15)]">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase font-bold tracking-widest">
                ● RESERVA CONFIRMADA
              </span>
              <h2 className="font-display font-black text-2xl text-white uppercase tracking-wider pt-1">
                AGENDAMENTO CONFIRMADO
              </h2>
              <p className="text-xs text-zinc-400">
                Seu horário está reservado na Ferraz Barber Club.
              </p>
            </div>

            {/* Ticket Card Details */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-left space-y-3 text-xs">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-zinc-500 uppercase font-mono text-[10px]">Cliente</span>
                <strong className="text-white font-medium">{confirmedApt.customerName}</strong>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-zinc-500 uppercase font-mono text-[10px]">Serviço</span>
                <strong className="text-white font-medium">{confirmedApt.serviceName}</strong>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-zinc-500 uppercase font-mono text-[10px]">Barbeiro</span>
                <strong className="text-amber-400 font-display uppercase tracking-wide">
                  {confirmedApt.barberName}
                </strong>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-zinc-500 uppercase font-mono text-[10px]">Data & Horário</span>
                <strong className="text-white font-mono">
                  {confirmedApt.date.split('-').reverse().join('/')} às {confirmedApt.time}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 uppercase font-mono text-[10px]">Valor</span>
                <strong className="text-emerald-400 font-mono font-bold text-sm">
                  R$ {confirmedApt.priceCharged.toFixed(2)}
                </strong>
              </div>
            </div>

            {/* Action Buttons: WhatsApp, Add to Calendar & New Booking */}
            <div className="space-y-2.5 pt-2">
              <a
                href={getWhatsAppConfirmationUrl(confirmedApt)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-display font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.45)] active:scale-[0.99] cursor-pointer"
              >
                <MessageSquare className="w-5 h-5 fill-zinc-950" />
                Receber Comprovante no WhatsApp
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>

              <a
                href={getGoogleCalendarUrl(confirmedApt)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white border border-white/10 hover:border-white/20 font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <CalendarPlus className="w-4 h-4 text-cyan-400" />
                Adicionar ao Google Agenda
                <ExternalLink className="w-3.5 h-3.5 opacity-50" />
              </a>

              <button
                onClick={() => downloadIcs(confirmedApt)}
                className="w-full py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-zinc-300 border border-white/10 font-mono text-xs transition-all cursor-pointer"
              >
                Baixar arquivo .ICS (Apple / Outlook)
              </button>

              <button
                onClick={() => {
                  setConfirmedApt(null);
                  setSelectedService(null);
                  setSelectedAdditionalServices([]);
                  setSelectedBarberId('any');
                  setSelectedTime('');
                  setCustomerName('');
                  setCustomerWhatsapp('');
                  setRecognizedData(null);
                  setDismissedRecognition(false);
                  setStep('service');
                }}
                className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer mt-3"
              >
                Fazer Outro Agendamento
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Public Footer */}
      <footer className="w-full max-w-2xl px-4 py-6 text-center border-t border-white/5 text-[11px] font-mono text-zinc-500">
        <p>FERRAZ BARBER CLUB // Sistema Operacional & Gestão Tática</p>
        <p className="mt-0.5 text-zinc-600">São Paulo, SP • Horário de Brasília (BRT)</p>
      </footer>
    </div>
  );
};
