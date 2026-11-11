import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Customer, Appointment, AppointmentStatus, PaymentMethod } from '../types/index.js';

// Get environment variables safely from Vite import.meta.env or Node process.env
const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;

const supabaseUrl =
  metaEnv?.VITE_SUPABASE_URL ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  '';

const supabaseAnonKey =
  metaEnv?.VITE_SUPABASE_ANON_KEY ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('your-project')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

// Helper to sanitize and resolve table names (prefers 'clientes' and 'agendamentos')
const TABLE_CLIENTES = 'clientes';
const TABLE_AGENDAMENTOS = 'agendamentos';

// --- DATA MAPPERS ---

export function supabaseRowToCustomer(row: Record<string, any>): Customer {
  const membership =
    typeof row.membership === 'string'
      ? (() => {
          try {
            return JSON.parse(row.membership);
          } catch {
            return undefined;
          }
        })()
      : row.membership || row.plano || undefined;

  return {
    id: String(row.id),
    name: String(row.nome || row.name || 'Cliente'),
    whatsapp: String(row.whatsapp || row.telefone || row.phone || ''),
    email: row.email || undefined,
    birthDate: row.data_nascimento || row.birth_date || row.birthDate || undefined,
    notes: row.observacoes || row.notes || undefined,
    membership,
    isBlockedFromOnlineBooking: Boolean(
      row.is_blocked || row.isBlockedFromOnlineBooking || row.bloqueado
    ),
    blockedReason: row.blocked_reason || row.blockedReason || row.motivo_bloqueio || undefined,
    totalVisits: Number(row.total_visitas ?? row.totalVisits ?? row.total_visits ?? 0),
    totalSpent: Number(row.total_gasto ?? row.totalSpent ?? row.total_spent ?? 0),
    lastVisit: row.last_visit || row.lastVisit || row.ultima_visita || undefined,
    status: (row.status as any) || 'ACTIVE',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

export function supabaseRowToAppointment(row: Record<string, any>): Appointment {
  const priceCharged = Number(
    row.price_charged ?? row.priceCharged ?? row.valor_cobrado ?? row.preco ?? 0
  );
  const status = (row.status as AppointmentStatus) || 'CONFIRMED';
  const rawRate = row.commission_rate ?? row.commissionRate;
  const commissionRate = rawRate !== undefined && rawRate !== null ? Number(rawRate) : 50;
  const computedCommAmt = Math.round(((priceCharged * commissionRate) / 100) * 100) / 100;
  const computedShopAmt = Math.round((priceCharged - computedCommAmt) * 100) / 100;

  const commissionAmount =
    row.commission_amount !== undefined && row.commission_amount !== null
      ? Number(row.commission_amount)
      : row.commissionAmount !== undefined && row.commissionAmount !== null
      ? Number(row.commissionAmount)
      : status === 'COMPLETED'
      ? computedCommAmt
      : undefined;

  const shopAmount =
    row.shop_amount !== undefined && row.shop_amount !== null
      ? Number(row.shop_amount)
      : row.shopAmount !== undefined && row.shopAmount !== null
      ? Number(row.shopAmount)
      : status === 'COMPLETED'
      ? computedShopAmt
      : undefined;

  return {
      id: String(row.id),
      customerId: String(row.customer_id || row.customerId || row.cliente_id || ''),
      customerName: String(
        row.customer_name || row.customerName || row.cliente_nome || row.nome || 'Cliente'
      ),
      customerWhatsapp: String(
        row.customer_whatsapp || row.customerWhatsapp || row.cliente_whatsapp || row.whatsapp || ''
      ),
      serviceId: String(row.service_id || row.serviceId || row.servico_id || 'srv_corte_fade'),
      serviceName: String(
        row.service_name || row.serviceName || row.servico_nome || 'Corte Degradê / Fade'
      ),
      barberId: String(row.barber_id || row.barberId || row.barbeiro_id || 'barber_cadeira_01'),
      barberName: String(
        row.barber_name || row.barberName || row.barbeiro_nome || 'Lukinha'
      ),
      date: String(row.date || row.data || ''),
      time: String(row.time || row.horario || row.hora || ''),
      durationMinutes: Number(
        row.duration_minutes || row.durationMinutes || row.duracao_minutos || 45
      ),
      priceCharged,
      status,
      paymentMethod: (row.payment_method || row.paymentMethod || row.forma_pagamento) as
        | PaymentMethod
        | undefined,
      commissionRate,
      commissionAmount,
      shopAmount,
      notes: row.notes || row.observacoes || undefined,
      isFitIn: Boolean(row.is_fit_in ?? row.isFitIn ?? row.encaixe),
      source: row.source || row.origem || 'INTERNAL_APP',
      clubBenefitUsed: row.club_benefit_used || row.clubBenefitUsed || undefined,
      completedAt: row.completed_at || row.completedAt || undefined,
      cancelledAt: row.cancelled_at || row.cancelledAt || undefined,
      createdAt: row.created_at || row.createdAt || new Date().toISOString(),
      updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
    };
  }

/**
 * Executes a resilient Supabase query that automatically detects whether
 * table columns are in Portuguese ('nome', 'observacoes') or English ('name', 'notes'),
 * removing any non-existent columns automatically so inserts/updates never crash.
 */
async function resilientMutation(
  table: string,
  payload: Record<string, any>,
  matchId?: string
): Promise<any> {
  if (!supabase) throw new Error('Cliente Supabase não inicializado.');

  const cleanPayload = { ...payload };

  for (let attempt = 0; attempt < 8; attempt++) {
    let query;
    if (matchId) {
      query = supabase.from(table).update(cleanPayload).eq('id', matchId).select();
    } else {
      query = supabase.from(table).insert(cleanPayload).select();
    }

    const { data, error } = await query;
    if (!error) {
      return data?.[0] || cleanPayload;
    }

    // Check PostgreSQL error messages for missing column
    const missingCol =
      error.message?.match(/column "([^"]+)" of relation "[^"]+" does not exist/i)?.[1] ||
      error.message?.match(/Could not find the '([^']+)' column/i)?.[1] ||
      error.message?.match(/'([^']+)' column does not exist/i)?.[1];

    if (missingCol && missingCol in cleanPayload) {
      delete cleanPayload[missingCol];
      continue;
    }

    // If table itself is named 'customers' instead of 'clientes', retry with fallback
    if (error.message?.includes('relation "clientes" does not exist') && table === 'clientes') {
      return resilientMutation('customers', payload, matchId);
    }
    if (error.message?.includes('relation "agendamentos" does not exist') && table === 'agendamentos') {
      return resilientMutation('appointments', payload, matchId);
    }

    throw new Error(error.message || `Erro no Supabase (${table})`);
  }

  throw new Error(`Excesso de tentativas ao gravar em ${table}`);
}

// --- SUPABASE ASYNC REPOSITORY METHODS ---

export const supabaseApi = {
  // 1. CLIENTES (CUSTOMERS)
  async getCustomers(search?: string): Promise<Customer[]> {
    if (!supabase) return [];

    let query = supabase.from(TABLE_CLIENTES).select('*');

    const { data, error } = await query;
    if (error) {
      // If table 'clientes' was not found, try fallback table 'customers'
      if (error.message?.includes('does not exist')) {
        const fallback = await supabase.from('customers').select('*');
        if (!fallback.error && fallback.data) {
          return filterAndMapCustomers(fallback.data, search);
        }
      }
      console.warn('Erro ao listar clientes no Supabase:', error.message);
      return [];
    }

    return filterAndMapCustomers(data || [], search);
  },

  async getCustomerById(id: string): Promise<(Customer & { appointments: Appointment[] }) | null> {
    if (!supabase) return null;

    let res = await supabase.from(TABLE_CLIENTES).select('*').eq('id', id).maybeSingle();
    if (res.error && res.error.message?.includes('does not exist')) {
      res = await supabase.from('customers').select('*').eq('id', id).maybeSingle();
    }

    if (!res.data) return null;

    const customer = supabaseRowToCustomer(res.data);

    // Fetch customer's appointments directly from 'agendamentos'
    let aptsRes = await supabase
      .from(TABLE_AGENDAMENTOS)
      .select('*')
      .or(`customer_id.eq.${id},customerId.eq.${id},cliente_id.eq.${id}`);

    if (aptsRes.error && aptsRes.error.message?.includes('does not exist')) {
      aptsRes = await supabase.from('appointments').select('*').eq('customerId', id);
    }

    const appointments = (aptsRes.data || []).map(supabaseRowToAppointment);
    appointments.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

    return {
      ...customer,
      appointments,
    };
  },

  async createCustomer(customer: Partial<Customer>): Promise<Customer> {
    const id = customer.id || `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const cleanWhatsapp = (customer.whatsapp || '').replace(/\D/g, '');

    const candidateRow: Record<string, any> = {
      id,
      nome: customer.name?.trim(),
      name: customer.name?.trim(),
      whatsapp: cleanWhatsapp,
      telefone: cleanWhatsapp,
      email: customer.email?.trim() || null,
      data_nascimento: customer.birthDate || null,
      birth_date: customer.birthDate || null,
      birthDate: customer.birthDate || null,
      observacoes: customer.notes?.trim() || null,
      notes: customer.notes?.trim() || null,
      status: customer.status || 'ACTIVE',
      membership: customer.membership || null,
      is_blocked: Boolean(customer.isBlockedFromOnlineBooking),
      isBlockedFromOnlineBooking: Boolean(customer.isBlockedFromOnlineBooking),
      blocked_reason: customer.blockedReason || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const savedRow = await resilientMutation(TABLE_CLIENTES, candidateRow);
    return supabaseRowToCustomer(savedRow);
  },

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    const candidateRow: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) {
      candidateRow.nome = updates.name.trim();
      candidateRow.name = updates.name.trim();
    }
    if (updates.whatsapp !== undefined) {
      const clean = updates.whatsapp.replace(/\D/g, '');
      candidateRow.whatsapp = clean;
      candidateRow.telefone = clean;
    }
    if (updates.email !== undefined) candidateRow.email = updates.email?.trim() || null;
    if (updates.birthDate !== undefined) {
      candidateRow.data_nascimento = updates.birthDate || null;
      candidateRow.birth_date = updates.birthDate || null;
      candidateRow.birthDate = updates.birthDate || null;
    }
    if (updates.notes !== undefined) {
      candidateRow.observacoes = updates.notes?.trim() || null;
      candidateRow.notes = updates.notes?.trim() || null;
    }
    if (updates.status !== undefined) candidateRow.status = updates.status;
    if (updates.membership !== undefined) candidateRow.membership = updates.membership;
    if (updates.isBlockedFromOnlineBooking !== undefined) {
      candidateRow.is_blocked = updates.isBlockedFromOnlineBooking;
      candidateRow.isBlockedFromOnlineBooking = updates.isBlockedFromOnlineBooking;
    }
    if (updates.blockedReason !== undefined) {
      candidateRow.blocked_reason = updates.blockedReason;
    }

    const savedRow = await resilientMutation(TABLE_CLIENTES, candidateRow, id);
    return supabaseRowToCustomer(savedRow);
  },

  async deleteCustomer(id: string): Promise<boolean> {
    if (!supabase) return false;
    let res = await supabase.from(TABLE_CLIENTES).delete().eq('id', id);
    if (res.error && res.error.message?.includes('does not exist')) {
      res = await supabase.from('customers').delete().eq('id', id);
    }
    return !res.error;
  },

  // 2. AGENDAMENTOS (APPOINTMENTS)
  async getAppointments(filters?: {
    date?: string;
    barberId?: string;
    customerId?: string;
    status?: string;
  }): Promise<Appointment[]> {
    if (!supabase) return [];

    let query = supabase.from(TABLE_AGENDAMENTOS).select('*');

    if (filters?.date) {
      query = query.or(`date.eq.${filters.date},data.eq.${filters.date}`);
    }
    if (filters?.barberId) {
      query = query.or(
        `barber_id.eq.${filters.barberId},barberId.eq.${filters.barberId},barbeiro_id.eq.${filters.barberId}`
      );
    }
    if (filters?.customerId) {
      query = query.or(
        `customer_id.eq.${filters.customerId},customerId.eq.${filters.customerId},cliente_id.eq.${filters.customerId}`
      );
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) {
      if (error.message?.includes('does not exist')) {
        let fallbackQuery = supabase.from('appointments').select('*');
        if (filters?.date) fallbackQuery = fallbackQuery.eq('date', filters.date);
        if (filters?.barberId) fallbackQuery = fallbackQuery.eq('barberId', filters.barberId);
        if (filters?.customerId) fallbackQuery = fallbackQuery.eq('customerId', filters.customerId);
        if (filters?.status) fallbackQuery = fallbackQuery.eq('status', filters.status);
        const fbRes = await fallbackQuery;
        if (!fbRes.error && fbRes.data) {
          return fbRes.data.map(supabaseRowToAppointment);
        }
      }
      console.warn('Erro ao listar agendamentos no Supabase:', error.message);
      return [];
    }

    const list = (data || []).map(supabaseRowToAppointment);
    list.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    return list;
  },

  async createAppointment(apt: Partial<Appointment>): Promise<Appointment> {
    const id = apt.id || `apt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const candidateRow: Record<string, any> = {
      id,
      customer_id: apt.customerId,
      customerId: apt.customerId,
      cliente_id: apt.customerId,
      customer_name: apt.customerName,
      customerName: apt.customerName,
      cliente_nome: apt.customerName,
      customer_whatsapp: apt.customerWhatsapp,
      customerWhatsapp: apt.customerWhatsapp,
      cliente_whatsapp: apt.customerWhatsapp,
      service_id: apt.serviceId,
      serviceId: apt.serviceId,
      servico_id: apt.serviceId,
      service_name: apt.serviceName,
      serviceName: apt.serviceName,
      servico_nome: apt.serviceName,
      barber_id: apt.barberId,
      barberId: apt.barberId,
      barbeiro_id: apt.barberId,
      barber_name: apt.barberName,
      barberName: apt.barberName,
      barbeiro_nome: apt.barberName,
      date: apt.date,
      data: apt.date,
      time: apt.time,
      horario: apt.time,
      hora: apt.time,
      duration_minutes: apt.durationMinutes || 45,
      durationMinutes: apt.durationMinutes || 45,
      duracao_minutos: apt.durationMinutes || 45,
      price_charged: apt.priceCharged ?? 0,
      priceCharged: apt.priceCharged ?? 0,
      valor_cobrado: apt.priceCharged ?? 0,
      preco: apt.priceCharged ?? 0,
      status: apt.status || 'CONFIRMED',
      payment_method: apt.paymentMethod || null,
      paymentMethod: apt.paymentMethod || null,
      forma_pagamento: apt.paymentMethod || null,
      commission_rate: apt.commissionRate ?? 50,
      commissionRate: apt.commissionRate ?? 50,
      commission_amount: apt.commissionAmount ?? 0,
      commissionAmount: apt.commissionAmount ?? 0,
      shop_amount: apt.shopAmount ?? 0,
      shopAmount: apt.shopAmount ?? 0,
      notes: apt.notes || null,
      observacoes: apt.notes || null,
      is_fit_in: Boolean(apt.isFitIn),
      isFitIn: Boolean(apt.isFitIn),
      source: apt.source || 'INTERNAL_APP',
      club_benefit_used: apt.clubBenefitUsed || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const savedRow = await resilientMutation(TABLE_AGENDAMENTOS, candidateRow);
    return supabaseRowToAppointment(savedRow);
  },

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment> {
    const candidateRow: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.status !== undefined) candidateRow.status = updates.status;
    if (updates.date !== undefined) {
      candidateRow.date = updates.date;
      candidateRow.data = updates.date;
    }
    if (updates.time !== undefined) {
      candidateRow.time = updates.time;
      candidateRow.horario = updates.time;
      candidateRow.hora = updates.time;
    }
    if (updates.barberId !== undefined) {
      candidateRow.barber_id = updates.barberId;
      candidateRow.barberId = updates.barberId;
      candidateRow.barbeiro_id = updates.barberId;
    }
    if (updates.barberName !== undefined) {
      candidateRow.barber_name = updates.barberName;
      candidateRow.barberName = updates.barberName;
      candidateRow.barbeiro_nome = updates.barberName;
    }
    if (updates.serviceId !== undefined) {
      candidateRow.service_id = updates.serviceId;
      candidateRow.serviceId = updates.serviceId;
      candidateRow.servico_id = updates.serviceId;
    }
    if (updates.serviceName !== undefined) {
      candidateRow.service_name = updates.serviceName;
      candidateRow.serviceName = updates.serviceName;
      candidateRow.servico_nome = updates.serviceName;
    }
    if (updates.durationMinutes !== undefined) {
      candidateRow.duration_minutes = updates.durationMinutes;
      candidateRow.durationMinutes = updates.durationMinutes;
      candidateRow.duracao_minutos = updates.durationMinutes;
    }
    if (updates.priceCharged !== undefined) {
      candidateRow.price_charged = updates.priceCharged;
      candidateRow.priceCharged = updates.priceCharged;
      candidateRow.valor_cobrado = updates.priceCharged;
      candidateRow.preco = updates.priceCharged;
    }
    if (updates.paymentMethod !== undefined) {
      candidateRow.payment_method = updates.paymentMethod;
      candidateRow.paymentMethod = updates.paymentMethod;
      candidateRow.forma_pagamento = updates.paymentMethod;
    }
    if (updates.commissionRate !== undefined) {
      candidateRow.commission_rate = updates.commissionRate;
      candidateRow.commissionRate = updates.commissionRate;
    }
    if (updates.commissionAmount !== undefined) {
      candidateRow.commission_amount = updates.commissionAmount;
      candidateRow.commissionAmount = updates.commissionAmount;
    } else if (updates.priceCharged !== undefined) {
      const price = Number(updates.priceCharged);
      const rate = Number(updates.commissionRate ?? candidateRow.commission_rate ?? 50);
      const comm = Math.round(((price * rate) / 100) * 100) / 100;
      candidateRow.commission_amount = comm;
      candidateRow.commissionAmount = comm;
    }
    if (updates.shopAmount !== undefined) {
      candidateRow.shop_amount = updates.shopAmount;
      candidateRow.shopAmount = updates.shopAmount;
    } else if (updates.priceCharged !== undefined && candidateRow.commission_amount !== undefined) {
      const price = Number(updates.priceCharged);
      candidateRow.shop_amount = Math.round((price - candidateRow.commission_amount) * 100) / 100;
      candidateRow.shopAmount = candidateRow.shop_amount;
    }
    if (updates.notes !== undefined) {
      candidateRow.notes = updates.notes;
      candidateRow.observacoes = updates.notes;
    }
    if (updates.clubBenefitUsed !== undefined) {
      candidateRow.club_benefit_used = updates.clubBenefitUsed;
    }
    if (updates.completedAt !== undefined) {
      candidateRow.completed_at = updates.completedAt;
    }
    if (updates.cancelledAt !== undefined) {
      candidateRow.cancelled_at = updates.cancelledAt;
    }

    const savedRow = await resilientMutation(TABLE_AGENDAMENTOS, candidateRow, id);
    return supabaseRowToAppointment(savedRow);
  },

  async deleteAppointment(id: string): Promise<boolean> {
    if (!supabase) return false;
    let res = await supabase.from(TABLE_AGENDAMENTOS).delete().eq('id', id);
    if (res.error && res.error.message?.includes('does not exist')) {
      res = await supabase.from('appointments').delete().eq('id', id);
    }
    return !res.error;
  },
};

function filterAndMapCustomers(data: any[], search?: string): Customer[] {
  let list = data.map(supabaseRowToCustomer);

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    const cleanQ = q.replace(/\D/g, '');
    list = list.filter((c) => {
      const matchName = c.name.toLowerCase().includes(q);
      const matchPhone = cleanQ ? c.whatsapp.includes(cleanQ) : false;
      return matchName || matchPhone;
    });
  }

  return list;
}
