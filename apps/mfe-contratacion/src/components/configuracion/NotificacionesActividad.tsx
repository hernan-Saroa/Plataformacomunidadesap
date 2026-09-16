import React, { useEffect, useMemo, useState } from 'react';
import { Check, Pencil, Plus, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { AvisoEvento, ConfiguracionAvisos, PapelAviso } from '../../types';
import { PERMISOS, tienePermiso } from '../../auth/permisos';

interface Props {
  numeral: string;
}

/**
 * Si la actividad avisa de lo que pasa en ella, y a quién (EFDS-1183).
 *
 * Va en la ficha de la actividad, donde se decide todo lo demás de ella, y sin
 * modalidad: por actividad y modalidad eran cientos de combinaciones.
 *
 * Cada aviso arranca con lo sugerido —devolver avisa a quien envió, enviar a
 * aprobación avisa a quien aprueba—, así que una actividad que nadie tocó ya
 * avisa bien. Aquí solo se cambia lo que la Dirección quiera distinto, y se
 * puede volver a lo sugerido.
 *
 * Se ve como la pestaña de Aprobación que tiene al lado: filas finas, el
 * interruptor se guarda al pulsarlo y el destinatario se cambia en el sitio.
 */
export function NotificacionesActividad({ numeral }: Props) {
  const [datos, setDatos] = useState<ConfiguracionAvisos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);
  const puedeEditar = tienePermiso(PERMISOS.configurar);

  useEffect(() => {
    setDatos(null);
    setEditando(null);
    contratacionService
      .avisosDeActividad(numeral)
      .then((d) => {
        setDatos(d);
        setError(null);
      })
      .catch((e: any) => setError(e.message));
  }, [numeral]);

  const nombrePapel = (codigo: PapelAviso) =>
    datos?.papeles.find((p) => p.codigo === codigo)?.nombre ?? codigo;

  /** «Avisa al abogado del proceso · a todos los de Director de Contratación». */
  const aQuien = (a: AvisoEvento) => {
    const partes = [
      ...a.papeles.map((p) => {
        const nombre = nombrePapel(p);
        return nombre.charAt(0).toLowerCase() + nombre.slice(1);
      }),
      ...a.roles.map((r) => `todos los de ${r.name}`),
    ];
    const texto = partes.join(' · ');
    return texto.startsWith('el ') ? `al ${texto.slice(3)}` : `a ${texto}`;
  };

  const ejecutar = async (evento: string, accion: () => Promise<ConfiguracionAvisos>, exito: string) => {
    setGuardando(evento);
    try {
      setDatos(await accion());
      setEditando(null);
      toast.success(exito);
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo guardar el aviso');
    } finally {
      setGuardando(null);
    }
  };

  const encender = (a: AvisoEvento, activo: boolean) => {
    // Encender sin nadie a quien avisar no avisaría nada: se abre para elegir.
    if (activo && !a.papeles.length && !a.roles.length) {
      setEditando(a.evento);
      return;
    }
    ejecutar(
      a.evento,
      () => contratacionService.guardarAvisoDeActividad(numeral, a.evento, { activo }),
      activo ? 'Aviso encendido' : 'Aviso apagado',
    );
  };

  if (error) return <p className="text-xs text-red-600 m-0">{error}</p>;
  if (!datos) return <p className="text-xs text-slate-400 m-0">Cargando los avisos…</p>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-600 m-0 leading-relaxed">
        A quién le llega un aviso a la campana cuando pasa algo en esta actividad. Cada uno arranca
        con lo sugerido, y a quien hizo la acción no se le avisa.
      </p>

      <div className="space-y-2">
        {datos.avisos.map((a) => (
          <div key={a.evento} className="rounded-lg border border-gray-200 bg-white">
            <div className="flex items-start gap-2.5 px-3 py-2.5">
              <Interruptor
                encendido={a.activo}
                deshabilitado={!puedeEditar || guardando === a.evento}
                etiqueta={a.nombre}
                onCambio={(v) => encender(a, v)}
              />
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold m-0 ${a.activo ? 'text-slate-800' : 'text-slate-500'}`}>
                  {a.nombre}
                </p>
                <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                  {/* Apagado no avisa a nadie: decir «Avisa al abogado» haría creer que sí. */}
                  {!(a.papeles.length || a.roles.length)
                    ? 'Sin destinatario'
                    : a.activo
                      ? `Avisa ${aQuien(a)}`
                      : `Apagado · avisaría ${aQuien(a)}`}
                  {!a.personalizado && <span className="text-slate-400"> · sugerido</span>}
                </p>
              </div>
              {puedeEditar && editando !== a.evento && (
                <button
                  type="button"
                  onClick={() => setEditando(a.evento)}
                  aria-label={`Cambiar a quién avisa: ${a.nombre}`}
                  className="p-1 rounded text-slate-400 hover:text-[#003DA5] hover:bg-slate-50"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {editando === a.evento && (
              <EditorAviso
                aviso={a}
                papeles={datos.papeles}
                guardando={guardando === a.evento}
                onCancelar={() => setEditando(null)}
                onGuardar={(cambios) =>
                  ejecutar(
                    a.evento,
                    () => contratacionService.guardarAvisoDeActividad(numeral, a.evento, cambios),
                    'Aviso guardado',
                  )
                }
                onRestablecer={
                  a.personalizado
                    ? () =>
                        ejecutar(
                          a.evento,
                          () => contratacionService.restablecerAvisoDeActividad(numeral, a.evento),
                          'Volvió a lo sugerido',
                        )
                    : undefined
                }
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** El interruptor de siempre del módulo: contorno apagado, azul encendido. */
function Interruptor({
  encendido,
  deshabilitado,
  etiqueta,
  onCambio,
}: {
  encendido: boolean;
  deshabilitado?: boolean;
  etiqueta: string;
  onCambio: (valor: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={encendido}
      aria-label={etiqueta}
      disabled={deshabilitado}
      onClick={() => onCambio(!encendido)}
      className={`mt-0.5 flex-shrink-0 relative flex w-9 h-5 items-center rounded-full border transition-colors disabled:opacity-50 ${
        encendido ? 'bg-[#003DA5] border-[#003DA5] justify-end' : 'bg-gray-200 border-gray-400 justify-start'
      }`}
    >
      <span className={`mx-1 w-3.5 h-3.5 rounded-full ${encendido ? 'bg-white' : 'bg-gray-500'}`} />
    </button>
  );
}

function EditorAviso({
  aviso,
  papeles,
  guardando,
  onCancelar,
  onGuardar,
  onRestablecer,
}: {
  aviso: AvisoEvento;
  papeles: { codigo: PapelAviso; nombre: string }[];
  guardando: boolean;
  onCancelar: () => void;
  onGuardar: (cambios: { activo: boolean; papeles: PapelAviso[]; roles: string[] }) => void;
  onRestablecer?: () => void;
}) {
  const [elegidos, setElegidos] = useState<PapelAviso[]>(aviso.papeles);
  const [roles, setRoles] = useState(aviso.roles);
  const [catalogo, setCatalogo] = useState<{ code: string; name: string }[]>([]);
  const [agregandoRol, setAgregandoRol] = useState(false);

  useEffect(() => {
    contratacionService.rolesAprobadores().then(setCatalogo).catch(() => setCatalogo([]));
  }, []);

  const disponibles = useMemo(
    () => catalogo.filter((r) => !roles.some((x) => x.code === r.code)),
    [catalogo, roles],
  );

  const sinNadie = elegidos.length === 0 && roles.length === 0;

  return (
    <div className="border-t border-gray-100 px-3 py-3 space-y-3">
      <div className="space-y-1.5">
        <p className="text-xs font-bold text-slate-700 m-0">A quien cumple este papel en el proceso</p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {papeles.map((p) => {
            const marcado = elegidos.includes(p.codigo);
            return (
              <button
                key={p.codigo}
                type="button"
                aria-pressed={marcado}
                onClick={() =>
                  setElegidos(marcado ? elegidos.filter((x) => x !== p.codigo) : [...elegidos, p.codigo])
                }
                className={`text-left flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors ${
                  marcado ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    marcado ? 'border-[#003DA5] bg-[#003DA5]' : 'border-gray-300'
                  }`}
                >
                  {marcado && <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />}
                </span>
                <span className="text-xs text-slate-800">{p.nombre}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-bold text-slate-700 m-0">Además, a todos los que tengan el rol</p>
        {roles.map((r) => (
          <div key={r.code} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5">
            <span className="text-xs text-slate-800 flex-1 min-w-0 truncate">{r.name}</span>
            <button
              type="button"
              onClick={() => setRoles(roles.filter((x) => x.code !== r.code))}
              aria-label={`Quitar ${r.name}`}
              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {agregandoRol ? (
          <div className="rounded-lg border border-gray-200 bg-white p-1 max-h-48 overflow-y-auto">
            {disponibles.map((r) => (
              <button
                key={r.code}
                type="button"
                onClick={() => {
                  setRoles([...roles, r]);
                  setAgregandoRol(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded text-xs text-slate-700 hover:bg-slate-50"
              >
                {r.name}
              </button>
            ))}
            {disponibles.length === 0 && (
              <p className="text-xs text-slate-400 m-0 px-2 py-2">No hay más roles.</p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAgregandoRol(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md border border-gray-300 bg-white text-slate-700 hover:bg-slate-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar un rol
          </button>
        )}
      </div>

      {sinNadie && <p className="text-xs text-amber-700 m-0">Sin nadie elegido, el aviso queda apagado.</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {onRestablecer ? (
          <button
            type="button"
            onClick={onRestablecer}
            disabled={guardando}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-gray-700 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Volver a lo sugerido
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancelar}
            className="text-xs font-bold text-slate-500 hover:text-gray-700 px-2"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={guardando}
            onClick={() =>
              onGuardar({
                // Quitarle a todos lo apaga: encendido y sin destinatario no avisaría nada.
                activo: sinNadie ? false : true,
                papeles: elegidos,
                roles: roles.map((r) => r.code),
              })
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold rounded-md text-white bg-[#003DA5] hover:bg-[#002D7A] shadow-sm disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" strokeWidth={3} />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
