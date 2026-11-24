/**
 * ControlesSeguimientoTab - Pestaña "Controles" del detalle de riesgo con seguimiento cuatrimestral (EFDS-2416)
 */

import { CheckCircle, ClipboardCheck, Download, Loader2, Paperclip, Shield } from 'lucide-react';
import { Button } from '@esap-mfe/shared-ui/button';
import {
  riesgosService,
  type ControlSeguimientoAPI,
  type RiesgoSeguimientosAPI,
} from '../../../../services/api/legal.service';
import {
  ESTADO_CORTE_CONFIG,
  RESULTADO_LABEL,
  formatearFechaISO,
  formatearTamano,
} from './riesgoSeguimientoUtils';

interface ControlesSeguimientoTabProps {
  /** Controles guardados en el riesgo: se muestran si el seguimiento aún no cargó o falló. */
  controlesRiesgo: { id?: string; descripcion: string; efectividad: number }[] | undefined;
  vista: RiesgoSeguimientosAPI | null;
  cargando: boolean;
  error: boolean;
  puedeRegistrar: boolean;
  onReintentar: () => void;
  onRegistrar: (control: ControlSeguimientoAPI, cuatrimestre?: number) => void;
}

export function ControlesSeguimientoTab({ controlesRiesgo, vista, cargando, error, puedeRegistrar, onReintentar, onRegistrar }: ControlesSeguimientoTabProps) {
  const sinControles = !controlesRiesgo || controlesRiesgo.length === 0;

  return (
    <div>
      <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
        <Shield className="w-4 h-4 text-blue-600" />
        Controles Existentes
      </h3>

      {sinControles ? (
        <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center">
          <Shield className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No se han definido controles aún</p>
        </div>
      ) : (
        <>
          {cargando && (
            <p className="flex items-center text-xs text-gray-500 mb-2"><Loader2 className="w-3 h-3 animate-spin mr-1" />Cargando seguimiento…</p>
          )}
          {error && (
            <div role="alert" className="flex items-center justify-between gap-2 text-xs bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 mb-2">
              <span>No se pudo cargar el seguimiento de los controles.</span>
              <Button variant="outline" size="sm" onClick={onReintentar}>Reintentar</Button>
            </div>
          )}

          {vista ? (
            <div className="space-y-3">
              {vista.controles.map(control => (
                <TarjetaControl
                  key={control.controlId}
                  control={control}
                  vista={vista}
                  puedeRegistrar={puedeRegistrar}
                  onRegistrar={onRegistrar}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {controlesRiesgo!.map((control, idx) => (
                <div key={control.id || idx} className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{control.descripcion}</p>
                    <Barra efectividad={control.efectividad} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Barra({ efectividad }: { efectividad: number }) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full">
        <div className="h-2 bg-green-600 rounded-full transition-all" style={{ width: `${efectividad}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-700">{efectividad}% efectivo</span>
    </div>
  );
}

function TarjetaControl({ control, vista, puedeRegistrar, onRegistrar }: {
  control: ControlSeguimientoAPI;
  vista: RiesgoSeguimientosAPI;
  puedeRegistrar: boolean;
  onRegistrar: (control: ControlSeguimientoAPI, cuatrimestre?: number) => void;
}) {
  const historial = vista.historial.filter(s => s.controlId === control.controlId);
  const hayAbierto = control.cortes.some(c => c.puedeRegistrar);

  return (
    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg" data-testid={`control-${control.controlId}`}>
      <div className="flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{control.descripcion}</p>
          <Barra efectividad={control.efectividad} />
        </div>
        {puedeRegistrar && (
          <Button
            size="sm"
            variant="outline"
            disabled={!hayAbierto}
            title={hayAbierto ? undefined : 'No hay un cuatrimestre abierto'}
            onClick={() => onRegistrar(control)}
            className="flex-shrink-0 bg-white"
          >
            <ClipboardCheck className="w-4 h-4 mr-1" />
            Registrar seguimiento
          </Button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
        {control.cortes.map(corte => {
          const estado = ESTADO_CORTE_CONFIG[corte.estado];
          return (
            <div key={corte.cuatrimestre} className="bg-white border border-gray-200 rounded p-2 text-xs">
              <div className="flex items-center justify-between gap-1">
                <span className="font-semibold text-gray-800">{corte.label}</span>
                <span className={`px-1.5 py-0.5 rounded border font-bold ${estado.className}`}>{estado.label}</span>
              </div>
              <p className="text-gray-500 mt-1">{formatearFechaISO(corte.inicio)} – {formatearFechaISO(corte.fin)}</p>
              {corte.seguimiento && (
                <p className="text-gray-700 mt-1">{RESULTADO_LABEL[corte.seguimiento.resultado]} · {corte.seguimiento.efectividad}%</p>
              )}
              {puedeRegistrar && corte.puedeRegistrar && (
                <button
                  type="button"
                  className="mt-1 text-blue-700 hover:underline"
                  onClick={() => onRegistrar(control, corte.cuatrimestre)}
                >
                  {corte.seguimiento ? `Editar ${corte.label}` : `Registrar ${corte.label}`}
                </button>
              )}
              {corte.seguimiento && !corte.seguimiento.editable && (
                <p className="text-gray-400 mt-1">Cuatrimestre cerrado: solo lectura</p>
              )}
            </div>
          );
        })}
      </div>

      <details className="mt-3">
        <summary className="text-xs font-semibold text-blue-800 cursor-pointer">
          Historial de seguimientos ({historial.length})
        </summary>
        {historial.length === 0 ? (
          <p className="text-xs text-gray-500 mt-2">Sin seguimientos registrados</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {historial.map(s => (
              <li key={s.id} className="bg-white border border-gray-200 rounded p-2 text-xs">
                <p className="font-semibold text-gray-800">
                  {s.cuatrimestreLabel} {s.vigencia} · {RESULTADO_LABEL[s.resultado]} · {s.efectividad}%
                </p>
                <p className="text-gray-500">Ejecutado el {formatearFechaISO(s.fechaEjecucion)} · {s.responsable}</p>
                <p className="text-gray-700 mt-1 whitespace-pre-wrap">{s.comentarios}</p>
                {s.evidencias.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {s.evidencias.map(e => (
                      <li key={e.archivo}>
                        <a
                          href={riesgosService.getEvidenciaSeguimientoUrl(e.archivo, e.nombre)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-700 hover:underline"
                        >
                          <Paperclip className="w-3 h-3" />{e.nombre} ({formatearTamano(e.tamano)})<Download className="w-3 h-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </details>
    </div>
  );
}
