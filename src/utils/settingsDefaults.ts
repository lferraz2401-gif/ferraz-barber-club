import { ShopSettings, WhatsappTemplates } from '../types/index.js';

export const DEFAULT_WHATSAPP_TEMPLATES: WhatsappTemplates = {
  confirmation:
    'Fala {cliente}! Seu horário na FERRAZ BARBER CLUB está confirmado para {data} às {horario} com {barbeiro} ({servico}). Te aguardamos! 💈',
  reminder:
    'Opa {cliente}! Passando pra lembrar do seu corte hoje às {horario} com {barbeiro} na FERRAZ BARBER CLUB. Até já! ✂️',
  completed:
    'Fala {cliente}! Valeu pela presença hoje na FERRAZ BARBER CLUB. O corte com {barbeiro} ficou na régua máxima! Qualquer coisa só chamar. Tmj! 🔥',
  returnInvite:
    'E aí {cliente}, tudo certo? Já faz um tempo que você não passa aqui na FERRAZ BARBER CLUB. Bora renovar o visual e manter a régua alinhada? ✂️',
  inactiveClient:
    'Salve {cliente}! Sentimos sua falta aqui na FERRAZ BARBER CLUB. Tá na hora de alinhar o disfarce! Bora garantir seu horário com {barbeiro}? Responda aqui pra agendar! 👊',
  cancellation:
    'Olá {cliente}, seu agendamento para {data} às {horario} na FERRAZ BARBER CLUB foi cancelado. Se desejar reagendar em outro horário, estamos à disposição!',
  direct:
    'Fala {cliente}! Tudo bem? Mensagem da equipe FERRAZ BARBER CLUB. Como podemos te ajudar hoje?',
};

export const DEFAULT_SETTINGS: ShopSettings = {
  shopName: 'FERRAZ BARBER CLUB',
  conceptTagline: 'Da quebrada, para o mundo.',
  brandConcept: 'Da quebrada, para o mundo.',
  logoUrl: '',
  phone: '11999998888',
  address: 'Rua Principal da Quebrada, 120 - São Paulo, SP',
  openTime: '09:00',
  closeTime: '21:00',
  operatingDays: [1, 2, 3, 4, 5, 6],
  minAdvanceHours: 1,
  minNoticeMinutes: 30,
  maxFutureDays: 30,
  allowSameDay: true,
  cancellationNoticeHours: 2,
  cancelMinHours: 2,
  bufferMinutes: 15, // 15 min de intervalo pós-atendimento
  allowAdminFitIn: true,
  isClubActive: true,
  whatsappTemplates: DEFAULT_WHATSAPP_TEMPLATES,
  whatsapp: {
    messages: DEFAULT_WHATSAPP_TEMPLATES,
  },
};

export function normalizeSettings(raw?: Partial<ShopSettings> | null): ShopSettings {
  if (!raw) return { ...DEFAULT_SETTINGS };

  // Defensively merge templates checking both raw.whatsappTemplates and raw.whatsapp?.messages
  const rawTemplates = raw.whatsappTemplates || raw.whatsapp?.messages || {};

  const templates: WhatsappTemplates = {
    confirmation: rawTemplates.confirmation || DEFAULT_WHATSAPP_TEMPLATES.confirmation,
    reminder: rawTemplates.reminder || DEFAULT_WHATSAPP_TEMPLATES.reminder,
    completed: rawTemplates.completed || DEFAULT_WHATSAPP_TEMPLATES.completed,
    returnInvite: rawTemplates.returnInvite || DEFAULT_WHATSAPP_TEMPLATES.returnInvite,
    inactiveClient: rawTemplates.inactiveClient || DEFAULT_WHATSAPP_TEMPLATES.inactiveClient,
    cancellation: rawTemplates.cancellation || DEFAULT_WHATSAPP_TEMPLATES.cancellation,
    direct: rawTemplates.direct || DEFAULT_WHATSAPP_TEMPLATES.direct,
  };

  const minNotice = raw.minNoticeMinutes ?? (raw.minAdvanceHours ? raw.minAdvanceHours * 60 : 30);
  const cancelHours = raw.cancelMinHours ?? raw.cancellationNoticeHours ?? DEFAULT_SETTINGS.cancelMinHours;

  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    shopName: raw.shopName || DEFAULT_SETTINGS.shopName,
    brandConcept: raw.brandConcept || raw.conceptTagline || DEFAULT_SETTINGS.brandConcept,
    conceptTagline: raw.conceptTagline || raw.brandConcept || DEFAULT_SETTINGS.conceptTagline,
    logoUrl: raw.logoUrl !== undefined ? raw.logoUrl : DEFAULT_SETTINGS.logoUrl,
    phone: raw.phone || DEFAULT_SETTINGS.phone,
    address: raw.address || DEFAULT_SETTINGS.address,
    openTime: raw.openTime || DEFAULT_SETTINGS.openTime,
    closeTime: raw.closeTime || DEFAULT_SETTINGS.closeTime,
    operatingDays: Array.isArray(raw.operatingDays) && raw.operatingDays.length > 0
      ? raw.operatingDays
      : DEFAULT_SETTINGS.operatingDays,
    minNoticeMinutes: minNotice,
    minAdvanceHours: Math.ceil(minNotice / 60),
    maxFutureDays: raw.maxFutureDays ?? DEFAULT_SETTINGS.maxFutureDays,
    cancelMinHours: cancelHours,
    cancellationNoticeHours: cancelHours,
    bufferMinutes: raw.bufferMinutes !== undefined ? Number(raw.bufferMinutes) : 15,
    allowSameDay: raw.allowSameDay ?? DEFAULT_SETTINGS.allowSameDay,
    allowAdminFitIn: raw.allowAdminFitIn ?? DEFAULT_SETTINGS.allowAdminFitIn,
    isClubActive: raw.isClubActive !== undefined ? Boolean(raw.isClubActive) : true,
    whatsappTemplates: templates,
    whatsapp: {
      messages: templates,
    },
  };
}
