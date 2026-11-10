-- ============================================================================
-- MIGRATION 0002: STRUCTURAL SEED FOR CLOUDFLARE D1
-- Contains ONLY the 2 resident barbers, 6 services, structural settings and users.
-- ZERO customers, ZERO appointments, ZERO blocks, ZERO revenue.
-- ============================================================================

-- 1. Barbeiros Residentes (Exatamente Lukinha e Maykin)
INSERT OR REPLACE INTO barbers (id, name, nickname, phone, active, color, workDays, startTime, endTime, lunchStart, lunchEnd, specialty, description)
VALUES 
  ('barber_thiago', 'Lukinha', 'Lukinha', '11987654321', 1, '#d97706', '[1,2,3,4,5,6]', '09:00', '19:00', '12:00', '13:30', 'Fade & Visagismo', 'Especialista em visagismo e acabamentos clássicos'),
  ('barber_kauan', 'Maykin', 'Maykin', '11976543210', 1, '#0284c7', '[1,2,3,4,5,6]', '09:00', '19:00', '12:00', '13:30', 'Navalhado & Barba', 'Especialista em degrade navalhado e barba terapia');

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
  ('usr_thiago', 'Lukinha', 'BARBER', 'barber_thiago'),
  ('usr_kauan', 'Maykin', 'BARBER', 'barber_kauan');
