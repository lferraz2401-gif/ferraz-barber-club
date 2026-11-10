import {
  Customer,
  Barber,
  Service,
  Appointment,
  ScheduleBlock,
  ShopSettings,
  UserProfile,
} from '../src/types/index.js';
import { IDataRepository } from './repository.js';
import { DEFAULT_WHATSAPP_TEMPLATES } from './db.js';

/**
 * Cloudflare D1 Database Binding Interface
 * Matches standard Cloudflare Workers / Wrangler D1 typing.
 */
export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[]; success: boolean; error?: string }>;
  run(): Promise<{ success: boolean; error?: string; meta?: any }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<any[]>;
  exec(query: string): Promise<any>;
}

/**
 * Cloudflare D1 Database Repository
 *
 * Implements IDataRepository for Cloudflare Workers using SQLite / D1.
 * Pure persistence layer: NO business rules duplicated here.
 * Handles data mapping (INTEGER -> boolean, JSON serialization, etc.)
 */
export class D1DatabaseRepository implements IDataRepository {
  constructor(private db: D1Database) {}

  // ==========================================================================
  // CUSTOMERS
  // ==========================================================================

  public async getCustomers(): Promise<Customer[]> {
    const query = `
      SELECT id, name, whatsapp, email, birthDate, notes, isBlockedFromOnlineBooking, blockedReason, createdAt, updatedAt
      FROM customers
      ORDER BY name ASC
    `;
    const res = await this.db.prepare(query).all<any>();
    return (res.results || []).map(this.mapCustomer);
  }

  public async getCustomerById(id: string): Promise<Customer | undefined> {
    const query = `
      SELECT id, name, whatsapp, email, birthDate, notes, isBlockedFromOnlineBooking, blockedReason, createdAt, updatedAt
      FROM customers
      WHERE id = ?
      LIMIT 1
    `;
    const row = await this.db.prepare(query).bind(id).first<any>();
    return row ? this.mapCustomer(row) : undefined;
  }

  public async getCustomerByWhatsapp(whatsapp: string): Promise<Customer | undefined> {
    // Normalization logic: match exact digits or check with/without 55 country prefix
    let cleanNumber = whatsapp.replace(/\D/g, '');
    if (cleanNumber.startsWith('55') && (cleanNumber.length === 12 || cleanNumber.length === 13)) {
      cleanNumber = cleanNumber.substring(2);
    }

    const query = `
      SELECT id, name, whatsapp, email, birthDate, notes, isBlockedFromOnlineBooking, blockedReason, createdAt, updatedAt
      FROM customers
    `;
    const res = await this.db.prepare(query).all<any>();
    const all = (res.results || []).map(this.mapCustomer);

    return all.find((c) => {
      let cClean = c.whatsapp.replace(/\D/g, '');
      if (cClean.startsWith('55') && (cClean.length === 12 || cClean.length === 13)) {
        cClean = cClean.substring(2);
      }
      return cClean === cleanNumber;
    });
  }

  public async saveCustomer(customer: Customer): Promise<Customer> {
    const existing = await this.getCustomerById(customer.id);
    const now = new Date().toISOString();

    const blockedVal =
      customer.isBlockedFromOnlineBooking === undefined
        ? null
        : customer.isBlockedFromOnlineBooking
        ? 1
        : 0;

    if (existing) {
      const query = `
        UPDATE customers
        SET name = ?, whatsapp = ?, email = ?, birthDate = ?, notes = ?, isBlockedFromOnlineBooking = ?, blockedReason = ?, updatedAt = ?
        WHERE id = ?
      `;
      await this.db
        .prepare(query)
        .bind(
          customer.name,
          customer.whatsapp.replace(/\D/g, ''),
          customer.email || null,
          customer.birthDate || null,
          customer.notes || null,
          blockedVal,
          customer.blockedReason || null,
          now,
          customer.id
        )
        .run();
    } else {
      const query = `
        INSERT INTO customers (id, name, whatsapp, email, birthDate, notes, isBlockedFromOnlineBooking, blockedReason, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await this.db
        .prepare(query)
        .bind(
          customer.id,
          customer.name,
          customer.whatsapp.replace(/\D/g, ''),
          customer.email || null,
          customer.birthDate || null,
          customer.notes || null,
          blockedVal,
          customer.blockedReason || null,
          customer.createdAt || now,
          customer.updatedAt || now
        )
        .run();
    }

    const saved = await this.getCustomerById(customer.id);
    return saved || customer;
  }

  public async deleteCustomer(id: string): Promise<boolean> {
    const query = `DELETE FROM customers WHERE id = ?`;
    const res = await this.db.prepare(query).bind(id).run();
    return res.success !== false;
  }

  // ==========================================================================
  // BARBERS
  // ==========================================================================

  public async getBarbers(): Promise<Barber[]> {
    const query = `
      SELECT id, name, nickname, phone, active, avatarUrl, specialty, description,
             color, workDays, startTime, endTime, lunchStart, lunchEnd, createdAt, updatedAt
      FROM barbers
      ORDER BY CASE WHEN id = 'barber_cadeira_01' THEN 1 WHEN id = 'barber_cadeira_02' THEN 2 ELSE 3 END, id ASC
    `;
    const res = await this.db.prepare(query).all<any>();
    return (res.results || []).map(this.mapBarber);
  }

  public async getBarberById(id: string): Promise<Barber | undefined> {
    const query = `
      SELECT id, name, nickname, phone, active, avatarUrl, specialty, description,
             color, workDays, startTime, endTime, lunchStart, lunchEnd, createdAt, updatedAt
      FROM barbers
      WHERE id = ?
      LIMIT 1
    `;
    const row = await this.db.prepare(query).bind(id).first<any>();
    return row ? this.mapBarber(row) : undefined;
  }

  public async saveBarber(barber: Barber): Promise<Barber> {
    const existing = await this.getBarberById(barber.id);
    const now = new Date().toISOString();

    if (existing) {
      const query = `
        UPDATE barbers
        SET name = ?, nickname = ?, phone = ?, active = ?, avatarUrl = ?, specialty = ?,
            description = ?, color = ?, workDays = ?, startTime = ?, endTime = ?,
            lunchStart = ?, lunchEnd = ?, updatedAt = ?
        WHERE id = ?
      `;
      await this.db
        .prepare(query)
        .bind(
          barber.name,
          barber.nickname || barber.name,
          barber.phone || null,
          barber.active ? 1 : 0,
          barber.avatarUrl || null,
          barber.specialty || null,
          barber.description || null,
          barber.color || '#d97706',
          JSON.stringify(barber.workDays || [1, 2, 3, 4, 5, 6]),
          barber.startTime || '09:00',
          barber.endTime || '19:00',
          barber.lunchStart || '12:00',
          barber.lunchEnd || '13:30',
          now,
          barber.id
        )
        .run();
    } else {
      // RULE: EXACTLY TWO RESIDENT BARBERS!
      const allBarbers = await this.getBarbers();
      if (allBarbers.length >= 2) {
        throw new Error(
          'Regra do Sistema: O Ferraz Barber Club possui exatamente 2 cadeiras residentes. Não é permitido cadastrar um terceiro barbeiro.'
        );
      }

      const query = `
        INSERT INTO barbers (
          id, name, nickname, phone, active, avatarUrl, specialty, description,
          color, workDays, startTime, endTime, lunchStart, lunchEnd, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await this.db
        .prepare(query)
        .bind(
          barber.id,
          barber.name,
          barber.nickname || barber.name,
          barber.phone || null,
          barber.active ? 1 : 0,
          barber.avatarUrl || null,
          barber.specialty || null,
          barber.description || null,
          barber.color || '#d97706',
          JSON.stringify(barber.workDays || [1, 2, 3, 4, 5, 6]),
          barber.startTime || '09:00',
          barber.endTime || '19:00',
          barber.lunchStart || '12:00',
          barber.lunchEnd || '13:30',
          now,
          now
        )
        .run();
    }

    const saved = await this.getBarberById(barber.id);
    return saved || barber;
  }

  // ==========================================================================
  // SERVICES
  // ==========================================================================

  public async getServices(): Promise<Service[]> {
    const query = `
      SELECT id, name, description, price, durationMinutes, active, featured, createdAt, updatedAt
      FROM services
      ORDER BY price ASC
    `;
    const res = await this.db.prepare(query).all<any>();
    return (res.results || []).map(this.mapService);
  }

  public async getServiceById(id: string): Promise<Service | undefined> {
    const query = `
      SELECT id, name, description, price, durationMinutes, active, featured, createdAt, updatedAt
      FROM services
      WHERE id = ?
      LIMIT 1
    `;
    const row = await this.db.prepare(query).bind(id).first<any>();
    return row ? this.mapService(row) : undefined;
  }

  public async saveService(service: Service): Promise<Service> {
    const existing = await this.getServiceById(service.id);
    const now = new Date().toISOString();

    if (existing) {
      const query = `
        UPDATE services
        SET name = ?, description = ?, price = ?, durationMinutes = ?, active = ?, featured = ?, updatedAt = ?
        WHERE id = ?
      `;
      await this.db
        .prepare(query)
        .bind(
          service.name,
          service.description || '',
          service.price,
          service.durationMinutes,
          service.active ? 1 : 0,
          service.featured ? 1 : 0,
          now,
          service.id
        )
        .run();
    } else {
      const query = `
        INSERT INTO services (id, name, description, price, durationMinutes, active, featured, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await this.db
        .prepare(query)
        .bind(
          service.id,
          service.name,
          service.description || '',
          service.price,
          service.durationMinutes,
          service.active ? 1 : 0,
          service.featured ? 1 : 0,
          now,
          now
        )
        .run();
    }

    const saved = await this.getServiceById(service.id);
    return saved || service;
  }

  // ==========================================================================
  // APPOINTMENTS
  // ==========================================================================

  public async getAppointments(): Promise<Appointment[]> {
    const query = `
      SELECT id, customerId, customerName, customerWhatsapp, serviceId, serviceName,
             barberId, barberName, date, time, durationMinutes, priceCharged, status,
             isFitIn, source, notes, completedAt, cancelledAt, createdAt, updatedAt
      FROM appointments
      ORDER BY date ASC, time ASC
    `;
    const res = await this.db.prepare(query).all<any>();
    const apts = (res.results || []).map(this.mapAppointment);

    // Keep barberName synchronized with current barber name if exists
    const barbers = await this.getBarbers();
    const barberMap = new Map(barbers.map((b) => [b.id, b.name]));

    return apts.map((a) => {
      const currentName = barberMap.get(a.barberId);
      if (currentName && a.barberName !== currentName) {
        return { ...a, barberName: currentName };
      }
      return a;
    });
  }

  public async getAppointmentById(id: string): Promise<Appointment | undefined> {
    const query = `
      SELECT id, customerId, customerName, customerWhatsapp, serviceId, serviceName,
             barberId, barberName, date, time, durationMinutes, priceCharged, status,
             isFitIn, source, notes, completedAt, cancelledAt, createdAt, updatedAt
      FROM appointments
      WHERE id = ?
      LIMIT 1
    `;
    const row = await this.db.prepare(query).bind(id).first<any>();
    if (!row) return undefined;

    const apt = this.mapAppointment(row);
    const barber = await this.getBarberById(apt.barberId);
    if (barber && barber.name && apt.barberName !== barber.name) {
      return { ...apt, barberName: barber.name };
    }
    return apt;
  }

  public async saveAppointment(appointment: Appointment): Promise<Appointment> {
    const existing = await this.getAppointmentById(appointment.id);
    const now = new Date().toISOString();

    if (existing) {
      const query = `
        UPDATE appointments
        SET customerId = ?, customerName = ?, customerWhatsapp = ?, serviceId = ?,
            serviceName = ?, barberId = ?, barberName = ?, date = ?, time = ?,
            durationMinutes = ?, priceCharged = ?, status = ?, isFitIn = ?,
            source = ?, notes = ?, completedAt = ?, cancelledAt = ?, updatedAt = ?
        WHERE id = ?
      `;
      await this.db
        .prepare(query)
        .bind(
          appointment.customerId,
          appointment.customerName,
          appointment.customerWhatsapp,
          appointment.serviceId,
          appointment.serviceName,
          appointment.barberId,
          appointment.barberName,
          appointment.date,
          appointment.time,
          appointment.durationMinutes,
          appointment.priceCharged, // Historical frozen price maintained
          appointment.status,
          appointment.isFitIn ? 1 : 0,
          appointment.source || 'INTERNAL_APP',
          appointment.notes || null,
          appointment.completedAt || null,
          appointment.cancelledAt || null,
          appointment.updatedAt || now,
          appointment.id
        )
        .run();
    } else {
      const query = `
        INSERT INTO appointments (
          id, customerId, customerName, customerWhatsapp, serviceId, serviceName,
          barberId, barberName, date, time, durationMinutes, priceCharged, status,
          isFitIn, source, notes, completedAt, cancelledAt, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await this.db
        .prepare(query)
        .bind(
          appointment.id,
          appointment.customerId,
          appointment.customerName,
          appointment.customerWhatsapp,
          appointment.serviceId,
          appointment.serviceName,
          appointment.barberId,
          appointment.barberName,
          appointment.date,
          appointment.time,
          appointment.durationMinutes,
          appointment.priceCharged, // Historical frozen price maintained
          appointment.status,
          appointment.isFitIn ? 1 : 0,
          appointment.source || 'INTERNAL_APP',
          appointment.notes || null,
          appointment.completedAt || null,
          appointment.cancelledAt || null,
          appointment.createdAt || now,
          appointment.updatedAt || now
        )
        .run();
    }

    const saved = await this.getAppointmentById(appointment.id);
    return saved || appointment;
  }

  public async deleteAppointment(id: string): Promise<boolean> {
    const query = `DELETE FROM appointments WHERE id = ?`;
    const res = await this.db.prepare(query).bind(id).run();
    return res.success !== false;
  }

  // ==========================================================================
  // BLOCKS
  // ==========================================================================

  public async getBlocks(): Promise<ScheduleBlock[]> {
    const query = `
      SELECT id, type, barberId, startDate, endDate, startTime, endTime, reason, createdAt, updatedAt
      FROM blocks
      ORDER BY startDate ASC
    `;
    const res = await this.db.prepare(query).all<any>();
    return (res.results || []).map(this.mapBlock);
  }

  public async saveBlock(block: ScheduleBlock): Promise<ScheduleBlock> {
    const queryExisting = `SELECT id FROM blocks WHERE id = ? LIMIT 1`;
    const existing = await this.db.prepare(queryExisting).bind(block.id).first<any>();
    const now = new Date().toISOString();

    if (existing) {
      const query = `
        UPDATE blocks
        SET type = ?, barberId = ?, startDate = ?, endDate = ?, startTime = ?, endTime = ?, reason = ?, updatedAt = ?
        WHERE id = ?
      `;
      await this.db
        .prepare(query)
        .bind(
          block.type,
          block.barberId || null,
          block.startDate,
          block.endDate,
          block.startTime || null,
          block.endTime || null,
          block.reason,
          now,
          block.id
        )
        .run();
    } else {
      const query = `
        INSERT INTO blocks (id, type, barberId, startDate, endDate, startTime, endTime, reason, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await this.db
        .prepare(query)
        .bind(
          block.id,
          block.type,
          block.barberId || null,
          block.startDate,
          block.endDate,
          block.startTime || null,
          block.endTime || null,
          block.reason,
          block.createdAt || now,
          now
        )
        .run();
    }

    return block;
  }

  public async deleteBlock(id: string): Promise<boolean> {
    const query = `DELETE FROM blocks WHERE id = ?`;
    const res = await this.db.prepare(query).bind(id).run();
    return res.success !== false;
  }

  // ==========================================================================
  // SETTINGS
  // ==========================================================================

  public async getSettings(): Promise<ShopSettings> {
    const query = `SELECT key, value FROM settings`;
    const res = await this.db.prepare(query).all<{ key: string; value: string }>();

    const settingsMap = new Map<string, any>();
    for (const row of res.results || []) {
      try {
        settingsMap.set(row.key, JSON.parse(row.value));
      } catch {
        settingsMap.set(row.key, row.value);
      }
    }

    const general = settingsMap.get('general') || {};
    const rawTemplates = settingsMap.get('whatsapp_templates') || {};

    const templates = {
      ...DEFAULT_WHATSAPP_TEMPLATES,
      ...rawTemplates,
    };

    return {
      shopName: general.shopName || 'FERRAZ BARBER CLUB',
      conceptTagline: general.conceptTagline || general.brandConcept || 'Da quebrada, para o mundo.',
      brandConcept: general.brandConcept || general.conceptTagline || 'Da quebrada, para o mundo.',
      phone: general.phone || '11999998888',
      address: general.address || 'Rua Principal da Quebrada, 120 - São Paulo, SP',
      openTime: general.openTime || '09:00',
      closeTime: general.closeTime || '21:00',
      operatingDays: general.operatingDays || [1, 2, 3, 4, 5, 6],
      minAdvanceHours: general.minAdvanceHours ?? 1,
      minNoticeMinutes: general.minNoticeMinutes ?? 30,
      maxFutureDays: general.maxFutureDays ?? 30,
      allowSameDay: general.allowSameDay ?? true,
      cancellationNoticeHours: general.cancellationNoticeHours ?? 2,
      cancelMinHours: general.cancelMinHours ?? 2,
      allowAdminFitIn: general.allowAdminFitIn ?? true,
      whatsappTemplates: templates,
      whatsapp: {
        messages: templates,
      },
    };
  }

  public async updateSettings(settings: Partial<ShopSettings>): Promise<ShopSettings> {
    const current = await this.getSettings();
    const updated: ShopSettings = {
      ...current,
      ...settings,
      whatsappTemplates: {
        ...current.whatsappTemplates,
        ...(settings.whatsappTemplates || settings.whatsapp?.messages || {}),
      },
      whatsapp: {
        messages: {
          ...current.whatsappTemplates,
          ...(settings.whatsappTemplates || settings.whatsapp?.messages || {}),
        },
      },
    };

    const generalPayload = {
      shopName: updated.shopName,
      conceptTagline: updated.conceptTagline,
      brandConcept: updated.brandConcept,
      phone: updated.phone,
      address: updated.address,
      openTime: updated.openTime,
      closeTime: updated.closeTime,
      operatingDays: updated.operatingDays,
      minAdvanceHours: updated.minAdvanceHours,
      minNoticeMinutes: updated.minNoticeMinutes,
      maxFutureDays: updated.maxFutureDays,
      allowSameDay: updated.allowSameDay,
      cancellationNoticeHours: updated.cancellationNoticeHours,
      cancelMinHours: updated.cancelMinHours,
      allowAdminFitIn: updated.allowAdminFitIn,
    };

    const queryGeneral = `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`;
    await this.db.prepare(queryGeneral).bind('general', JSON.stringify(generalPayload)).run();

    const queryTemplates = `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`;
    await this.db
      .prepare(queryTemplates)
      .bind('whatsapp_templates', JSON.stringify(updated.whatsappTemplates))
      .run();

    return updated;
  }

  // ==========================================================================
  // USERS
  // ==========================================================================

  public async getUsers(): Promise<UserProfile[]> {
    const query = `
      SELECT id, name, role, barberId, avatarUrl, createdAt, updatedAt
      FROM users
      ORDER BY id ASC
    `;
    const res = await this.db.prepare(query).all<any>();
    const users = (res.results || []).map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role as 'ADMIN' | 'BARBER',
      barberId: u.barberId || undefined,
      avatarUrl: u.avatarUrl || undefined,
    }));

    // Synchronize barber names if user is bound to a barberId
    const barbers = await this.getBarbers();
    const barberMap = new Map(barbers.map((b) => [b.id, b]));

    return users.map((u) => {
      if (u.barberId) {
        const b = barberMap.get(u.barberId);
        if (b) {
          return {
            ...u,
            name: b.name,
            avatarUrl: b.avatarUrl || u.avatarUrl,
          };
        }
      }
      return u;
    });
  }

  // ==========================================================================
  // INTERNAL MAPPERS (Row -> Domain Entity)
  // ==========================================================================

  private mapCustomer(row: any): Customer {
    return {
      id: row.id,
      name: row.name,
      whatsapp: row.whatsapp,
      email: row.email || undefined,
      birthDate: row.birthDate || undefined,
      notes: row.notes || undefined,
      isBlockedFromOnlineBooking:
        row.isBlockedFromOnlineBooking === null || row.isBlockedFromOnlineBooking === undefined
          ? undefined
          : Boolean(row.isBlockedFromOnlineBooking),
      blockedReason: row.blockedReason || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      totalVisits: 0,
      totalSpent: 0,
      status: 'ACTIVE',
      // Aggregates will be dynamically calculated by enrichCustomerData in business layer
    };
  }

  private mapBarber(row: any): Barber {
    let workDays: number[] = [1, 2, 3, 4, 5, 6];
    if (typeof row.workDays === 'string') {
      try {
        workDays = JSON.parse(row.workDays);
      } catch {}
    } else if (Array.isArray(row.workDays)) {
      workDays = row.workDays;
    }

    return {
      id: row.id,
      name: row.name,
      nickname: row.nickname || row.name,
      phone: row.phone || undefined,
      active: row.active === 1 || row.active === true,
      avatarUrl: row.avatarUrl || undefined,
      specialty: row.specialty || undefined,
      description: row.description || undefined,
      color: row.color || '#d97706',
      workDays,
      startTime: row.startTime || '09:00',
      endTime: row.endTime || '19:00',
      lunchStart: row.lunchStart || '12:00',
      lunchEnd: row.lunchEnd || '13:30',
    };
  }

  private mapService(row: any): Service {
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      price: Number(row.price),
      durationMinutes: Number(row.durationMinutes),
      active: row.active === 1 || row.active === true,
      featured: row.featured === 1 || row.featured === true,
    };
  }

  private mapAppointment(row: any): Appointment {
    return {
      id: row.id,
      customerId: row.customerId,
      customerName: row.customerName,
      customerWhatsapp: row.customerWhatsapp,
      serviceId: row.serviceId,
      serviceName: row.serviceName,
      barberId: row.barberId,
      barberName: row.barberName,
      date: row.date,
      time: row.time,
      durationMinutes: Number(row.durationMinutes),
      priceCharged: Number(row.priceCharged), // Crucial: frozen historical price
      status: row.status,
      isFitIn: row.isFitIn === 1 || row.isFitIn === true,
      source: row.source || 'INTERNAL_APP',
      notes: row.notes || undefined,
      completedAt: row.completedAt || undefined,
      cancelledAt: row.cancelledAt || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapBlock(row: any): ScheduleBlock {
    return {
      id: row.id,
      type: row.type,
      barberId: row.barberId || undefined,
      startDate: row.startDate,
      endDate: row.endDate,
      startTime: row.startTime || undefined,
      endTime: row.endTime || undefined,
      reason: row.reason,
      createdAt: row.createdAt,
    };
  }
}
