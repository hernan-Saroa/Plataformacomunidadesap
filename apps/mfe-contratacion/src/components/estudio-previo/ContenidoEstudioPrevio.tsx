import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Paperclip,
  Save,
  Send,
  Lock,
  Undo2,
  FileText,
  Download,
  RotateCcw,
  CircleCheck,
  MessageSquare,
} from 'lucide-react';

import { useEstudioPrevio } from '../../hooks/useEstudioPrevio';
import { contratacionService } from '../../services/contratacionService';
import { CampoFormulario, DocumentoExpediente, RevisionEstudioPrevio } from '../../types';
import { CampoDinamico } from './CampoDinamico';
import { AlertaCamposFaltantes } from './AlertaCamposFaltantes';
import { Modal } from '../shared/Modal';
import { BloqueDocumento } from './BloqueDocumento';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

const MIME_ACEPTADOS = '.pdf,.doc,.docx,.xls,.xlsx';

/**
 * Contenido de la actividad 3.1 dentro de su desplegable.
 *
 * Todo ocurre aquí — campos, documentos y decisión de revisión — para que el
 * revisor no cambie de contexto: ve el contenido, sus soportes y decide sin
 * salir de la lista de actividades.
 */
export function ContenidoEstudioPrevio({ procesoId, onCambio }: Props) {
  const {
    datos,
    valores,
    errores,
    faltantes,
    cargando,
    guardando,
    enviando,
    mensaje,
    cambiar,
    guardar,
    enviar,
    irACampo,
    cargar,
    documentoFaltante,
  } = useEstudioPrevio(procesoId);

  const [documentos, setDocumentos] = useState<DocumentoExpediente[]>([]);
  const [revisiones, setRevisiones] = useState<RevisionEstudioPrevio[]>([]);
  const [seccion, setSeccion] = useState<'campos' | 'documentos' | 'historial'>('campos');
  const [accion, setAccion] = useState<'aprobar' | 'devolver' | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const cargarAnexos = () =>
    Promise.all([
      contratacionService.obtenerExpediente(procesoId),
      contratacionService.revisiones(procesoId),
    ])
      .then(([exp, revs]) => {
        setDocumentos(exp.documentos.filter((d) => d.numeral === '3.1'));
        setRevisiones(revs);
      })
      .catch(() => undefined);

  useEffect(() => {
    cargarAnexos();
  }, [procesoId]);

  // Al bloquearse el envío por falta del documento, se abre su pestaña:
  // el mensaje solo no basta si el usuario está viendo el formulario.
  useEffect(() => {
    if (documentoFaltante) setSeccion('documentos');
  }, [documentoFaltante]);

  /** Campos agrupados por sección, en el orden de la configuración. */
  const grupos = useMemo(() => {
    const mapa = new Map<string, CampoFormulario[]>();
    for (const campo of [...(datos?.definicionCampos ?? [])].sort((a, b) => a.orden - b.orden)) {
      const clave = campo.grupo ?? 'General';
      if (!mapa.has(clave)) mapa.set(clave, []);
      mapa.get(clave)!.push(campo);
    }
    return Array.from(mapa.entries());
  }, [datos?.definicionCampos]);

  if (cargando) {
    return <p className="text-xs text-slate-500 m-0 px-4 py-3">Cargando…</p>;
  }
  if (!datos) {
    return (
      <p className="text-xs text-red-600 m-0 px-4 py-3">
        {mensaje?.texto ?? 'No se pudo cargar el estudio previo'}
      </p>
    );
  }

  const enRevision = datos.estado === 'EN_REVISION';
  const aprobado = datos.estado === 'APROBADO';
  const bloqueado = enRevision || aprobado;
  const ultimaDevolucion = revisiones.find((r) => r.decision === 'DEVUELTO');

  const refrescar = async () => {
    await cargar();
    await cargarAnexos();
    onCambio?.();
  };

  const adjuntar = async (archivo: File) => {
    setSubiendo(true);
    setError(null);
    try {
      await contratacionService.adjuntarDocumento(procesoId, archivo);
      await cargarAnexos();
      onCambio?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const decidir = async () => {
    if (!accion) return;
    setProcesando(true);
    setError(null);
    try {
      if (accion === 'aprobar') {
        await contratacionService.aprobar(procesoId, observaciones.trim() || undefined);
      } else {
        await contratacionService.devolver(procesoId, observaciones.trim());
      }
      setAccion(null);
      setObservaciones('');
      await refrescar();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  };

  return (
    // El padding va aquí y no en quien lo monta: el contenedor de la actividad
    // es una tarjeta a ras de borde, y sin esto los campos quedan pegados.
    <div className="space-y-4 p-4">
      <AlertaCamposFaltantes faltantes={faltantes} onIrACampo={irACampo} />

      {/* Observaciones de la última devolución */}
      {datos.estado === 'BORRADOR' && ultimaDevolucion && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 flex items-start gap-2.5">
          <RotateCcw className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[12.5px] font-bold text-amber-800 m-0">Devuelto para corrección</p>
            <p className="text-[12px] text-amber-900 m-0 mt-0.5 leading-relaxed">
              {ultimaDevolucion.observaciones}
            </p>
            <p className="text-[10.5px] text-amber-700 m-0 mt-1 tabular-nums">
              {ultimaDevolucion.revisadoPor} ·{' '}
              {new Date(ultimaDevolucion.createdAt).toLocaleDateString('es-CO')}
            </p>
          </div>
        </div>
      )}

      {/* Pestañas: separan el diligenciamiento de sus soportes y su historial,
          que es lo que el revisor consulta sin querer editar nada. */}
      <div className="flex gap-1 border-b border-gray-200 -mb-px">
        {(
          [
            { id: 'campos' as const, label: 'Formulario', icono: FileText },
            { id: 'documentos' as const, label: 'Documento', icono: Paperclip, n: documentos.length },
            { id: 'historial' as const, label: 'Historial', icono: MessageSquare, n: revisiones.length },
          ]
        ).map((t) => {
          const Icono = t.icono;
          const activa = seccion === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSeccion(t.id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] whitespace-nowrap
                transition-colors ${
                  activa
                    ? 'border-[#003DA5] text-[#003DA5] font-black'
                    : 'border-transparent text-slate-500 hover:text-slate-700 font-bold'
                }`}
              style={{ borderBottomWidth: 2 }}
            >
              <Icono className="w-3 h-3" />
              {t.label}
              {t.n !== undefined && t.n > 0 && (
                <span
                  className={`text-[9.5px] font-bold px-1.5 rounded-full tabular-nums ${
                    activa ? 'bg-[#E0EDFF] text-[#003DA5]' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {t.n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Campos por sección, dos columnas */}
      {seccion === 'campos' &&
        grupos.map(([grupo, campos]) => (
          <section key={grupo} aria-labelledby={`sec-${grupo}`}>
            <h4
              id={`sec-${grupo}`}
              className="text-[11.5px] font-black uppercase tracking-wide text-[#003DA5] m-0 mb-2.5
                pb-1.5 leading-relaxed border-b border-gray-200"
            >
              {grupo}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
              {campos.map((campo) => (
                <CampoDinamico
                  key={campo.codigo}
                  campo={campo}
                  valor={valores[campo.codigo]}
                  error={errores[campo.codigo]}
                  disabled={bloqueado}
                  onChange={(v) => cambiar(campo.codigo, v)}
                />
              ))}
            </div>
          </section>
        ))}

      {/* El estudio previo firmado: entregable real de esta actividad */}
      {seccion === 'documentos' && (
        <BloqueDocumento
          procesoId={procesoId}
          documentos={documentos}
          bloqueado={bloqueado}
          onAdjuntado={async () => {
            await cargarAnexos();
            onCambio?.();
          }}
        />
      )}

      {/* Historial de revisión */}
      {seccion === 'historial' && (
        <section aria-label="Historial de revisión">
          {revisiones.length === 0 && (
            <div className="py-8 text-center">
              <MessageSquare className="w-8 h-8 mx-auto text-gray-300 mb-2" strokeWidth={1.5} />
              <p className="text-[12px] font-bold text-gray-500 m-0">Sin revisiones</p>
              <p className="text-[11px] text-gray-400 m-0 mt-1">
                Aquí quedarán las aprobaciones y devoluciones del estudio previo.
              </p>
            </div>
          )}
          <ul className="m-0 p-0 list-none space-y-1.5">
            {revisiones.map((r) => {
              const ok = r.decision === 'APROBADO';
              return (
                <li key={r.id} className="flex items-start gap-2.5 px-1 py-1">
                  {ok ? (
                    <CircleCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <MessageSquare className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[12px] font-bold m-0 ${
                        ok ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {ok ? 'Aprobado' : 'Devuelto'}
                      <span className="text-gray-400 font-semibold"> · versión {r.versionRevisada}</span>
                    </p>
                    {r.observaciones && (
                      <p className="text-[11.5px] text-gray-600 m-0 mt-0.5 leading-snug">
                        {r.observaciones}
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400 m-0 mt-0.5 tabular-nums">
                      {r.revisadoPor} · {new Date(r.createdAt).toLocaleString('es-CO')}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {error && (
        <p role="alert" className="text-[11.5px] font-bold text-red-600 m-0">
          {error}
        </p>
      )}

      {/* Acciones */}
      <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-gray-200">
        {aprobado ? (
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-emerald-700">
            <Lock className="w-3.5 h-3.5" />
            Aprobado · registrado en el expediente
          </span>
        ) : enRevision ? (
          <>
            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-amber-700">
              <Lock className="w-3.5 h-3.5" />
              Pendiente de revisión
            </span>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => {
                setAccion('devolver');
                setObservaciones('');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold
                rounded-md border border-amber-300 bg-white text-amber-700 hover:bg-amber-50 transition-all"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Devolver
            </button>
            <button
              type="button"
              onClick={() => {
                setAccion('aprobar');
                setObservaciones('');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11.5px] font-extrabold
                rounded-md text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm
                active:scale-95 transition-all"
            >
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
              Aprobar
            </button>
          </>
        ) : (
          <>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept={MIME_ACEPTADOS}
              onChange={(e) => e.target.files?.[0] && adjuntar(e.target.files[0])}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={subiendo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold
                rounded-md bg-white text-slate-700 border border-slate-300
                hover:border-[#003DA5] hover:text-[#003DA5] disabled:opacity-50 transition-all"
            >
              <Paperclip className="w-3.5 h-3.5" />
              {subiendo ? 'Subiendo…' : 'Adjuntar'}
            </button>
            <button
              type="button"
              onClick={guardar}
              disabled={guardando || enviando}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold
                rounded-md bg-white text-slate-700 border border-slate-300
                hover:border-[#003DA5] hover:text-[#003DA5] disabled:opacity-50 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>

            <span className="flex-1" />

            {mensaje && (
              <span
                className={`text-[11px] font-bold ${
                  mensaje.tipo === 'ok' ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                {mensaje.texto}
              </span>
            )}

            <button
              type="button"
              onClick={async () => {
                await enviar();
                await cargarAnexos();
                onCambio?.();
              }}
              disabled={guardando || enviando}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11.5px] font-extrabold
                rounded-md text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm
                active:scale-95 disabled:opacity-50 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              {enviando ? 'Enviando…' : 'Enviar a revisión'}
            </button>
          </>
        )}
      </div>

      <Modal
        isOpen={accion !== null}
        onClose={() => setAccion(null)}
        title={accion === 'aprobar' ? 'Aprobar estudio previo' : 'Devolver para corrección'}
        description={
          accion === 'aprobar'
            ? 'El proceso podrá continuar a las etapas siguientes'
            : 'El gestor podrá corregirlo y volver a enviarlo'
        }
        icon={
          accion === 'aprobar' ? (
            <Check className="w-5 h-5 text-white" strokeWidth={3} />
          ) : (
            <Undo2 className="w-5 h-5 text-white" />
          )
        }
        color={accion === 'aprobar' ? '#059669' : '#D97706'}
        size="medium"
        footer={
          <>
            <button
              type="button"
              onClick={decidir}
              disabled={procesando || (accion === 'devolver' && !observaciones.trim())}
              className={`px-3.5 py-2 text-xs font-extrabold rounded-lg text-white shadow-sm
                active:scale-95 disabled:opacity-50 transition-all ${
                  accion === 'aprobar'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
            >
              {procesando ? 'Procesando…' : accion === 'aprobar' ? 'Confirmar' : 'Devolver'}
            </button>
            <button
              type="button"
              onClick={() => setAccion(null)}
              className="px-3.5 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-700"
            >
              Cancelar
            </button>
          </>
        }
      >
        <label htmlFor="obs" className="block text-xs font-bold text-gray-600 mb-1.5">
          Observaciones
          {accion === 'devolver' && <span className="text-red-600"> *</span>}
        </label>
        <textarea
          id="obs"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder={
            accion === 'aprobar'
              ? 'Opcional: comentarios sobre la aprobación'
              : 'Indica qué debe corregirse'
          }
          className="w-full min-h-[110px] px-3 py-2 text-sm rounded-lg border border-gray-300
            focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20"
        />
        {accion === 'devolver' && (
          <p className="text-[11px] text-gray-500 mt-2 mb-0">
            Sin observaciones el gestor no sabría qué corregir, por eso son obligatorias.
          </p>
        )}
      </Modal>
    </div>
  );
}
