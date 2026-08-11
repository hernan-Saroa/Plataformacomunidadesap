import React, { useEffect, useState } from 'react';
import { Pencil, Check, X, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { CampoConfigurable } from '../../types';

/** El nombre del tipo como lo entiende quien no programa. */
const TIPO_LEGIBLE: Record<string, string> = {
  texto: 'Texto corto',
  textarea: 'Texto largo',
  numero: 'Número',
  moneda: 'Valor en pesos',
  fecha: 'Fecha',
  seleccion: 'Lista de opciones',
  booleano: 'Sí o no',
};

/**
 * Textos del formulario de una actividad.
 *
 * Lo que el gestor lee —la etiqueta y la ayuda— salía del seed y solo se
 * podía corregir por SQL. Una errata en "Línea del Plan Anual de
 * Adquisiciones" obligaba a un despliegue.
 *
 * El `codigo` se muestra pero no se edita: es lo que referencian las reglas y
 * los datos ya guardados, así que renombrarlo dejaría huérfano lo anterior.
 */
export function PanelCampos({ numeral }: { numeral: string }) {
  const [campos, setCampos] = useState<CampoConfigurable[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
  const [etiqueta, setEtiqueta] = useState('');
  const [ayuda, setAyuda] = useState('');

  useEffect(() => {
    setCargando(true);
    contratacionService
      .campos(numeral)
      .then(setCampos)
      .catch(() => setCampos([]))
      .finally(() => setCargando(false));
  }, [numeral]);

  const abrir = (campo: CampoConfigurable) => {
    setEditando(campo.id);
    setEtiqueta(campo.etiqueta);
    setAyuda(campo.ayuda ?? '');
  };

  const guardar = async (campo: CampoConfigurable) => {
    try {
      const actualizado = await contratacionService.actualizarCampo(campo.id, {
        etiqueta: etiqueta.trim(),
        ayuda: ayuda.trim(),
      });
      setCampos((lista) => lista.map((c) => (c.id === campo.id ? actualizado : c)));
      setEditando(null);
      toast.success('Texto actualizado');
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo guardar');
    }
  };

  const alternarActivo = async (campo: CampoConfigurable) => {
    try {
      const actualizado = await contratacionService.actualizarCampo(campo.id, {
        etiqueta: campo.etiqueta,
        activo: !campo.activo,
      });
      setCampos((lista) => lista.map((c) => (c.id === campo.id ? actualizado : c)));
      toast.success(actualizado.activo ? 'Campo visible' : 'Campo retirado del formulario');
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo cambiar');
    }
  };

  if (cargando) {
    return (
      <div className="space-y-2 p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (campos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
        <p className="text-sm font-semibold text-gray-700 m-0">
          Esta actividad todavía no tiene formulario
        </p>
        <p className="text-xs text-gray-500 mt-1.5 mb-0 leading-relaxed max-w-md mx-auto">
          De las 63 actividades de la matriz, por ahora solo el estudio previo (3.1) tiene
          formulario. Los campos de las demás se definen al construir cada etapa.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <ul className="divide-y divide-gray-100 m-0 p-0 list-none">
        {campos.map((campo) => (
          <li key={campo.id} className={`px-4 py-3 ${campo.activo ? '' : 'bg-gray-50'}`}>
            {editando === campo.id ? (
              <div className="space-y-2">
                <input
                  value={etiqueta}
                  onChange={(e) => setEtiqueta(e.target.value)}
                  maxLength={300}
                  autoFocus
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
                />
                <input
                  value={ayuda}
                  onChange={(e) => setAyuda(e.target.value)}
                  placeholder="Texto de apoyo (opcional)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditando(null)}
                    className="flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <X className="w-3 h-3" /> Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => guardar(campo)}
                    className="flex items-center gap-1 rounded-lg bg-[#003DA5] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#00307f]"
                  >
                    <Check className="w-3 h-3" /> Guardar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-sm font-semibold ${
                        campo.activo ? 'text-gray-900' : 'text-gray-400 line-through'
                      }`}
                    >
                      {campo.etiqueta}
                    </span>
                    {campo.obligatorio && (
                      <span className="rounded bg-red-50 border border-red-200 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                        Obligatorio
                      </span>
                    )}
                    {campo.soloLectura && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                        Solo lectura
                      </span>
                    )}
                  </div>
                  {campo.ayuda && (
                    <p className="text-[11px] text-gray-500 mt-0.5 mb-0">{campo.ayuda}</p>
                  )}
                  <p
                    className="text-[10px] text-gray-400 mt-0.5 mb-0"
                    title={`Código interno: ${campo.codigo}`}
                  >
                    {TIPO_LEGIBLE[campo.tipo] ?? campo.tipo}
                  </p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => abrir(campo)}
                    title="Editar texto"
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => alternarActivo(campo)}
                    title={campo.activo ? 'Retirar del formulario' : 'Volver a mostrar'}
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
