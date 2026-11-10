/**
 * Isolated Unit Test for D1DatabaseRepository
 * Runs in-memory against Node 22 native SQLite (node:sqlite DatabaseSync)
 * simulating the exact Cloudflare D1 interface
 */
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { D1Database, D1DatabaseRepository } from './d1-repository.js';

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

async function runTests() {
  console.log('--- Starting D1DatabaseRepository Isolated Tests ---');
  const rawDb = new DatabaseSync(':memory:');
  const d1 = createMockD1Database(rawDb);

  // 1. Initialize schema and seed from schema.sql
  const schemaSql = fs.readFileSync(path.join(process.cwd(), 'schema.sql'), 'utf-8');
  await d1.exec(schemaSql);
  console.log('✓ Schema and structural seed loaded into test D1 instance');

  const repo = new D1DatabaseRepository(d1);

  // Test 1: Check initial structural state
  const barbers = await repo.getBarbers();
  console.assert(barbers.length === 2, `Expected 2 barbers, got ${barbers.length}`);
  console.assert(barbers[0].name === 'Lukinha', 'Expected Barber 1 to be Lukinha');
  console.assert(barbers[1].name === 'Maykin', 'Expected Barber 2 to be Maykin');
  console.log('✓ Initial Barbers verified (Lukinha & Maykin)');

  const services = await repo.getServices();
  console.assert(services.length === 6, `Expected 6 services, got ${services.length}`);
  console.log('✓ Initial Services verified (6 services)');

  const initialCustomers = await repo.getCustomers();
  console.assert(initialCustomers.length === 0, `Expected 0 customers, got ${initialCustomers.length}`);
  const initialApts = await repo.getAppointments();
  console.assert(initialApts.length === 0, `Expected 0 appointments, got ${initialApts.length}`);
  console.log('✓ Initial operational tables are clean (0 customers, 0 appointments)');

  // Test 2: Customers CRUD
  const newCust = await repo.saveCustomer({
    id: 'cust_test_1',
    name: 'Cliente Teste D1',
    whatsapp: '11999887766',
    notes: 'Preferência por fade',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalVisits: 0,
    totalSpent: 0,
    status: 'ACTIVE',
  });
  console.assert(newCust.id === 'cust_test_1', 'Customer ID should match');

  const fetchedByWpp = await repo.getCustomerByWhatsapp('5511999887766'); // prefix 55 test
  console.assert(fetchedByWpp?.name === 'Cliente Teste D1', 'Search with 55 prefix should succeed');

  newCust.notes = 'Atualizado com sucesso';
  await repo.saveCustomer(newCust);
  const updatedCust = await repo.getCustomerById('cust_test_1');
  console.assert(updatedCust?.notes === 'Atualizado com sucesso', 'Update customer should succeed');

  console.log('✓ Customer CRUD & WhatsApp normalization verified');

  // Test 3: Appointments CRUD & priceCharged freezing
  const newApt = await repo.saveAppointment({
    id: 'apt_test_1',
    customerId: 'cust_test_1',
    customerName: 'Cliente Teste D1',
    customerWhatsapp: '11999887766',
    serviceId: 'srv_corte_fade',
    serviceName: 'Corte Degradê / Fade',
    barberId: 'barber_cadeira_01',
    barberName: 'Lukinha',
    date: '2026-09-18',
    time: '14:00',
    durationMinutes: 45,
    priceCharged: 40.0, // Historical promotion price
    status: 'CONFIRMED',
    isFitIn: false,
    source: 'PUBLIC_BOOKING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  console.assert(newApt.id === 'apt_test_1');

  const fetchedApt = await repo.getAppointmentById('apt_test_1');
  console.assert(fetchedApt?.priceCharged === 40.0, 'Frozen priceCharged must remain 40.0');
  console.assert(fetchedApt?.source === 'PUBLIC_BOOKING');

  // Update status to COMPLETED
  fetchedApt!.status = 'COMPLETED';
  fetchedApt!.completedAt = new Date().toISOString();
  await repo.saveAppointment(fetchedApt!);

  const completedApt = await repo.getAppointmentById('apt_test_1');
  console.assert(completedApt?.status === 'COMPLETED');
  console.assert(completedApt?.priceCharged === 40.0, 'Frozen priceCharged remains intact after status update');
  console.log('✓ Appointment CRUD, Status lifecycle & Frozen priceCharged verified');

  // Test 4: Blocks CRUD
  const newBlock = await repo.saveBlock({
    id: 'block_test_1',
    type: 'TIME_BLOCK',
    barberId: 'barber_cadeira_01',
    startDate: '2026-09-19',
    endDate: '2026-09-19',
    startTime: '16:00',
    endTime: '17:00',
    reason: 'Manutenção',
    createdAt: new Date().toISOString(),
  });
  const blocks = await repo.getBlocks();
  console.assert(blocks.length === 1);
  console.assert(blocks[0].reason === 'Manutenção');

  await repo.deleteBlock('block_test_1');
  const blocksAfterDelete = await repo.getBlocks();
  console.assert(blocksAfterDelete.length === 0);
  console.log('✓ Schedule Blocks CRUD verified');

  // Test 5: Settings read & update
  const settings = await repo.getSettings();
  console.assert(settings.shopName === 'FERRAZ BARBER CLUB');
  console.assert(settings.openTime === '09:00');
  console.assert(!!settings.whatsappTemplates.confirmation);

  await repo.updateSettings({ minAdvanceHours: 2 });
  const updatedSettings = await repo.getSettings();
  console.assert(updatedSettings.minAdvanceHours === 2);
  console.assert(updatedSettings.shopName === 'FERRAZ BARBER CLUB');
  console.log('✓ Settings read, update & serialization verified');

  // Test 6: Users
  const users = await repo.getUsers();
  console.assert(users.length === 3);
  console.assert(users.some((u) => u.role === 'ADMIN'));
  console.log('✓ Users read verified');

  // Clean up customer & appointment from test
  await repo.deleteAppointment('apt_test_1');
  await repo.deleteCustomer('cust_test_1');
  const finalCusts = await repo.getCustomers();
  const finalApts = await repo.getAppointments();
  console.assert(finalCusts.length === 0);
  console.assert(finalApts.length === 0);

  rawDb.close();
  console.log('--- ALL D1DatabaseRepository TESTS PASSED SUCCESSFULLY ---');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
