// Shared date and time utilities for Ferraz Barber Club operations (America/Sao_Paulo)

export const OPERATION_TIMEZONE = 'America/Sao_Paulo';

export function getOperationDateTime(tz: string = OPERATION_TIMEZONE): {
  todayStr: string;
  nowMinutes: number;
  nowTimeStr: string;
  formattedDate: string;
} {
  const now = new Date();

  // YYYY-MM-DD in America/Sao_Paulo
  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  // HH:mm in America/Sao_Paulo
  const nowTimeStr = new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);

  // Formatted date for human display (ex: 'Ter, 03/11')
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(now);

  const [h, m] = nowTimeStr.split(':').map(Number);
  const nowMinutes = (h || 0) * 60 + (m || 0);

  return { todayStr, nowMinutes, nowTimeStr, formattedDate };
}

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function isPastDateTime(
  dateStr: string,
  timeStr: string,
  tz: string = OPERATION_TIMEZONE
): { isPast: boolean; reason?: string } {
  const { todayStr, nowMinutes, nowTimeStr } = getOperationDateTime(tz);

  if (dateStr < todayStr) {
    return {
      isPast: true,
      reason: 'Esta data já passou.',
    };
  }

  if (dateStr === todayStr) {
    const slotMin = timeToMinutes(timeStr);
    if (slotMin <= nowMinutes) {
      return {
        isPast: true,
        reason: `Horário ultrapassado. Agora são ${nowTimeStr}; selecione um horário futuro.`,
      };
    }
  }

  return { isPast: false };
}
