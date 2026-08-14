import React, { useEffect, useState } from 'react';
import { Download, Info } from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { PlantillaFormato } from '../../types';

/**
 * Los formatos del SIG que Configuración asignó a una actividad, ya filtrados
 * por la modalidad del proceso y sin los que no tienen archivo: ofrecer un
 * enlace que no descarga nada se lee como un fallo.
 *
 * Es un hook y no solo una pieza de pantalla porque quien los muestra decide
 * dónde: al lado del documento que hay que cargar, si se sabe cuál le
 * corresponde, o en bloque cuando la actividad entrega un único documento.
 */
export function useFormatosDeLaActividad(numeral: string, modalidad?: string | null) {
  const [formatos, setFormatos] = useState<PlantillaFormato[]>([]);

  useEffect(() => {
    contratacionService
      .plantillasDeActividad(numeral, modalidad ?? undefined)
      .then((lista) => setFormatos(lista.filter((f) => f.archivoUrl)))
      .catch(() => setFormatos([]));
  }, [numeral, modalidad]);

  return formatos;
}

/** El enlace de descarga de un formato, con su código del SIG. */
export function EnlaceFormato({ formato }: { formato: PlantillaFormato }) {
  return (
    <a
      href={contratacionService.urlDescarga(formato.archivoUrl!)}
      target="_blank"
      rel="noreferrer"
      title={`Descargar ${formato.codigo} · ${formato.nombre}`}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-md border border-slate-300 bg-white text-slate-700 hover:border-[#003DA5] hover:text-[#003DA5] transition-all"
    >
      <Download className="w-3.5 h-3.5" aria-hidden="true" />
      Descargar formato
    </a>
  );
}

interface Props {
  numeral: string;
  modalidad?: string | null;
  instruccion?: string;
  sinFormatos?: string;
}

/**
 * Los formatos de la actividad en bloque, para cuando no hay una lista de
 * documentos a la que repartirlos —el estudio previo entrega uno solo, pero
 * tiene cuatro formatos según el tipo de contratación.
 */
export function FormatosDeLaActividad({
  numeral,
  modalidad,
  instruccion = 'Descarga el formato oficial, diligéncialo y carga aquí el documento firmado.',
  sinFormatos = 'Los documentos se redactan por fuera y se cargan aquí. Cuando Contratación suba los formatos oficiales a la biblioteca de plantillas, podrás descargarlos desde este panel.',
}: Props) {
  const formatos = useFormatosDeLaActividad(numeral, modalidad);

  if (formatos.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
        <p className="text-[11px] text-slate-600 m-0 leading-relaxed">{sinFormatos}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3 space-y-2">
      <p className="text-[11px] text-slate-600 m-0 leading-relaxed">{instruccion}</p>
      <ul className="m-0 p-0 list-none space-y-1.5">
        {formatos.map((f) => (
          <li key={f.id} className="flex items-center gap-2">
            <EnlaceFormato formato={f} />
            <span className="text-[11px] text-slate-500 min-w-0 truncate">
              {f.codigo} · {f.nombre}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
