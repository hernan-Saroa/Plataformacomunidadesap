/**
 * Banner de versionamiento del Programa Anual de Auditoría (EFDS-1919 / EFDS-1639).
 *
 * Muestra la versión vigente y su estado. Las versiones generadas son de solo
 * consulta; el programa se sigue modificando, y cualquier modificación (o
 * "Iniciar ajuste") abre el ajuste que la siguiente versión cierra, desde este
 * banner o al exportar.
 */
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock, CheckCircle2, PencilLine, Download, History, X as XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { controlInternoService } from '../services/api/controlInternoService';
import type {
  EntradaLogProgramaAnual,
  EstadoProgramaAnual,
  ResumenVersionProgramaAnual,
} from '../services/api/controlInternoService';
import { descargarVersionProgramaAnual } from './services/versionesProgramaAnual';

/** Lo emite quien crea una versión para que el banner se actualice. */
export const EVENTO_VERSION_PROGRAMA = 'programa-anual:version';

const ETIQUETAS_CAMPO_PROGRAMA: Record<string, string> = {
  nombre: 'Unidad auditada',
  areaObjetivo: 'Área objetivo',
  tipo: 'Tipo',
  responsableArea: 'Responsable del área',
  observaciones: 'Observaciones',
  fechaInicio: 'Inicio de planeación',
  fechaFinPlaneacion: 'Fin de planeación',
  fechaInicioEjecucion: 'Inicio de ejecución',
  fechaFinEjecucion: 'Fin de ejecución',
  fechaInicioComunicacion: 'Inicio de comunicación',
  fechaFin: 'Fin de comunicación',
};

const ETIQUETAS_LOG: Record<EntradaLogProgramaAnual['tipo'], string> = {
  version: 'Versión',
  ajuste: 'Ajuste',
  auditores: 'Auditores',
  programacion: 'Programación',
  ampliacion: 'Ampliación de plazo',
  creacion: 'Auditoría agregada',
};

const etiquetaVersion = (numero: number) => `v${numero}.0`;
const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
const fechaHora = (iso: string) => new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota' });

interface BannerVersionProgramaAnualProps {
  vigencia: number;
  /** Generar versión e iniciar ajuste; el historial siempre se puede consultar. */
  puedeGestionar?: boolean;
}

export function BannerVersionProgramaAnual({ vigencia, puedeGestionar = true }: BannerVersionProgramaAnualProps) {
  const [estado, setEstado] = useState<EstadoProgramaAnual | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [modalGenerar, setModalGenerar] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [modalHistorial, setModalHistorial] = useState(false);
  const [pestanaHistorial, setPestanaHistorial] = useState<'versiones' | 'log'>('versiones');
  const [versiones, setVersiones] = useState<ResumenVersionProgramaAnual[]>([]);
  const [log, setLog] = useState<EntradaLogProgramaAnual[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [descargando, setDescargando] = useState<number | null>(null);

  const cargarEstado = useCallback(async () => {
    try {
      setEstado(await controlInternoService.getEstadoProgramaAnual(vigencia));
    } catch (error) {
      console.error('[BannerVersion] No se pudo cargar el estado del Programa Anual:', error);
      setEstado(null);
    }
  }, [vigencia]);

  const cargarHistorial = useCallback(async () => {
    setCargandoHistorial(true);
    try {
      const [listaVersiones, entradas] = await Promise.all([
        controlInternoService.getVersionesProgramaAnual(vigencia),
        controlInternoService.getLogProgramaAnual(vigencia),
      ]);
      setVersiones(Array.isArray(listaVersiones) ? listaVersiones : []);
      setLog(Array.isArray(entradas) ? entradas : []);
    } catch (error) {
      console.error('[BannerVersion] No se pudo cargar el historial:', error);
      toast.error('No se pudo cargar el historial del Programa Anual');
    } finally {
      setCargandoHistorial(false);
    }
  }, [vigencia]);

  useEffect(() => {
    cargarEstado();
  }, [cargarEstado]);

  useEffect(() => {
    const alGenerarse = () => {
      cargarEstado();
      if (modalHistorial) cargarHistorial();
    };
    window.addEventListener(EVENTO_VERSION_PROGRAMA, alGenerarse);
    return () => window.removeEventListener(EVENTO_VERSION_PROGRAMA, alGenerarse);
  }, [cargarEstado, cargarHistorial, modalHistorial]);

  const generarVersion = async () => {
    setProcesando(true);
    try {
      const resultado = await controlInternoService.resolverVersionProgramaAnual(vigencia, {
        motivo: motivo.trim() || undefined,
        cerrarAjuste: true,
      });
      toast.success(
        resultado.nueva
          ? `Se generó la versión ${etiquetaVersion(resultado.version)} del Programa Anual ${vigencia}`
          : estado?.enAjuste
            ? 'No hubo cambios: el ajuste se cerró sin crear una versión nueva'
            : `Sin cambios: sigue vigente la versión ${etiquetaVersion(resultado.version)}`,
      );
      setModalGenerar(false);
      setMotivo('');
      window.dispatchEvent(new CustomEvent(EVENTO_VERSION_PROGRAMA, { detail: { vigencia } }));
    } catch (error: any) {
      toast.error('No se pudo generar la versión', { description: error?.message });
    } finally {
      setProcesando(false);
    }
  };

  const iniciarAjuste = async () => {
    setProcesando(true);
    try {
      setEstado(await controlInternoService.iniciarAjusteProgramaAnual(vigencia));
      toast.success('Ajuste iniciado: los cambios del programa darán origen a la siguiente versión');
    } catch (error: any) {
      toast.error('No se pudo iniciar el ajuste', { description: error?.message });
    } finally {
      setProcesando(false);
    }
  };

  const abrirHistorial = () => {
    setPestanaHistorial('versiones');
    setModalHistorial(true);
    cargarHistorial();
  };

  const descargarVersion = async (numero: number) => {
    setDescargando(numero);
    try {
      const resultado = await descargarVersionProgramaAnual(vigencia, numero);
      if (resultado.exito) toast.success(`Versión ${etiquetaVersion(numero)} descargada`);
      else toast.error('Error al descargar: ' + resultado.error);
    } catch (error) {
      console.error('[BannerVersion] Error al descargar versión:', error);
      toast.error(`No se pudo descargar la versión ${etiquetaVersion(numero)}`);
    } finally {
      setDescargando(null);
    }
  };

  // Sin estado (por ejemplo, sin las migraciones de versionamiento) no se muestra.
  if (!estado) return null;

  const actual = estado.versionActual;
  // Modificar el programa activa el ajuste aunque nadie lo haya iniciado.
  const enAjuste = Boolean(actual) && (Boolean(estado.enAjuste) || estado.cambiosPendientes > 0);
  const vigente = Boolean(actual) && !enAjuste;
  const puedeGenerar = !actual || enAjuste;

  const titulo = `Versión actual: ${etiquetaVersion(actual?.version ?? 1)}`;
  let etiqueta = 'Borrador';
  let detalle = 'Aún no se ha generado una versión formal · sin fecha de publicación';
  if (actual && enAjuste) {
    etiqueta = 'En ajuste';
    detalle =
      (estado.enAjuste
        ? `Ajuste iniciado el ${fecha(estado.enAjuste.iniciadoEn)} por ${estado.enAjuste.iniciadoPor}`
        : 'Hay modificaciones del programa sin versionar') +
      ` · ${estado.cambiosPendientes} cambio(s) sin versionar · borrador de la ${etiquetaVersion(actual.version + 1)}`;
  } else if (actual) {
    etiqueta = 'Vigente';
    detalle =
      `Publicada el ${fecha(actual.fecha)} por ${actual.generadaPor}` +
      (actual.motivo ? ` · Motivo: ${actual.motivo}` : '');
  }

  return (
    <>
      <div
        className={`mb-3 rounded-xl border-2 px-4 py-3 flex flex-wrap items-center justify-between gap-3 ${
          vigente ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              vigente ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {vigente ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold text-gray-900">{titulo}</p>
              <span
                className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                  vigente ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                }`}
              >
                {etiqueta}
              </span>
            </div>
            <p className="text-xs text-gray-600">{detalle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={abrirHistorial}
            className="px-4 py-2 bg-white border border-gray-300 hover:border-[#1e5da8] rounded-lg text-sm font-semibold text-gray-700 flex items-center gap-2 transition-colors"
          >
            <History className="w-4 h-4" />
            Ver historial
          </button>
          {puedeGestionar && vigente && (
            <button
              onClick={iniciarAjuste}
              disabled={procesando}
              className="px-4 py-2 bg-white border border-[#1e5da8] text-[#1e5da8] hover:bg-blue-50 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <PencilLine className="w-4 h-4" />
              Iniciar ajuste
            </button>
          )}
          {puedeGestionar && puedeGenerar && (
            <button
              onClick={() => setModalGenerar(true)}
              disabled={procesando}
              className="px-4 py-2 bg-[#003DA5] hover:bg-[#1e5da8] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              Generar versión
            </button>
          )}
        </div>
      </div>

      {/* Los modales van al body: dentro de la pantalla un contenedor animado los descuadra. */}
      {modalGenerar &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="px-6 py-4 bg-[#003DA5] flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-black text-white">Generar versión del Programa Anual {vigencia}</h3>
                  <p className="text-sm text-white/90">La versión queda como registro histórico de solo consulta.</p>
                </div>
                <button onClick={() => setModalGenerar(false)} className="p-2 hover:bg-white/20 rounded-lg" aria-label="Cerrar">
                  <XIcon className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="p-6 space-y-3">
                <p className="text-sm text-gray-700">
                  {actual
                    ? `Cambios frente a la versión ${etiquetaVersion(actual.version)}: ${estado.cambiosPendientes}. Si no hay cambios no se crea una versión nueva.`
                    : 'Se generará la primera versión formal del programa.'}
                </p>
                <label className="block text-sm font-semibold text-gray-800">
                  Motivo del cambio <span className="font-normal text-gray-500">(opcional)</span>
                  <textarea
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    maxLength={1000}
                    rows={3}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-normal"
                    placeholder="Ej.: Reprogramación aprobada por el Comité Institucional de Coordinación de Control Interno"
                  />
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setModalGenerar(false)}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={generarVersion}
                    disabled={procesando}
                    className="px-4 py-2 bg-[#003DA5] hover:bg-[#1e5da8] text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    {procesando ? 'Generando...' : 'Generar versión'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {modalHistorial &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
              <div className="px-6 py-4 bg-[#003DA5] flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-black text-white mb-1">Historial del Programa Anual {vigencia}</h3>
                  <p className="text-sm text-white/90">Versiones de solo consulta y log de cambios del programa.</p>
                </div>
                <button onClick={() => setModalHistorial(false)} className="p-2 hover:bg-white/20 rounded-lg" aria-label="Cerrar">
                  <XIcon className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="px-6 flex gap-4 border-b border-gray-200">
                {(['versiones', 'log'] as const).map((pestana) => (
                  <button
                    key={pestana}
                    onClick={() => setPestanaHistorial(pestana)}
                    className={`py-3 text-sm font-semibold border-b-2 transition-colors ${
                      pestanaHistorial === pestana
                        ? 'border-[#003DA5] text-[#003DA5]'
                        : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {pestana === 'versiones' ? `Versiones (${versiones.length})` : `Log de cambios (${log.length})`}
                  </button>
                ))}
              </div>

              <div className="p-6 overflow-y-auto">
                {cargandoHistorial && <p className="text-sm text-gray-500">Cargando historial...</p>}

                {!cargandoHistorial && pestanaHistorial === 'versiones' && (
                  <div className="space-y-3">
                    {versiones.length === 0 && (
                      <p className="text-sm text-gray-600">Aún no se ha generado una versión formal.</p>
                    )}
                    {versiones.map((v) => (
                      <div key={v.id} className="border border-gray-200 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-black text-gray-900">
                              Versión {etiquetaVersion(v.version)}
                              {v.version === actual?.version && (
                                <span className="ml-2 px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800">Vigente</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-600">{fechaHora(v.fecha)} · {v.generadaPor}</p>
                            {v.motivo && <p className="text-xs text-gray-700 mt-1">Motivo: {v.motivo}</p>}
                          </div>
                          <button
                            onClick={() => descargarVersion(v.version)}
                            disabled={descargando === v.version}
                            className="px-3 py-2 bg-white border border-gray-300 hover:border-[#2962FF] rounded-lg text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                          >
                            <Download className="w-4 h-4" />
                            {descargando === v.version ? 'Descargando...' : 'Descargar'}
                          </button>
                        </div>

                        {v.cambios.length === 0 ? (
                          <p className="mt-2 text-xs text-gray-500">Versión inicial del programa.</p>
                        ) : (
                          <ul className="mt-2 space-y-1">
                            {v.cambios.map((c, i) => (
                              <li key={`${v.id}-${i}`} className="text-xs text-gray-700">
                                <span className="font-bold">
                                  {c.tipo === 'agregada' ? 'Agregada' : c.tipo === 'eliminada' ? 'Retirada' : 'Modificada'}:
                                </span>{' '}
                                {c.nombre} ({c.codigo})
                                {c.campos?.map((campo) => (
                                  <span key={campo.campo} className="block pl-3 text-gray-600">
                                    {ETIQUETAS_CAMPO_PROGRAMA[campo.campo] || campo.campo}: {campo.antes || 'vacío'} → {campo.despues || 'vacío'}
                                  </span>
                                ))}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {!cargandoHistorial && pestanaHistorial === 'log' && (
                  <>
                    {log.length === 0 && <p className="text-sm text-gray-600">Sin cambios registrados.</p>}
                    {log.length > 0 && (
                      <ul className="divide-y divide-gray-100 border border-gray-200 rounded-xl">
                        {log.map((entrada, i) => (
                          <li key={`${entrada.fecha}-${i}`} className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="px-2 py-0.5 rounded-md bg-gray-100 font-bold text-gray-700">{ETIQUETAS_LOG[entrada.tipo]}</span>
                              {entrada.auditoria && <span className="font-semibold text-gray-900">{entrada.auditoria}</span>}
                              <span className="ml-auto text-gray-500">{fechaHora(entrada.fecha)} · {entrada.autor}</span>
                            </div>
                            <p className="mt-1 text-sm text-gray-700">{entrada.detalle}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
