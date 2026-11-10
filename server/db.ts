import fs from 'fs';
import path from 'path';
import {
  Customer,
  Barber,
  Service,
  Appointment,
  ScheduleBlock,
  ShopSettings,
  UserProfile,
  Expense,
} from '../src/types/index.js';
import { IDataRepository } from './repository.js';

interface DatabaseSchema {
  customers: Customer[];
  barbers: Barber[];
  services: Service[];
  appointments: Appointment[];
  blocks: ScheduleBlock[];
  settings: ShopSettings;
  users: UserProfile[];
  expenses: Expense[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const BACKUP_FILE = path.join(DATA_DIR, 'database.backup.json');

const INITIAL_BARBERS: Barber[] = [
  {
    id: 'barber_cadeira_01',
    name: 'Lukinha',
    nickname: 'Lukinha',
    phone: '11987654321',
    active: true,
    color: '#d97706', // Amber gold
    workDays: [1, 2, 3, 4, 5, 6], // Mon - Sat
    startTime: '09:00',
    endTime: '20:00',
    lunchStart: '12:30',
    lunchEnd: '13:30',
    defaultCommissionRate: 50, // 50%
  },
  {
    id: 'barber_cadeira_02',
    name: 'Maykin',
    nickname: 'Maykin',
    phone: '11976543210',
    active: true,
    color: '#0284c7', // Sky blue
    workDays: [1, 2, 3, 4, 5, 6], // Mon - Sat
    startTime: '10:00',
    endTime: '21:00',
    lunchStart: '13:30',
    lunchEnd: '14:30',
    defaultCommissionRate: 50, // 50%
  },
];

const INITIAL_SERVICES: Service[] = [
  {
    id: 'srv_corte_fade',
    name: 'Corte Degradê / Fade',
    description: 'Degradê na régua com acabamento navalhado e finalização profissional com pomada mate.',
    price: 50,
    durationMinutes: 45,
    active: true,
    featured: true,
  },
  {
    id: 'srv_barba_terapia',
    name: 'Barba Terapia Completa',
    description: 'Vapor de ozônio, toalha quente, alinhamento na navalha, massagem facial e óleo hidratante.',
    price: 45,
    durationMinutes: 35,
    active: true,
    featured: true,
  },
  {
    id: 'srv_combo_corte_barba',
    name: 'Combo Cabelo + Barba',
    description: 'Corte completo no estilo com alinhamento de barba e toalha quente aromatizada.',
    price: 85,
    durationMinutes: 60,
    active: true,
    featured: true,
  },
  {
    id: 'srv_pigmentacao',
    name: 'Pigmentação & Alinhamento',
    description: 'Preenchimento e realce do contorno capilar ou barba para máxima definição.',
    price: 40,
    durationMinutes: 30,
    active: true,
    featured: false,
  },
  {
    id: 'srv_nevou',
    name: 'Platinado / Nevou',
    description: 'Descoloração global profissional com matização e tratamento anti-quebra capilar.',
    price: 160,
    durationMinutes: 120,
    active: true,
    featured: false,
  },
  {
    id: 'srv_sobrancelha',
    name: 'Sobrancelha Navalhada',
    description: 'Design e alinhamento milimétrico na lâmina.',
    price: 20,
    durationMinutes: 15,
    active: true,
    featured: false,
  },
];

export const DEFAULT_WHATSAPP_TEMPLATES = {
  confirmation: 'Fala {cliente}! Seu horário na FERRAZ BARBER CLUB está confirmado para {data} às {horario} com {barbeiro} ({servico}). Te aguardamos! 💈',
  reminder: 'Opa {cliente}! Passando pra lembrar do seu corte hoje às {horario} com {barbeiro} na FERRAZ BARBER CLUB. Até já! ✂️',
  completed: 'Fala {cliente}! Valeu pela presença hoje na FERRAZ BARBER CLUB. O corte com {barbeiro} ficou na régua máxima! Qualquer coisa só chamar. Tmj! 🔥',
  returnInvite: 'E aí {cliente}, tudo certo? Já faz um tempo que você não passa aqui na FERRAZ BARBER CLUB. Bora renovar o visual e manter a régua alinhada? ✂️',
  inactiveClient: 'Salve {cliente}! Sentimos sua falta aqui na FERRAZ BARBER CLUB. Tá na hora de alinhar o disfarce! Bora garantir seu horário com {barbeiro}? Responda aqui pra agendar! 👊',
  cancellation: 'Olá {cliente}, seu agendamento para {data} às {horario} na FERRAZ BARBER CLUB foi cancelado. Se desejar reagendar em outro horário, estamos à disposição!',
  direct: 'Fala {cliente}! Tudo bem? Mensagem da equipe FERRAZ BARBER CLUB. Como podemos te ajudar hoje?',
};

const INITIAL_SETTINGS: ShopSettings = {
  shopName: 'FERRAZ BARBER CLUB',
  conceptTagline: 'Da quebrada, para o mundo.',
  brandConcept: 'Da quebrada, para o mundo.',
  logoUrl: '/assets/logo.jpeg',
  phone: '11999998888',
  address: 'Rua Principal da Quebrada, 120 - São Paulo, SP',
  openTime: '09:00',
  closeTime: '21:00',
  operatingDays: [1, 2, 3, 4, 5, 6], // Segunda a Sábado
  minAdvanceHours: 1,
  minNoticeMinutes: 30,
  maxFutureDays: 30,
  allowSameDay: true,
  cancellationNoticeHours: 2,
  cancelMinHours: 2,
  bufferMinutes: 15, // 15 min de intervalo de higienização e recebimento
  allowAdminFitIn: true,
  isClubActive: true,
  whatsappTemplates: DEFAULT_WHATSAPP_TEMPLATES,
  whatsapp: {
    messages: DEFAULT_WHATSAPP_TEMPLATES,
  },
};

const INITIAL_USERS: UserProfile[] = [
  {
    id: 'usr_admin',
    name: 'Administrador (Gerência)',
    email: 'l.ferraz2401@gmail.com',
    role: 'ADMIN',
    pinCode: 'Lu@467396', // Confidential Admin Password
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_cadeira_01',
    name: 'Lukinha',
    role: 'BARBER',
    barberId: 'barber_cadeira_01',
    pinCode: '240178', // Confidential Lukinha Password
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_cadeira_02',
    name: 'Maykin',
    role: 'BARBER',
    barberId: 'barber_cadeira_02',
    pinCode: '221113', // Confidential Maykin Password
    createdAt: new Date().toISOString(),
  },
];

// Clean production state: 0 initial test customers and 0 test appointments
const INITIAL_CUSTOMERS: Customer[] = [];

const INITIAL_APPOINTMENTS: Appointment[] = [];

const INITIAL_BLOCKS: ScheduleBlock[] = [];

export class Database implements IDataRepository {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed: DatabaseSchema = JSON.parse(fileContent);
        // Defensively ensure settings and whatsappTemplates exist without altering existing saved data
        if (!parsed.settings) {
          parsed.settings = INITIAL_SETTINGS;
        } else {
          parsed.settings = {
            ...INITIAL_SETTINGS,
            ...parsed.settings,
            whatsappTemplates: {
              ...DEFAULT_WHATSAPP_TEMPLATES,
              ...(parsed.settings.whatsappTemplates || {}),
            },
          };
        }

        // Defensively ensure user credentials and custom added users are preserved
        if (!parsed.users || parsed.users.length === 0) {
          parsed.users = INITIAL_USERS;
        } else {
          // Keep all existing custom users, and ensure Admin has the exact official email and password
          const existingUsers = parsed.users;
          const adminIndex = existingUsers.findIndex((u) => u.id === 'usr_admin' || u.role === 'ADMIN');
          if (adminIndex >= 0) {
            existingUsers[adminIndex] = {
              ...existingUsers[adminIndex],
              email: 'l.ferraz2401@gmail.com',
              pinCode: 'Lu@467396',
              role: 'ADMIN',
              name: existingUsers[adminIndex].name || 'Administrador (Gerência)',
            };
          } else {
            existingUsers.unshift(INITIAL_USERS[0]);
          }

          // Ensure Lukinha & Maykin default entries exist if not present
          INITIAL_USERS.forEach((initU) => {
            if (!existingUsers.some((u) => u.id === initU.id)) {
              existingUsers.push(initU);
            }
          });

          parsed.users = existingUsers;
        }

        if (!parsed.expenses) {
          parsed.expenses = [];
        }

        // Ensure barbers have defaultCommissionRate if not set
        if (parsed.barbers) {
          parsed.barbers = parsed.barbers.map((b) => ({
            ...b,
            defaultCommissionRate: b.defaultCommissionRate ?? 50,
          }));
        }

        return parsed;
      }
    } catch (e) {
      console.error('Error reading database, creating fresh seed:', e);
    }

    const defaultData: DatabaseSchema = {
      customers: INITIAL_CUSTOMERS,
      barbers: INITIAL_BARBERS,
      services: INITIAL_SERVICES,
      appointments: INITIAL_APPOINTMENTS,
      blocks: INITIAL_BLOCKS,
      settings: INITIAL_SETTINGS,
      users: INITIAL_USERS,
      expenses: [],
    };

    this.save(defaultData);
    return defaultData;
  }

  public save(data?: DatabaseSchema) {
    if (data) {
      this.data = data;
    }
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const jsonContent = JSON.stringify(this.data, null, 2);

    // 1. Write the main database file
    fs.writeFileSync(DB_FILE, jsonContent, 'utf-8');

    // 2. Overwrite the backup file (SINGLE overwrite copy - zero bloat, always updated)
    try {
      fs.writeFileSync(BACKUP_FILE, jsonContent, 'utf-8');
    } catch (err) {
      console.error('Falha ao gravar backup automático:', err);
    }
  }

  public getData(): DatabaseSchema {
    return this.data;
  }

  public getBackupInfo(): {
    exists: boolean;
    sizeBytes: number;
    lastUpdated?: string;
    totalCustomers: number;
    totalAppointments: number;
  } {
    try {
      if (fs.existsSync(BACKUP_FILE)) {
        const stats = fs.statSync(BACKUP_FILE);
        return {
          exists: true,
          sizeBytes: stats.size,
          lastUpdated: stats.mtime.toISOString(),
          totalCustomers: this.data.customers.length,
          totalAppointments: this.data.appointments.length,
        };
      }
    } catch {}
    return {
      exists: false,
      sizeBytes: 0,
      totalCustomers: this.data.customers.length,
      totalAppointments: this.data.appointments.length,
    };
  }

  public restoreFromBackup(): boolean {
    try {
      if (fs.existsSync(BACKUP_FILE)) {
        const content = fs.readFileSync(BACKUP_FILE, 'utf-8');
        const parsed: DatabaseSchema = JSON.parse(content);
        this.data = parsed;
        fs.writeFileSync(DB_FILE, content, 'utf-8');
        return true;
      }
    } catch (err) {
      console.error('Erro ao restaurar backup:', err);
    }
    return false;
  }

  // --- Customers ---
  public getCustomers(): Customer[] {
    return this.data.customers;
  }

  public getCustomerById(id: string): Customer | undefined {
    return this.data.customers.find((c) => c.id === id);
  }

  public getCustomerByWhatsapp(whatsapp: string): Customer | undefined {
    let cleanNumber = whatsapp.replace(/\D/g, '');
    if (cleanNumber.startsWith('55') && (cleanNumber.length === 12 || cleanNumber.length === 13)) {
      cleanNumber = cleanNumber.substring(2);
    }
    return this.data.customers.find((c) => {
      let cClean = c.whatsapp.replace(/\D/g, '');
      if (cClean.startsWith('55') && (cClean.length === 12 || cClean.length === 13)) {
        cClean = cClean.substring(2);
      }
      return cClean === cleanNumber;
    });
  }

  public saveCustomer(customer: Customer): Customer {
    const idx = this.data.customers.findIndex((c) => c.id === customer.id);
    if (idx >= 0) {
      this.data.customers[idx] = customer;
    } else {
      this.data.customers.unshift(customer);
    }
    this.save();
    return customer;
  }

  // Deduct credit(s) from customer's active Club Ferraz plan upon appointment completion
  public consumeClubCredit(
    customerId: string,
    benefitType: 'haircut' | 'beard' | 'eyebrow' | 'skincare' | 'combo_haircut_beard' | 'combo_complete'
  ): boolean {
    const customer = this.getCustomerById(customerId);
    if (!customer || !customer.membership || !customer.membership.active) {
      return false;
    }

    const credits = customer.membership.credits;
    let consumed = false;

    if (benefitType === 'combo_haircut_beard' || benefitType === 'combo_complete') {
      // Combos (Cabelo + Barba): Deduz 1 corte (+ sobrancelha inclusa) E 1 barba simultaneamente
      if (credits.haircutsUsed < credits.haircutsTotal) {
        credits.haircutsUsed += 1;
        if (credits.eyebrowsUsed < credits.eyebrowsTotal) {
          credits.eyebrowsUsed += 1;
        }
        consumed = true;
      }
      if (credits.beardsUsed < credits.beardsTotal) {
        credits.beardsUsed += 1;
        consumed = true;
      }
      // Se for combo_complete (Cabelo + Barba + Limpeza) e tiver limpeza disponível no plano
      if (benefitType === 'combo_complete' && credits.skinCareUsed < credits.skinCareTotal) {
        credits.skinCareUsed += 1;
        consumed = true;
      }
    } else if (benefitType === 'haircut' && credits.haircutsUsed < credits.haircutsTotal) {
      credits.haircutsUsed += 1;
      // In Club Ferraz, haircut also includes eyebrow
      if (credits.eyebrowsUsed < credits.eyebrowsTotal) {
        credits.eyebrowsUsed += 1;
      }
      consumed = true;
    } else if (benefitType === 'beard' && credits.beardsUsed < credits.beardsTotal) {
      credits.beardsUsed += 1;
      consumed = true;
    } else if (benefitType === 'eyebrow' && credits.eyebrowsUsed < credits.eyebrowsTotal) {
      credits.eyebrowsUsed += 1;
      consumed = true;
    } else if (benefitType === 'skincare' && credits.skinCareUsed < credits.skinCareTotal) {
      credits.skinCareUsed += 1;
      consumed = true;
    }

    if (consumed) {
      customer.updatedAt = new Date().toISOString();
      this.saveCustomer(customer);
    }
    return consumed;
  }

  public deleteCustomer(id: string): boolean {
    const prevLen = this.data.customers.length;
    this.data.customers = this.data.customers.filter((c) => c.id !== id);
    this.save();
    return this.data.customers.length < prevLen;
  }

  // --- Barbers ---
  public getBarbers(): Barber[] {
    return this.data.barbers;
  }

  public getBarberById(id: string): Barber | undefined {
    return this.data.barbers.find((b) => b.id === id);
  }

  public saveBarber(barber: Barber): Barber {
    const idx = this.data.barbers.findIndex((b) => b.id === barber.id);
    if (idx >= 0) {
      this.data.barbers[idx] = barber;
      // Synchronize barberName across all appointments of this barberId
      for (const apt of this.data.appointments) {
        if (apt.barberId === barber.id) {
          apt.barberName = barber.name;
        }
      }
      // Synchronize users list
      for (const user of this.data.users) {
        if (user.barberId === barber.id) {
          user.name = barber.name;
          if (barber.avatarUrl) user.avatarUrl = barber.avatarUrl;
        }
      }
    } else {
      // RULE: EXACTLY TWO RESIDENT BARBERS! Block adding 3rd resident barber!
      if (this.data.barbers.length >= 2) {
        throw new Error('Regra do Sistema: O Ferraz Barber Club possui exatamente 2 cadeiras residentes. Não é permitido cadastrar um terceiro barbeiro.');
      }
      this.data.barbers.push(barber);
    }
    this.save();
    return barber;
  }

  // --- Services ---
  public getServices(): Service[] {
    return this.data.services;
  }

  public getServiceById(id: string): Service | undefined {
    return this.data.services.find((s) => s.id === id);
  }

  public saveService(service: Service): Service {
    const idx = this.data.services.findIndex((s) => s.id === service.id);
    if (idx >= 0) {
      this.data.services[idx] = service;
    } else {
      this.data.services.push(service);
    }
    this.save();
    return service;
  }

  // --- Appointments ---
  public getAppointments(): Appointment[] {
    return this.data.appointments.map((a) => {
      const barber = this.getBarberById(a.barberId);
      if (barber && barber.name && a.barberName !== barber.name) {
        return { ...a, barberName: barber.name };
      }
      return a;
    });
  }

  public getAppointmentById(id: string): Appointment | undefined {
    const apt = this.data.appointments.find((a) => a.id === id);
    if (!apt) return undefined;
    const barber = this.getBarberById(apt.barberId);
    if (barber && barber.name && apt.barberName !== barber.name) {
      return { ...apt, barberName: barber.name };
    }
    return apt;
  }

  public saveAppointment(appointment: Appointment): Appointment {
    const idx = this.data.appointments.findIndex((a) => a.id === appointment.id);
    if (idx >= 0) {
      this.data.appointments[idx] = appointment;
    } else {
      this.data.appointments.push(appointment);
    }
    this.save();
    return appointment;
  }

  public deleteAppointment(id: string): boolean {
    const prevLen = this.data.appointments.length;
    this.data.appointments = this.data.appointments.filter((a) => a.id !== id);
    this.save();
    return this.data.appointments.length < prevLen;
  }

  // --- Blocks ---
  public getBlocks(): ScheduleBlock[] {
    return this.data.blocks;
  }

  public saveBlock(block: ScheduleBlock): ScheduleBlock {
    const idx = this.data.blocks.findIndex((b) => b.id === block.id);
    if (idx >= 0) {
      this.data.blocks[idx] = block;
    } else {
      this.data.blocks.push(block);
    }
    this.save();
    return block;
  }

  public deleteBlock(id: string): boolean {
    const prevLen = this.data.blocks.length;
    this.data.blocks = this.data.blocks.filter((b) => b.id !== id);
    this.save();
    return this.data.blocks.length < prevLen;
  }

  // --- Settings ---
  public getSettings(): ShopSettings {
    const raw: Partial<ShopSettings> = this.data.settings || {};
    const rawTemplates = raw.whatsappTemplates || raw.whatsapp?.messages || {};
    const templates = {
      ...DEFAULT_WHATSAPP_TEMPLATES,
      ...rawTemplates,
    };
    return {
      ...INITIAL_SETTINGS,
      ...raw,
      brandConcept: raw.brandConcept || raw.conceptTagline || INITIAL_SETTINGS.brandConcept,
      whatsappTemplates: templates,
      whatsapp: {
        messages: templates,
      },
    };
  }

  public updateSettings(settings: Partial<ShopSettings>): ShopSettings {
    const current = this.getSettings();
    const rawTemplates = settings.whatsappTemplates || settings.whatsapp?.messages || {};
    const mergedTemplates = {
      ...current.whatsappTemplates,
      ...rawTemplates,
    };
    const updated: ShopSettings = {
      ...current,
      ...settings,
      conceptTagline: settings.brandConcept || settings.conceptTagline || current.conceptTagline,
      brandConcept: settings.brandConcept || settings.conceptTagline || current.brandConcept,
      whatsappTemplates: mergedTemplates,
      whatsapp: {
        messages: mergedTemplates,
      },
    };
    this.data.settings = updated;
    this.save();
    return this.getSettings();
  }

  // --- Users ---
  public getUsers(): UserProfile[] {
    return this.data.users.map((u) => {
      let resolved = { ...u };
      if (u.barberId) {
        const b = this.getBarberById(u.barberId);
        if (b) {
          resolved = {
            ...resolved,
            name: b.name,
            avatarUrl: b.avatarUrl || u.avatarUrl,
          };
        }
      }
      // Never expose pinCode, passwordHash or passwordSalt to client frontend
      const { pinCode: _, passwordHash: __, passwordSalt: ___, ...safeUser } = resolved;
      return safeUser as UserProfile;
    });
  }

  public getInternalUsersWithPins(): UserProfile[] {
    return this.data.users;
  }

  public saveUser(user: UserProfile): UserProfile {
    const existingIndex = this.data.users.findIndex((u) => u.id === user.id);
    if (existingIndex >= 0) {
      this.data.users[existingIndex] = {
        ...this.data.users[existingIndex],
        ...user,
      };
    } else {
      this.data.users.push(user);
    }
    this.save();
    return user;
  }

  public deleteUser(id: string): boolean {
    const user = this.data.users.find((u) => u.id === id);
    if (!user || user.id === 'usr_admin') {
      return false; // Never delete primary admin
    }
    this.data.users = this.data.users.filter((u) => u.id !== id);
    this.save();
    return true;
  }

  // --- Expenses (Despesas do Estabelecimento) ---
  public getExpenses(): Expense[] {
    if (!this.data.expenses) {
      this.data.expenses = [];
    }
    return this.data.expenses;
  }

  public getExpenseById(id: string): Expense | undefined {
    return this.getExpenses().find((e) => e.id === id);
  }

  public saveExpense(expense: Expense): Expense {
    if (!this.data.expenses) {
      this.data.expenses = [];
    }
    const idx = this.data.expenses.findIndex((e) => e.id === expense.id);
    if (idx >= 0) {
      this.data.expenses[idx] = expense;
    } else {
      this.data.expenses.push(expense);
    }
    this.save();
    return expense;
  }

  public deleteExpense(id: string): boolean {
    if (!this.data.expenses) {
      this.data.expenses = [];
      return false;
    }
    const exists = this.data.expenses.some((e) => e.id === id);
    if (!exists) return false;
    this.data.expenses = this.data.expenses.filter((e) => e.id !== id);
    this.save();
    return true;
  }
}

export const db = new Database();
