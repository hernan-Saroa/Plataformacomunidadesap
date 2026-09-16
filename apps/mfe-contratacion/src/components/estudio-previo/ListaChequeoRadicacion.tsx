import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, FileText, Paperclip, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { DocumentoDeLaLista, EstadoListaChequeo } from '../../types';
import { fechaLarga } from '../shared/fechas';

interface Props {
  procesoId: string;
  /** El estudio previo está en revisión o aprobado: el paquete no se toca. */
  bloqueado: boolean;
  /** Cuántos obligatorios faltan, para que la pestaña lo pueda avisar. */
  onResumen?: (faltan: number) => void;
  onCambio?: () => void;
}

const MIME_ACEPTADOS = '.pdf,.doc,.docx,.xls,.xlsx';

/**
 * La lista de chequeo con la que el área radica en la Dirección de
 * Contratación.
 *
 * El procedimiento dice que se remiten «los documentos previstos en la lista
 * de chequeo que resulten aplicables, según la modalidad de contratación», y
 * hasta la 074 solo se pedía el estudio previo: el resto del paquete viajaba
 * por correo y la Dirección recibía el proceso sin lo que tenía que verificar.
 *
 * Va en su propia pestaña y no debajo del documento porque son dos cosas
 * distintas: allí está el entregable de la actividad —el estudio previo
 * firmado—, aquí lo que lo acompaña para poder radicarlo.
 */
export function ListaChequeoRadicacion({ procesoId, bloqueado, onResumen, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoListaChequeo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Qué fila está ocupada, para no bloquear la lista entera. */
  const [ocupado, setOcupado] = useState<string | null>(null);

  const aplicar = (datos: EstadoListaChequeo) => {
    setEstado(datos);
    setError(null);
    onResumen?.(datos.faltantes.length);
  };

  const leer = () =>
    contratacionService
      .listaChequeo(procesoId)
      .then(aplicar)
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));

  useEffect(() => {
    setCargando(true);
    leer();
  }, [procesoId]);

  const cargar = async (codigo: string, archivo: File) => {
    setOcupado(codigo);
    try {
      aplicar(await contratacionService.cargarDocumentoDeLaLista(procesoId, codigo, archivo));
      toast.success('Documento remitido con la radicación');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setOcupado(null);
    }
  };

  const sustituir = async (documentoId: string) => {
    setOcupado(documentoId);
    try {
      aplicar(await contratacionService.anularDocumentoDeLaLista(procesoId, documentoId));
      toast.success('Documento retirado; carga el que lo reemplaza');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setOcupado(null);
    }
  };

  if (cargando) {
    return <p className="text-[11.5px] text-slate-400 m-0 py-3">Cargando la lista de chequeo…</p>;
  }

  if (error || !estado) {
    return (
      <p className="text-[11.5px] text-red-600 m-0 py-3">
        {error ?? 'No se pudo consultar la lista de chequeo.'}
      </p>
    );
  }

  // Sin filas no hay nada que remitir, y así lo entiende el envío: la lista es
  // un parámetro, y la Dirección puede desactivarla entera desde configuración.
  if (estado.documentos.length === 0) {
    return (
      <p className="text-[11.5px] text-slate-500 m-0 py-3">
        La modalidad de este proceso no tiene documentos parametrizados en la lista de chequeo.
      </p>
    );
  }

  /** Alguna fila sale de la lectura del procedimiento y no del formato oficial. */
  const haySupuestos = estado.documentos.some((d) => !d.confirmado);

  return (
    <section aria-label="Lista de chequeo de la radicación" className="space-y-3">
      <div>
        <h4 className="text-[11.5px] font-black uppercase tracking-wide text-[#003DA5] m-0 mb-1 leading-relaxed">
          Documentos que se remiten al radicar
        </h4>
        <p className="text-[11.5px] text-slate-600 m-0 leading-relaxed">
          {estado.modalidadNombre
            ? `Lo que exige ${estado.modalidadNombre} además del estudio previo. `
            : 'Lo que exige la modalidad además del estudio previo. '}
          Sin los obligatorios el proceso no se puede enviar a la Dirección de Contratación.
        </p>
      </div>

      <div className="space-y-2">
        {estado.documentos.map((doc) => (
          <Fila
            key={doc.codigo}
            documento={doc}
            bloqueado={bloqueado}
            ocupada={ocupado === doc.codigo || ocupado === doc.cargado?.id}
            onCargar={(archivo) => cargar(doc.codigo, archivo)}
            onSustituir={() => doc.cargado && sustituir(doc.cargado.id)}
          />
        ))}
      </div>

      {/* Se dice, no se esconde: a quien se le exige un documento le
          corresponde saber si se lo exige el formato de la ESAP o la lectura
          que el equipo hizo del procedimiento. Desaparece solo cuando la
          Dirección confirme las filas, sin tocar código. */}
      {haySupuestos && (
        <p className="text-[10.5px] text-amber-700 m-0 flex items-start gap-1.5 leading-relaxed">
          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-px" aria-hidden="true" />
          Las filas marcadas con ◦ salen del texto del procedimiento y están pendientes de
          contrastarse con el formato de lista de chequeo de la Dirección de Contratación.
        </p>
      )}
    </section>
  );
}

/**
 * Un documento de la lista con su estado.
 *
 * Cargado y pendiente comparten fila, como en la 5.1: lo que importa es
 * cuántos hay y cuáles faltan, y repartirlos en dos listas obligaría a contar
 * en dos sitios para saberlo.
 */
function Fila({
  documento,
  bloqueado,
  ocupada,
  onCargar,
  onSustituir,
}: {
  documento: DocumentoDeLaLista;
  bloqueado: boolean;
  ocupada: boolean;
  onCargar: (archivo: File) => void;
  onSustituir: () => void;
}) {
  const inputArchivo = useRef<HTMLInputElement>(null);
  const cargado = documento.cargado;

  return (
    <div
      className={`rounded-lg border px-3.5 py-3 ${
        cargado ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {cargado ? (
          <Check className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" strokeWidth={3} />
        ) : (
          <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
        )}

        <div className="min-w-0 flex-1">
          <p
            className={`text-[12.5px] font-bold m-0 ${
              cargado ? 'text-emerald-900' : 'text-slate-800'
            }`}
          >
            {documento.nombre}
            {!documento.confirmado && (
              <span
                className="text-slate-400 ml-1"
                title="Requisito tomado del procedimiento, pendiente de confirmar con la Dirección"
              >
                ◦
              </span>
            )}
            {/* Lo no obligatorio se marca, y no al revés: en una lista de
                chequeo lo normal es que todo sea exigible, así que la etiqueta
                tiene que llevarla la excepción. */}
            {!documento.obligatorio && (
              <span className="text-[10px] font-bold text-slate-500 ml-1.5">(si aplica)</span>
            )}
          </p>

          {cargado ? (
            <p className="text-[11.5px] text-emerald-900 m-0 mt-0.5 leading-relaxed break-words">
              {cargado.nombre}
              {cargado.cargadoAt ? ` · ${fechaLarga(cargado.cargadoAt.slice(0, 10))}` : ''}
            </p>
          ) : (
            <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed">
              {documento.descripcion ?? 'Pendiente de remitir.'}
            </p>
          )}
        </div>
      </div>

      <input
        ref={inputArchivo}
        type="file"
        className="hidden"
        accept={MIME_ACEPTADOS}
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          // Se limpia el input: sin esto, volver a elegir el mismo archivo tras
          // un error no dispara el onChange y la pantalla parecería colgada.
          e.target.value = '';
          if (archivo) onCargar(archivo);
        }}
      />

      <div className="mt-2.5">
        {bloqueado ? (
          <p className="text-[11px] text-slate-500 m-0">
            {cargado
              ? 'Remitido con la radicación.'
              : 'El estudio previo no admite cambios: este documento ya no se puede remitir aquí.'}
          </p>
        ) : cargado ? (
          <button
            type="button"
            disabled={ocupada}
            onClick={onSustituir}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-md
              border border-amber-300 bg-white text-amber-700 hover:bg-amber-50
              disabled:opacity-50 transition-all"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Sustituir
          </button>
        ) : (
          <button
            type="button"
            disabled={ocupada}
            onClick={() => inputArchivo.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md
              bg-[#003DA5] text-white hover:opacity-90 disabled:opacity-50 transition-all"
          >
            <Paperclip className="w-3.5 h-3.5" />
            {ocupada ? 'Cargando…' : 'Cargar documento'}
          </button>
        )}
      </div>
    </div>
  );
}
