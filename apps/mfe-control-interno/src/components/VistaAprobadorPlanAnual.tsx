/**
 * Vista del aprobador del Plan Anual (EFDS-2320).
 *
 * Quien solo aprueba (está en el comité y tiene el permiso de aprobar, sin el de
 * editar ni activar) entra a una sola página: revisa el Plan Anual y el Programa
 * Anual —ver en pantalla o descargar— y firma. La firma aprueba los dos.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { CalendarDays, ChevronDown, Download, Eye, FileText, Loader2, X } from 'lucide-react';
import { VisorOnlyOffice } from './VisorOnlyOffice';
import { subirVistaPrevia } from './services/onlyofficeVisor';
import { exportarProgramaAnualVersionado } from './services/versionesProgramaAnual';
import { usePlanAnualVigenciaContextOptional } from './PlanAnualVigenciaContext';

const MORADO = '#5b21b6';
const MORADO_TEXTO = '#4c1d95';
const MORADO_SUAVE = '#ede9fe';
const MORADO_BORDE = '#c4b5fd';

interface PlanResumen {
  id: string;
  vigencia: number;
  version: number | string;
  estado: string;
  fechaCreacion?: string;
  jefeOCI?: { nombre?: string; cargo?: string };
}

interface Props {
  plan: PlanResumen;
  planesDisponibles?: PlanResumen[];
  onCambiarPlan?: (planId: string) => void;
  /** Arma el PDF del Plan Anual sin descargarlo. */
  generarPdfPlan: () => Promise<Blob | null>;
  descargarPdfPlan: () => void;
  descargarExcelPlan: () => void;
  exportandoPlan: 'pdf' | 'excel' | null;
  /** Bloque de firma (SeccionAprobacion en modo aprobador). */
  bloqueAprobacion: ReactNode;
}

interface VistaPrevia {
  titulo: string;
  id: string | null;
  archivo: Blob;
  nombreArchivo: string;
  falloVisor: string | null;
}

const ETIQUETA_ESTADO: Record<string, string> = {
  BORRADOR: 'Borrador',
  EN_REVISION: 'Pendiente de aprobación',
  DEVUELTO: 'Devuelto con observaciones',
  APROBADO: 'Aprobado',
  VIGENTE: 'Vigente',
  CERRADO: 'Cerrado',
};

function descargarBlob(archivo: Blob, nombre: string) {
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

/** Botonera de la propuesta: ver | descargar | elegir formato. */
function AccionesDocumento({
  onVer,
  onDescargar,
  formatos,
  ocupado,
  etiqueta,
}: {
  onVer: () => void;
  onDescargar: () => void;
  formatos: { etiqueta: string; accion: () => void }[];
  ocupado: boolean;
  etiqueta: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: globalThis.MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [abierto]);

  const estiloBoton = { color: MORADO };
  return (
    <div ref={ref} className="relative flex-shrink-0">
      <div className="flex items-stretch rounded-lg border-2 bg-white" style={{ borderColor: MORADO_BORDE }}>
        <button
          type="button"
          onClick={onVer}
          disabled={ocupado}
          title={`Ver ${etiqueta}`}
          aria-label={`Ver ${etiqueta}`}
          className="px-4 py-2.5 hover:bg-gray-50 disabled:opacity-50 rounded-l-md"
          style={estiloBoton}
        >
          {ocupado ? <Loader2 className="w-5 h-5 animate-spin" /> : <Eye className="w-5 h-5" />}
        </button>
        <span className="w-px my-2" style={{ backgroundColor: MORADO_BORDE }} />
        <button
          type="button"
          onClick={onDescargar}
          disabled={ocupado}
          title={`Descargar ${etiqueta} (${formatos[0]?.etiqueta})`}
          aria-label={`Descargar ${etiqueta}`}
          className="px-4 py-2.5 hover:bg-gray-50 disabled:opacity-50"
          style={estiloBoton}
        >
          <Download className="w-5 h-5" />
        </button>
        <span className="w-px my-2" style={{ backgroundColor: MORADO_BORDE }} />
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          disabled={ocupado}
          title="Elegir formato de descarga"
          aria-label="Elegir formato de descarga"
          aria-expanded={abierto}
          className="px-3 py-2.5 hover:bg-gray-50 disabled:opacity-50 rounded-r-md"
          style={estiloBoton}
        >
          <ChevronDown className={`w-5 h-5 transition-transform ${abierto ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {abierto && (
        <div className="absolute right-0 top-full mt-1 z-30 min-w-[190px] rounded-lg border border-gray-200 bg-white shadow-xl p-1">
          {formatos.map((f) => (
            <button
              key={f.etiqueta}
              type="button"
              onClick={() => {
                setAbierto(false);
                f.accion();
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-gray-400" />
              Descargar {f.etiqueta}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TarjetaDocumento({
  icono,
  titulo,
  descripcion,
  acciones,
}: {
  icono: ReactNode;
  titulo: string;
  descripcion: ReactNode;
  acciones: ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-5 flex flex-col md:flex-row md:items-center gap-4">
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: MORADO_SUAVE }}>
          {icono}
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold" style={{ color: MORADO_TEXTO }}>{titulo}</h3>
          <p className="text-sm text-gray-600 mt-1">{descripcion}</p>
        </div>
      </div>
      {acciones}
    </div>
  );
}

export function VistaAprobadorPlanAnual({
  plan,
  planesDisponibles = [],
  onCambiarPlan,
  generarPdfPlan,
  descargarPdfPlan,
  descargarExcelPlan,
  exportandoPlan,
  bloqueAprobacion,
}: Props) {
  const [vistaPrevia, setVistaPrevia] = useState<VistaPrevia | null>(null);
  const [preparando, setPreparando] = useState<'plan' | 'programa' | null>(null);
  const [descargandoPrograma, setDescargandoPrograma] = useState(false);
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const [urlRespaldo, setUrlRespaldo] = useState<string | null>(null);
  // Mismo camino que el selector de vigencia de arriba, para que los dos queden iguales
  const contextoVigencia = usePlanAnualVigenciaContextOptional();
  const verOtroPlan = (planId: string) => {
    if (contextoVigencia?.cambiarPlan) contextoVigencia.cambiarPlan(planId);
    else onCambiarPlan?.(planId);
    setHistorialAbierto(false);
  };

  const estado = String(plan.estado || '').toUpperCase().replace(/-/g, '_');
  const aprobado = estado === 'APROBADO' || estado === 'VIGENTE' || estado === 'CERRADO';

  // El PDF se puede ver con el visor del navegador si OnlyOffice no responde
  useEffect(() => {
    if (!vistaPrevia?.falloVisor || vistaPrevia.archivo.type !== 'application/pdf') {
      setUrlRespaldo(null);
      return;
    }
    const url = URL.createObjectURL(vistaPrevia.archivo);
    setUrlRespaldo(url);
    return () => URL.revokeObjectURL(url);
  }, [vistaPrevia]);

  const abrirVistaPrevia = async (
    cual: 'plan' | 'programa',
    titulo: string,
    generar: () => Promise<{ archivo: Blob; nombreArchivo: string } | null>,
  ) => {
    setPreparando(cual);
    try {
      const generado = await generar();
      if (!generado) return;
      let id: string | null = null;
      let falloVisor: string | null = null;
      try {
        id = await subirVistaPrevia(generado.archivo, generado.nombreArchivo);
      } catch (e) {
        falloVisor = e instanceof Error ? e.message : 'No se pudo preparar la vista previa';
      }
      setVistaPrevia({ titulo, id, falloVisor, ...generado });
    } catch (e) {
      toast.error('No se pudo generar el documento', { description: e instanceof Error ? e.message : undefined });
    } finally {
      setPreparando(null);
    }
  };

  const verPlan = () =>
    abrirVistaPrevia('plan', `Plan Anual de Auditoría ${plan.vigencia}`, async () => {
      const archivo = await generarPdfPlan();
      return archivo ? { archivo, nombreArchivo: `Plan-Anual-Auditoria-${plan.vigencia}.pdf` } : null;
    });

  const verPrograma = () =>
    abrirVistaPrevia('programa', `Programa Anual de Auditoría ${plan.vigencia}`, async () => {
      const resultado = await exportarProgramaAnualVersionado(plan.vigencia, { soloArchivo: true });
      if (!resultado.exito || !resultado.archivo) throw new Error(resultado.error || 'No se pudo generar el Programa Anual');
      return { archivo: resultado.archivo, nombreArchivo: resultado.nombreArchivo };
    });

  const descargarPrograma = async () => {
    setDescargandoPrograma(true);
    try {
      const resultado = await exportarProgramaAnualVersionado(plan.vigencia);
      if (resultado.exito) toast.success(resultado.mensaje || 'Programa Anual descargado');
      else toast.error('No se pudo descargar el Programa Anual', { description: resultado.error });
    } catch (e) {
      toast.error('No se pudo descargar el Programa Anual', { description: e instanceof Error ? e.message : undefined });
    } finally {
      setDescargandoPrograma(false);
    }
  };

  const fechaCreacion = plan.fechaCreacion
    ? new Date(plan.fechaCreacion).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';
  const otrosPlanes = planesDisponibles.filter((p) => p.id !== plan.id);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Resumen del plan */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-5 flex flex-col xl:flex-row xl:items-center gap-5">
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: MORADO }}>
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-gray-900 whitespace-nowrap">Plan Anual de Auditoría {plan.vigencia}</h2>
              <span
                className="px-2.5 py-0.5 rounded-md border text-xs font-bold whitespace-nowrap"
                style={{ color: MORADO, borderColor: MORADO_BORDE, backgroundColor: '#faf8ff' }}
              >
                {ETIQUETA_ESTADO[estado] || plan.estado}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Versión {plan.version}
              {plan.jefeOCI?.nombre ? ` · ${plan.jefeOCI.nombre}` : ''}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-3 text-sm flex-1 xl:pl-6">
          <div>
            <p className="text-xs text-gray-500">Vigencia</p>
            <p className="font-bold text-gray-900">{plan.vigencia}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Versión</p>
            <p className="font-bold text-gray-900">V{plan.version}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Jefe responsable</p>
            <p className="font-bold text-gray-900">{plan.jefeOCI?.nombre || '—'}</p>
            {plan.jefeOCI?.cargo && <p className="text-xs text-gray-500">{plan.jefeOCI.cargo}</p>}
          </div>
          <div>
            <p className="text-xs text-gray-500">Fecha de creación</p>
            <p className="font-bold text-gray-900">{fechaCreacion}</p>
          </div>
        </div>
      </div>

      <TarjetaDocumento
        icono={<FileText className="w-7 h-7" style={{ color: MORADO }} />}
        titulo="Plan Anual de Auditoría"
        descripcion="Revise el Plan Anual de Auditoría con la información de objetivos, alcance, procesos y actividades."
        acciones={
          <AccionesDocumento
            etiqueta="el Plan Anual"
            onVer={verPlan}
            onDescargar={descargarPdfPlan}
            ocupado={preparando === 'plan' || !!exportandoPlan}
            formatos={[
              { etiqueta: 'PDF', accion: descargarPdfPlan },
              { etiqueta: 'Excel', accion: descargarExcelPlan },
            ]}
          />
        }
      />

      <TarjetaDocumento
        icono={<CalendarDays className="w-7 h-7" style={{ color: MORADO }} />}
        titulo="Programa Anual de Auditoría"
        descripcion={
          <>
            Revise la programación de las auditorías, procesos, unidades auditables, fechas y equipo auditor.
            {!aprobado && (
              <span className="block text-xs text-gray-500 mt-1">
                Sale como borrador: la versión 1 del Programa Anual se genera con la aprobación del plan.
              </span>
            )}
          </>
        }
        acciones={
          <AccionesDocumento
            etiqueta="el Programa Anual"
            onVer={verPrograma}
            onDescargar={descargarPrograma}
            ocupado={preparando === 'programa' || descargandoPrograma}
            formatos={[{ etiqueta: 'Excel', accion: descargarPrograma }]}
          />
        }
      />

      {bloqueAprobacion}

      {/* Planes registrados */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-5">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-50 border border-gray-200">
            <FileText className="w-5 h-5 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-900">Planes registrados</h3>
            <p className="text-xs text-gray-500">
              El plan que está viendo está marcado como {(ETIQUETA_ESTADO[estado] || plan.estado).toLowerCase()}.
            </p>
          </div>
          <span className="text-sm text-gray-600 whitespace-nowrap">{Math.max(planesDisponibles.length, 1)} plan(es)</span>
          {otrosPlanes.length > 0 && (
            <button
              type="button"
              onClick={() => setHistorialAbierto((v) => !v)}
              className="px-4 py-2 rounded-lg border-2 border-gray-200 text-sm font-semibold text-gray-800 hover:bg-gray-50 flex items-center gap-2"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${historialAbierto ? 'rotate-180' : ''}`} />
              {historialAbierto ? 'Contraer historial' : 'Expandir historial'}
            </button>
          )}
        </div>
        {historialAbierto && (
          <div className="mt-4 divide-y divide-gray-100 border-t border-gray-100">
            {planesDisponibles.map((p) => {
              const actual = p.id === plan.id;
              const est = String(p.estado || '').toUpperCase().replace(/-/g, '_');
              return (
                <div key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="text-sm">
                    <span className="font-semibold text-gray-900">Plan Anual {p.vigencia}</span>
                    <span className="text-gray-500"> · V{p.version} · {ETIQUETA_ESTADO[est] || p.estado}</span>
                  </div>
                  {actual ? (
                    <span className="text-xs font-bold" style={{ color: MORADO }}>Viendo</span>
                  ) : (
                    (contextoVigencia || onCambiarPlan) && (
                      <button
                        type="button"
                        onClick={() => verOtroPlan(p.id)}
                        className="text-xs font-bold hover:underline"
                        style={{ color: MORADO }}
                      >
                        Ver este plan
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Vista previa */}
      {vistaPrevia && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={() => setVistaPrevia(null)}>
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-200">
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 truncate">{vistaPrevia.titulo}</h3>
                <p className="text-xs text-gray-500">Vista previa · {vistaPrevia.nombreArchivo}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => descargarBlob(vistaPrevia.archivo, vistaPrevia.nombreArchivo)}
                  className="px-4 py-2 rounded-lg text-white text-sm font-bold flex items-center gap-2"
                  style={{ backgroundColor: MORADO }}
                >
                  <Download className="w-4 h-4" />
                  Descargar
                </button>
                <button
                  type="button"
                  onClick={() => setVistaPrevia(null)}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                  aria-label="Cerrar vista previa"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              {!vistaPrevia.falloVisor && vistaPrevia.id ? (
                <VisorOnlyOffice
                  origen="vista-previa"
                  id={vistaPrevia.id}
                  onFallo={(motivo) => setVistaPrevia((v) => (v ? { ...v, falloVisor: motivo } : v))}
                />
              ) : urlRespaldo ? (
                <iframe title={vistaPrevia.titulo} src={urlRespaldo} className="w-full h-full border-0" />
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-center p-8 text-gray-600">
                  <p className="font-semibold text-gray-900">No se pudo mostrar la vista previa</p>
                  <p className="text-sm">{vistaPrevia.falloVisor}</p>
                  <button
                    type="button"
                    onClick={() => descargarBlob(vistaPrevia.archivo, vistaPrevia.nombreArchivo)}
                    className="px-4 py-2 rounded-lg text-white text-sm font-bold flex items-center gap-2"
                    style={{ backgroundColor: MORADO }}
                  >
                    <Download className="w-4 h-4" />
                    Descargar el documento
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
