import React, { useEffect, useRef, useState } from 'react';
import { Check, Download, FileText, Paperclip, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { DocumentoRequerido, EstadoDocumentos, PlantillaFormato } from '../../types';
import { Aviso, Ayuda, Marco, Titulo } from '../shared/PiezasPanel';
import { useFormatosDeLaActividad } from '../shared/FormatosDeLaActividad';
import { fechaLarga } from '../shared/fechas';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

/** La actividad que este panel resuelve. */
const NUMERAL = '5.1';

/**
 * Con qué formato se diligencia cada documento.
 *
 * Se empareja por nombre porque el modelo no guarda el vínculo: son dos
 * catálogos que nacieron por separado —uno dice qué se exige, otro guarda el
 * archivo— y unirlos con una clave es trabajo de RF-DOC-07. El nombre es lo
 * único que hoy comparten: «Aviso de convocatoria» se llama igual en los dos.
 */
const mismoDocumento = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Actividad 5.1 · Elaboración de los documentos del proceso (EFDS-1149).
 *
 * El panel no redacta nada: dice qué documentos exige la modalidad y recibe
 * cada uno. Es una lista de requisitos y no un formulario porque los criterios
 * de la historia se cumplen documento a documento —el aviso y el pliego en las
 * competitivas, el acto de justificación en directa— y cada uno se elabora en
 * su momento, no todos a la vez.
 */
export function PanelDocumentosProceso({ procesoId, onCambio }: Props) {
  const [estado, setEstado] = useState<EstadoDocumentos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Qué requisito está subiendo, para bloquear solo esa fila. */
  const [subiendo, setSubiendo] = useState<string | null>(null);

  const formatos = useFormatosDeLaActividad(NUMERAL, estado?.modalidad);

  /** Los que no corresponden a ningún documento exigido, para no perderlos. */
  const sueltos = formatos.filter(
    (f) => !estado?.documentos.some((d) => mismoDocumento(d.nombre, f.nombre)),
  );

  const leer = () =>
    contratacionService
      .documentosProceso(procesoId)
      .then((datos) => {
        setEstado(datos);
        setError(null);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));

  useEffect(() => {
    setCargando(true);
    leer();
  }, [procesoId]);


  const cargar = async (codigo: string, archivo: File) => {
    setSubiendo(codigo);
    try {
      setEstado(await contratacionService.cargarDocumentoProceso(procesoId, codigo, archivo));
      toast.success('Documento registrado en el expediente');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubiendo(null);
    }
  };

  const anular = async (documentoId: string) => {
    setSubiendo(documentoId);
    try {
      setEstado(await contratacionService.anularDocumentoProceso(procesoId, documentoId));
      toast.success('Documento sustituido; carga el que lo reemplaza');
      onCambio?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubiendo(null);
    }
  };

  if (cargando) {
    return (
      <Marco>
        <p className="text-[11.5px] text-slate-400 m-0">Cargando los documentos del proceso…</p>
      </Marco>
    );
  }

  if (error || !estado) {
    return (
      <Marco>
        <Aviso tono="error" titulo="No se pudo consultar la actividad">
          {error ?? 'Inténtalo de nuevo en un momento.'}
        </Aviso>
      </Marco>
    );
  }

  // La modalidad excluye la actividad por completo: no hay nada que cargar, y
  // mostrar una lista vacía haría pensar que faltan documentos.
  if (!estado.aplica) {
    return (
      <Marco>
        <Titulo>Elaboración de documentos del proceso</Titulo>
        <Aviso tono="aviso" titulo="Esta modalidad no elabora estos documentos">
          {estado.motivoNoAplica ??
            'La matriz de flujo no exige esta actividad para la modalidad del proceso.'}
        </Aviso>
      </Marco>
    );
  }

  return (
    <Marco>
      <Titulo>Elaboración de documentos del proceso</Titulo>
      <Ayuda>
        {estado.modalidadNombre
          ? `Documentos que exige ${estado.modalidadNombre}. `
          : 'Documentos que exige la modalidad del proceso. '}
        Cada uno queda en el expediente con su huella digital, que es lo que permite verificar
        después que no se alteró.
      </Ayuda>

      <div className="space-y-2">
        {estado.documentos.map((doc) => (
          <FilaDocumento
            key={doc.codigo}
            documento={doc}
            formatos={formatos}
            ocupada={subiendo === doc.codigo || subiendo === doc.cargado?.id}
            onCargar={(archivo) => cargar(doc.codigo, archivo)}
            onAnular={() => doc.cargado && anular(doc.cargado.id)}
          />
        ))}
      </div>

      {/* Los que no casaron con ningún documento por nombre. Se ofrecen igual
          —están asignados a esta actividad— pero como pie discreto: la lista de
          arriba es lo que hay que resolver, y darle el mismo peso a lo
          accesorio repartiría la atención. */}
      {sueltos.length > 0 && (
        <div className="border-t border-gray-100 pt-2">
          <p className="text-[11px] font-bold text-slate-500 m-0 mb-1">
            Otros formatos de esta actividad
          </p>
          <ul className="m-0 p-0 list-none space-y-1">
            {sueltos.map((f) => (
              <li key={f.id}>
                <a
                  href={contratacionService.urlDescarga(f.archivoUrl!)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#003DA5] hover:underline"
                >
                  <Download className="w-3 h-3" aria-hidden="true" />
                  {f.codigo} · {f.nombre}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {estado.completa ? (
        <Aviso tono="ok" titulo="Documentos completos">
          Ya está todo lo que la modalidad exige. El proyecto de pliego se publica en la actividad
          5.2.
        </Aviso>
      ) : null}
    </Marco>
  );
}

/**
 * Un requisito con su estado.
 *
 * Cargado y pendiente comparten fila en vez de separarse en dos listas: lo que
 * importa es cuántos requisitos hay y cuáles faltan, y repartirlos obligaría a
 * contar en dos sitios para saberlo.
 */
function FilaDocumento({
  documento,
  formatos,
  ocupada,
  onCargar,
  onAnular,
}: {
  documento: DocumentoRequerido;
  /** Los formatos de la actividad; se ofrece el de este documento si lo hay. */
  formatos: PlantillaFormato[];
  ocupada: boolean;
  onCargar: (archivo: File) => void;
  onAnular: () => void;
}) {
  const inputArchivo = useRef<HTMLInputElement>(null);
  const cargado = documento.cargado;

  // Si no casa con ninguno, el formato no se pierde: sale en «otros formatos».
  const formato = formatos.find((f) => mismoDocumento(f.nombre, documento.nombre));

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
          </p>

          {cargado ? (
            <p className="text-[11.5px] text-emerald-900 m-0 mt-0.5 leading-relaxed break-words">
              {cargado.nombre}
              {cargado.cargadoAt ? ` · ${fechaLarga(cargado.cargadoAt.slice(0, 10))}` : ''}
            </p>
          ) : (
            <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 leading-relaxed">
              {documento.descripcion ?? 'Pendiente de cargar.'}
            </p>
          )}

          {/* El formato acompaña al nombre del documento, no compite con el
              botón: la acción de esta fila es cargar, y dos botones del mismo
              peso obligarían a decidir cuál es antes de hacer nada. */}
          {formato && !cargado && (
            <a
              href={contratacionService.urlDescarga(formato.archivoUrl!)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-bold text-[#003DA5] hover:underline"
            >
              <Download className="w-3 h-3" aria-hidden="true" />
              Descargar el formato {formato.codigo}
            </a>
          )}
        </div>
      </div>

      <input
        ref={inputArchivo}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx"
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          // Se limpia el input: si se vuelve a elegir el mismo archivo tras un
          // error, sin esto el onChange no se dispara y parecería colgado.
          e.target.value = '';
          if (archivo) onCargar(archivo);
        }}
      />

      {/* Una sola acción por fila: cargar lo que falta, o sustituir lo que ya
          está. El formato se descarga desde el enlace de arriba, que apoya sin
          disputarle el sitio. */}
      <div className="mt-2.5">
        {cargado ? (
          <button
            type="button"
            disabled={ocupada}
            onClick={onAnular}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-md border border-amber-300 bg-white text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-all"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Sustituir
          </button>
        ) : (
          <button
            type="button"
            disabled={ocupada}
            onClick={() => inputArchivo.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md bg-[#003DA5] text-white hover:opacity-90 disabled:opacity-50 transition-all"
          >
            <Paperclip className="w-3.5 h-3.5" />
            {ocupada ? 'Cargando…' : 'Cargar documento'}
          </button>
        )}
      </div>
    </div>
  );
}
