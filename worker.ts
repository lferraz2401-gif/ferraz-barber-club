import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { D1Database, D1DatabaseRepository } from './server/d1-repository.js';
import {
  checkBarberAvailabilityWithRepo,
  getAvailableSlotsWithRepo,
  enrichCustomerDataWithRepo,
  getFinancialStatsWithRepo,
  getDashboardMetricsWithRepo,
} from './server/business-core.js';
import { getOperationDateTime } from './src/utils/datetime.js';
import { Customer, Appointment, FinancialPeriod } from './src/types/index.js';

export interface Env {
  DB: D1Database;
  CORS_ORIGIN?: string;
  ENVIRONMENT?: string;
}

// Instantiate Hono Worker App
const app = new Hono<{ Bindings: Env }>();

// --------------------------------------------------------------------------
// 1. CORS & CENTRALIZED MIDDLEWARES
// --------------------------------------------------------------------------
app.use('*', async (c, next) => {
  const origin = c.env?.CORS_ORIGIN || '*';
  return cors({
    origin: (reqOrigin) => {
      // Allow all in local/development if wildcard or not set;
      // otherwise restrict to configured origin or Pages domain
      if (origin === '*' || !c.env?.CORS_ORIGIN) return reqOrigin || '*';
      return origin;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposeHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 86400,
  })(c, next);
});

// Centralized error handler
app.onError((err, c) => {
  console.error('[Worker Error]', err);
  return c.json(
    {
      error: 'Erro interno inesperado no processamento da requisição.',
    },
    500
  );
});

// Helper to get D1 repository from request environment
function getRepo(env: Env): D1DatabaseRepository {
  if (!env.DB) {
    throw new Error('D1Database binding (env.DB) não configurado ou inacessível.');
  }
  return new D1DatabaseRepository(env.DB);
}

// --------------------------------------------------------------------------
// 2. HEALTH & METRICS
// --------------------------------------------------------------------------
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', shop: 'FERRAZ BARBER CLUB' });
});

app.get('/api/dashboard', async (c) => {
  const repo = getRepo(c.env);
  const barberId = c.req.query('barberId') || undefined;
  const metrics = await getDashboardMetricsWithRepo(repo, barberId);
  return c.json(metrics);
});

app.get('/api/financial', async (c) => {
  const repo = getRepo(c.env);
  const period = (c.req.query('period') as FinancialPeriod) || 'today';
  const startDate = c.req.query('startDate') || undefined;
  const endDate = c.req.query('endDate') || undefined;

  const stats = await getFinancialStatsWithRepo(repo, period, startDate, endDate);
  return c.json(stats);
});

// --------------------------------------------------------------------------
// 3. CLIENTES (CUSTOMERS) & CRM
// --------------------------------------------------------------------------
app.get('/api/customers', async (c) => {
  const repo = getRepo(c.env);
  const search = (c.req.query('search') || '').trim().toLowerCase();
  const rawCustomers = await repo.getCustomers();
  let customers = await Promise.all(rawCustomers.map((cust) => enrichCustomerDataWithRepo(repo, cust)));

  if (search) {
    const cleanSearch = search.replace(/\D/g, '');
    customers = customers.filter((cust) => {
      const matchName = cust.name.toLowerCase().includes(search);
      const matchWhatsapp = cleanSearch ? cust.whatsapp.replace(/\D/g, '').includes(cleanSearch) : false;
      return matchName || matchWhatsapp;
    });
  }

  return c.json(customers);
});

app.get('/api/customers/:id', async (c) => {
  const repo = getRepo(c.env);
  const id = c.req.param('id');
  const customer = await repo.getCustomerById(id);
  if (!customer) {
    return c.json({ error: 'Cliente não encontrado.' }, 404);
  }

  const enriched = await enrichCustomerDataWithRepo(repo, customer);
  const allAppointments = await repo.getAppointments();
  const appointments = allAppointments
    .filter((a) => a.customerId === id)
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  return c.json({ ...enriched, appointments });
});

app.get('/api/public/recognize-client', async (c) => {
  const repo = getRepo(c.env);
  const phone = (c.req.query('phone') || '').replace(/\D/g, '');
  if (!phone || phone.length < 10) {
    return c.json({ error: 'Telefone inválido para identificação.' }, 400);
  }

  let searchPhone = phone;
  if (searchPhone.startsWith('55') && (searchPhone.length === 12 || searchPhone.length === 13)) {
    searchPhone = searchPhone.substring(2);
  }

  const customer = await repo.getCustomerByWhatsapp(searchPhone);
  if (!customer) {
    return c.json({ recognized: false });
  }

  const allAppointments = await repo.getAppointments();
  const clientApts = allAppointments
    .filter((a) => a.customerId === customer.id && a.status !== 'CANCELLED')
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  const lastApt = clientApts[0] || null;
  let lastService = null;
  let preferredBarber = null;

  if (lastApt) {
    lastService = (await repo.getServiceById(lastApt.serviceId)) || null;
    preferredBarber = (await repo.getBarberById(lastApt.barberId)) || null;
  }

  const enriched = await enrichCustomerDataWithRepo(repo, customer);

  return c.json({
    recognized: true,
    isBlocked: Boolean(enriched.isBlockedFromOnlineBooking),
    noShowCount: enriched.noShowCount || 0,
    blockedReason: enriched.blockedReason,
    customer: {
      id: customer.id,
      name: customer.name,
      whatsapp: customer.whatsapp,
      totalVisits: enriched.totalVisits || clientApts.length,
      membership: customer.membership || null,
      isBlockedFromOnlineBooking: Boolean(enriched.isBlockedFromOnlineBooking),
      noShowCount: enriched.noShowCount || 0,
      blockedReason: enriched.blockedReason,
    },
    lastAppointment: lastApt
      ? {
          id: lastApt.id,
          serviceId: lastApt.serviceId,
          serviceName: lastApt.serviceName,
          servicePrice: lastApt.priceCharged,
          durationMinutes: lastApt.durationMinutes,
          barberId: lastApt.barberId,
          barberName: lastApt.barberName,
          date: lastApt.date,
          time: lastApt.time,
        }
      : null,
    lastService,
    preferredBarber,
  });
});

app.post('/api/customers', async (c) => {
  const repo = getRepo(c.env);
  const body = await c.req.json().catch(() => ({}));
  const { name, whatsapp, email, birthDate, notes } = body;

  if (!name || !name.trim()) {
    return c.json({ error: 'Nome completo é obrigatório.' }, 400);
  }
  if (!whatsapp || !whatsapp.trim()) {
    return c.json({ error: 'WhatsApp é obrigatório.' }, 400);
  }

  let cleanWhatsapp = whatsapp.replace(/\D/g, '');
  if (cleanWhatsapp.startsWith('55') && (cleanWhatsapp.length === 12 || cleanWhatsapp.length === 13)) {
    cleanWhatsapp = cleanWhatsapp.substring(2);
  }

  if (cleanWhatsapp.length < 10) {
    return c.json({ error: 'Número de WhatsApp inválido (mínimo DDD + 8 ou 9 dígitos).' }, 400);
  }

  const existing = await repo.getCustomerByWhatsapp(cleanWhatsapp);
  if (existing) {
    const enrichedExisting = await enrichCustomerDataWithRepo(repo, existing);
    return c.json(
      {
        error: `Já existe um cliente cadastrado com este WhatsApp: ${existing.name}.`,
        existingCustomer: enrichedExisting,
      },
      409
    );
  }

  const newCustomer: Customer = {
    id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    whatsapp: cleanWhatsapp,
    email: email ? email.trim() : undefined,
    birthDate: birthDate || undefined,
    notes: notes ? notes.trim() : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalVisits: 0,
    totalSpent: 0,
    status: 'ACTIVE',
  };

  const saved = await repo.saveCustomer(newCustomer);
  const enriched = await enrichCustomerDataWithRepo(repo, saved);
  return c.json(enriched, 201);
});

app.put('/api/customers/:id', async (c) => {
  const repo = getRepo(c.env);
  const id = c.req.param('id');
  const existing = await repo.getCustomerById(id);
  if (!existing) {
    return c.json({ error: 'Cliente não encontrado.' }, 404);
  }

  const body = await c.req.json().catch(() => ({}));
  const { name, whatsapp, email, birthDate, notes } = body;

  if (whatsapp) {
    let cleanWhatsapp = whatsapp.replace(/\D/g, '');
    if (cleanWhatsapp.startsWith('55') && (cleanWhatsapp.length === 12 || cleanWhatsapp.length === 13)) {
      cleanWhatsapp = cleanWhatsapp.substring(2);
    }
    const duplicate = await repo.getCustomerByWhatsapp(cleanWhatsapp);
    if (duplicate && duplicate.id !== existing.id) {
      return c.json(
        {
          error: `Este WhatsApp já pertence a outro cliente cadastrado: ${duplicate.name}.`,
        },
        409
      );
    }
    existing.whatsapp = cleanWhatsapp;
  }

  if (name) existing.name = name.trim();
  if (email !== undefined) existing.email = email ? email.trim() : undefined;
  if (birthDate !== undefined) existing.birthDate = birthDate || undefined;
  if (notes !== undefined) existing.notes = notes ? notes.trim() : undefined;
  if (body.isBlockedFromOnlineBooking !== undefined) {
    existing.isBlockedFromOnlineBooking = Boolean(body.isBlockedFromOnlineBooking);
  }
  if (body.blockedReason !== undefined) {
    existing.blockedReason = body.blockedReason ? String(body.blockedReason).trim() : undefined;
  }
  existing.updatedAt = new Date().toISOString();

  const saved = await repo.saveCustomer(existing);
  const enriched = await enrichCustomerDataWithRepo(repo, saved);
  return c.json(enriched);
});

app.delete('/api/customers/:id', async (c) => {
  const repo = getRepo(c.env);
  const id = c.req.param('id');
  const success = await repo.deleteCustomer(id);
  if (!success) return c.json({ error: 'Cliente não encontrado.' }, 404);
  return c.json({ message: 'Cliente removido com sucesso.' });
});

app.get('/api/crm', async (c) => {
  const repo = getRepo(c.env);
  const rawCustomers = await repo.getCustomers();
  const customers = await Promise.all(rawCustomers.map((cust) => enrichCustomerDataWithRepo(repo, cust)));

  const recent = customers.filter((cust) => cust.status === 'ACTIVE' && cust.totalVisits > 0);
  const returnNeeded = customers.filter((cust) => cust.status === 'RETURN_NEEDED');
  const inactive = customers.filter((cust) => cust.status === 'INACTIVE');
  const newClients = customers.filter((cust) => cust.totalVisits === 0);

  return c.json({
    recent,
    returnNeeded,
    inactive,
    newClients,
    totalCount: customers.length,
    returnNeededCount: returnNeeded.length,
  });
});

// --------------------------------------------------------------------------
// 4. BARBEIROS (RESIDENT BARBERS)
// --------------------------------------------------------------------------
app.get('/api/barbers', async (c) => {
  const repo = getRepo(c.env);
  const barbers = await repo.getBarbers();
  return c.json(barbers);
});

app.post('/api/barbers', async (c) => {
  const repo = getRepo(c.env);
  const body = await c.req.json().catch(() => ({}));
  try {
    const barber = await repo.saveBarber(body);
    return c.json(barber, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 403);
  }
});

app.put('/api/barbers/:id', async (c) => {
  const repo = getRepo(c.env);
  const id = c.req.param('id');
  const barber = await repo.getBarberById(id);
  if (!barber) return c.json({ error: 'Barbeiro não encontrado.' }, 404);

  const body = await c.req.json().catch(() => ({}));
  const { id: _, ...bodyData } = body;
  const updated = {
    ...barber,
    ...bodyData,
    id: barber.id,
  };
  await repo.saveBarber(updated);
  return c.json(updated);
});

// --------------------------------------------------------------------------
// 5. SERVIÇOS (SERVICES)
// --------------------------------------------------------------------------
app.get('/api/services', async (c) => {
  const repo = getRepo(c.env);
  const all = await repo.getServices();
  return c.json(all);
});

app.post('/api/services', async (c) => {
  const repo = getRepo(c.env);
  const body = await c.req.json().catch(() => ({}));
  const { name, description, price, durationMinutes, featured, active } = body;
  if (!name || price === undefined || !durationMinutes) {
    return c.json({ error: 'Nome, preço e duração são obrigatórios.' }, 400);
  }

  const newService = {
    id: `srv_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    name: name.trim(),
    description: description || '',
    price: Number(price),
    durationMinutes: Number(durationMinutes),
    active: active !== undefined ? active : true,
    featured: Boolean(featured),
  };

  const saved = await repo.saveService(newService);
  return c.json(saved, 201);
});

app.put('/api/services/:id', async (c) => {
  const repo = getRepo(c.env);
  const id = c.req.param('id');
  const service = await repo.getServiceById(id);
  if (!service) return c.json({ error: 'Serviço não encontrado.' }, 404);

  const body = await c.req.json().catch(() => ({}));
  const updated = {
    ...service,
    ...body,
    price: body.price !== undefined ? Number(body.price) : service.price,
    durationMinutes:
      body.durationMinutes !== undefined ? Number(body.durationMinutes) : service.durationMinutes,
  };

  await repo.saveService(updated);
  return c.json(updated);
});

// --------------------------------------------------------------------------
// 6. DISPONIBILIDADE (AVAILABILITY)
// --------------------------------------------------------------------------
app.get('/api/availability', async (c) => {
  const repo = getRepo(c.env);
  const barberId = c.req.query('barberId');
  const date = c.req.query('date');
  const serviceId = c.req.query('serviceId');
  const durationMinutes = c.req.query('durationMinutes');

  if (!date) {
    return c.json({ error: 'Data é obrigatória.' }, 400);
  }

  let duration = Number(durationMinutes);
  if (!duration && serviceId) {
    const srv = await repo.getServiceById(serviceId);
    if (srv) duration = srv.durationMinutes;
  }
  if (!duration) duration = 30;

  if (!barberId || barberId === 'any') {
    const allBarbers = await repo.getBarbers();
    const barbers = allBarbers.filter((b) => b.active);
    const combinedSlots: Record<string, { availableBarberIds: string[]; available: boolean }> = {};

    for (const b of barbers) {
      const slots = await getAvailableSlotsWithRepo(repo, b.id, date, duration);
      for (const slot of slots) {
        if (slot.available) {
          if (!combinedSlots[slot.time]) {
            combinedSlots[slot.time] = { availableBarberIds: [], available: true };
          }
          combinedSlots[slot.time].availableBarberIds.push(b.id);
        }
      }
    }

    const result = Object.entries(combinedSlots)
      .map(([time, data]) => ({
        time,
        available: true,
        barberIds: data.availableBarberIds,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));

    return c.json(result);
  }

  const slots = await getAvailableSlotsWithRepo(repo, barberId, date, duration);
  return c.json(slots);
});

// --------------------------------------------------------------------------
// 7. AGENDAMENTOS (APPOINTMENTS)
// --------------------------------------------------------------------------
app.get('/api/appointments', async (c) => {
  const repo = getRepo(c.env);
  const date = c.req.query('date');
  const barberId = c.req.query('barberId');
  const customerId = c.req.query('customerId');
  const status = c.req.query('status');

  let apts = await repo.getAppointments();

  if (date) {
    apts = apts.filter((a) => a.date === date);
  }
  if (barberId) {
    apts = apts.filter((a) => a.barberId === barberId);
  }
  if (customerId) {
    apts = apts.filter((a) => a.customerId === customerId);
  }
  if (status) {
    apts = apts.filter((a) => a.status === status);
  }

  apts.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return c.json(apts);
});

app.get('/api/appointments/:id', async (c) => {
  const repo = getRepo(c.env);
  const id = c.req.param('id');
  const apt = await repo.getAppointmentById(id);
  if (!apt) {
    return c.json({ error: 'Agendamento não encontrado.' }, 404);
  }
  return c.json(apt);
});

app.post('/api/appointments', async (c) => {
  const repo = getRepo(c.env);
  const body = await c.req.json().catch(() => ({}));
  let {
    customerId,
    customerName,
    customerWhatsapp,
    serviceId,
    barberId,
    date,
    time,
    notes,
    isFitIn,
    source,
  } = body;

  if (!serviceId) {
    return c.json({ error: 'Serviço é obrigatório.' }, 400);
  }
  if (!date || !time) {
    return c.json({ error: 'Data e horário são obrigatórios.' }, 400);
  }

  const service = await repo.getServiceById(serviceId);
  if (!service) {
    return c.json({ error: 'Serviço não encontrado.' }, 404);
  }
  if (!service.active) {
    return c.json({ error: 'Serviço desativado não pode ser agendado.' }, 400);
  }

  let customer: Customer | undefined;
  if (customerId) {
    customer = await repo.getCustomerById(customerId);
  } else if (customerWhatsapp) {
    let clean = customerWhatsapp.replace(/\D/g, '');
    if (clean.startsWith('55') && (clean.length === 12 || clean.length === 13)) {
      clean = clean.substring(2);
    }
    customer = await repo.getCustomerByWhatsapp(clean);
    if (!customer && customerName) {
      customer = {
        id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: customerName.trim(),
        whatsapp: clean,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalVisits: 0,
        totalSpent: 0,
        status: 'ACTIVE',
      };
      await repo.saveCustomer(customer);
    } else if (customer && customerName && customerName.trim() && customer.name !== customerName.trim()) {
      customer.name = customerName.trim();
      customer.updatedAt = new Date().toISOString();
      await repo.saveCustomer(customer);
    }
  }

  if (!customer) {
    return c.json({ error: 'Cliente inválido ou não informado.' }, 400);
  }

  // 🛡️ Regra de Bloqueio por "Histórico Sujo" (No-Shows / Faltas sem aviso prévio)
  if (source === 'PUBLIC_BOOKING') {
    const enrichedCustomer = await enrichCustomerDataWithRepo(repo, customer);
    if (enrichedCustomer.isBlockedFromOnlineBooking) {
      return c.json(
        {
          error:
            'AGENDAMENTO ONLINE BLOQUEADO: Constam ausências anteriores sem cancelamento prévio no seu histórico. Por favor, envie uma mensagem no WhatsApp da barbearia para aprovação do horário.',
          isBlocked: true,
          noShowCount: enrichedCustomer.noShowCount || 2,
          blockedReason: enrichedCustomer.blockedReason,
        },
        403
      );
    }
  }

  if (!barberId || barberId === 'any') {
    const allBarbers = await repo.getBarbers();
    const activeBarbers = allBarbers.filter((b) => b.active);
    let selectedBarberId: string | undefined;

    // Combined / Add-on services: respect combined duration, price and title
    const effectiveDuration = body.durationMinutes
      ? Number(body.durationMinutes)
      : service.durationMinutes;
    const effectivePrice = body.priceCharged !== undefined
      ? Number(body.priceCharged)
      : service.price;
    const effectiveServiceName = body.serviceName
      ? String(body.serviceName).trim()
      : service.name;

    for (const b of activeBarbers) {
      const check = await checkBarberAvailabilityWithRepo(
        repo,
        b.id,
        date,
        time,
        effectiveDuration,
        Boolean(isFitIn)
      );
      if (check.available) {
        selectedBarberId = b.id;
        break;
      }
    }

    if (!selectedBarberId) {
      return c.json(
        {
          error: 'Nenhum barbeiro disponível para o horário e duração selecionados.',
        },
        409
      );
    }
    barberId = selectedBarberId;
  }

  const barber = await repo.getBarberById(barberId);
  if (!barber) {
    return c.json({ error: 'Barbeiro não encontrado.' }, 404);
  }

  const { todayStr } = getOperationDateTime();
  if (date < todayStr) {
    return c.json({ error: 'Não é permitido criar agendamentos em datas que já passaram.' }, 400);
  }

  const effectiveDuration = body.durationMinutes
    ? Number(body.durationMinutes)
    : service.durationMinutes;
  const effectivePrice = body.priceCharged !== undefined
    ? Number(body.priceCharged)
    : service.price;
  const effectiveServiceName = body.serviceName
    ? String(body.serviceName).trim()
    : service.name;

  const availability = await checkBarberAvailabilityWithRepo(
    repo,
    barberId,
    date,
    time,
    effectiveDuration,
    Boolean(isFitIn)
  );

  if (!availability.available && !isFitIn) {
    const reason = availability.reason || 'Este horário não está mais disponível.';
    const isClientError =
      reason.includes('passadas') ||
      reason.includes('passou') ||
      reason.includes('expediente') ||
      reason.includes('fechada') ||
      reason.includes('abre neste dia') ||
      reason.includes('funcionamento') ||
      reason.includes('Fora da escala') ||
      reason.includes('fora do') ||
      reason.includes('antecedência') ||
      reason.includes('mesmo dia');

    if (isClientError) {
      return c.json({ error: reason }, 400);
    }

    const isBookedConflict =
      reason.includes('já possui atendimento') ||
      reason.includes('Conflito') ||
      reason.includes('almoço') ||
      reason.includes('bloqueio');

    return c.json(
      {
        error: isBookedConflict
          ? (reason.includes('almoço') || reason.includes('bloqueio') ? reason : 'Este horário acabou de ser reservado. Escolha outro horário.')
          : reason,
      },
      409
    );
  }

  const newAppointment: Appointment = {
    id: `apt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    customerId: customer.id,
    customerName: customer.name,
    customerWhatsapp: customer.whatsapp,
    serviceId: service.id,
    serviceName: effectiveServiceName,
    barberId: barber.id,
    barberName: barber.name,
    date,
    time,
    durationMinutes: effectiveDuration,
    priceCharged: effectivePrice, // FROZEN price
    status: 'CONFIRMED',
    notes: notes || undefined,
    isFitIn: Boolean(isFitIn),
    source: (source as 'PUBLIC_BOOKING' | 'INTERNAL_APP') || (isFitIn ? 'INTERNAL_APP' : 'INTERNAL_APP'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const saved = await repo.saveAppointment(newAppointment);
  return c.json(saved, 201);
});

app.put('/api/appointments/:id', async (c) => {
  const repo = getRepo(c.env);
  const id = c.req.param('id');
  const apt = await repo.getAppointmentById(id);
  if (!apt) return c.json({ error: 'Agendamento não encontrado.' }, 404);

  const body = await c.req.json().catch(() => ({}));
  const { status, date, time, barberId, serviceId, notes, isFitIn, priceCharged } = body;

  if ((date && date !== apt.date) || (time && time !== apt.time) || (barberId && barberId !== apt.barberId)) {
    const targetBarber = barberId || apt.barberId;
    const targetDate = date || apt.date;
    const targetTime = time || apt.time;
    const srv = serviceId ? await repo.getServiceById(serviceId) : undefined;
    const targetDuration = srv?.durationMinutes || apt.durationMinutes;

    const check = await checkBarberAvailabilityWithRepo(
      repo,
      targetBarber,
      targetDate,
      targetTime,
      targetDuration,
      Boolean(isFitIn ?? apt.isFitIn),
      apt.id
    );

    if (!check.available && !isFitIn) {
      return c.json({ error: check.reason }, 409);
    }

    apt.barberId = targetBarber;
    const foundBarber = await repo.getBarberById(targetBarber);
    apt.barberName = foundBarber?.name || apt.barberName;
    apt.date = targetDate;
    apt.time = targetTime;
  }

  if (serviceId && serviceId !== apt.serviceId) {
    const srv = await repo.getServiceById(serviceId);
    if (srv) {
      apt.serviceId = srv.id;
      apt.serviceName = srv.name;
      apt.durationMinutes = srv.durationMinutes;
    }
  }

  if (status) {
    apt.status = status;
    if (status === 'COMPLETED' && !apt.completedAt) {
      apt.completedAt = new Date().toISOString();
    }
    if (status === 'CANCELLED' && !apt.cancelledAt) {
      apt.cancelledAt = new Date().toISOString();
    }
  }

  if (notes !== undefined) apt.notes = notes;
  if (priceCharged !== undefined) apt.priceCharged = Number(priceCharged);
  apt.updatedAt = new Date().toISOString();

  const saved = await repo.saveAppointment(apt);
  return c.json(saved);
});

app.delete('/api/appointments/:id', async (c) => {
  const repo = getRepo(c.env);
  const id = c.req.param('id');
  const success = await repo.deleteAppointment(id);
  if (!success) return c.json({ error: 'Agendamento não encontrado.' }, 404);
  return c.json({ message: 'Agendamento excluído.' });
});

// --------------------------------------------------------------------------
// 8. BLOQUEIOS (BLOCKS)
// --------------------------------------------------------------------------
app.get('/api/blocks', async (c) => {
  const repo = getRepo(c.env);
  const blocks = await repo.getBlocks();
  return c.json(blocks);
});

app.post('/api/blocks', async (c) => {
  const repo = getRepo(c.env);
  const body = await c.req.json().catch(() => ({}));
  const { type, barberId, startDate, endDate, startTime, endTime, reason } = body;
  if (!type || !startDate || !endDate) {
    return c.json({ error: 'Tipo, data inicial e final são obrigatórios.' }, 400);
  }

  const newBlock = {
    id: `block_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type,
    barberId: barberId || undefined,
    startDate,
    endDate,
    startTime: startTime || undefined,
    endTime: endTime || undefined,
    reason: reason || 'Bloqueio administrativo',
    createdAt: new Date().toISOString(),
  };

  const saved = await repo.saveBlock(newBlock);
  return c.json(saved, 201);
});

app.delete('/api/blocks/:id', async (c) => {
  const repo = getRepo(c.env);
  const id = c.req.param('id');
  const success = await repo.deleteBlock(id);
  if (!success) return c.json({ error: 'Bloqueio não encontrado.' }, 404);
  return c.json({ message: 'Bloqueio removido.' });
});

// --------------------------------------------------------------------------
// 9. CONFIGURAÇÕES (SHOP SETTINGS) & USUÁRIOS
// --------------------------------------------------------------------------
app.get('/api/settings', async (c) => {
  const repo = getRepo(c.env);
  const settings = await repo.getSettings();
  return c.json(settings);
});

app.put('/api/settings', async (c) => {
  const repo = getRepo(c.env);
  const body = await c.req.json().catch(() => ({}));
  const updated = await repo.updateSettings(body);
  return c.json(updated);
});

app.get('/api/users', async (c) => {
  const repo = getRepo(c.env);
  const users = await repo.getUsers();
  return c.json(users);
});

// --------------------------------------------------------------------------
// 10. EXPORT WORKER ENTRY POINT (fetch handler)
// --------------------------------------------------------------------------
export default {
  fetch(request: Request, env: Env, ctx: any): Response | Promise<Response> {
    return app.fetch(request, env, ctx);
  },
};
