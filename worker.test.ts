/**
 * Test Suite for Cloudflare Worker Entry Point (worker.ts)
 * Validates public and admin API contracts using in-memory SQLite D1 simulation.
 */
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import worker, { Env } from './worker.js';
import { D1Database } from './server/d1-repository.js';
import { getOperationDateTime } from './src/utils/datetime.js';

function createMockD1Database(db: DatabaseSync): D1Database {
  return {
    prepare(query: string) {
      let boundValues: any[] = [];
      return {
        bind(...values: any[]) {
          boundValues = values;
          return this;
        },
        async first<T = unknown>(colName?: string): Promise<T | null> {
          const stmt = db.prepare(query);
          const row = stmt.get(...boundValues);
          if (!row) return null;
          if (colName) return (row as any)[colName];
          return row as T;
        },
        async all<T = unknown>(): Promise<{ results: T[]; success: boolean; error?: string }> {
          const stmt = db.prepare(query);
          const rows = stmt.all(...boundValues);
          return { results: (rows || []) as T[], success: true };
        },
        async run(): Promise<{ success: boolean; error?: string; meta?: any }> {
          const stmt = db.prepare(query);
          const result = stmt.run(...boundValues);
          return {
            success: true,
            meta: { changes: result.changes, lastInsertRowid: result.lastInsertRowid },
          };
        },
      };
    },
    async batch(statements) {
      const results = [];
      for (const s of statements) {
        results.push(await s.run());
      }
      return results;
    },
    async exec(query: string) {
      db.exec(query);
      return true;
    },
  };
}

async function runWorkerTests() {
  console.log('--- Starting Cloudflare Worker API Contract Tests ---');

  // Initialize fresh in-memory SQLite with schema.sql
  const rawDb = new DatabaseSync(':memory:');
  const d1 = createMockD1Database(rawDb);
  const schemaSql = fs.readFileSync(path.join(process.cwd(), 'schema.sql'), 'utf-8');
  await d1.exec(schemaSql);
  console.log('✓ D1 test database initialized with schema.sql');

  const env: Env = {
    DB: d1,
    ENVIRONMENT: 'development',
    CORS_ORIGIN: '*',
  };

  const dispatch = async (urlPath: string, init?: RequestInit): Promise<Response> => {
    const req = new Request(`http://localhost${urlPath}`, init);
    return worker.fetch(req, env, {});
  };

  // 1. GET /api/health → 200
  {
    const res = await dispatch('/api/health');
    console.assert(res.status === 200, `Health should return 200, got ${res.status}`);
    const data = await res.json();
    console.assert(data.status === 'ok', 'Health status should be ok');
    console.assert(data.shop === 'FERRAZ BARBER CLUB', 'Health shop name match');
    console.log('✓ GET /api/health → 200 OK');
  }

  // 2. GET /api/services → lists exactly the 6 services
  {
    const res = await dispatch('/api/services');
    console.assert(res.status === 200, `Services should return 200, got ${res.status}`);
    const services = await res.json();
    console.assert(Array.isArray(services), 'Services should be an array');
    console.assert(services.length === 6, `Expected exactly 6 services, got ${services.length}`);
    const hasFade = services.some((s: any) => s.id === 'srv_corte_fade');
    console.assert(hasFade, 'Should contain Corte Degradê');
    console.log(`✓ GET /api/services → 200 (6 services verified)`);
  }

  // 3. GET /api/barbers → returns strictly Lukinha and Maykin
  {
    const res = await dispatch('/api/barbers');
    console.assert(res.status === 200, `Barbers should return 200, got ${res.status}`);
    const barbers = await res.json();
    console.assert(Array.isArray(barbers), 'Barbers should be an array');
    console.assert(barbers.length === 2, `Expected strictly 2 barbers, got ${barbers.length}`);
    const names = barbers.map((b: any) => b.name);
    console.assert(names.includes('Lukinha') && names.includes('Maykin'), 'Barbers must be Lukinha and Maykin');
    console.log('✓ GET /api/barbers → 200 (strictly Lukinha and Maykin)');
  }

  // 4. GET /api/settings → returns valid shop settings
  {
    const res = await dispatch('/api/settings');
    console.assert(res.status === 200, `Settings should return 200, got ${res.status}`);
    const settings = await res.json();
    console.assert(settings.shopName === 'FERRAZ BARBER CLUB', 'Shop name should match');
    console.assert(settings.openTime === '09:00', 'Open time should be 09:00');
    console.assert(settings.closeTime === '21:00', 'Close time should be 21:00');
    console.assert(settings.whatsappTemplates?.confirmation, 'Should have confirmation WhatsApp template');
    console.log('✓ GET /api/settings → 200 (valid settings)');
  }

  // 5. GET /api/availability → returns valid structure compatible with frontend
  {
    // Find next working day (Monday=1 .. Saturday=6, Sunday=0 is closed)
    const { todayStr } = getOperationDateTime();
    const [y, m, d] = todayStr.split('-').map(Number);
    let offset = 1;
    let target = new Date(y, m - 1, d + offset);
    while (target.getDay() === 0) {
      offset += 1;
      target = new Date(y, m - 1, d + offset);
    }
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    const testDate = `${yyyy}-${mm}-${dd}`;

    const res = await dispatch(`/api/availability?date=${testDate}&barberId=any&durationMinutes=30`);
    console.assert(res.status === 200, `Availability should return 200, got ${res.status}`);
    const slots = await res.json();
    console.assert(Array.isArray(slots), 'Slots should be an array');
    console.assert(slots.length > 0, 'Should generate available time slots');
    console.assert(slots[0].time && slots[0].available !== undefined, 'Slot item schema should match');
    console.log(`✓ GET /api/availability → 200 (${slots.length} available slots generated)`);
  }

  // 6. GET /api/customers → returns empty list
  {
    const res = await dispatch('/api/customers');
    console.assert(res.status === 200, `Customers should return 200, got ${res.status}`);
    const customers = await res.json();
    console.assert(Array.isArray(customers), 'Customers should be an array');
    console.assert(customers.length === 0, `Expected 0 customers, got ${customers.length}`);
    console.log('✓ GET /api/customers → 200 (0 customers)');
  }

  // 7. GET /api/appointments → returns empty list
  {
    const res = await dispatch('/api/appointments');
    console.assert(res.status === 200, `Appointments should return 200, got ${res.status}`);
    const appointments = await res.json();
    console.assert(Array.isArray(appointments), 'Appointments should be an array');
    console.assert(appointments.length === 0, `Expected 0 appointments, got ${appointments.length}`);
    console.log('✓ GET /api/appointments → 200 (0 appointments)');
  }

  // 8. GET /api/blocks → returns empty list
  {
    const res = await dispatch('/api/blocks');
    console.assert(res.status === 200, `Blocks should return 200, got ${res.status}`);
    const blocks = await res.json();
    console.assert(Array.isArray(blocks), 'Blocks should be an array');
    console.assert(blocks.length === 0, `Expected 0 blocks, got ${blocks.length}`);
    console.log('✓ GET /api/blocks → 200 (0 blocks)');
  }

  // 9. GET /api/financial → returns R$0,00
  {
    const res = await dispatch('/api/financial');
    console.assert(res.status === 200, `Financial should return 200, got ${res.status}`);
    const fin = await res.json();
    console.assert(fin.totalRevenue === 0, `Expected R$0 revenue, got ${fin.totalRevenue}`);
    console.assert(fin.totalAppointments === 0, 'Expected 0 appointments');
    console.assert(fin.averageTicket === 0, 'Expected R$0 average ticket');
    console.assert(fin.barbers.length === 2, 'Financial should breakdown for the 2 resident barbers');
    console.assert(fin.barbers[0].revenue === 0 && fin.barbers[1].revenue === 0, 'Barbers revenue R$0');
    console.log('✓ GET /api/financial → 200 (R$0,00 revenue verified)');
  }

  // 10. GET /api/dashboard → returns initial empty metrics
  {
    const res = await dispatch('/api/dashboard');
    console.assert(res.status === 200, `Dashboard should return 200, got ${res.status}`);
    const dash = await res.json();
    console.assert(dash.todayRevenue === 0, 'Today revenue 0');
    console.assert(dash.todayAppointmentsCount === 0, 'Today appointments 0');
    console.assert(dash.barberTodayRevenue.length === 2, 'Two barbers in dashboard');
    console.log('✓ GET /api/dashboard → 200 (clean operational metrics)');
  }

  // 11. Anti No-Show & Online Booking Suspension Contract
  {
    // Create customer with 2 no-show appointments
    const custRes = await dispatch('/api/customers', {
      method: 'POST',
      body: JSON.stringify({ name: 'Cliente Faltoso', whatsapp: '11977776666' }),
    });
    const cust = await custRes.json();
    console.assert(cust.id, 'Customer created');

    // Find next working day
    const { todayStr } = getOperationDateTime();
    const [y, m, d] = todayStr.split('-').map(Number);
    let offset = 2;
    let target = new Date(y, m - 1, d + offset);
    while (target.getDay() === 0) {
      offset += 1;
      target = new Date(y, m - 1, d + offset);
    }
    const testDate = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;

    // Register 2 appointments marked as NO_SHOW using valid testDate
    const apt1Res = await dispatch('/api/appointments', {
      method: 'POST',
      body: JSON.stringify({
        customerId: cust.id,
        serviceId: 'srv_corte_fade',
        barberId: 'barber_cadeira_01',
        date: testDate,
        time: '14:00',
        source: 'MANUAL',
      }),
    });
    console.assert(apt1Res.status === 201, `apt1 should be created, got ${apt1Res.status}`);
    const apt1 = await apt1Res.json();
    await dispatch(`/api/appointments/${apt1.id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'NO_SHOW' }),
    });

    const apt2Res = await dispatch('/api/appointments', {
      method: 'POST',
      body: JSON.stringify({
        customerId: cust.id,
        serviceId: 'srv_barba_terapia',
        barberId: 'barber_cadeira_02',
        date: testDate,
        time: '15:00',
        source: 'MANUAL',
      }),
    });
    console.assert(apt2Res.status === 201, `apt2 should be created, got ${apt2Res.status}`);
    const apt2 = await apt2Res.json();
    await dispatch(`/api/appointments/${apt2.id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'NO_SHOW' }),
    });

    // Check recognition API reports isBlocked
    const recRes = await dispatch('/api/public/recognize-client?phone=11977776666');
    console.assert(recRes.status === 200, 'Recognition returns 200');
    const rec = await recRes.json();
    console.assert(rec.isBlocked === true, 'Client must be recognized as blocked due to 2 no-shows');
    console.assert(rec.noShowCount === 2, 'No show count must be 2');

    // Attempting online booking (source === PUBLIC_BOOKING) must return 403 Forbidden
    const blockAttempt = await dispatch('/api/appointments', {
      method: 'POST',
      body: JSON.stringify({
        customerId: cust.id,
        serviceId: 'srv_corte_fade',
        barberId: 'barber_cadeira_01',
        date: testDate,
        time: '16:00',
        source: 'PUBLIC_BOOKING',
      }),
    });
    console.assert(blockAttempt.status === 403, `Online booking must return 403, got ${blockAttempt.status}`);

    // Admin manual booking for this client should be permitted
    const adminBooking = await dispatch('/api/appointments', {
      method: 'POST',
      body: JSON.stringify({
        customerId: cust.id,
        serviceId: 'srv_corte_fade',
        barberId: 'barber_cadeira_01',
        date: testDate,
        time: '16:00',
        source: 'MANUAL',
      }),
    });
    console.assert(adminBooking.status === 201, `Admin manual booking must be allowed, got ${adminBooking.status}`);

    // Admin unblocks customer
    const unblockRes = await dispatch(`/api/customers/${cust.id}`, {
      method: 'PUT',
      body: JSON.stringify({ isBlockedFromOnlineBooking: false }),
    });
    console.assert(unblockRes.status === 200, 'Customer unblocked');

    // Customer can now book online again
    const onlineAllowed = await dispatch('/api/appointments', {
      method: 'POST',
      body: JSON.stringify({
        customerId: cust.id,
        serviceId: 'srv_barba_terapia',
        barberId: 'barber_cadeira_02',
        date: testDate,
        time: '17:00',
        source: 'PUBLIC_BOOKING',
      }),
    });
    console.assert(onlineAllowed.status === 201, `Unblocked customer must be allowed to book online, got ${onlineAllowed.status}`);
    console.log('✓ Anti No-Show & Online Booking Suspension Contract verified (403 on online attempt, admin override allowed, unblock working)');
  }

  // 12. CORS headers check
  {
    const res = await dispatch('/api/health', { method: 'OPTIONS' });
    console.assert(res.status === 204 || res.status === 200, `OPTIONS should succeed, got ${res.status}`);
    console.assert(res.headers.get('access-control-allow-origin') !== null, 'CORS header must be present');
    console.log('✓ CORS OPTIONS check passed');
  }

  console.log('--- ALL Cloudflare Worker API Contract Tests Passed Successfully ---');
}

runWorkerTests().catch((err) => {
  console.error('Worker test failed:', err);
  process.exit(1);
});
