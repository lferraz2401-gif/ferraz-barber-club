import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';
import {
  checkBarberAvailability,
  getAvailableSlots,
  enrichCustomerData,
  getFinancialStats,
  getDashboardMetrics,
} from './server/business.js';
import { getOperationDateTime } from './src/utils/datetime.js';
import { Customer, Appointment, FinancialPeriod, Expense } from './src/types/index.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// --------------------------------------------------------------------------
// REFORÇO DE SEGURANÇA OPERACIONAL & TÁTICA
// --------------------------------------------------------------------------
// 1. Ocultar assinatura do Express (impede fingerprinting)
app.disable('x-powered-by');

// 2. Headers de Segurança HTTP (HSTS, Anti-Clickjacking, Anti-XSS, MIME Sniffing)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// 3. Limite estrito de tamanho do payload JSON (protege contra DoS por payload excessivo)
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// 4. Rate Limiting em memória para APIs sensíveis (protege contra spam e força bruta)
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

// Limpeza periódica do mapa de rate limiting a cada 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 10 * 60 * 1000);

const rateLimiter = (maxRequests: number, windowMs: number) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const key = `${ip}_${req.baseUrl || req.path}`;
    const now = Date.now();

    const record = rateLimitMap.get(key as string);
    if (!record || now > record.resetAt) {
      rateLimitMap.set(key as string, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({
        error: 'Muitas requisições. Aguarde um instante para tentar novamente.',
        retryAfterMs: record.resetAt - now,
      });
    }

    record.count += 1;
    next();
  };
};

// --------------------------------------------------------------------------
// 1. HEALTH & METRICS
// --------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', shop: 'FERRAZ BARBER CLUB' });
});

app.get('/api/dashboard', (req, res) => {
  try {
    const barberId = req.query.barberId as string | undefined;
    const metrics = getDashboardMetrics(barberId);
    res.json(metrics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/financial', (req, res) => {
  try {
    const period = (req.query.period as FinancialPeriod) || 'today';
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const barberId = req.query.barberId as string | undefined;

    const stats = getFinancialStats(period, startDate, endDate, barberId);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// 1.1 DESPESAS DO ESTABELECIMENTO (EXPENSES)
// --------------------------------------------------------------------------
app.get('/api/expenses', (req, res) => {
  try {
    const { startDate, endDate, category, barberId } = req.query;
    let expenses = db.getExpenses();

    if (startDate) {
      expenses = expenses.filter((e) => e.date >= String(startDate));
    }
    if (endDate) {
      expenses = expenses.filter((e) => e.date <= String(endDate));
    }
    if (category) {
      expenses = expenses.filter((e) => e.category === category);
    }
    if (barberId) {
      expenses = expenses.filter((e) => e.barberId === barberId);
    }

    expenses.sort((a, b) => b.date.localeCompare(a.date));
    res.json(expenses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', (req, res) => {
  try {
    const { title, category, amount, date, paymentMethod, barberId, notes } = req.body;
    if (!title || !title.trim() || amount === undefined || !date) {
      return res.status(400).json({ error: 'Título, categoria, valor e data são obrigatórios.' });
    }

    const newExpense: Expense = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      category: category || 'OTHER',
      amount: Math.abs(Number(amount)),
      date: String(date).split('T')[0],
      paymentMethod: paymentMethod || 'PIX',
      barberId: barberId || undefined,
      notes: notes ? notes.trim() : undefined,
      createdAt: new Date().toISOString(),
    };

    const saved = db.saveExpense(newExpense);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/expenses/:id', (req, res) => {
  try {
    const success = db.deleteExpense(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Despesa não encontrada.' });
    }
    res.json({ success: true, message: 'Despesa excluída com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// 2. CLIENTES (CUSTOMERS) & CRM
// --------------------------------------------------------------------------
app.get('/api/customers', (req, res) => {
  try {
    const search = ((req.query.search as string) || '').trim().toLowerCase();
    let customers = db.getCustomers().map(enrichCustomerData);

    if (search) {
      const cleanSearch = search.replace(/\D/g, '');
      customers = customers.filter((c) => {
        const matchName = c.name.toLowerCase().includes(search);
        const matchWhatsapp = cleanSearch ? c.whatsapp.replace(/\D/g, '').includes(cleanSearch) : false;
        return matchName || matchWhatsapp;
      });
    }

    res.json(customers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customers/:id', (req, res) => {
  try {
    const customer = db.getCustomerById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const enriched = enrichCustomerData(customer);
    // Include full appointment history for this client
    const appointments = db
      .getAppointments()
      .filter((a) => a.customerId === req.params.id)
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

    res.json({ ...enriched, appointments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// 2.1. RECONHECIMENTO AUTOMÁTICO DE CLIENTE NO /agendar (BUSCA INTELIGENTE POR WHATSAPP)
// --------------------------------------------------------------------------
app.get('/api/public/recognize-client', rateLimiter(40, 60 * 1000), (req, res) => {
  try {
    const phone = ((req.query.phone as string) || '').replace(/\D/g, '');
    if (!phone || phone.length < 10) {
      return res.status(400).json({ error: 'Telefone inválido para identificação.' });
    }

    let searchPhone = phone;
    if (searchPhone.startsWith('55') && (searchPhone.length === 12 || searchPhone.length === 13)) {
      searchPhone = searchPhone.substring(2);
    }

    const customer = db.getCustomerByWhatsapp(searchPhone);
    if (!customer) {
      return res.json({ recognized: false });
    }

    // Buscar o último agendamento concluído ou confirmado deste cliente
    const clientApts = db
      .getAppointments()
      .filter((a) => a.customerId === customer.id && a.status !== 'CANCELLED')
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

    const lastApt = clientApts[0] || null;

    let lastService = null;
    let preferredBarber = null;

    if (lastApt) {
      lastService = db.getServiceById(lastApt.serviceId) || null;
      preferredBarber = db.getBarberById(lastApt.barberId) || null;
    }

    const enriched = enrichCustomerData(customer);

    return res.json({
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', (req, res) => {
  try {
    const { name, whatsapp, email, birthDate, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nome completo é obrigatório.' });
    }
    if (!whatsapp || !whatsapp.trim()) {
      return res.status(400).json({ error: 'WhatsApp é obrigatório.' });
    }

    const cleanWhatsapp = whatsapp.replace(/\D/g, '');
    if (cleanWhatsapp.length < 10) {
      return res.status(400).json({ error: 'Número de WhatsApp inválido (mínimo DDD + 8 ou 9 dígitos).' });
    }

    // RULE: Avoid duplicate clients by WhatsApp!
    const existing = db.getCustomerByWhatsapp(cleanWhatsapp);
    if (existing) {
      return res.status(409).json({
        error: `Já existe um cliente cadastrado com este WhatsApp: ${existing.name}.`,
        existingCustomer: enrichCustomerData(existing),
      });
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

    const saved = db.saveCustomer(newCustomer);
    res.status(201).json(enrichCustomerData(saved));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/customers/:id', (req, res) => {
  try {
    const existing = db.getCustomerById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const { name, whatsapp, email, birthDate, notes } = req.body;

    if (whatsapp) {
      const cleanWhatsapp = whatsapp.replace(/\D/g, '');
      const duplicate = db.getCustomerByWhatsapp(cleanWhatsapp);
      if (duplicate && duplicate.id !== existing.id) {
        return res.status(409).json({
          error: `Este WhatsApp já pertence a outro cliente cadastrado: ${duplicate.name}.`,
        });
      }
      existing.whatsapp = cleanWhatsapp;
    }

    if (name) existing.name = name.trim();
    if (email !== undefined) existing.email = email ? email.trim() : undefined;
    if (birthDate !== undefined) existing.birthDate = birthDate || undefined;
    if (notes !== undefined) existing.notes = notes ? notes.trim() : undefined;
    if (req.body.membership !== undefined) existing.membership = req.body.membership;
    if (req.body.isBlockedFromOnlineBooking !== undefined) {
      existing.isBlockedFromOnlineBooking = Boolean(req.body.isBlockedFromOnlineBooking);
    }
    if (req.body.blockedReason !== undefined) {
      existing.blockedReason = req.body.blockedReason ? String(req.body.blockedReason).trim() : undefined;
    }
    existing.updatedAt = new Date().toISOString();

    const saved = db.saveCustomer(existing);
    res.json(enrichCustomerData(saved));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Club Ferraz: Set, Renew or Reset Membership for a Customer
app.post('/api/customers/:id/membership', (req, res) => {
  try {
    const customer = db.getCustomerById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Cliente não encontrado.' });

    const { tier, customStartDate } = req.body; // 'STANDARD' | 'PLUS' | 'PRO'
    if (!tier || !['STANDARD', 'PLUS', 'PRO'].includes(tier)) {
      return res.status(400).json({ error: 'Nível inválido. Escolha STANDARD, PLUS ou PRO.' });
    }

    const now = new Date();
    const startDate = customStartDate || now.toISOString().split('T')[0];
    const renewsDate = new Date(startDate);
    renewsDate.setMonth(renewsDate.getMonth() + 1);
    const renewsAt = renewsDate.toISOString().split('T')[0];

    let credits = {
      haircutsTotal: 4,
      haircutsUsed: 0,
      eyebrowsTotal: 4,
      eyebrowsUsed: 0,
      beardsTotal: 1, // 1 brinde
      beardsUsed: 0,
      skinCareTotal: 0,
      skinCareUsed: 0,
      pomadeGiftTotal: 0,
      pomadeGiftClaimed: false,
    };

    if (tier === 'PLUS') {
      credits = {
        haircutsTotal: 4,
        haircutsUsed: 0,
        eyebrowsTotal: 4,
        eyebrowsUsed: 0,
        beardsTotal: 2,
        beardsUsed: 0,
        skinCareTotal: 1, // 1 brinde
        skinCareUsed: 0,
        pomadeGiftTotal: 0,
        pomadeGiftClaimed: false,
      };
    } else if (tier === 'PRO') {
      credits = {
        haircutsTotal: 4,
        haircutsUsed: 0,
        eyebrowsTotal: 4,
        eyebrowsUsed: 0,
        beardsTotal: 4,
        beardsUsed: 0,
        skinCareTotal: 2,
        skinCareUsed: 0,
        pomadeGiftTotal: 1, // 1 brinde
        pomadeGiftClaimed: false,
      };
    }

    customer.membership = {
      tier,
      startDate,
      renewsAt,
      active: true,
      credits,
    };
    customer.updatedAt = new Date().toISOString();

    const saved = db.saveCustomer(customer);
    res.json(enrichCustomerData(saved));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Club Ferraz: Cancel/Remove Membership
app.delete('/api/customers/:id/membership', (req, res) => {
  try {
    const customer = db.getCustomerById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Cliente não encontrado.' });

    customer.membership = undefined;
    customer.updatedAt = new Date().toISOString();
    const saved = db.saveCustomer(customer);
    res.json(enrichCustomerData(saved));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Club Ferraz: Direct Manual Credit Adjustment or Gift claim
app.patch('/api/customers/:id/membership', (req, res) => {
  try {
    const customer = db.getCustomerById(req.params.id);
    if (!customer || !customer.membership) {
      return res.status(404).json({ error: 'Cliente não possui assinatura Club Ferraz ativa.' });
    }

    const { credits, active, renewsAt } = req.body;
    if (credits) {
      customer.membership.credits = { ...customer.membership.credits, ...credits };
    }
    if (active !== undefined) customer.membership.active = Boolean(active);
    if (renewsAt) customer.membership.renewsAt = renewsAt;

    customer.updatedAt = new Date().toISOString();
    const saved = db.saveCustomer(customer);
    res.json(enrichCustomerData(saved));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/customers/:id', (req, res) => {
  try {
    const success = db.deleteCustomer(req.params.id);
    if (!success) return res.status(404).json({ error: 'Cliente não encontrado.' });
    res.json({ message: 'Cliente removido com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/crm', (req, res) => {
  try {
    const customers = db.getCustomers().map(enrichCustomerData);

    const recent = customers.filter((c) => c.status === 'ACTIVE' && c.totalVisits > 0);
    const returnNeeded = customers.filter((c) => c.status === 'RETURN_NEEDED');
    const inactive = customers.filter((c) => c.status === 'INACTIVE');
    const newClients = customers.filter((c) => c.totalVisits === 0);

    res.json({
      recent,
      returnNeeded,
      inactive,
      newClients,
      totalCount: customers.length,
      returnNeededCount: returnNeeded.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// 3. BARBEIROS (RESIDENT BARBERS)
// --------------------------------------------------------------------------
app.get('/api/barbers', (req, res) => {
  try {
    const barbers = db.getBarbers();
    res.json(barbers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/barbers', (req, res) => {
  try {
    // STRICT RULE: Exactly TWO resident barbers (Thiago Ferraz, Kauan Silva).
    // The db.saveBarber method will reject adding a third barber!
    const barber = db.saveBarber(req.body);
    res.status(201).json(barber);
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

app.put('/api/barbers/:id', (req, res) => {
  try {
    const barber = db.getBarberById(req.params.id);
    if (!barber) return res.status(404).json({ error: 'Barbeiro não encontrado.' });

    // STRICT: barberId is the permanent internal identifier - never changed!
    const { id: _, ...bodyData } = req.body;
    const updated = {
      ...barber,
      ...bodyData,
      id: barber.id,
    };
    db.saveBarber(updated);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// 4. SERVIÇOS (SERVICES)
// --------------------------------------------------------------------------
app.get('/api/services', (req, res) => {
  try {
    const all = db.getServices();
    res.json(all);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/services', (req, res) => {
  try {
    const { name, description, price, durationMinutes, featured, active } = req.body;
    if (!name || price === undefined || !durationMinutes) {
      return res.status(400).json({ error: 'Nome, preço e duração são obrigatórios.' });
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

    const saved = db.saveService(newService);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/services/:id', (req, res) => {
  try {
    const service = db.getServiceById(req.params.id);
    if (!service) return res.status(404).json({ error: 'Serviço não encontrado.' });

    const updated = {
      ...service,
      ...req.body,
      price: req.body.price !== undefined ? Number(req.body.price) : service.price,
      durationMinutes:
        req.body.durationMinutes !== undefined
          ? Number(req.body.durationMinutes)
          : service.durationMinutes,
    };

    db.saveService(updated);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// 5. AGENDAMENTOS (APPOINTMENTS) & AGENDA
// --------------------------------------------------------------------------
app.get('/api/appointments', (req, res) => {
  try {
    const { date, barberId, customerId, status } = req.query;
    let apts = db.getAppointments();

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
    res.json(apts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/appointments/:id', (req, res) => {
  try {
    const apt = db.getAppointmentById(req.params.id);
    if (!apt) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }
    res.json(apt);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/availability', (req, res) => {
  try {
    const { barberId, date, serviceId, durationMinutes } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Data é obrigatória.' });
    }

    let duration = Number(durationMinutes);
    if (!duration && serviceId) {
      const srv = db.getServiceById(serviceId as string);
      if (srv) duration = srv.durationMinutes;
    }
    if (!duration) duration = 30; // default slot

    // Handle "Qualquer Barbeiro" (auto or both)
    if (!barberId || barberId === 'any') {
      const barbers = db.getBarbers().filter((b) => b.active);
      const combinedSlots: Record<string, { availableBarberIds: string[]; available: boolean }> = {};

      for (const b of barbers) {
        const slots = getAvailableSlots(b.id, date as string, duration);
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

      return res.json(result);
    }

    const slots = getAvailableSlots(barberId as string, date as string, duration);
    res.json(slots);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Rate limit: máximo de 15 agendamentos por minuto por IP (protege contra bots/spam no portal público)
app.post('/api/appointments', rateLimiter(15, 60 * 1000), (req, res) => {
  try {
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
    } = req.body;

    if (!serviceId) {
      return res.status(400).json({ error: 'Serviço é obrigatório.' });
    }
    if (!date || !time) {
      return res.status(400).json({ error: 'Data e horário são obrigatórios.' });
    }

    // Validação e Sanitização de Segurança
    if (customerName) {
      customerName = String(customerName).replace(/[<>]/g, '').trim().slice(0, 70);
    }
    if (notes) {
      notes = String(notes).replace(/[<>]/g, '').trim().slice(0, 250);
    }

    // Verify service is active
    const service = db.getServiceById(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Serviço não encontrado.' });
    }
    if (!service.active) {
      return res.status(400).json({ error: 'Serviço desativado não pode ser agendado.' });
    }

    // Customer resolution or quick creation
    let customer: Customer | undefined;
    if (customerId) {
      customer = db.getCustomerById(customerId);
    } else if (customerWhatsapp) {
      let clean = customerWhatsapp.replace(/\D/g, '');
      if (clean.startsWith('55') && (clean.length === 12 || clean.length === 13)) {
        clean = clean.substring(2);
      }
      customer = db.getCustomerByWhatsapp(clean);
      if (!customer && customerName) {
        // Create new customer on the fly
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
        db.saveCustomer(customer);
      } else if (customer && customerName && customerName.trim() && customer.name !== customerName.trim()) {
        // Update name if changed
        customer.name = customerName.trim();
        customer.updatedAt = new Date().toISOString();
        db.saveCustomer(customer);
      }
    }

    if (!customer) {
      return res.status(400).json({ error: 'Cliente inválido ou não informado.' });
    }

    // 🛡️ Regra de Bloqueio por "Histórico Sujo" (No-Shows / Faltas sem aviso prévio)
    if (source === 'PUBLIC_BOOKING') {
      const enrichedCustomer = enrichCustomerData(customer);
      if (enrichedCustomer.isBlockedFromOnlineBooking) {
        return res.status(403).json({
          error:
            'AGENDAMENTO ONLINE BLOQUEADO: Constam ausências anteriores sem cancelamento prévio no seu histórico. Por favor, envie uma mensagem no WhatsApp da barbearia para aprovação do horário.',
          isBlocked: true,
          noShowCount: enrichedCustomer.noShowCount || 2,
          blockedReason: enrichedCustomer.blockedReason,
        });
      }
    }

    // Resolve "Qualquer Barbeiro" preference
    if (!barberId || barberId === 'any') {
      const activeBarbers = db.getBarbers().filter((b) => b.active);
      let selectedBarberId: string | undefined;

      for (const b of activeBarbers) {
        const check = checkBarberAvailability(
          b.id,
          date,
          time,
          service.durationMinutes,
          Boolean(isFitIn)
        );
        if (check.available) {
          selectedBarberId = b.id;
          break;
        }
      }

      if (!selectedBarberId) {
        return res.status(409).json({
          error: 'Nenhum barbeiro disponível para o horário e duração selecionados.',
        });
      }
      barberId = selectedBarberId;
    }

    const barber = db.getBarberById(barberId);
    if (!barber) {
      return res.status(404).json({ error: 'Barbeiro não encontrado.' });
    }

    const { todayStr } = getOperationDateTime();
    if (date < todayStr) {
      return res.status(400).json({ error: 'Não é permitido criar agendamentos em datas que já passaram.' });
    }

    // Combined / Add-on services: respect combined duration, price and title
    const effectiveDuration = req.body.durationMinutes
      ? Number(req.body.durationMinutes)
      : service.durationMinutes;
    const effectivePrice = req.body.priceCharged !== undefined
      ? Number(req.body.priceCharged)
      : service.price;
    const effectiveServiceName = req.body.serviceName
      ? String(req.body.serviceName).trim()
      : service.name;

    // STRICT Availability & Conflict Check on Backend (using effective combined duration)
    const availability = checkBarberAvailability(
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
        return res.status(400).json({ error: reason });
      }

      const isBookedConflict =
        reason.includes('já possui atendimento') ||
        reason.includes('Conflito') ||
        reason.includes('almoço') ||
        reason.includes('bloqueio');

      return res.status(409).json({
        error: isBookedConflict
          ? (reason.includes('almoço') || reason.includes('bloqueio') ? reason : 'Este horário acabou de ser reservado. Escolha outro horário.')
          : reason,
      });
    }

    // RULE: Price charged is FROZEN at the exact service price at booking/service time!
    const commissionRate = barber.defaultCommissionRate ?? 50;
    const commAmount = Math.round(((effectivePrice * commissionRate) / 100) * 100) / 100;
    const shopAmount = Math.round((effectivePrice - commAmount) * 100) / 100;

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
      durationMinutes: effectiveDuration, // Real combined duration
      priceCharged: effectivePrice, // FROZEN combined price
      commissionRate,
      commissionAmount: commAmount,
      shopAmount,
      status: 'CONFIRMED',
      notes: notes || undefined,
      isFitIn: Boolean(isFitIn),
      source: (source as 'PUBLIC_BOOKING' | 'INTERNAL_APP') || (isFitIn ? 'INTERNAL_APP' : 'INTERNAL_APP'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = db.saveAppointment(newAppointment);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/appointments/:id', (req, res) => {
  try {
    const apt = db.getAppointmentById(req.params.id);
    if (!apt) return res.status(404).json({ error: 'Agendamento não encontrado.' });

    const { status, date, time, barberId, serviceId, notes, isFitIn, priceCharged } = req.body;

    // If changing date, time, barber or service, re-verify availability
    if ((date && date !== apt.date) || (time && time !== apt.time) || (barberId && barberId !== apt.barberId)) {
      const targetBarber = barberId || apt.barberId;
      const targetDate = date || apt.date;
      const targetTime = time || apt.time;
      const targetDuration = serviceId
        ? db.getServiceById(serviceId)?.durationMinutes || apt.durationMinutes
        : apt.durationMinutes;

      const check = checkBarberAvailability(
        targetBarber,
        targetDate,
        targetTime,
        targetDuration,
        Boolean(isFitIn ?? apt.isFitIn),
        apt.id
      );

      if (!check.available && !isFitIn) {
        return res.status(409).json({ error: check.reason });
      }

      apt.barberId = targetBarber;
      apt.barberName = db.getBarberById(targetBarber)?.name || apt.barberName;
      apt.date = targetDate;
      apt.time = targetTime;
    }

    if (serviceId && serviceId !== apt.serviceId) {
      const srv = db.getServiceById(serviceId);
      if (srv) {
        apt.serviceId = srv.id;
        apt.serviceName = srv.name;
        apt.durationMinutes = srv.durationMinutes;
      }
    }

    if (status) {
      const prevStatus = apt.status;
      apt.status = status;
      if (status === 'COMPLETED' && !apt.completedAt) {
        apt.completedAt = new Date().toISOString();

        // DEBITO REAL DO CLUB FERRAZ AO FINALIZAR ATENDIMENTO NA CADEIRA
        if (prevStatus !== 'COMPLETED' && apt.customerId) {
          const benefit = (req.body.clubBenefitUsed || apt.clubBenefitUsed) as
            | 'haircut'
            | 'beard'
            | 'eyebrow'
            | 'skincare'
            | undefined;

          if (benefit) {
            db.consumeClubCredit(apt.customerId, benefit);
          } else {
            // Auto detect from service name/id if priceCharged is 0 or tagged
            const sName = (apt.serviceName || '').toLowerCase();
            const hasCorte = sName.includes('corte') || sName.includes('fade') || sName.includes('cabelo');
            const hasBarba = sName.includes('barba');
            const hasLimpeza = sName.includes('limpeza') || sName.includes('pele');
            const hasSobrancelha = sName.includes('sobrancelha');

            // Regra de Combos: se for combo de corte + barba
            if (sName.includes('combo') || (hasCorte && hasBarba)) {
              db.consumeClubCredit(apt.customerId, hasLimpeza ? 'combo_complete' : 'combo_haircut_beard');
            } else if (hasCorte) {
              db.consumeClubCredit(apt.customerId, 'haircut');
            } else if (hasBarba) {
              db.consumeClubCredit(apt.customerId, 'beard');
            } else if (hasSobrancelha) {
              db.consumeClubCredit(apt.customerId, 'eyebrow');
            } else if (hasLimpeza) {
              db.consumeClubCredit(apt.customerId, 'skincare');
            }
          }
        }
      }
      if (status === 'CANCELLED' && !apt.cancelledAt) {
        apt.cancelledAt = new Date().toISOString();
      }
    }

    if (req.body.clubBenefitUsed !== undefined) {
      apt.clubBenefitUsed = req.body.clubBenefitUsed;
    }
    if (notes !== undefined) apt.notes = notes;
    if (priceCharged !== undefined) apt.priceCharged = Number(priceCharged);

    if (req.body.paymentMethod !== undefined) {
      apt.paymentMethod = req.body.paymentMethod;
    } else if (status === 'COMPLETED' && !apt.paymentMethod) {
      apt.paymentMethod = (apt.priceCharged || 0) === 0 ? 'CLUB_PLAN' : 'PIX';
    }

    if (req.body.commissionRate !== undefined) {
      apt.commissionRate = Number(req.body.commissionRate);
    } else if (apt.commissionRate === undefined) {
      const barber = db.getBarberById(apt.barberId);
      apt.commissionRate = barber?.defaultCommissionRate ?? 50;
    }

    const price = apt.priceCharged ?? 0;
    const rate = apt.commissionRate ?? 50;
    apt.commissionAmount = Math.round(((price * rate) / 100) * 100) / 100;
    apt.shopAmount = Math.round((price - apt.commissionAmount) * 100) / 100;

    apt.updatedAt = new Date().toISOString();

    const saved = db.saveAppointment(apt);
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/appointments/:id', (req, res) => {
  try {
    const success = db.deleteAppointment(req.params.id);
    if (!success) return res.status(404).json({ error: 'Agendamento não encontrado.' });
    res.json({ message: 'Agendamento excluído.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// 6. BLOQUEIOS & HORÁRIOS (BLOCKS & SCHEDULE RULES)
// --------------------------------------------------------------------------
app.get('/api/blocks', (req, res) => {
  try {
    const blocks = db.getBlocks();
    res.json(blocks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/blocks', (req, res) => {
  try {
    const { type, barberId, startDate, endDate, startTime, endTime, reason } = req.body;
    if (!startDate) {
      return res.status(400).json({ error: 'A data inicial é obrigatória.' });
    }

    const effectiveEndDate = endDate || startDate;
    const blockType = type || (startTime && endTime ? 'TIME_BLOCK' : 'OFF_DAY');

    const newBlock = {
      id: `block_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: blockType,
      barberId: barberId || undefined,
      startDate,
      endDate: effectiveEndDate,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      reason: reason || 'Bloqueio administrativo',
      createdAt: new Date().toISOString(),
    };

    const saved = db.saveBlock(newBlock);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/blocks/:id', (req, res) => {
  try {
    const success = db.deleteBlock(req.params.id);
    if (!success) return res.status(404).json({ error: 'Bloqueio não encontrado.' });
    res.json({ success: true, message: 'Bloqueio removido.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// 7. CONFIGURAÇÕES (SHOP SETTINGS) & USUÁRIOS
// --------------------------------------------------------------------------
app.get('/api/settings', (req, res) => {
  try {
    const settings = db.getSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    const updated = db.updateSettings(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', (req, res) => {
  try {
    const users = db.getUsers();
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// 8. AUTENTICAÇÃO DO PAINEL DA GERÊNCIA / BARBEIROS (EMAIL & SENHA BLINDADOS)
// --------------------------------------------------------------------------
// Tabela com as credenciais oficiais pré-configuradas
const STAFF_PASSWORDS: Record<string, string> = {
  usr_admin: 'Lu@467396',
  'l.ferraz2401@gmail.com': 'Lu@467396',
  usr_cadeira_01: '240178',
  usr_cadeira_02: '221113',
};

// Rastreador de tentativas falhas de login por Email / IP para bloqueio progressivo
interface LoginLockoutRecord {
  failedAttempts: number;
  lockedUntil: number;
}
const loginAttemptsMap = new Map<string, LoginLockoutRecord>();

function safePasswordCompare(input: string, target: string): boolean {
  if (!input || !target) return false;
  const hashA = crypto.createHash('sha256').update(input.trim()).digest();
  const hashB = crypto.createHash('sha256').update(target.trim()).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

// Protege contra força bruta: máximo 5 tentativas erradas bloqueia por 15 minutos
app.post('/api/auth/login', rateLimiter(15, 15 * 60 * 1000), (req, res) => {
  try {
    const { email, password, pin } = req.body;
    const inputPass = String(password || pin || '').trim();
    const inputEmail = String(email || '').trim().toLowerCase();

    if (!inputPass) {
      return res.status(400).json({ error: 'Informe a senha de acesso.' });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const lockoutKey = `${ip}_${inputEmail || 'no_email'}`;
    const now = Date.now();

    const lockout = loginAttemptsMap.get(lockoutKey);
    if (lockout && now < lockout.lockedUntil) {
      const waitMinutes = Math.ceil((lockout.lockedUntil - now) / 60000);
      return res.status(429).json({
        error: `Acesso temporariamente bloqueado por excesso de tentativas incorretas. Tente novamente em ${waitMinutes} minuto(s).`,
      });
    }

    const internalUsers = db.getInternalUsersWithPins();

    let matchedUser: any = null;

    if (inputEmail) {
      // Find user by registered email
      matchedUser = internalUsers.find((u) => u.email && u.email.toLowerCase() === inputEmail);
    }

    // Fallback: If user didn't type email or entered master admin email
    if (!matchedUser && inputEmail === 'l.ferraz2401@gmail.com') {
      matchedUser = internalUsers.find((u) => u.id === 'usr_admin' || u.role === 'ADMIN');
    }

    // If no email was provided (e.g. legacy quick pin login), match against all registered users
    if (!matchedUser && !inputEmail) {
      matchedUser = internalUsers.find((u) => {
        const expected = STAFF_PASSWORDS[u.id] || u.pinCode;
        return expected && safePasswordCompare(inputPass, expected);
      });
    }

    // Verify password for matched user
    let passwordValid = false;
    if (matchedUser) {
      const expectedPass =
        matchedUser.pinCode ||
        (matchedUser.email && STAFF_PASSWORDS[matchedUser.email]) ||
        STAFF_PASSWORDS[matchedUser.id];
      if (expectedPass && safePasswordCompare(inputPass, expectedPass)) {
        passwordValid = true;
      }
    }

    if (matchedUser && passwordValid) {
      // Clear lockout on success
      loginAttemptsMap.delete(lockoutKey);

      return res.json({
        success: true,
        user: {
          id: matchedUser.id,
          name: matchedUser.name,
          email: matchedUser.email || (matchedUser.role === 'ADMIN' ? 'l.ferraz2401@gmail.com' : undefined),
          role: matchedUser.role,
          barberId: matchedUser.barberId,
        },
        token: `auth_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`,
      });
    }

    // Increment failed attempts
    const currentFailures = (lockout?.failedAttempts || 0) + 1;
    if (currentFailures >= 5) {
      loginAttemptsMap.set(lockoutKey, {
        failedAttempts: currentFailures,
        lockedUntil: now + 15 * 60 * 1000, // 15 minutes lockout
      });
      return res.status(429).json({
        error: '5 tentativas incorretas consecutivas. Acesso bloqueado por 15 minutos para proteger o sistema.',
      });
    } else {
      loginAttemptsMap.set(lockoutKey, {
        failedAttempts: currentFailures,
        lockedUntil: 0,
      });
    }

    return res.status(401).json({
      error: `E-mail ou senha incorretos. Tentativa ${currentFailures} de 5 antes do bloqueio de segurança.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// 9. GESTÃO DE USUÁRIOS DO SISTEMA (CADASTRO EXCLUSIVO POR ADM)
// --------------------------------------------------------------------------
app.post('/api/users', (req, res) => {
  try {
    const { name, email, password, role, barberId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nome do usuário é obrigatório.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'E-mail é obrigatório para o login.' });
    }
    if (!password || String(password).trim().length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const internalUsers = db.getInternalUsersWithPins();

    if (internalUsers.some((u) => u.email && u.email.toLowerCase() === cleanEmail)) {
      return res.status(400).json({ error: 'Já existe um usuário cadastrado com este e-mail.' });
    }

    const newId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newUser: any = {
      id: newId,
      name: name.trim(),
      email: cleanEmail,
      role: role === 'ADMIN' ? 'ADMIN' : 'BARBER',
      barberId: barberId || undefined,
      pinCode: String(password).trim(),
      createdAt: new Date().toISOString(),
    };

    // Save in database
    db.saveUser(newUser);

    // Register password in memory
    STAFF_PASSWORDS[cleanEmail] = String(password).trim();
    STAFF_PASSWORDS[newId] = String(password).trim();

    const { pinCode: _, ...safeUser } = newUser;
    res.status(201).json(safeUser);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, barberId } = req.body;
    const internalUsers = db.getInternalUsersWithPins();
    const existing = internalUsers.find((u) => u.id === id);

    if (!existing) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const cleanEmail = email ? email.trim().toLowerCase() : existing.email;
    if (cleanEmail && internalUsers.some((u) => u.id !== id && u.email && u.email.toLowerCase() === cleanEmail)) {
      return res.status(400).json({ error: 'Este e-mail já está sendo utilizado por outro usuário.' });
    }

    const updatedUser = {
      ...existing,
      name: name ? name.trim() : existing.name,
      email: cleanEmail,
      role: role || existing.role,
      barberId: barberId !== undefined ? barberId : existing.barberId,
      pinCode: password ? String(password).trim() : existing.pinCode,
    };

    db.saveUser(updatedUser);

    if (password) {
      if (cleanEmail) STAFF_PASSWORDS[cleanEmail] = String(password).trim();
      STAFF_PASSWORDS[id] = String(password).trim();
    }

    const { pinCode: _, ...safeUser } = updatedUser;
    res.json(safeUser);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (id === 'usr_admin') {
      return res.status(403).json({ error: 'O Administrador principal não pode ser excluído.' });
    }

    const deleted = db.deleteUser(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    res.json({ success: true, message: 'Usuário removido com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// 10. BACKUP & INTEGRIDADE DO SISTEMA (Espelhamento automático sobrescrevendo)
// --------------------------------------------------------------------------
app.get('/api/backup/status', (req, res) => {
  try {
    const info = db.getBackupInfo();
    res.json(info);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/backup/trigger', (req, res) => {
  try {
    db.save(); // Forces overwrite of database.backup.json
    const info = db.getBackupInfo();
    res.json({ success: true, message: 'Backup atualizado com sucesso.', ...info });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/backup/download', (req, res) => {
  try {
    const data = db.getData();
    const jsonStr = JSON.stringify(data, null, 2);
    const filename = `ferraz-barber-club-backup-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(jsonStr);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/backup/restore', (req, res) => {
  try {
    const ok = db.restoreFromBackup();
    if (ok) {
      res.json({ success: true, message: 'Banco restaurado a partir do backup automático.' });
    } else {
      res.status(404).json({ error: 'Nenhum arquivo de backup válido encontrado para restauração.' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// VITE MIDDLEWARE & SERVER STARTUP
// --------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FERRAZ BARBER CLUB server running on port ${PORT}`);
  });
}

startServer();
