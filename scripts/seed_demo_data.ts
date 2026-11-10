import fs from 'fs';
import path from 'path';

interface Customer {
  id: string;
  name: string;
  whatsapp: string;
  email?: string;
  birthDate?: string;
  notes?: string;
  totalVisits: number;
  totalSpent: number;
  lastVisit?: string;
  status: 'ACTIVE' | 'RETURN_NEEDED' | 'INACTIVE';
  membership?: {
    tier: 'STANDARD' | 'PLUS' | 'PRO';
    startDate: string;
    renewsAt: string;
    active: boolean;
    credits: {
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
    };
  };
  createdAt: string;
  updatedAt: string;
}

interface Appointment {
  id: string;
  customerId: string;
  customerName: string;
  customerWhatsapp: string;
  serviceId: string;
  serviceName: string;
  barberId: string;
  barberName: string;
  date: string;
  time: string;
  durationMinutes: number;
  priceCharged: number;
  status: 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
  notes?: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

const FIRST_NAMES = [
  'Lucas', 'Gabriel', 'Matheus', 'Felipe', 'Gustavo', 'Guilherme', 'Leonardo', 'Thiago',
  'Rodrigo', 'Bruno', 'Rafael', 'Vinicius', 'Eduardo', 'Henrique', 'Diego', 'Danilo',
  'Caio', 'Renan', 'Vitor', 'Igor', 'Leandro', 'Marcelo', 'Alexandre', 'Daniel',
  'Fernando', 'Carlos', 'Paulo', 'André', 'Ricardo', 'Murilo', 'Samuel', 'Arthur',
  'Enzo', 'Breno', 'Otávio', 'Davi', 'Bernardo', 'Luiz', 'Marcos', 'Wesley',
  'Jeferson', 'Willian', 'Fabio', 'Anderson', 'Cristiano', 'Jonathan', 'Douglas', 'Alan',
  'Maycon', 'Renato'
];

const LAST_NAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira',
  'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes',
  'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha', 'Dias', 'Nascimento', 'Andrade',
  'Moreira', 'Nunes', 'Marques', 'Machado', 'Mendes', 'Freitas', 'Cardoso', 'Ramos'
];

const SERVICES = [
  { id: 'srv_corte_fade', name: 'Corte Degradê / Fade', price: 50, duration: 45 },
  { id: 'srv_barba_terapia', name: 'Barba Terapia Completa', price: 45, duration: 35 },
  { id: 'srv_combo_corte_barba', name: 'Combo Cabelo + Barba', price: 85, duration: 60 },
  { id: 'srv_pigmentacao', name: 'Pigmentação & Alinhamento', price: 40, duration: 30 },
  { id: 'srv_sobrancelha', name: 'Sobrancelha Navalhada', price: 20, duration: 15 },
];

const BARBERS = [
  { id: 'barber_cadeira_01', name: 'Lukinha' },
  { id: 'barber_cadeira_02', name: 'Maykin' },
];

function generatePhone(idx: number): string {
  const ddd = 11;
  const num = 980000000 + idx * 137;
  return `${ddd}${num}`.slice(0, 11);
}

function generateDates(numDays = 15): string[] {
  const dates: string[] = [];
  const start = new Date('2026-10-28T12:00:00');
  for (let i = 0; i < numDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    // Ignore Sunday (day 0) as shop operates Mon-Sat
    if (d.getDay() !== 0) {
      dates.push(d.toISOString().split('T')[0]);
    }
  }
  return dates;
}

export function generateSeedData() {
  const customers: Customer[] = [];
  const appointments: Appointment[] = [];
  const dates = generateDates(17); // generates ~15 working days

  // 1. Generate 50 unique customers
  for (let i = 0; i < 50; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(i * 3 + 7) % LAST_NAMES.length];
    const fullName = `${firstName} ${lastName}`;
    const whatsapp = generatePhone(i + 1);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i + 1}@gmail.com`;
    const custId = `cust_${Date.now()}_${i.toString().padStart(3, '0')}`;

    // Give some clients VIP Club Ferraz subscriptions!
    let membership: Customer['membership'] = undefined;
    if (i % 3 === 0) {
      const tier: 'STANDARD' | 'PLUS' | 'PRO' = i % 9 === 0 ? 'PRO' : i % 6 === 0 ? 'PLUS' : 'STANDARD';
      membership = {
        tier,
        startDate: '2026-10-15',
        renewsAt: '2026-11-15',
        active: true,
        credits: {
          haircutsTotal: 4,
          haircutsUsed: (i % 3) + 1,
          eyebrowsTotal: 4,
          eyebrowsUsed: (i % 3) + 1,
          beardsTotal: tier === 'PRO' ? 4 : tier === 'PLUS' ? 2 : 1,
          beardsUsed: tier === 'PRO' ? 2 : 1,
          skinCareTotal: tier === 'PRO' ? 2 : tier === 'PLUS' ? 1 : 0,
          skinCareUsed: 0,
          pomadeGiftTotal: tier === 'PRO' ? 1 : 0,
          pomadeGiftClaimed: i % 9 === 0,
        },
      };
    }

    const statuses: ('ACTIVE' | 'RETURN_NEEDED' | 'INACTIVE')[] = ['ACTIVE', 'RETURN_NEEDED', 'INACTIVE'];
    const status = statuses[i % 3];

    customers.push({
      id: custId,
      name: fullName,
      whatsapp,
      email,
      birthDate: `199${(i % 10)} -0${((i % 12) + 1).toString().padStart(2, '0')}-15`,
      notes: i % 2 === 0 ? 'Prefere degradê navalhado disfarçado no topo.' : 'Cliente fiel de sexta-feira.',
      totalVisits: Math.floor(i * 1.5) + 2,
      totalSpent: (Math.floor(i * 1.5) + 2) * 65,
      lastVisit: '2026-10-20',
      status,
      membership,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: new Date().toISOString(),
    });
  }

  // 2. Schedule appointments across 15 operational days
  // Standard operating hours: 09:00 to 20:00
  // Slots of 15 min: 09:00, 10:00, 11:15, 13:45, 15:00, 16:15, 17:30, 18:45
  const DAY_TIMES = [
    '09:00', '10:00', '11:15', '13:45', '15:00', '16:15', '17:30', '18:45'
  ];

  let custPointer = 0;
  for (let d = 0; d < dates.length; d++) {
    const curDate = dates[d];
    const isToday = curDate === '2026-10-28';
    const isPast = curDate < '2026-10-28';

    for (let b = 0; b < BARBERS.length; b++) {
      const barber = BARBERS[b];
      // 3 to 4 appointments per barber per day
      const timesForDay = b === 0 ? DAY_TIMES.slice(0, 4) : DAY_TIMES.slice(2, 6);

      for (let t = 0; t < timesForDay.length; t++) {
        const time = timesForDay[t];
        const customer = customers[custPointer % customers.length];
        const srv = SERVICES[(custPointer + t) % SERVICES.length];
        custPointer++;

        let aptStatus: Appointment['status'] = 'CONFIRMED';
        if (isPast) {
          aptStatus = t === 0 ? 'COMPLETED' : t === 1 ? 'COMPLETED' : 'COMPLETED';
        } else if (isToday) {
          aptStatus = t === 0 ? 'COMPLETED' : t === 1 ? 'IN_PROGRESS' : 'CONFIRMED';
        } else {
          aptStatus = 'CONFIRMED';
        }

        const aptPrice = customer.membership?.active ? 0 : srv.price;

        appointments.push({
          id: `apt_${curDate.replace(/-/g, '')}_${barber.id.replace('barber_', '')}_${time.replace(':', '')}`,
          customerId: customer.id,
          customerName: customer.name,
          customerWhatsapp: customer.whatsapp,
          serviceId: srv.id,
          serviceName: srv.name,
          barberId: barber.id,
          barberName: barber.name,
          date: curDate,
          time,
          durationMinutes: srv.duration,
          priceCharged: aptPrice,
          status: aptStatus,
          notes: `Agendado via sistema. ${customer.membership?.active ? `★ Assinante ${customer.membership.tier}` : ''}`,
          source: t % 2 === 0 ? 'PUBLIC_BOOKING' : 'ADMIN',
          createdAt: '2026-10-25T14:00:00Z',
          updatedAt: new Date().toISOString(),
          completedAt: aptStatus === 'COMPLETED' ? `${curDate}T${time}:00Z` : undefined,
        });
      }
    }
  }

  return { customers, appointments };
}

// Write to database.json
const dbPath = path.resolve('data/database.json');
const dbBackupPath = path.resolve('data/database.backup.json');

const raw = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const { customers, appointments } = generateSeedData();

raw.customers = customers;
raw.appointments = appointments;

// Strictly guarantee barbers are named Lukinha and Maykin with cadeira identifiers
raw.barbers = [
  {
    id: 'barber_cadeira_01',
    name: 'Lukinha',
    nickname: 'Lukinha',
    phone: '11987654321',
    active: true,
    color: '#d97706',
    workDays: [1, 2, 3, 4, 5, 6],
    startTime: '09:00',
    endTime: '20:00',
    lunchStart: '12:30',
    lunchEnd: '13:30',
  },
  {
    id: 'barber_cadeira_02',
    name: 'Maykin',
    nickname: 'Maykin',
    phone: '11976543210',
    active: true,
    color: '#0284c7',
    workDays: [1, 2, 3, 4, 5, 6],
    startTime: '10:00',
    endTime: '21:00',
    lunchStart: '13:30',
    lunchEnd: '14:30',
  },
];

raw.users = [
  {
    id: 'usr_admin',
    name: 'Administrador (Gerência)',
    role: 'ADMIN',
  },
  {
    id: 'usr_cadeira_01',
    name: 'Lukinha',
    role: 'BARBER',
    barberId: 'barber_cadeira_01',
  },
  {
    id: 'usr_cadeira_02',
    name: 'Maykin',
    role: 'BARBER',
    barberId: 'barber_cadeira_02',
  },
];

fs.writeFileSync(dbPath, JSON.stringify(raw, null, 2), 'utf8');
fs.writeFileSync(dbBackupPath, JSON.stringify(raw, null, 2), 'utf8');
console.log(`Successfully generated ${customers.length} clients and ${appointments.length} appointments across 15 days with strictly barber_cadeira_01 and barber_cadeira_02.`);
