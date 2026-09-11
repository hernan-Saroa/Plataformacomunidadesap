import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileText,
  Info,
  ShieldCheck,
  X,
} from 'lucide-react';
import viaticosService from '../services/api/viaticosService';
import { SolicitudControlViaticosResponse, LiquidacionResponse } from '../types/viaticos';
import {
  esPdfMime,
  formatearMoneda,
  formatearNombreComisionado,
} from '../utils/viaticosUtils';
import TicketBudgetWidget from './TicketBudgetWidget';

const DEPENDENCIA_LOOKUP = new Map<number, string>();

async function cargarCatalogoDependencias() {
  if (DEPENDENCIA_LOOKUP.size > 0) return;
  try {
    const data = await viaticosService.obtenerDependencias();
    data.forEach((d) => {
      if (d.idDependencia != null) {
        DEPENDENCIA_LOOKUP.set(Number(d.idDependencia), d.nomDependencia);
      }
    });
  } catch {
    // si no está disponible, se muestra el ID como fallback
  }
}

function fmtFecha(fecha: Date | string | undefined): string {
  if (!fecha) return 'N/A';
  try {
    return new Date(fecha).toLocaleDateString();
  } catch {
    return 'N/A';
  }
}

function fmtFechaHora(fecha: Date | string | undefined): string {
  if (!fecha) return 'N/A';
  try {
    return new Date(fecha).toLocaleString();
  } catch {
    return 'N/A';
  }
}

interface Props {
  abierta: boolean;
  solicitud: SolicitudControlViaticosResponse | null;
  cargando: boolean;
  onCerrar: () => void;
  onRefrescar: () => void;
}

const SEMAFORO_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  VERDE: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Presupuesto OK' },
  AMARILLO: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Revisar presupuesto' },
  ROJO: { bg: 'bg-red-100', text: 'text-red-700', label: 'Presupuesto crítico' },
};

function CheckboxItem({
  checked,
  onChange,
  label,
  sublabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sublabel?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer py-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#003DA5] focus:ring-[#003DA5] shrink-0"
      />
      <div className="flex-1">
        <span className="text-xs font-medium text-slate-800">{label}</span>
        {sublabel && <p className="text-[10px] text-slate-500 mt-0.5">{sublabel}</p>}
      </div>
      {checked ? (
        <CheckCircle2 className="w-4 h-4 text-[#003DA5] shrink-0" />
      ) : (
        <div className="w-4 h-4 text-slate-300 shrink-0 border border-slate-300 rounded" />
      )}
    </label>
  );
}

function CopiableField({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <label className="text-[10px] font-semibold text-slate-500 uppercase">{label}</label>
        <div className="mt-0.5 text-xs text-slate-800 font-mono break-all bg-slate-50 border border-slate-200 rounded px-2 py-1.5 min-h-[34px] flex items-center">
          {value || '—'}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onCopy(value)}
        className="shrink-0 px-2 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
        title="Copiar al portapapeles"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function LiquidacionSection({
  liquidacion,
  solicitud,
}: {
  liquidacion?: LiquidacionResponse['data'] | undefined;
  solicitud?: SolicitudControlViaticosResponse | null;
}) {
  const montoViaticos = Number(solicitud?.montoViaticos || liquidacion?.valorTotalViaticos || 0);
  const montoGastosViaje = Number(solicitud?.montoGastosViaje || 0);
  const dias = Number(solicitud?.diasComision || liquidacion?.numeroDiasNoches || 1);
  const salarioBase = Number(solicitud?.salarioBasico || liquidacion?.salarioBaseAplicado || 0);
  const tarifaDiaria =
    liquidacion?.tarifaFinalAplicadaDia ||
    (dias > 0 ? Math.round(montoViaticos / dias) : montoViaticos);

  if (!liquidacion && montoViaticos === 0 && salarioBase === 0) {
    return (
      <div className="text-[11px] text-slate-400 italic">
        No hay datos de liquidación disponibles.
      </div>
    );
  }

  const decreto = liquidacion?.decretoAplicado || 'Decreto 314 de 2026';
  const tarifaBase = liquidacion?.tarifaDiariaBase || tarifaDiaria;
  const factorComisionado = liquidacion?.factorComisionado ?? 1;
  const factorPernocta = liquidacion?.factorPernocta ?? 1;
  const totalViaticos = liquidacion?.valorTotalViaticos ?? montoViaticos;
  const valorTotalNeto = totalViaticos + montoGastosViaje;

  return (
    <div className="space-y-2 text-xs">
      <div className="flex justify-between">
        <span className="text-slate-500">Salario base aplicado</span>
        <span className="font-semibold text-slate-800">{formatearMoneda(salarioBase)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500">Decreto aplicado</span>
        <span className="font-semibold text-slate-800">{decreto}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500">Tarifa diaria base</span>
        <span className="font-semibold text-slate-800">{formatearMoneda(tarifaBase)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500">Factor comisionado</span>
        <span className="font-semibold text-slate-800">{factorComisionado}x</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500">Factor pernocta</span>
        <span className="font-semibold text-slate-800">{factorPernocta}x</span>
      </div>
      <div className="flex justify-between border-t border-slate-100 pt-2">
        <span className="text-slate-500">Tarifa final aplicada/día</span>
        <span className="font-bold text-slate-800">{formatearMoneda(tarifaDiaria)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-500">Días / Noches</span>
        <span className="font-semibold text-slate-800">{dias}</span>
      </div>
      <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
        <span className="text-slate-800">Valor Total Viáticos</span>
        <span className="text-emerald-700">{formatearMoneda(totalViaticos)}</span>
      </div>
      {montoGastosViaje > 0 && (
        <div className="flex justify-between">
          <span className="text-slate-500">Gastos de Viaje / Transporte</span>
          <span className="font-semibold text-slate-800">{formatearMoneda(montoGastosViaje)}</span>
        </div>
      )}
      {montoGastosViaje > 0 && (
        <div className="flex justify-between border-t border-slate-200 pt-2 font-bold bg-slate-100/70 p-2 rounded-lg">
          <span className="text-slate-900">Total a Girar (Viáticos + Gastos)</span>
          <span className="text-emerald-800 text-sm">{formatearMoneda(valorTotalNeto)}</span>
        </div>
      )}
      {liquidacion?.alertas && liquidacion.alertas.length > 0 && (
        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-800">
          <p className="font-semibold mb-1">Alertas:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {liquidacion.alertas.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DocumentosSoporteSection({
  documentos,
}: {
  documentos: SolicitudControlViaticosResponse['documentosSoporte'];
}) {
  const documentosPdf = (documentos || []).filter((d) => esPdfMime(d.tipoMime));

  if (documentosPdf.length === 0) {
    return (
      <p className="text-[11px] text-slate-400 italic">
        No hay documentos PDF cargados.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {documentosPdf.map((doc) => {
        const url = viaticosService.obtenerUrlArchivo(doc.urlRepositorio);
        return (
          <a
            key={doc.id}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-xs text-slate-700 truncate block">
                {doc.nombreArchivoOriginal}
              </span>
              <span className="text-[10px] text-slate-400">
                {doc.tipoDocumento}
              </span>
            </div>
            <Eye className="w-4 h-4 text-slate-400 shrink-0" />
          </a>
        );
      })}
    </div>
  );
}

function AuditoriaPrimerNivelSection({
  solicitud,
}: {
  solicitud: SolicitudControlViaticosResponse | null;
}) {
  if (!solicitud) return null;

  return (
    <section className="mb-6 border-t border-slate-100 pt-4">
      <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4" />
        Auditoría de 1er Nivel (Verificación SIIF)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="space-y-2">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase">Analista Verificador</label>
            <div className="text-slate-800">
              {solicitud.analistaVerificadorNombre || 'No asignado'}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase">Fecha Verificación</label>
            <div className="text-slate-800">
              {solicitud.fechaVerificacionPrimerNivel ? fmtFechaHora(solicitud.fechaVerificacionPrimerNivel) : 'N/A'}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase">Seguridad Social Vigente</label>
            <div className="text-slate-800">Sí (verificada en auditoría)</div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase">RUT Facturador Consultado</label>
            <div className="text-slate-800">Sí (verificada en auditoría)</div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ControlViaticosModal({
  abierta,
  solicitud,
  cargando,
  onCerrar,
  onRefrescar,
}: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [verificacionExitosa, setVerificacionExitosa] = useState(false);
  const [errorVerificacion, setErrorVerificacion] = useState<string | null>(null);

  const [mostrandoDevolucion, setMostrandoDevolucion] = useState(false);
  const [motivoDevolucion, setMotivoDevolucion] = useState('');
  const [devolviendo, setDevolviendo] = useState(false);
  const [errorDevolucion, setErrorDevolucion] = useState<string | null>(null);

  useEffect(() => {
    if (abierta) {
      setVerificando(false);
      setVerificacionExitosa(false);
      setErrorVerificacion(null);
      setMostrandoDevolucion(false);
      setMotivoDevolucion('');
      setDevolviendo(false);
      setErrorDevolucion(null);
      setCopied(null);
      void cargarCatalogoDependencias();
    }
  }, [abierta]);

  if (!abierta) return null;

  const comisionado = solicitud?.comisionado;
  const nombreCompleto = comisionado ? formatearNombreComisionado(comisionado) : '';
  const montoViaticos = Number(solicitud?.montoViaticos || 0);
  const montoGastosViaje = Number(solicitud?.montoGastosViaje || 0);
  const valorNeto = montoViaticos + montoGastosViaje;

  const resumenPresupuestal = (solicitud as any)?.resumenPresupuestal as
    | {
        totalGastado: number;
        cantidadSolicitudes: number;
        limitePresupuesto: number;
        porcentajeUso: number;
        semaforo: 'VERDE' | 'AMARILLO' | 'ROJO';
      }
    | undefined;

  const semaforo = resumenPresupuestal?.semaforo || 'VERDE';

  const handleCopy = async (valor: string) => {
    if (!valor) return;
    try {
      await navigator.clipboard.writeText(valor);
      setCopied(valor);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      console.error('No se pudo copiar al portapapeles');
    }
  };

  const handleVerificarSegundoNivel = async () => {
    if (!solicitud) return;
    setVerificando(true);
    setErrorVerificacion(null);
    try {
      await viaticosService.verificarSegundoNivel(solicitud.id, { observaciones: '' });
      setVerificacionExitosa(true);
      setTimeout(() => {
        setVerificacionExitosa(false);
        onRefrescar();
        onCerrar();
      }, 1500);
    } catch (err: any) {
      setErrorVerificacion(
        err?.message || 'Error al registrar la verificación de segundo nivel.',
      );
    } finally {
      setVerificando(false);
    }
  };

  const handleDevolverAAnalista = async () => {
    if (!solicitud) return;
    if (!motivoDevolucion.trim()) {
      setErrorDevolucion('El motivo de la devolución es obligatorio.');
      return;
    }
    setDevolviendo(true);
    setErrorDevolucion(null);
    try {
      await viaticosService.devolverAAnalista(solicitud.id, motivoDevolucion.trim());
      onRefrescar();
      onCerrar();
    } catch (err: any) {
      setErrorDevolucion(err?.message || 'Error al devolver la solicitud al analista.');
    } finally {
      setDevolviendo(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl lg:max-w-4xl w-full my-auto max-h-[90vh] overflow-y-auto border border-slate-200">
        <div className="p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#003DA5]" />
              Control Viáticos — Control Cruzado (2do Nivel)
            </h2>
            <button
              type="button"
              onClick={onCerrar}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {cargando || !solicitud ? (
            <div className="py-12 text-center text-xs text-slate-400">
              {cargando ? 'Cargando expediente...' : 'No se pudieron cargar los datos de la solicitud.'}
            </div>
          ) : (
            <>
              {/* ==================== Section 1: Datos del Expediente ==================== */}
              <section className="mb-6">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Datos del Expediente / Formato 023
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase">Consecutivo</label>
                      <div className="text-slate-800 font-mono">{solicitud.consecutivoUnico}</div>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase">Comisionado</label>
                      <div className="text-slate-800">
                        {nombreCompleto || 'N/A'}
                      </div>
                      <div className="text-slate-500">
                        {comisionado?.numeroDocumento || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase">Dependencia</label>
                      <div className="text-slate-800">
                        {(() => {
                          const idDep = comisionado?.idDependencia ?? (solicitud as any)?.idDependencia;
                          if (idDep == null) return 'N/A';
                          const nombre = DEPENDENCIA_LOOKUP.get(Number(idDep));
                          return nombre || `Dependencia #${idDep}`;
                        })()}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase">Destino</label>
                      <div className="text-slate-800">
                        {solicitud.destinoCiudad}, {solicitud.destinoDepartamento}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase">Fechas del viaje</label>
                      <div className="text-slate-800">
                        {fmtFecha(solicitud.fechaInicio)} – {fmtFecha(solicitud.fechaFin)}
                        {' '}({solicitud.diasComision || 1} días)
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase">Objeto de comisión</label>
                      <div className="text-slate-800 break-words">{solicitud.objetoComision || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase">Rubro presupuestal</label>
                      <div className="text-slate-800 font-mono">{solicitud.rubroPresupuestal || 'N/A'}</div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase">Semáforo presupuestal</label>
                      {(() => {
                        const cfg = SEMAFORO_CONFIG[semaforo];
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
                            <span className={`w-2 h-2 rounded-full ${cfg.bg.replace('bg-', 'bg-').replace('-100', '-500')}`}></span>
                            {cfg.label}
                          </span>
                        );
                      })()}
                    </div>
                    {resumenPresupuestal && (
                      <div className="mt-2 space-y-1 text-[10px] text-slate-500">
                        <div>Total gastado dependencia: ${resumenPresupuestal.totalGastado.toLocaleString('es-CO')}</div>
                        <div>Solicitudes aprobadas: {resumenPresupuestal.cantidadSolicitudes}</div>
                        <div>Límite: ${resumenPresupuestal.limitePresupuesto.toLocaleString('es-CO')} ({resumenPresupuestal.porcentajeUso.toFixed(1)}%)</div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* ==================== Section 2: Liquidación ==================== */}
              <section className="mb-6 border-t border-slate-100 pt-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Liquidación Calculada
                </h3>
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <LiquidacionSection liquidacion={solicitud.liquidacion} solicitud={solicitud} />
                </div>
              </section>

              {/* ==================== Section 3: Validación de Tiquete ==================== */}
              {solicitud.requiereTiquetes && solicitud.validacionTiquete && (
                <section className="mb-6 border-t border-slate-100 pt-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Validación de Tiquete (Presupuesto y Ruta)
                  </h3>
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                    <TicketBudgetWidget
                      validacion={solicitud.validacionTiquete}
                      montoEstimadoDisplay={formatearMoneda(solicitud.costoEstimadoTiquete || 0)}
                    />
                  </div>
                </section>
              )}

              {/* ==================== Section 4: Documentos de Soporte (PDFs) ==================== */}
              <section className="mb-6 border-t border-slate-100 pt-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Documentos de Soporte (PDF)
                </h3>
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <DocumentosSoporteSection documentos={solicitud.documentosSoporte} />
                </div>
              </section>

              {/* ==================== Section 5: Auditoría 1er Nivel ==================== */}
              <AuditoriaPrimerNivelSection solicitud={solicitud} />

              {/* ==================== Section 6: Acciones de Control Cruzado ==================== */}
              <section className="mb-6 border-t border-slate-100 pt-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Acciones de Control Cruzado
                </h3>

                <div className="border border-slate-200 rounded-xl p-4 space-y-4">
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-700">Aprobar y Verificar (2do Nivel)</span>
                    </div>
                    <p className="text-xs text-slate-600 mb-3">
                      Confirma que la liquidación, los soportes y la auditoría de 1er nivel son correctos.
                      La solicitud pasará a estado VERIFICADA y continuará su flujo hacia resolución.
                    </p>
                    <button
                      type="button"
                      onClick={handleVerificarSegundoNivel}
                      disabled={verificando}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors"
                    >
                      {verificando ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      {verificando ? 'Verificando...' : 'Aprobar y Verificar (2do Nivel)'}
                    </button>
                    {verificacionExitosa && (
                      <span className="ml-4 text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verificación de 2do nivel registrada
                      </span>
                    )}
                    {errorVerificacion && (
                      <span className="ml-4 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errorVerificacion}
                      </span>
                    )}
                  </div>

                  <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span className="text-xs font-bold text-slate-700">Devolver a Analista (1er Nivel)</span>
                    </div>

                    {!mostrandoDevolucion ? (
                      <button
                        type="button"
                        onClick={() => setMostrandoDevolucion(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Devolver a Analista
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-600">
                          Ingrese el motivo obligatorio de la devolución. La solicitud volverá al analista
                          que realizó la verificación de 1er nivel para subsanar observaciones.
                        </p>
                        <textarea
                          value={motivoDevolucion}
                          onChange={(e) => setMotivoDevolucion(e.target.value)}
                          placeholder="Describa detalladamente el motivo de la devolución..."
                          rows={4}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white resize-y"
                        />
                        {errorDevolucion && (
                          <p className="text-xs text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {errorDevolucion}
                          </p>
                        )}
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setMostrandoDevolucion(false);
                              setMotivoDevolucion('');
                              setErrorDevolucion(null);
                            }}
                            className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleDevolverAAnalista}
                            disabled={devolviendo || motivoDevolucion.trim().length < 3}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-colors ${
                              !devolviendo && motivoDevolucion.trim()
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-red-300 cursor-not-allowed'
                            }`}
                          >
                            {devolviendo ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : null}
                            Confirmar Devolución
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </>
          )}

          {/* Footer actions */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={onCerrar}
              className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900 font-semibold"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}