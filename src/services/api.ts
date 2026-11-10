import {
  Customer,
  Barber,
  Service,
  Appointment,
  ScheduleBlock,
  ShopSettings,
  UserProfile,
  FinancialStats,
  FinancialPeriod,
  DashboardMetrics,
  Expense,
} from '../types/index.js';

const API_BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Erro HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  // Dashboard & Financial
  async getDashboard(barberId?: string): Promise<DashboardMetrics> {
    const url = barberId ? `${API_BASE}/dashboard?barberId=${encodeURIComponent(barberId)}` : `${API_BASE}/dashboard`;
    const res = await fetch(url);
    return handleResponse<DashboardMetrics>(res);
  },

  async getFinancial(
    period: FinancialPeriod,
    startDate?: string,
    endDate?: string,
    barberId?: string
  ): Promise<FinancialStats> {
    const params = new URLSearchParams({ period });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (barberId) params.append('barberId', barberId);
    const res = await fetch(`${API_BASE}/financial?${params.toString()}`);
    return handleResponse<FinancialStats>(res);
  },

  // Expenses & Cash Flow
  async getExpenses(params?: {
    startDate?: string;
    endDate?: string;
    category?: string;
    barberId?: string;
  }): Promise<Expense[]> {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.barberId) searchParams.append('barberId', params.barberId);
    const query = searchParams.toString();
    const res = await fetch(`${API_BASE}/expenses${query ? `?${query}` : ''}`);
    return handleResponse<Expense[]>(res);
  },

  async createExpense(data: {
    title: string;
    category: string;
    amount: number;
    date: string;
    paymentMethod?: string;
    barberId?: string;
    notes?: string;
  }): Promise<Expense> {
    const res = await fetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Expense>(res);
  },

  async deleteExpense(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/expenses/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  // Customers & CRM
  async getCustomers(search?: string): Promise<Customer[]> {
    const url = search ? `${API_BASE}/customers?search=${encodeURIComponent(search)}` : `${API_BASE}/customers`;
    const res = await fetch(url);
    return handleResponse<Customer[]>(res);
  },

  async getCustomerById(id: string): Promise<Customer & { appointments: Appointment[] }> {
    const res = await fetch(`${API_BASE}/customers/${id}`);
    return handleResponse<Customer & { appointments: Appointment[] }>(res);
  },

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Customer>(res);
  },

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Customer>(res);
  },

  async deleteCustomer(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/customers/${id}`, { method: 'DELETE' });
    return handleResponse<{ message: string }>(res);
  },

  // Club Ferraz Membership
  async setCustomerMembership(
    customerId: string,
    tier: 'STANDARD' | 'PLUS' | 'PRO',
    customStartDate?: string
  ): Promise<Customer> {
    const res = await fetch(`${API_BASE}/customers/${customerId}/membership`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier, customStartDate }),
    });
    return handleResponse<Customer>(res);
  },

  async removeCustomerMembership(customerId: string): Promise<Customer> {
    const res = await fetch(`${API_BASE}/customers/${customerId}/membership`, {
      method: 'DELETE',
    });
    return handleResponse<Customer>(res);
  },

  async updateCustomerMembership(
    customerId: string,
    patch: { credits?: any; active?: boolean; renewsAt?: string }
  ): Promise<Customer> {
    const res = await fetch(`${API_BASE}/customers/${customerId}/membership`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    return handleResponse<Customer>(res);
  },

  async getCrmData(): Promise<{
    recent: Customer[];
    returnNeeded: Customer[];
    inactive: Customer[];
    newClients: Customer[];
    totalCount: number;
    returnNeededCount: number;
  }> {
    const res = await fetch(`${API_BASE}/crm`);
    return handleResponse(res);
  },

  // Barbers
  async getBarbers(): Promise<Barber[]> {
    const res = await fetch(`${API_BASE}/barbers`);
    return handleResponse<Barber[]>(res);
  },

  async updateBarber(id: string, data: Partial<Barber>): Promise<Barber> {
    const res = await fetch(`${API_BASE}/barbers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Barber>(res);
  },

  async createBarber(data: Partial<Barber>): Promise<Barber> {
    const res = await fetch(`${API_BASE}/barbers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Barber>(res);
  },

  // Services
  async getServices(): Promise<Service[]> {
    const res = await fetch(`${API_BASE}/services`);
    return handleResponse<Service[]>(res);
  },

  async createService(data: Partial<Service>): Promise<Service> {
    const res = await fetch(`${API_BASE}/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Service>(res);
  },

  async updateService(id: string, data: Partial<Service>): Promise<Service> {
    const res = await fetch(`${API_BASE}/services/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Service>(res);
  },

  // Appointments & Availability
  async getAppointments(filters?: {
    date?: string;
    barberId?: string;
    customerId?: string;
    status?: string;
  }): Promise<Appointment[]> {
    const params = new URLSearchParams();
    if (filters?.date) params.append('date', filters.date);
    if (filters?.barberId) params.append('barberId', filters.barberId);
    if (filters?.customerId) params.append('customerId', filters.customerId);
    if (filters?.status) params.append('status', filters.status);

    const res = await fetch(`${API_BASE}/appointments?${params.toString()}`);
    return handleResponse<Appointment[]>(res);
  },

  async getAvailability(
    date: string,
    barberId?: string,
    serviceId?: string,
    durationMinutes?: number
  ): Promise<{ time: string; available: boolean; reason?: string; barberIds?: string[] }[]> {
    const params = new URLSearchParams({ date });
    if (barberId) params.append('barberId', barberId);
    if (serviceId) params.append('serviceId', serviceId);
    if (durationMinutes) params.append('durationMinutes', String(durationMinutes));

    const res = await fetch(`${API_BASE}/availability?${params.toString()}`);
    return handleResponse(res);
  },

  async createAppointment(data: {
    customerId?: string;
    customerName?: string;
    customerWhatsapp?: string;
    serviceId: string;
    serviceName?: string;
    durationMinutes?: number;
    priceCharged?: number;
    barberId: string;
    date: string;
    time: string;
    notes?: string;
    isFitIn?: boolean;
    source?: 'INTERNAL_APP' | 'PUBLIC_BOOKING';
  }): Promise<Appointment> {
    const res = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Appointment>(res);
  },

  async updateAppointment(id: string, data: Partial<Appointment>): Promise<Appointment> {
    const res = await fetch(`${API_BASE}/appointments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Appointment>(res);
  },

  async deleteAppointment(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/appointments/${id}`, { method: 'DELETE' });
    return handleResponse<{ message: string }>(res);
  },

  // Blocks
  async getBlocks(): Promise<ScheduleBlock[]> {
    const res = await fetch(`${API_BASE}/blocks`);
    return handleResponse<ScheduleBlock[]>(res);
  },

  async createBlock(data: Partial<ScheduleBlock>): Promise<ScheduleBlock> {
    const res = await fetch(`${API_BASE}/blocks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<ScheduleBlock>(res);
  },

  async deleteBlock(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/blocks/${id}`, { method: 'DELETE' });
    return handleResponse<{ message: string }>(res);
  },

  // Settings & Users
  async getSettings(): Promise<ShopSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    return handleResponse<ShopSettings>(res);
  },

  async updateSettings(data: Partial<ShopSettings>): Promise<ShopSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<ShopSettings>(res);
  },

  async getUsers(): Promise<UserProfile[]> {
    const res = await fetch(`${API_BASE}/users`);
    return handleResponse<UserProfile[]>(res);
  },

  async createUser(data: { name: string; email: string; password: string; role: 'ADMIN' | 'BARBER'; barberId?: string }): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<UserProfile>(res);
  },

  async updateUser(id: string, data: Partial<{ name: string; email: string; password: string; role: 'ADMIN' | 'BARBER'; barberId?: string }>): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<UserProfile>(res);
  },

  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },
};
