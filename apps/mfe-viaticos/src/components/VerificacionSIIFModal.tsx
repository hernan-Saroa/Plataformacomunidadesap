import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Info,
  LoaderCircle,
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
  sanitizeParaSIIF,
  sanitizeDocumento,
  sanitizeNombre,
  sanitizeTextoPlano,
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
  onCerrar?: () => void;
  onClosing?: () => void;
  onRefrescar: () => void;
}

const TIPO_DOC_INFO: Record<string, { label: string; badge: string }> = {
  CDP: { label: 'Disponibilidad Presupuestal (CDP)', badge: 'bg-blue-100 text-blue-800' },
  RUT: { label: 'Registro Único Tributario (RUT)', badge: 'bg-amber-100 text-amber-900' },
  SEGURIDAD_SOCIAL: { label: 'Seguridad Social Vigente', badge: 'bg-emerald-100 text-emerald-800' },
  FACTURA: { label: 'Factura Electrónica', badge: 'bg-purple-100 text-purple-900' },
  FACTURA_ELECTRONICA: { label: 'Factura Electrónica', badge: 'bg-purple-100 text-purple-900' },
  CERT_BANCARIA: { label: 'Certificación Bancaria', badge: 'bg-teal-100 text-teal-800' },
  CONTRATO_SECOP: { label: 'Contrato SECOP', badge: 'bg-indigo-100 text-indigo-800' },
  PASAPORTE: { label: 'Pasaporte', badge: 'bg-cyan-100 text-cyan-800' },
  CARTA_INVITACION: { label: 'Invitación / Agenda', badge: 'bg-violet-100 text-violet-800' },
  RESOLUCION_ACTO: { label: 'Resolución / Acto', badge: 'bg-slate-100 text-slate-800' },
};

type SemaforoPresupuestal = 'VERDE' | 'AMARILLO' | 'ROJO';

const SEMAFORO_CONFIG: Record<SemaforoPresupuestal, { bg: string; text: string; label: string }> = {
  VERDE: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Presupuesto OK' },
  AMARILLO: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Revisar presupuesto' },
  ROJO: { bg: 'bg-red-100', text: 'text-red-700', label: 'Presupuesto crítico' },
};



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
  onClosing,
  onRefrescar,
}: Props) {
  const handleCerrar = () => {
    if (onCerrar) onCerrar();
    else if (onClosing) onClosing();
  };

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

  // Visor integrado y descargas oficiales
  const [documentoPrevisualizar, setDocumentoPrevisualizar] = useState<{
    url: string;
    nombre: string;
    tipo: string;
    mime?: string;
  } | null>(null);
  const [descargandoFormato023, setDescargandoFormato023] = useState(false);

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
      setDocumentoPrevisualizar(null);
      setDescargandoFormato023(false);
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
  const todosDocumentos = solicitud?.documentosSoporte || [];
  const tieneFacturaAdjunta = todosDocumentos.some((d) => {
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

  const estaEnControlViaticos = solicitud?.estadoSolicitud === 'SOLICITADA_SIIF';
  const estaVerificada = solicitud?.estadoSolicitud === 'VERIFICADA';
  const estadoUpper = (solicitud?.estadoSolicitud || '').toUpperCase();
  const estaAutorizada = [
    'AUTORIZADA',
    'RESOLUCION_EMITIDA',
    'TIQUETES_COMPRADOS',
    'EN_COMISION',
    'PENDIENTE_LEGALIZACION',
    'LEGALIZADO',
  ].includes(estadoUpper);
  const esSoloLectura = estaEnControlViaticos || estaVerificada || estaAutorizada;

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

  const handleDescargarFormato023 = async () => {
    if (!solicitud) return;
    setDescargandoFormato023(true);
    try {
      const blob = await viaticosService.exportarFormato023(solicitud.id, solicitud.consecutivoUnico);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Formato_023_${solicitud.consecutivoUnico}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Error descargando Formato 023:', err);
    } finally {
      setDescargandoFormato023(false);
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
      onRefrescar();
      handleCerrar();
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
      if (!esSoloLectura) {
        onRefrescar();
        handleCerrar();
      }
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
      handleCerrar();
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
              onClick={handleCerrar}
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

              {/* ==================== Banner Autorizada ==================== */}
              {estaAutorizada && (
                <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-2xl shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 rounded-xl text-purple-700 shrink-0 mt-0.5">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-700 text-white">
                          Comisión Autorizada
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-purple-950 mt-1">
                        Aprobación Corporativa Culminada
                      </h4>
                      <p className="text-xs text-purple-900 mt-1 leading-relaxed">
                        Esta comisión ya superó los controles de verificación y cuenta con la autorización de la Subdirección Corporativa. Este registro es de solo lectura y no admite modificaciones, devoluciones ni nuevas validaciones en el perfil de analista.
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
              </section>

              {/* ==================== Section 2: Documentos de Soporte del Expediente ==================== */}
              <section className="mb-6 border-t border-slate-100 pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#003DA5]" />
                      Documentos de Soporte del Expediente (Para Análisis y Verificación)
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Coteje y visualice los soportes adjuntos (Liquidación, Seguridad Social, RUT e Itinerario) antes de registrar la validación.
                    </p>
                  </div>

                  {/* Acciones de exportación de expedientes */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleDescargarFormato023}
                      disabled={descargandoFormato023}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-[#003DA5] border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-[11px] font-semibold"
                      title="Descargar Formato 023 oficial de la solicitud"
                    >
                      {descargandoFormato023 ? (
                        <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>Formato 023 (PDF)</span>
                    </button>
                  </div>
                </div>

                {/* Listado de Documentos */}
                {todosDocumentos.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-slate-600">No hay documentos de soporte adjuntos a este expediente.</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Si la comisión requiere soportes para verificación, puede devolver la solicitud a la dependencia para su subsanación.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {todosDocumentos.map((doc, idx) => {
                      const url = viaticosService.obtenerUrlArchivo(doc.urlRepositorio);
                      const tipoUpper = (doc.tipoDocumento || '').toUpperCase();
                      const tipoConfig = TIPO_DOC_INFO[tipoUpper] || {
                        label: doc.tipoDocumento || 'Documento adjunto',
                        badge: 'bg-slate-100 text-slate-700',
                      };

                      return (
                        <div
                          key={doc.id || idx}
                          className="flex flex-col justify-between p-3 bg-slate-50/90 border border-slate-200 rounded-xl hover:bg-white hover:border-blue-200 hover:shadow-xs transition-all"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${tipoConfig.badge}`}
                              >
                                {tipoConfig.label}
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                              <span
                                className="text-xs font-medium text-slate-800 break-all line-clamp-2"
                                title={doc.nombreArchivoOriginal}
                              >
                                {doc.nombreArchivoOriginal || 'Documento sin nombre'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-200/60 justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                setDocumentoPrevisualizar({
                                  url,
                                  nombre: doc.nombreArchivoOriginal || 'Documento de Soporte',
                                  tipo: tipoConfig.label,
                                  mime: doc.tipoMime,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-700 hover:text-[#003DA5] hover:border-blue-300 rounded-lg text-[11px] font-semibold transition-colors shadow-2xs"
                              title="Previsualizar soporte en pantalla para análisis"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-600" />
                              <span>Ver Soporte</span>
                            </button>

                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 rounded-lg text-[11px] font-medium transition-colors shadow-2xs"
                              title="Abrir en pestaña nueva o descargar"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                              <span>Abrir</span>
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

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
              </section>

              {/* ==================== Section 3: Panel de Generación SIIF ==================== */}
              <section className="mb-6 border-t border-slate-100 pt-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Panel de Generación de Datos SIIF
                </h3>

                <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-[11px] text-blue-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#003DA5] shrink-0" />
                    <span>
                      <strong>Datos limpios y homologados para SIIF Nación:</strong> Texto sin tildes, eñes ni saltos de línea. El plano CSV incluye 18 columnas con toda la información requerida para el registro presupuestal.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <CopiableField
                      label="Cédula / Documento"
                      value={sanitizeDocumento(comisionado?.numeroDocumento || '')}
                      onCopy={handleCopy}
                    />
                    <CopiableField
                      label="Nombre del Comisionado"
                      value={sanitizeNombre(nombreCompleto)}
                      onCopy={handleCopy}
                    />
                    <CopiableField
                      label="Consecutivo de Comisión"
                      value={solicitud.consecutivoUnico || ''}
                      onCopy={handleCopy}
                    />
                    <CopiableField
                      label="Tipo y Facturador"
                      value={`${comisionado?.tipoComisionado || 'FUNCIONARIO'} · Facturador: ${(comisionado as any)?.esFacturadorElectronico || solicitud.consultaRutFacturador ? 'SI' : 'NO'}`}
                      onCopy={handleCopy}
                    />
                    <CopiableField
                      label="Destino (Ciudad, Depto)"
                      value={`${sanitizeTextoPlano(solicitud.destinoCiudad || '')}, ${sanitizeTextoPlano(solicitud.destinoDepartamento || '')}`.toUpperCase()}
                      onCopy={handleCopy}
                    />
                    <CopiableField
                      label="Fechas y Días"
                      value={`${fmtFecha(solicitud.fechaInicio)} al ${fmtFecha(solicitud.fechaFin)} (${solicitud.diasComision || 1} días)`}
                      onCopy={handleCopy}
                    />
                    <CopiableField
                      label="Rubro Presupuestal"
                      value={sanitizeParaSIIF(solicitud.rubroPresupuestal || '')}
                      onCopy={handleCopy}
                    />
                    <CopiableField
                      label="Valor Neto a Liquidar"
                      value={formatearMoneda(valorNeto)}
                      onCopy={handleCopy}
                    />
                  </div>

                  <CopiableField
                    label="Objeto Sanitizado y Limpio"
                    value={sanitizeParaSIIF(solicitud.objetoComision || '')}
                    onCopy={handleCopy}
                  />

                  {copied && (
                    <div className="fixed bottom-4 right-4 bg-slate-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Copiado al portapapeles
                    </div>
                  )}
                </div>

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
                  {estaAutorizada
                    ? 'Comisión AUTORIZADA corporativamente. El archivo plano CSV se encuentra disponible para fines informativos y de consulta.'
                    : esSoloLectura
                    ? 'La solicitud ya fue exportada a SIIF Nación y transferida a Control Viáticos. Puede descargar una copia del archivo plano si lo requiere.'
                    : 'Al descargar, la solicitud se exporta a SIIF Nación y la comisión se crea en el sistema.'}
                </p>
              </section>

              {/* ==================== Section 4: Devolver a Enlace ==================== */}
              {!esSoloLectura && (
                <section className="mb-6 border-t border-slate-100 pt-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Devolver a Enlace (Si hay inconsistencias en los soportes)
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

              {/* ==================== Section 5: Checklist de Verificación y Registro ==================== */}
              <section className="mb-6 border-t border-slate-200 pt-4 bg-slate-50/50 -mx-6 px-6 pb-2 rounded-b-2xl">
                <div className="mb-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Checklist de Verificación del Analista
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Habiendo analizado los soportes y datos anteriores, certifique el cumplimiento para registrar la verificación y avanzar el expediente.
                  </p>
                </div>

                <div className="border border-slate-200 bg-white rounded-xl p-4 space-y-1 shadow-2xs">
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

                <div className="border border-slate-200 bg-white rounded-xl p-4 mt-3 shadow-2xs">
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
                        {estaAutorizada
                          ? 'Comisión AUTORIZADA — Ha superado todas las etapas de verificación y cuenta con aprobación corporativa. Modo solo lectura.'
                          : estaVerificada
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
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                          todosCheckMandatory && !registrando
                            ? 'bg-[#003DA5] text-white hover:bg-[#002a7d] cursor-pointer'
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
            </>
          )}

          {/* Footer actions */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={handleCerrar}
              className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* ==================== Visor de Documento Integrado ==================== */}
      {documentoPrevisualizar && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-3 sm:p-6 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-blue-100 text-[#003DA5] rounded-lg shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-slate-900 truncate">
                    {documentoPrevisualizar.nombre}
                  </h3>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">
                    {documentoPrevisualizar.tipo}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={documentoPrevisualizar.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-[#003DA5] border border-blue-200 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors"
                  title="Abrir en una pestaña independiente"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Abrir en pestaña nueva</span>
                </a>
                <button
                  type="button"
                  onClick={() => setDocumentoPrevisualizar(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  title="Cerrar visor"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-3 bg-slate-100 min-h-[480px] overflow-hidden flex flex-col">
              {esPdfMime(documentoPrevisualizar.mime || '') ||
              documentoPrevisualizar.url.toLowerCase().includes('.pdf') ||
              documentoPrevisualizar.nombre.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={documentoPrevisualizar.url}
                  title={documentoPrevisualizar.nombre}
                  className="w-full flex-1 rounded-xl border border-slate-300 bg-white"
                />
              ) : documentoPrevisualizar.url.match(/\.(png|jpe?g|webp|gif)$/i) ? (
                <div className="w-full flex-1 overflow-auto flex items-center justify-center bg-slate-800/10 rounded-xl p-2">
                  <img
                    src={documentoPrevisualizar.url}
                    alt={documentoPrevisualizar.nombre}
                    className="max-h-[70vh] object-contain rounded-lg shadow-sm"
                  />
                </div>
              ) : (
                <div className="w-full flex-1 flex flex-col items-center justify-center p-6 text-center bg-white rounded-xl border border-slate-200">
                  <FileText className="w-12 h-12 text-slate-400 mb-3" />
                  <p className="text-xs font-semibold text-slate-700 mb-1">
                    Visualización previa para {documentoPrevisualizar.nombre}
                  </p>
                  <p className="text-[11px] text-slate-500 mb-4 max-w-md">
                    Abra el archivo en una nueva pestaña para visualizarlo con el visor de su navegador o aplicación correspondiente.
                  </p>
                  <a
                    href={documentoPrevisualizar.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#003DA5] text-white rounded-lg text-xs font-semibold hover:bg-[#002a7d] transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir soporte en pestaña nueva
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
