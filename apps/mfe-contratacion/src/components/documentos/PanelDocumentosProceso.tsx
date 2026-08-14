import React, { useEffect, useRef, useState } from 'react';
import { Check, Download, FileText, Info, Paperclip, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { DocumentoRequerido, EstadoDocumentos, PlantillaFormato } from '../../types';
import { Aviso, Ayuda, Marco, Titulo } from '../shared/PiezasPanel';
import { fechaLarga } from '../shared/fechas';

interface Props {
  procesoId: string;
  onCambio?: () => void;
}

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
  /** Formatos del SIG asignados a la 5.1 para esta modalidad, si los hay. */
  const [formatos, setFormatos] = useState<PlantillaFormato[]>([]);

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

  // Los formatos vienen de la biblioteca (EFDS-1419): si Configuración asignó
  // alguno a la 5.1, el gestor lo descarga aquí mismo en vez de pedirlo al SIG
  // por correo. Que no haya no es un error — la biblioteca puede estar vacía.
  useEffect(() => {
    if (!estado?.aplica) return;
    contratacionService
      .plantillasDeActividad('5.1', estado.modalidad ?? undefined)
      .then((lista) => setFormatos(lista.filter((f) => f.archivoUrl)))
      .catch(() => setFormatos([]));
  }, [procesoId, estado?.aplica, estado?.modalidad]);

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

      {/* Con formatos en la biblioteca se ofrecen aquí; sin ellos se dice que
          hoy no se generan — sin esa línea, un usuario que espera el documento
          hecho creería que la plataforma falló. */}
      {formatos.length > 0 ? (
        <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3 space-y-2">
          <p className="text-[11.5px] text-slate-600 m-0 leading-relaxed">
            Descarga el formato oficial, diligéncialo y carga aquí el documento firmado.
          </p>
          <ul className="m-0 p-0 list-none space-y-1">
            {formatos.map((f) => (
              <li key={f.id}>
                <a
                  href={contratacionService.urlDescarga(f.archivoUrl!)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-[#003DA5] hover:underline"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  {f.codigo} · {f.nombre}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="text-[11.5px] text-slate-600 m-0 leading-relaxed">
            Los documentos se redactan por fuera y se cargan aquí. Cuando Contratación suba los
            formatos oficiales a la biblioteca de plantillas, podrás descargarlos desde este panel.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {estado.documentos.map((doc) => (
          <FilaDocumento
            key={doc.codigo}
            documento={doc}
            ocupada={subiendo === doc.codigo || subiendo === doc.cargado?.id}
            onCargar={(archivo) => cargar(doc.codigo, archivo)}
            onAnular={() => doc.cargado && anular(doc.cargado.id)}
          />
        ))}
      </div>

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
  ocupada,
  onCargar,
  onAnular,
}: {
  documento: DocumentoRequerido;
  ocupada: boolean;
  onCargar: (archivo: File) => void;
  onAnular: () => void;
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

      <div className="mt-2.5 flex items-center gap-2">
        {cargado ? (
          <button
            type="button"
            disabled={ocupada}
            onClick={onAnular}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold rounded-md border border-amber-300 bg-white text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-all"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Sustituir
          </button>
        ) : (
          <button
            type="button"
            disabled={ocupada}
            onClick={() => inputArchivo.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md bg-white text-slate-700 border border-slate-300 hover:border-[#003DA5] hover:text-[#003DA5] disabled:opacity-50 transition-all"
          >
            <Paperclip className="w-3.5 h-3.5" />
            {ocupada ? 'Cargando…' : 'Cargar documento'}
          </button>
        )}
      </div>
    </div>
  );
}
