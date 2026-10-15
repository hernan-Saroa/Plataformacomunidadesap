import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleSlash, FileSpreadsheet, Lock, Power } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { AfectadosPaa, ComparacionPaa, HallazgoPaa, VersionPaa } from '../../types';
import { Permitido } from '../shared/Permitido';
import { useDialogo } from '../shared/useDialogo';
import { ESTADO_VERSION, TIPO_REVISION, fechaCorta, valorPaa } from './formato';

interface Props {
  versionId: string;
  /** Después de activar o descartar: la lista de versiones cambió. */
  onCambio: () => void;
}

/** Cuántos hallazgos se listan: un archivo mal armado puede traer cientos del mismo. */
const HALLAZGOS_VISIBLES = 100;

const TRATAMIENTO: Record<string, string> = {
  SIN_CAMBIOS: 'Sin cambios',
  ACTUALIZADO: 'Se actualiza',
  MODIFICADA_SIN_EFECTO: 'Cambió, nada que aplicar',
  ELIMINADA: 'Línea retirada · se detiene',
};

/**
 * Una versión del PAA: si pasó la validación, qué cambia frente a la activa y a
 * qué procesos toca. Activarla es la última pantalla, no la primera: lo que se
 * muestra aquí es exactamente lo que hará la activación.
 */
export function DetalleVersion({ versionId, onCambio }: Props) {
  const dialogo = useDialogo();
  const [version, setVersion] = useState<VersionPaa | null>(null);
  const [comparacion, setComparacion] = useState<ComparacionPaa | null>(null);
  const [afectados, setAfectados] = useState<AfectadosPaa | null>(null);
  const [pestana, setPestana] = useState<'validacion' | 'cambios' | 'procesos'>('validacion');
  const [ocupado, setOcupado] = useState(false);

  const leer = async () => {
    const v = await contratacionService.paa.version(versionId);
    setVersion(v);
    if (v.comparacion) contratacionService.paa.comparacion(versionId).then(setComparacion).catch(() => null);
    if (v.estado === 'VALIDADA') contratacionService.paa.afectados(versionId).then(setAfectados).catch(() => null);
    // Lo primero que interesa: si tiene errores, eso; si no, qué cambia.
    setPestana(v.errores.length ? 'validacion' : v.comparacion ? 'cambios' : 'validacion');
  };

  useEffect(() => {
    leer().catch((err: any) => toast.error('No se pudo leer la versión', { description: err.message }));
  }, [versionId]);

  if (!version) return <p className="text-xs text-gray-400 m-0">Cargando la versión…</p>;

  const activar = async () => {
    const r = afectados?.resumen;
    const ok = await dialogo.confirmar({
      titulo: `Activar la versión ${version.numero} del PAA ${version.anio} de ${version.documento.nombre}`,
      descripcion: r
        ? `Reemplaza a la activa. ${r.actualizados} proceso(s) se actualizan, ${r.revisiones} quedan con revisión y ${r.bloqueados} se detienen hasta que se decida. Si algo falla, no cambia nada.`
        : 'Será la versión de la que salen los procesos nuevos de esta vigencia.',
      confirmar: 'Activar la versión',
    });
    if (!ok) return;
    setOcupado(true);
    try {
      const resultado = await contratacionService.paa.activar(version.id);
      toast.success(`Versión ${resultado.version.numero} activa`, {
        description: `${resultado.resumen.actualizados} proceso(s) actualizados · ${resultado.resumen.revisiones} revisión(es) abiertas`,
      });
      await leer();
      onCambio();
    } catch (err: any) {
      toast.error('No se activó la versión', { description: err.message });
    } finally {
      setOcupado(false);
    }
  };

  const descartar = async () => {
    const motivo = await dialogo.pedirMotivo({
      titulo: `Descartar la versión ${version.numero}`,
      descripcion: 'No se activa. Queda en el historial con su comparación y este motivo.',
      confirmar: 'Descartar',
      tono: 'peligro',
    });
    if (motivo === null) return;
    setOcupado(true);
    try {
      await contratacionService.paa.descartar(version.id, motivo);
      toast.success('Versión descartada');
      await leer();
      onCambio();
    } catch (err: any) {
      toast.error('No se descartó', { description: err.message });
    } finally {
      setOcupado(false);
    }
  };

  const estado = ESTADO_VERSION[version.estado];
  const confiable = version.comparacion?.confiable !== false;

  return (
    <div className="space-y-3">
      {dialogo.elemento}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" aria-hidden="true" />
            <span className="break-words">{version.nombreArchivo}</span>
          </p>
          <p className="m-0 mt-0.5 text-xs text-gray-500">
            Cargada por {version.cargadaPor ?? '—'} el {fechaCorta(version.cargadaAt)}
            {version.activadaAt && ` · activada por ${version.activadaPor} el ${fechaCorta(version.activadaAt)}`}
            {version.descartadaAt && ` · descartada por ${version.descartadaPor}: «${version.motivoDescarte}»`}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${estado.clase}`}>{estado.etiqueta}</span>
      </div>

      {version.porRegion.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {version.porRegion.map((r) => (
            <span key={r.id} className="rounded-lg border border-gray-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
              <span className="font-bold">{r.lineas}</span> líneas · {r.nombre}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1 border-b border-gray-200" role="tablist">
        <Pestana activa={pestana === 'validacion'} onClick={() => setPestana('validacion')}>
          Validación ({version.errores.length} errores · {version.advertencias.length} advertencias)
        </Pestana>
        {version.comparacion && (
          <Pestana activa={pestana === 'cambios'} onClick={() => setPestana('cambios')}>
            Qué cambia
          </Pestana>
        )}
        {version.estado === 'VALIDADA' && (
          <Pestana activa={pestana === 'procesos'} onClick={() => setPestana('procesos')}>
            Procesos afectados {afectados ? `(${afectados.resumen.procesos})` : ''}
          </Pestana>
        )}
      </div>

      {pestana === 'validacion' && <Validacion errores={version.errores} advertencias={version.advertencias} />}
      {pestana === 'cambios' && version.comparacion && (
        <Cambios resumen={version.comparacion} detalle={comparacion} />
      )}
      {pestana === 'procesos' && <Afectados afectados={afectados} />}

      {version.estado === 'VALIDADA' && (
        <Permitido accion="aprobar" punto="PAA" quien="la Dirección de Contratación">
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 pt-3">
            {!confiable && (
              <p className="m-0 mr-auto text-xs text-red-700">
                No se puede activar: la comparación no es confiable.
              </p>
            )}
            <button
              type="button"
              onClick={descartar}
              disabled={ocupado}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-gray-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <CircleSlash className="w-3.5 h-3.5" aria-hidden="true" />
              Descartar
            </button>
            <button
              type="button"
              onClick={activar}
              disabled={ocupado || !confiable}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold rounded-lg text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm disabled:opacity-50"
            >
              <Power className="w-3.5 h-3.5" aria-hidden="true" />
              {ocupado ? 'Activando…' : 'Activar esta versión'}
            </button>
          </div>
        </Permitido>
      )}
    </div>
  );
}

function Pestana({ activa, onClick, children }: { activa: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={activa}
      onClick={onClick}
      className={`px-3 py-2 text-xs font-bold border-b-2 pestana-paa ${
        activa ? 'border-[#003DA5] text-[#003DA5]' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

function Validacion({ errores, advertencias }: { errores: HallazgoPaa[]; advertencias: HallazgoPaa[] }) {
  if (!errores.length && !advertencias.length) {
    return (
      <p className="m-0 flex items-center gap-1.5 text-xs text-emerald-700">
        <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
        El archivo cumple el formato: columnas completas, códigos únicos y valores válidos.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {errores.length > 0 && (
        <TablaHallazgos
          titulo={`${errores.length} error(es): mientras los tenga, el archivo no se puede activar`}
          tono="error"
          hallazgos={errores}
        />
      )}
      {advertencias.length > 0 && (
        <TablaHallazgos titulo={`${advertencias.length} advertencia(s): no impiden activarlo`} tono="aviso" hallazgos={advertencias} />
      )}
    </div>
  );
}

function TablaHallazgos({ titulo, tono, hallazgos }: { titulo: string; tono: 'error' | 'aviso'; hallazgos: HallazgoPaa[] }) {
  return (
    <div>
      <p className={`m-0 mb-1.5 flex items-center gap-1.5 text-xs font-bold ${tono === 'error' ? 'text-red-700' : 'text-amber-800'}`}>
        <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
        {titulo}
      </p>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-left text-gray-500">
            <tr>
              <th className="px-2.5 py-1.5 font-bold">Fila</th>
              <th className="px-2.5 py-1.5 font-bold">Columna</th>
              <th className="px-2.5 py-1.5 font-bold">Valor</th>
              <th className="px-2.5 py-1.5 font-bold">Qué pasa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {hallazgos.slice(0, HALLAZGOS_VISIBLES).map((h, i) => (
              <tr key={i}>
                <td className="px-2.5 py-1.5 tabular-nums whitespace-nowrap">{h.fila ?? '—'}</td>
                <td className="px-2.5 py-1.5">{h.columna ?? '—'}</td>
                <td className="px-2.5 py-1.5 break-words">{h.valor ?? '—'}</td>
                <td className="px-2.5 py-1.5 text-slate-700">{h.mensaje}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hallazgos.length > HALLAZGOS_VISIBLES && (
        <p className="m-0 mt-1 text-xs text-gray-500">
          Se muestran los primeros {HALLAZGOS_VISIBLES} de {hallazgos.length}. Corrigiendo estos suelen desaparecer los demás.
        </p>
      )}
    </div>
  );
}

function Cambios({ resumen, detalle }: { resumen: NonNullable<VersionPaa['comparacion']>; detalle: ComparacionPaa | null }) {
  const [ver, setVer] = useState<'modificadas' | 'nuevas' | 'eliminadas'>('modificadas');
  const r = resumen.resumen;
  const nombreRegion = (id: string) => detalle?.regiones.find((x) => x.id === id)?.nombre ?? '';

  return (
    <div className="space-y-3">
      <p className="m-0 text-xs text-gray-600">
        Frente a la versión {resumen.base?.numero} del PAA {resumen.base?.anio}
        {resumen.tipo === 'CAMBIO_VIGENCIA' && ' (otra vigencia: comparación solo informativa)'}.
      </p>
      {resumen.avisos.map((a) => (
        <p key={a} className={`m-0 rounded-lg border px-3 py-2 text-xs ${resumen.confiable ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-red-200 bg-red-50 text-red-800'}`}>
          {a}
        </p>
      ))}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Cifra activa={ver === 'modificadas'} onClick={() => setVer('modificadas')} valor={r.modificadas} etiqueta="modificadas" />
        <Cifra activa={ver === 'nuevas'} onClick={() => setVer('nuevas')} valor={r.nuevas} etiqueta="nuevas" />
        <Cifra activa={ver === 'eliminadas'} onClick={() => setVer('eliminadas')} valor={r.eliminadas} etiqueta="retiradas" />
      </div>
      <p className="m-0 text-xs text-gray-500">
        {r.sinCambios} líneas sin cambios
        {r.columnasNuevas + r.columnasRetiradas > 0 &&
          ` · ${r.columnasNuevas} columna(s) nueva(s) y ${r.columnasRetiradas} retirada(s): revisa los campos del formulario`}
      </p>

      {!detalle ? (
        <p className="m-0 text-xs text-gray-400">Cargando el detalle…</p>
      ) : (
        <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {ver === 'modificadas' &&
            detalle.detalle.modificadas.map((l) => (
              <div key={l.codigo} className="px-3 py-2">
                <p className="m-0 text-xs">
                  <span className="font-mono font-bold text-[#003DA5]">{l.codigo}</span>{' '}
                  <span className="text-gray-500">· {nombreRegion(l.regionId)}</span>
                </p>
                <p className="m-0 text-xs text-slate-600 line-clamp-2">{l.objeto}</p>
                <ul className="cambios-paa m-0 mt-1 space-y-0.5">
                  {l.cambios.map((c) => (
                    <li key={c.campo} className="text-xs text-slate-700">
                      <span className="font-bold">{c.etiqueta}:</span>{' '}
                      <span className="line-through text-red-700">{valorPaa(c.campo, c.antes)}</span>
                      {' → '}
                      <span className="text-emerald-700">{valorPaa(c.campo, c.despues)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          {ver !== 'modificadas' &&
            detalle.detalle[ver].map((l) => (
              <div key={l.codigo} className="px-3 py-2">
                <p className="m-0 text-xs">
                  <span className="font-mono font-bold text-[#003DA5]">{l.codigo}</span>{' '}
                  <span className="text-gray-500">· {nombreRegion(l.regionId)}</span>
                </p>
                <p className="m-0 text-xs text-slate-600 line-clamp-2">{l.objeto}</p>
              </div>
            ))}
          {detalle.detalle[ver].length === 0 && <p className="m-0 px-3 py-3 text-xs text-gray-500">Ninguna.</p>}
        </div>
      )}
    </div>
  );
}

function Cifra({ valor, etiqueta, activa, onClick }: { valor: number; etiqueta: string; activa: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={`rounded-lg border px-3 py-2 text-left ${activa ? 'border-[#003DA5] bg-[#003DA5]/5' : 'border-gray-200 bg-white hover:bg-slate-50'}`}
    >
      <span className="block text-2xl font-extrabold text-slate-800 tabular-nums">{valor}</span>
      <span className="block text-xs text-gray-500">líneas {etiqueta}</span>
    </button>
  );
}

function Afectados({ afectados }: { afectados: AfectadosPaa | null }) {
  if (!afectados) return <p className="m-0 text-xs text-gray-400">Calculando a qué procesos toca…</p>;
  if (!afectados.versionActiva) {
    return (
      <p className="m-0 text-xs text-gray-600">
        Es la primera versión de la vigencia {afectados.anio}: ningún proceso nació todavía de este PAA.
      </p>
    );
  }
  const r = afectados.resumen;
  const tocados = afectados.procesos.filter((p) => p.tratamiento !== 'SIN_CAMBIOS');
  return (
    <div className="space-y-2">
      <p className="m-0 text-xs text-gray-600">
        De {r.procesos} proceso(s) en curso de esta vigencia: {r.actualizados} se actualizan, {r.revisiones} quedan con revisión
        y {r.bloqueados} se detienen. Los adjudicados, desiertos, negados y cancelados no se tocan.
      </p>
      {tocados.length === 0 ? (
        <p className="m-0 text-xs text-emerald-700">Ningún proceso en curso usa las líneas que cambian.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-left text-gray-500">
              <tr>
                <th className="px-2.5 py-1.5 font-bold">Proceso</th>
                <th className="px-2.5 py-1.5 font-bold">Línea</th>
                <th className="px-2.5 py-1.5 font-bold">Qué le pasa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tocados.map((p) => (
                <tr key={p.procesoId}>
                  <td className="px-2.5 py-1.5">
                    <span className="font-bold">{p.radicado}</span>
                    <span className="block text-gray-500 line-clamp-2">{p.objeto}</span>
                  </td>
                  <td className="px-2.5 py-1.5 font-mono whitespace-nowrap">{p.codigo}</td>
                  <td className="px-2.5 py-1.5">
                    <span className="inline-flex items-center gap-1 font-bold">
                      {p.revision?.bloquea && <Lock className="w-3 h-3 text-red-700" aria-hidden="true" />}
                      {TRATAMIENTO[p.tratamiento]}
                    </span>
                    {p.cambios.proceso.map((c) => (
                      <span key={c.campo} className={`block ${c.aplicado ? 'text-slate-600' : 'text-amber-800'}`}>
                        {c.etiqueta}: {valorPaa(c.campo, c.antes)} → {valorPaa(c.campo, c.despues)}
                        {!c.aplicado && ` (no se aplica: ${c.motivo})`}
                      </span>
                    ))}
                    {p.revision && <span className="block text-gray-500">{TIPO_REVISION[p.revision.tipo]}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
