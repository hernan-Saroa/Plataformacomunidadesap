import React, { ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Modal con los tamaños estandarizados del design system (ModalSIGL):
 *   small  448px · confirmaciones
 *   medium 672px · formularios simples
 *   large  896px · formularios complejos
 *   xlarge 1024px · tablas y listas
 *   full   1152px · expedientes completos
 */
type Tamano = 'small' | 'medium' | 'large' | 'xlarge' | 'full';

const ANCHOS: Record<Tamano, string> = {
  small: 'max-w-[95vw] sm:max-w-md',
  medium: 'max-w-[95vw] sm:max-w-2xl',
  large: 'max-w-[95vw] sm:max-w-4xl',
  xlarge: 'max-w-[95vw] sm:max-w-5xl',
  full: 'max-w-[98vw] sm:max-w-6xl',
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: Tamano;
  icon?: ReactNode;
  color?: string;
  footer?: ReactNode;
  /** El contenido gestiona su propio scroll y padding (p. ej. con columna lateral). */
  sinPadding?: boolean;
  children: ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'medium',
  icon,
  color = '#003DA5',
  footer,
  sinPadding = false,
  children,
}: Props) {
  // Únicos por instancia: con un id fijo, dos modales montados a la vez
  // duplicarían el id y aria-labelledby dejaría de apuntar a algo unívoco.
  const idTitulo = useId();
  const idDescripcion = useId();

  const dialogo = useRef<HTMLDivElement>(null);
  const focoPrevio = useRef<HTMLElement | null>(null);

  // onClose suele llegar como función en línea, con identidad nueva en cada
  // render. Si el efecto dependiera de ella, cada tecla lo re-ejecutaría y el
  // foco saltaría fuera del campo que se está escribiendo.
  const alCerrar = useRef(onClose);
  alCerrar.current = onClose;

  // Escape cierra, el fondo no scrollea, y el foco queda dentro del diálogo
  // mientras está abierto: con Tab suelto se puede llegar a los controles de
  // atrás, que para un lector de pantalla es como si el modal no existiera.
  useEffect(() => {
    if (!isOpen) return;

    focoPrevio.current = document.activeElement as HTMLElement | null;

    const enfocables = () =>
      Array.from(
        dialogo.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    // El primer control recibe el foco al abrir; si no hay ninguno, el diálogo.
    (enfocables()[0] ?? dialogo.current)?.focus();

    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        alCerrar.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const lista = enfocables();
      if (lista.length === 0) {
        e.preventDefault();
        return;
      }
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener('keydown', alPresionar);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', alPresionar);
      document.body.style.overflow = overflowPrevio;
      // Devolver el foco a donde estaba evita que el teclado quede al inicio
      // de la página tras cerrar.
      focoPrevio.current?.focus();
    };
    // Solo isOpen: el efecto debe correr al abrir y al cerrar, nunca en medio.
  }, [isOpen]);

  if (!isOpen) return null;

  // Por portal: dentro del árbol, cualquier ancestro con overflow o transform
  // recorta el modal o rompe su posicionamiento.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={dialogo}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={description ? idDescripcion : undefined}
        tabIndex={-1}
        // El tope de altura va en línea y no como clase: `max-h-[85vh]` no
        // llega a la hoja compilada que sirve el remoto, así que un contenido
        // largo crecía hasta salirse de la pantalla por arriba y por abajo,
        // dejando fuera de vista la cabecera y el botón de cerrar.
        style={{ maxHeight: '85vh' }}
        className={`relative w-full ${ANCHOS[size]} bg-white rounded-xl
          shadow-2xl overflow-hidden flex flex-col focus:outline-none`}
      >
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-start gap-3 flex-shrink-0">
          {icon && (
            // El icono va en blanco: sobre el cuadro de color heredaba el gris
            // oscuro del texto y se leía como una mancha negra.
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
              style={{ background: color }}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 id={idTitulo} className="text-base font-black text-gray-900 m-0 leading-tight">
              {title}
            </h2>
            {description && (
              <p id={idDescripcion} className="text-xs text-gray-500 m-0 mt-0.5 leading-snug">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex-shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className={`flex-1 min-h-0 ${sinPadding ? 'flex overflow-hidden' : 'overflow-y-auto px-5 py-4'}`}>
          {children}
        </div>

        {footer && (
          <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center gap-2 flex-wrap flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
