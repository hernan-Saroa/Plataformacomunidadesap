import React, { useEffect, useState } from 'react';
import { Eye, Info } from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { Modalidad, SimulacionFormulario } from '../../types';

interface Props {
  numeral: string;
  modalidades: Modalidad[];
  modalidadInicial: string;
}

/**
 * El formulario que producen las reglas configuradas.
 *
 * Ejecuta las reglas en vez de describirlas: es la diferencia entre leer que
 * un campo "es obligatorio si la modalidad es directa" y ver el asterisco
 * aparecer al elegir esa modalidad. Sin esto el administrador configura a
 * ciegas y el error sale cuando un gestor no puede enviar su estudio previo.
 */
export function VistaPreviaFormulario({ numeral, modalidades, modalidadInicial }: Props) {
  const [modalidad, setModalidad] = useState(modalidadInicial);
  const [datos, setDatos] = useState<Record<string, any>>({});
  const [simulacion, setSimulacion] = useState<SimulacionFormulario | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    setCargando(true);
    contratacionService
      .simular(numeral, modalidad, datos)
      .then(setSimulacion)
      .catch(() => setSimulacion(null))
      .finally(() => setCargando(false));
  }, [numeral, modalidad, datos]);

  const visibles = simulacion?.campos.filter((c) => c.visible) ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] items-start">
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <h4 className="flex items-center gap-1.5 text-[11px] font-bold text-gray-700 uppercase tracking-wide m-0">
          <Eye className="w-3.5 h-3.5" />
          Simular como
        </h4>

        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-1">Modalidad</label>
          <select
            value={modalidad}
            onChange={(e) => setModalidad(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
          >
            {modalidades.map((m) => (
              <option key={m.codigo} value={m.codigo}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Solo los campos que alguna condición mira: llenar el formulario
            entero para probar una regla no aporta nada. */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-1">
            Valor estimado
          </label>
          <input
            type="number"
            value={datos.valor_estimado ?? ''}
            onChange={(e) =>
              setDatos((d) => ({
                ...d,
                valor_estimado: e.target.value === '' ? undefined : Number(e.target.value),
              }))
            }
            placeholder="0"
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
          />
        </div>

        {simulacion && (
          <p className="text-[10px] text-gray-500 m-0 pt-1 border-t border-gray-100">
            {simulacion.reglasEvaluadas} regla{simulacion.reglasEvaluadas === 1 ? '' : 's'}{' '}
            evaluada{simulacion.reglasEvaluadas === 1 ? '' : 's'}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        {cargando && !simulacion ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : visibles.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm font-semibold text-gray-700 m-0">
              No hay nada que mostrar
            </p>
            <p className="text-xs text-gray-500 mt-1 mb-0">
              {simulacion && simulacion.campos.length === 0
                ? 'Esta actividad todavía no tiene formulario definido.'
                : 'Con esta modalidad y estos valores, ninguna regla deja campos visibles.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {visibles.map((campo) => (
              <div key={campo.codigo}>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {campo.etiqueta}
                  {campo.obligatorio && (
                    <span className="text-red-600 ml-0.5" title="Obligatorio">
                      *
                    </span>
                  )}
                </label>
                {/* Deshabilitado a propósito: es una muestra de la forma del
                    formulario, no un formulario que se pueda diligenciar. */}
                <input
                  disabled
                  placeholder={campo.tipo === 'moneda' ? '$' : ''}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-400"
                />
                {campo.porque.length > 0 && (
                  <p className="flex items-start gap-1 text-[10px] text-[#003DA5] mt-1 mb-0">
                    <Info className="w-3 h-3 mt-px flex-shrink-0" />
                    {campo.porque.join(' · ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
