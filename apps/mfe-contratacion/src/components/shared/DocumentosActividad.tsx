import React, { useEffect, useState } from 'react';
import { Download, FileText, Paperclip } from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';

interface Props {
  procesoId: string;
  /** Numeral de la actividad; se muestran solo sus documentos. */
  numeral: string;
  /** Cambia cuando la actividad guarda algo, para volver a leer. */
  recargarToken?: number;
}

const ETIQUETA_MIME: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
};

function tamano(bytes?: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Los documentos que esta actividad dejó en el expediente.
 *
 * Cada documento guarda a qué numeral pertenece desde que el módulo existe,
 * pero hasta ahora solo se veían todos juntos en el expediente del proceso: en
 * la actividad donde se cargaron no aparecía ninguno, y para comprobar qué se
 * adjuntó en el paso 8.4 había que salir a buscarlo entre los del proceso
 * entero.
 *
 * Se lee del expediente y se filtra aquí en vez de pedir un endpoint nuevo: el
 * dato ya viaja completo y con el numeral incluido.
 */
export function DocumentosActividad({ procesoId, numeral, recargarToken }: Props) {
  const [documentos, setDocumentos] = useState<any[] | null>(null);

  useEffect(() => {
    let vigente = true;

    contratacionService
      .obtenerExpediente(procesoId)
      .then((exp) => {
        if (!vigente) return;
        setDocumentos(exp.documentos.filter((d: any) => d.numeral === numeral));
      })
      // Silencioso a propósito: es un panel de apoyo, y un fallo al listarlos
      // no debe tapar la actividad que el gestor está trabajando.
      .catch(() => vigente && setDocumentos([]));

    return () => {
      vigente = false;
    };
  }, [procesoId, numeral, recargarToken]);

  // Mientras carga y cuando no hay nada se calla: un bloque vacío diciendo
  // «sin documentos» en cada actividad sería ruido en todas las que aún no han
  // adjuntado nada.
  if (!documentos?.length) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <Paperclip className="w-3.5 h-3.5 text-slate-400" />
        <p className="text-[12.5px] font-bold text-slate-800 m-0">
          {documentos.length === 1
            ? 'Documento de esta actividad'
            : `Documentos de esta actividad · ${documentos.length}`}
        </p>
      </div>

      <ul className="m-0 p-0 list-none space-y-1.5">
        {documentos.map((doc) => (
          <li key={doc.id} className="flex items-start gap-2.5">
            <span className="w-7 h-7 rounded-md flex items-center justify-center text-[8.5px] font-black text-white shrink-0 bg-slate-500">
              {ETIQUETA_MIME[doc.mimeType ?? ''] ?? <FileText className="w-3.5 h-3.5" />}
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] font-semibold text-slate-800 m-0 truncate">
                {doc.nombre}
              </p>
              <p className="text-[10.5px] text-slate-500 m-0 tabular-nums">
                {new Date(doc.createdAt).toLocaleDateString('es-CO')}
                {doc.subidoPor ? ` · ${doc.subidoPor}` : ''}
                {doc.tamano ? ` · ${tamano(doc.tamano)}` : ''}
              </p>
            </div>

            {doc.descargaUrl ? (
              <a
                href={contratacionService.urlDescarga(doc.descargaUrl)}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 p-1 rounded-md text-slate-400 hover:text-[#003DA5] hover:bg-slate-50"
                title={`Descargar ${doc.nombre}`}
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
