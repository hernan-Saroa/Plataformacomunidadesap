import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  type LucideIcon,
} from 'lucide-react';

type DocentePtaAlertVariant = 'success' | 'error' | 'warning' | 'info';

type DocentePtaAlertOptions = {
  description?: ReactNode;
  duration?: number;
};

type DocentePtaAlertItem = {
  id: string;
  variant: DocentePtaAlertVariant;
  message: ReactNode;
  description?: ReactNode;
};

const DOCENTE_PTA_ALERT_EVENT = 'esap:docente-pta-alert';

let nextAlertId = 0;

function showAlert(
  variant: DocentePtaAlertVariant,
  message: ReactNode,
  options?: DocentePtaAlertOptions,
) {
  const id = `docente-pta-alert-${++nextAlertId}`;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<DocentePtaAlertItem>(DOCENTE_PTA_ALERT_EVENT, {
      detail: {
        id,
        variant,
        message,
        description: options?.description,
      },
    }));
  }

  return id;
}

/**
 * Reemplazo deliberadamente compatible con las llamadas `toast.*` del portal
 * docente. La duración se conserva en la firma para no cambiar los puntos de
 * invocación, pero el aviso solo se cierra cuando el docente pulsa "Aceptar".
 */
export const docentePtaAlert = {
  success: (message: ReactNode, options?: DocentePtaAlertOptions) =>
    showAlert('success', message, options),
  error: (message: ReactNode, options?: DocentePtaAlertOptions) =>
    showAlert('error', message, options),
  warning: (message: ReactNode, options?: DocentePtaAlertOptions) =>
    showAlert('warning', message, options),
  info: (message: ReactNode, options?: DocentePtaAlertOptions) =>
    showAlert('info', message, options),
};

const VARIANT_STYLES: Record<DocentePtaAlertVariant, {
  label: string;
  icon: LucideIcon;
  color: string;
  softColor: string;
}> = {
  success: {
    label: 'Operación exitosa',
    icon: CheckCircle2,
    color: '#047857',
    softColor: '#ECFDF5',
  },
  error: {
    label: 'Aviso importante',
    icon: AlertCircle,
    color: '#DC2626',
    softColor: '#FEF2F2',
  },
  warning: {
    label: 'Advertencia',
    icon: AlertTriangle,
    color: '#B45309',
    softColor: '#FFFBEB',
  },
  info: {
    label: 'Información',
    icon: Info,
    color: '#0046AD',
    softColor: '#EFF6FF',
  },
};

/**
 * Punto de renderizado exclusivo del portal docente PTA.
 *
 * Los avisos se encolan para que una validación posterior no reemplace otra
 * antes de que el docente alcance a leerla.
 */
export function DocentePtaAlertViewport() {
  const [alerts, setAlerts] = useState<DocentePtaAlertItem[]>([]);
  const [isClosing, setIsClosing] = useState(false);
  const acceptButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeAlert = alerts[0];

  useEffect(() => {
    const handleAlert = (event: Event) => {
      const alertEvent = event as CustomEvent<DocentePtaAlertItem>;
      if (!alertEvent.detail) return;

      setAlerts((current) => [...current, alertEvent.detail]);
    };

    window.addEventListener(DOCENTE_PTA_ALERT_EVENT, handleAlert);
    return () => window.removeEventListener(DOCENTE_PTA_ALERT_EVENT, handleAlert);
  }, []);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  useEffect(() => {
    if (!activeAlert) {
      previouslyFocusedElement.current?.focus();
      previouslyFocusedElement.current = null;
      return;
    }

    if (!previouslyFocusedElement.current) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement | null;
    }

    acceptButtonRef.current?.focus();
  }, [activeAlert]);

  if (!activeAlert || typeof document === 'undefined') return null;

  const variantStyle = VARIANT_STYLES[activeAlert.variant];
  const Icon = variantStyle.icon;
  const pendingCount = alerts.length - 1;
  const titleId = `${activeAlert.id}-title`;
  const descriptionId = `${activeAlert.id}-description`;

  const accept = () => {
    if (isClosing) return;

    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setAlerts((current) => current.slice(1));
      setIsClosing(false);
      closeTimerRef.current = null;
    }, 180);
  };

  return createPortal(
    <div
      role="presentation"
      className={isClosing ? 'docente-pta-alert-backdrop-exit' : 'docente-pta-alert-backdrop-enter'}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(15, 23, 42, 0.62)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <section
        key={activeAlert.id}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={isClosing ? 'docente-pta-alert-card-exit' : 'docente-pta-alert-card-enter'}
        style={{
          width: 'min(560px, calc(100vw - 32px))',
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
          borderRadius: 20,
          border: '1px solid #E2E8F0',
          background: '#FFFFFF',
          boxShadow: '0 24px 64px rgba(15, 23, 42, 0.28)',
        }}
      >
        <div
          style={{
            height: 7,
            background: variantStyle.color,
            borderRadius: '20px 20px 0 0',
          }}
        />

        <div style={{ padding: '28px 30px 26px', textAlign: 'center' }}>
          <div
            aria-hidden="true"
            style={{
              width: 64,
              height: 64,
              margin: '0 auto 16px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: variantStyle.color,
              background: variantStyle.softColor,
            }}
          >
            <Icon size={34} strokeWidth={2.25} />
          </div>

          <h2
            id={titleId}
            style={{
              margin: 0,
              color: '#0F172A',
              fontSize: 23,
              fontWeight: 800,
              lineHeight: 1.25,
            }}
          >
            {activeAlert.description ? activeAlert.message : variantStyle.label}
          </h2>

          <div
            id={descriptionId}
            style={{
              marginTop: 12,
              color: '#334155',
              fontSize: 18,
              fontWeight: 500,
              lineHeight: 1.55,
              overflowWrap: 'anywhere',
            }}
          >
            {activeAlert.description ?? activeAlert.message}
          </div>

          {pendingCount > 0 && (
            <p
              aria-live="polite"
              style={{
                margin: '14px 0 0',
                color: '#64748B',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {pendingCount === 1
                ? 'Hay 1 aviso adicional pendiente.'
                : `Hay ${pendingCount} avisos adicionales pendientes.`}
            </p>
          )}

          <button
            ref={acceptButtonRef}
            type="button"
            onClick={accept}
            disabled={isClosing}
            style={{
              width: '100%',
              minHeight: 50,
              marginTop: 24,
              padding: '12px 24px',
              border: 0,
              borderRadius: 12,
              background: '#0046AD',
              color: '#FFFFFF',
              fontSize: 17,
              fontWeight: 800,
              lineHeight: 1.2,
              cursor: isClosing ? 'default' : 'pointer',
              boxShadow: '0 6px 16px rgba(0, 70, 173, 0.22)',
            }}
          >
            Aceptar
          </button>
        </div>
      </section>

    </div>,
    document.body,
  );
}
