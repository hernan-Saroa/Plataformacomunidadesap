import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Download, FileText, Paperclip, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import {
  DocumentoCargado,
  DocumentoRequeridoPorFormato,
  EstadoDocumentosActividad,
} from '../../types';

interface Props {
  procesoId: string;
  numeral: string;
  /** Cambia cuando la actividad guarda algo, para volver a leer. */
  recargarToken?: number;
  onCambio?: () => void;
  /**
   * Los botones de aprobar o devolver, si la actividad los pide.
   *
   * Van dentro de este bloque y no encima del panel porque quien decide tiene
   * que ver primero lo que le cargaron: con la decisión arriba aprobaría sin
   * haber mirado el documento.
   *
   * Es una función y no un nodo porque necesita saber cuántos formatos faltan:
   * sin ese dato el botón de aprobar quedaba activo debajo del aviso «Falta 1
   * de 1», que es justo la contradicción que hay que evitar.
   */
  pie?: (faltan: number) => React.ReactNode;
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
  pie,
}: Props) {
  const [estado, setEstado] = useState<EstadoDocumentosActividad | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const inputAdicional = useRef<HTMLInputElement>(null);

  const leer = useCallback(
    () =>
      contratacionService
        .documentosDeActividad(procesoId, numeral)
        .then(setEstado)
        // Silencioso: es un panel de apoyo, y un fallo al listarlos no debe
        // tapar la actividad que el gestor está trabajando.
        .catch(() => setEstado(null)),
    [procesoId, numeral],
  );

  useEffect(() => {
    leer();
  }, [leer, recargarToken]);

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
  if (!estado || (estado.requeridos.length === 0 && estado.adicionales.length === 0)) {
    const soloDecision = pie?.(0);
    return soloDecision ? (
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5">{soloDecision}</div>
    ) : null;
  }

  const faltan = estado.requeridos.filter((r) => !r.cargado).length;
  const decision = pie?.(faltan);

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
          <p className="text-[12.5px] font-bold text-slate-800 m-0 truncate">
            Documentos de esta actividad
          </p>
        </div>

        {estado.requeridos.length > 0 && (
          <span
            className={`text-[10.5px] font-bold rounded-md px-1.5 py-0.5 shrink-0 ${
              faltan === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {faltan === 0
              ? 'Completos'
              : `Falta ${faltan} de ${estado.requeridos.length}`}
          </span>
        )}
      </div>

      {estado.requeridos.map((doc) => (
        <FilaRequerido
          key={doc.plantillaId}
          documento={doc}
          ocupada={ocupado === doc.plantillaId || ocupado === doc.cargado?.id}
          puedeCargar={estado.puedeCargar}
          onCargar={(archivo) => cargar(archivo, doc.plantillaId, doc.plantillaId)}
          onRetirar={() => doc.cargado && retirar(doc.cargado.id)}
        />
      ))}

      {estado.adicionales.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[11px] font-bold text-slate-500 m-0">
            Otros documentos adjuntos
          </p>
          {estado.adicionales.map((doc) => (
            <FilaAdicional
              key={doc.id}
              documento={doc}
              ocupada={ocupado === doc.id}
              puedeRetirar={estado.puedeCargar}
              onRetirar={() => retirar(doc.id)}
            />
          ))}
        </div>
      )}

      {/* Adjuntar algo que ningún formato pedía, en segundo plano: la lista de
          arriba es lo que hay que resolver. */}
      {estado.puedeCargar && (
        <div className="pt-0.5">
          <input
            ref={inputAdicional}
            type="file"
            className="hidden"
            accept={MIME_ACEPTADOS}
            onChange={(e) => {
              const archivo = e.target.files?.[0];
              // Se limpia: si tras un error se elige el mismo archivo, sin esto
              // el onChange no se dispara y la pantalla parecería colgada.
              e.target.value = '';
              if (archivo) cargar(archivo, undefined, 'adicional');
            }}
          />
          <button
            type="button"
            disabled={ocupado === 'adicional'}
            onClick={() => inputAdicional.current?.click()}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-[#003DA5] transition-colors disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            {ocupado === 'adicional' ? 'Cargando…' : 'Adjuntar otro documento'}
          </button>
        </div>
      )}

      {/* La decisión, al final de todo lo que hay que revisar. */}
      {decision ? <div className="border-t border-gray-100 pt-3">{decision}</div> : null}
    </div>
  );
}

/** Un documento que la actividad exige, con su formato y su carga. */
function FilaRequerido({
  documento,
  ocupada,
  puedeCargar,
  onCargar,
  onRetirar,
}: {
  documento: DocumentoRequeridoPorFormato;
  ocupada: boolean;
  /** Quien solo aprueba ve la fila, pero no los botones que le rechazarían. */
  puedeCargar: boolean;
  onCargar: (archivo: File) => void;
  onRetirar: () => void;
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
          Pendiente de que el gestor lo cargue.
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
}: {
  documento: DocumentoCargado;
  ocupada: boolean;
  puedeRetirar: boolean;
  onRetirar: () => void;
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
        <a
          href={contratacionService.urlDescarga(documento.descargaUrl)}
          target="_blank"
          rel="noreferrer"
          title={`Descargar ${documento.nombre}`}
          className="shrink-0 p-1 rounded-md text-slate-400 hover:text-[#003DA5] hover:bg-slate-50"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
        </a>
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
