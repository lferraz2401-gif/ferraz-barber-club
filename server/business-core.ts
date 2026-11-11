import {
  Customer,
  Barber,
  Service,
  Appointment,
  ScheduleBlock,
  ShopSettings,
  FinancialStats,
  FinancialPeriod,
  DashboardMetrics,
} from '../src/types/index.js';
import { IDataRepository } from './repository.js';
import {
  getOperationDateTime,
  timeToMinutes,
  minutesToTime,
} from '../src/utils/datetime.js';

export { timeToMinutes, minutesToTime };

export interface AvailabilityCheckResult {
  available: boolean;
  reason?: string;
}

/**
 * Check availability for a specific barber, date, time and duration
 * Accepts any repository implementing IDataRepository (synchronous or async).
 */
export async function checkBarberAvailabilityWithRepo(
  repo: IDataRepository,
  barberId: string,
  dateStr: string, // YYYY-MM-DD
  timeStr: string, // HH:mm
  durationMinutes: number,
  isFitIn: boolean = false,
  excludeAppointmentId?: string
): Promise<AvailabilityCheckResult> {
  const settings = await repo.getSettings();
  const barber = await repo.getBarberById(barberId);

  if (!barber) {
    return { available: false, reason: 'Barbeiro não encontrado.' };
  }

  if (!barber.active) {
    return { available: false, reason: `${barber.name} está inativo(a) no momento.` };
  }

  const aptStartMin = timeToMinutes(timeStr);
  const aptEndMin = aptStartMin + durationMinutes;

  // 0. Operation time & Past time check (Rule 8 & 10)
  const { todayStr, nowMinutes, nowTimeStr } = getOperationDateTime();

  if (dateStr < todayStr) {
    return {
      available: false,
      reason: 'Não é permitido agendar em datas passadas.',
    };
  }

  // Max future days check
  if (settings.maxFutureDays && !isFitIn) {
    const [y, m, d] = todayStr.split('-').map(Number);
    const maxDate = new Date(y, m - 1, d + settings.maxFutureDays);
    const maxY = maxDate.getFullYear();
    const maxM = String(maxDate.getMonth() + 1).padStart(2, '0');
    const maxD = String(maxDate.getDate()).padStart(2, '0');
    const maxDateStr = `${maxY}-${maxM}-${maxD}`;
    if (dateStr > maxDateStr) {
      return {
        available: false,
        reason: `Agendamentos são permitidos com no máximo ${settings.maxFutureDays} dias de antecedência.`,
      };
    }
  }

  // Same day booking check
  if (settings.allowSameDay === false && dateStr === todayStr && !isFitIn) {
    return {
      available: false,
      reason: 'A barbearia não aceita agendamentos para o mesmo dia.',
    };
  }

  // If date is today, past times cannot be scheduled (unless manual admin fit-in override)
  if (dateStr === todayStr && !isFitIn) {
    if (aptStartMin <= nowMinutes) {
      return {
        available: false,
        reason: `Horário já passou para o dia de hoje (horário atual: ${nowTimeStr}). Escolha um horário futuro.`,
      };
    }
  }

  // 1. Check shop operating hours
  const shopOpenMin = timeToMinutes(settings.openTime);
  const shopCloseMin = timeToMinutes(settings.closeTime);

  if (!isFitIn) {
    if (aptStartMin < shopOpenMin || aptEndMin > shopCloseMin) {
      return {
        available: false,
        reason: `Horário fora do funcionamento da barbearia (${settings.openTime} às ${settings.closeTime}). O serviço dura ${durationMinutes} min.`,
      };
    }
  }

  // 2. Check Day of Week
  const targetDate = new Date(`${dateStr}T12:00:00`);
  const dayOfWeek = targetDate.getDay(); // 0 = Sun, 1 = Mon ...

  if (!settings.operatingDays.includes(dayOfWeek) && !isFitIn) {
    return {
      available: false,
      reason: 'A barbearia não abre neste dia da semana.',
    };
  }

  const daySchedule = barber.dailySchedule?.[dayOfWeek];
  const isDayActive = daySchedule !== undefined ? daySchedule.active : barber.workDays.includes(dayOfWeek);

  if (!isDayActive && !isFitIn) {
    return {
      available: false,
      reason: `${barber.name} não trabalha neste dia da semana (dia de folga regular).`,
    };
  }

  // 3. Check Barber Individual Shifts (por dia da semana ou padrão)
  const effectiveStartTime = daySchedule?.startTime || barber.startTime;
  const effectiveEndTime = daySchedule?.endTime || barber.endTime;
  const barberStartMin = timeToMinutes(effectiveStartTime);
  const barberEndMin = timeToMinutes(effectiveEndTime);
  if (!isFitIn) {
    if (aptStartMin < barberStartMin || aptEndMin > barberEndMin) {
      return {
        available: false,
        reason: `Fora da escala de ${barber.name} neste dia (${effectiveStartTime} às ${effectiveEndTime}).`,
      };
    }
  }

  // 4. Check Barber Lunch Break
  const effectiveLunchStart = daySchedule?.lunchStart || barber.lunchStart;
  const effectiveLunchEnd = daySchedule?.lunchEnd || barber.lunchEnd;
  const lunchStartMin = timeToMinutes(effectiveLunchStart);
  const lunchEndMin = timeToMinutes(effectiveLunchEnd);
  // Interval overlap: max(start1, start2) < min(end1, end2)
  if (!isFitIn && lunchStartMin < lunchEndMin && Math.max(aptStartMin, lunchStartMin) < Math.min(aptEndMin, lunchEndMin)) {
    return {
      available: false,
      reason: `Horário coincide com o intervalo de almoço de ${barber.name} (${effectiveLunchStart} às ${effectiveLunchEnd}).`,
    };
  }

  // 5. Check Schedule Blocks (Vacations, Off-days, Time blocks, Shop Recess)
  const blocks = await repo.getBlocks();
  for (const block of blocks) {
    if (!block.barberId || block.barberId === barberId) {
      if (dateStr >= block.startDate && dateStr <= block.endDate) {
        if (block.type === 'VACATION') {
          return {
            available: false,
            reason: `${block.barberId ? barber.name : 'A barbearia'} está em período de férias (${block.reason || 'Férias'}).`,
          };
        }
        if (block.type === 'OFF_DAY' || block.type === 'SHOP_RECESS') {
          return {
            available: false,
            reason: `${block.barberId ? barber.name : 'A barbearia'} possui folga/recesso programado (${block.reason || 'Recesso'}).`,
          };
        }
        if (block.type === 'TIME_BLOCK') {
          if (block.startTime && block.endTime) {
            const blockStartMin = timeToMinutes(block.startTime);
            const blockEndMin = timeToMinutes(block.endTime);
            if (Math.max(aptStartMin, blockStartMin) < Math.min(aptEndMin, blockEndMin)) {
              return {
                available: false,
                reason: `Bloqueio de agenda ativo (${block.startTime} - ${block.endTime}): ${block.reason || 'Horário reservado'}`,
              };
            }
          } else {
            return {
              available: false,
              reason: `Dia bloqueado para agendamentos: ${block.reason}`,
            };
          }
        }
      }
    }
  }

  // 6. Check existing appointments (no double booking for same barber!)
  const allAppointments = await repo.getAppointments();
  const appointments = allAppointments.filter(
    (a) =>
      a.barberId === barberId &&
      a.date === dateStr &&
      (a.status === 'CONFIRMED' || a.status === 'IN_PROGRESS' || a.status === 'COMPLETED') &&
      a.id !== excludeAppointmentId
  );

  // 6. Check existing appointments (com margem de higienização e pagamento pós-corte)
  const bufferMargin = settings.bufferMinutes !== undefined ? settings.bufferMinutes : 15;

  for (const existing of appointments) {
    const existingStart = timeToMinutes(existing.time);
    const existingEffectiveEnd = existingStart + existing.durationMinutes + bufferMargin;

    if (Math.max(aptStartMin, existingStart) < Math.min(aptEndMin, existingEffectiveEnd)) {
      const finishTime = existingStart + existing.durationMinutes;
      return {
        available: false,
        reason: `Conflito de agenda: ${barber.name} já possui atendimento (${existing.serviceName} - ${existing.time} às ${minutesToTime(finishTime)} + ${bufferMargin} min de higienização/caixa).`,
      };
    }

    if (aptEndMin + bufferMargin > existingStart && aptStartMin < existingStart) {
      return {
        available: false,
        reason: `Intervalo insuficiente antes do próximo cliente de ${barber.name} (${existing.time}). É necessária a margem de ${bufferMargin} min pós-corte.`,
      };
    }
  }

  return { available: true };
}

/**
 * Get available time slots for a given barber, date and duration using a repository
 */
export async function getAvailableSlotsWithRepo(
  repo: IDataRepository,
  barberId: string,
  dateStr: string,
  durationMinutes: number
): Promise<{ time: string; available: boolean; reason?: string }[]> {
  const barber = await repo.getBarberById(barberId);
  const settings = await repo.getSettings();

  if (!barber || !barber.active) return [];

  const targetDate = new Date(`${dateStr}T12:00:00`);
  const dayOfWeek = targetDate.getDay();
  const daySchedule = barber.dailySchedule?.[dayOfWeek];
  const isDayActive = daySchedule !== undefined ? daySchedule.active : barber.workDays.includes(dayOfWeek);

  if (!isDayActive) return [];

  const effectiveStartTime = daySchedule?.startTime || barber.startTime;
  const effectiveEndTime = daySchedule?.endTime || barber.endTime;

  const slots: { time: string; available: boolean; reason?: string }[] = [];
  const startMin = timeToMinutes(effectiveStartTime);
  const endMin = timeToMinutes(effectiveEndTime);
  const shopOpenMin = timeToMinutes(settings.openTime);
  const shopCloseMin = timeToMinutes(settings.closeTime);

  const effectiveStart = Math.max(startMin, shopOpenMin);
  const effectiveEnd = Math.min(endMin, shopCloseMin);

  // Generate slots every 15 minutes (14:00, 14:15, 14:30, 14:45...)
  for (let m = effectiveStart; m + durationMinutes <= effectiveEnd; m += 15) {
    const timeStr = minutesToTime(m);
    const check = await checkBarberAvailabilityWithRepo(repo, barberId, dateStr, timeStr, durationMinutes, false);
    slots.push({
      time: timeStr,
      available: check.available,
      reason: check.reason,
    });
  }

  return slots;
}


/**
 * Recalculate customer metrics from appointments using a repository
 */
export async function enrichCustomerDataWithRepo(
  repo: IDataRepository,
  customer: Customer
): Promise<Customer> {
  const allAppointments = await repo.getAppointments();
  const allCustomerApts = allAppointments
    .filter((a) => a.customerId === customer.id)
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  const completedApts = allCustomerApts.filter((a) => a.status === 'COMPLETED');
  const noShowApts = allCustomerApts.filter((a) => a.status === 'NO_SHOW');
  const noShowCount = noShowApts.length;

  // Calculate consecutive recent no-shows (sem comparecer)
  let consecutiveNoShows = 0;
  for (const apt of allCustomerApts) {
    if (apt.status === 'NO_SHOW') {
      consecutiveNoShows++;
    } else if (apt.status === 'COMPLETED') {
      break;
    }
  }

  // Regra de "Histórico Sujo": 2 ou mais faltas (ou 2 faltas consecutivas) bloqueiam o agendamento online automático
  let isBlockedFromOnlineBooking: boolean;
  if (customer.isBlockedFromOnlineBooking !== undefined && customer.isBlockedFromOnlineBooking !== null) {
    isBlockedFromOnlineBooking = Boolean(customer.isBlockedFromOnlineBooking);
  } else {
    isBlockedFromOnlineBooking = noShowCount >= 2 || consecutiveNoShows >= 2;
  }

  const blockedReason =
    customer.blockedReason ||
    (isBlockedFromOnlineBooking
      ? `Histórico de ${noShowCount} ausência(s) sem cancelamento prévio (No-Show).`
      : undefined);

  const totalVisits = completedApts.length;
  const totalSpent = completedApts.reduce((sum, a) => sum + (a.priceCharged || 0), 0);
  const lastVisit = completedApts[0]?.date || customer.lastVisit;

  const barberCount: Record<string, number> = {};
  for (const apt of completedApts) {
    barberCount[apt.barberId] = (barberCount[apt.barberId] || 0) + 1;
  }
  let preferredBarberId: string | undefined;
  let maxCount = 0;
  for (const [bId, count] of Object.entries(barberCount)) {
    if (count > maxCount) {
      maxCount = count;
      preferredBarberId = bId;
    }
  }
  const preferredBarber = preferredBarberId ? await repo.getBarberById(preferredBarberId) : undefined;

  const averageTicket = totalVisits > 0 ? Number((totalSpent / totalVisits).toFixed(2)) : 0;

  const serviceCount: Record<string, number> = {};
  for (const apt of completedApts) {
    serviceCount[apt.serviceName] = (serviceCount[apt.serviceName] || 0) + 1;
  }
  let preferredServiceName: string | undefined;
  let maxSrvCount = 0;
  for (const [sName, count] of Object.entries(serviceCount)) {
    if (count > maxSrvCount) {
      maxSrvCount = count;
      preferredServiceName = sName;
    }
  }

  let avgFrequencyDays: number | undefined;
  if (completedApts.length >= 2) {
    const dates = completedApts.map((a) => new Date(a.date).getTime()).sort((a, b) => a - b);
    let totalDiff = 0;
    for (let i = 1; i < dates.length; i++) {
      totalDiff += (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);
    }
    avgFrequencyDays = Math.round(totalDiff / (dates.length - 1));
  }

  let status: 'ACTIVE' | 'RETURN_NEEDED' | 'INACTIVE' = 'ACTIVE';
  if (lastVisit) {
    const lastDate = new Date(`${lastVisit}T12:00:00`);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 20) {
      status = 'ACTIVE';
    } else if (diffDays <= 35) {
      status = 'RETURN_NEEDED';
    } else {
      status = 'INACTIVE';
    }
  } else {
    status = 'ACTIVE';
  }

  return {
    ...customer,
    totalVisits,
    totalSpent,
    noShowCount,
    consecutiveNoShows,
    isBlockedFromOnlineBooking,
    blockedReason,
    averageTicket,
    preferredServiceName,
    lastVisit,
    preferredBarberId,
    preferredBarberName: preferredBarber?.name,
    avgFrequencyDays,
    status,
  };
}

/**
 * Financial calculations strictly based on COMPLETED appointments using a repository
 */
export async function getFinancialStatsWithRepo(
  repo: IDataRepository,
  period: FinancialPeriod,
  customStart?: string,
  customEnd?: string
): Promise<FinancialStats> {
  const today = new Date();
  let startDate = '';
  let endDate = '';

  const format = (d: Date) => d.toISOString().split('T')[0];

  if (period === 'today') {
    startDate = format(today);
    endDate = format(today);
  } else if (period === 'week') {
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    startDate = format(monday);
    endDate = format(sunday);
  } else if (period === 'month') {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    startDate = format(firstDay);
    endDate = format(lastDay);
  } else {
    startDate = customStart || format(today);
    endDate = customEnd || format(today);
  }

  const allApts = (await repo.getAppointments()).filter((a) => a.date >= startDate && a.date <= endDate);

  const completedApts = allApts.filter((a) => a.status === 'COMPLETED');
  const cancellationsCount = allApts.filter((a) => a.status === 'CANCELLED').length;
  const noShowCount = allApts.filter((a) => a.status === 'NO_SHOW').length;

  const totalRevenue = completedApts.reduce((sum, a) => sum + (a.priceCharged || 0), 0);
  const totalAppointments = completedApts.length;
  const averageTicket = totalAppointments > 0 ? Number((totalRevenue / totalAppointments).toFixed(2)) : 0;

  const allBarbers = await repo.getBarbers();
  let totalCommissions = 0;

  const barbers = allBarbers.map((b) => {
    const barberCompleted = completedApts.filter((a) => a.barberId === b.id);
    const rev = barberCompleted.reduce((sum, a) => sum + (a.priceCharged || 0), 0);
    const count = barberCompleted.length;
    const avg = count > 0 ? Number((rev / count).toFixed(2)) : 0;
    const rate = b.defaultCommissionRate !== undefined ? b.defaultCommissionRate : 50;

    const commissionAmt = barberCompleted.reduce((sum, apt) => {
      if (apt.commissionAmount !== undefined) {
        return sum + apt.commissionAmount;
      }
      const aptRate = apt.commissionRate !== undefined ? apt.commissionRate : rate;
      return sum + ((apt.priceCharged || 0) * aptRate) / 100;
    }, 0);

    const roundedCommission = Number(commissionAmt.toFixed(2));
    const shopAmt = Number((rev - roundedCommission).toFixed(2));
    totalCommissions += roundedCommission;

    return {
      barberId: b.id,
      barberName: b.name,
      revenue: rev,
      appointmentsCount: count,
      averageTicket: avg,
      commissionRate: rate,
      commissionAmount: roundedCommission,
      shopAmount: shopAmt,
    };
  });

  const shopNetRevenue = Number((totalRevenue - totalCommissions).toFixed(2));

  const paymentTotalsMap: Record<string, { total: number; count: number }> = {
    PIX: { total: 0, count: 0 },
    CREDIT_CARD: { total: 0, count: 0 },
    DEBIT_CARD: { total: 0, count: 0 },
    CASH: { total: 0, count: 0 },
    CLUB_PLAN: { total: 0, count: 0 },
  };

  const paymentMethodLabels: Record<string, string> = {
    PIX: 'Pix Instantâneo',
    CREDIT_CARD: 'Cartão de Crédito',
    DEBIT_CARD: 'Cartão de Débito',
    CASH: 'Dinheiro em Espécie',
    CLUB_PLAN: 'Plano Club Ferraz',
  };

  completedApts.forEach((apt) => {
    const method = apt.paymentMethod || (apt.priceCharged === 0 && apt.clubBenefitUsed ? 'CLUB_PLAN' : 'PIX');
    if (!paymentTotalsMap[method]) {
      paymentTotalsMap[method] = { total: 0, count: 0 };
    }
    paymentTotalsMap[method].total += apt.priceCharged || 0;
    paymentTotalsMap[method].count += 1;
  });

  const paymentMethods = Object.entries(paymentTotalsMap)
    .filter(([_, data]) => data.count > 0 || totalRevenue === 0)
    .map(([method, data]) => ({
      method: method as any,
      label: paymentMethodLabels[method] || method,
      total: Number(data.total.toFixed(2)),
      count: data.count,
      percentage: totalRevenue > 0 ? Number(((data.total / totalRevenue) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const totalExpenses = 0;
  const realNetProfit = Number((shopNetRevenue - totalExpenses).toFixed(2));

  const serviceStatsMap: Record<string, { serviceName: string; revenue: number; count: number }> = {};
  for (const apt of completedApts) {
    if (!serviceStatsMap[apt.serviceId]) {
      serviceStatsMap[apt.serviceId] = {
        serviceName: apt.serviceName,
        revenue: 0,
        count: 0,
      };
    }
    serviceStatsMap[apt.serviceId].revenue += apt.priceCharged || 0;
    serviceStatsMap[apt.serviceId].count += 1;
  }

  const services = Object.entries(serviceStatsMap).map(([serviceId, data]) => ({
    serviceId,
    serviceName: data.serviceName,
    revenue: data.revenue,
    count: data.count,
  }));

  return {
    period,
    startDate,
    endDate,
    totalRevenue,
    totalAppointments,
    averageTicket,
    totalCommissions,
    shopNetRevenue,
    totalExpenses,
    realNetProfit,
    paymentMethods,
    barbers,
    services,
    cancellationsCount,
    noShowCount,
    expensesByCategory: [],
  };
}

/**
 * Calculate dashboard operational metrics using a repository
 */
export async function getDashboardMetricsWithRepo(
  repo: IDataRepository,
  filterBarberId?: string
): Promise<DashboardMetrics> {
  const { todayStr } = getOperationDateTime();
  let allApts = await repo.getAppointments();
  if (filterBarberId) {
    allApts = allApts.filter((a) => a.barberId === filterBarberId);
  }

  const todayApts = allApts.filter((a) => a.date === todayStr);
  const todayCompleted = todayApts.filter((a) => a.status === 'COMPLETED');
  const todayRevenue = todayCompleted.reduce((sum, a) => sum + (a.priceCharged || 0), 0);
  const todayAverageTicket =
    todayCompleted.length > 0 ? Number((todayRevenue / todayCompleted.length).toFixed(2)) : 0;

  const todayCancellationsCount = todayApts.filter((a) => a.status === 'CANCELLED').length;
  const todayNoShowCount = todayApts.filter((a) => a.status === 'NO_SHOW').length;

  const allBarbers = await repo.getBarbers();
  const barbersList = filterBarberId ? allBarbers.filter((b) => b.id === filterBarberId) : allBarbers;
  const barberTodayRevenue = barbersList.map((b) => {
    const bCompleted = todayCompleted.filter((a) => a.barberId === b.id);
    return {
      barberId: b.id,
      barberName: b.name,
      revenue: bCompleted.reduce((sum, a) => sum + (a.priceCharged || 0), 0),
      completedCount: bCompleted.length,
    };
  });

  const upcomingAppointments = todayApts
    .filter((a) => a.status === 'CONFIRMED' || a.status === 'IN_PROGRESS')
    .sort((a, b) => a.time.localeCompare(b.time));

  const rawCustomers = await repo.getCustomers();
  const customers = await Promise.all(rawCustomers.map((c) => enrichCustomerDataWithRepo(repo, c)));
  const returnNeededCount = customers.filter((c) => c.status === 'RETURN_NEEDED').length;

  const newCustomersCount = customers.filter(
    (c) => c.totalVisits <= 1 || (c.createdAt && c.createdAt.startsWith(todayStr))
  ).length;

  const completedApts = allApts.filter((a) => a.status === 'COMPLETED');
  const serviceCountMap: Record<string, number> = {};
  for (const apt of completedApts) {
    serviceCountMap[apt.serviceName] = (serviceCountMap[apt.serviceName] || 0) + 1;
  }
  const popularServices = Object.entries(serviceCountMap)
    .map(([serviceName, count]) => ({ serviceName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    todayAppointmentsCount: todayApts.length,
    todayCompletedCount: todayCompleted.length,
    todayRevenue,
    todayAverageTicket,
    todayCancellationsCount,
    todayNoShowCount,
    returnNeededCount,
    newCustomersCount,
    barberTodayRevenue,
    upcomingAppointments,
    popularServices,
  };
}
