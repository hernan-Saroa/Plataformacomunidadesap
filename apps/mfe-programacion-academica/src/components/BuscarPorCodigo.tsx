import { useState } from 'react';
import { AlertCircle, Hash, Loader2, Lock, Search, Sparkles } from 'lucide-react';

import { getAsignaturaPorCodigo, type AsignaturaSnies } from '../services/api/catalogoApi';

/**
 * EFDS-1369 — Búsqueda de asignatura por código único (llave maestra, RN-01).
 *
 * El programador escribe el código y el sistema autocompleta los siete campos
 * maestros del SNIES. Todo el panel es de SOLO LECTURA (RN-02): no hay inputs
 * editables, y el backend además rechaza cualquier escritura — deshabilitar la
 * UI no es hacer cumplir la regla, es solo no invitar al error.
 *
 * ⚠️ Las horas se muestran tal como vienen del catálogo. No se calculan aquí ni
 * se derivan de los créditos.
 */

const ETIQUETA_MODALIDAD: Record<string, string> = {
  presencial: 'Presencial',
  presencial_dia: 'Presencial diurno',
  presencial_noche: 'Presencial nocturno',
  virtual: 'Virtual',
  distancia: 'Distancia',
  mixta: 'Mixta',
  sin_definir: 'Por definir',
};

const ETIQUETA_EXCEPCION: Record<string, string> = {
  seminario_enfasis: 'Seminario de énfasis',
  opciones_grado_ap: 'Opciones de grado AP',
  seminario_opciones_apt: 'Seminario de opciones APT',
};

const legible = (v: string | null | undefined, mapa: Record<string, string>) =>
  !v ? '—' : (mapa[v] ?? v);

function Campo({ etiqueta, valor, ancho = '' }: { etiqueta: string; valor: React.ReactNode; ancho?: string }) {
  return (
    <div className={ancho}>
      <p className="text-[0.62rem] font-bold text-slate-400 uppercase tracking-wider">{etiqueta}</p>
      <p className="text-sm font-semibold text-slate-800 mt-0.5 break-words">{valor}</p>
    </div>
  );
}

export function BuscarPorCodigo() {
  const [codigo, setCodigo] = useState('');
  const [datos, setDatos] = useState<AsignaturaSnies | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState('');

  const buscar = async () => {
    const limpio = codigo.trim();
    if (!limpio) return;
    setBuscando(true);
    setError('');
    setDatos(null);
    try {
      setDatos(await getAsignaturaPorCodigo(limpio));
    } catch (e: any) {
      // El backend dice qué código no existe o de qué nivel es: se muestra tal cual.
      setError(e?.message || 'No se pudo consultar la asignatura.');
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-[#003DA5]" />
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
            Buscar por código de asignatura
          </h3>
        </div>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          El código es la llave maestra: resuelve los datos oficiales del SNIES.
        </p>
      </div>

      <div className="p-4 flex items-end gap-3 flex-wrap bg-slate-50/60 border-b border-slate-100">
        <label className="flex flex-col gap-1.5 flex-1 min-w-[220px]">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Código</span>
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') buscar(); }}
            placeholder="Por ejemplo: ASIG-00132"
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </label>
        <button
          onClick={buscar}
          disabled={buscando || !codigo.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
          style={{ background: buscando || !codigo.trim() ? '#9CA3AF' : '#003DA5' }}
        >
          {buscando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          {buscando ? 'Buscando…' : 'Buscar'}
        </button>
      </div>

      {error && (
        <div className="m-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {datos && (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#003DA5]" />
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
              Datos oficiales del SNIES
            </span>
            <span className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-[0.62rem] font-bold text-slate-500">
              <Lock className="w-3 h-3" /> Solo lectura
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/40">
            <p className="text-base font-black text-slate-800">{datos.nombre}</p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{datos.codigo}</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <Campo etiqueta="Créditos" valor={datos.creditos} />
              <Campo etiqueta="Horas de clase" valor={datos.horasClase ?? '—'} />
              <Campo etiqueta="Horas PTA" valor={datos.horasPta ?? '—'} />
              <Campo etiqueta="Pensum" valor={datos.pensum ?? '—'} />
              <Campo etiqueta="Modalidad" valor={legible(datos.modalidad, ETIQUETA_MODALIDAD)} />
              <Campo etiqueta="Metodología" valor={legible(datos.metodologia, ETIQUETA_MODALIDAD)} />
              <Campo etiqueta="Semestre" valor={datos.semestre?.etiqueta ?? '—'} />
              <Campo etiqueta="Nivel" valor={datos.nivel === 'pregrado' ? 'Pregrado' : 'Posgrado'} />
              <Campo etiqueta="Programa" valor={datos.programa.nombre} ancho="col-span-2 md:col-span-4" />
            </div>

            {datos.tipoExcepcion && (
              <div className="mt-4 p-3 rounded-lg border border-blue-100 bg-blue-50/70">
                <p className="text-[0.62rem] font-bold text-[#003DA5] uppercase tracking-wider">
                  Excepción de la Circular 003 de 2025
                </p>
                <p className="text-sm text-slate-700 mt-0.5">
                  {legible(datos.tipoExcepcion, ETIQUETA_EXCEPCION)} — sus horas son fijas por norma
                  {datos.horasPta ? ` (${datos.horasPta} h)` : ''}, no se derivan de los créditos.
                </p>
              </div>
            )}
          </div>

          <p className="text-[0.68rem] text-slate-400 font-medium mt-3">
            Estos datos los define el SNIES y no se editan desde este módulo. Las horas se muestran
            tal como vienen del catálogo.
          </p>
        </div>
      )}
    </div>
  );
}
