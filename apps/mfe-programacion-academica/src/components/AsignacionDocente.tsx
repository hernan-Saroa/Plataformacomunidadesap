import { useState } from 'react';
import {
  AlertTriangle, CalendarClock, CheckCircle2, Loader2, Lock, Search, ShieldAlert, User, UserCheck, XCircle,
} from 'lucide-react';

import {
  asignarDocente, consultarDocente, retirarAsignacion,
  type DocenteConsulta, type MotivoRechazo,
} from '../services/api/catalogoApi';

/**
 * EFDS-1372 — Asignación de docente con panel de SOLO LECTURA (subtarea 8).
 *
 * El panel del docente es de solo lectura (RN-09): el RUND lo administra la
 * Subdirección Nacional de Servicios Académicos; la decanatura lo consulta sin
 * escribir. La inmutabilidad la garantiza el backend; esta UI la acompaña.
 *
 * El bloqueo es DURO: si el backend devuelve motivos, no se asignó nada, y se
 * muestran TODOS los motivos (no el primero). El mensaje de cruce de franja no
 * revela qué grupo la ocupa: eso lo garantiza el backend (RN-07), aquí solo se
 * pinta lo que llega.
 *
 * Estética ESAP: azul institucional #003DA5.
 */

function FilaDato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{etiqueta}</p>
      <p className="text-sm font-semibold text-slate-800 mt-0.5">{valor}</p>
    </div>
  );
}

export function AsignacionDocente() {
  const [documento, setDocumento] = useState('');
  const [idGrupo, setIdGrupo] = useState('');
  const [docente, setDocente] = useState<DocenteConsulta | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [asignando, setAsignando] = useState(false);
  const [motivosBloqueo, setMotivosBloqueo] = useState<MotivoRechazo[] | null>(null);
  const [asignado, setAsignado] = useState(false);

  const consultar = async () => {
    if (!documento.trim()) return;
    setCargando(true);
    setError('');
    setMotivosBloqueo(null);
    setAsignado(false);
    try {
      const d = await consultarDocente(documento.trim(), idGrupo.trim() || undefined);
      setDocente(d);
    } catch (e: any) {
      setDocente(null);
      setError(e?.message || 'No se pudo consultar el docente.');
    } finally {
      setCargando(false);
    }
  };

  const asignar = async () => {
    if (!docente || !idGrupo.trim()) return;
    setAsignando(true);
    setError('');
    setMotivosBloqueo(null);
    try {
      const r = await asignarDocente({ idGrupo: idGrupo.trim(), documento: docente.documento });
      if (r.asignado) {
        setAsignado(true);
      } else {
        // Bloqueo duro: no se guardó. Se muestran TODOS los motivos.
        setMotivosBloqueo(r.motivos ?? []);
      }
    } catch (e: any) {
      setError(e?.message || 'No se pudo completar la asignación.');
    } finally {
      setAsignando(false);
    }
  };

  const retirar = async () => {
    if (!idGrupo.trim()) return;
    setAsignando(true);
    try {
      await retirarAsignacion(idGrupo.trim());
      setAsignado(false);
      await consultar();
    } catch (e: any) {
      setError(e?.message || 'No se pudo retirar la asignación.');
    } finally {
      setAsignando(false);
    }
  };

  const sit = docente?.situacion;
  const bloqueado = docente?.asignableAlGrupo === false;

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-[#003DA5]" />
          Asignación de Docente
        </h3>
        <p className="text-xs text-slate-500">
          Consulta la ficha del docente en el RUND y asigna carga con validación de bloqueo duro.
          La información del docente es de solo lectura.
        </p>
      </div>

      {/* Búsqueda */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 md:items-end">
        <div className="flex-1">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Documento del docente</label>
          <input
            type="text"
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && consultar()}
            placeholder="Cédula del docente"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5]"
          />
        </div>
        <div className="flex-1">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Grupo <span className="text-slate-400 normal-case font-medium">(opcional, para validar el bloqueo)</span>
          </label>
          <input
            type="text"
            value={idGrupo}
            onChange={(e) => setIdGrupo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && consultar()}
            placeholder="ID del grupo"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5]"
          />
        </div>
        <button
          onClick={consultar}
          disabled={cargando || !documento.trim()}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-[#003DA5] text-white hover:bg-blue-800 disabled:opacity-50 font-semibold text-xs rounded-xl shadow-md transition-all"
        >
          {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          <span>Consultar</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2 text-sm text-red-700">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Ficha del docente (solo lectura) */}
      {docente && sit && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#003DA5] flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">{docente.nombre}</h4>
                <p className="text-xs text-slate-400">Documento {docente.documento}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
              <Lock className="w-3 h-3" /> Solo lectura · RUND
            </span>
          </div>

          <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            <FilaDato etiqueta="Escalafón" valor={docente.escalafon || 'Sin registrar'} />
            <FilaDato etiqueta="Vinculación desde" valor={docente.vinculacionDesde || '—'} />
            {/* Nulo = indefinida, no error. */}
            <FilaDato etiqueta="Vinculación hasta" valor={docente.vinculacionHasta || 'Indefinida'} />
            <FilaDato etiqueta="Horas del plan (RUND)" valor={`${docente.horasPta} h`} />
          </div>

          {/* Situación administrativa: motivo + vigencia cuando no es asignable */}
          <div className="px-5 pb-5">
            {sit.asignable ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-sm text-emerald-800">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Situación administrativa: <strong>disponible para asignación</strong>{sit.descripcion ? ` · ${sit.descripcion}` : ''}</span>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-2 text-sm text-amber-900 font-semibold">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>No asignable</span>
                </div>
                {/* El motivo vive en texto libre y no es evidente: se muestra explícito. */}
                <p className="text-xs text-amber-800 pl-6">{sit.motivo}</p>
                {sit.vigenteHasta && (
                  <p className="text-xs text-amber-700 pl-6 flex items-center gap-1">
                    <CalendarClock className="w-3 h-3" /> Vigente hasta {sit.vigenteHasta} — puede volver a ser asignable después.
                  </p>
                )}
                {sit.descripcion && <p className="text-[11px] text-amber-600/80 pl-6">Texto RUND: {sit.descripcion}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Motivos de bloqueo contra el grupo (todos, no el primero) */}
      {docente && docente.motivos && docente.motivos.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4" />
            <span>No se puede asignar a este grupo — {docente.motivos.length} motivo(s):</span>
          </div>
          <ul className="space-y-1.5 pl-1">
            {docente.motivos.map((m, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-amber-800">
                <span className="mt-0.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[10px] flex-shrink-0">{m.regla}</span>
                <span>{m.mensaje}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Resultado del intento de asignación (bloqueo duro) */}
      {motivosBloqueo && motivosBloqueo.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-red-800">
            <XCircle className="w-4 h-4" />
            <span>Asignación bloqueada — no se guardó nada. {motivosBloqueo.length} motivo(s):</span>
          </div>
          <ul className="space-y-1.5 pl-1">
            {motivosBloqueo.map((m, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-red-700">
                <span className="mt-0.5 px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px] flex-shrink-0">{m.regla}</span>
                <span>{m.mensaje}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {asignado && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-emerald-800 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Docente asignado al grupo.</span>
          </div>
          <button onClick={retirar} disabled={asignando} className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline">
            Retirar asignación
          </button>
        </div>
      )}

      {/* Acción de asignar: deshabilitada si el backend ya marcó bloqueo */}
      {docente && idGrupo.trim() && !asignado && (
        <div className="flex items-center justify-end gap-3">
          {bloqueado && (
            <span className="text-xs text-amber-700 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Bloqueo duro: revise los motivos.
            </span>
          )}
          <button
            onClick={asignar}
            disabled={asignando || bloqueado}
            className="flex items-center gap-2 px-4 py-2 bg-[#003DA5] text-white hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs rounded-xl shadow-md transition-all"
          >
            {asignando ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
            <span>Asignar al grupo</span>
          </button>
        </div>
      )}
    </div>
  );
}
