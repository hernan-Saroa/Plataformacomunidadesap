import React, { useEffect, useState } from 'react';
import { UserMinus, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { CandidatoAPuesto, PuestoEnProceso, PuestosDelProceso as Datos } from '../../types';
import { Boton, BotonSecundario, campo } from '../shared/PiezasPanel';
import { momento } from '../shared/fechas';

interface Props {
  procesoId: string;
  datos: Datos;
  onCambio: (datos: Datos) => void;
}

/** «3.6 y 3.7; aprueba 3.1»: lo que hace el puesto, dicho corto. */
function queHace(puesto: PuestoEnProceso): string {
  const hace = puesto.usos.filter((u) => u.como === 'HACE').map((u) => u.numeral);
  const aprueba = puesto.usos.filter((u) => u.como === 'APRUEBA').map((u) => u.numeral);
  const lista = (n: string[]) => (n.length > 1 ? `${n.slice(0, -1).join(', ')} y ${n[n.length - 1]}` : n[0]);
  return [hace.length ? `Hace la ${lista(hace)}` : null, aprueba.length ? `aprueba la ${lista(aprueba)}` : null]
    .filter(Boolean)
    .join('; ');
}

/**
 * Quién ocupa cada puesto del proceso (109).
 *
 * Los puestos los crea la Dirección en Configuración —Abogado, Segundo abogado,
 * Jefe…— y cada actividad dice cuál la hace o la aprueba. Aquí solo se pone a
 * una persona en cada uno, elegida entre las que tienen los permisos de todo
 * lo que el puesto hace: asignar nunca da un permiso.
 */
export function PuestosDelProceso({ procesoId, datos, onCambio }: Props) {
  if (!datos.puestos.length) {
    return (
      <p className="text-[11.5px] text-slate-500 m-0">
        No hay puestos configurados que actúen en este proceso: las actividades las hace quien tenga el permiso.
      </p>
    );
  }
  /*
   * Quien lleva el caso no es quien lo revisa (110): el abogado del caso hace
   * las actividades, el revisor aprueba o devuelve. Separarlos en pantalla es
   * lo que evita creer que uno solo hace las dos cosas. Un puesto que todavía
   * no hace ni aprueba nada va con los que llevan el caso.
   */
  const revisa = (p: PuestoEnProceso) => p.usos.length > 0 && p.usos.every((u) => u.como === 'APRUEBA');
  const grupos = [
    { titulo: 'Quién lleva el caso', ayuda: 'Hace las actividades que se le asignan.', puestos: datos.puestos.filter((p) => !revisa(p)) },
    { titulo: 'Quién revisa', ayuda: 'Aprueba o devuelve lo que se le pone a revisión.', puestos: datos.puestos.filter(revisa) },
  ].filter((g) => g.puestos.length);

  return (
    <div className="space-y-3">
      {grupos.map((g) => (
        <section key={g.titulo} className="space-y-1.5">
          <div>
            <p className="m-0 text-[11.5px] font-bold uppercase tracking-wide text-slate-500">{g.titulo}</p>
            <p className="m-0 text-[11px] text-slate-400">{g.ayuda}</p>
          </div>
          <ul className="m-0 p-0 list-none space-y-2">
            {g.puestos.map((p) => (
              <FilaDePuesto key={p.id} procesoId={procesoId} puesto={p} puedeAsignar={datos.puedeAsignar} onCambio={onCambio} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function FilaDePuesto({
  procesoId,
  puesto,
  puedeAsignar,
  onCambio,
}: {
  procesoId: string;
  puesto: PuestoEnProceso;
  puedeAsignar: boolean;
  onCambio: (datos: Datos) => void;
}) {
  const [modo, setModo] = useState<'nada' | 'asignar' | 'quitar'>('nada');
  const [candidatos, setCandidatos] = useState<CandidatoAPuesto[] | null>(null);
  const [elegido, setElegido] = useState('');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const cambiando = !!puesto.ocupante;
  const motivoValido = motivo.trim().length >= 10;

  useEffect(() => {
    if (modo !== 'asignar' || candidatos) return;
    contratacionService
      .candidatosAPuesto(procesoId, puesto.id)
      .then(setCandidatos)
      .catch(() => setCandidatos([]));
  }, [modo, candidatos, procesoId, puesto.id]);

  /*
   * Los menos cargados primero: quien asigna ve de un vistazo a quién le cabe
   * otro proceso, en vez de repartir por orden alfabético.
   */
  const opciones = (candidatos ?? [])
    .filter((c) => c.usuarioId !== puesto.ocupante?.usuarioId)
    .sort((x, y) => x.procesosEnElPuesto - y.procesosEnElPuesto || x.nombre.localeCompare(y.nombre));

  const cerrar = () => {
    setModo('nada');
    setElegido('');
    setMotivo('');
  };

  const hacer = async (accion: () => Promise<Datos>, exito: string) => {
    setGuardando(true);
    try {
      onCambio(await accion());
      toast.success(exito);
      cerrar();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <li className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 space-y-2">
      <div className="min-w-0">
        <p className="text-[12px] font-bold text-slate-800 m-0 break-words">
          {puesto.nombre}
          {puesto.obligatorio ? <span className="font-normal text-slate-400"> · obligatorio</span> : null}
        </p>
        {puesto.usos.length ? <p className="text-[11px] text-slate-400 m-0">{queHace(puesto)}.</p> : null}
        {puesto.problema ? (
          // Lo que le impide actuar, antes que el nombre: es lo que hay que resolver.
          <p className="text-[11.5px] font-bold text-amber-700 m-0 mt-0.5">{puesto.problema}</p>
        ) : null}
        {puesto.ocupante ? (
          <p className="text-[11.5px] text-slate-600 m-0 mt-0.5 break-words">
            {puesto.ocupante.nombre}
            {puesto.ocupante.esMio ? ' (tú)' : ''} · desde el {momento(puesto.ocupante.asignadoAt)}
            {puesto.ocupante.asignadoPor ? ` por ${puesto.ocupante.asignadoPor}` : ''}
          </p>
        ) : puesto.seOcupaEn ? (
          // Vacío hasta la etapa 8 es lo normal: no es una tarea pendiente de la 3.3.
          <p className="text-[11.5px] text-slate-500 m-0 mt-0.5">Todavía sin designar.</p>
        ) : (
          <p className="text-[11.5px] font-bold text-amber-700 m-0 mt-0.5">
            Sin asignar: mientras tanto lo que hace este puesto no lo hace nadie.
          </p>
        )}
      </div>

      {/* El del supervisor lo llena el acto de designación, no esta pantalla. */}
      {puesto.seOcupaEn ? (
        <p className="text-[11px] text-slate-500 m-0">
          Se ocupa con la designación de la {puesto.seOcupaEn}, junto con el acto que lo nombra.
        </p>
      ) : null}

      {puedeAsignar && !puesto.seOcupaEn && modo === 'nada' ? (
        <div className="flex flex-wrap items-center gap-2">
          <BotonSecundario icono={<UserPlus className="w-3.5 h-3.5" />} onClick={() => setModo('asignar')}>
            {cambiando ? 'Cambiar' : 'Asignar'}
          </BotonSecundario>
          {cambiando ? (
            <BotonSecundario icono={<UserMinus className="w-3.5 h-3.5" />} onClick={() => setModo('quitar')}>
              Dejarlo vacío
            </BotonSecundario>
          ) : null}
        </div>
      ) : null}

      {modo === 'asignar' ? (
        <div className="space-y-2">
          <select
            value={elegido}
            onChange={(ev) => setElegido(ev.target.value)}
            className={campo}
            aria-label={`Quién ocupa el puesto ${puesto.nombre}`}
            disabled={candidatos === null}
          >
            <option value="">{candidatos === null ? 'Cargando…' : 'Elige a quién…'}</option>
            {opciones.map((c) => (
              <option key={c.usuarioId} value={c.usuarioId}>
                {c.nombre} · {c.procesosEnElPuesto === 1 ? '1 proceso' : `${c.procesosEnElPuesto} procesos`} en este puesto
              </option>
            ))}
          </select>
          {candidatos !== null && opciones.length === 0 ? (
            // Un desplegable vacío sin explicación deja sin saber si falló la
            // consulta o si de verdad nadie reúne los permisos.
            <p className="text-[11.5px] text-slate-500 m-0">
              {cambiando
                ? 'No hay otra cuenta con todos los permisos de este puesto.'
                : 'Ninguna cuenta tiene todos los permisos de lo que hace este puesto: dáselos a un rol en Permisos por etapa.'}
            </p>
          ) : null}
          {cambiando ? (
            <textarea
              rows={2}
              value={motivo}
              onChange={(ev) => setMotivo(ev.target.value)}
              placeholder="Por qué cambia quien ocupa el puesto"
              aria-label="Motivo del cambio"
              className={campo}
            />
          ) : null}
          <div className="flex items-center gap-2">
            <Boton
              icono={<UserPlus className="w-3.5 h-3.5" />}
              disabled={!elegido || guardando || (cambiando && !motivoValido)}
              onClick={() =>
                hacer(
                  () => contratacionService.asignarPuesto(procesoId, puesto.id, elegido, cambiando ? motivo.trim() : undefined),
                  cambiando ? `Se cambió quién ocupa el puesto ${puesto.nombre}` : `Listo: ${puesto.nombre} ya tiene quién lo ocupe`,
                )
              }
            >
              {cambiando ? 'Cambiar' : 'Asignar'}
            </Boton>
            <BotonSecundario icono={null} onClick={cerrar}>
              Cancelar
            </BotonSecundario>
          </div>
        </div>
      ) : null}

      {modo === 'quitar' ? (
        <div className="space-y-2">
          <textarea
            rows={2}
            value={motivo}
            onChange={(ev) => setMotivo(ev.target.value)}
            placeholder="Por qué el puesto queda vacío"
            aria-label="Motivo para dejar el puesto vacío"
            className={campo}
          />
          <div className="flex items-center gap-2">
            <Boton
              icono={<UserMinus className="w-3.5 h-3.5" />}
              disabled={!motivoValido || guardando}
              onClick={() =>
                hacer(
                  () => contratacionService.quitarPuesto(procesoId, puesto.id, motivo.trim()),
                  `El puesto ${puesto.nombre} quedó vacío`,
                )
              }
            >
              Dejarlo vacío
            </Boton>
            <BotonSecundario icono={null} onClick={cerrar}>
              Cancelar
            </BotonSecundario>
          </div>
        </div>
      ) : null}
    </li>
  );
}
