import React, { useEffect, useState } from 'react';
import { Check, Minus, Circle, Diamond, AlertTriangle } from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { Cobertura, EstadoCelda, FilaCobertura } from '../../types';

const ETIQUETA_TIPO: Record<string, string> = {
  CAMPO_OBLIGATORIO: 'Campo',
  DOCUMENTO_REQUERIDO: 'Documento',
  RANGO_VALOR: 'Rango',
  PLAZO_MINIMO: 'Plazo',
  BLOQUEA_AVANCE: 'Bloqueo',
  REGLA_DERIVADA: 'Condicional',
};

/**
 * Abreviatura de tres letras para el encabezado.
 *
 * Con once modalidades el nombre completo no cabe ni girado: "Selección
 * Abreviada por Bolsa Mercantil" son 38 caracteres por columna. La sigla se
 * lee de corrido y el nombre entero queda en el `title`.
 */
function sigla(codigo: string): string {
  const mapa: Record<string, string> = {
    LICITACION_PUBLICA: 'LP',
    ABREVIADA_MENOR_CUANTIA: 'SMC',
    ABREVIADA_SUBASTA_INVERSA: 'SSI',
    ENAJENACION_SUBASTA: 'ENA',
    ABREVIADA_TVEC: 'TVE',
    ABREVIADA_BOLSA_MERCANTIL: 'BM',
    CONCURSO_MERITOS_ABIERTO: 'CMA',
    CONCURSO_MERITOS_PRECAL: 'CMP',
    MINIMA_CUANTIA: 'MC',
    REGIMEN_ESPECIAL_092: 'RE',
    CONTRATACION_DIRECTA: 'CD',
  };
  return mapa[codigo] ?? codigo.slice(0, 3);
}

function Celda({ estado }: { estado: EstadoCelda }) {
  // Nunca solo color: cada estado tiene su propia forma, porque una matriz
  // que solo se distingue por tono es ilegible para quien no ve el rojo.
  if (estado === 'ESPECIFICA') {
    return (
      <span title="Regla propia de esta modalidad" className="text-[#003DA5]">
        <Diamond className="w-3.5 h-3.5 mx-auto fill-current" />
      </span>
    );
  }
  if (estado === 'GLOBAL') {
    return (
      <span title="Hereda la regla que aplica a todas" className="text-emerald-600">
        <Check className="w-4 h-4 mx-auto" />
      </span>
    );
  }
  if (estado === 'NO_APLICA') {
    return (
      <span title="La actividad no aplica a esta modalidad" className="text-gray-300">
        <Minus className="w-3.5 h-3.5 mx-auto" />
      </span>
    );
  }
  return (
    <span title="Sin regla" className="text-gray-300">
      <Circle className="w-2.5 h-2.5 mx-auto" />
    </span>
  );
}

interface Props {
  numeral: string;
  /** Abre la regla para editarla; la matriz no edita, señala dónde hacerlo. */
  onAbrirRegla?: (reglaId: string) => void;
}

/**
 * Matriz de cobertura de una actividad.
 *
 * Responde de un vistazo la pregunta que la lista de reglas no responde: si
 * una condición le falta a alguna modalidad. Es de consulta —editar se hace
 * en la pestaña de reglas— porque una tabla de once columnas donde cada celda
 * abre un formulario es justo la pantalla que se queria evitar.
 */
export function MatrizCobertura({ numeral, onAbrirRegla }: Props) {
  const [datos, setDatos] = useState<Cobertura | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCargando(true);
    setError(null);
    contratacionService
      .cobertura(numeral)
      .then(setDatos)
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));
  }, [numeral]);

  if (cargando) {
    return (
      <div className="space-y-2 p-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-8 rounded bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 m-4">
        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-red-800 m-0">{error}</p>
      </div>
    );
  }

  if (!datos || datos.filas.length === 0) {
    return (
      <p className="text-sm text-gray-500 px-4 py-10 text-center m-0">
        La actividad no tiene reglas configuradas.
      </p>
    );
  }

  const huecos = (fila: FilaCobertura) =>
    fila.celdas.filter((c) => c.estado === 'SIN_REGLA').length;

  return (
    <div className="space-y-3">
      {/* La tabla desborda a lo ancho; el contenedor la deja desplazarse sin
          que la pagina entera se mueva. */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-gray-600 min-w-[220px]">
                Condición
              </th>
              {datos.modalidades.map((m) => (
                <th
                  key={m.codigo}
                  title={m.nombre}
                  className={`px-2 py-2 text-center text-[11px] font-bold tracking-wide w-14 ${
                    m.aplica ? 'text-gray-600' : 'text-gray-300'
                  }`}
                >
                  {sigla(m.codigo)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datos.filas.map((fila) => (
              <tr key={fila.clave} className="border-b border-gray-100 hover:bg-gray-50/60">
                <td className="sticky left-0 z-10 bg-white px-3 py-2">
                  <button
                    type="button"
                    onClick={() =>
                      fila.reglaGlobalId && onAbrirRegla?.(fila.reglaGlobalId)
                    }
                    disabled={!fila.reglaGlobalId || !onAbrirRegla}
                    className="text-left disabled:cursor-default group"
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-gray-400">
                      {ETIQUETA_TIPO[fila.tipo] ?? fila.tipo}
                    </span>
                    <span
                      className={`block font-mono text-xs ${
                        fila.reglaGlobalId && onAbrirRegla
                          ? 'text-gray-800 group-hover:text-[#003DA5] group-hover:underline'
                          : 'text-gray-800'
                      }`}
                    >
                      {fila.etiqueta}
                    </span>
                  </button>
                  {huecos(fila) > 0 && (
                    <span className="mt-0.5 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                      falta en {huecos(fila)}
                    </span>
                  )}
                </td>
                {fila.celdas.map((c) => (
                  <td key={c.modalidad} className="px-2 py-2 text-center">
                    <Celda estado={c.estado} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-4 px-1 text-[11px] text-gray-600">
        <span className="flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-600" /> Hereda la global
        </span>
        <span className="flex items-center gap-1.5">
          <Diamond className="w-3 h-3 text-[#003DA5] fill-current" /> Regla propia
        </span>
        <span className="flex items-center gap-1.5">
          <Circle className="w-2 h-2 text-gray-300" /> Sin regla
        </span>
        <span className="flex items-center gap-1.5">
          <Minus className="w-3.5 h-3.5 text-gray-300" /> No aplica
        </span>
      </div>
    </div>
  );
}
