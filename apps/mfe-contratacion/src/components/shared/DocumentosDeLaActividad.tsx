import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Download, Eye, FileText, Paperclip, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import {
  DocumentoCargado,
  DocumentoRequeridoPorFormato,
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
   * Cuántos formatos requeridos siguen sin cargar, para quien monte el bloque.
   *
   * Lo necesita la decisión de aprobación, que vive fuera de este componente:
   * sin el dato, el botón de aprobar quedaba activo aunque el encabezado de
   * aquí dijera «Falta 1 de 1».
   */
  onFaltantes?: (faltan: number) => void;
  /**
   * Solo lo que quedó en el expediente, sin las filas de formatos.
   *
   * Para las actividades cuyo panel ya reparte sus formatos documento por
   * documento —el estudio previo y la elaboración de documentos—: listarlos
   * otra vez aquí sería pedir dos veces lo mismo.
   */
  soloExpediente?: boolean;
}

const MIME_ACEPTADOS = '.pdf,.doc,.docx,.xls,.xlsx';

const boton =
  'inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed';

/**
 * Los documentos que la actividad entrega, uno por fila (EFDS-1183).
 *
 * Cada formato asignado es una fila con todo lo necesario para resolverla:
 * descargar el formato en blanco, cargar el diligenciado y, cuando ya está,
 * retirarlo. Las filas salen de la biblioteca, así que sirve para cualquiera
 * de las sesenta y tres sin escribir nada por actividad.
 *
 * Lo que se sube sin corresponder a ningún formato va abajo como adicional:
 * hay anexos que ninguna plantilla previó.
 */
export function DocumentosDeLaActividad({
  procesoId,
  numeral,
  recargarToken,
  onCambio,
  onFaltantes,
  soloExpediente = false,
}: Props) {
  const [estado, setEstado] = useState<EstadoDocumentosActividad | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [viendo, setViendo] = useState<DocumentoVisible | null>(null);
  const inputAdicional = useRef<HTMLInputElement>(null);
  /**
   * La secuencia todavía no llegó a esta actividad (EFDS-1183).
   *
   * Las filas siguen listándose y los formatos en blanco siguen descargándose
   * —para eso se puede entrar a mirarla—, pero cargar queda fuera: es lo único
   * que dejaría en el expediente un documento fuera de orden.
   */
  const soloLectura = useSoloLectura();

  /**
   * Lo que la actividad dejó en el expediente sin pasar por un formato: lo que
   * sube el panel del CDP, la copia del formulario al enviarlo.
   *
   * Antes lo listaba un segundo componente montado justo debajo, con su propio
   * marco y su propio radio de borde. Eran dos listas de archivos seguidas para
   * la misma actividad, y el gestor tenía que deducir cuál era cuál.
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
            ((expediente as any)?.documentos ?? []).filter(
              (d: any) => d.numeral === numeral && d.tipo !== 'ADJUNTO',
            ),
          );
        })
        // Silencioso: es un panel de apoyo, y un fallo al listarlos no debe
        // tapar la actividad que el gestor está trabajando.
        .catch(() => setEstado(null)),
    [procesoId, numeral],
  );

  useEffect(() => {
    leer();
  }, [leer, recargarToken]);

  /**
   * Cuántos formatos faltan, hacia quien monta el bloque.
   *
   * La decisión de aprobación vive fuera —es un acto sobre la actividad, no un
   * documento más— pero necesita el dato para no dejar aprobar sin soporte.
   */
  useEffect(() => {
    if (!onFaltantes) return;
    const requeridos = soloExpediente ? [] : (estado?.requeridos ?? []);
    onFaltantes(requeridos.filter((r) => !r.cargado).length);
  }, [estado, soloExpediente, onFaltantes]);

  const cargar = async (archivo: File, plantillaId: string | undefined, clave: string) => {
    setOcupado(clave);
    try {
      await contratacionService.cargarDocumentoDeActividad(
        procesoId,
        numeral,
        archivo,
        plantillaId,
      );
      toast.success('Documento cargado');
      await leer();
      onCambio?.();
    } catch (e: any) {
      toast.error(e.message ?? 'No se pudo cargar el documento');
    } finally {
      setOcupado(null);
    }
  };

  /**
   * Varios adjuntos de una vez, para los que no responden a ningún formato.
   *
   * Las filas de arriba son de uno en uno porque un formato es un documento: la
   * fila tiene un hueco y ese hueco se llena o se retira. Los adicionales no
   * tienen esa forma —son los anexos que ninguna plantilla previó, y llegan a
   * puñados—, así que aquí el selector admite varios y se suben en serie.
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
          ? `${e.message ?? 'No se pudo cargar el documento'} · se cargaron ${subidos} de ${archivos.length}`
          : (e.message ?? 'No se pudo cargar el documento'),
      );
    } finally {
      setOcupado(null);
      if (subidos > 0) {
        await leer();
        onCambio?.();
      }
    }
  };

  const retirar = async (documentoId: string) => {
    setOcupado(documentoId);
    try {
      await contratacionService.retirarDocumentoDeActividad(procesoId, numeral, documentoId);
      toast.success('Documento retirado');
      await leer();
      onCambio?.();
    } catch (e: any) {
      toast.error(e.message ?? 'No se pudo retirar el documento');
    } finally {
      setOcupado(null);
    }
  };

  // Sin documentos no se pinta el marco, pero la decisión sí sigue: puede
  // existir aunque la actividad no exija ningún formato.
  //
  // Se comprueba si el pie devuelve algo antes de montar el marco, en vez de
  // dejárselo a `empty:hidden`: esa pseudoclase solo aplica cuando el elemento
  // no tiene ningún hijo, y React deja dentro un nodo de comentario. El marco
  // se dibujaba igual, vacío, en toda actividad sin documentos.
  const sinNada = soloExpediente
    ? delExpediente.length === 0
    : !estado ||
      (estado.requeridos.length === 0 &&
        estado.adicionales.length === 0 &&
        delExpediente.length === 0);

  // Sin documentos el bloque no se pinta. La decisión ya no depende de esto:
  // vive fuera, en su propia franja, y se monta aunque no haya nada que
  // adjuntar.
  if (!estado || sinNada) return null;

  // En modo solo-expediente el panel ya reparte sus formatos: aquí no se
  // cuentan, y por tanto tampoco bloquean la aprobación.
  const requeridos = soloExpediente ? [] : estado.requeridos;
  const faltan = requeridos.filter((r) => !r.cargado).length;

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
          <p className="text-[12.5px] font-bold text-slate-800 m-0 truncate">
            Documentos de esta actividad
          </p>
        </div>

        {requeridos.length > 0 && (
          <span
            className={`text-[10.5px] font-bold rounded-md px-1.5 py-0.5 shrink-0 ${
              faltan === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {faltan === 0
              ? 'Completos'
              : `Falta ${faltan} de ${requeridos.length}`}
          </span>
        )}
      </div>

      {requeridos.map((doc) => (
        <FilaRequerido
          key={doc.plantillaId}
          documento={doc}
          ocupada={ocupado === doc.plantillaId || ocupado === doc.cargado?.id}
          puedeCargar={estado.puedeCargar && !soloLectura}
          motivoBloqueo={soloLectura}
          onCargar={(archivo) => cargar(archivo, doc.plantillaId, doc.plantillaId)}
          onRetirar={() => doc.cargado && retirar(doc.cargado.id)}
          onVer={setViendo}
        />
      ))}

      {((!soloExpediente && estado.adicionales.length > 0) || delExpediente.length > 0) && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[11px] font-bold text-slate-500 m-0">
            Otros documentos adjuntos
          </p>
          {(soloExpediente ? [] : estado.adicionales).map((doc) => (
            <FilaAdicional
              key={doc.id}
              documento={doc}
              ocupada={ocupado === doc.id}
              puedeRetirar={estado.puedeCargar && !soloLectura}
              onRetirar={() => retirar(doc.id)}
              onVer={setViendo}
            />
          ))}

          {/* Lo que llegó al expediente por otra vía. No se puede retirar desde
              aquí: lo generó el propio proceso, no un adjunto del gestor. */}
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

      {/* Adjuntar algo que ningún formato pedía, en segundo plano: la lista de
          arriba es lo que hay que resolver. */}
      {estado.puedeCargar && !soloExpediente && !soloLectura && (
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

      <VisorDocumento documento={viendo} onClose={() => setViendo(null)} />
    </div>
  );
}

/** Un documento que la actividad exige, con su formato y su carga. */
function FilaRequerido({
  documento,
  ocupada,
  puedeCargar,
  motivoBloqueo,
  onCargar,
  onRetirar,
  onVer,
}: {
  documento: DocumentoRequeridoPorFormato;
  ocupada: boolean;
  /** Quien solo aprueba ve la fila, pero no los botones que le rechazarían. */
  puedeCargar: boolean;
  /**
   * Qué falta antes de poder cargar aquí, cuando lo que falta es la secuencia.
   *
   * Sin esto la fila bloqueada decía «Pendiente de que el gestor lo cargue» al
   * propio gestor, que es justo quien no puede todavía: el motivo real no es de
   * quién es el turno, sino que la actividad anterior no está cerrada.
   */
  motivoBloqueo?: string | null;
  onCargar: (archivo: File) => void;
  onRetirar: () => void;
  onVer: (documento: DocumentoVisible) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const cargado = documento.cargado;

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
          <p
            className={`text-[12.5px] font-bold m-0 leading-snug ${
              cargado ? 'text-emerald-900' : 'text-slate-800'
            }`}
          >
            {documento.nombre}
          </p>
          <p className="text-[10.5px] text-slate-500 m-0 mt-0.5">
            {documento.codigo} · versión {documento.version}
          </p>

          {cargado ? (
            <p className="text-[11.5px] text-emerald-900 m-0 mt-1 leading-relaxed break-words">
              {cargado.nombre}
              {cargado.subidoPor ? ` · ${cargado.subidoPor}` : ''}
            </p>
          ) : documento.formatoUrl ? (
            /* El formato acompaña al nombre y no compite con el botón: la
               acción de esta fila es cargar, y dos botones del mismo peso
               obligarían a decidir cuál es antes de hacer nada. */
            <a
              href={contratacionService.urlDescarga(documento.formatoUrl)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-bold text-[#003DA5] hover:underline"
            >
              <Download className="w-3 h-3" aria-hidden="true" />
              Descargar el formato en blanco
            </a>
          ) : (
            /* Se dice, y no se bloquea: el gestor no puede subir el formato
               oficial —eso lo hace Contratación desde la biblioteca—, así que
               impedirle avanzar lo dejaría esperando algo ajeno. */
            <p className="text-[11px] text-amber-700 m-0 mt-1 leading-relaxed">
              Contratación aún no ha subido este formato a la biblioteca.
              Diligéncialo por fuera y cárgalo aquí.
            </p>
          )}
        </div>

        {cargado?.descargaUrl && (
          <a
            href={contratacionService.urlDescarga(cargado.descargaUrl)}
            target="_blank"
            rel="noreferrer"
            title={`Descargar ${cargado.nombre}`}
            className="shrink-0 p-1.5 rounded-md text-emerald-700 hover:bg-emerald-100"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
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
          if (archivo) onCargar(archivo);
        }}
      />

      {/* Sin permiso no se pinta ningún botón: ofrecerle «Cargar» a quien solo
          aprueba sería ofrecerle algo que el servicio va a rechazarle, y no
          entendería por qué al pulsarlo no pasa nada. */}
      {puedeCargar ? (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {cargado ? (
            <button
              type="button"
              disabled={ocupada}
              onClick={onRetirar}
              className={`${boton} border border-amber-300 bg-white text-amber-700 hover:bg-amber-50`}
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              {ocupada ? 'Retirando…' : 'Retirar y cargar otro'}
            </button>
          ) : (
            <button
              type="button"
              disabled={ocupada}
              onClick={() => input.current?.click()}
              className={`${boton} bg-[#003DA5] text-white hover:bg-[#002e7d]`}
            >
              <Paperclip className="w-3.5 h-3.5" aria-hidden="true" />
              {ocupada ? 'Cargando…' : 'Cargar documento'}
            </button>
          )}
        </div>
      ) : !cargado ? (
        <p className="text-[11px] text-slate-500 m-0 mt-2">
          {motivoBloqueo ? `${motivoBloqueo}.` : 'Pendiente de que el gestor lo cargue.'}
        </p>
      ) : null}
    </div>
  );
}

/** Un adjunto que ningún formato pedía. */
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
        <p className="text-[11.5px] font-semibold text-slate-800 m-0 truncate">
          {documento.nombre}
        </p>
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
