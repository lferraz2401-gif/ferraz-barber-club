import React, { useState, useEffect } from 'react';
import { Customer } from '../../types/index.js';
import { api } from '../../services/api.js';
import { useApp } from '../../context/AppContext.js';
import { X, UserPlus, Save, AlertCircle, ShieldAlert } from 'lucide-react';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerToEdit?: Customer | null;
  onSaved: (customer: Customer) => void;
}

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  customerToEdit,
  onSaved,
}) => {
  const { addToast } = useApp();
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (customerToEdit) {
      setName(customerToEdit.name);
      setWhatsapp(customerToEdit.whatsapp);
      setEmail(customerToEdit.email || '');
      setBirthDate(customerToEdit.birthDate || '');
      setNotes(customerToEdit.notes || '');
    } else {
      setName('');
      setWhatsapp('');
      setEmail('');
      setBirthDate('');
      setNotes('');
    }
    setErrorMsg(null);
  }, [customerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim() || !whatsapp.trim()) {
      setErrorMsg('Nome completo e WhatsApp são campos obrigatórios.');
      return;
    }

    try {
      setSubmitting(true);
      if (customerToEdit) {
        const updated = await api.updateCustomer(customerToEdit.id, {
          name: name.trim(),
          whatsapp: whatsapp.trim(),
          email: email.trim() || undefined,
          birthDate: birthDate || undefined,
          notes: notes.trim() || undefined,
        });
        addToast({
          type: 'success',
          title: 'Cliente Atualizado',
          message: `Cadastro de ${updated.name} atualizado com sucesso.`,
        });
        onSaved(updated);
      } else {
        const created = await api.createCustomer({
          name: name.trim(),
          whatsapp: whatsapp.trim(),
          email: email.trim() || undefined,
          birthDate: birthDate || undefined,
          notes: notes.trim() || undefined,
        });
        addToast({
          type: 'success',
          title: 'Cliente Cadastrado',
          message: `${created.name} adicionado ao elenco com sucesso.`,
        });
        onSaved(created);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar cliente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-lg bg-[#0c1018] border border-[#1a2333] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1a2333] flex items-center justify-between bg-[#0e1420]">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-amber-400" />
            <h3 className="font-display font-black text-lg text-zinc-100 uppercase tracking-wider">
              {customerToEdit ? 'EDITAR FICHA DE CLIENTE' : 'REGISTRAR NOVO CLIENTE'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-[#151c2a] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span className="font-mono">{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-zinc-300 font-display font-bold uppercase tracking-wider text-xs mb-1">
              NOME COMPLETO *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Carlos Eduardo da Silva"
              value={name}
              onChange={(e) => setName(e.target.value.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, ''))}
              className="w-full px-3 py-2 text-sm bg-[#111724] border border-[#1e283b] rounded-lg text-zinc-100 focus:outline-none focus:border-amber-400 font-medium"
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-display font-bold uppercase tracking-wider text-xs mb-1">
              WHATSAPP (COM DDD) *
            </label>
            <input
              type="tel"
              required
              placeholder="Ex: 11998765432"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 11))}
              className="w-full px-3 py-2 text-sm bg-[#111724] border border-[#1e283b] rounded-lg text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
            />
            <span className="text-[10px] text-zinc-500 mt-1 block font-mono">
              O WhatsApp é a chave principal do cliente para evitar duplicidade.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-300 font-display font-bold uppercase tracking-wider text-xs mb-1">
                E-MAIL (OPCIONAL)
              </label>
              <input
                type="email"
                placeholder="Ex: cliente@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#111724] border border-[#1e283b] rounded-lg text-zinc-100 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-display font-bold uppercase tracking-wider text-xs mb-1">
                DATA DE NASCIMENTO
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#111724] border border-[#1e283b] rounded-lg text-zinc-100 focus:outline-none focus:border-amber-400 font-mono cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-300 font-display font-bold uppercase tracking-wider text-xs mb-1">
              OBSERVAÇÕES / PREFERÊNCIAS DE ESTILO
            </label>
            <textarea
              rows={3}
              placeholder="Ex: Prefere degradê navalhado na zero alta, acabamento natural na tesoura..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#111724] border border-[#1e283b] rounded-lg text-zinc-100 focus:outline-none focus:border-amber-400 resize-none font-medium"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-3 border-t border-[#1a2333]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-display font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 hover:bg-[#111724] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg font-display font-black uppercase tracking-wider bg-amber-400 text-zinc-950 hover:bg-amber-300 flex items-center gap-1.5 shadow-md shadow-amber-400/20 active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Salvando...' : customerToEdit ? 'Atualizar Ficha' : 'Confirmar Cadastro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
