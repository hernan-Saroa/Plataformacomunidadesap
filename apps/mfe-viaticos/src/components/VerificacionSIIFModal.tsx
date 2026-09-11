import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  Copy,
  Download,
  FileText,
  Info,
  Lock,
  RotateCcw,
  ShieldCheck,
  Square,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import viaticosService from '../services/api/viaticosService';
import { SolicitudComisionResponse } from '../types/viaticos';
import {
  esPdfMime,
  formatearMoneda,
  formatearNombreComisionado,
} from '../utils/viaticosUtils';

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

interface Props {
  abierta: boolean;
  solicitud: SolicitudComisionResponse | null;
  cargando: boolean;
  onCerrar: () => void;
  onRefrescar: () => void;
}

type SemaforoPresupuestal = 'VERDE' | 'AMARILLO' | 'ROJO';

const SEMAFORO_CONFIG: Record<SemaforoPresupuestal, { bg: string; text: string; label: string }> = {
  VERDE: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Presupuesto OK' },
  AMARILLO: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Revisar presupuesto' },
  ROJO: { bg: 'bg-red-100', text: 'text-red-700', label: 'Presupuesto crítico' },
};

function sanitizeParaSIIF(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/gi, 'n')
    .replace(/[^a-zA-Z0-9;,\s]/g, '')
    .slice(0, 250);
}

function calcularSemaforo(montoTotal: number): SemaforoPresupuestal {
  if (montoTotal > 5_000_000) return 'ROJO';
  if (montoTotal > 2_000_000) return 'AMARILLO';
  return 'VERDE';
}

function CheckboxItem({
  checked,
  onChange,
  label,
  sublabel,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sublabel?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-3 py-2 ${
        disabled ? 'cursor-default opacity-85' : 'cursor-pointer'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => {
          if (!disabled) onChange(e.target.checked);
        }}
        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#003DA5] focus:ring-[#003DA5] shrink-0 disabled:opacity-60"
      />
      <div className="flex-1">
        <span className="text-xs font-medium text-slate-800">{label}</span>
        {sublabel && <p className="text-[10px] text-slate-500 mt-0.5">{sublabel}</p>}
      </div>
      {checked ? (
        <CheckSquare className={`w-4 h-4 shrink-0 ${disabled ? 'text-emerald-600' : 'text-[#003DA5]'}`} />
      ) : (
        <Square className="w-4 h-4 text-slate-300 shrink-0" />
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

export default function VerificacionSIIFModal({
  abierta,
  solicitud,
  cargando,
  onCerrar,
  onRefrescar,
}: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const [checkLiquidacion, setCheckLiquidacion] = useState(false);
  const [checkSeguridadSocial, setCheckSeguridadSocial] = useState(false);
  const [checkItinerario, setCheckItinerario] = useState(false);
  const [checkRutFacturador, setCheckRutFacturador] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [registroError, setRegistroError] = useState<string | null>(null);
  const [registroExitoso, setRegistroExitoso] = useState(false);

  // Devolver a Enlace
  const [mostrandoSolDevolucion, setMostrandoSolDevolucion] = useState(false);
  const [motivoDevolucion, setMotivoDevolucion] = useState('');
  const [devolviendo, setDevolviendo] = useState(false);
  const [errorDevolucion, setErrorDevolucion] = useState<string | null>(null);

  // Carga directa de Factura Electrónica (RF-REV-003)
  const [subiendoFactura, setSubiendoFactura] = useState(false);
  const [errorSubidaFactura, setErrorSubidaFactura] = useState<string | null>(null);

  useEffect(() => {
    if (abierta) {
      const yaAuditado =
        solicitud?.estadoSolicitud === 'SOLICITADA_SIIF' ||
        solicitud?.estadoSolicitud === 'VERIFICADA';
      setCheckLiquidacion(yaAuditado);
      setCheckSeguridadSocial(yaAuditado);
      setCheckItinerario(yaAuditado);
      setCheckRutFacturador(Boolean(solicitud?.consultaRutFacturador || yaAuditado));
      setRegistrando(false);
      setRegistroError(null);
      setRegistroExitoso(false);
      setMostrandoSolDevolucion(false);
      setMotivoDevolucion('');
      setDevolviendo(false);
      setErrorDevolucion(null);
      setSubiendoFactura(false);
      setErrorSubidaFactura(null);
      setCopied(null);
      void cargarCatalogoDependencias();
    }
  }, [abierta, solicitud]);

  if (!abierta) return null;

  const comisionado = solicitud?.comisionado;
  const nombreCompleto = comisionado ? formatearNombreComisionado(comisionado) : '';
  const montoViaticos = Number(solicitud?.montoViaticos || 0);
  const montoGastosViaje = Number(solicitud?.montoGastosViaje || 0);
  const valorNeto = montoViaticos + montoGastosViaje;

  const esContratista = (comisionado?.tipoComisionado || '').toUpperCase() === 'CONTRATISTA';
  const esFacturadorElectronico = Boolean(
    checkRutFacturador ||
    solicitud?.consultaRutFacturador ||
    comisionado?.esFacturadorElectronico,
  );
  const requiereFactura = esContratista && esFacturadorElectronico;
  const tieneFacturaAdjunta = (solicitud?.documentosSoporte || []).some((d) => {
    const tipo = (d.tipoDocumento || '').toUpperCase();
    const nom = (d.nombreArchivoOriginal || '').toLowerCase();
    return tipo === 'FACTURA' || tipo === 'FACTURA_ELECTRONICA' || nom.includes('factura');
  });
  const bloqueoFacturaActivo = requiereFactura && !tieneFacturaAdjunta;

  const resumenPresupuestal = (solicitud as any)?.resumenPresupuestal as
    | {
        totalGastado: number;
        cantidadSolicitudes: number;
        limitePresupuesto: number;
        porcentajeUso: number;
        semaforo: 'VERDE' | 'AMARILLO' | 'ROJO';
      }
    | undefined;

  const semaforo = resumenPresupuestal?.semaforo || calcularSemaforo(valorNeto);

  const documentosPdf = (solicitud?.documentosSoporte || []).filter((d) =>
    esPdfMime(d.tipoMime),
  );

  const estaEnControlViaticos = solicitud?.estadoSolicitud === 'SOLICITADA_SIIF';
  const estaVerificada = solicitud?.estadoSolicitud === 'VERIFICADA';
  const esSoloLectura = estaEnControlViaticos || estaVerificada;

  const todosCheckMandatory =
    checkLiquidacion && checkSeguridadSocial && checkItinerario;

  const handleSolicitarFacturaDevolucion = () => {
    setMotivoDevolucion(
      'Se devuelve la comisión en cumplimiento del requisito contractual y tributario: El comisionado es contratista facturador electrónico y se requiere adjuntar la Factura Electrónica correspondiente antes de proceder con la creación y exportación en SIIF Nación.',
    );
    setMostrandoSolDevolucion(true);
    setErrorDevolucion(null);
  };

  const handleSubirFacturaDirecta = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !solicitud) return;
    setSubiendoFactura(true);
    setErrorSubidaFactura(null);
    try {
      await viaticosService.subirDocumento(solicitud.id, 'FACTURA', file);
      onRefrescar();
    } catch (err: any) {
      setErrorSubidaFactura(err?.message || 'Error al subir la factura electrónica.');
    } finally {
      setSubiendoFactura(false);
      e.target.value = '';
    }
  };

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

  const handleRegistrarVerificacion = async () => {
    if (!solicitud || !todosCheckMandatory) return;
    setRegistrando(true);
    setRegistroError(null);
    try {
      await viaticosService.verificarAuditoria(solicitud.id, {
        seguridadSocialVigente: checkSeguridadSocial,
        consultaRutFacturador: checkRutFacturador,
      });
      setRegistroExitoso(true);
      setTimeout(() => {
        setRegistroExitoso(false);
        onRefrescar();
      }, 1500);
    } catch (err: any) {
      setRegistroError(
        err?.message || 'Error al registrar la verificación de auditoría.',
      );
    } finally {
      setRegistrando(false);
    }
  };

  const handleDescargarCsv = async () => {
    if (!solicitud) return;
    try {
      const blob = await viaticosService.exportarSIIF(solicitud.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `siif_${solicitud.consecutivoUnico}.csv`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      onRefrescar();
      onCerrar();
    } catch (err: any) {
      console.error('Error descargando CSV SIIF:', err);
      setRegistroError(err?.message || 'Error al descargar el archivo CSV.');
    }
  };

  const handleDevolverEnlace = async () => {
    if (!solicitud) return;
    if (!motivoDevolucion.trim()) {
      setErrorDevolucion('El motivo de devolución es obligatorio.');
      return;
    }
    setDevolviendo(true);
    setErrorDevolucion(null);
    try {
      await viaticosService.devolverAnalista(solicitud.id, motivoDevolucion.trim());
      onRefrescar();
      onCerrar();
    } catch (err: any) {
      setErrorDevolucion(err?.message || 'Error al devolver la solicitud al enlace.');
    } finally {
      setDevolviendo(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[70vh] overflow-y-auto mt-16">
        <div className="p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#003DA5]" />
              {esSoloLectura ? 'Expediente y Consulta SIIF' : 'Auditoría de Soportes y Exportación SIIF'}
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
              {/* ==================== Banner Alerta de Devolución ==================== */}
              {(solicitud.estadoSolicitud === 'DEVUELTA' ||
                (solicitud.estadoSolicitud === 'EN_VERIFICACION' &&
                  (solicitud.motivoDevolucion || (solicitud as any).observacionesSegundaRevision))) && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-rose-100 rounded-xl text-rose-700 shrink-0 mt-0.5">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white">
                          {solicitud.estadoSolicitud === 'DEVUELTA'
                            ? 'Devuelta a Enlace'
                            : 'Devuelta por Control Viáticos'}
                        </span>
                        {solicitud.revisorControlNombre && (
                          <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                            Responsable: {solicitud.revisorControlNombre}
                          </span>
                        )}
                        {(solicitud as any).fechaSegundaRevision && (
                          <span className="text-[10px] text-rose-600 font-medium">
                            {fmtFecha((solicitud as any).fechaSegundaRevision)}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-rose-950 mt-1">
                        Hallazgo / Motivo registrado para subsanación:
                      </h4>
                      <p className="text-xs text-rose-900 mt-1 bg-white/80 p-3 rounded-xl border border-rose-200/80 font-mono whitespace-pre-wrap leading-relaxed">
                        {(solicitud as any).observacionesSegundaRevision || solicitud.motivoDevolucion}
                      </p>
                      <p className="text-[10px] text-rose-700 mt-1.5 font-medium">
                        Verifique o ajuste los soportes y liquidación señalados para subsanar este hallazgo antes de exportar nuevamente a SIIF.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== Banner Solicitada SIIF / Control Viáticos ==================== */}
              {estaEnControlViaticos && (
                <div className="mb-6 p-4 bg-fuchsia-50 border border-fuchsia-200 rounded-2xl shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-fuchsia-100 rounded-xl text-fuchsia-700 shrink-0 mt-0.5">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-fuchsia-600 text-white">
                          En Segunda Revisión · Control Viáticos
                        </span>
                        {solicitud?.fechaExportacionSiif && (
                          <span className="text-[10px] text-fuchsia-700 font-medium">
                            Exportada a SIIF: {fmtFecha(solicitud.fechaExportacionSiif)}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-fuchsia-950 mt-1">
                        Solicitud radicada en SIIF y transferida a Control Viáticos
                      </h4>
                      <p className="text-xs text-fuchsia-900 mt-1 leading-relaxed">
                        Esta comisión ya fue exportada a SIIF Nación y se encuentra en etapa de control cruzado con el revisor de Control Viáticos. Las opciones de modificación y nuevo registro se encuentran bloqueadas en este estado.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== Banner Verificada ==================== */}
              {estaVerificada && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700 shrink-0 mt-0.5">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white">
                          Comisión Verificada
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-emerald-950 mt-1">
                        Segunda revisión aprobada exitosamente
                      </h4>
                      <p className="text-xs text-emerald-900 mt-1 leading-relaxed">
                        Esta comisión ya culminó su doble control y cuenta con la aprobación final de Control Viáticos.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== Section 1: Revisión de Fondo ==================== */}
              <section className="mb-6">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Revisión de Fondo
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                   <div className="space-y-2">
                     <div>
                       <label className="text-[10px] font-semibold text-slate-400 uppercase">Consecutivo</label>
                       <div className="text-slate-800 font-mono">{solicitud.consecutivoUnico}</div>
                     </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 uppercase">Comisionado</label>
                        <div className="text-slate-800 font-medium flex items-center gap-1.5 flex-wrap">
                          <span>{nombreCompleto || 'N/A'}</span>
                          {comisionado?.tipoComisionado === 'CONTRATISTA' && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              Contratista
                            </span>
                          )}
                          {(comisionado as any)?.esFacturadorElectronico && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <Zap className="w-3 h-3 text-amber-600" />
                              Facturador Electrónico
                            </span>
                          )}
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

                {/* Documentos de soporte (PDFs) */}
                <div className="mt-4">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase mb-2 block">
                    Documentos de soporte (PDF)
                  </label>
                  {documentosPdf.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">
                      No hay documentos PDF cargados.
                    </p>
                  ) : (
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
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              {/* ==================== Section 2: Checklist de Verificación ==================== */}
              <section className="mb-6 border-t border-slate-100 pt-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Checklist de Verificación del Analista
                </h3>

                <div className="border border-slate-200 rounded-xl p-4 space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase mb-2">
                    Verificaciones obligatorias
                  </p>
                  <CheckboxItem
                    checked={checkLiquidacion}
                    onChange={setCheckLiquidacion}
                    disabled={esSoloLectura}
                    label="Liquidación Correcta"
                    sublabel="La liquidación calculada coincide con la documentación soporte."
                  />
                  <CheckboxItem
                    checked={checkSeguridadSocial}
                    onChange={setCheckSeguridadSocial}
                    disabled={esSoloLectura}
                    label="Seguridad Social Vigente"
                    sublabel="Contribuciones de seguridad social al día al momento de la comisión."
                  />
                  <CheckboxItem
                    checked={checkItinerario}
                    onChange={setCheckItinerario}
                    disabled={esSoloLectura}
                    label="Itinerario Coherente"
                    sublabel="El itinerario justifica el monto y los tiempos declarados."
                  />
                </div>

                <div className="border border-slate-200 rounded-xl p-4 mt-3">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase mb-2">
                    Verificación de RUT
                  </p>
                  <CheckboxItem
                    checked={checkRutFacturador}
                    onChange={setCheckRutFacturador}
                    disabled={esSoloLectura}
                    label="Comisionado es Facturador Electrónico"
                    sublabel={
                      comisionado?.tipoComisionado === 'CONTRATISTA'
                        ? 'Se consulta el RUT del comisionado en los PDFs de soporte. Si es contratista facturador, el sistema exigirá adjuntar la factura electrónica antes de permitir la exportación a SIIF.'
                        : 'Se consulta el RUT del comisionado en los PDFs de soporte.'
                    }
                  />
                </div>

                <div className="mt-4 flex items-center justify-between">
                  {esSoloLectura ? (
                    <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold w-full">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        {estaVerificada
                          ? 'Auditoría y control cruzado completados — Comisión en estado VERIFICADA.'
                          : 'Verificación de analista completada — Solicitud transferida a Control Viáticos (SOLICITADA_SIIF). Registro cerrado.'}
                      </span>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleRegistrarVerificacion}
                        disabled={!todosCheckMandatory || registrando}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          todosCheckMandatory && !registrando
                            ? 'bg-[#003DA5] text-white hover:bg-[#002a7d]'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {registrando ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        Registrar Verificación
                      </button>

                      {registroExitoso && (
                        <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verificación registrada
                        </span>
                      )}
                      {registroError && (
                        <span className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {registroError}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </section>

              {/* ==================== Section 3: Panel de Generación SIIF ==================== */}
              <section className="mb-6 border-t border-slate-100 pt-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Panel de Generación de Datos SIIF
                </h3>

                <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <CopiableField
                    label="Cédula"
                    value={comisionado?.numeroDocumento || ''}
                    onCopy={handleCopy}
                  />
                  <CopiableField
                    label="Nombre"
                    value={nombreCompleto}
                    onCopy={handleCopy}
                  />
                  <CopiableField
                    label="Objeto Sanitizado"
                    value={sanitizeParaSIIF(solicitud.objetoComision || '')}
                    onCopy={handleCopy}
                  />
                  <CopiableField
                    label="Valor Neto a Liquidar"
                    value={formatearMoneda(valorNeto)}
                    onCopy={handleCopy}
                  />
                  <CopiableField
                    label="Rubro Presupuestal"
                    value={sanitizeParaSIIF(solicitud.rubroPresupuestal || '')}
                    onCopy={handleCopy}
                  />

                  {copied && (
                    <div className="fixed bottom-4 right-4 bg-slate-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Copiado al portapapeles
                    </div>
                  )}
                </div>

                {/* Bloqueo y Requisito de Factura Electrónica */}
                {bloqueoFacturaActivo && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg text-amber-800 shrink-0">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-amber-900">
                          Exportación SIIF Bloqueada: Falta Factura Electrónica
                        </h4>
                        <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                          El comisionado es un <strong>contratista facturador electrónico</strong>. El sistema exige la factura electrónica correspondiente antes de crear y exportar la comisión en SIIF.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200">
                      <label
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                          subiendoFactura
                            ? 'bg-amber-200 text-amber-700 cursor-wait'
                            : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5 text-amber-700" />
                        <span>{subiendoFactura ? 'Cargando Factura...' : 'Cargar Factura Electrónica (PDF)'}</span>
                        <input
                          type="file"
                          accept=".pdf"
                          disabled={subiendoFactura || esSoloLectura}
                          className="hidden"
                          onChange={handleSubirFacturaDirecta}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={handleSolicitarFacturaDevolucion}
                        disabled={devolviendo}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-700 text-white rounded-lg text-xs font-semibold hover:bg-amber-800 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Devolver a Enlace para solicitar factura
                      </button>
                    </div>

                    {errorSubidaFactura && (
                      <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errorSubidaFactura}
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleDescargarCsv}
                    disabled={bloqueoFacturaActivo}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      bloqueoFacturaActivo
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                        : 'bg-[#003DA5] text-white hover:bg-[#002a7d]'
                    }`}
                    title={
                      bloqueoFacturaActivo
                        ? 'Bloqueado: Debe cargar la factura electrónica del contratista para continuar'
                        : undefined
                    }
                  >
                    {bloqueoFacturaActivo ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Descargar Archivo Plano CSV para SIIF
                  </button>
                  {registroError && (
                    <span className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {registroError}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[10px] text-slate-400">
                  {esSoloLectura
                    ? 'La solicitud ya fue exportada a SIIF Nación y transferida a Control Viáticos. Puede descargar una copia del archivo plano si lo requiere.'
                    : 'Al descargar, la solicitud se exporta a SIIF Nación y la comisión se crea en el sistema.'}
                </p>
              </section>

              {/* ==================== Acción: Devolver a Enlace ==================== */}
              {!esSoloLectura && (
                <section className="border-t border-slate-100 pt-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Devolver a Enlace
                  </h3>

                {!mostrandoSolDevolucion ? (
                  <button
                    type="button"
                    onClick={() => setMostrandoSolDevolucion(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Devolver a Enlace
                  </button>
                ) : (
                  <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                    <p className="text-xs text-slate-600">
                      Ingrese el motivo de la devolución. La solicitud volverá al enlace
                      que la radicó para subsanar observaciones.
                    </p>
                    <textarea
                      value={motivoDevolucion}
                      onChange={(e) => setMotivoDevolucion(e.target.value)}
                      placeholder="Describa el motivo de la devolución..."
                      rows={4}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-y"
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
                          setMostrandoSolDevolucion(false);
                          setMotivoDevolucion('');
                          setErrorDevolucion(null);
                        }}
                        className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleDevolverEnlace}
                        disabled={devolviendo || !motivoDevolucion.trim()}
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
              </section>
              )}
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
