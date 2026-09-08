import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  CheckCircle2,
  CheckSquare,
  Copy,
  Download,
  FileText,
  Info,
  ShieldCheck,
  Square,
  X,
} from 'lucide-react';
import viaticosService from '../services/api/viaticosService';
import { SolicitudComisionResponse } from '../types/viaticos';
import {
  esPdfMime,
  formatearMoneda,
  formatearNombreComisionado,
} from '../utils/viaticosUtils';

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
        <CheckSquare className="w-4 h-4 text-[#003DA5] shrink-0" />
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

  useEffect(() => {
    if (abierta) {
      setCheckLiquidacion(false);
      setCheckSeguridadSocial(false);
      setCheckItinerario(false);
      setCheckRutFacturador(false);
      setRegistrando(false);
      setRegistroError(null);
      setRegistroExitoso(false);
      setMostrandoSolDevolucion(false);
      setMotivoDevolucion('');
      setDevolviendo(false);
      setErrorDevolucion(null);
      setCopied(null);
    }
  }, [abierta]);

  if (!abierta) return null;

  const comisionado = solicitud?.comisionado;
  const nombreCompleto = comisionado ? formatearNombreComisionado(comisionado) : '';
  const montoViaticos = Number(solicitud?.montoViaticos || 0);
  const montoGastosViaje = Number(solicitud?.montoGastosViaje || 0);
  const valorNeto = montoViaticos + montoGastosViaje;
  const semaforo = calcularSemaforo(valorNeto);

  const documentosPdf = (solicitud?.documentosSoporte || []).filter((d) =>
    esPdfMime(d.tipoMime),
  );

  const todosCheckMandatory =
    checkLiquidacion && checkSeguridadSocial && checkItinerario;

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
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#003DA5]" />
              Auditoría de Soportes y Exportación SIIF
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
                      <div className="text-slate-800">
                        {nombreCompleto || 'N/A'}
                      </div>
                      <div className="text-slate-500">
                        {comisionado?.numeroDocumento || 'N/A'}
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
                    label="Liquidación Correcta"
                    sublabel="La liquidación calculada coincide con la documentación soporte."
                  />
                  <CheckboxItem
                    checked={checkSeguridadSocial}
                    onChange={setCheckSeguridadSocial}
                    label="Seguridad Social Vigente"
                    sublabel="Contribuciones de seguridad social al día al momento de la comisión."
                  />
                  <CheckboxItem
                    checked={checkItinerario}
                    onChange={setCheckItinerario}
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
                    label="Comisionado es Facturador Electrónico"
                    sublabel="Se consulta el RUT del comisionado en los PDFs de soporte."
                  />
                </div>

                <div className="mt-4 flex items-center justify-between">
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

                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleDescargarCsv}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#003DA5] text-white rounded-lg text-xs font-semibold hover:bg-[#002a7d] transition-colors"
                  >
                    <Download className="w-4 h-4" />
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
                  Al descargar, la solicitud se exporta a SIIF Nación y la comisión se crea en el sistema.
                </p>
              </section>

              {/* ==================== Acción: Devolver a Enlace ==================== */}
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
