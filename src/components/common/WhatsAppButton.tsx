import React, { useState } from 'react';
import { MessageSquare, ExternalLink, Send, ChevronDown, Copy, Check, X, Eye } from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { DEFAULT_WHATSAPP_TEMPLATES } from '../../utils/settingsDefaults.js';

interface WhatsAppButtonProps {
  phone: string;
  customerName: string;
  barberName?: string;
  serviceName?: string;
  date?: string;
  time?: string;
  variant?: 'icon' | 'badge' | 'button' | 'dropdown';
  defaultTemplate?: 'confirmation' | 'reminder' | 'completed' | 'returnInvite' | 'inactiveClient' | 'cancellation' | 'direct';
  className?: string;
}

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  phone,
  customerName,
  barberName,
  serviceName = 'seu corte',
  date = '',
  time = '',
  variant = 'button',
  defaultTemplate,
  className = '',
}) => {
  const { settings, barbers, addToast } = useApp();
  const [showMenu, setShowMenu] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const cleanPhone = (phone || '').replace(/\D/g, '');
  const firstName = (customerName || 'Cliente').trim().split(' ')[0];

  const defaultBarberDisplay =
    barbers && barbers.length > 0
      ? barbers.filter((b) => b.active).map((b) => b.nickname || b.name.split(' ')[0]).join(' / ') ||
        barbers.map((b) => b.nickname || b.name.split(' ')[0]).join(' / ')
      : 'Barbeiro';

  const effectiveBarberName = barberName || defaultBarberDisplay;

  const tpls = {
    ...DEFAULT_WHATSAPP_TEMPLATES,
    ...(settings?.whatsappTemplates || {}),
    ...(settings?.whatsapp?.messages || {}),
  };

  const formatText = (templateString: string) => {
    return templateString
      .replace(/{cliente}/gi, firstName)
      .replace(/{barbeiro}/gi, effectiveBarberName)
      .replace(/{servico}/gi, serviceName)
      .replace(/{data}/gi, date || 'hoje')
      .replace(/{horario}/gi, time || 'no seu horário');
  };

  const messageTemplates = {
    confirmation: formatText(tpls.confirmation || DEFAULT_WHATSAPP_TEMPLATES.confirmation),
    reminder: formatText(tpls.reminder || DEFAULT_WHATSAPP_TEMPLATES.reminder),
    completed: formatText(tpls.completed || DEFAULT_WHATSAPP_TEMPLATES.completed),
    returnInvite: formatText(tpls.returnInvite || DEFAULT_WHATSAPP_TEMPLATES.returnInvite),
    inactiveClient: formatText(tpls.inactiveClient || DEFAULT_WHATSAPP_TEMPLATES.inactiveClient),
    cancellation: formatText(tpls.cancellation || DEFAULT_WHATSAPP_TEMPLATES.cancellation),
    direct: formatText(tpls.direct || DEFAULT_WHATSAPP_TEMPLATES.direct),
  };

  const getUrl = (text: string) => {
    const fullNumber = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    return `https://wa.me/${fullNumber}?text=${encodeURIComponent(text)}`;
  };

  const handleOpen = (text: string) => {
    setShowMenu(false);
    if (!cleanPhone) {
      addToast({
        type: 'error',
        title: 'WhatsApp Indisponível',
        message: 'Cliente não possui número de telefone cadastrado.',
      });
      return;
    }
    window.open(getUrl(text), '_blank', 'noopener,noreferrer');
  };

  const handleCopy = (e: React.MouseEvent, key: string, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    addToast({
      type: 'info',
      title: 'Mensagem Copiada',
      message: 'Texto copiado para a área de transferência.',
    });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // If a defaultTemplate is requested and variant is icon or badge, open directly
  const primaryText = defaultTemplate ? messageTemplates[defaultTemplate] : messageTemplates.direct;

  if (variant === 'icon') {
    return (
      <button
        onClick={() => handleOpen(primaryText)}
        title={`WhatsApp ${firstName}`}
        className={`p-2 rounded-lg bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200 border border-emerald-500/30 transition-colors cursor-pointer ${className}`}
      >
        <MessageSquare className="w-4 h-4" />
      </button>
    );
  }

  if (variant === 'badge') {
    return (
      <button
        onClick={() => handleOpen(primaryText)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-display font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors cursor-pointer ${className}`}
      >
        <MessageSquare className="w-3.5 h-3.5" />
        WhatsApp
      </button>
    );
  }

  const menuItems = [
    { key: 'confirmation', label: 'Confirmação', text: messageTemplates.confirmation },
    { key: 'reminder', label: 'Lembrete de Horário', text: messageTemplates.reminder },
    { key: 'completed', label: 'Agradecimento pós-corte', text: messageTemplates.completed },
    { key: 'returnInvite', label: 'Convocação Retorno (21-35d)', text: messageTemplates.returnInvite },
    { key: 'inactiveClient', label: 'Cliente Inativo (+35d)', text: messageTemplates.inactiveClient },
    { key: 'cancellation', label: 'Aviso de Cancelamento', text: messageTemplates.cancellation },
    { key: 'direct', label: 'Conversa Direta', text: messageTemplates.direct },
  ];

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setShowMenu(!showMenu)}
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-display font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all shadow-md shadow-emerald-950/40 active:scale-95 cursor-pointer ${className}`}
      >
        <MessageSquare className="w-4 h-4 stroke-[2.5]" />
        <span>WhatsApp</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-80" />
      </button>

      {showMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setShowMenu(false)}
          />
          <div className="relative w-full max-w-lg rounded-2xl bg-[#0e121a] border border-emerald-500/40 shadow-2xl shadow-emerald-950/60 z-10 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="px-5 py-3.5 bg-[#141b26] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-black text-sm uppercase tracking-wider text-white">
                    MENSAGENS DO WHATSAPP // DISPARO
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-400">
                    Destinatário: <strong>{customerName}</strong> ({phone})
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMenu(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Messages List (com scrollbar visível e desobstruída) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-white/5 scrollbar-thin">
              {menuItems.map((item) => (
                <div
                  key={item.key}
                  className="pt-3 first:pt-0 space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display font-black uppercase tracking-wider text-xs text-amber-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {item.label}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleCopy(e, item.key, item.text)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                        title="Copiar texto para colar manualmente"
                      >
                        {copiedKey === item.key ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleOpen(item.text);
                          setShowMenu(false);
                        }}
                        className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-[11px] font-display font-black uppercase tracking-wider flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
                        title="Abrir no WhatsApp Web ou App"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Enviar</span>
                      </button>
                    </div>
                  </div>

                  {/* Message Bubble Preview */}
                  <div className="p-3 rounded-xl bg-black/60 border border-white/10 text-xs text-zinc-200 font-mono leading-relaxed whitespace-pre-wrap select-text">
                    {item.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 bg-[#141b26] border-t border-white/10 text-[11px] font-mono text-zinc-400 flex items-center justify-between">
              <span>{menuItems.length} modelos prontos</span>
              <button
                type="button"
                onClick={() => setShowMenu(false)}
                className="text-zinc-400 hover:text-white uppercase font-display font-bold text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
