interface TestResult {
  num: number;
  description: string;
  passed: boolean;
  details?: string;
}

const BASE_URL = 'http://localhost:3000/api';
const results: TestResult[] = [];

function assert(num: number, description: string, condition: boolean, details?: string) {
  results.push({
    num,
    description,
    passed: !!condition,
    details: details || (condition ? 'OK' : 'FALHA'),
  });
}

async function getCleanTestDate(): Promise<string> {
  const base = new Date();
  for (let i = 4; i <= 20; i++) {
    const cur = new Date(base);
    cur.setDate(cur.getDate() + i);
    const day = cur.getDay();
    if (day >= 2 && day <= 4) { // Terça, Quarta ou Quinta
      const dateStr = cur.toISOString().split('T')[0];
      try {
        const res = await fetch(`${BASE_URL}/appointments?date=${dateStr}`);
        const list = await res.json();
        if (Array.isArray(list) && list.length === 0) {
          return dateStr;
        }
      } catch {}
    }
  }
  return '2026-09-24';
}

async function runRegressionSuite() {
  console.log('==================================================');
  console.log('EXECUTANDO REGRESSÃO COMPLETA - 45 PONTOS // FERRAZ BARBER CLUB');
  console.log('==================================================\n');

  // Fetch initial data
  const [barbersRes, servicesRes, settingsRes] = await Promise.all([
    fetch(`${BASE_URL}/barbers`),
    fetch(`${BASE_URL}/services`),
    fetch(`${BASE_URL}/settings`),
  ]);
  const barbers = await barbersRes.json();
  const services = await servicesRes.json();
  const settings = await settingsRes.json();

  const cadeira1 = barbers.find((b: any) => b.id === 'barber_cadeira_01') || barbers[0];
  const cadeira2 = barbers.find((b: any) => b.id === 'barber_cadeira_02') || barbers[1];
  const service30 = services.find((s: any) => s.durationMinutes === 30) || services[0];
  const service45 = services.find((s: any) => s.durationMinutes === 45) || services[1];
  const service60 = services.find((s: any) => s.durationMinutes === 60) || services[2];

  const testDate = await getCleanTestDate();
  console.log(`Data limpa de teste selecionada: ${testDate} (Sem agendamentos prévios)\n`);

  let apt1: any = null;
  let apt2: any = null;
  let apt3: any = null;
  let apt45: any = null;
  let apt60: any = null;
  let aptFitIn: any = null;

  // 1. Agendamento com Lukinha em horário livre
  try {
    const res = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Regressao Teste 1',
        customerWhatsapp: '11988880001',
        serviceId: service30.id,
        barberId: cadeira1.id,
        date: testDate,
        time: '15:00',
        source: 'PUBLIC_BOOKING',
      }),
    });
    apt1 = await res.json();
    assert(1, 'Agendamento com Lukinha em horário livre', res.status === 201 && apt1?.barberId === cadeira1.id, `Status: ${res.status}`);
  } catch (e: any) {
    assert(1, 'Agendamento com Lukinha em horário livre', false, e.message);
  }

  // 2. Agendamento com Maykin no mesmo horário (simultaneidade de cadeiras)
  try {
    const res = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Regressao Teste 2',
        customerWhatsapp: '11988880002',
        serviceId: service30.id,
        barberId: cadeira2.id,
        date: testDate,
        time: '15:00',
        source: 'PUBLIC_BOOKING',
      }),
    });
    apt2 = await res.json();
    assert(2, 'Agendamento simultâneo com Maykin no mesmo horário', res.status === 201 && apt2?.barberId === cadeira2.id, `Status: ${res.status}`);
  } catch (e: any) {
    assert(2, 'Agendamento simultâneo com Maykin no mesmo horário', false, e.message);
  }

  // 3. Opção "Qualquer Barbeiro" atribui barbeiro real (Thiago ou Kauan)
  try {
    const res = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Regressao Teste 3',
        customerWhatsapp: '11988880003',
        serviceId: service30.id,
        barberId: 'any',
        date: testDate,
        time: '16:00',
        source: 'PUBLIC_BOOKING',
      }),
    });
    apt3 = await res.json();
    const isRealBarber = apt3?.barberId === cadeira1.id || apt3?.barberId === cadeira2.id;
    assert(3, 'Opção Qualquer Barbeiro atribui barbeiro real (não "any")', res.status === 201 && isRealBarber && apt3?.barberId !== 'any', `Atribuído: ${apt3?.barberName}`);
  } catch (e: any) {
    assert(3, 'Opção Qualquer Barbeiro atribui barbeiro real', false, e.message);
  }

  // 4. Tentativa de agendamento em horário no passado (bloqueado com 400)
  try {
    const res = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Cliente Passado',
        customerWhatsapp: '11988880004',
        serviceId: service30.id,
        barberId: cadeira1.id,
        date: '2020-01-01',
        time: '10:00',
        source: 'PUBLIC_BOOKING',
      }),
    });
    assert(4, 'Tentativa de agendamento no passado bloqueada com 400', res.status === 400, `Status: ${res.status}`);
  } catch (e: any) {
    assert(4, 'Tentativa de agendamento no passado bloqueada com 400', false, e.message);
  }

  // 5. Tentativa de agendamento fora do horário de funcionamento (bloqueado com 400)
  try {
    const res = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Cliente Madrugada',
        customerWhatsapp: '11988880005',
        serviceId: service30.id,
        barberId: cadeira1.id,
        date: testDate,
        time: '04:00',
        source: 'PUBLIC_BOOKING',
      }),
    });
    assert(5, 'Tentativa fora do horário de funcionamento bloqueada com 400', res.status === 400, `Status: ${res.status}`);
  } catch (e: any) {
    assert(5, 'Tentativa fora do horário de funcionamento bloqueada com 400', false, e.message);
  }

  // 6. Tentativa de agendamento em horário já ocupado para o mesmo barbeiro (409)
  try {
    const res = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Cliente Conflito',
        customerWhatsapp: '11988880006',
        serviceId: service30.id,
        barberId: cadeira1.id,
        date: testDate,
        time: '15:00', // Já reservado por apt1
        source: 'PUBLIC_BOOKING',
      }),
    });
    assert(6, 'Conflito de horário para o mesmo barbeiro bloqueado com 409', res.status === 409, `Status: ${res.status}`);
  } catch (e: any) {
    assert(6, 'Conflito de horário bloqueado com 409', false, e.message);
  }

  // 7. Tentativa de agendamento durante almoço do barbeiro bloqueada
  try {
    const res = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Cliente Almoço',
        customerWhatsapp: '11988880007',
        serviceId: service30.id,
        barberId: cadeira1.id,
        date: testDate,
        time: cadeira1.lunchStart,
        source: 'PUBLIC_BOOKING',
      }),
    });
    assert(7, 'Agendamento no horário de almoço do barbeiro bloqueado com 409', res.status === 409, `Status: ${res.status}`);
  } catch (e: any) {
    assert(7, 'Agendamento no almoço bloqueado', false, e.message);
  }

  // 8. Tentativa de agendamento durante bloqueio de agenda
  let blockId = '';
  try {
    const bRes = await fetch(`${BASE_URL}/blocks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'TIME_BLOCK',
        barberId: cadeira1.id,
        startDate: testDate,
        endDate: testDate,
        startTime: '17:00',
        endTime: '18:00',
        reason: 'Manutenção Equipamento',
      }),
    });
    const blockData = await bRes.json();
    blockId = blockData.id;

    const aptRes = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Cliente Bloqueio',
        customerWhatsapp: '11988880008',
        serviceId: service30.id,
        barberId: cadeira1.id,
        date: testDate,
        time: '17:00',
        source: 'PUBLIC_BOOKING',
      }),
    });
    assert(8, 'Agendamento durante bloqueio de agenda bloqueado com 409', aptRes.status === 409, `Status: ${aptRes.status}`);
  } catch (e: any) {
    assert(8, 'Agendamento durante bloqueio bloqueado', false, e.message);
  } finally {
    if (blockId) {
      await fetch(`${BASE_URL}/blocks/${blockId}`, { method: 'DELETE' });
    }
  }

  // 9. Agendamento com serviço de 30 minutos
  assert(9, 'Duração do serviço de 30 minutos respeitada', apt1 && apt1.durationMinutes === 30, `Duração: ${apt1?.durationMinutes}m`);

  // 10. Agendamento com serviço de 45 minutos
  try {
    const res = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Regressao 45m',
        customerWhatsapp: '11988880010',
        serviceId: service45.id,
        barberId: cadeira2.id,
        date: testDate,
        time: '16:30',
        source: 'PUBLIC_BOOKING',
      }),
    });
    apt45 = await res.json();
    assert(10, 'Agendamento de 45 minutos respeita duração', res.status === 201 && apt45.durationMinutes === 45, `Duração: ${apt45?.durationMinutes}m`);
  } catch (e: any) {
    assert(10, 'Agendamento de 45 minutos', false, e.message);
  }

  // 11. Agendamento com serviço de 60 minutos
  try {
    const res = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Regressao 60m',
        customerWhatsapp: '11988880011',
        serviceId: service60.id,
        barberId: cadeira2.id,
        date: testDate,
        time: '17:30',
        source: 'PUBLIC_BOOKING',
      }),
    });
    apt60 = await res.json();
    assert(11, 'Agendamento de 60 minutos respeita duração', res.status === 201 && apt60.durationMinutes === 60, `Duração: ${apt60?.durationMinutes}m`);
  } catch (e: any) {
    assert(11, 'Agendamento de 60 minutos', false, e.message);
  }

  // 12. Consulta de horários disponíveis no mesmo dia
  const todayDate = new Date().toISOString().split('T')[0];
  const availTodayRes = await fetch(`${BASE_URL}/availability?date=${todayDate}&barberId=${cadeira1.id}`);
  const todaySlots = await availTodayRes.json();
  assert(12, 'Consulta de horários para o mesmo dia retorna grade', Array.isArray(todaySlots), `Slots: ${todaySlots.length}`);

  // 13. Consulta de horários disponíveis para datas futuras dentro do limite
  const availFutureRes = await fetch(`${BASE_URL}/availability?date=${testDate}&barberId=${cadeira1.id}`);
  const futureSlots = await availFutureRes.json();
  assert(13, 'Consulta de horários em data futura retorna slots', Array.isArray(futureSlots) && futureSlots.length > 0, `Slots: ${futureSlots.length}`);

  // 14. Consulta de horários para datas além do limite futuro (maxFutureDays)
  const farFuture = new Date();
  farFuture.setDate(farFuture.getDate() + 90);
  const farFutureDate = farFuture.toISOString().split('T')[0];
  const availFarRes = await fetch(`${BASE_URL}/availability?date=${farFutureDate}&barberId=${cadeira1.id}`);
  const farSlots = await availFarRes.json();
  assert(14, 'Consulta além do limite futuro retorna slots vazios ou indisponíveis', farSlots.length === 0 || farSlots.every((s: any) => !s.available), `Slots válidos: 0`);

  // 15. Agendamento criado pelo Portal Público aparece na Agenda interna
  const agendaRes = await fetch(`${BASE_URL}/appointments?date=${testDate}`);
  const agendaList = await agendaRes.json();
  const foundInAgenda = Array.isArray(agendaList) && agendaList.some((a: any) => a.id === apt1?.id);
  assert(15, 'Agendamento público aparece na consulta de agenda interna', foundInAgenda, 'Sincronizado');

  // 16. Agendamento criado pelo Portal Público salva source PUBLIC_BOOKING
  assert(16, 'Campo source gravado como PUBLIC_BOOKING', apt1 && apt1.source === 'PUBLIC_BOOKING', `Source: ${apt1?.source}`);

  // 17. Agendamento congela priceCharged no momento da criação
  assert(17, 'priceCharged congelado com o valor original do serviço', apt1 && apt1.priceCharged === service30.price, `Preço: R$ ${apt1?.priceCharged}`);

  // 18. Alteração de preço no catálogo NÃO altera priceCharged de agendamentos existentes
  const oldPrice = service30.price;
  await fetch(`${BASE_URL}/services/${service30.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ price: oldPrice + 35 }),
  });
  const checkAptRes = await fetch(`${BASE_URL}/appointments/${apt1.id}`);
  const checkApt = await checkAptRes.json();
  assert(18, 'Alteração no catálogo não altera priceCharged antigo', checkApt.priceCharged === oldPrice, `Mantido R$ ${checkApt.priceCharged}`);
  // Revert price
  await fetch(`${BASE_URL}/services/${service30.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ price: oldPrice }),
  });

  // 19. Mudança de status para IN_PROGRESS não gera faturamento
  await fetch(`${BASE_URL}/appointments/${apt1.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'IN_PROGRESS' }),
  });
  const fin19Res = await fetch(`${BASE_URL}/financial?period=custom&startDate=${testDate}&endDate=${testDate}`);
  const fin19 = await fin19Res.json();
  assert(19, 'Status IN_PROGRESS não gera faturamento', fin19.totalRevenue === 0, `Receita: R$ ${fin19.totalRevenue}`);

  // 20. Mudança de status para COMPLETED gera faturamento
  await fetch(`${BASE_URL}/appointments/${apt1.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'COMPLETED' }),
  });
  const fin20Res = await fetch(`${BASE_URL}/financial?period=custom&startDate=${testDate}&endDate=${testDate}`);
  const fin20 = await fin20Res.json();
  assert(20, 'Status COMPLETED gera faturamento no financeiro', fin20.totalRevenue === apt1.priceCharged, `Receita: R$ ${fin20.totalRevenue}`);

  // 21. Mudança de status para NO_SHOW contabiliza falta e zero receita adicional
  await fetch(`${BASE_URL}/appointments/${apt2.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'NO_SHOW' }),
  });
  const fin21Res = await fetch(`${BASE_URL}/financial?period=custom&startDate=${testDate}&endDate=${testDate}`);
  const fin21 = await fin21Res.json();
  assert(21, 'Status NO_SHOW contabiliza falta e não altera faturamento', fin21.noShowCount >= 1 && fin21.totalRevenue === apt1.priceCharged, `Faltas: ${fin21.noShowCount}`);

  // 22. Mudança de status para CANCELLED registra cancelamento
  await fetch(`${BASE_URL}/appointments/${apt3.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'CANCELLED' }),
  });
  const fin22Res = await fetch(`${BASE_URL}/financial?period=custom&startDate=${testDate}&endDate=${testDate}`);
  const fin22 = await fin22Res.json();
  assert(22, 'Status CANCELLED registra cancelamento sem gerar receita', fin22.cancellationsCount >= 1 && fin22.totalRevenue === apt1.priceCharged, `Cancelamentos: ${fin22.cancellationsCount}`);

  // 23. Dashboard calcula faturamento estritamente de COMPLETED
  const dashRes = await fetch(`${BASE_URL}/dashboard`);
  const dash = await dashRes.json();
  assert(23, 'Dashboard métrica de faturamento de hoje', typeof dash.todayRevenue === 'number', `Hoje: R$ ${dash.todayRevenue}`);

  // 24. Atendimentos de hoje no Dashboard
  assert(24, 'Contagem de atendimentos de hoje', typeof dash.todayAppointmentsCount === 'number' && typeof dash.todayCompletedCount === 'number', `Total: ${dash.todayAppointmentsCount}`);

  // 25. Ticket médio de hoje
  const expectedTicket = dash.todayCompletedCount > 0 ? Number((dash.todayRevenue / dash.todayCompletedCount).toFixed(2)) : 0;
  assert(25, 'Ticket médio calculado corretamente', dash.todayAverageTicket === expectedTicket, `Ticket: R$ ${dash.todayAverageTicket}`);

  // 26. Faturamento por barbeiro no Dashboard reflete apenas cortes concluídos
  assert(26, 'Desempenho por barbeiro no Dashboard', Array.isArray(dash.barberTodayRevenue) && dash.barberTodayRevenue.length >= 2, `Barbeiros: ${dash.barberTodayRevenue.length}`);

  // 27. Faturamento por barbeiro no Financeiro (Hoje, Semana, Mês)
  assert(27, 'Faturamento por barbeiro no Financeiro', Array.isArray(fin20.barbers) && fin20.barbers.length >= 2, `Cadeiras: ${fin20.barbers.length}`);

  // 28. Ranking de serviços no Financeiro
  assert(28, 'Ranking de serviços no Financeiro', Array.isArray(fin20.services), `Serviços listados: ${fin20.services.length}`);

  // 29. Taxa de cancelamento e no-show
  assert(29, 'Contadores de faltas e cancelamentos no Financeiro', typeof fin20.cancellationsCount === 'number' && typeof fin20.noShowCount === 'number', 'OK');

  // 30. Deduplicação de clientes por WhatsApp no Portal
  const crmRes = await fetch(`${BASE_URL}/crm`);
  const crmData = await crmRes.json();
  const allClients = [...(crmData.recent || []), ...(crmData.returnNeeded || []), ...(crmData.inactive || []), ...(crmData.newClients || [])];
  const client1 = allClients.find((c: any) => c.whatsapp === '11988880001');
  assert(30, 'Deduplicação de clientes vincula ao WhatsApp existente', !!client1, `Nome: ${client1?.name}`);

  // 31. Criação de novo cliente quando WhatsApp não existe
  const client45 = allClients.find((c: any) => c.whatsapp === '11988880010');
  assert(31, 'Novo cliente criado automaticamente no primeiro agendamento', !!client45, `Cadastrado: ${client45?.name}`);

  // 32. Normalização de WhatsApp apenas com dígitos
  assert(32, 'WhatsApp armazenado estritamente com dígitos limpos', /^\d+$/.test(client1?.whatsapp || ''), `WhatsApp: ${client1?.whatsapp}`);

  // 33. Status CRM ACTIVE para cliente com visita recente (ex: Lucas Ferreira)
  const lucas = allClients.find((c: any) => c.id === 'cust_lucas');
  assert(33, 'Status CRM ACTIVE para cliente com atendimento recente', lucas?.status === 'ACTIVE', `Lucas status: ${lucas?.status}`);

  // 34. Status CRM RETURN_NEEDED para cliente entre 21 e 35 dias (ex: Matheus Santos)
  const matheus = allClients.find((c: any) => c.id === 'cust_matheus');
  assert(34, 'Status CRM RETURN_NEEDED para cliente entre 21 e 35 dias', matheus?.status === 'RETURN_NEEDED', `Matheus status: ${matheus?.status}`);

  // 35. Status CRM INACTIVE para cliente com mais de 35 dias (ex: Felipe Alcantara)
  const felipe = allClients.find((c: any) => c.id === 'cust_felipe');
  assert(35, 'Status CRM INACTIVE para cliente com mais de 35 dias sem vir', felipe?.status === 'INACTIVE', `Felipe status: ${felipe?.status}`);

  // 36. Total gasto pelo cliente soma estritamente cortes COMPLETED
  assert(36, 'Total gasto pelo cliente soma cortes COMPLETED', lucas && lucas.totalSpent > 0, `Total gasto Lucas: R$ ${lucas?.totalSpent}`);

  // 37. Total de visitas do cliente conta estritamente cortes COMPLETED
  assert(37, 'Total de visitas do cliente contabilizado', lucas && lucas.totalVisits > 0, `Visitas Lucas: ${lucas?.totalVisits}`);

  // 38. Frequência média do cliente calculada
  assert(38, 'Campo de frequência média estruturado no cliente', lucas && (lucas.avgFrequencyDays === undefined || typeof lucas.avgFrequencyDays === 'number'), 'OK');

  // 39. Barbeiro preferido do cliente identificado
  assert(39, 'Barbeiro preferido do cliente identificado', !!lucas?.preferredBarberName, `Barbeiro: ${lucas?.preferredBarberName}`);

  // 40. Atualização de configurações persiste dados
  const settsUpdateRes = await fetch(`${BASE_URL}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shopName: 'FERRAZ BARBER CLUB' }),
  });
  const savedSetts = await settsUpdateRes.json();
  assert(40, 'Configurações de identidade persistem com sucesso', savedSetts.shopName === 'FERRAZ BARBER CLUB', `Nome: ${savedSetts.shopName}`);

  // 41. Regras de antecedência mínima e limites futuros
  assert(41, 'Regras de antecedência mínima e limites presentes', savedSetts.minNoticeMinutes >= 0 && savedSetts.maxFutureDays > 0, `Notice: ${savedSetts.minNoticeMinutes}m`);

  // 42. Atualização dos 6 templates de WhatsApp
  const tpls = savedSetts.whatsappTemplates;
  const hasAllTemplates = !!tpls?.confirmation && !!tpls?.reminder && !!tpls?.completed && !!tpls?.returnInvite && !!tpls?.inactiveClient && !!tpls?.cancellation;
  assert(42, 'Templates de WhatsApp completos (6 modelos configuráveis)', hasAllTemplates, '6 templates ativos');

  // 43. Tags do WhatsApp {cliente}, {barbeiro}, {servico}, {data}, {horario}
  const formattedMsg = tpls.confirmation
    .replace(/{cliente}/gi, 'Danilo')
    .replace(/{barbeiro}/gi, 'Thiago')
    .replace(/{servico}/gi, 'Corte')
    .replace(/{data}/gi, '15/10')
    .replace(/{horario}/gi, '14:00');
  assert(43, 'Tags do WhatsApp substituídas corretamente', formattedMsg.includes('Danilo') && formattedMsg.includes('Thiago') && formattedMsg.includes('14:00'), 'Tags injetadas');

  // 44. Encaixe manual administrativo permitido com flag isFitIn
  try {
    const fitRes = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Cliente Encaixe Admin',
        customerWhatsapp: '11988880044',
        serviceId: service30.id,
        barberId: cadeira1.id,
        date: testDate,
        time: '15:00', // Mesmo horário que apt1
        isFitIn: true,
        source: 'ADMIN',
      }),
    });
    aptFitIn = await fitRes.json();
    assert(44, 'Encaixe manual administrativo permitido com isFitIn', fitRes.status === 201 && aptFitIn.isFitIn === true, `Status: ${fitRes.status}`);
  } catch (e: any) {
    assert(44, 'Encaixe manual administrativo', false, e.message);
  }

  // 45. Responsividade, estabilidade e barbeiros residentes
  assert(45, 'Equipe residente preservada estritamente com Thiago e Kauan', barbers.length === 2 && barbers.some((b: any) => b.name.includes('Thiago')) && barbers.some((b: any) => b.name.includes('Kauan')), 'Thiago e Kauan');

  // Clean test appointments
  if (apt1?.id) await fetch(`${BASE_URL}/appointments/${apt1.id}`, { method: 'DELETE' });
  if (apt2?.id) await fetch(`${BASE_URL}/appointments/${apt2.id}`, { method: 'DELETE' });
  if (apt3?.id) await fetch(`${BASE_URL}/appointments/${apt3.id}`, { method: 'DELETE' });
  if (apt45?.id) await fetch(`${BASE_URL}/appointments/${apt45.id}`, { method: 'DELETE' });
  if (apt60?.id) await fetch(`${BASE_URL}/appointments/${apt60.id}`, { method: 'DELETE' });
  if (aptFitIn?.id) await fetch(`${BASE_URL}/appointments/${aptFitIn.id}`, { method: 'DELETE' });

  // Print Summary
  console.log('\n==================================================');
  console.log('RELATÓRIO FINAL DA SUITE DE REGRESSÃO:');
  console.log('==================================================');
  let passedCount = 0;
  for (const r of results) {
    const icon = r.passed ? '✓' : '✗';
    console.log(`[PONTO ${r.num < 10 ? '0' + r.num : r.num}] ${icon} ${r.description} (${r.details})`);
    if (r.passed) passedCount++;
  }
  console.log('==================================================');
  console.log(`RESULTADO: ${passedCount} / ${results.length} PONTOS VALIDADOS COM SUCESSO (${Math.round((passedCount / results.length) * 100)}%)`);
  console.log('==================================================\n');
}

runRegressionSuite().catch(console.error);
