import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.js';
import { api } from '../../services/api.js';
import { FinancialStats, FinancialPeriod, Expense, ExpenseCategory } from '../../types/index.js';
import { getOperationDateTime } from '../../utils/datetime.js';
import {
  DollarSign,
  TrendingUp,
  Scissors,
  UserCheck,
  Calendar,
  Filter,
  RefreshCw,
  ShieldCheck,
  Award,
  Percent,
  QrCode,
  CreditCard,
  Banknote,
  Sparkles,
  Plus,
  Trash2,
  Receipt,
  ArrowDownRight,
  ArrowUpRight,
  Printer,
  X,
  FileSpreadsheet,
} from 'lucide-react';

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  FIXED: 'Custos Fixos (Aluguel, Energia, Água, Net)',
  VARIABLE: 'Custos Variáveis Operacionais',
  HYGIENE_PRODUCTS: 'Higiene, Lâminas & Descartáveis',
  EQUIPMENT: 'Manutenção de Máquinas & Cadeiras',
  MARKETING: 'Tráfego Pago & Marketing',
  OTHER: 'Outras Despesas',
};

export const FinancialView: React.FC = () => {
  const { barbers, addToast, currentUser } = useApp();
  const { todayStr } = getOperationDateTime();

  const [activeTab, setActiveTab] = useState<'overview' | 'cashflow' | 'expenses'>('overview');
  const [filterType, setFilterType] = useState<FinancialPeriod>('month');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date(`${todayStr}T12:00:00`);
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [selectedBarberId, setSelectedBarberId] = useState<string>('all');
  const [report, setReport] = useState<FinancialStats | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);

  // New Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('HYGIENE_PRODUCTS');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(todayStr);
  const [expPaymentMethod, setExpPaymentMethod] = useState<'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'BOLETO'>('PIX');
  const [expBarberId, setExpBarberId] = useState('');
  const [expNotes, setExpNotes] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);
  const [deletingExpId, setDeletingExpId] = useState<string | null>(null);

  const setPreset = (type: 'today' | 'week' | 'month') => {
    const today = new Date(`${todayStr}T12:00:00`);
    setFilterType(type);

    if (type === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === 'week') {
      const past = new Date(today);
      past.setDate(today.getDate() - 7);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (type === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(todayStr);
    }
  };

  const fetchFinancials = async () => {
    try {
      setLoading(true);
      const targetBarber =
        currentUser.role === 'BARBER'
          ? currentUser.barberId
          : selectedBarberId !== 'all'
          ? selectedBarberId
          : undefined;

      const [reportData, expensesData] = await Promise.all([
        api.getFinancial(filterType, startDate, endDate, targetBarber),
        currentUser.role === 'ADMIN'
          ? api.getExpenses({ startDate, endDate })
          : Promise.resolve([]),
      ]);

      setReport(reportData);
      setExpenses(expensesData);
    } catch (err: any) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Erro Financeiro',
        message: 'Não foi possível carregar os dados financeiros.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancials();
  }, [filterType, startDate, endDate, selectedBarberId, currentUser]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim() || !expAmount || Number(expAmount) <= 0) {
      addToast({
        type: 'error',
        title: 'Dados Incompletos',
        message: 'Informe o título e um valor válido para a despesa.',
      });
      return;
    }

    try {
      setSavingExpense(true);
      await api.createExpense({
        title: expTitle.trim(),
        category: expCategory,
        amount: Number(expAmount),
        date: expDate,
        paymentMethod: expPaymentMethod,
        barberId: expBarberId ? expBarberId : undefined,
        notes: expNotes.trim() || undefined,
      });

      addToast({
        type: 'success',
        title: 'Despesa Registrada',
        message: `Despesa "${expTitle.trim()}" de R$ ${Number(expAmount).toFixed(2)} lançada com sucesso!`,
      });

      setIsExpenseModalOpen(false);
      setExpTitle('');
      setExpAmount('');
      setExpNotes('');
      setExpBarberId('');
      await fetchFinancials();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao lançar despesa',
        message: err.message,
      });
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string, title: string) => {
    if (!window.confirm(`Deseja realmente excluir o lançamento "${title}"?`)) {
      return;
    }

    try {
      setDeletingExpId(id);
      await api.deleteExpense(id);
      addToast({
        type: 'success',
        title: 'Despesa Excluída',
        message: `Lançamento "${title}" removido com sucesso.`,
      });
      await fetchFinancials();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao excluir',
        message: err.message,
      });
    } finally {
      setDeletingExpId(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const displayedBarbers = report?.barbers.filter((b) => {
    if (selectedBarberId === 'all') return true;
    return b.barberId === selectedBarberId;
  });

  const isBarber = currentUser.role === 'BARBER';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-[#111114] border border-white/[0.08] shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-1.5 h-10 bg-amber-400 rounded-full shrink-0" />
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Finanças & Repasse de Comissões
              </h2>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                Atendimentos Liquidados
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 font-normal">
              Controle de faturamento bruto, repasse de comissões, fechamento de caixa e despesas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-200 transition-colors flex items-center gap-2 text-xs font-semibold cursor-pointer shadow-sm"
            title="Imprimir ou salvar PDF do Fechamento"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Imprimir Fechamento</span>
          </button>

          <button
            onClick={fetchFinancials}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            title="Recalcular relatório"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Date & Filter Toolbar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#111114] border border-white/[0.08] flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        {/* Quick Range Presets */}
        <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/[0.08] self-stretch md:self-auto overflow-x-auto">
          <button
            onClick={() => setPreset('today')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterType === 'today'
                ? 'bg-amber-400 text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Hoje
          </button>
          <button
            onClick={() => setPreset('week')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterType === 'week'
                ? 'bg-amber-400 text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            7 Dias
          </button>
          <button
            onClick={() => setPreset('month')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterType === 'month'
                ? 'bg-amber-400 text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Mês Atual
          </button>
          <button
            onClick={() => setFilterType('custom')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterType === 'custom'
                ? 'bg-amber-400 text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Personalizado
          </button>
        </div>

        {/* Date Pickers */}
        <div className="flex items-center gap-2 self-stretch md:self-auto text-xs">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <span className="text-zinc-400 font-mono text-[11px] font-semibold">DE:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setFilterType('custom');
              }}
              className="bg-transparent text-zinc-100 font-mono focus:outline-none cursor-pointer text-xs"
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <span className="text-zinc-400 font-mono text-[11px] font-semibold">ATÉ:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setFilterType('custom');
              }}
              className="bg-transparent text-zinc-100 font-mono focus:outline-none cursor-pointer text-xs"
            />
          </div>
        </div>

        {/* Barber Filter (Strictly isolated for Barbers) */}
        {currentUser.role === 'ADMIN' ? (
          <div className="flex items-center gap-2 self-stretch md:self-auto">
            <select
              value={selectedBarberId}
              onChange={(e) => setSelectedBarberId(e.target.value)}
              className="px-3.5 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs font-semibold text-zinc-200 focus:outline-none focus:border-amber-400 cursor-pointer w-full md:w-auto"
            >
              <option value="all" className="bg-[#141418] text-white">Todas as Cadeiras (Geral)</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id} className="bg-[#141418] text-white">
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2 self-stretch md:self-auto">
            <span className="px-3.5 py-2 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-300 font-semibold text-xs">
              Cadeira de {currentUser.name}
            </span>
          </div>
        )}
      </div>

      {/* Main KPI Performance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-2 relative overflow-hidden shadow-lg hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {isBarber ? 'Faturamento da Cadeira' : 'Faturamento Bruto'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-emerald-400 tracking-tight">
            R$ {report?.totalRevenue.toFixed(2) || '0.00'}
          </div>
          <span className="text-xs text-zinc-400 flex items-center gap-1.5 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            {report?.totalAppointments || 0} cortes concluídos
          </span>
        </div>

        {/* Total Commissions */}
        <div className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-2 relative overflow-hidden shadow-lg hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {isBarber ? 'Sua Comissão Líquida' : 'Comissões a Repassar'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-amber-300 tracking-tight">
            R$ {report?.totalCommissions.toFixed(2) || '0.00'}
          </div>
          <span className="text-xs text-zinc-400 block pt-1">
            {isBarber ? 'Valor líquido a receber' : 'Repasse aos profissionais'}
          </span>
        </div>

        {/* Expenses (Admin only) or Average Ticket */}
        {!isBarber ? (
          <div className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-2 relative overflow-hidden shadow-lg hover:border-rose-500/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Despesas do Período
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-rose-400 tracking-tight">
              R$ {report?.totalExpenses.toFixed(2) || '0.00'}
            </div>
            <span className="text-xs text-zinc-400 block pt-1">
              {expenses.length} custos fixos e variáveis
            </span>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-2 relative overflow-hidden shadow-lg hover:border-sky-500/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Ticket Médio
              </span>
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 border border-sky-500/20">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-sky-300 tracking-tight">
              R$ {report?.averageTicket.toFixed(2) || '0.00'}
            </div>
            <span className="text-xs text-zinc-400 block pt-1">
              Média por atendimento
            </span>
          </div>
        )}

        {/* Real Net Profit (Admin) or Chair Retained */}
        {!isBarber ? (
          <div className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-2 relative overflow-hidden shadow-lg hover:border-emerald-500/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Lucro Líquido Real
              </span>
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight ${
              (report?.realNetProfit || 0) >= 0 ? 'text-cyan-300' : 'text-rose-400'
            }`}>
              R$ {report?.realNetProfit.toFixed(2) || '0.00'}
            </div>
            <span className="text-xs text-zinc-400 block pt-1">
              Bruto - Comissões - Despesas
            </span>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-2 relative overflow-hidden shadow-lg hover:border-amber-500/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Retido pela Barbearia
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-zinc-300 tracking-tight">
              R$ {report?.shopNetRevenue.toFixed(2) || '0.00'}
            </div>
            <span className="text-xs text-zinc-400 block pt-1">
              Taxa de estrutura da barbearia
            </span>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-amber-400 text-zinc-950 font-bold shadow-sm'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Comissões por Cadeira</span>
        </button>

        <button
          onClick={() => setActiveTab('cashflow')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'cashflow'
              ? 'bg-amber-400 text-zinc-950 font-bold shadow-sm'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Fechamento de Caixa</span>
        </button>

        {!isBarber && (
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'expenses'
                ? 'bg-amber-400 text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Despesas do Estabelecimento</span>
            {expenses.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-300">
                {expenses.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* TAB 1: COMISSÕES POR CADEIRA */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Revenue by Barber Production Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Award className="w-4 h-4 text-amber-400" />
                <h3 className="font-semibold text-sm sm:text-base text-zinc-100 tracking-tight">
                  Demonstrativo de Repasse por Profissional
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedBarbers?.map((item, idx) => (
                <div
                  key={item.barberId}
                  className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-4 shadow-lg hover:border-white/[0.14] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-[#17171c] text-amber-400 border border-white/[0.08] flex items-center justify-center font-bold font-mono text-sm shadow-sm">
                        C0{idx + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold text-base text-zinc-100 tracking-tight">
                          {item.barberName}
                        </h4>
                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="text-xs text-zinc-400 font-mono tabular-nums">
                            {item.appointmentsCount} cortes realizados
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            Comissão: {item.commissionRate}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xl font-bold font-mono tabular-nums text-emerald-400 block">
                        R$ {item.revenue.toFixed(2)}
                      </span>
                      <span className="text-[11px] text-zinc-400 font-mono block">
                        Faturamento Bruto
                      </span>
                    </div>
                  </div>

                  {/* Financial Breakdown per chair */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[#17171c] border border-white/[0.04] text-xs">
                    <div>
                      <span className="text-zinc-400 block text-[11px]">Repasse ao Barbeiro:</span>
                      <span className="text-base font-bold font-mono text-amber-300">
                        R$ {item.commissionAmount.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[11px]">Retido pela Casa:</span>
                      <span className="text-base font-bold font-mono text-zinc-200">
                        R$ {item.shopAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Progress visual bar */}
                  <div className="space-y-1.5">
                    <div className="w-full bg-[#17171c] rounded-full h-2 overflow-hidden border border-white/[0.04]">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            report && report.totalRevenue > 0
                              ? (item.revenue / report.totalRevenue) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs font-mono text-zinc-400">
                      <span>Participação no faturamento</span>
                      <span className="text-amber-400 font-semibold tabular-nums">
                        {report && report.totalRevenue > 0
                          ? ((item.revenue / report.totalRevenue) * 100).toFixed(1)
                          : '0'}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue by Service Breakdown */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <Scissors className="w-4 h-4 text-amber-400" />
              <h3 className="font-semibold text-sm sm:text-base text-zinc-100 tracking-tight">
                Rentabilidade por Tipo de Serviço
              </h3>
            </div>

            <div className="rounded-2xl bg-[#111114] border border-white/[0.08] overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#17171c] text-zinc-400 border-b border-white/[0.08] font-semibold text-xs tracking-wider">
                  <tr>
                    <th className="py-3.5 px-5">Serviço</th>
                    <th className="py-3.5 px-4 text-center">Quantidade</th>
                    <th className="py-3.5 px-5 text-right">Faturamento Gerado</th>
                    <th className="py-3.5 px-5 text-right">% da Receita</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {report?.services.map((srv) => {
                    const percent =
                      report.totalRevenue > 0
                        ? ((srv.revenue / report.totalRevenue) * 100).toFixed(1)
                        : '0';

                    return (
                      <tr key={srv.serviceId} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-5 font-semibold text-zinc-100">
                          {srv.serviceName}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-medium text-zinc-300 tabular-nums">
                          {srv.count}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono font-bold text-amber-400 tabular-nums">
                          R$ {srv.revenue.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono text-zinc-400 tabular-nums">
                          {percent}%
                        </td>
                      </tr>
                    );
                  })}

                  {(!report?.services || report.services.length === 0) && (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-zinc-400 text-sm">
                        Nenhum serviço faturado neste intervalo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FECHAMENTO DE CAIXA & FORMAS DE PAGAMENTO */}
      {activeTab === 'cashflow' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <h3 className="font-semibold text-sm sm:text-base text-zinc-100 tracking-tight">
                Discriminação por Forma de Pagamento
              </h3>
            </div>
            <span className="text-xs text-zinc-400 font-mono">
              Período: {startDate} até {endDate}
            </span>
          </div>

          {/* Cards for each payment method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {report?.paymentMethods.map((pm) => {
              const iconsMap: Record<string, any> = {
                PIX: QrCode,
                CREDIT_CARD: CreditCard,
                DEBIT_CARD: CreditCard,
                CASH: Banknote,
                CLUB_PLAN: Sparkles,
              };
              const Icon = iconsMap[pm.method] || DollarSign;

              return (
                <div
                  key={pm.method}
                  className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-3 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-sm text-zinc-100 block">
                          {pm.label}
                        </span>
                        <span className="text-[11px] text-zinc-400 font-mono">
                          {pm.count} transação(ões)
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {pm.percentage}%
                    </span>
                  </div>

                  <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
                    R$ {pm.total.toFixed(2)}
                  </div>

                  <div className="w-full bg-[#17171c] rounded-full h-1.5 overflow-hidden border border-white/[0.04]">
                    <div
                      className="bg-amber-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pm.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cashflow Summary Sheet / Extrato */}
          <div className="p-6 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-4">
            <h4 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-amber-400" />
              Resumo Consolidado do Fechamento de Caixa
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-4 rounded-xl bg-[#17171c] border border-white/[0.04] space-y-1">
                <span className="text-zinc-400 block text-[11px]">Total Bruto Recebido:</span>
                <span className="text-xl font-bold text-emerald-400 block">
                  R$ {report?.totalRevenue.toFixed(2) || '0.00'}
                </span>
                <span className="text-[10px] text-zinc-500 block">
                  Pix, Cartões e Dinheiro em espécie
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#17171c] border border-white/[0.04] space-y-1">
                <span className="text-zinc-400 block text-[11px]">Total Repassado aos Barbeiros:</span>
                <span className="text-xl font-bold text-amber-400 block">
                  R$ {report?.totalCommissions.toFixed(2) || '0.00'}
                </span>
                <span className="text-[10px] text-zinc-500 block">
                  Comissões calculadas por cadeira
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#17171c] border border-white/[0.04] space-y-1">
                <span className="text-zinc-400 block text-[11px]">Líquido Retido da Barbearia:</span>
                <span className="text-xl font-bold text-zinc-100 block">
                  R$ {report?.shopNetRevenue.toFixed(2) || '0.00'}
                </span>
                <span className="text-[10px] text-zinc-500 block">
                  Margem operacional antes de despesas
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DESPESAS DO ESTABELECIMENTO (ADMIN ONLY) */}
      {!isBarber && activeTab === 'expenses' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Receipt className="w-4 h-4 text-rose-400" />
              <div>
                <h3 className="font-semibold text-sm sm:text-base text-zinc-100 tracking-tight">
                  Controle de Despesas & Custos do Estabelecimento
                </h3>
                <p className="text-xs text-zinc-400">
                  Lançamento de custos fixos e variáveis para cálculo do lucro real.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-amber-400/20 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Lançar Nova Despesa
            </button>
          </div>

          {/* Expenses Table */}
          <div className="rounded-2xl bg-[#111114] border border-white/[0.08] overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#17171c] text-zinc-400 border-b border-white/[0.08] font-semibold text-xs tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Data</th>
                  <th className="py-3.5 px-5">Título / Descrição</th>
                  <th className="py-3.5 px-4">Categoria</th>
                  <th className="py-3.5 px-4">Pagamento</th>
                  <th className="py-3.5 px-5 text-right">Valor</th>
                  <th className="py-3.5 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-5 font-mono text-zinc-400 whitespace-nowrap text-xs">
                      {exp.date}
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-zinc-100">
                      <div>{exp.title}</div>
                      {exp.notes && (
                        <div className="text-[11px] text-zinc-400 font-normal mt-0.5">
                          {exp.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-300 border border-white/[0.08]">
                        {CATEGORY_LABELS[exp.category] || exp.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-zinc-400">
                      {exp.paymentMethod || 'PIX'}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono font-bold text-rose-400 tabular-nums">
                      - R$ {exp.amount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        disabled={deletingExpId === exp.id}
                        onClick={() => handleDeleteExpense(exp.id, exp.title)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Excluir despesa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-400 text-sm">
                      Nenhuma despesa lançada para o período selecionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: LANÇAR DESPESA */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#111114] border border-white/[0.08] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-zinc-100">
                    Lançar Despesa da Barbearia
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Custos fixos, insumos de higiene e manutenção
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-100 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                  Título da Despesa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Conta de Luz, Lâminas Descartáveis, Álcool 70%"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-[#17171c] border border-white/[0.08] rounded-xl text-zinc-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    required
                    placeholder="0.00"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-[#17171c] border border-white/[0.08] rounded-xl text-zinc-100 font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                    Data do Pagamento *
                  </label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-[#17171c] border border-white/[0.08] rounded-xl text-zinc-100 font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                  Categoria da Despesa *
                </label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3.5 py-2 text-sm bg-[#17171c] border border-white/[0.08] rounded-xl text-zinc-100 focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="FIXED">Custos Fixos (Aluguel, Luz, Água, Internet)</option>
                  <option value="HYGIENE_PRODUCTS">Produtos de Higiene, Lâminas & Pomadas</option>
                  <option value="EQUIPMENT">Manutenção de Máquinas & Equipamentos</option>
                  <option value="MARKETING">Marketing & Tráfego Pago</option>
                  <option value="VARIABLE">Custos Variáveis</option>
                  <option value="OTHER">Outros Gastos Operacionais</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                    Forma de Pagamento
                  </label>
                  <select
                    value={expPaymentMethod}
                    onChange={(e) => setExpPaymentMethod(e.target.value as any)}
                    className="w-full px-3.5 py-2 text-sm bg-[#17171c] border border-white/[0.08] rounded-xl text-zinc-100 focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="PIX">Pix</option>
                    <option value="CREDIT_CARD">Cartão de Crédito</option>
                    <option value="DEBIT_CARD">Cartão de Débito</option>
                    <option value="CASH">Dinheiro</option>
                    <option value="BOLETO">Boleto Bancário</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                    Vínculo de Cadeira (Opcional)
                  </label>
                  <select
                    value={expBarberId}
                    onChange={(e) => setExpBarberId(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-[#17171c] border border-white/[0.08] rounded-xl text-zinc-100 focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="">Geral da Barbearia</option>
                    {barbers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium text-xs mb-1.5">
                  Observações adicionais (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Número de nota fiscal, fornecedor ou detalhes..."
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-[#17171c] border border-white/[0.08] rounded-xl text-zinc-100 focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingExpense}
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs transition-all shadow-md shadow-amber-400/20 flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  {savingExpense ? 'Salvando...' : 'Confirmar Lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
