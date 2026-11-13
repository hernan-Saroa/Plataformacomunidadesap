import { useId, useState, type InputHTMLAttributes } from 'react';

export const hora24Valida = (valor: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(valor);
export const mostrarHora24 = (valor: string) => {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(valor));
  return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? `${m[1].padStart(2, '0')}:${m[2]}` : valor;
};

/** Texto deliberadamente: type=time depende del idioma del navegador. */
export function CampoHora24({ value, onChange, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & { value: string; onChange: (valor: string) => void }) {
  const id = useId();
  const [tocado, setTocado] = useState(false);
  const invalida = tocado && !hora24Valida(value);
  return <>
    <input {...props} type="text" inputMode="text" value={value} maxLength={5} placeholder="HH:mm"
      autoComplete="off" spellCheck={false} aria-invalid={invalida || undefined}
      aria-describedby={[props['aria-describedby'], id].filter(Boolean).join(' ')}
      onChange={e => onChange(e.target.value)} onBlur={e => {
        setTocado(true);
        const compacto = /^(\d{2})(\d{2})$/.exec(value);
        onChange(mostrarHora24(compacto ? `${compacto[1]}:${compacto[2]}` : value));
        props.onBlur?.(e);
      }} />
    <span id={id} className={`text-[11px] font-normal normal-case ${invalida ? 'text-red-700' : 'text-slate-500'}`}>
      {invalida ? 'Escribe una hora entre 00:00 y 23:59 (HH:mm).' : '24 h · HH:mm'}
    </span>
  </>;
}
