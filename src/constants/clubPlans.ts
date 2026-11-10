import { ClubPlanTier, ClubCredits } from '../types/index.js';

export interface ClubPlanDefinition {
  id: ClubPlanTier;
  name: string;
  badge: string;
  priceMonthly: number;
  description: string;
  includedItems: string[];
  gift: string;
  initialCredits: ClubCredits;
}

export const CLUB_FERRAZ_PLANS: Record<ClubPlanTier, ClubPlanDefinition> = {
  STANDARD: {
    id: 'STANDARD',
    name: 'Club Ferraz Standard',
    badge: 'STANDARD VIP',
    priceMonthly: 140,
    description: '4 cortes + sobrancelha por mês e 1 barba de brinde para manter o disfarce sempre em dia.',
    includedItems: [
      '4 Cortes de Cabelo (Fade/Social/Navalhado)',
      '4 Sobrancelhas Alinhadas na Lâmina',
      'Agendamento prioritário online',
    ],
    gift: '1 Barba Completa de Brinde no Mês',
    initialCredits: {
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
    },
  },
  PLUS: {
    id: 'PLUS',
    name: 'Club Ferraz Plus',
    badge: 'PLUS VIP',
    priceMonthly: 195,
    description: '4 cortes + sobrancelha, 2 barbas e 1 limpeza de pele de brinde para o visual completo.',
    includedItems: [
      '4 Cortes de Cabelo (Fade/Social/Navalhado)',
      '4 Sobrancelhas Alinhadas na Lâmina',
      '2 Barba Terapia Completa com Toalha Quente',
    ],
    gift: '1 Limpeza de Pele Facial de Brinde no Mês',
    initialCredits: {
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
    },
  },
  PRO: {
    id: 'PRO',
    name: 'Club Ferraz Pro',
    badge: 'PRO VIP',
    priceMonthly: 260,
    description: '4 cortes + sobrancelha + barba toda semana, 2 limpezas de pele e 1 pomada modeladora de brinde.',
    includedItems: [
      '4 Cortes de Cabelo (Fade/Social/Navalhado)',
      '4 Sobrancelhas Alinhadas na Lâmina',
      '4 Barba Terapia Completa (1 por semana)',
      '2 Limpezas de Pele Profunda',
    ],
    gift: '1 Pomada Modeladora de Brinde para levar pra casa',
    initialCredits: {
      haircutsTotal: 4,
      haircutsUsed: 0,
      eyebrowsTotal: 4,
      eyebrowsUsed: 0,
      beardsTotal: 4,
      beardsUsed: 0,
      skinCareTotal: 2,
      skinCareUsed: 0,
      pomadeGiftTotal: 1, // 1 pomada brinde
      pomadeGiftClaimed: false,
    },
  },
};
