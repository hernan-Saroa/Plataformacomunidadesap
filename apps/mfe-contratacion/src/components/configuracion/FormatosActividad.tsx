import React, { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { Modalidad, PlantillaFormato } from '../../types';

interface Props {
  numeral: string;
  /** La modalidad que se está configurando: no todos los formatos alcanzan a todas. */
  modalidad: string;
  modalidades: Modalidad[];
}

/**
 * Los formatos que el gestor descarga en esta actividad.
 *
 * Solo se listan: subirlos y asignarlos se hace en la biblioteca, porque un
 * mismo formato sirve en varias actividades y cargarlo en cada una
 * multiplicaría copias del mismo archivo, que se desincronizarían en cuanto el
 * SIG publique una versión nueva.
 */
export function FormatosActividad({ numeral, modalidad, modalidades }: Props) {
  const [formatos, setFormatos] = useState<PlantillaFormato[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    contratacionService
      .plantillas(numeral)
      .then(setFormatos)
      .catch(() => setFormatos([]))
      .finally(() => setCargando(false));
  }, [numeral]);

  if (cargando) {
    return (
      <div className="space-y-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  // Retirados fuera, y solo los que alcanzan a esta modalidad: sin filtrar,
  // configurando Mínima Cuantía se verían formatos que solo existen para
  // Licitación. Lista vacía de modalidades significa que vale para todas.
  const vigentes = formatos.filter(
    (f) =>
      f.activo && (f.modalidades.length === 0 || f.modalidades.includes(modalidad)),
  );

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-gray-800 m-0">
          Formatos que el gestor descarga aquí
        </p>
        <p className="text-[11px] text-gray-500 mt-0.5 mb-0 leading-relaxed">
          Se suben y se asignan en <strong className="font-semibold">Plantillas</strong>, en el
          menú de la izquierda.
        </p>
      </div>

      {vigentes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center">
          <FileText className="w-5 h-5 text-gray-400 mx-auto" />
          <p className="text-sm text-gray-600 m-0 mt-1.5">
            {formatos.some((f) => f.activo)
              ? 'Ningún formato de esta actividad aplica a esta modalidad'
              : 'Esta actividad no ofrece ningún formato'}
          </p>
          <p className="text-[11px] text-gray-500 mt-1 mb-0">
            Si el gestor debe diligenciar un formato del SIG, asígnalo desde la biblioteca.
          </p>
        </div>
      ) : (
        <ul className="m-0 p-0 list-none space-y-1.5">
          {vigentes.map((f) => (
            <Fila key={f.id} formato={f} modalidades={modalidades} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Un formato asignado, con su descarga. */
function Fila({
  formato,
  modalidades,
}: {
  formato: PlantillaFormato;
  modalidades: Modalidad[];
}) {
  // Vacío significa todas: es lo habitual, y listar once nombres para decirlo
  // ocuparía más que el propio formato.
  const alcance =
    formato.modalidades.length === 0
      ? 'Todas las modalidades'
      : formato.modalidades
          .map((c) => modalidades.find((m) => m.codigo === c)?.nombre ?? c)
          .join(' · ');

  return (
    <li className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
      <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-md bg-[#E0EDFF] text-[#003DA5]">
        <FileText className="w-4 h-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-900 m-0 leading-snug truncate">{formato.nombre}</p>
        <p className="text-[11px] text-gray-500 m-0 leading-snug truncate">
          {formato.codigo} · versión {formato.version} · {alcance}
        </p>
      </div>

      {/* Sin archivo el formato está declarado pero no se puede descargar: se
          dice, porque un botón que no baja nada se lee como un fallo. */}
      {formato.archivoUrl ? (
        <a
          href={contratacionService.urlDescarga(formato.archivoUrl)}
          target="_blank"
          rel="noreferrer"
          title="Descargar el formato"
          className="flex-shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#003DA5]"
        >
          <Download className="w-3.5 h-3.5" />
        </a>
      ) : (
        <span
          title="El formato está registrado pero nadie subió el archivo"
          className="flex-shrink-0 text-[10px] font-semibold text-amber-700"
        >
          sin archivo
        </span>
      )}
    </li>
  );
}
