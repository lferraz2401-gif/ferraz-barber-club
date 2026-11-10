-- ============================================================================
-- MIGRATION 0001: INITIAL SCHEMA FOR CLOUDFLARE D1
-- ============================================================================

CREATE TABLE IF NOT EXISTS barbers (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  nickname TEXT,
  phone TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  avatarUrl TEXT,
  specialty TEXT,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#d97706',
  workDays TEXT NOT NULL DEFAULT '[1,2,3,4,5,6]',
  startTime TEXT NOT NULL DEFAULT '09:00',
  endTime TEXT NOT NULL DEFAULT '20:00',
  lunchStart TEXT NOT NULL DEFAULT '12:00',
  lunchEnd TEXT NOT NULL DEFAULT '13:30',
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL CHECK (price >= 0),
  durationMinutes INTEGER NOT NULL CHECK (durationMinutes > 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  whatsapp TEXT UNIQUE NOT NULL,
  email TEXT,
  birthDate TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY NOT NULL,
  customerId TEXT NOT NULL,
  customerName TEXT NOT NULL,
  customerWhatsapp TEXT NOT NULL,
  serviceId TEXT NOT NULL,
  serviceName TEXT NOT NULL,
  barberId TEXT NOT NULL,
  barberName TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  durationMinutes INTEGER NOT NULL CHECK (durationMinutes > 0),
  priceCharged REAL NOT NULL CHECK (priceCharged >= 0),
  status TEXT NOT NULL CHECK (status IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED')),
  isFitIn INTEGER NOT NULL DEFAULT 0 CHECK (isFitIn IN (0, 1)),
  source TEXT DEFAULT 'INTERNAL_APP',
  notes TEXT,
  completedAt TEXT,
  cancelledAt TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blocks (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('OFF_DAY', 'VACATION', 'TIME_BLOCK', 'SHOP_RECESS')),
  barberId TEXT,
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL,
  startTime TEXT,
  endTime TEXT,
  reason TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'BARBER')),
  barberId TEXT,
  avatarUrl TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_customers_whatsapp ON customers(whatsapp);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_barber_date ON appointments(barberId, date);
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(date, time);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customerId, date);
CREATE INDEX IF NOT EXISTS idx_appointments_status_date ON appointments(status, date);
CREATE INDEX IF NOT EXISTS idx_blocks_barber_date ON blocks(barberId, startDate, endDate);
CREATE INDEX IF NOT EXISTS idx_blocks_date_range ON blocks(startDate, endDate);
