import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.js';
import { api } from '../../services/api.js';
import { ShopSettings, UserProfile } from '../../types/index.js';
import { normalizeSettings } from '../../utils/settingsDefaults.js';
import {
  Settings,
  Store,
  Clock,
  Calendar,
  MessageSquare,
  Save,
  ShieldCheck,
  CheckCircle2,
  Info,
  Image as ImageIcon,
  Upload,
  Trash2,
  Database,
  HardDrive,
  Download,
  RotateCcw,
  RefreshCw,
  Crown,
  UserPlus,
  Mail,
  KeyRound,
  Cloud,
} from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase.js';

const WEEKDAYS = [
  { id: 1, label: 'Segunda', short: 'SEG' },
  { id: 2, label: 'Terça', short: 'TER' },
  { id: 3, label: 'Quarta', short: 'QUA' },
  { id: 4, label: 'Quinta', short: 'QUI' },
  { id: 5, label: 'Sexta', short: 'SEX' },
  { id: 6, label: 'Sábado', short: 'SÁB' },
  { id: 0, label: 'Domingo', short: 'DOM' },
];

export const SettingsView: React.FC = () => {
  const { settings, refreshAll, addToast, setActiveTab, barbers } = useApp();

  const [formData, setFormData] = useState<ShopSettings>(() => normalizeSettings(settings));
  const [submitting, setSubmitting] = useState(false);

  // User Management State
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'ADMIN' | 'BARBER'>('BARBER');
  const [newUserBarberId, setNewUserBarberId] = useState('');

  const loadUsers = async () => {
    try {
      const list = await api.getUsers();
      setUsersList(list);
    } catch {}
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Backup State
  const [backupInfo, setBackupInfo] = useState<{
    exists: boolean;
    sizeBytes: number;
    lastUpdated?: string;
    totalCustomers: number;
    totalAppointments: number;
  } | null>(null);
  const [loadingBackup, setLoadingBackup] = useState(false);

  const fetchBackupStatus = async () => {
    try {
      const res = await fetch('/api/backup/status');
      if (res.ok) {
        const data = await res.json();
        setBackupInfo(data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchBackupStatus();
  }, []);

  const handleManualBackup = async () => {
    try {
      setLoadingBackup(true);
      const res = await fetch('/api/backup/trigger', { method: 'POST' });
      if (res.ok) {
        addToast({
          type: 'success',
          title: 'Backup Atualizado',
          message: 'Arquivo de backup sincronizado e sobrescrito com sucesso.',
        });
        await fetchBackupStatus();
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro no backup',
        message: err.message || 'Falha ao gerar backup.',
      });
    } finally {
      setLoadingBackup(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!window.confirm('Deseja restaurar os dados a partir do último backup automático? As alterações não salvas serão substituídas.')) {
      return;
    }
    try {
      setLoadingBackup(true);
      const res = await fetch('/api/backup/restore', { method: 'POST' });
      if (res.ok) {
        addToast({
          type: 'success',
          title: 'Sistema Restaurado',
          message: 'Dados restaurados com sucesso a partir do arquivo de backup.',
        });
        await refreshAll();
        await fetchBackupStatus();
      } else {
        const err = await res.json();
        addToast({
          type: 'error',
          title: 'Falha na restauração',
          message: err.error || 'Nenhum backup encontrado.',
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao restaurar',
        message: err.message || 'Falha ao restaurar dados.',
      });
    } finally {
      setLoadingBackup(false);
    }
  };

  useEffect(() => {
    if (settings) {
      setFormData(normalizeSettings(settings));
    }
  }, [settings]);

  const safeData = normalizeSettings(formData);

  const toggleDay = (dayId: number) => {
    const current = safeData.operatingDays || [1, 2, 3, 4, 5, 6];
    let updated: number[];
    if (current.includes(dayId)) {
      if (current.length <= 1) {
        addToast({
          type: 'error',
          title: 'Atenção',
          message: 'A barbearia deve funcionar pelo menos 1 dia por semana.',
        });
        return;
      }
      updated = current.filter((d) => d !== dayId);
    } else {
      updated = [...current, dayId].sort();
    }
    setFormData((prev) => ({ ...normalizeSettings(prev), operatingDays: updated }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const toSave = normalizeSettings(formData);
      await api.updateSettings(toSave);
      addToast({
        type: 'success',
        title: 'Configurações Salvas',
        message: 'Regras operacionais e templates da FERRAZ BARBER CLUB atualizados.',
      });
      await refreshAll();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao salvar configurações',
        message: err.message || 'Erro ao salvar configurações.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#111114] p-5 sm:p-6 rounded-2xl border border-white/[0.08] shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg sm:text-xl font-bold text-zinc-100 tracking-tight">
                Configurações & Diretrizes da Casa
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                Parâmetros Globais
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Horários de abertura, regras de agendamento e segurança do sistema.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Dados da Barbearia */}
        <div className="p-6 rounded-2xl bg-[#111114] border border-white/[0.08] space-y-5 shadow-lg">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.08]">
            <Store className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-base text-zinc-100 tracking-tight">
              Identidade do Estabelecimento
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="block text-zinc-300 font-display font-bold uppercase tracking-wider text-xs mb-1">
                NOME DA BARBEARIA
              </label>
              <input
                type="text"
                required
                value={safeData.shopName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...normalizeSettings(prev), shopName: e.target.value }))
                }
                className="w-full px-3 py-2 text-xs font-mono bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-display font-bold uppercase tracking-wider text-xs mb-1">
                SLOGAN // CONCEITO DA MARCA
              </label>
              <input
                type="text"
                required
                value={safeData.brandConcept || safeData.conceptTagline}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...normalizeSettings(prev),
                    brandConcept: e.target.value,
                    conceptTagline: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 text-xs font-mono bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-display font-bold uppercase tracking-wider text-xs mb-1">
                WHATSAPP OFICIAL DE ATENDIMENTO
              </label>
              <input
                type="text"
                required
                value={safeData.phone || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...normalizeSettings(prev), phone: e.target.value }))
                }
                className="w-full px-3 py-2 text-xs bg-black/40 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-display font-bold uppercase tracking-wider text-xs mb-1">
                ENDEREÇO FÍSICO
              </label>
              <input
                type="text"
                required
                value={safeData.address || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...normalizeSettings(prev), address: e.target.value }))
                }
                className="w-full px-3 py-2 text-xs font-mono bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Logo Customizer */}
          <div className="pt-3 border-t border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-zinc-200 font-display font-bold uppercase tracking-wider text-xs flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  LOGOTIPO DA BARBEARIA
                </label>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Insira o link de uma imagem ou faça o upload do arquivo para aparecer no topo do site e no portal /agendar.
                </p>
              </div>
              {safeData.logoUrl && (
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...normalizeSettings(prev), logoUrl: '' }))}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Remover Logo
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3.5 rounded-xl bg-black/40 border border-white/5">
              {/* Preview Box */}
              <div className="w-16 h-16 rounded-xl bg-[#0a0a0c] border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                {safeData.logoUrl ? (
                  <img
                    src={safeData.logoUrl}
                    alt="Logo Preview"
                    className="w-full h-full object-contain p-1"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="text-center p-1">
                    <ImageIcon className="w-6 h-6 text-zinc-600 mx-auto" />
                    <span className="text-[9px] font-mono text-zinc-600 uppercase block mt-0.5">Padrão</span>
                  </div>
                )}
              </div>

              {/* URL Input & File Picker */}
              <div className="flex-1 w-full space-y-2">
                <input
                  type="url"
                  placeholder="Cole aqui a URL direta da logo (ex: https://.../logo.png)"
                  value={safeData.logoUrl || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...normalizeSettings(prev), logoUrl: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs font-mono bg-black/60 border border-white/10 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400"
                />

                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 border border-white/10 text-xs font-mono font-medium cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>Carregar arquivo de imagem</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 2 * 1024 * 1024) {
                            addToast({
                              type: 'error',
                              title: 'Arquivo muito grande',
                              message: 'A imagem deve ter no máximo 2MB.',
                            });
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const base64 = event.target?.result as string;
                            setFormData((prev) => ({ ...normalizeSettings(prev), logoUrl: base64 }));
                            addToast({
                              type: 'success',
                              title: 'Logo carregada',
                              message: 'Imagem carregada com sucesso! Clique em "Salvar Diretrizes" abaixo.',
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  <span className="text-[11px] text-zinc-500 font-mono">PNG, JPG, SVG ou WebP (máx 2MB)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Horários e Dias de Funcionamento */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 pb-2.5 border-b border-white/10">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <h3 className="font-display font-black text-base text-white uppercase tracking-wider">
              HORÁRIOS & DIAS DE FUNCIONAMENTO
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="block text-zinc-300 font-display font-bold uppercase tracking-wider text-xs mb-1">
                HORÁRIO DE ABERTURA DA BARBEARIA
              </label>
              <input
                type="time"
                required
                value={safeData.openTime || '09:00'}
                onChange={(e) =>
                  setFormData((prev) => ({ ...normalizeSettings(prev), openTime: e.target.value }))
                }
                className="w-full px-3 py-2 text-xs bg-black/40 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-display font-bold uppercase tracking-wider text-xs mb-1">
                HORÁRIO DE FECHAMENTO DA BARBEARIA
              </label>
              <input
                type="time"
                required
                value={safeData.closeTime || '21:00'}
                onChange={(e) =>
                  setFormData((prev) => ({ ...normalizeSettings(prev), closeTime: e.target.value }))
                }
                className="w-full px-3 py-2 text-xs bg-black/40 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-300 font-display font-bold uppercase tracking-wider text-xs mb-2">
              DIAS DA SEMANA COM ATENDIMENTO ATIVO
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {WEEKDAYS.map((day) => {
                const isSelected = (safeData.operatingDays || [1, 2, 3, 4, 5, 6]).includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => toggleDay(day.id)}
                    className={`py-2 px-3 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400 text-zinc-950 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                        : 'bg-black/40 text-zinc-500 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {day.short}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 3: Regras de Agendamento */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 pb-2.5 border-b border-white/10">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h3 className="font-display font-black text-base text-white uppercase tracking-wider">
              REGRAS DE ANTECEDÊNCIA & LIMITES DE GRADE
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
            <div>
              <label className="block text-zinc-300 font-display font-bold uppercase tracking-wider text-xs mb-1">
                ANTECEDÊNCIA MÍNIMA (MINUTOS)
              </label>
              <input
                type="number"
                min="0"
                step="5"
                required
                value={safeData.minNoticeMinutes ?? 30}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setFormData((prev) => ({
                    ...normalizeSettings(prev),
                    minNoticeMinutes: val,
                    minAdvanceHours: Math.ceil(val / 60),
                  }));
                }}
                className="w-full px-3 py-2 text-xs bg-black/40 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-amber-400"
              />
              <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                Janela mínima antes do horário
              </span>
            </div>

            <div>
              <label className="block text-zinc-300 font-display font-bold uppercase tracking-wider text-xs mb-1">
                LIMITE FUTURO MÁXIMO (DIAS)
              </label>
              <input
                type="number"
                min="1"
                required
                value={safeData.maxFutureDays ?? 30}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...normalizeSettings(prev),
                    maxFutureDays: Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 text-xs bg-black/40 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-amber-400"
              />
              <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                Teto máximo de agendamento
              </span>
            </div>

            <div>
              <label className="block text-zinc-300 font-display font-bold uppercase tracking-wider text-xs mb-1">
                CANCELAMENTO MÍNIMO (HORAS)
              </label>
              <input
                type="number"
                min="0"
                required
                value={safeData.cancelMinHours ?? safeData.cancellationNoticeHours ?? 2}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setFormData((prev) => ({
                    ...normalizeSettings(prev),
                    cancelMinHours: val,
                    cancellationNoticeHours: val,
                  }));
                }}
                className="w-full px-3 py-2 text-xs bg-black/40 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-amber-400"
              />
              <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                Tolerância de cancelamento
              </span>
            </div>

            <div>
              <label className="block text-amber-400 font-display font-black uppercase tracking-wider text-xs mb-1 flex items-center gap-1">
                MARGEM PÓS-CORTE (MINUTOS)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                step="5"
                required
                value={safeData.bufferMinutes ?? 15}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setFormData((prev) => ({
                    ...normalizeSettings(prev),
                    bufferMinutes: val,
                  }));
                }}
                className="w-full px-3 py-2 text-xs bg-black/40 border border-amber-400/40 rounded-xl text-amber-300 font-mono focus:outline-none focus:border-amber-400 font-bold"
              />
              <span className="text-[10px] text-zinc-400 font-mono mt-1 block">
                Tempo p/ limpar bancada & receber
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-black/40 border border-white/10 cursor-pointer hover:border-white/20 transition-all">
              <input
                type="checkbox"
                checked={safeData.allowSameDay}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...normalizeSettings(prev),
                    allowSameDay: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded text-amber-400 bg-black/60 border-white/20 focus:ring-0"
              />
              <div>
                <span className="font-display font-bold uppercase text-white text-xs block">
                  Permitir Agendamento no Mesmo Dia
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  Clientes podem reservar horários vagos hoje se respeitada a antecedência mínima.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-black/40 border border-white/10 cursor-pointer hover:border-white/20 transition-all">
              <input
                type="checkbox"
                checked={safeData.allowAdminFitIn}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...normalizeSettings(prev),
                    allowAdminFitIn: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded text-amber-400 bg-black/60 border-white/20 focus:ring-0"
              />
              <div>
                <span className="font-display font-bold uppercase text-white text-xs block">
                  Permitir Encaixe Manual Administrativo
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  Gerente pode criar agendamentos extraordinários sobrepondo horários quando necessário.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 cursor-pointer hover:border-amber-400/40 transition-all col-span-1 sm:col-span-2">
              <input
                type="checkbox"
                checked={safeData.isClubActive !== false}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...normalizeSettings(prev),
                    isClubActive: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded text-amber-400 bg-black/60 border-white/20 focus:ring-0"
              />
              <div>
                <span className="font-display font-bold uppercase text-amber-300 text-xs flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  Club Ferraz Ativo (Assinaturas Mensais VIP)
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  Quando ativo, clientes podem usar cotas de cortes e assinar planos. Se desmarcado, o Club fica pausado temporariamente em todo o sistema.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Central do WhatsApp Shortcut */}
        <div className="p-4 rounded-2xl bg-[#121215] border border-white/10 flex items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
                TEMPLATES & DISPAROS DO WHATSAPP
              </h3>
              <p className="text-xs text-zinc-400">
                Os modelos de mensagens, lembretes e disparos agora ficam centralizados na aba dedicada.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-display font-black uppercase tracking-wider transition-colors shrink-0 cursor-pointer"
          >
            Abrir Central WhatsApp →
          </button>
        </div>

        {/* Section: Banco de Dados em Nuvem (Supabase) */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-emerald-400" />
              <h3 className="font-display font-black text-base text-white uppercase tracking-wider">
                BANCO DE DADOS EM NUVEM (SUPABASE)
              </h3>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                isSupabaseConfigured
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
              }`}
            >
              {isSupabaseConfigured ? '● SUPABASE CONECTADO' : '○ MODO LOCAL / RENDER'}
            </span>
          </div>

          <p className="text-xs text-zinc-400">
            Integração nativa com o Supabase utilizando as variáveis de ambiente <strong className="text-white font-mono">VITE_SUPABASE_URL</strong> e <strong className="text-white font-mono">VITE_SUPABASE_ANON_KEY</strong>. Todas as operações de clientes e agendamentos são executadas de forma assíncrona diretamente nas tabelas <strong className="text-amber-400 font-mono">clientes</strong> e <strong className="text-amber-400 font-mono">agendamentos</strong>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-zinc-500 uppercase text-[10px] font-mono block">Status da Conexão</span>
              <div className="font-display font-bold text-sm text-emerald-400 flex items-center gap-1.5 uppercase">
                <CheckCircle2 className="w-4 h-4" />
                {isSupabaseConfigured ? 'Pronto para Produção (Render)' : 'Configurado com Fallback Automático'}
              </div>
              <span className="text-[11px] font-mono text-zinc-400 block pt-0.5">
                Tabelas: <span className="text-amber-400">clientes</span> & <span className="text-amber-400">agendamentos</span>
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-zinc-500 uppercase text-[10px] font-mono block">Driver Ativo</span>
              <div className="font-mono font-bold text-sm text-white">
                @supabase/supabase-js
              </div>
              <span className="text-[11px] font-mono text-zinc-400 block pt-0.5">
                Mapeamento resiliente de colunas (PT-BR e EN)
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: Backup Inteligente & Integridade de Dados */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <h3 className="font-display font-black text-base text-white uppercase tracking-wider">
                BACKUP AUTOMÁTICO & PROTEÇÃO CONTRA PERDA
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 uppercase font-bold">
              ● ESPELHAMENTO ATIVO
            </span>
          </div>

          <p className="text-xs text-zinc-400">
            A cada alteração no sistema (novo agendamento, novo cliente, edição de valores ou configurações), o arquivo <strong className="text-white font-mono">database.backup.json</strong> é <strong className="text-amber-400">automaticamente sobrescrito</strong> com os dados mais recentes. Isso garante segurança total sem lotar o armazenamento da hospedagem.
          </p>

          {/* Backup Status Tile */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-zinc-500 uppercase text-[10px] font-mono block">Status do Arquivo</span>
              <div className="font-display font-bold text-sm text-emerald-400 flex items-center gap-1.5 uppercase">
                <CheckCircle2 className="w-4 h-4" />
                {backupInfo?.exists ? 'Espelho Atualizado' : 'Aguardando Sincronização'}
              </div>
              <span className="text-[11px] font-mono text-zinc-500">
                {backupInfo ? `${(backupInfo.sizeBytes / 1024).toFixed(1)} KB em disco` : 'Calculando...'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-zinc-500 uppercase text-[10px] font-mono block">Última Sincronização</span>
              <div className="font-mono font-bold text-sm text-white">
                {backupInfo?.lastUpdated
                  ? new Date(backupInfo.lastUpdated).toLocaleTimeString('pt-BR', {
                      timeZone: 'America/Sao_Paulo',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })
                  : 'Em tempo real'}
              </div>
              <span className="text-[11px] font-mono text-zinc-500">
                {backupInfo?.lastUpdated
                  ? new Date(backupInfo.lastUpdated).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
                  : 'Automático'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-zinc-500 uppercase text-[10px] font-mono block">Registros Preservados</span>
              <div className="font-mono font-bold text-sm text-amber-400">
                {backupInfo?.totalCustomers || 0} clientes / {backupInfo?.totalAppointments || 0} cortes
              </div>
              <span className="text-[11px] font-mono text-zinc-500">
                Modo: Sobrescrever por cima
              </span>
            </div>
          </div>

          {/* Action Buttons for Backup */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleManualBackup}
              disabled={loadingBackup}
              className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border border-white/10 hover:border-white/20 text-xs font-display font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loadingBackup ? 'animate-spin' : ''}`} />
              Forçar Sincronização Agora
            </button>

            <a
              href="/api/backup/download"
              download
              className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border border-white/10 hover:border-white/20 text-xs font-display font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              Baixar Cópia (.json)
            </a>

            <button
              type="button"
              onClick={handleRestoreBackup}
              disabled={loadingBackup}
              className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-display font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ml-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar do Backup
            </button>
          </div>
        </div>

        {/* Section 6: Gestão de Contas & Segurança da Equipe (Adicionar Barbeiros com Email e Senha) */}
        <div className="p-6 rounded-2xl bg-[#111114] border border-amber-400/30 space-y-5 shadow-lg relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-black text-base text-zinc-100 uppercase tracking-wide">
                  6. Contas de Acesso & Segurança do Painel
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Cadastre e gerencie os e-mails e senhas de acesso da equipe com proteção anti-invasão.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingUser(null);
                setNewUserName('');
                setNewUserEmail('');
                setNewUserPassword('');
                setNewUserRole('BARBER');
                setNewUserBarberId(barbers[0]?.id || '');
                setUserModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-display font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all cursor-pointer self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              + Cadastrar Novo Acesso
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {usersList.map((user) => {
              const isAdmin = user.role === 'ADMIN';
              const assignedBarber = barbers.find((b) => b.id === user.barberId);
              return (
                <div
                  key={user.id}
                  className="p-4 rounded-xl bg-[#17171c] border border-white/10 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-black text-sm text-white uppercase">
                          {user.name}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                            isAdmin
                              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                              : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                          }`}
                        >
                          {isAdmin ? 'ADMINISTRADOR' : 'BARBEIRO'}
                        </span>
                      </div>

                      {user.id !== 'usr_admin' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUser(user);
                              setNewUserName(user.name);
                              setNewUserEmail(user.email || '');
                              setNewUserPassword('');
                              setNewUserRole(user.role);
                              setNewUserBarberId(user.barberId || '');
                              setUserModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            title="Editar credenciais"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!window.confirm(`Tem certeza que deseja remover o acesso de ${user.name}?`)) return;
                              try {
                                await api.deleteUser(user.id);
                                addToast({
                                  type: 'success',
                                  title: 'Acesso Removido',
                                  message: `O usuário ${user.name} foi removido do painel.`,
                                });
                                loadUsers();
                                await refreshAll();
                              } catch (err: any) {
                                addToast({
                                  type: 'error',
                                  title: 'Erro ao remover',
                                  message: err.message || 'Falha ao excluir usuário.',
                                });
                              }
                            }}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                            title="Excluir usuário"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
                      <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">{user.email || 'l.ferraz2401@gmail.com'}</span>
                    </div>

                    {assignedBarber && (
                      <div className="text-[11px] font-mono text-zinc-400">
                        Vinculado a: <strong className="text-white">{assignedBarber.name}</strong> ({assignedBarber.id})
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                    <span>Proteção: SHA-256 + Anti-BruteForce</span>
                    <span className="text-emerald-400 font-bold">Ativo</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal: Cadastrar / Editar Usuário */}
        {userModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[#121215] border border-amber-400/40 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <h3 className="font-display font-black text-sm uppercase text-white tracking-wide">
                    {editingUser ? 'Alterar Credenciais de Acesso' : 'Cadastrar Acesso para Equipe'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-zinc-300 font-bold uppercase tracking-wider text-[11px] mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Maykin Barbearia"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, ''))}
                    className="w-full px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-bold uppercase tracking-wider text-[11px] mb-1">
                    E-mail de Login *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="Ex: maykin.barber@gmail.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-bold uppercase tracking-wider text-[11px] mb-1">
                    {editingUser ? 'Nova Senha (deixe em branco para manter a atual)' : 'Senha de Acesso *'}
                  </label>
                  <input
                    type="password"
                    placeholder={editingUser ? '••••••••' : 'Mínimo 6 caracteres'}
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white text-xs font-mono tracking-wider focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-bold uppercase tracking-wider text-[11px] mb-1">
                      Nível de Acesso
                    </label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as any)}
                      className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400"
                    >
                      <option value="BARBER">Barbeiro</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-bold uppercase tracking-wider text-[11px] mb-1">
                      Cadeira / Barbeiro
                    </label>
                    <select
                      value={newUserBarberId}
                      onChange={(e) => setNewUserBarberId(e.target.value)}
                      className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400"
                    >
                      <option value="">Nenhuma / Geral</option>
                      {barbers.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.nickname})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!newUserName.trim() || !newUserEmail.trim()) {
                      addToast({ type: 'error', title: 'Campos Obrigatórios', message: 'Preencha nome e e-mail.' });
                      return;
                    }
                    if (!editingUser && (!newUserPassword.trim() || newUserPassword.trim().length < 6)) {
                      addToast({ type: 'error', title: 'Senha Fraca', message: 'A senha deve conter no mínimo 6 caracteres.' });
                      return;
                    }

                    try {
                      if (editingUser) {
                        await api.updateUser(editingUser.id, {
                          name: newUserName.trim(),
                          email: newUserEmail.trim(),
                          password: newUserPassword.trim() || undefined,
                          role: newUserRole,
                          barberId: newUserBarberId || undefined,
                        });
                        addToast({ type: 'success', title: 'Usuário Atualizado', message: 'Credenciais salvas com sucesso.' });
                      } else {
                        await api.createUser({
                          name: newUserName.trim(),
                          email: newUserEmail.trim(),
                          password: newUserPassword.trim(),
                          role: newUserRole,
                          barberId: newUserBarberId || undefined,
                        });
                        addToast({ type: 'success', title: 'Usuário Cadastrado', message: `Acesso criado para ${newUserEmail.trim()}.` });
                      }
                      setUserModalOpen(false);
                      loadUsers();
                      await refreshAll();
                    } catch (err: any) {
                      addToast({ type: 'error', title: 'Erro ao Salvar', message: err.message || 'Falha ao salvar usuário.' });
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-display font-black uppercase tracking-wider cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                >
                  {editingUser ? 'Atualizar Acesso' : 'Criar Acesso'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 rounded-xl font-display font-black text-xs uppercase tracking-wider bg-amber-400 text-zinc-950 hover:bg-amber-300 flex items-center gap-2 shadow-xl shadow-amber-400/20 active:scale-95 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {submitting ? 'SALVANDO DIRETRIZES...' : 'SALVAR TODAS AS CONFIGURAÇÕES'}
          </button>
        </div>
      </form>
    </div>
  );
};
