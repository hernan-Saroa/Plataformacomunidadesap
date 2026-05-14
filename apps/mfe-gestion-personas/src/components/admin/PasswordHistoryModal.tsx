import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Clock, History, Loader2, Lock, Mail, ShieldCheck, X } from 'lucide-react';

interface PasswordHistoryEntry {
  id: string;
  accion: string;
  resultado: string;
  fecha: string | Date;
  actor?: {
    nombre?: string | null;
    email?: string | null;
  };
  descripcion?: string;
}

interface PasswordHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
  history: PasswordHistoryEntry[];
  isLoading?: boolean;
}

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function getActionMeta(action: string) {
  const normalized = action.toUpperCase();

  if (normalized.includes('RECORDATORIO')) {
    return {
      label: 'Recordatorio enviado',
      icon: Mail,
      color: 'text-orange-700',
      bg: 'bg-orange-50 border-orange-200',
    };
  }

  if (normalized.includes('RESTABLECER') || normalized.includes('CAMBIAR')) {
    return {
      label: 'Cambio de contraseña',
      icon: Lock,
      color: 'text-blue-700',
      bg: 'bg-blue-50 border-blue-200',
    };
  }

  return {
    label: action,
    icon: ShieldCheck,
    color: 'text-gray-700',
    bg: 'bg-gray-50 border-gray-200',
  };
}

export function PasswordHistoryModal({
  isOpen,
  onClose,
  user,
  history,
  isLoading = false,
}: PasswordHistoryModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const displayName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Usuario'
    : 'Usuario';

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl sm:rounded-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 sm:rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <History className="h-5 w-5 text-[#003DA5]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Historial de Contraseñas</h2>
                  <p className="text-xs text-gray-500">
                    {displayName}
                    {user?.email ? ` | ${user.email}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {isLoading ? (
                <div className="flex min-h-[240px] items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-[#003DA5]" />
                    <p className="text-sm font-medium text-gray-700">Consultando historial</p>
                    <p className="text-xs text-gray-500">Cargando eventos de seguridad del usuario.</p>
                  </div>
                </div>
              ) : history.length === 0 ? (
                <div className="flex min-h-[240px] items-center justify-center">
                  <div className="text-center">
                    <Clock className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                    <p className="text-sm font-semibold text-gray-700">No hay eventos registrados</p>
                    <p className="text-xs text-gray-500">Todavía no existen cambios o recordatorios auditados para este usuario.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((entry) => {
                    const meta = getActionMeta(entry.accion);
                    const Icon = meta.icon;
                    return (
                      <div key={entry.id} className={`rounded-xl border p-4 ${meta.bg}`}>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                            <Icon className={`h-5 w-5 ${meta.color}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-gray-900">{meta.label}</p>
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                entry.resultado === 'EXITO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {entry.resultado === 'EXITO' ? 'Éxito' : 'Fallo'}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                              {dateFormatter.format(new Date(entry.fecha))}
                            </p>
                            {entry.descripcion && (
                              <p className="mt-2 text-sm text-gray-700">{entry.descripcion}</p>
                            )}
                            <p className="mt-2 text-xs text-gray-500">
                              Ejecutado por {entry.actor?.nombre || 'Usuario del sistema'}
                              {entry.actor?.email ? ` (${entry.actor.email})` : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
