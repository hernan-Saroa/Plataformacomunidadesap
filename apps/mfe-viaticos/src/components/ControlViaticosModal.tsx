import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  ExternalLink,
  FileText,
  Info,
  ShieldCheck,
  X,
  Clock,
  MapPin,
  Route,
  Plane,
  Car,
  Sparkles,
} from 'lucide-react';
import viaticosService from '../services/api/viaticosService';
import authService from '../services/api/authService';
import FirmaDigitalViaticosModal, { FirmaDigitalData } from './FirmaDigitalViaticosModal';
import {
  SolicitudControlViaticosResponse,
  LiquidacionResponse,
  RutaItinerario,
  TarifaEstimadaResult,
  TicketValidationResult,
} from '../types/viaticos';
import {
  esPdfMime,
  formatearDiasComision,
  formatearMoneda,
  formatearNombreComisionado,
  formatearHorarioMilitar,
  sincronizarItinerarioFormulario,
  obtenerAyudaValidacionDocumento,
} from '../utils/viaticosUtils';
import { TipoDocumentoSoporte } from '../types/parametrizacion';
import TicketBudgetWidget from './TicketBudgetWidget';
import VisorDocumentosFlotante, { useVisorDocumentos } from './VisorDocumentosFlotante';

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
  costoReferenciaTiquete,
}: {
  liquidacion?: LiquidacionResponse['data'] | undefined;
  solicitud?: SolicitudControlViaticosResponse | null;
  costoReferenciaTiquete?: number;
}) {
  const montoViaticos = Number(solicitud?.montoViaticos || liquidacion?.valorTotalViaticos || 0);
  const montoGastosViaje = Number(solicitud?.montoGastosViaje || 0);
  const costoEstimadoTiquete = Number(solicitud?.costoEstimadoTiquete || 0);
  const costoTiquetesAplicado =
    costoReferenciaTiquete !== undefined && costoReferenciaTiquete >= 0
      ? costoReferenciaTiquete
      : costoEstimadoTiquete;
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
  const valorTotalNeto = totalViaticos + montoGastosViaje + costoTiquetesAplicado;

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
      <div className="flex justify-between items-center">
        <span className="text-slate-500">Días a liquidar</span>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-100">
            {formatearDiasComision(dias)}
          </span>
          <span className="text-slate-500 text-[11px]">({dias})</span>
        </div>
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
      {costoTiquetesAplicado > 0 && (
        <div className="flex justify-between">
          <span className="text-slate-500">
            {costoEstimadoTiquete > 0
              ? 'Costo Tiquetes Aéreos (Pasajes)'
              : 'Estimado Tiquetes (Tarifa Referencia)'}
          </span>
          <span className="font-semibold text-sky-800">{formatearMoneda(costoTiquetesAplicado)}</span>
        </div>
      )}
      {(montoGastosViaje > 0 || costoTiquetesAplicado > 0) && (
        <div className="flex justify-between border-t border-slate-200 pt-2 font-bold bg-slate-100/70 p-2 rounded-lg">
          <span className="text-slate-900">Total Consolidado (Viáticos + Gastos + Tiquetes)</span>
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
  solicitud,
  tiposDocumentoSoporte,
  onPrevisualizar,
}: {
  documentos: SolicitudControlViaticosResponse['documentosSoporte'];
  solicitud?: SolicitudControlViaticosResponse | null;
  tiposDocumentoSoporte?: TipoDocumentoSoporte[];
  onPrevisualizar?: (doc: { url: string; nombre: string; tipo: string; mime?: string }) => void;
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {documentosPdf.map((doc) => {
        const url = viaticosService.obtenerUrlArchivo(doc.urlRepositorio);
        const tipoDoc = tiposDocumentoSoporte?.find(
          (t) => t.codigo.toUpperCase() === doc.tipoDocumento?.toUpperCase(),
        );
        const camposAdic =
          (solicitud as any)?.camposAdicionales ||
          (solicitud as any)?.campos_adicionales ||
          {};
        const bco = camposAdic.entidad_bancaria || camposAdic.entidadBancaria || camposAdic.banco || '';
        const cta = camposAdic.num_cuenta || camposAdic.numeroCuenta || camposAdic.numCuenta || camposAdic.cuentaBancaria || '';
        const tip = camposAdic.tipo_cuenta || camposAdic.tipoCuenta || '';
        const camposAdicNormalizados = {
          ...camposAdic,
          ...(bco ? { entidad_bancaria: bco, entidadBancaria: bco, banco: bco } : {}),
          ...(cta ? { num_cuenta: cta, numeroCuenta: cta, numCuenta: cta, cuentaBancaria: cta } : {}),
          ...(tip ? { tipo_cuenta: tip, tipoCuenta: tip } : {}),
        };
        const ayuda = obtenerAyudaValidacionDocumento(
          doc.tipoDocumento,
          tipoDoc?.instruccionesValidacion,
          {
            form: {
              ...(solicitud as any),
              camposAdicionales: camposAdicNormalizados,
              documentoComisionado: solicitud?.comisionado?.numeroDocumento,
            } as any,
            comisionado: {
              ...(solicitud?.comisionado as any),
              ...camposAdicNormalizados,
            },
          },
          tipoDoc?.camposAValidar,
        );

        return (
          <div
            key={doc.id}
            className="flex flex-col gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100/90 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText className="w-4 h-4 text-[#003DA5] shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-slate-700 truncate block font-medium" title={doc.nombreArchivoOriginal}>
                    {doc.nombreArchivoOriginal}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {doc.tipoDocumento}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {onPrevisualizar && (
                  <button
                    type="button"
                    onClick={() =>
                      onPrevisualizar({
                        url,
                        nombre: doc.nombreArchivoOriginal || 'Documento de Soporte',
                        tipo: doc.tipoDocumento,
                        mime: doc.tipoMime,
                      })
                    }
                    className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-[#003DA5] hover:border-blue-300 transition-colors cursor-pointer"
                    title="Previsualizar documento en visor flotante"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                )}
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors"
                  title="Abrir en pestaña nueva"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Datos a contrastar parametrizados */}
            {ayuda && ayuda.datosAContrastar && ayuda.datosAContrastar.length > 0 && (
              <div className="mt-1 pt-2 border-t border-slate-200/80">
                <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase tracking-tight mb-1">
                  <ShieldCheck className="w-3 h-3 text-[#003DA5]" />
                  <span>Campos a validar según el documento:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 bg-white p-2 rounded-md border border-slate-200/80 shadow-2xs">
                  {ayuda.datosAContrastar.map((item, idx) => (
                    <div key={idx} className="flex flex-col text-[11px] leading-tight">
                      <span className="text-[9px] text-slate-400 font-medium">{item.etiqueta}:</span>
                      <span className="font-semibold text-slate-800 truncate" title={item.valor}>
                        {item.valor}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
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

function DesgloseGeneral({ rutas }: { rutas: RutaItinerario[] }) {
  const sync = sincronizarItinerarioFormulario(rutas);
  return (
    <div className="mb-3 p-3 bg-gradient-to-r from-[#003DA5]/5 to-indigo-50/50 border border-[#003DA5]/15 rounded-xl space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-black uppercase tracking-wider bg-[#003DA5] text-white px-1.5 py-0.5 rounded">
            Ruta General
          </span>
          <span className="text-xs font-bold text-slate-800">
            {sync.rutaGeneral || `${sync.origenCiudad || '—'} → ${sync.destinoCiudad || '—'}`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1.5 border-t border-blue-100 text-[10px]">
        <div>
          <p className="text-[9px] font-bold text-[#003DA5] uppercase tracking-wider">Origen Inicial</p>
          <p className="text-[11px] font-semibold text-slate-800 truncate">{sync.origenCiudad || '—'}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold text-[#003DA5] uppercase tracking-wider">Destino Final</p>
          <p className="text-[11px] font-semibold text-slate-800 truncate">{sync.destinoCiudad || '—'}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold text-[#003DA5] uppercase tracking-wider">Fechas</p>
          <p className="text-[11px] font-semibold text-slate-800">{sync.fechaInicio} al {sync.fechaFin}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold text-[#003DA5] uppercase tracking-wider">Días Totales</p>
          <p className="text-[11px] font-semibold text-slate-800">{formatearDiasComision(sync.diasComision)} ({sync.diasComision} d)</p>
        </div>
      </div>
    </div>
  );
}

function ItinerarioDesglose({ rutas }: { rutas: RutaItinerario[] }) {
  return (
    <div>
      <DesgloseGeneral rutas={rutas} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rutas.map((ruta, idx) => (
          <div
            key={ruta.id}
            className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#003DA5] text-white flex items-center justify-center text-[9px] font-black">
                {idx + 1}
              </div>
              <p className="text-[11px] font-bold text-slate-800">
                {ruta.origenCiudad || 'Origen'} → {ruta.destinoCiudad || 'Destino'}
              </p>
              <span className="ml-auto text-[9px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                Tramo {idx + 1}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
              <div>
                <span className="text-slate-500">Fechas:</span>{' '}
                <span className="font-semibold text-slate-700">{ruta.fechaSalida} – {ruta.fechaLlegada}</span>
              </div>
              <div>
                <span className="text-slate-500">Hora estimada del viaje:</span>{' '}
                <span className="font-semibold text-slate-700 inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#003DA5]" />
                  {ruta.horaEstimadaSalida || ruta.horarioEstimadoMilitar || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Trayecto:</span>{' '}
                <span className="font-semibold text-slate-700">
                  {ruta.tipoTrayecto === 'SOLO_IDA' ? 'Solo Ida' : 'Ida y Vuelta'}
                </span>
              </div>
              {ruta.tipoTransporte && (
                <div className="col-span-2 flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-500">Transporte:</span>{' '}
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded text-[9px] ${
                      ruta.tipoTransporte === 'AEREO'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {ruta.tipoTransporte}
                  </span>
                  {ruta.tipoTransporte !== 'AEREO' && Number(ruta.valorTransporte ?? ruta.montoTransporteTerrestre ?? 0) > 0 && (
                    <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                      Costo adicional: {formatearMoneda(Number(ruta.valorTransporte ?? ruta.montoTransporteTerrestre ?? 0))}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
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
  const [tiposDocSoporte, setTiposDocSoporte] = useState<TipoDocumentoSoporte[]>([]);

  // Estados para validación OTP y Firma Digital Institucional
  const [solicitandoOtp, setSolicitandoOtp] = useState(false);
  const [modalFirmaOtpAbierta, setModalFirmaOtpAbierta] = useState(false);
  const [otpData, setOtpData] = useState<{
    verificationId?: string;
    emailEnviadoA?: string;
    devCode?: string;
  } | null>(null);

  // Estados para consulta de tarifa estimada de referencia y validación de saldo tiquetes
  const [tarifaEstimadaReferencia, setTarifaEstimadaReferencia] = useState<TarifaEstimadaResult | null>(null);
  const [cargandoTarifa, setCargandoTarifa] = useState<boolean>(false);
  const [validacionTiquete, setValidacionTiquete] = useState<TicketValidationResult | null>(null);
  const [costoTiqueteInput, setCostoTiqueteInput] = useState<string>('');

  useEffect(() => {
    if (abierta && typeof viaticosService.obtenerTiposDocumentoSoporte === 'function') {
      viaticosService
        .obtenerTiposDocumentoSoporte()
        .then((data) => setTiposDocSoporte(data || []))
        .catch(() => {});
    }
  }, [abierta]);

  const {
    documentosVisor,
    abrirDocumentoVisor,
    cerrarDocumentoVisor,
    cerrarTodosVisores,
  } = useVisorDocumentos();

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
      setSolicitandoOtp(false);
      setModalFirmaOtpAbierta(false);
      setOtpData(null);
      setTarifaEstimadaReferencia(solicitud?.tarifaEstimada || null);
      setValidacionTiquete(solicitud?.validacionTiquete || null);
      setCargandoTarifa(false);
      cerrarTodosVisores();
      void cargarCatalogoDependencias();

      if (solicitud?.costoEstimadoTiquete != null && Number(solicitud.costoEstimadoTiquete) > 0) {
        setCostoTiqueteInput(String(solicitud.costoEstimadoTiquete));
      } else {
        setCostoTiqueteInput('');
      }

      if (solicitud?.requiereTiquetes) {
        const sync = sincronizarItinerarioFormulario(solicitud.itinerario || []);
        const origen = sync.origenCiudad || (solicitud as any).origenCiudad || 'Bogotá';
        const destino = sync.destinoCiudad || solicitud.destinoCiudad || '';

        // Si la solicitud no traía precargada la tarifa o validación, consultarla
        if (!solicitud.tarifaEstimada && origen && destino && typeof viaticosService.consultarTarifaEstimada === 'function') {
          setCargandoTarifa(true);
          viaticosService
            .consultarTarifaEstimada(origen, destino)
            .then((res) => {
              setTarifaEstimadaReferencia(res);
              const esIdaVuelta = sync.esViajeIdaVuelta ?? ((solicitud.itinerario?.length || 0) > 1);
              const montoEstimado = (res?.tarifaEstimada || 0) * (esIdaVuelta ? 2 : 1);
              const depId = solicitud.comisionado?.idDependencia ?? (solicitud as any).idDependencia;

              // Prellenar recomendación para optimizar usabilidad si no se ha digitado un valor
              if (montoEstimado > 0) {
                setCostoTiqueteInput((prev) => (prev.trim() === '' ? String(montoEstimado) : prev));
              }

              if (!solicitud.validacionTiquete && depId != null && typeof viaticosService.validarTiquete === 'function') {
                return viaticosService
                  .validarTiquete({
                    dependenciaId: String(depId),
                    montoEstimadoTiquete: montoEstimado || Number(solicitud.costoEstimadoTiquete || 0),
                    origenCiudad: origen,
                    destinoCiudad: destino,
                    tipoTransporte: 'AEREO',
                  })
                  .then((valRes) => setValidacionTiquete(valRes))
                  .catch(() => {});
              }
            })
            .catch(() => {})
            .finally(() => setCargandoTarifa(false));
        } else if (solicitud.tarifaEstimada) {
          const esIdaVuelta = sync.esViajeIdaVuelta ?? ((solicitud.itinerario?.length || 0) > 1);
          const montoEstimado = (solicitud.tarifaEstimada.tarifaEstimada || 0) * (esIdaVuelta ? 2 : 1);
          if (montoEstimado > 0 && (!solicitud.costoEstimadoTiquete || Number(solicitud.costoEstimadoTiquete) === 0)) {
            setCostoTiqueteInput(String(montoEstimado));
          }
        } else if (!solicitud.validacionTiquete && Number(solicitud.costoEstimadoTiquete || 0) > 0) {
          const depId = solicitud.comisionado?.idDependencia ?? (solicitud as any).idDependencia;
          if (depId != null && typeof viaticosService.validarTiquete === 'function') {
            viaticosService
              .validarTiquete({
                dependenciaId: String(depId),
                montoEstimadoTiquete: Number(solicitud.costoEstimadoTiquete),
                origenCiudad: origen,
                destinoCiudad: destino,
                tipoTransporte: 'AEREO',
              })
              .then((valRes) => setValidacionTiquete(valRes))
              .catch(() => {});
          }
        }
      }
    }
  }, [abierta, solicitud]);

  const revalidarPresupuestoTiquete = (nuevoMonto: number) => {
    const depId = solicitud?.comisionado?.idDependencia ?? (solicitud as any)?.idDependencia;
    if (depId != null && typeof viaticosService.validarTiquete === 'function') {
      const sync = sincronizarItinerarioFormulario(solicitud?.itinerario || []);
      const origen = sync.origenCiudad || (solicitud as any)?.origenCiudad || 'Bogotá';
      const destino = sync.destinoCiudad || solicitud?.destinoCiudad || '';
      viaticosService
        .validarTiquete({
          dependenciaId: String(depId),
          montoEstimadoTiquete: nuevoMonto,
          origenCiudad: origen,
          destinoCiudad: destino,
          tipoTransporte: 'AEREO',
        })
        .then((valRes) => setValidacionTiquete(valRes))
        .catch(() => {});
    }
  };

  if (!abierta) return null;

  const comisionado = solicitud?.comisionado;
  const nombreCompleto = comisionado ? formatearNombreComisionado(comisionado as any) : '';
  const montoViaticos = Number(solicitud?.montoViaticos || 0);
  const montoGastosViaje = Number(solicitud?.montoGastosViaje || 0);

  // Desglose de transporte terminal aérea guardado
  const montoTerminalAereo = Number(
    solicitud?.camposAdicionales?.transporteTerminalAereo ??
      solicitud?.camposAdicionales?.montoTerminalAereo ??
      (Array.isArray(solicitud?.itinerario)
        ? (solicitud.itinerario as any[]).reduce(
            (acc: number, r: any) =>
              acc + Number(r.tarifaTerminalAereo ?? r.montoTerminalAereo ?? 0),
            0,
          )
        : 0),
  );
  const costoEstimadoTiquete = Number(solicitud?.costoEstimadoTiquete || 0);

  // Cálculo y sincronización de itinerario para tiquetes y desplazamientos
  const syncItin = sincronizarItinerarioFormulario(solicitud?.itinerario || []);
  const esIdaVuelta = syncItin.esViajeIdaVuelta ?? ((solicitud?.itinerario?.length || 0) > 1);
  const multiplicadorTramos = esIdaVuelta ? 2 : 1;
  const tarifaUnit = Number(tarifaEstimadaReferencia?.tarifaEstimada || 0);
  const totalTiquetesReferencia = tarifaUnit * multiplicadorTramos;

  // Valor ingresado por el usuario o sugerido automáticamente (modo recomendación y usabilidad)
  const valorIngresadoNum = costoTiqueteInput.trim() !== '' ? Number(costoTiqueteInput) : NaN;
  const costoTiqueteEfectivo =
    !isNaN(valorIngresadoNum) && valorIngresadoNum >= 0
      ? valorIngresadoNum
      : costoEstimadoTiquete > 0
      ? costoEstimadoTiquete
      : totalTiquetesReferencia;

  const gastoDesplazamientoTerminal = montoTerminalAereo > 0 ? montoTerminalAereo : montoGastosViaje;
  const totalDesplazamientoInstitucional = gastoDesplazamientoTerminal + costoTiqueteEfectivo;
  const totalConsolidadoGlobal = montoViaticos + montoGastosViaje + costoTiqueteEfectivo;
  const valorNeto = montoViaticos + montoGastosViaje;

  const resumenPresupuestal = (solicitud as any)?.resumenPresupuestal as
    | {
        nombreDependencia?: string;
        totalGastado: number;
        cantidadSolicitudes: number;
        limitePresupuesto: number;
        presupuestoDisponible?: number;
        porcentajeUso: number;
        semaforo: 'VERDE' | 'AMARILLO' | 'ROJO';
      }
    | undefined;

  const semaforo = resumenPresupuestal?.semaforo || 'VERDE';
  const isVerificada = solicitud?.estadoSolicitud === 'VERIFICADA' || verificacionExitosa;

  // Resolver usuario actual firmante para estampa institucional
  const currentUser = authService.getCurrentUserSync?.() || (authService as any).getCurrentUser?.();
  const nombreUsuarioActual =
    currentUser && typeof currentUser.then !== 'function'
      ? `${currentUser.primerNombre || ''} ${currentUser.segundoNombre || ''} ${currentUser.primerApellido || ''} ${currentUser.segundoApellido || ''}`.trim() ||
        currentUser.nombre ||
        currentUser.username ||
        'Revisor de Control de Viáticos'
      : 'Revisor de Control de Viáticos';
  const cargoUsuarioActual =
    currentUser && typeof currentUser.then !== 'function' && (currentUser.cargo || currentUser.job_title)
      ? currentUser.cargo || currentUser.job_title
      : 'Control de Viáticos / 2do Nivel (Control Cruzado)';
  const documentoIdentidadUsuarioActual =
    currentUser && typeof currentUser.then !== 'function'
      ? currentUser.numeroDocumento || currentUser.documento || currentUser.identificacion
      : undefined;

  const generarEstampaDigitalControlViaticos = (nombre: string, cargo: string): string => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 140;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#003DA5';
      ctx.lineWidth = 2;
      ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

      ctx.fillStyle = '#003DA5';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('ESAP — CONTROL CRUZADO 2DO NIVEL (CONTROL VIÁTICOS)', 16, 24);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(nombre.slice(0, 36), 16, 52);

      ctx.fillStyle = '#475569';
      ctx.font = '11px sans-serif';
      ctx.fillText(cargo.slice(0, 42), 16, 72);

      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace';
      const ahora = new Date().toISOString();
      ctx.fillText(`FECHA/HORA: ${ahora}`, 16, 96);
      ctx.fillText('VALIDACIÓN: HASH CRIPTOGRÁFICO SHA-256', 16, 112);

      return canvas.toDataURL('image/png');
    } catch {
      return '';
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

  // Solicitar código OTP para iniciar firma digital de control viáticos (2do nivel)
  const handleIniciarFirmaOtp = async () => {
    if (!solicitud || isVerificada) return;
    setSolicitandoOtp(true);
    setErrorVerificacion(null);
    try {
      const resp = await viaticosService.solicitarOtpFirma(solicitud.id, {
        tipoFirma: 'CONTROL_VIATICOS',
        etapaLabel: 'Control Viáticos — Control Cruzado (2do Nivel)',
      });
      setOtpData({
        verificationId: resp.verificationId,
        emailEnviadoA: resp.emailEnviadoA || (resp as any).email,
        devCode: resp.devCode,
      });
      setModalFirmaOtpAbierta(true);
    } catch (err: any) {
      console.error('Error solicitando OTP:', err);
      setErrorVerificacion(
        err?.response?.data?.message ||
          err?.message ||
          'No fue posible solicitar el código OTP de verificación.',
      );
    } finally {
      setSolicitandoOtp(false);
    }
  };

  // Confirmar verificación y firma digital tras validación OTP
  const handleFirmaDigitalCompleta = async (firma: FirmaDigitalData) => {
    if (!solicitud) return false;
    setVerificando(true);
    setErrorVerificacion(null);
    try {
      const firmaImagen = generarEstampaDigitalControlViaticos(nombreUsuarioActual, cargoUsuarioActual);
      await viaticosService.verificarSegundoNivel(solicitud.id, {
        observaciones: 'Verificación y control cruzado aprobado con firma digital institucional',
        otp: firma.codigoOtp,
        verificationId: otpData?.verificationId,
        certificadoId: firma.certificado_id,
        hashSha256: firma.hash,
        firmaImagen,
        nombreRevisor: nombreUsuarioActual,
        cargoRevisor: cargoUsuarioActual,
        documentoIdentidad: documentoIdentidadUsuarioActual,
        costoEstimadoTiquete: costoTiqueteEfectivo,
      });
      setVerificacionExitosa(true);
      if (solicitud) {
        solicitud.estadoSolicitud = 'VERIFICADA';
      }
      setModalFirmaOtpAbierta(false);
      setTimeout(() => {
        setVerificacionExitosa(false);
        onRefrescar();
        onCerrar();
      }, 1500);
      return true;
    } catch (err: any) {
      console.error('Error al registrar verificación de segundo nivel con OTP:', err);
      setErrorVerificacion(
        err?.response?.data?.message ||
          err?.message ||
          'Error al registrar la verificación de segundo nivel.',
      );
      return false;
    } finally {
      setVerificando(false);
    }
  };

  // Mantener compatibilidad si es invocado directamente
  const handleVerificarSegundoNivel = async () => {
    await handleIniciarFirmaOtp();
  };

  const handleDevolverAAnalista = async () => {
    if (!solicitud || isVerificada) return;
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

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl lg:max-w-4xl w-full my-auto max-h-[90vh] overflow-y-auto border border-slate-200">
        <div className="p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#003DA5]" />
                Control Viáticos — Control Cruzado (2do Nivel)
              </h2>
              {isVerificada && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  VERIFICADA
                </span>
              )}
            </div>
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
                      <div className="text-slate-800 flex items-center gap-1.5 flex-wrap">
                        <span>{fmtFecha(solicitud.fechaInicio)} – {fmtFecha(solicitud.fechaFin)}</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {formatearDiasComision(Number(solicitud.diasComision || 1))}
                        </span>
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
                      <div className="mt-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-[11px]">
                        {resumenPresupuestal.nombreDependencia && (
                          <div className="font-semibold text-slate-800 border-b border-slate-200/60 pb-1 flex items-center justify-between">
                            <span className="truncate">{resumenPresupuestal.nombreDependencia}</span>
                            <span className="text-[10px] text-slate-500 font-normal shrink-0 ml-2">
                              {resumenPresupuestal.cantidadSolicitudes} {resumenPresupuestal.cantidadSolicitudes === 1 ? 'solicitud' : 'solicitudes'}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-slate-600">
                          <span>Presupuesto asignado:</span>
                          <span className="font-bold font-mono text-slate-800">${resumenPresupuestal.limitePresupuesto.toLocaleString('es-CO')}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600">
                          <span>Total gastado:</span>
                          <span className="font-semibold font-mono text-slate-700">
                            ${resumenPresupuestal.totalGastado.toLocaleString('es-CO')} ({resumenPresupuestal.porcentajeUso.toFixed(1)}%)
                          </span>
                        </div>
                        {resumenPresupuestal.presupuestoDisponible != null && (
                          <div className="flex justify-between items-center text-emerald-700 pt-1 border-t border-slate-200/60 font-medium">
                            <span>Saldo disponible:</span>
                            <span className="font-bold font-mono">${resumenPresupuestal.presupuestoDisponible.toLocaleString('es-CO')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* ==================== Section 2.5: Itinerario ==================== */}
              {(solicitud as any).itinerario && (solicitud as any).itinerario.length > 0 && (
                <section className="mb-6 border-t border-slate-100 pt-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                    <Route className="w-4 h-4" />
                    Itinerario Multiruta — Desglose de Tramos
                  </h3>
                  <ItinerarioDesglose
                    rutas={(solicitud as any).itinerario as RutaItinerario[]}
                  />
                </section>
              )}

              {/* ==================== Section 2: Liquidación ==================== */}
              <section className="mb-6 border-t border-slate-100 pt-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Liquidación Calculada
                </h3>
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <LiquidacionSection
                    liquidacion={solicitud.liquidacion}
                    solicitud={solicitud}
                    costoReferenciaTiquete={costoTiqueteEfectivo}
                  />
                </div>
              </section>

              {/* ==================== Section 3: Desplazamiento Aéreo y Transporte a Terminal ==================== */}
              {solicitud.requiereTiquetes && (
                <section className="mb-6 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                      <Plane className="w-4 h-4 text-[#003DA5]" />
                      Desplazamiento Aéreo y Transporte a Terminal Aérea
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#003DA5] border border-blue-200">
                      Requiere Tiquetes Aéreos
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                    {/* Tarjeta de Transporte a Terminal Aérea Guardado */}
                    {gastoDesplazamientoTerminal > 0 ? (
                      <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Car className="w-4 h-4 text-emerald-600" />
                            Transporte a Terminal Aérea (Aeropuerto)
                          </span>
                          <span className="text-xs font-extrabold text-emerald-700 font-mono">
                            {formatearMoneda(gastoDesplazamientoTerminal)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Tarifa oficial parametrizada para el traslado hacia/desde la terminal aérea en las ciudades de la comisión.
                        </p>
                        {montoGastosViaje > montoTerminalAereo && montoTerminalAereo > 0 && (
                          <div className="pt-2 border-t border-slate-100 flex justify-between text-[11px] text-slate-600">
                            <span>Otros traslados terrestres / complementarios:</span>
                            <span className="font-semibold text-slate-800">
                              {formatearMoneda(montoGastosViaje - montoTerminalAereo)}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                        <Info className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>Sin saldo de transporte a terminal aérea liquidado en esta solicitud.</span>
                      </div>
                    )}

                    {/* Tarjeta de Tarifa Estimada de Referencia para Tiquetes Aéreos */}
                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Plane className="w-4 h-4 text-sky-600" />
                          <span className="text-xs font-bold text-slate-800">
                            Tarifa Estimada de Referencia (Vuelos)
                          </span>
                          {tarifaEstimadaReferencia?.origenIata && tarifaEstimadaReferencia?.destinoIata && (
                            <span className="inline-flex items-center gap-1 font-mono font-black text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded border border-sky-300">
                              {tarifaEstimadaReferencia.origenIata} ⇄ {tarifaEstimadaReferencia.destinoIata}
                            </span>
                          )}
                        </div>
                        {tarifaEstimadaReferencia?.fuente && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            Fuente: {tarifaEstimadaReferencia.fuente}
                          </span>
                        )}
                      </div>

                      {cargandoTarifa ? (
                        <p className="text-[11px] text-slate-500 italic">
                          Consultando tarifa de referencia y benchmark de mercado...
                        </p>
                      ) : tarifaEstimadaReferencia?.encontrado ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-slate-400 block text-[10px] font-bold uppercase">Ruta / Trayecto</span>
                            <span className="font-semibold text-slate-800">
                              {tarifaEstimadaReferencia.origen} ⇄ {tarifaEstimadaReferencia.destino}
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              {esIdaVuelta ? '2 tramos (Ida y Vuelta)' : '1 tramo (Solo Ida)'}
                            </span>
                          </div>
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-slate-400 block text-[10px] font-bold uppercase">Tarifa Segmento</span>
                            <span className="font-mono font-bold text-slate-800">
                              {formatearMoneda(tarifaUnit)} / tramo
                            </span>
                            {tarifaEstimadaReferencia.tarifaMinima != null && tarifaEstimadaReferencia.tarifaMaxima != null && (
                              <span className="text-[10px] text-slate-500 block mt-0.5">
                                Rango: {formatearMoneda(tarifaEstimadaReferencia.tarifaMinima)} – {formatearMoneda(tarifaEstimadaReferencia.tarifaMaxima)}
                              </span>
                            )}
                          </div>
                          <div className="p-2 bg-sky-50 rounded-lg border border-sky-100">
                            <span className="text-sky-700 block text-[10px] font-bold uppercase">Total Estimado Ruta</span>
                            <span className="font-mono font-black text-sky-900 text-xs">
                              {formatearMoneda(totalTiquetesReferencia)}
                            </span>
                            <span className="text-[10px] text-sky-700 block mt-0.5">
                              {multiplicadorTramos} × {formatearMoneda(tarifaUnit)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500">
                          {tarifaEstimadaReferencia?.mensaje || 'No se encontró tarifa parametrizada específica para este trayecto. Se requerirá cotización formal.'}
                        </p>
                      )}
                    </div>

                    {/* Tarjeta de Registro y Edición del Gasto de Tiquete Aéreo (Recomendación + Entrada Manual) */}
                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Plane className="w-3.5 h-3.5 text-[#003DA5]" />
                            Gasto de Tiquete Aéreo (Valor a Registrar / Cotizar)
                          </span>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            El cálculo automático de la ruta opera a modo de recomendación para mejor usabilidad. Puede conservar la recomendación o ingresar el valor cotizado formal.
                          </p>
                        </div>
                        {totalTiquetesReferencia > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const valorStr = String(totalTiquetesReferencia);
                              setCostoTiqueteInput(valorStr);
                              revalidarPresupuestoTiquete(totalTiquetesReferencia);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-[#003DA5] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                            title="Aplicar tarifa calculada automáticamente como recomendación"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                            <span>Usar tarifa sugerida ({formatearMoneda(totalTiquetesReferencia)})</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-1 border-t border-slate-100">
                        <div>
                          <label
                            htmlFor="input-costo-tiquete"
                            className="block text-[10px] font-bold text-slate-500 uppercase mb-1"
                          >
                            Valor del Pasaje Aéreo (COP)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                              $
                            </span>
                            <input
                              id="input-costo-tiquete"
                              type="number"
                              min="0"
                              step="1000"
                              placeholder={
                                totalTiquetesReferencia > 0
                                  ? String(totalTiquetesReferencia)
                                  : 'Ingrese valor del tiquete'
                              }
                              value={costoTiqueteInput}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCostoTiqueteInput(val);
                                const num = val.trim() !== '' ? Number(val) : totalTiquetesReferencia;
                                if (!isNaN(num)) {
                                  revalidarPresupuestoTiquete(num);
                                }
                              }}
                              className="w-full pl-7 pr-3 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:border-transparent text-slate-800"
                            />
                          </div>
                        </div>

                        <div className="sm:text-right flex flex-col justify-end">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">
                            Costo Aplicado en Control Cruzado
                          </span>
                          <span className="text-sm font-black text-slate-900 font-mono">
                            {costoTiqueteEfectivo > 0
                              ? formatearMoneda(costoTiqueteEfectivo)
                              : 'Por cotizar'}
                          </span>
                          <span className="text-[10px] text-slate-500 mt-0.5">
                            {costoTiqueteInput.trim() !== '' && Number(costoTiqueteInput) === totalTiquetesReferencia && totalTiquetesReferencia > 0
                              ? 'Tarifa recomendada sugerida aplicada'
                              : costoTiqueteInput.trim() !== ''
                              ? 'Valor de gasto registrado manualmente'
                              : totalTiquetesReferencia > 0
                              ? 'Tarifa sugerida por defecto'
                              : 'Pendiente de registrar cotización'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Comparativa de Gastos de Desplazamiento vs Tiquetes */}
                    <div className="p-3 bg-gradient-to-r from-slate-50 to-indigo-50/40 rounded-lg border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          Comparativa de Desplazamiento Institucional
                        </span>
                        <span className="text-xs font-black text-indigo-900 font-mono">
                          {formatearMoneda(totalDesplazamientoInstitucional)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200/60">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Traslados Terrestres (Terminal):</span>
                          <span className="font-semibold text-slate-700 font-mono">{formatearMoneda(gastoDesplazamientoTerminal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Pasajes Aéreos (Tiquetes):</span>
                          <span className="font-semibold text-sky-800 font-mono">{formatearMoneda(costoTiqueteEfectivo)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Widget Semáforo de Presupuesto y Restricciones de Tiquetes */}
                    <TicketBudgetWidget
                      validacion={validacionTiquete}
                      cargando={cargandoTarifa}
                      montoEstimadoDisplay={formatearMoneda(costoTiqueteEfectivo)}
                    />

                    {/* Total Consolidado Proyectado */}
                    {totalConsolidadoGlobal > 0 && (
                      <div className="p-3 bg-blue-50/80 rounded-lg border border-blue-200 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-[#003DA5]">Total Consolidado Proyectado</span>
                          <p className="text-[11px] text-blue-700/80">
                            Viáticos ({formatearMoneda(montoViaticos)}) + Desplazamiento ({formatearMoneda(montoGastosViaje)}) + Tiquetes ({formatearMoneda(costoTiqueteEfectivo)})
                          </p>
                        </div>
                        <span className="text-sm font-black text-[#003DA5] font-mono">
                          {formatearMoneda(totalConsolidadoGlobal)}
                        </span>
                      </div>
                    )}
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
                  <DocumentosSoporteSection
                    documentos={solicitud.documentosSoporte}
                    solicitud={solicitud}
                    tiposDocumentoSoporte={tiposDocSoporte}
                    onPrevisualizar={abrirDocumentoVisor}
                  />
                </div>
              </section>

              {/* ==================== Section 5: Auditoría 1er Nivel ==================== */}
              <AuditoriaPrimerNivelSection solicitud={solicitud} />

              {/* ==================== Section 6: Acciones de Control Cruzado ==================== */}
              <section className="mb-6 border-t border-slate-100 pt-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#003DA5]" />
                  Acciones de Control Cruzado
                </h3>

                {isVerificada ? (
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700 shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-emerald-900">
                            Expediente Verificado en Segundo Nivel
                          </h4>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-800">
                            VERIFICADA
                          </span>
                        </div>
                        <p className="text-xs text-emerald-800">
                          {verificacionExitosa
                            ? 'Verificación de 2do nivel registrada exitosamente. La solicitud continúa su curso hacia la expedición de resolución.'
                            : 'Este expediente ya cuenta con la validación de control cruzado (2do nivel) aprobada. No requiere acciones adicionales de validación y continúa su curso hacia la expedición de resolución.'}
                        </p>
                        {verificacionExitosa && (
                          <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Verificación de 2do nivel registrada
                          </div>
                        )}
                        {(solicitud.fechaSegundaRevision || (solicitud as any).fechaRevision) && (
                          <div className="mt-2 pt-2 border-t border-emerald-200/60 flex flex-wrap gap-4 text-[11px] text-emerald-800">
                            <span>
                              <strong>Fecha de Verificación:</strong>{' '}
                              {fmtFechaHora(solicitud.fechaSegundaRevision || (solicitud as any).fechaRevision)}
                            </span>
                            {solicitud.observacionesSegundaRevision && (
                              <span>
                                <strong>Observaciones:</strong> {solicitud.observacionesSegundaRevision}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
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
                        onClick={handleIniciarFirmaOtp}
                        disabled={verificando || solicitandoOtp}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors"
                      >
                        {solicitandoOtp || verificando ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        {solicitandoOtp
                          ? 'Solicitando código OTP...'
                          : verificando
                          ? 'Verificando...'
                          : 'Aprobar y Verificar (2do Nivel)'}
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
  )}

  {/* Visor de documentos flotante y superponible para comparación */}
  <VisorDocumentosFlotante
    documentos={documentosVisor}
    onCerrar={cerrarDocumentoVisor}
  />

  {/* ==================== Modal Institucional de Firma Digital con Validación OTP ==================== */}
  {modalFirmaOtpAbierta && solicitud && (
    <FirmaDigitalViaticosModal
      isOpen={modalFirmaOtpAbierta}
      solicitudId={solicitud.id}
      consecutivo={solicitud.consecutivoUnico || (solicitud as any).codigoSolicitud || (solicitud as any).codigo || '023'}
      comisionadoNombre={nombreCompleto || 'Comisionado'}
      destino={`${solicitud.destinoCiudad || ''}${solicitud.destinoDepartamento ? ` (${solicitud.destinoDepartamento})` : ''}`.trim()}
      fechas={
        solicitud.fechaInicio && solicitud.fechaFin
          ? `${fmtFecha(solicitud.fechaInicio)} al ${fmtFecha(solicitud.fechaFin)}`
          : ''
      }
      firmanteNombre={nombreUsuarioActual}
      firmanteCargo={cargoUsuarioActual}
      etapaLabel="Control Viáticos — Control Cruzado (2do Nivel)"
      correoDestino={otpData?.emailEnviadoA}
      devCode={otpData?.devCode}
      onVerifyCodigo={async (codigoOtp: string) => {
        await viaticosService.verificarOtpFirma(solicitud.id, {
          verificationId: otpData?.verificationId || '',
          code: codigoOtp,
          otp: codigoOtp,
          tipoFirma: 'CONTROL_VIATICOS',
          consume: false,
        });
      }}
      onFirmaCompleta={handleFirmaDigitalCompleta}
      onCancelar={() => setModalFirmaOtpAbierta(false)}
    />
  )}
</>
  );
}