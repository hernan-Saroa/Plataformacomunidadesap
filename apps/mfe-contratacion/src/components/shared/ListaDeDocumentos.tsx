import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  Paperclip,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import {
  DocumentoCargado,
  DocumentoDeLaActividad,
  EstadoDocumentosActividad,
} from '../../types';
import { DocumentoVisible, VisorDocumento } from './VisorDocumento';
import { useSoloLectura } from './SoloLectura';

interface Props {
  procesoId: string;
  numeral: string;
  /** Cambia cuando la actividad guarda algo, para volver a leer. */
  recargarToken?: number;
  onCambio?: () => void;
  /**
   * Cuántos obligatorios siguen sin cargar, para quien monte la lista.
   *
   * Lo necesitan las decisiones que viven fuera —aprobar, enviar el estudio
   * previo—: sin el dato, el botón quedaba activo aunque aquí dijera
   * «Falta 1 de 3».
   */
  onFaltantes?: (faltan: number) => void;
  /**
   * Por qué, aunque quien mira tenga permiso, la lista no se puede tocar ahora
   * —el estudio previo está en revisión, por ejemplo—. La lista se sigue
   * mostrando y las plantillas se siguen descargando; lo que se retira son
   * los botones que el servicio rechazaría.
   */
  bloqueo?: string | null;
  /** Encabezado propio, para las actividades que presentan la lista a su modo. */
  titulo?: string;
  /** Una línea bajo el encabezado que explica para qué es la lista. */
  ayuda?: React.ReactNode;
}

const MIME_ACEPTADOS = '.pdf,.doc,.docx,.xls,.xlsx';

const boton =
  'inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed';

/**
 * La lista de chequeo de una actividad (EFDS-2066).
 *
 * Cada documento que la actividad pide es una fila con todo lo necesario para
 * resolverla sin salir de ahí: para qué sirve, si es obligatorio, descargar su
 * plantilla, cargar el diligenciado y sustituirlo. Las filas salen del
 * catálogo que Configuración administra, así que la misma pieza sirve para la
 * radicación de la 3.1, los documentos de la 5.1 y cualquier otra actividad
 * sin escribir nada por actividad.
 *
 * Debajo va lo que la actividad dejó en el expediente sin pasar por la lista:
 * anexos que ninguna fila previó y las copias que genera el propio proceso.
 */
export function ListaDeDocumentos({
  procesoId,
  numeral,
  recargarToken,
  onCambio,
  onFaltantes,
  bloqueo = null,
  titulo = 'Documentos de esta actividad',
  ayuda,
}: Props) {
  const [estado, setEstado] = useState<EstadoDocumentosActividad | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [viendo, setViendo] = useState<DocumentoVisible | null>(null);
  const inputAdicional = useRef<HTMLInputElement>(null);
  /**
   * La secuencia todavía no llegó a esta actividad (EFDS-1183). Las filas y
   * las plantillas se siguen ofreciendo —para eso se puede entrar a mirarla—,
   * pero cargar queda fuera.
   */
  const soloLectura = useSoloLectura();

  /**
   * Lo que llegó al expediente por otra vía: la copia del formulario al
   * enviarlo, lo que sube el panel propio de la actividad. No son adjuntos del
   * gestor, así que se listan pero no se retiran desde aquí.
   */
  const [delExpediente, setDelExpediente] = useState<DocumentoCargado[]>([]);

  const leer = useCallback(
    () =>
      Promise.all([
        contratacionService.documentosDeActividad(procesoId, numeral),
        contratacionService.obtenerExpediente(procesoId).catch(() => null),
      ])
        .then(([documentos, expediente]) => {
          setEstado(documentos);
          setDelExpediente(
            ((expediente as any)?.documentos ?? [])
              .filter((d: any) => d.numeral === numeral && d.tipo !== 'ADJUNTO')
              .map((d: any) => ({
                id: d.id,
                nombre: d.nombre,
                descargaUrl: d.descargaUrl ?? null,
                subidoPor: d.subidoPor ?? null,
                cargadoAt: d.createdAt,
              })),
          );
        })
        // Silencioso: un fallo al listarlos no debe tapar la actividad que el
        // gestor está trabajando.
        .catch(() => setEstado(null)),
    [procesoId, numeral],
  );

  useEffect(() => {
    leer();
  }, [leer, recargarToken]);

  useEffect(() => {
    if (!onFaltantes) return;
    onFaltantes(estado?.faltantes.length ?? 0);
  }, [estado, onFaltantes]);

  /** Tras cualquier cambio: releer, avisar hacia arriba y soltar la fila. */
  const tras = async (accion: () => Promise<unknown>, clave: string, exito: string) => {
    setOcupado(clave);
    try {
      await accion();
      toast.success(exito);
      await leer();
      onCambio?.();
    } catch (e: any) {
      toast.error(e.message ?? 'No pudimos completar la acción. Inténtalo de nuevo.');
      // Releer igual: si falló la segunda mitad de una sustitución, la fila
      // tiene que mostrarse pendiente y no con el archivo que ya se anuló.
      await leer();
    } finally {
      setOcupado(null);
    }
  };

  const cargar = (doc: DocumentoDeLaActividad, archivo: File) =>
    tras(
      () => contratacionService.cargarDocumentoDeActividad(procesoId, numeral, archivo, doc.codigo),
      doc.codigo,
      'Documento cargado',
    );

  /**
   * Sustituir es anular la entrega vigente y cargar la nueva, en un solo gesto.
   * La anterior no se borra: el expediente la conserva como versión previa.
   */
  const sustituir = (doc: DocumentoDeLaActividad, archivo: File) =>
    tras(
      async () => {
        if (doc.cargado) {
          await contratacionService.anularDocumentoDeActividad(procesoId, numeral, doc.cargado.id);
        }
        await contratacionService.cargarDocumentoDeActividad(
          procesoId,
          numeral,
          archivo,
          doc.codigo,
        );
      },
      doc.codigo,
      'Documento reemplazado. La versión anterior se conserva en el expediente.',
    );

  /**
   * Varios anexos de una vez, para lo que no responde a ninguna fila.
   *
   * Las filas son de uno en uno porque cada una es un documento. Los anexos
   * llegan a puñados, así que aquí el selector admite varios y se suben en
   * serie.
   */
  const cargarVarios = async (archivos: File[]) => {
    setOcupado('adicional');
    let subidos = 0;
    try {
      for (const archivo of archivos) {
        await contratacionService.cargarDocumentoDeActividad(procesoId, numeral, archivo);
        subidos += 1;
      }
      toast.success(subidos === 1 ? 'Documento cargado' : `${subidos} documentos cargados`);
    } catch (e: any) {
      toast.error(
        subidos > 0
          ? `${e.message ?? 'No pudimos cargar el documento'}. Se alcanzaron a cargar ${subidos} de ${archivos.length}.`
          : (e.message ?? 'No pudimos cargar el documento. Inténtalo de nuevo.'),
      );
    } finally {
      setOcupado(null);
      if (subidos > 0) {
        await leer();
        onCambio?.();
      }
    }
  };

  const retirar = (documentoId: string) =>
    tras(
      () => contratacionService.retirarDocumentoDeActividad(procesoId, numeral, documentoId),
      documentoId,
      'Documento retirado del expediente',
    );

  // Sin nada que pedir ni nada cargado la lista no se pinta: la mayoría de
  // las actividades no piden documentos, y un marco vacío se leería como
  // algo pendiente.
  if (
    !estado ||
    (estado.documentos.length === 0 &&
      estado.adicionales.length === 0 &&
      delExpediente.length === 0)
  ) {
    return null;
  }

  const motivo = soloLectura || bloqueo;
  const puedeTocar = estado.puedeCargar && !motivo;
  const obligatorios = estado.documentos.filter((d) => d.obligatorio);
  const faltan = estado.faltantes.length;
  /** Alguna fila sale de la lectura del procedimiento y no del formato oficial. */
  const haySupuestos = estado.documentos.some((d) => !d.confirmado);

  return (
    <section
      aria-label={titulo}
      className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <ClipboardCheck className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[12.5px] font-bold text-slate-800 m-0">{titulo}</p>
            {ayuda && (
              <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed">{ayuda}</p>
            )}
          </div>
        </div>

        {obligatorios.length > 0 && (
          <span
            className={`text-[10.5px] font-bold rounded-md px-1.5 py-0.5 shrink-0 ${
              faltan === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {faltan === 0
              ? 'Obligatorios completos'
              : `${faltan === 1 ? 'Falta' : 'Faltan'} ${faltan} de ${obligatorios.length} obligatorios`}
          </span>
        )}
      </div>

      {estado.documentos.map((doc) => (
        <FilaDocumento
          key={doc.codigo}
          documento={doc}
          ocupada={ocupado === doc.codigo}
          puedeTocar={puedeTocar}
          sinPermiso={!estado.puedeCargar}
          motivo={motivo}
          onCargar={(archivo) => cargar(doc, archivo)}
          onSustituir={(archivo) => sustituir(doc, archivo)}
          onVer={setViendo}
        />
      ))}

      {(estado.adicionales.length > 0 || delExpediente.length > 0) && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[11px] font-bold text-slate-500 m-0">Otros documentos adjuntos</p>
          {estado.adicionales.map((doc) => (
            <FilaAdicional
              key={doc.id}
              documento={doc}
              ocupada={ocupado === doc.id}
              puedeRetirar={puedeTocar}
              onRetirar={() => retirar(doc.id)}
              onVer={setViendo}
            />
          ))}
          {delExpediente.map((doc) => (
            <FilaAdicional
              key={doc.id}
              documento={doc}
              ocupada={false}
              puedeRetirar={false}
              onRetirar={() => undefined}
              onVer={setViendo}
            />
          ))}
        </div>
      )}

      {/* Adjuntar algo que ninguna fila pedía, en segundo plano: la lista de
          arriba es lo que hay que resolver. */}
      {puedeTocar && (
        <div className="pt-0.5">
          <input
            ref={inputAdicional}
            type="file"
            multiple
            className="hidden"
            accept={MIME_ACEPTADOS}
            onChange={(e) => {
              const elegidos = Array.from(e.target.files ?? []);
              // Se limpia: si tras un error se elige el mismo archivo, sin esto
              // el onChange no se dispara y la pantalla parecería colgada.
              e.target.value = '';
              if (elegidos.length) cargarVarios(elegidos);
            }}
          />
          <button
            type="button"
            disabled={ocupado === 'adicional'}
            onClick={() => inputAdicional.current?.click()}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-[#003DA5] transition-colors disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            {ocupado === 'adicional' ? 'Cargando…' : 'Adjuntar otros documentos'}
          </button>
        </div>
      )}

      {/* Se dice, no se esconde: a quien se le exige un documento le
          corresponde saber si se lo exige el formato de la ESAP o la lectura
          que el equipo hizo del procedimiento. Desaparece cuando Contratación
          confirma la fila desde Configuración, sin tocar código. */}
      {haySupuestos && (
        <p className="text-[10.5px] text-amber-700 m-0 flex items-start gap-1.5 leading-relaxed">
          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-px" aria-hidden="true" />
          Los documentos marcados con ◦ se tomaron del procedimiento y la Dirección de Contratación
          aún debe confirmarlos con el formato oficial.
        </p>
      )}

      <VisorDocumento documento={viendo} onClose={() => setViendo(null)} />
    </section>
  );
}

/** Un documento de la lista, con su plantilla, su estado y su carga. */
function FilaDocumento({
  documento,
  ocupada,
  puedeTocar,
  sinPermiso,
  motivo,
  onCargar,
  onSustituir,
  onVer,
}: {
  documento: DocumentoDeLaActividad;
  ocupada: boolean;
  puedeTocar: boolean;
  /** Quien solo aprueba ve la fila, pero no los botones que le rechazarían. */
  sinPermiso: boolean;
  /** Por qué no se puede cargar ahora, si es por la secuencia o el estado. */
  motivo: string | null;
  onCargar: (archivo: File) => void;
  onSustituir: (archivo: File) => void;
  onVer: (documento: DocumentoVisible) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  /** El selector de archivo sirve a los dos gestos; esto dice cuál lo abrió. */
  const gesto = useRef<'cargar' | 'sustituir'>('cargar');
  const cargado = documento.cargado;

  const elegir = (cual: 'cargar' | 'sustituir') => {
    gesto.current = cual;
    input.current?.click();
  };

  return (
    <div
      className={`rounded-lg border px-3.5 py-3 ${
        cargado ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {cargado ? (
          <Check className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" strokeWidth={3} />
        ) : (
          <FileText className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p
              className={`text-[12.5px] font-bold m-0 leading-snug ${
                cargado ? 'text-emerald-900' : 'text-slate-800'
              }`}
            >
              {documento.nombre}
              {!documento.confirmado && (
                <span className="text-amber-600" title="Pendiente de confirmar con el formato oficial">
                  {' '}◦
                </span>
              )}
            </p>
            <span
              className={`text-[10.5px] font-bold rounded-md px-1.5 py-0.5 ${
                documento.obligatorio
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-slate-50 text-slate-500'
              }`}
            >
              {documento.obligatorio ? 'Obligatorio' : 'Opcional'}
            </span>
            <span
              className={`text-[10.5px] font-bold rounded-md px-1.5 py-0.5 ${
                cargado ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'
              }`}
            >
              {cargado ? 'Cargado' : 'Pendiente'}
            </span>
          </div>

          {documento.descripcion && (
            <p className="text-[11.5px] text-slate-600 m-0 mt-1 leading-relaxed">
              {documento.descripcion}
            </p>
          )}

          {documento.plantilla &&
            (documento.plantilla.descargaUrl ? (
              /* La plantilla acompaña al nombre y no compite con el botón: la
                 acción de esta fila es cargar, y dos botones del mismo peso
                 obligarían a decidir cuál es antes de hacer nada. */
              <a
                href={contratacionService.urlDescarga(documento.plantilla.descargaUrl)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-bold text-[#003DA5] hover:underline"
              >
                <Download className="w-3 h-3" aria-hidden="true" />
                Descargar la plantilla ({documento.plantilla.codigo}, versión {documento.plantilla.version})
              </a>
            ) : (
              /* Se dice, y no se bloquea: el gestor no puede subir la plantilla
                 —eso lo hace Contratación desde la biblioteca—, así que
                 impedirle avanzar lo dejaría esperando algo ajeno. */
              <p className="text-[11px] text-amber-700 m-0 mt-1 leading-relaxed">
                La plantilla {documento.plantilla.codigo} aún no está disponible. Puedes elaborar el
                documento por tu cuenta y cargarlo aquí.
              </p>
            ))}

          {cargado && (
            <p className="text-[11.5px] text-emerald-900 m-0 mt-1 leading-relaxed break-words">
              {cargado.nombre}
              {cargado.subidoPor ? ` · ${cargado.subidoPor}` : ''}
              {` · ${new Date(cargado.cargadoAt).toLocaleDateString('es-CO')}`}
            </p>
          )}
        </div>

        {cargado?.descargaUrl && (
          <>
            <button
              type="button"
              onClick={() =>
                onVer({
                  nombre: documento.nombre,
                  descargaUrl: cargado.descargaUrl!,
                  detalle: cargado.subidoPor ?? undefined,
                })
              }
              title={`Ver ${cargado.nombre}`}
              className="shrink-0 p-1.5 rounded-md text-emerald-700 hover:bg-emerald-100"
            >
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <a
              href={contratacionService.urlDescarga(cargado.descargaUrl)}
              target="_blank"
              rel="noreferrer"
              title={`Descargar ${cargado.nombre}`}
              className="shrink-0 p-1.5 rounded-md text-emerald-700 hover:bg-emerald-100"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </>
        )}
      </div>

      <input
        ref={input}
        type="file"
        className="hidden"
        accept={MIME_ACEPTADOS}
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          e.target.value = '';
          if (!archivo) return;
          if (gesto.current === 'sustituir') onSustituir(archivo);
          else onCargar(archivo);
        }}
      />

      {/* Sin permiso no se pinta ningún botón: ofrecerle «Cargar» a quien solo
          aprueba sería ofrecerle algo que el servicio va a rechazarle. */}
      {puedeTocar ? (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {cargado ? (
            <button
              type="button"
              disabled={ocupada}
              onClick={() => elegir('sustituir')}
              className={`${boton} border border-amber-300 bg-white text-amber-700 hover:bg-amber-50`}
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              {ocupada ? 'Reemplazando…' : 'Reemplazar archivo'}
            </button>
          ) : (
            <button
              type="button"
              disabled={ocupada}
              onClick={() => elegir('cargar')}
              className={`${boton} bg-[#003DA5] text-white hover:bg-[#002e7d]`}
            >
              <Paperclip className="w-3.5 h-3.5" aria-hidden="true" />
              {ocupada ? 'Cargando…' : 'Cargar documento'}
            </button>
          )}
        </div>
      ) : !cargado ? (
        <p className="text-[11px] text-slate-500 m-0 mt-2">
          {motivo ? `${motivo}.` : sinPermiso ? 'El gestor aún no ha cargado este documento.' : null}
        </p>
      ) : null}
    </div>
  );
}

/** Un adjunto que ninguna fila de la lista pedía. */
function FilaAdicional({
  documento,
  ocupada,
  puedeRetirar,
  onRetirar,
  onVer,
}: {
  documento: DocumentoCargado;
  ocupada: boolean;
  puedeRetirar: boolean;
  onRetirar: () => void;
  onVer: (documento: DocumentoVisible) => void;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2">
      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-semibold text-slate-800 m-0 truncate">{documento.nombre}</p>
        <p className="text-[10.5px] text-slate-500 m-0 tabular-nums">
          {new Date(documento.cargadoAt).toLocaleDateString('es-CO')}
          {documento.subidoPor ? ` · ${documento.subidoPor}` : ''}
        </p>
      </div>

      {documento.descargaUrl && (
        <>
          <button
            type="button"
            onClick={() =>
              onVer({
                nombre: documento.nombre,
                descargaUrl: documento.descargaUrl!,
                detalle: documento.subidoPor ?? undefined,
              })
            }
            title={`Ver ${documento.nombre}`}
            className="shrink-0 p-1 rounded-md text-slate-400 hover:text-[#003DA5] hover:bg-slate-50"
          >
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <a
            href={contratacionService.urlDescarga(documento.descargaUrl)}
            target="_blank"
            rel="noreferrer"
            title={`Descargar ${documento.nombre}`}
            className="shrink-0 p-1 rounded-md text-slate-400 hover:text-[#003DA5] hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        </>
      )}

      {puedeRetirar && (
        <button
          type="button"
          disabled={ocupada}
          onClick={onRetirar}
          title="Retirar del expediente"
          className="shrink-0 p-1 rounded-md text-slate-400 hover:text-amber-700 hover:bg-amber-50 disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
