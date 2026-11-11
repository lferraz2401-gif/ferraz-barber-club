export type UserRole = 'ADMIN' | 'BARBER';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  barberId?: string; // If role is BARBER, points to Lukinha or Maykin
  avatarUrl?: string;
  pinCode?: string; // Legacy fallback PIN
  passwordHash?: string; // PBKDF2 / SHA-256 secure hash
  passwordSalt?: string;
  createdAt?: string;
}

export type AppointmentStatus =
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'CANCELLED';

export type ClubPlanTier = 'STANDARD' | 'PLUS' | 'PRO';

export interface ClubCredits {
  haircutsTotal: number;
  haircutsUsed: number;
  eyebrowsTotal: number;
  eyebrowsUsed: number;
  beardsTotal: number;
  beardsUsed: number;
  skinCareTotal: number;
  skinCareUsed: number;
  pomadeGiftTotal: number;
  pomadeGiftClaimed: boolean;
}

export interface ClubMembership {
  tier: ClubPlanTier;
  startDate: string; // YYYY-MM-DD
  renewsAt: string; // YYYY-MM-DD
  active: boolean;
  credits: ClubCredits;
}

export interface Customer {
  id: string;
  name: string;
  whatsapp: string;
  email?: string;
  birthDate?: string;
  notes?: string;
  membership?: ClubMembership; // Club Ferraz Subscription
  isBlockedFromOnlineBooking?: boolean; // Bloqueio por "Histórico Sujo" (2+ No-Shows)
  blockedReason?: string;
  createdAt: string;
  updatedAt: string;
  // Computed on fetch
  lastVisit?: string;
  totalVisits: number;
  totalSpent: number;
  noShowCount?: number; // Total de faltas não justificadas (No-Show)
  consecutiveNoShows?: number; // Faltas consecutivas recentes
  avgFrequencyDays?: number;
  averageTicket?: number;
  preferredServiceName?: string;
  preferredBarberId?: string;
  preferredBarberName?: string;
  status: 'ACTIVE' | 'RETURN_NEEDED' | 'INACTIVE';
}
export type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'CLUB_PLAN';

export interface DaySchedule {
  active: boolean; // se atende neste dia
  startTime: string; // "09:00"
  endTime: string; // "20:00"
  lunchStart?: string; // "12:00"
  lunchEnd?: string; // "13:00"
}

export interface Barber {
  id: string;
  name: string;
  nickname: string;
  phone: string;
  active: boolean;
  avatarUrl?: string;
  specialty?: string;
  description?: string;
  color: string; // for calendar distinction
  workDays: number[]; // 0=Sunday, 1=Monday... 6=Saturday
  startTime: string; // "09:00"
  endTime: string; // "20:00"
  lunchStart: string; // "12:00"
  lunchEnd: string; // "13:00"
  defaultCommissionRate?: number; // e.g. 50 (50%)
  dailySchedule?: Record<number, DaySchedule>; // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
}


export interface Service {
  id: string;
  name: string;
  description: string;
  price: number; // Current active price
  durationMinutes: number; // e.g. 30, 45, 60
  active: boolean;
  featured: boolean;
  defaultCommissionRate?: number; // Optional service-specific commission rate override (%)
}

export type AppointmentSource =
  | 'INTERNAL_APP'
  | 'PUBLIC_BOOKING'
  | 'INSTAGRAM'
  | 'WHATSAPP'
  | 'PAID_TRAFFIC'
  | 'CRM'
  | 'REFERRAL';

export interface Appointment {
  id: string;
  customerId: string;
  customerName: string;
  customerWhatsapp: string;
  serviceId: string;
  serviceName: string;
  barberId: string;
  barberName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMinutes: number; // real service duration
  priceCharged: number; // FROZEN historical price at creation/completion
  status: AppointmentStatus;
  paymentMethod?: PaymentMethod; // PIX, CREDIT_CARD, DEBIT_CARD, CASH, CLUB_PLAN
  commissionRate?: number; // Commission % at time of checkout (e.g. 50)
  commissionAmount?: number; // Value in R$ to be paid to the barber
  shopAmount?: number; // Value in R$ retained by the barbershop
  notes?: string;
  isFitIn?: boolean; // Encaixe manual administrativo
  source?: AppointmentSource;
  clubBenefitUsed?:
    | 'haircut'
    | 'beard'
    | 'eyebrow'
    | 'skincare'
    | 'combo_haircut_beard'
    | 'combo_complete'; // Benefit tracked from Club Ferraz
  completedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ExpenseCategory =
  | 'FIXED' // Custos Fixos (Aluguel, Luz, Água, Internet)
  | 'VARIABLE' // Custos Variáveis
  | 'HYGIENE_PRODUCTS' // Produtos de Higiene, Navalhas, Lâminas, Toalhas
  | 'EQUIPMENT' // Manutenção de Máquinas e Equipamentos
  | 'MARKETING' // Tráfego Pago, Fotos, Uniformes
  | 'OTHER';

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string; // YYYY-MM-DD
  paymentMethod?: 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'BOLETO';
  barberId?: string; // Optional: If the cost is specific to a chair/barber
  notes?: string;
  createdAt: string;
}

export type BlockType = 'OFF_DAY' | 'VACATION' | 'TIME_BLOCK' | 'SHOP_RECESS';

export interface ScheduleBlock {
  id: string;
  type: BlockType;
  barberId?: string; // If undefined, applies to entire barbershop
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime?: string; // HH:mm (optional, for specific time slot)
  endTime?: string; // HH:mm
  reason: string;
  createdAt: string;
}

export interface WhatsappTemplates {
  confirmation: string;
  reminder: string;
  completed: string;
  returnInvite: string;
  inactiveClient: string;
  cancellation: string;
  direct?: string;
}

export interface ShopSettings {
  shopName: string;
  conceptTagline: string;
  brandConcept?: string;
  logoUrl?: string;
  phone?: string;
  address?: string;
  openTime: string; // "09:00"
  closeTime: string; // "20:00"
  operatingDays: number[]; // e.g. [1, 2, 3, 4, 5, 6] (Mon-Sat)
  minAdvanceHours: number; // e.g. 1 hour
  minNoticeMinutes?: number; // e.g. 30 minutes
  maxFutureDays: number; // e.g. 30 days
  allowSameDay: boolean;
  cancellationNoticeHours: number; // e.g. 2 hours
  cancelMinHours?: number; // alias
  bufferMinutes?: number; // Margem pós-corte para higienizar bancada e receber (default: 15 min)
  allowAdminFitIn: boolean; // Encaixe manual administrativo
  isClubActive?: boolean; // Ativação e desativação master do Club Ferraz
  whatsappTemplates?: WhatsappTemplates;
  whatsapp?: {
    messages?: Partial<WhatsappTemplates>;
  };
}

export type FinancialPeriod = 'today' | 'week' | 'month' | 'custom';

export interface FinancialStats {
  period: FinancialPeriod;
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalAppointments: number;
  averageTicket: number;
  totalCommissions: number; // Valor total a ser repassado aos barbeiros
  shopNetRevenue: number; // Receita retida pela barbearia pós-comissões
  totalExpenses: number; // Total de despesas lançadas no período
  realNetProfit: number; // Lucro líquido real (Receita Barbearia - Despesas)
  paymentMethods: {
    method: PaymentMethod;
    label: string;
    total: number;
    count: number;
    percentage: number;
  }[];
  barbers: {
    barberId: string;
    barberName: string;
    revenue: number;
    appointmentsCount: number;
    averageTicket: number;
    commissionRate: number; // Porcentagem padrão
    commissionAmount: number; // Valor líquido a ser repassado ao barbeiro
    shopAmount: number; // Valor líquido que fica para o salão
  }[];
  services: {
    serviceId: string;
    serviceName: string;
    revenue: number;
    count: number;
  }[];
  cancellationsCount: number;
  noShowCount: number;
  expensesByCategory: {
    category: ExpenseCategory;
    label: string;
    total: number;
    count: number;
  }[];
}

export interface DashboardMetrics {
  todayAppointmentsCount: number;
  todayCompletedCount: number;
  todayRevenue: number;
  todayAverageTicket: number;
  todayCancellationsCount: number;
  todayNoShowCount: number;
  returnNeededCount: number;
  newCustomersCount: number;
  barberTodayRevenue: {
    barberId: string;
    barberName: string;
    revenue: number;
    completedCount: number;
  }[];
  upcomingAppointments: Appointment[];
  popularServices: {
    serviceName: string;
    count: number;
  }[];
}
