import React, { useState, useEffect } from 'react';
import { Customer } from '../../types/index.js';
import { api } from '../../services/api.js';
import { useApp } from '../../context/AppContext.js';
import { ClientModal } from './ClientModal.js';
import { ClientDetailDrawer } from './ClientDetailDrawer.js';
import { WhatsAppButton } from '../common/WhatsAppButton.js';
import {
  Search,
  UserPlus,
  RefreshCw,
  Phone,
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  User,
  Plus,
  Filter,
  Users,
  ShieldAlert,
} from 'lucide-react';

export const ClientsView: React.FC = () => {
  const {
    openNewAppointmentWith,
    selectedCustomerIdForDetail,
    setSelectedCustomerIdForDetail,
    addToast,
  } = useApp();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'RETURN_NEEDED' | 'INACTIVE'>('ALL');
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const fetchCustomers = async (searchTerm = '') => {
    try {
      setLoading(true);
      const data = await api.getCustomers(searchTerm);
      setCustomers(data);
    } catch (err: any) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Erro ao buscar clientes',
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(search);
  }, [search]);

  const filteredCustomers = customers.filter((c) => {
    if (statusFilter === 'ALL') return true;
    return c.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-[#111114] border border-white/[0.08] shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-1.5 h-10 bg-amber-400 rounded-full shrink-0" />
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Base de Clientes
              </h2>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 font-medium">
                {customers.length} cadastrados
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 font-normal">
              Controle unificado de histórico, frequência de visitas e dados de contato.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => fetchCustomers(search)}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
          <button
            onClick={() => {
              setCustomerToEdit(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold tracking-tight bg-amber-400 hover:bg-amber-300 text-zinc-950 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_20px_-4px_rgba(245,158,11,0.3)] active:scale-[0.98] cursor-pointer"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>Cadastrar Cliente</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome ou WhatsApp (busca instantânea)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-[#111114] border border-white/[0.08] rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-400 transition-colors shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-[#111114] p-1.5 rounded-xl border border-white/[0.08] self-stretch sm:self-auto overflow-x-auto shadow-sm">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-amber-400 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Todos ({customers.length})
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'ACTIVE'
                ? 'bg-amber-400 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Ativos Recentes
          </button>
          <button
            onClick={() => setStatusFilter('RETURN_NEEDED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'RETURN_NEEDED'
                ? 'bg-amber-400 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Retorno Pendente
          </button>
          <button
            onClick={() => setStatusFilter('INACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'INACTIVE'
                ? 'bg-amber-400 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Atrasados (+35d)
          </button>
        </div>
      </div>

      {/* Customers Mobile Card List (sm:hidden) */}
      <div className="md:hidden space-y-3">
        {filteredCustomers.map((cust) => (
          <div
            key={cust.id}
            onClick={() => setSelectedCustomerIdForDetail(cust.id)}
            className="p-5 rounded-2xl bg-[#111114] border border-white/[0.08] hover:border-amber-500/30 transition-all space-y-3.5 shadow-sm active:scale-[0.99] cursor-pointer"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-semibold text-base text-zinc-100 tracking-tight">
                    {cust.name}
                  </h4>
                  {cust.membership?.active && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500 text-zinc-950 uppercase shadow-sm">
                      ★ {cust.membership.tier}
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono text-zinc-400 block mt-0.5">
                  {cust.whatsapp}
                </span>
              </div>

              {cust.status === 'ACTIVE' && (
                <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  Recente
                </span>
              )}
              {cust.status === 'RETURN_NEEDED' && (
                <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Retorno
                </span>
              )}
              {cust.status === 'INACTIVE' && (
                <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
                  Atrasado
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs py-2.5 bg-[#17171c] rounded-xl border border-white/[0.04] font-mono">
              <div>
                <span className="text-[10px] text-zinc-400 block uppercase">Visitas</span>
                <strong className="text-zinc-100 font-bold tabular-nums">{cust.totalVisits}</strong>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block uppercase">Gasto</span>
                <strong className="text-emerald-400 font-bold tabular-nums">R$ {cust.totalSpent.toFixed(0)}</strong>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block uppercase">Última</span>
                <span className="text-zinc-300 text-xs">{cust.lastVisit ? cust.lastVisit.split('-').slice(1).join('/') : '-'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]" onClick={(e) => e.stopPropagation()}>
              <span className="text-xs text-zinc-400 font-mono">Toque para ver histórico</span>
              <div className="flex items-center gap-2">
                <WhatsAppButton
                  phone={cust.whatsapp}
                  customerName={cust.name}
                  variant="dropdown"
                />
                <button
                  onClick={() => openNewAppointmentWith({ customerId: cust.id })}
                  title="Agendar horário"
                  className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition-colors"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Customers Table (Desktop - md:block) */}
      <div className="hidden md:block rounded-2xl bg-[#111114] border border-white/[0.08] overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#17171c] text-zinc-400 border-b border-white/[0.08] font-semibold text-xs tracking-wider">
              <tr>
                <th className="py-3.5 px-5">Cliente</th>
                <th className="py-3.5 px-4">WhatsApp</th>
                <th className="py-3.5 px-4">Última Visita</th>
                <th className="py-3.5 px-4 text-center">Total Visitas</th>
                <th className="py-3.5 px-5 text-right">Total Gasto</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-5 text-right">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredCustomers.map((cust) => (
                <tr
                  key={cust.id}
                  className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                  onClick={() => setSelectedCustomerIdForDetail(cust.id)}
                >
                  {/* Name & Club Ferraz Badge */}
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold text-zinc-100 group-hover:text-amber-400 transition-colors tracking-tight">
                        {cust.name}
                      </div>
                      {cust.membership?.active && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500 text-zinc-950 uppercase shadow-sm">
                          ★ {cust.membership.tier}
                        </span>
                      )}
                      {cust.isBlockedFromOnlineBooking && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20 uppercase flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-rose-400" />
                          Bloqueado ({cust.noShowCount || 0} faltas)
                        </span>
                      )}
                      {!cust.isBlockedFromOnlineBooking && cust.noShowCount && cust.noShowCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          {cust.noShowCount} falta(s)
                        </span>
                      )}
                    </div>
                    {cust.email && (
                      <span className="text-xs text-zinc-400 block truncate max-w-[200px] font-mono mt-0.5">
                        {cust.email}
                      </span>
                    )}
                  </td>

                  {/* WhatsApp */}
                  <td className="py-3.5 px-4 font-mono text-zinc-300 text-xs">
                    {cust.whatsapp}
                  </td>

                  {/* Last Visit */}
                  <td className="py-3.5 px-4 text-zinc-400">
                    {cust.lastVisit ? (
                      <span className="font-mono text-xs text-zinc-200">{cust.lastVisit}</span>
                    ) : (
                      <span className="text-zinc-500 font-mono text-xs">Nenhum</span>
                    )}
                  </td>

                  {/* Visit Count */}
                  <td className="py-3.5 px-4 text-center font-mono font-medium text-zinc-100 tabular-nums">
                    {cust.totalVisits}
                  </td>

                  {/* Total Spent */}
                  <td className="py-3.5 px-5 text-right font-mono font-bold text-emerald-400 tabular-nums">
                    R$ {cust.totalSpent.toFixed(2)}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4 text-center">
                    {cust.status === 'ACTIVE' && (
                      <span className="inline-block px-2.5 py-0.5 rounded-md font-mono text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        Recente
                      </span>
                    )}
                    {cust.status === 'RETURN_NEEDED' && (
                      <span className="inline-block px-2.5 py-0.5 rounded-md font-mono text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        Retorno (21–35d)
                      </span>
                    )}
                    {cust.status === 'INACTIVE' && (
                      <span className="inline-block px-2.5 py-0.5 rounded-md font-mono text-[10px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
                        Atrasado (+35d)
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td
                    className="py-3.5 px-5 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <WhatsAppButton
                        phone={cust.whatsapp}
                        customerName={cust.name}
                        variant="dropdown"
                      />
                      <button
                        onClick={() => openNewAppointmentWith({ customerId: cust.id })}
                        title="Agendar horário para este cliente"
                        className="p-2 rounded-xl bg-white/[0.04] hover:bg-amber-500/10 text-amber-400 border border-white/[0.08] hover:border-amber-500/30 transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400 font-mono text-sm">
                    Nenhum cliente encontrado com os filtros atuais.{' '}
                    <button
                      onClick={() => {
                        setCustomerToEdit(null);
                        setIsModalOpen(true);
                      }}
                      className="text-amber-400 underline font-semibold ml-1 cursor-pointer"
                    >
                      Cadastrar novo cliente
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals & Drawers */}
      <ClientModal
        isOpen={isModalOpen}
        customerToEdit={customerToEdit}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => fetchCustomers(search)}
      />

      <ClientDetailDrawer
        customerId={selectedCustomerIdForDetail}
        onClose={() => setSelectedCustomerIdForDetail(null)}
        onEditClient={(c) => {
          setSelectedCustomerIdForDetail(null);
          setCustomerToEdit(c);
          setIsModalOpen(true);
        }}
      />
    </div>
  );
};
