import React from 'react';
import { CampoFormulario } from '../../types';
import { SelectorPersona } from './SelectorPersona';

/**
 * Campos que nombran a un funcionario. Va por codigo y no por tipo porque
 * campos_formulario no distingue "texto" de "nombre de persona": agregarle un
 * tipo nuevo obligaria a migrar el CHECK y a que el backend lo entienda.
 */
const CAMPOS_DE_PERSONA = ['responsable_area'];

interface Props {
  campo: CampoFormulario;
  valor: any;
  error?: string;
  disabled?: boolean;
  onChange: (valor: any) => void;
}

const ESAP_PRIMARY = '#003DA5';

/** Formatea 78500000 -> "78.500.000" mientras se escribe. */
function formatearMoneda(valor: number | string | undefined): string {
  if (valor === undefined || valor === null || valor === '') return '';
  const n = typeof valor === 'number' ? valor : Number(String(valor).replace(/\D/g, ''));
  return Number.isNaN(n) ? '' : n.toLocaleString('es-CO');
}

/**
 * Pinta un campo según su `tipo`. Los tipos vienen de la configuración en base
 * de datos, así que agregar un campo al estudio previo no toca este archivo.
 */
export function CampoDinamico({ campo, valor, error, disabled, onChange }: Props) {
  const id = `campo-${campo.codigo}`;
  const describedBy = [error ? `${id}-error` : null, campo.ayuda ? `${id}-ayuda` : null]
    .filter(Boolean)
    .join(' ');

  const claseBase = `w-full px-2.5 py-1.5 text-[12.5px] rounded-md border transition-colors
    focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500`;
  const claseEstado = error
    ? 'border-red-400 bg-red-50 focus:ring-red-200'
    : 'border-gray-300 bg-white focus:border-[#003DA5] focus:ring-[#003DA5]/20';
  const clase = `${claseBase} ${claseEstado}`;

  const control = () => {
    // Los campos que nombran a un funcionario se eligen del directorio, no se
    // escriben: con texto libre la misma persona queda registrada de varias
    // formas y el expediente deja de servir para filtrar por responsable.
    if (CAMPOS_DE_PERSONA.includes(campo.codigo)) {
      return (
        <SelectorPersona
          id={id}
          value={valor ?? ''}
          disabled={disabled}
          invalido={!!error}
          onChange={onChange}
        />
      );
    }

    switch (campo.tipo) {
      case 'texto_largo':
        return (
          <textarea
            id={id}
            className={`${clase} min-h-[70px] leading-relaxed resize-y`}
            value={valor ?? ''}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={describedBy || undefined}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case 'numero':
        return (
          <input
            id={id}
            type="number"
            className={`${clase} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            value={valor ?? ''}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={describedBy || undefined}
            onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          />
        );

      case 'moneda':
        return (
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12.5px] text-slate-500">
              $
            </span>
            <input
              id={id}
              type="text"
              inputMode="numeric"
              className={`${clase} pl-6 tabular-nums`}
              value={formatearMoneda(valor)}
              disabled={disabled}
              aria-invalid={!!error}
              aria-describedby={describedBy || undefined}
              onChange={(e) => {
                const digitos = e.target.value.replace(/\D/g, '');
                onChange(digitos === '' ? undefined : Number(digitos));
              }}
            />
          </div>
        );

      case 'seleccion':
        return (
          <select
            id={id}
            className={clase}
            value={valor ?? ''}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={describedBy || undefined}
            onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
          >
            <option value="">Seleccione…</option>
            {(campo.opciones ?? []).map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <input
            id={id}
            type="text"
            className={clase}
            value={valor ?? ''}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={describedBy || undefined}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  };

  return (
    <div
      className={campo.tipo === 'texto_largo' ? 'md:col-span-2 flex flex-col gap-1' : 'flex flex-col gap-1'}
      data-campo={campo.codigo}
    >
      <label htmlFor={id} className="text-[11px] font-bold text-gray-600 leading-tight">
        {campo.etiqueta}
        {campo.obligatorio && (
          <span className="text-red-600 ml-0.5" aria-label="obligatorio">
            *
          </span>
        )}
      </label>

      {control()}

      {error && (
        <span id={`${id}-error`} role="alert" className="text-[10.5px] font-bold text-red-600">
          {error}
        </span>
      )}
      {campo.ayuda && !error && (
        <span id={`${id}-ayuda`} className="text-[10px] text-slate-400 leading-snug">
          {campo.ayuda}
        </span>
      )}
    </div>
  );
}

export { ESAP_PRIMARY };
