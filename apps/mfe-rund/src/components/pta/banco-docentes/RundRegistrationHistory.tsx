import React, { useEffect, useState } from 'react';
import { Archive, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock, Download, FileSpreadsheet, History, Info, RefreshCw, Search, User, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { downloadBancoDocentesBulkSupport, getRundRegistrationHistory, getRundRegistrationHistoryDetail,
  type RundRegistrationDetail, type RundRegistrationEvent, type RundRegistrationHistoryPage } from '../../../services/api/rundApi';
import { rundActorName } from '../../../utils/rundActorName';
import './RundRegistrationHistory.css';

export function formatRegistrationDate(value?: string | null) {
  if (!value || Number.isNaN(new Date(value).getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'America/Bogota' }).format(new Date(value));
}

const statuses: Record<string, { label: string; tone: string }> = {
  PROCESANDO: { label: 'En proceso', tone: 'blue' }, COMPLETADA: { label: 'Completada', tone: 'green' },
  COMPLETADA_CON_ERRORES: { label: 'Con novedades', tone: 'amber' }, FALLIDA: { label: 'No completada', tone: 'red' },
  CREADO: { label: 'Creado', tone: 'green' }, ACTUALIZADO: { label: 'Actualizado', tone: 'blue' },
  SIN_CAMBIOS: { label: 'Sin cambios', tone: 'slate' }, NO_CARGADO: { label: 'No cargado', tone: 'red' },
  HISTORICO: { label: 'Resultado no conservado', tone: 'slate' },
  RECUPERADO: { label: 'Información recuperada', tone: 'violet' },
  RECUPERACION_COMPLETADA: { label: 'Recuperación completada', tone: 'violet' },
  NO_PROCESADO: { label: 'No procesado', tone: 'amber' }, PENDIENTE: { label: 'Sin confirmar', tone: 'slate' },
};
function Status({ value }: { value: string }) {
  const status = statuses[value] || { label: 'Resultado no disponible', tone: 'slate' };
  return <span className={`rund-trace__badge rund-trace__badge--${status.tone}`}>{status.label}</span>;
}

function Pagination({ page, pages, total, busy, onChange, entity = 'registro' }: { page: number; pages: number; total: number; busy: boolean; onChange: (page: number) => void; entity?: 'registro' | 'operación' | 'persona' }) {
  if (!total) return null;
  return <div className="rund-trace__pagination">
    <span><strong>{total}</strong> {total === 1 ? entity : entity === 'operación' ? 'operaciones' : `${entity}s`}<span className="rund-trace__page-label">Página {page} de {Math.max(1, pages)}</span></span>
    {pages > 1 && <div><button type="button" aria-label="Página anterior" disabled={busy || page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={16} /></button>
      <button type="button" aria-label="Página siguiente" disabled={busy || page >= pages} onClick={() => onChange(page + 1)}><ChevronRight size={16} /></button></div>}
  </div>;
}

function RegistrationDetail({ event }: { event: RundRegistrationEvent }) {
  const recovery = event.origen === 'RECUPERACION_INFORMATIVA';
  const [filters, setFilters] = useState({ page: 1, search: '' });
  const [input, setInput] = useState('');
  const [data, setData] = useState<RundRegistrationDetail | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setFilters(current => ({ ...current, page: 1, search: input.trim() })), 250);
    return () => clearTimeout(timer);
  }, [input]);
  useEffect(() => {
    let alive = true;
    setBusy(true); setError(false); setData(null);
    getRundRegistrationHistoryDetail(event.tipo, event.id, { periodoCarga: event.periodo || undefined, sinPeriodo: !event.periodo, ...filters })
      .then(result => { if (alive) setData(result); }).catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [event.tipo, event.id, event.periodo, filters.page, filters.search, retry]);
  return <section className="rund-trace__detail" aria-label={`Personas de ${event.titulo}`} aria-busy={busy}>
    <div className="rund-trace__detail-heading"><div><strong>{event.tipo === 'MASIVO' ? 'Personas de esta carga' : 'Registro creado'}</strong>
      <p>{event.periodo ? `Periodo ${event.periodo}` : 'Sin periodo registrado'} · {recovery ? 'Información recuperada y acciones registradas por persona.' : event.tipo === 'MASIVO' ? 'Resultado de cada fila del archivo.' : 'Creación individual en RUND.'}</p></div>
      {event.tipo === 'MASIVO' && <label className="rund-trace__search"><Search size={15} /><input aria-label="Buscar persona en esta carga" placeholder="Nombre, documento o correo…" maxLength={150} value={input} onChange={e => setInput(e.target.value)} /></label>}
    </div>
    {busy ? <p className="rund-trace__message" role="status">Consultando personas…</p> : error ? <div className="rund-trace__message" role="alert">No se pudo consultar el detalle. <button type="button" onClick={() => setRetry(value => value + 1)}>Reintentar</button></div> : data && <>
      {!data.detalleCompleto && <div className="rund-trace__notice"><Info size={17} /><div><strong>Detalle histórico parcial</strong><p>Las personas se recuperaron del archivo original y su historial. Algunas filas no conservan el resultado individual de la operación.</p></div></div>}
      {!data.registros.length ? <p className="rund-trace__message">{filters.search ? 'No hay personas que coincidan con la búsqueda.' : 'No hay registros individuales conservados para esta operación.'}</p> : <div className="rund-trace__table-wrap"><table>
        <thead><tr>{event.tipo === 'MASIVO' && <th>Fila</th>}<th>Persona</th><th>Documento</th><th>Resultado</th><th>{recovery ? 'Fecha de recuperación' : 'Fecha y hora'}</th></tr></thead>
        <tbody>{data.registros.map((row, index) => <tr key={`${row.fila}-${index}`}>
          {event.tipo === 'MASIVO' && <td>{row.fila || '—'}</td>}
          <td><div className="rund-trace__person"><span aria-hidden="true">{row.nombre.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase()}</span><div><strong>{row.nombre}</strong>{row.correo && <small>{row.correo}</small>}</div></div></td>
          <td>{row.documento_identidad || 'No disponible'}</td><td><Status value={row.resultado} />{row.observacion && <small>{row.observacion}</small>}</td>
          <td>{row.fecha ? <time dateTime={row.fecha}>{formatRegistrationDate(row.fecha)}</time> : <span className="rund-trace__muted">Sin fecha individual</span>}</td>
        </tr>)}</tbody>
      </table></div>}
      <Pagination {...data} entity="persona" busy={busy} onChange={page => setFilters(current => ({ ...current, page }))} />
    </>}
  </section>;
}

function RegistrationCard({ event, canDownload }: { event: RundRegistrationEvent; canDownload: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const bulk = event.tipo === 'MASIVO';
  const recovery = event.origen === 'RECUPERACION_INFORMATIVA';
  const recoveryActor = event.responsableRecuperacion === 'Sistema' ? 'Proceso automático' : rundActorName(event.responsableRecuperacion);
  const counters: [keyof RundRegistrationEvent['resumen'], string][] = recovery ? (event.resumen?.recuperados != null ? [['recuperados', 'Perfiles con información recuperada']] : [['total', 'Registros de esta recuperación']])
    : [['total', 'Filas del archivo'], ['creados', 'Creados'], ['actualizados', 'Actualizados'], ['sinCambios', 'Sin cambios'], ['errores', 'No cargados'], ['omitidos', 'No procesados']];
  const download = async () => {
    if (!canDownload || downloading) return;
    setDownloading(true);
    try {
      const blob = await downloadBancoDocentesBulkSupport(event.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = event.titulo; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { toast.error('No fue posible descargar el archivo original.'); }
    finally { setDownloading(false); }
  };
  return <article className={`rund-trace__card${recovery ? ' rund-trace__card--recovery' : !bulk ? ' rund-trace__card--individual' : ''}`}>
    <div className="rund-trace__card-top"><span className={`rund-trace__icon ${recovery ? 'rund-trace__icon--archive' : !bulk ? 'rund-trace__icon--person' : ''}`}>{recovery ? <Archive size={22} /> : bulk ? <FileSpreadsheet size={22} /> : <UserPlus size={22} />}</span>
      <div className="rund-trace__title"><span className="rund-trace__eyebrow">{recovery ? 'Recuperación histórica' : bulk ? 'Carga masiva' : 'Creación individual'}</span><h4>{event.titulo}</h4>
      </div><Status value={recovery && event.estado === 'COMPLETADA' ? 'RECUPERACION_COMPLETADA' : event.estado} /></div>
    <dl className="rund-trace__metadata">
      <div><dt><User size={14} />{recovery ? 'Responsable de la carga original' : bulk ? 'Cargado por' : 'Creado por'}</dt><dd className={recovery ? 'rund-trace__muted' : ''}>{recovery ? 'No quedó registrado' : rundActorName(event.responsable)}</dd></div>
      <div><dt><Clock size={14} />{recovery ? 'Fecha de recuperación' : bulk ? 'Fecha de carga' : 'Fecha de creación'}</dt><dd><time dateTime={event.fecha}>{formatRegistrationDate(event.fecha)}</time></dd></div>
      <div><dt><CalendarDays size={14} />Periodo asociado</dt><dd>{event.periodo || 'Sin periodo registrado'}</dd></div>
    </dl>
    {recovery && <div className="rund-trace__source-note"><Info size={18} /><div><strong>Este registro documenta una recuperación de información</strong>
      <p>La fecha indicada corresponde a la recuperación. El responsable y la fecha de la carga original no constan en este registro.</p>
      <span><History size={12} />Recuperación ejecutada por: {recoveryActor}</span></div></div>}
    {bulk && <div className="rund-trace__counters" aria-label="Resultado de la carga">
      {counters.filter(([key]) => event.resumen?.[key] != null && (key !== 'omitidos' || event.resumen[key]))
        .map(([key, label]) => <span key={key} className={`rund-trace__counter rund-trace__counter--${key}`}><strong>{event.resumen[key]}</strong>{label}</span>)}
    </div>}
    <div className="rund-trace__card-actions"><span>{recovery ? 'Archivo de respaldo y datos recuperados' : bulk ? 'Archivo fuente y resultados por persona' : 'Registro realizado desde Crear Docente'}</span><div>
      {bulk && canDownload && <button type="button" onClick={download} disabled={downloading}><Download size={14} />{downloading ? 'Descargando…' : 'Archivo original'}</button>}
      <button type="button" className="rund-trace__expand" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'Ocultar detalle' : bulk ? 'Ver personas' : 'Ver registro'}<ChevronDown size={15} style={{ transform: expanded ? 'rotate(180deg)' : undefined }} /></button>
    </div></div>
    {expanded && <RegistrationDetail event={event} />}
  </article>;
}

export function RundRegistrationHistory({ periodoCarga, canDownloadOriginal = false }: { periodoCarga?: string; canDownloadOriginal?: boolean }) {
  const [filters, setFilters] = useState({ page: 1, tipo: '', search: '' });
  const [input, setInput] = useState('');
  const [data, setData] = useState<RundRegistrationHistoryPage | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setFilters(current => ({ ...current, page: 1, search: input.trim() })), 250);
    return () => clearTimeout(timer);
  }, [input]);
  useEffect(() => {
    let alive = true; setBusy(true); setError(false); setData(null);
    getRundRegistrationHistory({ periodoCarga, page: filters.page, tipo: filters.tipo || undefined, search: filters.search || undefined })
      .then(result => { if (alive) setData(result); }).catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [periodoCarga, filters.page, filters.tipo, filters.search, revision]);
  const grouped = (data?.data || []).reduce<Record<string, RundRegistrationEvent[]>>((groups, event) => {
    (groups[event.periodo || ''] ||= []).push(event); return groups;
  }, {});
  return <section className="rund-trace" aria-label="Trazabilidad de registros RUND" aria-busy={busy}>
    <header className="rund-trace__header"><div className="rund-trace__heading"><span className="rund-trace__icon"><History size={23} /></span><div>
      <span className="rund-trace__header-eyebrow">Historial del Banco de Docentes</span><h3>Trazabilidad de registros</h3><p>Consulta quién registró la información, cuándo se hizo y qué resultado tuvo.</p></div></div>
      <span className="rund-trace__period"><CalendarDays size={14} />{periodoCarga || 'Todos los periodos'}</span></header>
    <div className="rund-trace__toolbar"><label className="rund-trace__search"><Search size={16} /><input aria-label="Buscar operación" placeholder="Buscar archivo o nombre del registro individual…" maxLength={150} value={input} onChange={event => setInput(event.target.value)} /></label>
      <select aria-label="Tipo de operación" value={filters.tipo} onChange={event => setFilters(current => ({ ...current, tipo: event.target.value, page: 1 }))}>
        <option value="">Todas las operaciones</option><option value="MASIVO">Cargas masivas</option><option value="INDIVIDUAL">Creaciones individuales</option>
      </select><button type="button" disabled={busy} onClick={() => setRevision(value => value + 1)}><RefreshCw size={14} />Actualizar</button></div>
    <div className="rund-trace__content">
      {busy ? <p className="rund-trace__message" role="status">Consultando trazabilidad…</p> : error ? <div className="rund-trace__message" role="alert">No fue posible cargar la trazabilidad. <button type="button" onClick={() => setRevision(value => value + 1)}>Reintentar</button></div>
        : !data?.data.length ? <div className="rund-trace__empty"><History size={30} /><strong>Sin operaciones registradas</strong><p>{filters.search || filters.tipo ? 'No hay operaciones que coincidan con los filtros.' : 'No hay cargas masivas ni creaciones individuales conservadas para este periodo.'}</p></div>
          : Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([period, events]) => <section key={period} className="rund-trace__group" aria-label={period ? `Periodo ${period}` : 'Sin periodo registrado'}>
            <h4 className="rund-trace__group-heading"><CalendarDays size={15} />{period ? `Periodo ${period}` : 'Sin periodo registrado'}</h4>
            {events.map(event => <RegistrationCard key={`${event.tipo}-${event.id}-${period}`} event={event} canDownload={canDownloadOriginal && data.accesoCompleto} />)}
          </section>)}
    </div>
    {data && <Pagination {...data} entity="operación" busy={busy} onChange={page => setFilters(current => ({ ...current, page }))} />}
    <div className="rund-trace__timezone"><Clock size={12} />Fechas y horas de Colombia</div>
  </section>;
}
