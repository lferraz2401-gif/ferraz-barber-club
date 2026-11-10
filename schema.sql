-- ============================================================================
-- FERRAZ BARBER CLUB — CLOUDFLARE D1 DATABASE SCHEMA
-- Dialect: SQLite (Cloudflare D1 compatible)
-- Description: Complete relational schema and structural seeds for production.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABELA BARBERS (Barbeiros Residentes)
-- Regra de Negócio: Exatamente 2 barbeiros residentes (Lukinha e Maykin).
-- ----------------------------------------------------------------------------
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
  workDays TEXT NOT NULL DEFAULT '[1,2,3,4,5,6]', -- JSON array com dias da semana (0=Dom, 1=Seg..6=Sáb)
  startTime TEXT NOT NULL DEFAULT '09:00',
  endTime TEXT NOT NULL DEFAULT '20:00',
  lunchStart TEXT NOT NULL DEFAULT '12:00',
  lunchEnd TEXT NOT NULL DEFAULT '13:30',
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2. TABELA SERVICES (Catálogo de Serviços)
-- Serviços com preços e durações configurados para a barbearia.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 3. TABELA CUSTOMERS (Base de Clientes)
-- Unicidade garantida pelo número de WhatsApp (normalizado).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  whatsapp TEXT UNIQUE NOT NULL,
  email TEXT,
  birthDate TEXT,
  notes TEXT,
  isBlockedFromOnlineBooking INTEGER DEFAULT NULL,
  blockedReason TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 4. TABELA APPOINTMENTS (Agendamentos e Histórico)
-- priceCharged armazena o valor histórico congelado no momento da marcação.
-- date e time armazenam os valores operacionais no fuso de America/Sao_Paulo.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY NOT NULL,
  customerId TEXT NOT NULL,
  customerName TEXT NOT NULL,
  customerWhatsapp TEXT NOT NULL,
  serviceId TEXT NOT NULL,
  serviceName TEXT NOT NULL,
  barberId TEXT NOT NULL,
  barberName TEXT NOT NULL,
  date TEXT NOT NULL,           -- YYYY-MM-DD (data operacional)
  time TEXT NOT NULL,           -- HH:mm (horário operacional)
  durationMinutes INTEGER NOT NULL CHECK (durationMinutes > 0),
  priceCharged REAL NOT NULL CHECK (priceCharged >= 0), -- Preço congelado
  status TEXT NOT NULL CHECK (status IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED')),
  isFitIn INTEGER NOT NULL DEFAULT 0 CHECK (isFitIn IN (0, 1)),
  source TEXT DEFAULT 'INTERNAL_APP', -- 'PUBLIC_BOOKING', 'INTERNAL_APP', etc.
  notes TEXT,
  completedAt TEXT,
  cancelledAt TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 5. TABELA BLOCKS (Bloqueios de Horário, Férias e Folgas)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blocks (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('OFF_DAY', 'VACATION', 'TIME_BLOCK', 'SHOP_RECESS')),
  barberId TEXT,                -- NULL significa bloqueio geral da barbearia
  startDate TEXT NOT NULL,      -- YYYY-MM-DD
  endDate TEXT NOT NULL,        -- YYYY-MM-DD
  startTime TEXT,               -- HH:mm
  endTime TEXT,                 -- HH:mm
  reason TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 6. TABELA SETTINGS (Configurações Gerais e WhatsApp)
-- Armazena configurações estruturais do salão em formato chave-valor (JSON).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

-- ----------------------------------------------------------------------------
-- 7. TABELA USERS (Perfis de Acesso do Sistema)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'BARBER')),
  barberId TEXT,
  avatarUrl TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 8. ÍNDICES DE PERFORMANCE E BUSCA OPERACIONAL
-- Otimizados para as consultas de Disponibilidade, Agenda, CRM e Financeiro.
-- ----------------------------------------------------------------------------

-- Busca rápida de clientes por WhatsApp (evitar duplicatas)
CREATE INDEX IF NOT EXISTS idx_customers_whatsapp ON customers(whatsapp);

-- Consultas de agenda e disponibilidade por data e barbeiro
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_barber_date ON appointments(barberId, date);
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(date, time);

-- Consultas do histórico do cliente no CRM
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customerId, date);

-- Consultas de faturamento (apenas atendimentos COMPLETED)
CREATE INDEX IF NOT EXISTS idx_appointments_status_date ON appointments(status, date);

-- Consultas de bloqueios de agenda
CREATE INDEX IF NOT EXISTS idx_blocks_barber_date ON blocks(barberId, startDate, endDate);
CREATE INDEX IF NOT EXISTS idx_blocks_date_range ON blocks(startDate, endDate);

-- ============================================================================
-- SEED ESTRUTURAL (SOMENTE CONFIGURAÇÕES E CATÁLOGO — 0 CLIENTES / 0 AGENDAMENTOS)
-- ============================================================================

-- 1. Barbeiros Residentes (Exatamente Lukinha e Maykin)
INSERT OR REPLACE INTO barbers (id, name, nickname, phone, active, color, workDays, startTime, endTime, lunchStart, lunchEnd, specialty, description)
VALUES 
  ('barber_cadeira_01', 'Lukinha', 'Lukinha', '11987654321', 1, '#d97706', '[1,2,3,4,5,6]', '09:00', '19:00', '12:00', '13:30', 'Fade & Visagismo', 'Especialista em visagismo e acabamentos clássicos'),
  ('barber_cadeira_02', 'Maykin', 'Maykin', '11976543210', 1, '#0284c7', '[1,2,3,4,5,6]', '09:00', '19:00', '12:00', '13:30', 'Navalhado & Barba', 'Especialista em degrade navalhado e barba terapia');

-- 2. Catálogo Oficial dos 6 Serviços
INSERT OR REPLACE INTO services (id, name, description, price, durationMinutes, active, featured)
VALUES
  ('srv_corte_fade', 'Corte Degradê / Fade', 'Degradê na régua com acabamento navalhado e finalização profissional com pomada mate.', 50.0, 45, 1, 1),
  ('srv_barba_terapia', 'Barba Terapia Completa', 'Vapor de ozônio, toalha quente, alinhamento na navalha, massagem facial e óleo hidratante.', 45.0, 35, 1, 1),
  ('srv_combo_corte_barba', 'Combo Cabelo + Barba', 'Corte completo no estilo com alinhamento de barba e toalha quente aromatizada.', 85.0, 60, 1, 1),
  ('srv_pigmentacao', 'Pigmentação & Alinhamento', 'Preenchimento e realce do contorno capilar ou barba para máxima definição.', 40.0, 30, 1, 0),
  ('srv_nevou', 'Platinado / Nevou', 'Descoloração global profissional com matização e tratamento anti-quebra capilar.', 120.0, 120, 1, 0),
  ('srv_sobrancelha', 'Sobrancelha Navalhada', 'Design e alinhamento milimétrico na lâmina.', 20.0, 15, 1, 0);

-- 3. Configurações Estruturais e Templates de WhatsApp
INSERT OR REPLACE INTO settings (key, value)
VALUES
  ('general', '{"shopName":"FERRAZ BARBER CLUB","conceptTagline":"Da quebrada, para o mundo.","brandConcept":"Da quebrada, para o mundo.","phone":"11999998888","address":"Rua Principal da Quebrada, 120 - São Paulo, SP","openTime":"09:00","closeTime":"21:00","operatingDays":[1,2,3,4,5,6],"minAdvanceHours":1,"minNoticeMinutes":30,"maxFutureDays":30,"allowSameDay":true,"cancellationNoticeHours":2,"cancelMinHours":2,"allowAdminFitIn":true}'),
  ('whatsapp_templates', '{"confirmation":"Fala {cliente}! Seu horário na FERRAZ BARBER CLUB está confirmado para {data} às {horario} com {barbeiro} ({servico}). Te aguardamos! 💈","reminder":"Opa {cliente}! Passando pra lembrar do seu corte hoje às {horario} com {barbeiro} na FERRAZ BARBER CLUB. Até já! ✂️","completed":"Fala {cliente}! Valeu pela presença hoje na FERRAZ BARBER CLUB. O corte com {barbeiro} ficou na régua máxima! Qualquer coisa só chamar. Tmj! 🔥","returnInvite":"E aí {cliente}, tudo certo? Já faz um tempo que você não passa aqui na FERRAZ BARBER CLUB. Bora renovar o visual e manter a régua alinhada? ✂️","inactiveClient":"Salve {cliente}! Sentimos sua falta aqui na FERRAZ BARBER CLUB. Tá na hora de alinhar o disfarce! Bora garantir seu horário com {barbeiro}? Responda aqui pra agendar! 👊","cancellation":"Olá {cliente}, seu agendamento para {data} às {horario} na FERRAZ BARBER CLUB foi cancelado. Se desejar reagendar em outro horário, estamos à disposição!","direct":"Fala {cliente}! Tudo bem? Mensagem da equipe FERRAZ BARBER CLUB. Como podemos te ajudar hoje?"}');

-- 4. Perfis de Acesso dos Usuários
INSERT OR REPLACE INTO users (id, name, role, barberId)
VALUES
  ('usr_admin', 'Administrador (Gerência)', 'ADMIN', NULL),
  ('usr_cadeira_01', 'Lukinha', 'BARBER', 'barber_cadeira_01'),
  ('usr_cadeira_02', 'Maykin', 'BARBER', 'barber_cadeira_02');
