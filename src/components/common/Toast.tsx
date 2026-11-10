import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div id="toast-container" className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-[#0c1018]/95 border-emerald-500/40 text-emerald-300'
                : toast.type === 'error'
                ? 'bg-[#0c1018]/95 border-rose-500/40 text-rose-300'
                : 'bg-[#0c1018]/95 border-amber-400/40 text-amber-300'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />}
            {toast.type === 'info' && <Info className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />}

            <div className="flex-1 min-w-0">
              {toast.title && <h4 className="font-display font-black text-sm uppercase tracking-wide text-zinc-100">{toast.title}</h4>}
              <p className="text-xs text-zinc-300 leading-relaxed mt-0.5">{toast.message}</p>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="text-zinc-400 hover:text-zinc-100 p-1 rounded transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
