import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Loader2, Gauge, Check, Hand, RotateCcw } from 'lucide-react';

import {
  getDisponiblesPortal, getMisFranjasPortal, getAcumuladoPortal,
  tomarFranja, soltarFranja,
  type FranjaPortal, type AcumuladoDocente,
} from '../services/api/catalogoApi';

/**
 * EFDS-1938 — Portal del docente.
 *
 * El docente ve las franjas PUBLICADAS que puede tomar, toma las que le sirven y
 * suelta las que no (mientras no estén aprobadas), con su acumulado contra el
 * tope del RUND siempre a la vista.
 *
 * ⚠️ Al tomar una franja, las que cruzan con ella desaparecen de «disponibles»:
 * la exclusión la hace el backend, no esta pantalla (aquí solo se recarga). El
 * id_docente lo pone el servidor desde el token; nada de identidad por el cliente.
 *
 * Estética ESAP: azul institucional #003DA5.
 */
const DIA_ORDEN = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
const cap = (s: string) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : s);

function FilaFranja({ f, accion, etiqueta, icono, ocupado }: {
  f: FranjaPortal; accion: () => void; etiqueta: string; icono: React.ReactNode; ocupado: boolean;
}) {
  const devuelta = f.estado === 'DEVUELTA';
  return (
    <div className={`p-3 rounded-xl border ${devuelta ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{f.asignatura || 'Asignatura'}</p>
          <p className="text-[11px] text-slate-500 truncate">
            {f.programa || 'Programa'}{f.numeroGrupo != null ? ` · Grupo ${f.numeroGrupo}` : ''}
          </p>
          <p className="text-[11px] text-slate-400">
            {cap(f.diaSemana)} {f.horaInicio}–{f.horaFin}
            {' · '}{f.tipoSesion === 'mediada_tecnologia' ? 'Virtual' : `Aula ${f.aulaCodigo || '—'}`}
          </p>
        </div>
        <button type="button" onClick={accion} disabled={ocupado}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-40 active:scale-95 transition-all border
                     ${devuelta ? 'border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200' : 'border-slate-200 hover:bg-slate-50 text-[#003DA5]'}`}>
          {ocupado ? <Loader2 className="w-4 h-4 animate-spin" /> : icono}
          <span>{devuelta ? 'Corregir y re-tomar' : etiqueta}</span>
        </button>
      </div>
      {devuelta && f.comentarioJefatura && (
        <p className="mt-2 text-[11px] text-amber-800 bg-amber-100/70 rounded-lg px-2 py-1">
          <strong>Devuelta por la jefatura:</strong> {f.comentarioJefatura}
        </p>
      )}
    </div>
  );
}

export default function PortalDocenteProgramacion() {
  const [disponibles, setDisponibles] = useState<FranjaPortal[]>([]);
  const [mias, setMias] = useState<FranjaPortal[]>([]);
  const [acumulado, setAcumulado] = useState<AcumuladoDocente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);

  const ordenar = (fs: FranjaPortal[]) =>
    [...fs].sort((a, b) =>
      DIA_ORDEN.indexOf(a.diaSemana) - DIA_ORDEN.indexOf(b.diaSemana) || a.horaInicio.localeCompare(b.horaInicio));

  const recargar = useCallback(async () => {
    const [d, m, a] = await Promise.all([
      getDisponiblesPortal().catch(() => []),
      getMisFranjasPortal().catch(() => []),
      getAcumuladoPortal().catch(() => null),
    ]);
    setDisponibles(ordenar(d));
    setMias(ordenar(m));
    setAcumulado(a);
  }, []);

  useEffect(() => {
    recargar()
      .catch((e) => setError(e?.message || 'No se pudo cargar el portal.'))
      .finally(() => setCargando(false));
  }, [recargar]);

  const tomar = async (f: FranjaPortal) => {
    setAviso(''); setOcupado(f.idFranja);
    try { await tomarFranja(f.idFranja); await recargar(); }
    catch (err: any) { setAviso(err?.message || 'No se pudo tomar la franja.'); }
    finally { setOcupado(null); }
  };

  const soltar = async (f: FranjaPortal) => {
    setAviso(''); setOcupado(f.idFranja);
    try { await soltarFranja(f.idFranja); await recargar(); }
    catch (err: any) { setAviso(err?.message || 'No se pudo soltar la franja.'); }
    finally { setOcupado(null); }
  };

  const pct = acumulado && acumulado.tope > 0
    ? Math.min(100, Math.round((acumulado.totalAsignado / acumulado.tope) * 100)) : 0;
  const excedido = !!acumulado && acumulado.totalAsignado > acumulado.tope;

  if (cargando) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 p-6">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando tu programación…
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-[#003DA5]" /> Mi programación
        </h3>
        <p className="text-xs text-slate-500">
          Toma las franjas publicadas que quieras dictar. Al tomar una, las que se cruzan con ella
          dejan de ofrecerse. Puedes soltar una franja mientras la jefatura no la haya aprobado.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>}
      {aviso && <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">{aviso}</div>}

      {/* Acumulado vs tope (RN-04), en vivo */}
      {acumulado && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Gauge className="w-4 h-4 text-[#003DA5]" /> Tu carga frente al tope
          </h4>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
            <div className={`h-full ${excedido ? 'bg-red-500' : 'bg-[#003DA5]'}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>{acumulado.categoriaVinculacion}</span>
            <span><strong className="text-slate-800">{acumulado.totalAsignado} h</strong> de {acumulado.tope} h</span>
          </div>
          {excedido && <p className="text-[11px] text-red-600 font-semibold">Estás por encima del tope.</p>}
        </div>
      )}

      {/* Mis franjas */}
      <div className="space-y-2">
        <h4 className="font-bold text-slate-800 text-sm">Mis franjas ({mias.length})</h4>
        {mias.length === 0 ? (
          <p className="text-xs text-slate-400 p-3">Aún no has tomado ninguna franja.</p>
        ) : (
          <div className="space-y-2">
            {mias.map((f) => f.estado === 'APROBADA' ? (
              <div key={f.idFranja} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50/40">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{f.asignatura || 'Asignatura'}</p>
                  <p className="text-[11px] text-slate-400">{cap(f.diaSemana)} {f.horaInicio}–{f.horaFin}</p>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                  <Check className="w-3.5 h-3.5" /> Aprobada
                </span>
              </div>
            ) : (
              <FilaFranja key={f.idFranja} f={f} accion={() => soltar(f)} etiqueta="Soltar"
                icono={<RotateCcw className="w-4 h-4" />} ocupado={ocupado === f.idFranja} />
            ))}
          </div>
        )}
      </div>

      {/* Disponibles */}
      <div className="space-y-2">
        <h4 className="font-bold text-slate-800 text-sm">Franjas disponibles ({disponibles.length})</h4>
        {disponibles.length === 0 ? (
          <p className="text-xs text-slate-400 p-3">No hay franjas publicadas disponibles para ti en este momento.</p>
        ) : (
          <div className="space-y-2">
            {disponibles.map((f) => (
              <FilaFranja key={f.idFranja} f={f} accion={() => tomar(f)} etiqueta="Tomar"
                icono={<Hand className="w-4 h-4" />} ocupado={ocupado === f.idFranja} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
