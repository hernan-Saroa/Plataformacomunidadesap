import React, { useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  Building2,
  Check,
  Mail,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Type,
  User,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { AvisoEvento, CambiosAviso, ConfiguracionAvisos, PapelAviso } from '../../types';
import { PERMISOS } from '../../auth/permisos';
import { useAlcance } from '../../auth/alcance';
import { campo } from '../shared/PiezasPanel';

interface Props {
  numeral: string;
}

/**
 * Qué avisa la actividad, y a quién (EFDS-1183).
 *
 * Va en la ficha de la actividad, donde se decide todo lo demás de ella, y sin
 * modalidad: por actividad y modalidad eran cientos de combinaciones.
 *
 * Arriba, lo que sale siempre: si la actividad tiene aprobación, enviarla le
 * avisa a quien aprueba y aprobarla o devolverla a quien la envió. No se
 * configura, porque su destinatario es quien cumple ese papel en *ese* proceso
 * y apagarlo sería dejar la aprobación muda.
 *
 * Debajo, lo que la Dirección decide: se enciende o se apaga, y se dirige a
 * dependencias, roles o personas —la forma en que la ESAP se organiza—. Todas
 * las actividades tienen el de «le toca a alguien», que además le llega solo a
 * quien le corresponde en el proceso —el abogado, el supervisor—: eso se
 * muestra y no se quita.
 */
export function NotificacionesActividad({ numeral }: Props) {
  const [datos, setDatos] = useState<ConfiguracionAvisos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);
  /** El aviso que alguien quiso encender sin destinatario: se enciende al elegir el primero. */
  const [porEncender, setPorEncender] = useState<string | null>(null);
  const { tiene } = useAlcance();
  const puedeEditar = tiene(PERMISOS.configurar);

  useEffect(() => {
    setDatos(null);
    setAbierto(null);
    setPorEncender(null);
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

  const tieneDestinatario = (a: AvisoEvento) =>
    a.papeles.length + a.dependencias.length + a.roles.length + a.personas.length + a.correosExternos.length > 0 ||
    a.alContratista;

  /** «al abogado del proceso · a Dirección Financiera · a todos los de Director de Contratación». */
  const aQuien = (a: AvisoEvento) =>
    [
      ...a.papeles.map((p) => aPapel(nombrePapel(p))),
      ...a.dependencias.map((d) => `a ${d.nombre}`),
      ...a.roles.map((r) => `a todos los de ${r.name}`),
      ...a.personas.map((p) => `a ${p.nombre}`),
      ...(a.alContratista ? ['al contratista'] : []),
      ...a.correosExternos.map((c) => `a ${c}`),
    ].join(' · ');

  const ejecutar = async (evento: string, accion: () => Promise<ConfiguracionAvisos>, exito: string) => {
    setGuardando(evento);
    try {
      setDatos(await accion());
      toast.success(exito);
      return true;
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo guardar el aviso');
      return false;
    } finally {
      setGuardando(null);
    }
  };

  const encender = (a: AvisoEvento, activo: boolean) => {
    // Encender sin nadie a quien avisar no avisaría nada: se abre para elegir, y
    // se enciende con el primero que se agregue.
    if (activo && !tieneDestinatario(a)) {
      setAbierto(a.evento);
      setPorEncender(a.evento);
      return;
    }
    ejecutar(
      a.evento,
      () => contratacionService.guardarAvisoDeActividad(numeral, a.evento, { activo }),
      activo ? 'Aviso encendido' : 'Aviso apagado',
    );
  };

  const guardarDestinatarios = async (a: AvisoEvento, cambios: CambiosAviso, exito: string) => {
    const ok = await ejecutar(
      a.evento,
      () => contratacionService.guardarAvisoDeActividad(numeral, a.evento, cambios),
      exito,
    );
    if (ok && cambios.activo) setPorEncender(null);
    return ok;
  };

  if (error) return <p className="text-xs text-red-600 m-0">{error}</p>;
  if (!datos) return <p className="text-xs text-slate-400 m-0">Cargando los avisos…</p>;

  return (
    <div className="space-y-4">
      {/* Arriba porque rige para todos los avisos de abajo: repetirlo en cada
          uno obligaba a decidir lo mismo seis veces. */}
      <div className="flex items-start gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
        <Interruptor
          encendido={datos.porCorreo}
          deshabilitado={!puedeEditar || guardando === 'correo'}
          etiqueta="Avisar también por correo"
          onCambio={(v) =>
            ejecutar(
              'correo',
              () => contratacionService.guardarCorreoDeActividad(numeral, v),
              v ? 'Los avisos saldrán también por correo' : 'Los avisos solo llegarán a la campana',
            )
          }
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800 m-0">Avisar también por correo</p>
          <p className="text-[11px] text-slate-500 m-0 mt-0.5">
            {datos.porCorreo
              ? 'Cada aviso de esta actividad llega a la campana y al correo institucional de quien lo recibe.'
              : 'Los avisos de esta actividad solo llegan a la campana de la plataforma.'}
          </p>
        </div>
      </div>

      {/* Sin avisos fijos no hay título que ponerles: solo la nota de dónde
          aparecen, para que nadie los busque aquí. */}
      <section className="space-y-2">
        {datos.siempre.length > 0 && <Rotulo titulo="Se avisa siempre" />}
        {datos.siempre.length > 0 ? (
          <div className="rounded-lg border border-gray-200 bg-slate-50 divide-y divide-gray-200">
            {datos.siempre.map((s) => (
              <div key={s.evento} className="flex items-start gap-2.5 px-3 py-2">
                <Check className="w-3.5 h-3.5 mt-0.5 text-[#003DA5] flex-shrink-0" strokeWidth={3} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 m-0">{s.nombre}</p>
                  <p className="text-[11px] text-slate-500 m-0">
                    Avisa {s.aQuien.map(aPapel).join(' · ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
          {datos.siempre.length > 0 && 'Salen solos y no se pueden apagar. '}
          {!datos.requiereAprobacion &&
            'Esta actividad no requiere aprobación: si se la configuras en la pestaña Aprobación, los avisos de enviar, aprobar y devolver salen solos.'}
        </p>
      </section>

      <section className="space-y-2">
        <Rotulo titulo="Avisos que decides" />
        <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
          Enciéndelos o apágalos, y elige a qué dependencias, roles o personas les llegan. A quien hizo la
          acción no se le avisa.
        </p>

        {datos.avisos.map((a) => {
          const estaAbierto = abierto === a.evento;
          return (
            <div
              key={a.evento}
              className={`rounded-lg border bg-white ${estaAbierto ? 'border-blue-200' : 'border-gray-200'}`}
            >
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
                  <p className="text-[11px] text-slate-400 m-0 mt-0.5">{a.ayuda}</p>
                  <p className="text-[11px] text-slate-600 m-0 mt-0.5">
                    {/* Apagado no avisa a nadie: decir «Avisa al abogado» haría creer que sí. */}
                    {!tieneDestinatario(a)
                      ? 'Sin destinatario'
                      : a.activo
                        ? `Avisa ${aQuien(a)}`
                        : `Apagado · avisaría ${aQuien(a)}`}
                    {!a.personalizado && <span className="text-slate-400"> · sugerido</span>}
                  </p>
                  {(a.titulo || a.mensaje) && (
                    <p className="text-[11px] text-slate-500 m-0 mt-0.5">Con texto propio</p>
                  )}
                </div>
                {puedeEditar && !estaAbierto && (
                  <button
                    type="button"
                    onClick={() => setAbierto(a.evento)}
                    aria-label={`Cambiar a quién avisa: ${a.nombre}`}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold text-slate-500 hover:text-[#003DA5] hover:bg-slate-50"
                  >
                    <Pencil className="w-3 h-3" />
                    Cambiar
                  </button>
                )}
              </div>

              {estaAbierto && (
                <Destinatarios
                  aviso={a}
                  nombrePapel={nombrePapel}
                  guardando={guardando === a.evento}
                  encenderAlElegir={porEncender === a.evento}
                  onGuardar={(cambios, exito) => guardarDestinatarios(a, cambios, exito)}
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
                  onListo={() => {
                    setAbierto(null);
                    setPorEncender(null);
                  }}
                />
              )}

              {estaAbierto && (
                <TextoDelAviso
                  aviso={a}
                  variables={datos.variables}
                  guardando={guardando === a.evento}
                  onGuardar={(texto) =>
                    guardarDestinatarios(
                      a,
                      texto,
                      texto.titulo || texto.mensaje ? 'Texto del aviso guardado' : 'Vuelve a salir el texto de siempre',
                    )
                  }
                />
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

/** «El abogado del proceso» → «al abogado del proceso»; «Quien la aprueba» → «a quien la aprueba». */
function aPapel(nombre: string): string {
  const minuscula = nombre.charAt(0).toLowerCase() + nombre.slice(1);
  return minuscula.startsWith('el ') ? `al ${minuscula.slice(3)}` : `a ${minuscula}`;
}

function Rotulo({ titulo }: { titulo: string }) {
  return <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 m-0">{titulo}</p>;
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

type Clase = 'dependencia' | 'rol' | 'persona';

/** Alguien a quien se eligió avisar. */
interface Elegido {
  clase: Clase;
  id: string;
  nombre: string;
}

const ETIQUETA: Record<Clase, string> = {
  dependencia: 'Dependencia',
  rol: 'Todos los del rol',
  persona: 'Persona',
};

function IconoDe({ clase }: { clase: Clase | 'automatico' }) {
  const c = 'w-3.5 h-3.5 text-slate-400 flex-shrink-0';
  if (clase === 'automatico') return <Users className={c} aria-hidden="true" />;
  if (clase === 'dependencia') return <Building2 className={c} aria-hidden="true" />;
  if (clase === 'rol') return <ShieldCheck className={c} aria-hidden="true" />;
  return <User className={c} aria-hidden="true" />;
}

/** «a Dirección Financiera», «a todos los de Director de Contratación», «a Ana Lucía Osorio». */
function aElegido(e: Elegido): string {
  return e.clase === 'rol' ? `a todos los de ${e.nombre}` : `a ${e.nombre}`;
}

function Destinatarios({
  aviso,
  nombrePapel,
  guardando,
  encenderAlElegir,
  onGuardar,
  onRestablecer,
  onListo,
}: {
  aviso: AvisoEvento;
  nombrePapel: (codigo: PapelAviso) => string;
  guardando: boolean;
  encenderAlElegir: boolean;
  onGuardar: (cambios: CambiosAviso, exito: string) => Promise<boolean>;
  onRestablecer?: () => void;
  onListo: () => void;
}) {
  const [buscando, setBuscando] = useState(encenderAlElegir);
  const [correoNuevo, setCorreoNuevo] = useState('');
  const [donde, setDonde] = useState<'dependencias' | 'roles' | 'personas'>('dependencias');
  const [texto, setTexto] = useState('');
  const [catalogo, setCatalogo] = useState<{
    dependencias: { id: string; nombre: string }[] | null;
    roles: { code: string; name: string }[] | null;
  }>({ dependencias: null, roles: null });
  const [personas, setPersonas] = useState<{ id: string; nombre: string; detalle?: string }[]>([]);

  const elegidos: Elegido[] = [
    ...aviso.dependencias.map((d) => ({ clase: 'dependencia' as const, id: d.id, nombre: d.nombre })),
    ...aviso.roles.map((r) => ({ clase: 'rol' as const, id: r.code, nombre: r.name })),
    ...aviso.personas.map((p) => ({ clase: 'persona' as const, id: p.id, nombre: p.nombre })),
  ];

  const conLista = (lista: Elegido[], activo: boolean): CambiosAviso => ({
    activo,
    dependencias: lista.filter((e) => e.clase === 'dependencia').map((e) => e.id),
    roles: lista.filter((e) => e.clase === 'rol').map((e) => e.id),
    personas: lista.filter((e) => e.clase === 'persona').map((e) => e.id),
  });

  const agregar = (nuevo: Elegido) => {
    onGuardar(conLista([...elegidos, nuevo], aviso.activo || encenderAlElegir), `Avisará también ${aElegido(nuevo)}`);
    setBuscando(false);
    setTexto('');
  };

  /** Además de los elegidos, lo que llega por correo a quien no tiene cuenta. */
  const hayDeFuera = aviso.alContratista || aviso.correosExternos.length > 0;

  const quitar = (quitado: Elegido) => {
    const resto = elegidos.filter((e) => !(e.clase === quitado.clase && e.id === quitado.id));
    // Sin nadie más a quien avisar, encendido no avisaría nada: se apaga.
    const quedaAlguien = resto.length > 0 || aviso.papeles.length > 0 || hayDeFuera;
    onGuardar(conLista(resto, quedaAlguien && aviso.activo), `Ya no avisa ${aElegido(quitado)}`);
  };

  /** Si queda alguien de la plataforma, sin contar a los de fuera. */
  const quedaDentro = aviso.papeles.length > 0 || elegidos.length > 0;

  const cambiarContratista = (alContratista: boolean) =>
    onGuardar(
      {
        alContratista,
        activo: alContratista
          ? aviso.activo || encenderAlElegir
          : aviso.activo && (quedaDentro || aviso.correosExternos.length > 0),
      },
      alContratista ? 'Avisará también al contratista' : 'Ya no avisa al contratista',
    );

  const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoNuevo.trim());

  const agregarCorreo = async () => {
    const correo = correoNuevo.trim().toLowerCase();
    if (!correoValido || aviso.correosExternos.includes(correo)) return;
    const ok = await onGuardar(
      { correosExternos: [...aviso.correosExternos, correo], activo: aviso.activo || encenderAlElegir },
      `Avisará también a ${correo}`,
    );
    if (ok) setCorreoNuevo('');
  };

  const quitarCorreo = (correo: string) => {
    const resto = aviso.correosExternos.filter((c) => c !== correo);
    onGuardar(
      {
        correosExternos: resto,
        activo: aviso.activo && (quedaDentro || resto.length > 0 || aviso.alContratista),
      },
      `Ya no avisa a ${correo}`,
    );
  };

  // Los catálogos se piden al abrir el buscador: casi siempre se entra solo a mirar.
  useEffect(() => {
    if (!buscando) return;
    if (!catalogo.dependencias) {
      contratacionService
        .dependencias()
        .then((d) => setCatalogo((c) => ({ ...c, dependencias: d })))
        .catch(() => setCatalogo((c) => ({ ...c, dependencias: [] })));
    }
    if (!catalogo.roles) {
      contratacionService
        .rolesAprobadores()
        .then((r) => setCatalogo((c) => ({ ...c, roles: r })))
        .catch(() => setCatalogo((c) => ({ ...c, roles: [] })));
    }
  }, [buscando, catalogo.dependencias, catalogo.roles]);

  const q = texto.trim().toLowerCase();
  const yaElegido = (clase: Clase, id: string) => elegidos.some((e) => e.clase === clase && e.id === id);

  const dependenciasLibres = useMemo(
    () =>
      (catalogo.dependencias ?? [])
        .filter((d) => !yaElegido('dependencia', d.id) && (!q || d.nombre.toLowerCase().includes(q)))
        .slice(0, 8),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalogo.dependencias, q, aviso],
  );

  const rolesLibres = useMemo(
    () =>
      (catalogo.roles ?? [])
        .filter((r) => !yaElegido('rol', r.code))
        .filter((r) => !q || r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q))
        .slice(0, 8),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalogo.roles, q, aviso],
  );

  // Las personas se buscan en el servidor desde dos letras: son miles.
  useEffect(() => {
    const busqueda = texto.trim();
    if (donde !== 'personas' || busqueda.length < 2) {
      setPersonas([]);
      return;
    }
    const t = setTimeout(() => {
      contratacionService
        .personas(busqueda)
        .then((lista: any[]) =>
          setPersonas(
            lista
              .map((p) => ({ id: p.id, nombre: p.nombre ?? '', detalle: p.cargo ?? p.email ?? undefined }))
              .filter((p) => p.id && p.nombre && !yaElegido('persona', p.id))
              .slice(0, 6),
          ),
        )
        .catch(() => setPersonas([]));
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto, donde, aviso]);

  const opcion = 'w-full text-left px-2 py-1.5 rounded text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50';
  const vacio = (mensaje: string) => <p className="text-xs text-slate-400 m-0 px-1 py-2">{mensaje}</p>;

  return (
    <div className="border-t border-gray-100 px-3 py-3 space-y-2">
      <p className="text-xs font-bold text-slate-700 m-0">Avisa a</p>

      {/* Lo que le llega solo a quien le corresponde en el proceso: se ve, no se quita. */}
      {aviso.papeles.map((p) => (
        <div key={p} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-slate-50 px-2.5 py-1.5">
          <IconoDe clase="automatico" />
          <span className="text-xs text-slate-700 flex-1 min-w-0 truncate">{nombrePapel(p)}</span>
          <span className="text-[10px] text-slate-400">Automático</span>
        </div>
      ))}

      {elegidos.map((e) => (
        <div
          key={`${e.clase}-${e.id}`}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5"
        >
          <IconoDe clase={e.clase} />
          <span className="text-xs text-slate-800 flex-1 min-w-0 truncate">{e.nombre}</span>
          <span className="text-[10px] text-slate-400">{ETIQUETA[e.clase]}</span>
          <button
            type="button"
            disabled={guardando}
            onClick={() => quitar(e)}
            aria-label={`Quitar ${e.nombre}`}
            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      {aviso.correosExternos.map((correo) => (
        <div
          key={correo}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5"
        >
          <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" aria-hidden="true" />
          <span className="text-xs text-slate-800 flex-1 min-w-0 truncate">{correo}</span>
          <span className="text-[10px] text-slate-400">Correo externo</span>
          <button
            type="button"
            disabled={guardando}
            onClick={() => quitarCorreo(correo)}
            aria-label={`Quitar ${correo}`}
            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      {aviso.papeles.length === 0 && elegidos.length === 0 && !hayDeFuera && !buscando && (
        <p className="text-xs text-amber-700 m-0">Todavía no avisa a nadie: agrega a quién.</p>
      )}

      {/* Elegir a quién no lo enciende: que se diga, o se configura y se cree activo. */}
      {!aviso.activo && !encenderAlElegir && aviso.papeles.length + elegidos.length > 0 && (
        <p className="text-xs text-amber-700 m-0">Este aviso está apagado: enciéndelo arriba para que salga.</p>
      )}

      {buscando ? (
        <div className="rounded-lg border border-gray-200 bg-white p-2 space-y-2">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
            {(
              [
                ['dependencias', 'Dependencias'],
                ['roles', 'Roles'],
                ['personas', 'Personas'],
              ] as const
            ).map(([id, etiqueta]) => (
              <button
                key={id}
                type="button"
                onClick={() => setDonde(id)}
                aria-pressed={donde === id}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  donde === id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-gray-700'
                }`}
              >
                {etiqueta}
              </button>
            ))}
          </div>

          <label className="relative block">
            <Search
              className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              autoFocus
              type="search"
              value={texto}
              onChange={(ev) => setTexto(ev.target.value)}
              placeholder={
                donde === 'dependencias'
                  ? 'Buscar una dependencia'
                  : donde === 'roles'
                    ? 'Buscar un rol'
                    : 'Buscar una persona por su nombre'
              }
              aria-label={
                donde === 'dependencias'
                  ? 'Buscar una dependencia'
                  : donde === 'roles'
                    ? 'Buscar un rol'
                    : 'Buscar una persona'
              }
              className={`${campo} pl-8`}
            />
          </label>

          {donde === 'dependencias' &&
            (catalogo.dependencias === null
              ? vacio('Cargando las dependencias…')
              : dependenciasLibres.length > 0
                ? dependenciasLibres.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      disabled={guardando}
                      onClick={() => agregar({ clase: 'dependencia', id: d.id, nombre: d.nombre })}
                      className={opcion}
                    >
                      {d.nombre}
                    </button>
                  ))
                : vacio(
                    catalogo.dependencias.length === 0
                      ? 'La plataforma todavía no tiene dependencias cargadas.'
                      : `Ninguna dependencia coincide con «${texto}».`,
                  ))}

          {donde === 'roles' &&
            (catalogo.roles === null
              ? vacio('Cargando los roles…')
              : rolesLibres.length > 0
                ? rolesLibres.map((r) => (
                    <button
                      key={r.code}
                      type="button"
                      disabled={guardando}
                      onClick={() => agregar({ clase: 'rol', id: r.code, nombre: r.name })}
                      className={opcion}
                    >
                      {r.name}
                    </button>
                  ))
                : vacio(`Ningún rol coincide con «${texto}».`))}

          {donde === 'personas' &&
            (personas.length > 0
              ? personas.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={guardando}
                    onClick={() => agregar({ clase: 'persona', id: p.id, nombre: p.nombre })}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-50 disabled:opacity-50"
                  >
                    <span className="block text-xs text-slate-700">{p.nombre}</span>
                    {p.detalle && <span className="block text-[10px] text-slate-400">{p.detalle}</span>}
                  </button>
                ))
              : vacio(
                  texto.trim().length < 2
                    ? 'Escribe al menos dos letras del nombre.'
                    : `Ninguna persona coincide con «${texto}».`,
                ))}

          <button
            type="button"
            onClick={() => {
              setBuscando(false);
              setTexto('');
            }}
            className="text-xs font-bold text-slate-500 hover:text-gray-700 px-2 pt-1"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={guardando}
          onClick={() => setBuscando(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md border border-gray-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar a quién avisar
        </button>
      )}

      {/* Fuera de la plataforma: el contratista y quien no tenga cuenta. Solo
          les llega el correo, porque no tienen campana. */}
      <div className="rounded-lg border border-gray-200 bg-slate-50 px-2.5 py-2 space-y-2">
        <p className="text-xs font-bold text-slate-700 m-0">Fuera de la plataforma</p>
        <div className="flex items-start gap-2.5">
          <Interruptor
            encendido={aviso.alContratista}
            deshabilitado={guardando}
            etiqueta="Avisar al contratista"
            onCambio={cambiarContratista}
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-800 m-0 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              Al contratista
            </p>
            <p className="text-[11px] text-slate-500 m-0 mt-0.5">
              Al correo que se registró en el acto de adjudicación. Antes de adjudicar no hay a quién.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            type="email"
            value={correoNuevo}
            onChange={(ev) => setCorreoNuevo(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter') {
                ev.preventDefault();
                agregarCorreo();
              }
            }}
            placeholder="otro@correo.com"
            aria-label="Agregar un correo externo"
            className={campo}
          />
          <button
            type="button"
            disabled={guardando || !correoValido}
            onClick={agregarCorreo}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md border border-gray-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
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
        <button
          type="button"
          onClick={onListo}
          className="px-3 py-1.5 text-xs font-bold rounded-md border border-gray-300 bg-white text-slate-700 hover:bg-slate-50"
        >
          Listo
        </button>
      </div>
    </div>
  );
}

/**
 * El texto con que sale el aviso (088).
 *
 * Vacío sale el de siempre, que se ve de fondo en los campos para saber de qué
 * se parte. Las variables se insertan con un clic: escribirlas a mano es la
 * forma más fácil de equivocarse en una llave, y el servidor rechaza las que
 * no existen para que no salgan tal cual en el correo de todos.
 */
function TextoDelAviso({
  aviso,
  variables,
  guardando,
  onGuardar,
}: {
  aviso: AvisoEvento;
  variables: { clave: string; descripcion: string }[];
  guardando: boolean;
  onGuardar: (texto: { titulo: string | null; mensaje: string | null }) => void;
}) {
  const [titulo, setTitulo] = useState(aviso.titulo ?? '');
  const [mensaje, setMensaje] = useState(aviso.mensaje ?? '');
  /** El campo donde van las variables que se pulsen: el último que se tocó. */
  const [ultimo, setUltimo] = useState<'titulo' | 'mensaje'>('mensaje');

  useEffect(() => {
    setTitulo(aviso.titulo ?? '');
    setMensaje(aviso.mensaje ?? '');
  }, [aviso.titulo, aviso.mensaje]);

  const cambiado = titulo.trim() !== (aviso.titulo ?? '') || mensaje.trim() !== (aviso.mensaje ?? '');
  const propio = !!(aviso.titulo || aviso.mensaje);

  const insertar = (clave: string) => {
    const pieza = `{${clave}}`;
    if (ultimo === 'titulo') setTitulo((t) => (t ? `${t} ${pieza}` : pieza));
    else setMensaje((m) => (m ? `${m} ${pieza}` : pieza));
  };

  return (
    <div className="border-t border-gray-100 px-3 py-3 space-y-2">
      <p className="text-xs font-bold text-slate-700 m-0 flex items-center gap-1.5">
        <Type className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
        Texto del aviso
      </p>
      <p className="text-[11px] text-slate-500 m-0">
        Déjalo vacío para que salga el de siempre, que se ve de fondo con datos de ejemplo.
      </p>

      <input
        type="text"
        value={titulo}
        maxLength={120}
        onFocus={() => setUltimo('titulo')}
        onChange={(ev) => setTitulo(ev.target.value)}
        placeholder={aviso.textoDeSiempre.titulo}
        aria-label="Título del aviso"
        className={campo}
      />
      <textarea
        value={mensaje}
        rows={3}
        maxLength={1000}
        onFocus={() => setUltimo('mensaje')}
        onChange={(ev) => setMensaje(ev.target.value)}
        placeholder={aviso.textoDeSiempre.mensaje}
        aria-label="Mensaje del aviso"
        className={campo}
      />

      <div className="flex flex-wrap gap-1">
        {variables.map((v) => (
          <button
            key={v.clave}
            type="button"
            title={v.descripcion}
            onClick={() => insertar(v.clave)}
            className="px-1.5 py-0.5 rounded-md border border-blue-200 bg-blue-50 text-[11px] font-mono text-blue-800 hover:bg-blue-100"
          >
            {`{${v.clave}}`}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          disabled={guardando || !cambiado}
          onClick={() => onGuardar({ titulo: titulo.trim() || null, mensaje: mensaje.trim() || null })}
          className="px-3 py-1.5 text-xs font-bold rounded-md bg-[#003DA5] text-white hover:bg-[#002e7d] disabled:opacity-50"
        >
          Guardar texto
        </button>
        {propio && (
          <button
            type="button"
            disabled={guardando}
            onClick={() => onGuardar({ titulo: null, mensaje: null })}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-gray-700 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Usar el de siempre
          </button>
        )}
      </div>
    </div>
  );
}
