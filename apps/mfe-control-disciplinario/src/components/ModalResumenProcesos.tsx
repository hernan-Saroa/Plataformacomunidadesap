/**
 * Alerta emergente (ventana modal destacada y centrada) con el resumen del
 * estado de los procesos del usuario. Se muestra al ingresar a la vista de
 * Procesos del módulo Control Interno Disciplinario.
 */

import { LayoutDashboard, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { WorldClassModal } from './WorldClassModalBase';
import {
  EstadoAutoUI,
  ESTADO_UI_META,
  ESTADOS_UI_ORDEN,
  ConteosEstado,
} from './estadoAutos';

interface ModalResumenProcesosProps {
  open: boolean;
  esJefe: boolean;
  conteos: ConteosEstado;
  onClose: () => void;
  onIrAEstado?: (estado: EstadoAutoUI) => void;
}

export function ModalResumenProcesos({
  open,
  esJefe,
  conteos,
  onClose,
  onIrAEstado,
}: ModalResumenProcesosProps) {
  if (!open) return null;

  const total =
    conteos.pendientes + conteos.en_revision + conteos.aprobados + conteos.devueltos;
  const requierenAtencion = conteos.pendientes + conteos.devueltos;

  const estadoAtencion: EstadoAutoUI | null =
    conteos.devueltos > 0 ? 'devueltos' : conteos.pendientes > 0 ? 'pendientes' : null;

  const irAtencion = () => {
    if (estadoAtencion && onIrAEstado) onIrAEstado(estadoAtencion);
    onClose();
  };

  const pie = (
    <>
      {estadoAtencion ? (
        <button
          onClick={irAtencion}
          className="px-4 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: ESTADO_UI_META[estadoAtencion].color }}
        >
          Ver {ESTADO_UI_META[estadoAtencion].label.toLowerCase()}
        </button>
      ) : (
        <span />
      )}
      <button
        onClick={onClose}
        className="px-5 py-2 rounded-xl text-sm font-bold text-white"
        style={{ background: '#003DA5' }}
      >
        Entendido
      </button>
    </>
  );

  return (
    <WorldClassModal
      titulo={esJefe ? 'Resumen de procesos' : 'Resumen de mis procesos'}
      subtitulo={`${total} ${total === 1 ? 'proceso' : 'procesos'} en total`}
      icono={<LayoutDashboard className="w-5 h-5 text-white" />}
      ancho={520}
      pie={pie}
      onCerrar={onClose}
    >
      {/* Banda de atención */}
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3"
        style={{
          background: requierenAtencion > 0 ? '#FEF2F2' : '#ECFDF5',
          border: `1px solid ${requierenAtencion > 0 ? '#FCA5A5' : '#6EE7B7'}`,
        }}
      >
        {requierenAtencion > 0 ? (
          <>
            <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#DC2626' }} />
            <p className="text-sm font-semibold" style={{ color: '#991B1B' }}>
              Tienes {requierenAtencion}{' '}
              {requierenAtencion === 1 ? 'proceso que requiere' : 'procesos que requieren'}{' '}
              tu atención
            </p>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: '#059669' }} />
            <p className="text-sm font-semibold" style={{ color: '#065F46' }}>
              Estás al día, no hay procesos pendientes ni devueltos
            </p>
          </>
        )}
      </div>

      {/* Conteos por estado */}
      <div className="grid grid-cols-2 gap-3">
        {ESTADOS_UI_ORDEN.map((estado) => {
          const meta = ESTADO_UI_META[estado];
          return (
            <button
              key={estado}
              onClick={() => {
                if (onIrAEstado) onIrAEstado(estado);
                onClose();
              }}
              className="flex flex-col items-start rounded-xl border p-3 text-left transition-all hover:shadow-sm"
              style={{ borderColor: '#E5E7EB', background: meta.colorSuave }}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ background: meta.color }}
                />
                <span className="text-xs font-semibold text-gray-600">{meta.label}</span>
              </span>
              <span className="text-2xl font-bold text-gray-900 mt-1">{conteos[estado]}</span>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-gray-400 text-center">
        Puedes filtrar el listado por estado desde el panel de la izquierda.
      </p>
    </WorldClassModal>
  );
}
