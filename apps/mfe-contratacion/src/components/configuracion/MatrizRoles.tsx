import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Info, Search, X } from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { MatrizDeRoles, RolDelCatalogo } from '../../types';

/**
 * La matriz rol × permiso del módulo (EFDS-1183, RF-SIS-02).
 *
 * El formato de roles llegó en dos hojas que no se tocan: una rejilla de diez
 * permisos marcada solo para cuatro perfiles genéricos, y un catálogo de
 * catorce roles reales sin rejilla. Cruzarlas era el trabajo, y esta pantalla
 * es donde se puede verificar el resultado: catorce filas contra treinta y cinco
 * columnas, que es la única forma de ver si un rol quedó ancho o estrecho.
 *
 * **Enseña lo que el módulo aplica, no lo que la base guarda.** Mientras el
 * token no traiga los permisos, quien autoriza es el mapa del backend, así que
 * dibujar `auth.role_permissions` mostraría una configuración que no está en
 * vigor. Cuando el administrador cambie la matriz desde el backoffice de roles,
 * es ahí donde la verá; aquí ve la que rige hoy.
 *
 * Es de solo lectura a propósito: los roles se administran desde la plataforma,
 * que es de donde tienen que administrarse. Un segundo sitio donde tocarlos
 * dejaría dos verdades sin nada que las mantuviera de acuerdo.
 */

/**
 * Abreviatura de columna, con el mismo criterio que las modalidades.
 *
 * «Administrador de Contratación» son 29 caracteres y son catorce columnas: el
 * nombre entero no cabe ni girado. La sigla se lee de corrido y el nombre
 * completo sale al pasar por encima, en la línea de la derecha.
 */
const SIGLAS: Record<string, string> = {
  ESTRUCTURADOR_TECNICO: 'ET',
  ESTRUCTURADOR_FINANCIERO: 'EF',
  GESTOR_CONTRATACION: 'GC',
  REVISOR_CONTRATACION: 'RC',
  DIRECTOR_CONTRATACION: 'DC',
  EVALUADOR_FINANCIERO: 'EvF',
  EVALUADOR_TECNICO: 'EvT',
  EVALUADOR_JURIDICO: 'EvJ',
  ARCHIVO_GESTION_DC: 'AG',
  ORDENADOR_GASTO: 'OG',
  SUPERVISOR_CONTRATO: 'SUP',
  APOYO_SUPERVISION: 'APS',
  ENTE_DE_CONTROL: 'EC',
  ADMINISTRADOR_CONTRATACION: 'ADM',
};

const sigla = (codigo: string) => SIGLAS[codigo] ?? codigo.slice(0, 3);

/** Los recursos, con el nombre que entiende quien revisa la matriz. */
const NOMBRE_RECURSO: Record<string, string> = {
  proceso: 'El proceso',
  actividad: 'Las actividades',
  documento: 'Los documentos',
  expediente: 'El expediente',
  'acta-inicio': 'El acta de inicio',
  seguimiento: 'El seguimiento de la ejecución',
  supervision: 'La supervisión',
  modificacion: 'Las modificaciones contractuales',
  incumplimiento: 'El incumplimiento',
  alerta: 'Las alertas',
  reporte: 'Los informes',
  config: 'La configuración',
};

/** Los recursos que se abren de entrada: los del formato original. */
const ABIERTOS_AL_ENTRAR = ['proceso'];

export function MatrizRoles() {
  const [datos, setDatos] = useState<MatrizDeRoles | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set(ABIERTOS_AL_ENTRAR));
  const [busqueda, setBusqueda] = useState('');
  /** La columna por la que se está pasando, para decir su nombre entero. */
  const [rolMirado, setRolMirado] = useState<RolDelCatalogo | null>(null);
  /** La columna elegida, cuya ficha se abre debajo de la rejilla. */
  const [elegido, setElegido] = useState<string | null>(null);

  useEffect(() => {
    setCargando(true);
    contratacionService
      .matrizDeRoles()
      .then(setDatos)
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));
  }, []);

  const filtrados = useMemo(() => {
    if (!datos) return [];
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return datos.permisos;
    return datos.permisos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(texto) ||
        p.codigo.toLowerCase().includes(texto) ||
        p.descripcion.toLowerCase().includes(texto) ||
        (p.columna ?? '').toLowerCase().includes(texto),
    );
  }, [datos, busqueda]);

  /** Los permisos agrupados por lo que tocan, en el orden del catálogo. */
  const porRecurso = useMemo(() => {
    const mapa = new Map<string, typeof filtrados>();
    for (const permiso of filtrados) {
      if (!mapa.has(permiso.recurso)) mapa.set(permiso.recurso, []);
      mapa.get(permiso.recurso)!.push(permiso);
    }
    return [...mapa.entries()];
  }, [filtrados]);

  // Buscar sin abrir el grupo que contiene el resultado no sirve de nada.
  const buscando = busqueda.trim().length > 0;

  const resumen = useMemo(() => {
    if (!datos) return null;
    const marcadas = datos.roles.reduce((suma, rol) => suma + rol.permisos.length, 0);
    // Cuántas columnas venían ya en la Hoja1 del formato: el resto son de
    // etapas que no existían cuando se escribió, y decirlo evita que alguien
    // las revise contra un anexo que no las tiene.
    const delFormato = datos.permisos.filter((p) => p.columna !== null).length;
    const sinCasilla = datos.roles.filter((r) => r.permisos.length === 0).length;
    return { marcadas, delFormato, sinCasilla };
  }, [datos]);

  const alternar = (recurso: string) =>
    setAbiertos((previos) => {
      const siguiente = new Set(previos);
      if (siguiente.has(recurso)) siguiente.delete(recurso);
      else siguiente.add(recurso);
      return siguiente;
    });

  if (cargando) {
    return (
      <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-9 rounded bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2"
      >
        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
        <p className="text-[12.5px] text-red-800 m-0">{error}</p>
      </div>
    );
  }

  if (!datos) return null;

  const rolElegido = datos.roles.find((r) => r.codigo === elegido) ?? null;

  return (
    <div className="space-y-3">
      {/* Una sola banda con la explicación, los recuentos y el buscador, como
          en la matriz de actividades: tres bloques apilados se comían la mitad
          de la pantalla antes de llegar a la rejilla, que es lo que se viene a
          mirar. */}
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <p className="m-0 text-xs text-gray-600 leading-relaxed min-w-0 flex-1">
            Cada fila es algo que se puede hacer en el módulo y cada columna, uno de los{' '}
            <strong className="font-bold text-gray-700">{datos.roles.length} roles</strong> del
            formato. El visto dice que ese rol lo tiene hoy. Pulsa una columna para ver quién
            ejerce el rol y de dónde salió su fila.
          </p>

          <label className="relative flex items-center">
            <Search className="w-4 h-4 text-gray-400 absolute left-2.5" aria-hidden />
            <span className="sr-only">Buscar un permiso</span>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar un permiso"
              className="rounded-lg border border-gray-300 py-1.5 pl-8 pr-3 text-[12.5px] w-56 focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/15 focus:outline-none"
            />
          </label>
        </div>

        {resumen && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-gray-500">
            <span>
              <strong className="font-bold text-gray-700">{datos.permisos.length}</strong> permisos
              en el catálogo
            </span>
            <span>
              <strong className="font-bold text-gray-700">{resumen.marcadas}</strong> casillas
              marcadas
            </span>
            <span>
              <strong className="font-bold text-gray-700">{resumen.delFormato}</strong> de las diez
              columnas del formato
            </span>
            {resumen.sinCasilla > 0 && (
              <span className="text-amber-700">
                <strong className="font-bold">{resumen.sinCasilla}</strong> roles sin ninguna
                casilla
              </span>
            )}

            <p
              aria-live="polite"
              className={`m-0 ml-auto text-[11.5px] font-semibold ${
                rolMirado ? 'text-[#003DA5]' : 'text-transparent'
              }`}
            >
              {rolMirado?.nombre ?? 'Pasa por una columna'}
            </p>
          </div>
        )}

        {/* Igual que los umbrales de cuantía y los plazos de publicidad: la
            pantalla dice que es la lectura del equipo y no una decisión de la
            entidad. Callarlo la convertiría en definitiva por omisión. */}
        {!datos.confirmada && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" aria-hidden />
            <p className="m-0 text-[11.5px] text-amber-800 leading-relaxed">
              <strong className="font-bold">Sin confirmar.</strong> La Dirección de Contratación
              todavía no ha ratificado la matriz. Las columnas que el formato no traía se leyeron
              de los atributos del anexo o las fijaron las historias del módulo.
            </p>
          </div>
        )}
      </div>

      {/* Los cuatro perfiles, antes de la rejilla (EFDS-1183).

          Quien abre esta pantalla lo hace casi siempre para responder «¿qué le
          pongo a esta persona?», y la rejilla sola contesta con treinta y cinco
          casillas. Los perfiles contestan con cuatro nombres; la rejilla queda
          debajo para quien necesite el detalle o un reparto distinto. */}
      {datos.perfiles && datos.perfiles.length > 0 && (
        <div className="space-y-2">
          <p className="m-0 text-[11.5px] font-bold uppercase tracking-wide text-gray-500">
            Perfiles por defecto
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {datos.perfiles.map((perfil) => (
              <div
                key={perfil.codigo}
                className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 space-y-1"
              >
                <p className="m-0 text-[13px] font-bold text-slate-800">{perfil.nombre}</p>
                <p className="m-0 text-[11.5px] text-slate-600 leading-relaxed">
                  {perfil.descripcion}
                </p>
                <p className="m-0 text-[11px] text-gray-400 leading-relaxed">
                  {perfil.quienLoEjerce}
                </p>
                {/* Los roles que lo componen, porque asignarlos se hace en el
                    backoffice de la plataforma y hay que saber cuáles marcar. */}
                <p className="m-0 pt-1 text-[10.5px] font-mono text-[#003DA5]">
                  {perfil.roles.join(' + ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-auto rounded-xl border border-gray-200 bg-white max-h-[560px]">
        <table className="w-full border-collapse text-sm min-w-[900px]">
          <thead className="sticky top-0 z-20">
            <tr className="bg-gray-50">
              <th className="sticky left-0 z-30 bg-gray-50 border-b border-r border-gray-200 px-3 py-2 text-left text-[11.5px] font-bold uppercase tracking-wide text-gray-600 min-w-[260px]">
                Lo que se puede hacer
              </th>
              {datos.roles.map((rol) => (
                <th
                  key={rol.codigo}
                  onMouseEnter={() => setRolMirado(rol)}
                  onMouseLeave={() => setRolMirado(null)}
                  className={`border-b border-gray-200 px-1 py-2 text-center text-[11.5px] font-bold tracking-wide w-[46px] transition-colors ${
                    elegido === rol.codigo ? 'text-[#003DA5]' : 'text-gray-600'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setElegido((actual) => (actual === rol.codigo ? null : rol.codigo))
                    }
                    aria-pressed={elegido === rol.codigo}
                    className="w-full hover:text-[#003DA5] transition-colors"
                  >
                    {sigla(rol.codigo)}
                    <span className="sr-only"> · {rol.nombre}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {porRecurso.length === 0 && (
              <tr>
                <td
                  colSpan={datos.roles.length + 1}
                  className="px-4 py-10 text-center text-sm text-gray-500"
                >
                  Ningún permiso coincide con «{busqueda}».
                </td>
              </tr>
            )}

            {porRecurso.map(([recurso, permisos]) => {
              const abierto = buscando || abiertos.has(recurso);
              return (
                <React.Fragment key={recurso}>
                  <tr
                    className="border-b border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => alternar(recurso)}
                  >
                    <th
                      scope="row"
                      colSpan={datos.roles.length + 1}
                      className="px-3 py-1.5 text-left"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-[12.5px] font-bold text-gray-700">
                          {NOMBRE_RECURSO[recurso] ?? recurso}
                        </span>
                        <span className="text-[11.5px] font-semibold text-gray-400">
                          {permisos.length}
                        </span>
                        <span className="text-[11.5px] text-gray-400">
                          {abierto ? 'Ocultar' : 'Ver'}
                        </span>
                      </span>
                    </th>
                  </tr>

                  {abierto &&
                    permisos.map((permiso) => (
                      <tr
                        key={permiso.codigo}
                        className="border-b border-gray-100 transition-colors hover:bg-gray-50"
                      >
                        <td className="sticky left-0 z-10 bg-white border-r border-gray-200 px-3 py-2">
                          <span className="block text-sm text-gray-800 leading-snug">
                            {permiso.nombre}
                          </span>
                          {/* La columna del formato, para poder cotejar la
                              rejilla contra el anexo sin abrir el Excel. */}
                          <span className="block text-[10.5px] text-gray-400 mt-0.5">
                            {permiso.columna
                              ? `Formato · ${permiso.columna}`
                              : 'Sin columna en el formato'}
                          </span>
                        </td>

                        {datos.roles.map((rol) => {
                          const tiene = rol.permisos.includes(permiso.codigo);
                          return (
                            <td
                              key={rol.codigo}
                              title={`${rol.nombre}: ${
                                tiene ? permiso.nombre : `no tiene ${permiso.nombre.toLowerCase()}`
                              }`}
                              className={`border-b border-gray-100 px-1 py-2 text-center transition-colors ${
                                elegido === rol.codigo ? 'bg-[#003DA5]/5' : ''
                              }`}
                            >
                              {tiene ? (
                                <span className="text-emerald-600">
                                  <Check className="w-4 h-4 mx-auto" aria-hidden />
                                  <span className="sr-only">Sí</span>
                                </span>
                              ) : (
                                <span className="text-gray-300">
                                  <span aria-hidden>·</span>
                                  <span className="sr-only">No</span>
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {rolElegido && <FichaDelRol rol={rolElegido} onCerrar={() => setElegido(null)} />}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="flex items-center gap-1.5">
          <span className="text-emerald-600">
            <Check className="w-3.5 h-3.5" aria-hidden />
          </span>
          <span className="text-[11.5px] text-gray-600">El rol lo tiene</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-gray-300" aria-hidden>
            ·
          </span>
          <span className="text-[11.5px] text-gray-600">No lo tiene</span>
        </span>
        <span className="text-[11.5px] text-gray-500">
          {datos.transversales.join(', ')} los otorga todos y no aparece como columna: es
          transversal a la plataforma, no un rol de Contratación.
        </span>
      </div>
    </div>
  );
}

/**
 * Quién es el rol de la columna elegida.
 *
 * La sigla dice cuál columna es; esto dice quién la ejerce, de dónde salió su
 * fila y qué hace que la rejilla todavía no puede mostrar. Sin esto, revisar
 * la matriz obliga a tener el anexo abierto al lado.
 */
function FichaDelRol({ rol, onCerrar }: { rol: RolDelCatalogo; onCerrar: () => void }) {
  return (
    <div className="rounded-xl border border-[#003DA5]/30 bg-white px-4 py-3 space-y-2 anima-seccion">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-gray-800">{rol.nombre}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600">
            {sigla(rol.codigo)}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
              rol.procedencia === 'EXTERNA'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {rol.procedencia === 'EXTERNA' ? 'Externo a la entidad' : 'Interno'}
          </span>
          {/* De dónde salió la fila: quien la revise necesita saber si está
              cotejando contra el anexo o contra una decisión del equipo. */}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600">
            {rol.origen === 'FORMATO' ? 'Fila del formato' : 'Fila fijada por las historias'}
          </span>
        </span>

        <button
          type="button"
          onClick={onCerrar}
          className="flex items-center gap-1 text-[11.5px] font-semibold text-gray-500 hover:text-gray-700"
        >
          <X className="w-3.5 h-3.5" aria-hidden />
          Cerrar
        </button>
      </div>

      <p className="m-0 text-[12.5px] text-gray-700 leading-relaxed">{rol.descripcion}</p>

      <p className="m-0 text-[11.5px] text-gray-500">
        <strong className="font-bold text-gray-600">Lo ejercen:</strong> {rol.quienLoEjerce} ·{' '}
        <strong className="font-bold text-gray-600">{rol.permisos.length}</strong> de las casillas
        de la rejilla
      </p>

      {rol.nota && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" aria-hidden />
          <p className="m-0 text-[11.5px] text-amber-800 leading-relaxed">{rol.nota}</p>
        </div>
      )}
    </div>
  );
}
