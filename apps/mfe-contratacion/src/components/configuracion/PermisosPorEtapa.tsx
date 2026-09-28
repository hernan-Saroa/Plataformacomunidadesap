import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Info, Search } from 'lucide-react';

import { puede } from '../../auth/alcance';
import { contratacionService } from '../../services/contratacionService';
import { AccionAlcance, AlcanceVista, EtapaConActividades, RolConAlcance } from '../../types';
import { useDialogo } from '../shared/useDialogo';
import { NOMBRE_ETAPA } from './simbolos';

/**
 * Permisos por etapa, punto y acción (migración 083).
 *
 * El permiso dice qué puede hacer un rol —ver, editar, aprobar, decidir— y se
 * da en el backoffice de roles de la plataforma, que no es de este módulo.
 * Aquí se dice dónde: en qué etapas enteras, en qué puntos sueltos o en todo
 * el módulo. El área Legal que ve la etapa 3, la 4 y solo la 7.2 de la 7 es un
 * permiso y tres casillas, no tres permisos.
 *
 * La pantalla enseña las dos capas juntas y avisa cuando no coinciden —una
 * casilla de «Editar» en un rol al que el backoffice no le dio ese permiso no
 * tiene efecto—, pero solo escribe la suya.
 */

const ACCIONES: { accion: AccionAlcance; nombre: string; ayuda: string }[] = [
  { accion: 'ver', nombre: 'Ver', ayuda: 'Consultar el punto, sus documentos y su historial' },
  { accion: 'editar', nombre: 'Editar', ayuda: 'Diligenciar formularios, adjuntar documentos, enviar a revisión y hacer solicitudes' },
  { accion: 'aprobar', nombre: 'Aprobar', ayuda: 'Aprobar, devolver o avalar lo que diligenció otra persona' },
  {
    accion: 'decidir',
    nombre: 'Decidir',
    ayuda: 'Tomar las decisiones que comprometen a la entidad: adjudicar, expedir, pagar, conceder o sancionar',
  },
];

const NOMBRE_ACCION: Record<AccionAlcance, string> = {
  ver: 'Ver',
  editar: 'Editar',
  aprobar: 'Aprobar',
  decidir: 'Decidir',
};

/** Los trámites del incumplimiento, que no tienen numeral en la matriz. */
const TRAMITES = [
  { lugar: 'INC.1', nombre: 'Reporte de presunto incumplimiento' },
  { lugar: 'INC.2', nombre: 'Trámite sancionatorio' },
];

/**
 * Los perfiles por defecto (EFDS-1183), como punto de partida.
 *
 * Catorce roles confunden a quien configura, y la Dirección los resumió en
 * cinco perfiles. Cada uno lo encarna un rol del catálogo; partir de un perfil
 * copia el alcance vigente de ese rol, así que si la Dirección cambia lo que
 * hace el abogado, el perfil cambia con él sin tocar el código.
 */
const PERFILES = [
  {
    nombre: 'Área solicitante',
    rol: 'ESTRUCTURADOR_TECNICO',
    queHace: 'Diligencia el estudio previo (3.1 y 3.2) y lo corrige si se lo devuelven; después solo consulta.',
  },
  {
    nombre: 'Contratación',
    rol: 'GESTOR_CONTRATACION',
    queHace: 'Recibe el proceso en la 3.3, asigna el abogado y lleva el expediente de ahí en adelante.',
  },
  {
    nombre: 'Abogado',
    rol: 'REVISOR_CONTRATACION',
    queHace: 'Revisa en la 3.4 (aprueba, devuelve o niega) y aprueba lo que carga Contratación.',
  },
  {
    nombre: 'Financiera',
    rol: 'ESTRUCTURADOR_FINANCIERO',
    queHace: 'Gestiona el CDP, el RP, los pagos avalados y el cierre financiero; el resto del proceso solo lo consulta.',
  },
  { nombre: 'Consulta', rol: 'ENTE_DE_CONTROL', queHace: 'Consulta todo el proceso sin modificar nada.' },
];

const clave = (accion: AccionAlcance, lugar: string) => `${accion}|${lugar}`;

function aLista(claves: Set<string>): AlcanceVista[] {
  return [...claves].map((c) => {
    const [accion, lugar] = c.split('|');
    return { accion: accion as AccionAlcance, lugar };
  });
}

/** Qué fila más ancha cubre ya este lugar, para decirlo en vez de marcarlo dos veces. */
function cubiertoPor(marcadas: Set<string>, accion: AccionAlcance, lugar: string): string | null {
  if (lugar !== 'TODO' && marcadas.has(clave(accion, 'TODO'))) return 'todo el módulo';
  const punto = /^(\d{1,2})\.\d{1,2}$/.exec(lugar);
  if (punto && marcadas.has(clave(accion, `E${Number(punto[1])}`))) {
    return `la etapa ${Number(punto[1])} completa`;
  }
  return null;
}

export function PermisosPorEtapa() {
  const [roles, setRoles] = useState<RolConAlcance[] | null>(null);
  const [catalogo, setCatalogo] = useState<EtapaConActividades[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [elegidoId, setElegidoId] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Set<string>>(new Set());
  const [abiertas, setAbiertas] = useState<Set<number>>(new Set());
  const [busqueda, setBusqueda] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const dialogo = useDialogo();

  useEffect(() => {
    Promise.all([contratacionService.alcanceRoles(), contratacionService.catalogoActividades()])
      .then(([r, c]) => {
        setRoles(r);
        setCatalogo(c);
        if (r.length) elegir(r[0]);
      })
      .catch((err: any) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const elegido = roles?.find((r) => r.id === elegidoId) ?? null;

  const guardado = useMemo(
    () => new Set((elegido?.alcances ?? []).map((a) => clave(a.accion, a.lugar))),
    [elegido],
  );

  const sucio =
    guardado.size !== borrador.size || [...borrador].some((c) => !guardado.has(c));

  function elegir(rol: RolConAlcance) {
    setElegidoId(rol.id);
    setBorrador(new Set(rol.alcances.map((a) => clave(a.accion, a.lugar))));
    setAviso(null);
    // Se abren las etapas donde tiene algún punto suelto: son las que hay que
    // mirar, y cerradas esconderían justo lo que distingue a este rol.
    setAbiertas(
      new Set(
        rol.alcances
          .map((a) => /^(\d{1,2})\.\d{1,2}$/.exec(a.lugar))
          .filter((m): m is RegExpExecArray => !!m)
          .map((m) => Number(m[1])),
      ),
    );
  }

  const alternar = (accion: AccionAlcance, lugar: string) =>
    setBorrador((previo) => {
      const siguiente = new Set(previo);
      const c = clave(accion, lugar);
      if (siguiente.has(c)) siguiente.delete(c);
      else siguiente.add(c);
      return siguiente;
    });

  const alternarEtapa = (etapa: number) =>
    setAbiertas((previas) => {
      const siguiente = new Set(previas);
      if (siguiente.has(etapa)) siguiente.delete(etapa);
      else siguiente.add(etapa);
      return siguiente;
    });

  /** Acciones marcadas que el backoffice no le dio al rol: no tienen efecto. */
  const sinPermiso = useMemo(() => {
    if (!elegido) return [];
    const usadas = new Set(aLista(borrador).map((a) => a.accion));
    return ACCIONES.map((a) => a.accion).filter((a) => usadas.has(a) && !elegido.acciones.includes(a));
  }, [borrador, elegido]);

  /**
   * Los puntos donde el mismo rol diligencia y aprueba.
   *
   * No se impide —puede haber una razón—, pero se dice: la separación entre
   * quien hace y quien revisa ya no la garantiza el catálogo de permisos sino
   * esta matriz y las reglas del servicio.
   */
  const conflictos = useMemo(() => {
    const lista = aLista(borrador);
    return catalogo
      .flatMap((e) => e.actividades.filter((a) => a.activa).map((a) => a.numeral))
      .filter((n) => puede(lista, 'editar', n) && puede(lista, 'aprobar', n));
  }, [borrador, catalogo]);

  const sinRatificar = elegido?.alcances.filter((a) => a.confirmado === false).length ?? 0;

  const rolesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!roles) return [];
    if (!texto) return roles;
    return roles.filter(
      (r) => r.nombre.toLowerCase().includes(texto) || r.codigo.toLowerCase().includes(texto),
    );
  }, [roles, busqueda]);

  async function guardar() {
    if (!elegido) return;
    setGuardando(true);
    setAviso(null);
    try {
      const actualizado = await contratacionService.guardarAlcanceRol(elegido.id, aLista(borrador));
      setRoles((previos) => (previos ?? []).map((r) => (r.id === actualizado.id ? actualizado : r)));
      setBorrador(new Set(actualizado.alcances.map((a) => clave(a.accion, a.lugar))));
      setAviso('Guardado. Los cambios se aplican en menos de un minuto.');
    } catch (err: any) {
      setAviso(null);
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  if (error && !roles) {
    return (
      <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
        <p className="text-[12.5px] text-red-800 m-0">{error}</p>
      </div>
    );
  }

  if (!roles) {
    return (
      <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 rounded bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  /** Una celda de la matriz. */
  const celda = (accion: AccionAlcance, lugar: string, etiqueta: string) => {
    const marcada = borrador.has(clave(accion, lugar));
    const porArriba = marcada ? null : cubiertoPor(borrador, accion, lugar);
    return (
      <td key={accion} className="border-b border-gray-100 px-2 py-1.5 text-center">
        <input
          type="checkbox"
          checked={marcada || porArriba !== null}
          disabled={porArriba !== null || guardando}
          onChange={() => alternar(accion, lugar)}
          aria-label={`${NOMBRE_ACCION[accion]} en ${etiqueta}`}
          title={porArriba ? `Ya lo cubre ${porArriba}` : undefined}
          className="h-4 w-4 accent-[#003DA5] disabled:opacity-40"
        />
      </td>
    );
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 space-y-2">
        <p className="m-0 text-xs text-gray-600 leading-relaxed">
          Elige un rol y marca dónde puede <strong className="font-bold text-gray-700">ver, editar,
          aprobar o decidir</strong>: en todo el módulo, en una etapa completa o en actividades
          puntuales. Para que una columna tenga efecto, el rol también necesita ese permiso en la
          administración de roles de la plataforma.
        </p>
      </div>

      <div className="permisos-etapa">
        {/* Los roles */}
        <div className="rounded-xl border border-gray-200 bg-white p-2 space-y-2 self-start">
          <label className="relative flex items-center">
            <Search className="w-4 h-4 text-gray-400 absolute left-2.5" aria-hidden />
            <span className="sr-only">Buscar un rol</span>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar un rol"
              className="w-full rounded-lg border border-gray-300 py-1.5 pl-8 pr-3 text-[12.5px] focus:border-[#003DA5] focus:outline-none"
            />
          </label>
          <ul className="m-0 p-0 list-none space-y-0.5">
            {rolesFiltrados.map((rol) => (
              <li key={rol.id}>
                <button
                  type="button"
                  onClick={async () => {
                    if (rol.id === elegidoId) return;
                    if (
                      sucio &&
                      !(await dialogo.confirmar({
                        titulo: 'Hay cambios sin guardar',
                        descripcion: `Los permisos que marcaste para ${elegido?.nombre ?? 'este rol'} se perderán si cambias de rol.`,
                        confirmar: 'Descartar y cambiar',
                        tono: 'peligro',
                      }))
                    )
                      return;
                    elegir(rol);
                  }}
                  aria-pressed={rol.id === elegidoId}
                  className={`w-full rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                    rol.id === elegidoId ? 'bg-blue-50 text-[#003DA5]' : 'hover:bg-gray-50 text-slate-700'
                  }`}
                >
                  <span className="block text-[12.5px] font-semibold">{rol.nombre}</span>
                  <span className="block text-[10.5px] text-gray-400">
                    {rol.acciones.length
                      ? rol.acciones.map((a) => NOMBRE_ACCION[a]).join(' · ')
                      : 'Sin permisos en Contratación'}
                  </span>
                </button>
              </li>
            ))}
            {rolesFiltrados.length === 0 && (
              <li className="px-2.5 py-3 text-[12.5px] text-gray-500">Ningún rol coincide con la búsqueda.</li>
            )}
          </ul>
        </div>

        {/* La matriz del rol elegido */}
        {elegido && (
          <div className="space-y-2 min-w-0">
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="m-0 text-[13px] font-bold text-slate-800">{elegido.nombre}</p>
                <p className="m-0 text-[10.5px] font-mono text-gray-400">{elegido.codigo}</p>
              </div>
              {elegido.descripcion && (
                <p className="m-0 text-[11.5px] text-slate-600 leading-relaxed">{elegido.descripcion}</p>
              )}
              {elegido.transversales.length > 0 && (
                <p className="m-0 text-[11.5px] text-gray-500">
                  También puede, fuera de las etapas: {elegido.transversales.join(', ')}
                </p>
              )}

              {sinPermiso.length > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" aria-hidden />
                  <p className="m-0 text-[11.5px] text-amber-800 leading-relaxed">
                    <strong className="font-bold">Sin efecto todavía.</strong> Este rol no tiene el
                    permiso {sinPermiso.map((a) => `«${NOMBRE_ACCION[a]}»`).join(' ni ')} en la
                    administración de roles de la plataforma. Esas casillas empezarán a funcionar
                    cuando se lo asignen allí.
                  </p>
                </div>
              )}

              {conflictos.length > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" aria-hidden />
                  <p className="m-0 text-[11.5px] text-amber-800 leading-relaxed">
                    <strong className="font-bold">Diligencia y aprueba lo mismo</strong> en{' '}
                    {conflictos.length > 6
                      ? `${conflictos.slice(0, 6).join(', ')} y ${conflictos.length - 6} actividades más`
                      : conflictos.join(', ')}
                    . El sistema no deja que una persona apruebe lo que ella misma envió, pero lo
                    recomendable es que la revisión la haga otro rol.
                  </p>
                </div>
              )}

              {/* Partir de un perfil: copia el alcance del rol que lo encarna. Solo
                  los que existen en esta instalación y no son el rol elegido. */}
              {(() => {
                const disponibles = PERFILES.filter(
                  (p) => p.rol !== elegido.codigo && roles.some((r) => r.codigo === p.rol),
                );
                if (!disponibles.length) return null;
                return (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11.5px] text-gray-500">Copiar los permisos de un perfil:</span>
                    {disponibles.map((p) => (
                      <button
                        key={p.rol}
                        type="button"
                        title={p.queHace}
                        disabled={guardando}
                        onClick={() => {
                          const origen = roles.find((r) => r.codigo === p.rol)!;
                          setBorrador(new Set(origen.alcances.map((a) => clave(a.accion, a.lugar))));
                          setAviso(`Copiamos los permisos del perfil ${p.nombre}. Revísalos y pulsa «Guardar cambios».`);
                        }}
                        className="rounded-full border border-gray-300 bg-white px-2.5 py-0.5 text-[11.5px] font-semibold text-slate-700 hover:border-[#003DA5] hover:text-[#003DA5] disabled:opacity-40"
                      >
                        {p.nombre}
                      </button>
                    ))}
                  </div>
                );
              })()}

              {sinRatificar > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <Info className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" aria-hidden />
                  <p className="m-0 text-[11.5px] text-gray-600 leading-relaxed">
                    <strong className="font-bold">
                      {sinRatificar === 1 ? '1 casilla por confirmar.' : `${sinRatificar} casillas por confirmar.`}
                    </strong>{' '}
                    Se copiaron de lo que el rol podía hacer antes de esta pantalla. Revísalas y pulsa
                    «Confirmar» o guarda tus cambios para dejarlas confirmadas.
                  </p>
                </div>
              )}
            </div>

            <div className="overflow-auto rounded-xl border border-gray-200 bg-white max-h-[560px]">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-gray-50">
                    <th className="border-b border-gray-200 px-3 py-2 text-left text-[11.5px] font-bold uppercase tracking-wide text-gray-600">
                      Etapa o actividad
                    </th>
                    {ACCIONES.map((a) => (
                      <th
                        key={a.accion}
                        title={a.ayuda}
                        className={`border-b border-gray-200 px-2 py-2 text-center text-[11.5px] font-bold tracking-wide ${
                          elegido.acciones.includes(a.accion) ? 'text-gray-600' : 'text-gray-300'
                        }`}
                      >
                        {a.nombre}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-blue-50">
                    <th scope="row" className="border-b border-gray-100 px-3 py-1.5 text-left text-[12.5px] font-bold text-slate-800">
                      Todo el módulo
                    </th>
                    {ACCIONES.map((a) => celda(a.accion, 'TODO', 'todo el módulo'))}
                  </tr>

                  {catalogo.map(({ etapa, actividades }) => {
                    const abierta = abiertas.has(etapa);
                    const activas = actividades.filter((a) => a.activa);
                    return (
                      <React.Fragment key={etapa}>
                        <tr className="bg-gray-50">
                          <th scope="row" className="border-b border-gray-100 px-3 py-1.5 text-left">
                            <button
                              type="button"
                              onClick={() => alternarEtapa(etapa)}
                              aria-expanded={abierta}
                              className="flex items-center gap-1.5 text-[12.5px] font-bold text-slate-700 hover:text-[#003DA5]"
                            >
                              {abierta ? (
                                <ChevronDown className="w-3.5 h-3.5" aria-hidden />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" aria-hidden />
                              )}
                              Etapa {etapa} · {NOMBRE_ETAPA[etapa] ?? ''}
                              <span className="font-normal text-gray-400">({activas.length})</span>
                            </button>
                          </th>
                          {ACCIONES.map((a) => celda(a.accion, `E${etapa}`, `la etapa ${etapa}`))}
                        </tr>
                        {abierta &&
                          activas.map((act) => (
                            <tr key={act.numeral}>
                              <th
                                scope="row"
                                className="border-b border-gray-100 py-1.5 pl-9 pr-3 text-left text-[12px] font-normal text-slate-600"
                              >
                                <span className="font-mono text-gray-400 mr-1.5">{act.numeral}</span>
                                {act.nombre}
                              </th>
                              {ACCIONES.map((a) => celda(a.accion, act.numeral, act.numeral))}
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  })}

                  <tr className="bg-gray-50">
                    <th scope="row" className="border-b border-gray-100 px-3 py-1.5 text-left text-[12.5px] font-bold text-slate-700">
                      Incumplimiento
                      <span className="block text-[10.5px] font-normal text-gray-400">
                        Se configura aparte de la etapa 9: quien reporta no es quien tramita ni decide
                      </span>
                    </th>
                    <td colSpan={4} className="border-b border-gray-100" />
                  </tr>
                  {TRAMITES.map((t) => (
                    <tr key={t.lugar}>
                      <th
                        scope="row"
                        className="border-b border-gray-100 py-1.5 pl-9 pr-3 text-left text-[12px] font-normal text-slate-600"
                      >
                        <span className="font-mono text-gray-400 mr-1.5">{t.lugar}</span>
                        {t.nombre}
                      </th>
                      {ACCIONES.map((a) => celda(a.accion, t.lugar, t.nombre))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {aviso && (
                <p role="status" className="m-0 mr-auto text-[12px] text-emerald-700">
                  {aviso}
                </p>
              )}
              {error && roles && (
                <p role="alert" className="m-0 mr-auto text-[12px] text-red-700">
                  {error}
                </p>
              )}
              <button
                type="button"
                disabled={!sucio || guardando}
                onClick={() => elegir(elegido)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-slate-700 hover:bg-gray-50 disabled:opacity-40"
              >
                Descartar cambios
              </button>
              <button
                type="button"
                disabled={(!sucio && sinRatificar === 0) || guardando}
                onClick={() => {
                  setError(null);
                  void guardar();
                }}
                className="rounded-lg bg-[#003DA5] px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-blue-800 disabled:opacity-40"
              >
                {guardando ? 'Guardando…' : sucio ? 'Guardar cambios' : 'Confirmar'}
              </button>
            </div>
          </div>
        )}
      </div>

      {dialogo.elemento}
    </div>
  );
}

