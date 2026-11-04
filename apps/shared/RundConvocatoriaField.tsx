import { useEffect, useId, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import './RundConvocatoriaField.css';

export type RundConvocatoriaOption = { clave: string; nombre: string };
const key = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function RundConvocatoriaField({ periodoCarga, value, onChange, loadOptions, allowCreate = false, disabled = false,
  label = 'Convocatoria' }: {
  periodoCarga?: string; value: string; onChange: (value: string) => void;
  loadOptions: (periodo: string) => Promise<RundConvocatoriaOption[]>;
  allowCreate?: boolean; disabled?: boolean; label?: string;
}) {
  const id = useId();
  const [options, setOptions] = useState<RundConvocatoriaOption[]>([]);
  const [input, setInput] = useState(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const hasPeriod = /^20\d{2}-[12]$/.test(periodoCarga || '');
  useEffect(() => {
    setInput(value);
  }, [value]);
  useEffect(() => {
    let alive = true;
    setOptions([]); setOpen(false); setActive(-1); setFailed(false);
    if (!hasPeriod) { setLoading(false); return; }
    setLoading(true);
    loadOptions(periodoCarga!).then(data => { if (alive) setOptions(data); })
      .catch(() => { if (alive) setFailed(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [periodoCarga, hasPeriod, loadOptions, retry]);
  const matches = options.filter(option => key(option.nombre).includes(key(input.trim())));
  const choose = (name: string) => { setInput(name); onChange(name); setOpen(false); setActive(-1); };
  return <div className="rund-convocatoria" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setOpen(false); setActive(-1);
      if (!allowCreate) setInput(value);
    }
  }}>
    <label htmlFor={id}>{label}{allowCreate && <span>Opcional</span>}</label>
    <div className="rund-convocatoria__input">
      <Search size={15} aria-hidden="true" />
      <input id={id} role="combobox" autoComplete="off" maxLength={150}
        aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined}
        aria-describedby={`${id}-help`} disabled={disabled || !hasPeriod} value={input}
        placeholder={allowCreate ? 'Escriba un nombre o busque una convocatoria' : 'Buscar convocatoria del período'}
        onFocus={() => { setOpen(true); setActive(-1); }}
        onChange={event => {
          setInput(event.target.value); setOpen(true); setActive(-1);
          if (allowCreate || !event.target.value) onChange(event.target.value);
        }}
        onKeyDown={event => {
          if (event.key === 'Escape') { setOpen(false); if (!allowCreate) setInput(value); }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); setOpen(true);
            setActive(current => matches.length ? Math.max(0, Math.min(matches.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1))) : -1);
          }
          if (event.key === 'Enter' && open && matches[active]) { event.preventDefault(); choose(matches[active].nombre); }
        }} />
      {(input || value) && <button type="button" aria-label={`Limpiar ${label.toLowerCase()}`} disabled={disabled} onClick={() => choose('')}><X size={15} /></button>}
      <button type="button" aria-label={`Mostrar ${label.toLowerCase()}`} disabled={disabled || !hasPeriod} onClick={() => setOpen(current => !current)}><ChevronDown size={16} /></button>
    </div>
    {open && <div className="rund-convocatoria__menu" id={`${id}-list`} role="listbox" aria-label={`Convocatorias de ${periodoCarga}`}>
      {!allowCreate && <button type="button" role="option" aria-selected={!value} onClick={() => choose('')}>Todas las convocatorias</button>}
      {matches.map((option, index) => <button type="button" role="option" id={`${id}-${index}`} key={option.clave}
        aria-selected={value === option.nombre} className={active === index ? 'is-active' : ''}
        onMouseDown={event => event.preventDefault()} onClick={() => choose(option.nombre)}>{option.nombre}</button>)}
      {!matches.length && <p>{loading ? 'Consultando convocatorias…' : failed ? 'No se pudieron consultar los nombres guardados.' : allowCreate
        ? input.trim() ? 'Se guardará este nombre al confirmar la carga.' : 'Puede escribir el nombre de la primera convocatoria.'
        : 'Sin coincidencias en este período.'}</p>}
    </div>}
    <small id={`${id}-help`}>{!hasPeriod ? 'Seleccione un período académico.' : allowCreate
      ? `Período ${periodoCarga}. Escriba un nombre nuevo, reutilice uno existente o deje el campo vacío.`
      : value ? `Filtro aplicado: ${value}` : `Convocatorias del período ${periodoCarga}.`}</small>
    {failed && <small role="status">No se cargaron las sugerencias. <button type="button" onClick={() => setRetry(current => current + 1)}>Reintentar</button></small>}
  </div>;
}
