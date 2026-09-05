import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  FileText,
  Lock,
  Plane,
  Send,
  ShieldCheck,
  Wallet,
  XCircle,
} from 'lucide-react';
import {
  ResumenConsolidacion,
  ResultadoConsolidacion,
  SolicitudComisionResponse,
} from '../types/viaticos';
import viaticosService from '../services/api/viaticosService';
import {
  esPdfMime,
  formatearMoneda,
  formatearNombreComisionado,
  inferirTipoMime,
} from '../utils/viaticosUtils';

/**
 * Propiedades del paso de consolidación (RF-LIQ-004 — "Paso 4: Resumen de
 * Expediente y Envío").
 */
interface Props {
  /** Expediente completo (con comisionado y documentos) que se va a consolidar. */
  solicitud: SolicitudComisionResponse;
  /** Invocado cuando el expediente fue consolidado con éxito (HTTP 201). */
  onConsolidada: (resultado: ResultadoConsolidacion) => void;
  /** Invocado para cerrar/regresar sin enviar. */
  onCerrar: () => void;
}

/**
 * Vista final de consolidación y cierre del expediente de comisión.
 *
 * Implementa el "Paso 4: Resumen de Expediente y Envío" de la HU RF-LIQ-004:
 *  - Tarjeta de resumen del expediente digital (datos demográficos, itinerario
 *    y objeto sanitizado).
 *  - Tarjeta financiera con el desglose del Autoliquidador.
 *  - Tarjeta de transporte con la decisión de tiquetes y el estado (semáforo)
 *    de la validación de saldo presupuestal.
 *  - Checklist visual de documentos PDF ([✓] cargado / [✗] faltante) con carga
 *    inline de los soportes que falten.
 *  - Validación en cliente: si hay tareas pendientes el botón "Radicar y
 *    Enviar a Revisión" queda deshabilitado y se muestra el listado.
 *  - Confirmación de envío: POST /requests/:id/submit y, en éxito, pantalla de
 *    éxito con confeti.
 *
 * La información de integridad proviene del backend
 * (`GET /requests/:id/consolidacion/preview`) para no duplicar reglas de
 * negocio en el cliente (el servidor es la fuente de verdad).
 */
export default function ConsolidacionExpediente({
  solicitud,
  onConsolidada,
  onCerrar,
}: Props) {
  const [resumen, setResumen] = useState<ResumenConsolidacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorResumen, setErrorResumen] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  // Documento que se está subiendo inline (checklist).
  const [subiendoDoc, setSubiendoDoc] = useState<string | null>(null);
  const [errorDoc, setErrorDoc] = useState<string | null>(null);
  // Éxito de la consolidación (dispara la pantalla de confeti).
  const [resultado, setResultado] = useState<ResultadoConsolidacion | null>(null);

  const cargarResumen = async () => {
    setCargando(true);
    setErrorResumen(null);
    try {
      const data = await viaticosService.obtenerResumenConsolidacion(solicitud.id);
      if (!data) {
        setErrorResumen(
          'No fue posible obtener el resumen de consolidación del expediente.',
        );
      } else {
        setResumen(data);
      }
    } catch (e) {
      console.error('Error cargando resumen de consolidación:', e);
      setErrorResumen('Ocurrió un error al validar el expediente. Reintente.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargarResumen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitud.id]);

  // ---------- Utilidades de presentación ----------
  const comisionado = solicitud.comisionado;
  const nombreComisionado = comisionado
    ? formatearNombreComisionado(comisionado)
    : 'Comisionado';
  const dias = solicitud.diasComision ?? 1;
  const totalEstimado =
    Number(solicitud.montoViaticos || 0) + Number(solicitud.montoGastosViaje || 0);

  const requiereTiquetes = Boolean(solicitud.requiereTiquetes);
  const estado = solicitud.estadoSolicitud || 'RADICADA';

  const itemsTiquetes = (resumen?.items || []).filter(
    (item) => item.grupo === 'TIQUETES',
  );
  const tiquetesOk =
    itemsTiquetes.length > 0 && itemsTiquetes.every((item) => item.estado === 'OK');

  /** Tareas pendientes que bloquean el envío (validación en cliente). */
  const tareasPendientes = resumen?.errores ?? [];
  const puedeEnviar = Boolean(resumen?.esConsolidable) && !enviando;

  const subirDocumento = async (codigo: string, archivo: File) => {
    setErrorDoc(null);
    if (!esPdfMime(archivo.type) && !esPdfMime(inferirTipoMime(archivo.name))) {
      setErrorDoc(`El documento "${archivo.name}" debe estar en formato PDF.`);
      return;
    }
    setSubiendoDoc(codigo);
    try {
      await viaticosService.subirDocumento(
        solicitud.id,
        codigo,
        archivo,
        'application/pdf',
      );
      // Refresca el checklist: el backend es la fuente de verdad.
      await cargarResumen();
    } catch (e: any) {
      console.error('Error subiendo documento en consolidación:', e);
      setErrorDoc(
        e?.message ||
          'No fue posible cargar el documento. Verifique e intente nuevamente.',
      );
    } finally {
      setSubiendoDoc(null);
    }
  };

  /** Confirmación de envío: POST /requests/:id/submit (RF-LIQ-004). */
  const enviarExpediente = async () => {
    if (!resumen?.esConsolidable) return;
    setEnviando(true);
    setErrorEnvio(null);
    try {
      const resultadoEnvio = await viaticosService.consolidarSolicitud(solicitud.id);
      setResultado(resultadoEnvio);
    } catch (e: any) {
      console.error('Error consolidando expediente:', e);
      const faltantes: string[] = e?.errors ?? [];
      if (faltantes.length > 0) {
        setErrorEnvio(
          `El expediente no pudo enviarse. Tareas pendientes:\n• ${faltantes.join('\n• ')}`,
        );
        // Refresca el checklist para reflejar el estado real del servidor.
        await cargarResumen();
      } else {
        setErrorEnvio(
          e?.message || 'No fue posible enviar el expediente. Intente nuevamente.',
        );
      }
    } finally {
      setEnviando(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void enviarExpediente();
  };

  // ---------- Pantalla de éxito con confeti ----------
  if (resultado) {
    return (
      <SuccessScreen
        consecutivoUnico={resultado.consecutivoUnico}
        onFinalizar={() => {
          onConsolidada(resultado);
          onCerrar();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Encabezado del paso */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
            Paso 4 · Resumen de Expediente y Envío
          </p>
          <h4 className="font-bold text-slate-800 text-sm mt-0.5 flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-[#003DA5]" />
            Consolidación y cierre del expediente (RF-LIQ-004)
          </h4>
          <p className="text-[11px] text-slate-400">
            Expediente <span className="font-mono">{solicitud.consecutivoUnico}</span> · Estado{' '}
            <span className="font-bold text-slate-600">{estado}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="text-slate-400 hover:text-slate-600 text-sm font-bold shrink-0"
        >
          ✕
        </button>
      </div>

      {cargando && (
        <p className="text-xs text-slate-400 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" /> Validando integridad del expediente…
        </p>
      )}

      {errorResumen && (
        <p className="text-xs text-red-700 font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {errorResumen}
        </p>
      )}

      {/* Tarjeta 1 — Expediente digital (datos demográficos, itinerario, objeto) */}
      <section className="border border-slate-200 rounded-xl p-4 space-y-3">
        <SectionTitle icon={<FileText className="w-4 h-4" />} title="Expediente Digital — Formato 023" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
          <Field label="Comisionado" value={nombreComisionado} />
          <Field
            label="Documento / Tipo"
            value={`${comisionado?.numeroDocumento || '—'} · ${comisionado?.tipoComisionado || '—'}`}
          />
          <Field label="Destino" value={`${solicitud.destinoCiudad} (${solicitud.destinoDepartamento})`} />
          <Field
            label="Itinerario"
            value={`${String(solicitud.fechaInicio).slice(0, 10)} al ${String(solicitud.fechaFin).slice(0, 10)} · ${dias} día(s)`}
          />
          <Field label="Rubro presupuestal" value={solicitud.rubroPresupuestal} />
          <Field label="Prioridad" value={solicitud.prioridad} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Objeto de la comisión (sanitizado)
          </p>
          <p className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-slate-700 leading-relaxed">
            {solicitud.objetoComision || '—'}
          </p>
        </div>
      </section>

      {/* Tarjeta 2 — Financiera (desglose del Autoliquidador) */}
      <section className="border border-slate-200 rounded-xl p-4 space-y-3">
        <SectionTitle icon={<Wallet className="w-4 h-4" />} title="Liquidación financiera — Autoliquidador" />
        <div className="divide-y divide-slate-100 text-[11px]">
          <Row label="Viáticos (autoliquidación, Decreto 314 de 2026)" value={formatearMoneda(solicitud.montoViaticos)} />
          <Row label="Gastos de viaje" value={formatearMoneda(solicitud.montoGastosViaje)} />
          <Row label="Total estimado del expediente" value={formatearMoneda(totalEstimado)} strong />
        </div>
      </section>

      {/* Tarjeta 3 — Transporte y saldo presupuestal */}
      <section className="border border-slate-200 rounded-xl p-4 space-y-3">
        <SectionTitle icon={<Plane className="w-4 h-4" />} title="Transporte y saldo presupuestal" />
        <p className="text-[11px] text-slate-600">
          {requiereTiquetes
            ? 'La comisión requiere tiquetes aéreos / pasajes. El expediente incluye la validación de ruta y saldo de la dependencia.'
            : 'La comisión NO requiere tiquetes aéreos. No aplica reserva de saldo presupuestal.'}
        </p>
        {requiereTiquetes && (
          <div className="flex items-center gap-2">
            {tiquetesOk ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saldo y excepciones validados
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5" /> Requiere gestión de tiquetes
              </span>
            )}
          </div>
        )}
        {itemsTiquetes.length > 0 && (
          <ul className="space-y-1.5">
            {itemsTiquetes.map((item) => (
              <li key={item.codigo} className="flex items-start gap-1.5 text-[11px]">
                {item.estado === 'OK' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                )}
                <span className={item.estado === 'OK' ? 'text-slate-600' : 'text-red-700 font-semibold'}>
                  {item.detalle ?? item.etiqueta}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Tarjeta 4 — Checklist de documentos PDF */}
      <section className="border border-slate-200 rounded-xl p-4 space-y-3">
        <SectionTitle icon={<ShieldCheck className="w-4 h-4" />} title="Checklist de documentos de soporte (PDF)" />
        {resumen && resumen.documentos.length === 0 && (
          <p className="text-[11px] text-slate-400 italic">
            No hay soportes obligatorios configurados para este tipo de comisionado.
          </p>
        )}
        <ul className="space-y-2">
          {(resumen?.documentos || []).map((doc) => {
            const listo = doc.cargado && doc.pdf;
            return (
              <li
                key={doc.codigo}
                className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 ${
                  listo ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/40'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                    {listo ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    )}
                    {doc.nombre}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {doc.codigo} · {listo ? 'cargado en PDF' : doc.cargado ? 'requiere PDF válido' : 'faltante'}
                  </p>
                </div>
                {listo ? (
                  <span className="text-emerald-700 font-black text-sm">✓</span>
                ) : (
                  <label className="px-3 py-1.5 bg-[#003DA5] hover:bg-[#002b75] text-white rounded-xl text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0">
                    <input
                      type="file"
                      accept="application/pdf"
                      hidden
                      disabled={subiendoDoc !== null}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void subirDocumento(doc.codigo, file);
                      }}
                    />
                    {subiendoDoc === doc.codigo ? 'Cargando…' : 'Subir PDF'}
                  </label>
                )}
              </li>
            );
          })}
        </ul>
        {errorDoc && (
          <p className="text-[11px] text-red-700 font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
            {errorDoc}
          </p>
        )}
      </section>

      {/* Bloque de validación en cliente + pendientes */}
      {!puedeEnviar && !cargando && resumen && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Tareas pendientes antes del envío
          </p>
          {tareasPendientes.length > 0 ? (
            <ul className="list-disc pl-5 space-y-1">
              {tareasPendientes.map((pendiente, idx) => (
                <li key={idx} className="text-[11px] text-amber-900">
                  {pendiente}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-amber-900">
              El expediente aún no puede enviarse. Complete las tareas pendientes
              para habilitar el botón de envío.
            </p>
          )}
        </div>
      )}

      {errorEnvio && (
        <pre className="text-[11px] text-red-700 font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-2 whitespace-pre-wrap font-sans">
          {errorEnvio}
        </pre>
      )}

      {/* Acciones */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onCerrar}
          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1 hover:bg-slate-50"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver
        </button>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-slate-400">
            <Lock className="w-3 h-3" /> Al enviar, el expediente queda en solo lectura
          </span>
          <button
            type="button"
            disabled={!puedeEnviar}
            onClick={() => void enviarExpediente()}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {enviando ? 'Enviando…' : 'Radicar y Enviar a Revisión'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Subcomponentes de presentación                                      */
/* ------------------------------------------------------------------ */

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">{icon}</span>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">{label}</span>
      <span className="font-semibold text-slate-700 text-xs">{value || '—'}</span>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={strong ? 'font-bold text-slate-700' : 'text-slate-500'}>{label}</span>
      <span className={strong ? 'font-black text-slate-800' : 'font-bold text-slate-700'}>
        {value}
      </span>
    </div>
  );
}

/** Pantalla de éxito interactiva con confeti (sin dependencias externas). */
function SuccessScreen({
  consecutivoUnico,
  onFinalizar,
}: {
  consecutivoUnico: string;
  onFinalizar: () => void;
}) {
  const piezas = useMemo(
    () =>
      Array.from({ length: 60 }).map((_, idx) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.9,
        duration: 2.4 + Math.random() * 2.2,
        size: 6 + Math.random() * 7,
        color: ['#003DA5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][idx % 5],
        tilt: Math.random() * 90 - 45,
      })),
    [],
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/40 text-center p-8">
      {/* Piezas de confeti (animación CSS pura) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {piezas.map((pieza, idx) => (
          <span
            key={idx}
            className="confeti-pieza absolute top-0 block rounded-sm"
            style={{
              left: `${pieza.left}%`,
              width: pieza.size,
              height: pieza.size * 0.55,
              backgroundColor: pieza.color,
              animationDelay: `${pieza.delay}s`,
              animationDuration: `${pieza.duration}s`,
              transform: `rotate(${pieza.tilt}deg)`,
            }}
          />
        ))}
        <style>{`
          @keyframes confeti-caer {
            0%   { transform: translateY(-10%) rotate(0deg); opacity: 1; }
            100% { transform: translateY(520px) rotate(540deg); opacity: 0; }
          }
          .confeti-pieza {
            animation-name: confeti-caer;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
          }
        `}</style>
      </div>

      <div className="relative">
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <h3 className="text-lg font-black text-slate-900">¡Expediente Consolidado con éxito!</h3>
        <p className="text-xs text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
          El expediente con consecutivo{' '}
          <span className="font-mono font-bold text-slate-800">{consecutivoUnico}</span>{' '}
          se encuentra en revisión en la bandeja del <strong>Grupo de Viáticos</strong>.
          El expediente quedó congelado en modo de solo lectura y su trazabilidad
          fue registrada para auditoría.
        </p>
        <button
          type="button"
          onClick={onFinalizar}
          className="mt-6 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors"
        >
          Ir a mis solicitudes
        </button>
      </div>
    </div>
  );
}
