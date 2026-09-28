import { FormEvent, useState } from 'react';
import { Consulta, Documento, Evento, Persona, pazYSalvoService as api } from './pazYSalvoService';
import './paz-y-salvo.css';

/** Cada borrador, firma y consulta se conserva en el servidor. */
export default function PazYSalvoCoordinadora() {
  const [q, setQ] = useState('');
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [consulta, setConsulta] = useState<Consulta | null>(null);
  const [documento, setDocumento] = useState<Documento | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [code, setCode] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const accion = async (fn: () => Promise<void>) => {
    setBusy(true); setError(''); setMensaje('');
    try { await fn(); }
    catch (e: any) {
      setError(e.message || 'No fue posible completar la operación');
      const pendientes = e.info?.comisiones;
      if (pendientes) setConsulta(prev => ({ documentos: prev?.documentos || [], pendiente: true, comisiones: pendientes }));
    } finally { setBusy(false); }
  };
  const buscar = (e: FormEvent) => {
    e.preventDefault();
    void accion(async () => {
      setPersona(null); setConsulta(null); setDocumento(null); setEventos([]);
      const items = await api.buscar(q); setPersonas(items);
      if (!items.length) setMensaje('No se encontraron comisionados.');
    });
  };
  const seleccionar = (p: Persona) => void accion(async () => {
    setPersona(p); setDocumento(null); setEventos([]); setCode('');
    setConsulta(null); setConsulta(await api.consultar(p.id));
  });
  const boton = 'paz-boton';
  return <section className="paz-y-salvo space-y-5 rounded-xl bg-white p-6 shadow-sm">
    <h2 className="text-xl font-semibold text-blue-900">Paz y salvo de Viáticos</h2>
    <p>Consulta las legalizaciones del comisionado y firma su certificación mediante un código enviado a tu correo.</p>
    <form onSubmit={buscar} className="flex gap-3">
      <label className="flex-1">Nombre o documento
        <input className="block w-full rounded border p-2" value={q} onChange={e => setQ(e.target.value)} minLength={2} required disabled={busy} />
      </label>
      <button className={boton} disabled={busy || q.trim().length < 2}>Buscar</button>
    </form>
    {error && <p role="alert" className="rounded bg-red-50 p-3 text-red-800">{error}</p>}
    {mensaje && <p role="status" className="rounded bg-blue-50 p-3">{mensaje}</p>}
    {busy && <p role="status">Procesando…</p>}
    <ul className="space-y-2">{personas.map(p => <li key={p.id}>
      <button className="text-left text-blue-800 underline" disabled={busy} onClick={() => seleccionar(p)}>{p.nombre} · {p.documento}</button>
    </li>)}</ul>
    {persona && consulta && <>
      <h3 className="font-semibold">{persona.nombre} · {persona.documento}</h3>
      {consulta.pendiente ? <div className="rounded border border-amber-300 p-4">
        <p>No se puede emitir el paz y salvo: hay legalizaciones pendientes.</p>
        <table className="mt-3 w-full text-left"><thead><tr><th>Comisión</th><th>Estado</th><th>Fecha límite</th></tr></thead>
          <tbody>{consulta.comisiones.map(c => <tr key={c.id}><td>{c.codigo}</td><td>{c.estado}</td>
            <td>{c.fechaLimite ? new Date(c.fechaLimite).toLocaleString('es-CO') : 'Sin plazo registrado'}</td></tr>)}</tbody></table>
      </div> : <p className="text-green-800">Sin legalizaciones pendientes.</p>}
      <button className={boton} disabled={busy || consulta.pendiente} onClick={() => void accion(async () => {
        const doc = await api.solicitar(persona.id); setDocumento(doc); setCode(''); setEventos([]);
        setConsulta(await api.consultar(persona.id));
        setMensaje('Documento preparado. Solicita el código para firmarlo.');
      })}>Preparar paz y salvo</button>
      <h3 className="font-semibold">Documentos registrados</h3>
      {!consulta.documentos.length && <p>No hay documentos registrados.</p>}
      <ul className="space-y-3">{consulta.documentos.map(doc => <li key={doc.id} className="rounded border p-3">
        <p>{new Date(doc.creado_en).toLocaleString('es-CO')} · {doc.firmado_en ? 'Firmado' : 'Pendiente de firma'}</p>
        <p className="text-sm">{doc.id} · {doc.contenido.coordinadoraNombre}</p>
        <button className="mr-4 text-blue-800 underline" disabled={busy} onClick={() => void accion(async () => {
          const detail = await api.detalle(doc.id); setDocumento(detail); setEventos(detail.eventos); setCode('');
        })}>Consultar</button>
        {doc.firmado_en && <button className="text-blue-800 underline" disabled={busy} onClick={() => void accion(async () => {
          await api.descargar(doc.id); setMensaje('Descarga registrada.');
        })}>Descargar PDF</button>}
      </li>)}</ul>
    </>}
    {documento && !documento.firmado_en && <div className="space-y-3 rounded border p-4">
      <p>Firma del documento {documento.id}</p>
      <button className={boton} disabled={busy || consulta?.pendiente} onClick={() => void accion(async () => {
        const result = await api.otp(documento.id); setMensaje(`Código enviado a ${result.email}.`);
      })}>Solicitar código</button>
      <form className="flex gap-3" onSubmit={e => {
        e.preventDefault(); void accion(async () => {
          const firmado = await api.firmar(documento.id, code); setDocumento(firmado); setCode('');
          if (persona) setConsulta(await api.consultar(persona.id));
          setMensaje('Paz y salvo firmado y disponible para descarga.');
        });
      }}>
        <label>Código de seis dígitos<input className="block rounded border p-2" value={code} onChange={e => setCode(e.target.value)}
          inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required disabled={busy} /></label>
        <button className={boton} disabled={busy || consulta?.pendiente || !/^\d{6}$/.test(code)}>Verificar y firmar</button>
      </form>
    </div>}
    {!!eventos.length && <div><h3 className="font-semibold">Trazabilidad</h3><ul>{eventos.map(e =>
      <li key={e.id}>{new Date(e.creado_en).toLocaleString('es-CO')} · {e.accion} · {e.usuario_id}</li>)}</ul></div>}
  </section>;
}
