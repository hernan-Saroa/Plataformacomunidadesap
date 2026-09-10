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

/**
 * Los formatos asignados a la actividad, con archivo o sin él.
 *
 * Separado del anterior porque son dos preguntas distintas: `useFormatos…`
 * responde «qué puede descargar el gestor» y esto responde «qué documentos se
 * entregan aquí», que es lo que dice la asignación aunque nadie haya subido
 * todavía el archivo del formato.
 */
export function useFormatosAsignados(numeral: string, modalidad?: string | null) {
  const [formatos, setFormatos] = useState<PlantillaFormato[]>([]);
  /** Los de la actividad sin filtrar, para distinguir por qué no hay ninguno. */
  const [hayDeOtrasModalidades, setHayDeOtras] = useState(false);

  useEffect(() => {
    contratacionService
      .plantillasDeActividad(numeral, modalidad ?? undefined)
      .then(setFormatos)
      .catch(() => setFormatos([]));
  }, [numeral, modalidad]);

  useEffect(() => {
    if (!modalidad) return setHayDeOtras(false);

    // Solo cuando el filtro dejó la lista vacía: saber que la actividad sí
    // tiene formatos, pero ninguno para esta modalidad, es lo que separa «no
    // se ha subido nada» de «está mal configurado».
    if (formatos.length > 0) return setHayDeOtras(false);

    contratacionService
      .plantillasDeActividad(numeral)
      .then((todos) => setHayDeOtras(todos.length > 0))
      .catch(() => setHayDeOtras(false));
  }, [numeral, modalidad, formatos.length]);

  return { formatos, hayDeOtrasModalidades };
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
  const { formatos, hayDeOtrasModalidades } = useFormatosAsignados(numeral, modalidad);

  // Que el formato exista y que se pueda descargar son cosas distintas: el
  // asignado sin archivo igual anuncia que aquí se entrega ese documento, y
  // callarlo dejaría al gestor creyendo que la actividad no pide nada.
  const descargables = formatos.filter((f) => f.archivoUrl);
  const sinArchivo = formatos.filter((f) => !f.archivoUrl);

  if (formatos.length === 0) {
    // Cadena vacía: callar. Quien monta esto en todas las actividades no puede
    // permitirse una caja explicando la ausencia en las treinta y ocho; quien
    // lo pone en un panel concreto sí quiere decir por qué no hay formato.
    // Que la actividad tenga formatos pero ninguno alcance a esta modalidad no
    // es lo mismo que no tener ninguno: uno se resuelve subiendo el formato y
    // el otro corrigiendo a qué modalidades aplica. Se dice, aunque quien monta
    // esto haya pedido callar en el caso normal.
    if (hayDeOtrasModalidades) {
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="text-[11px] text-amber-900 m-0 leading-relaxed">
            Esta actividad tiene formatos, pero ninguno aplica a la modalidad de este proceso.
            Revísalo en la biblioteca de plantillas o continúa sin formato.
          </p>
        </div>
      );
    }

    if (sinFormatos === '') return null;

    return (
      <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
        <p className="text-[11px] text-slate-600 m-0 leading-relaxed">{sinFormatos}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-slate-50 px-3.5 py-3 space-y-2">
      {descargables.length > 0 && (
        <>
          <p className="text-[11px] text-slate-600 m-0 leading-relaxed">{instruccion}</p>
          <ul className="m-0 p-0 list-none space-y-1.5">
            {descargables.map((f) => (
              <li key={f.id} className="flex items-center gap-2">
                <EnlaceFormato formato={f} />
                <span className="text-[11px] text-slate-500 min-w-0 truncate">
                  {f.codigo} · {f.nombre}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Se dice, y no se bloquea: el gestor no puede subir el formato oficial
          —eso lo hace Contratación desde la biblioteca—, así que impedirle
          avanzar lo dejaría esperando algo que no depende de él. Lo que sí
          necesita saber es que en esta actividad se entrega ese documento. */}
      {sinArchivo.length > 0 && (
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[11px] text-slate-700 m-0 leading-relaxed">
              {sinArchivo.length === 1
                ? 'Esta actividad entrega un formato que'
                : 'Esta actividad entrega formatos que'}{' '}
              Contratación aún no ha subido a la biblioteca. Diligéncialo por fuera y cárgalo
              aquí.
            </p>
            <ul className="m-0 mt-1 p-0 list-none">
              {sinArchivo.map((f) => (
                <li key={f.id} className="text-[11px] text-slate-500 truncate">
                  {f.codigo} · {f.nombre}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
