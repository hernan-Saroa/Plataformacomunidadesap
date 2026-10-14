import React, { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { CuentaCandidata, EscalonPorDesignar, EscalonesPorDesignar } from '../../types';
import { Boton, BotonSecundario, campo } from '../shared/PiezasPanel';
import { momento } from '../shared/fechas';

interface Props {
  procesoId: string;
  datos: EscalonesPorDesignar;
  onCambio: (datos: EscalonesPorDesignar) => void;
}

/**
 * Quién revisa el estudio previo en cada escalón por rol (migración 102).
 *
 * Cuando la 3.1 se aprueba por una cadena y un escalón nombra un rol
 * —«Director de Contratación»—, quien reparte el abogado reparte también ese
 * escalón entre las personas que tienen el rol. Sin designación ese escalón no
 * lo decide nadie, como pasa con la revisión cuando no hay abogado.
 */
export function RevisoresDeLosEscalones({ procesoId, datos, onCambio }: Props) {
  return (
    <ul className="m-0 p-0 list-none space-y-2">
      {datos.escalones.map((e) => (
        <Escalon key={e.orden} procesoId={procesoId} escalon={e} puedeDesignar={datos.puedeDesignar} onCambio={onCambio} />
      ))}
    </ul>
  );
}

function Escalon({
  procesoId,
  escalon,
  puedeDesignar,
  onCambio,
}: {
  procesoId: string;
  escalon: EscalonPorDesignar;
  puedeDesignar: boolean;
  onCambio: (datos: EscalonesPorDesignar) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [candidatos, setCandidatos] = useState<CuentaCandidata[] | null>(null);
  const [elegido, setElegido] = useState('');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const cambiando = !!escalon.designado;

  useEffect(() => {
    if (!abierto || candidatos) return;
    contratacionService
      .candidatosDeEscalon(procesoId, escalon.orden)
      .then(setCandidatos)
      .catch(() => setCandidatos([]));
  }, [abierto, candidatos, procesoId, escalon.orden]);

  const opciones = (candidatos ?? []).filter((c) => c.usuarioId !== escalon.designado?.usuarioId);

  const guardar = async () => {
    setGuardando(true);
    try {
      onCambio(
        await contratacionService.designarEscalon(procesoId, escalon.orden, elegido, cambiando ? motivo.trim() : undefined),
      );
      toast.success(cambiando ? 'Se cambió quién revisa este escalón' : 'Listo: el escalón ya tiene quién lo revise');
      setAbierto(false);
      setElegido('');
      setMotivo('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <li className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 space-y-2">
      <div className="min-w-0">
        <p className="text-[12px] font-bold text-slate-800 m-0">
          Escalón {escalon.orden} · {escalon.nombre}
          <span className="font-normal text-slate-400">
            {' · '}
            {escalon.tipo === 'ABOGADO' ? 'abogado del proceso' : escalon.roles.join(' o ')}
          </span>
        </p>
        {escalon.tipo === 'ABOGADO' ? (
          // Elegirlo aquí es asignar el abogado del proceso, que también decide
          // otras actividades: decirlo evita que parezca solo un revisor más.
          <p className="text-[11px] text-slate-400 m-0">
            Es el abogado del proceso: también decide la causal (3.6), el comité (3.7) y las revisiones del PAA.
          </p>
        ) : null}
        {escalon.problema ? (
          // Lo que impide decidirlo, antes que el nombre: es lo que hay que resolver.
          <p className="text-[11.5px] font-bold text-amber-700 m-0 mt-0.5">{escalon.problema}</p>
        ) : null}
        {escalon.rolInexistente ? null : escalon.designado ? (
          <p className="text-[11.5px] text-slate-600 m-0 mt-0.5">
            {escalon.designado.nombre} · desde el {momento(escalon.designado.asignadoAt)}
            {escalon.designado.asignadoPor ? ` por ${escalon.designado.asignadoPor}` : ''}
          </p>
        ) : (
          <p className="text-[11.5px] font-bold text-amber-700 m-0 mt-0.5">
            Sin designar: mientras tanto este escalón no lo decide nadie.
          </p>
        )}
        {!escalon.cambiable ? (
          <p className="text-[11px] text-slate-400 m-0 mt-0.5">Ya decidió en esta revisión: se puede cambiar en el próximo envío.</p>
        ) : null}
      </div>

      {puedeDesignar && escalon.cambiable && !escalon.rolInexistente && !abierto ? (
        <BotonSecundario icono={<UserPlus className="w-3.5 h-3.5" />} onClick={() => setAbierto(true)}>
          {cambiando ? 'Cambiar' : 'Designar'}
        </BotonSecundario>
      ) : null}

      {abierto ? (
        <div className="space-y-2">
          <select
            value={elegido}
            onChange={(ev) => setElegido(ev.target.value)}
            className={campo}
            aria-label={`Quién revisa el escalón ${escalon.orden}`}
            disabled={candidatos === null}
          >
            <option value="">{candidatos === null ? 'Cargando…' : 'Elige quién lo revisa…'}</option>
            {opciones.map((c) => (
              <option key={c.usuarioId} value={c.usuarioId}>
                {c.nombre} ·{' '}
                {escalon.tipo === 'ABOGADO' && c.procesosACargo !== undefined
                  ? // Con su carga, como al repartir el abogado: a quién le cabe otro.
                    `${c.procesosACargo === 1 ? '1 proceso' : `${c.procesosACargo} procesos`}${
                      c.revisionesPendientes ? `, ${c.revisionesPendientes} por revisar` : ''
                    }`
                  : c.usuarioNombre}
              </option>
            ))}
          </select>
          {candidatos !== null && opciones.length === 0 ? (
            <p className="text-[11.5px] text-slate-500 m-0">
              {escalon.tipo === 'ABOGADO'
                ? 'No hay otra cuenta con permiso para revisar procesos.'
                : cambiando
                  ? 'No hay otra cuenta con este rol.'
                  : 'Ninguna cuenta activa tiene este rol.'}
            </p>
          ) : null}
          {cambiando ? (
            <textarea
              rows={2}
              value={motivo}
              onChange={(ev) => setMotivo(ev.target.value)}
              placeholder={escalon.tipo === 'ABOGADO' ? 'Por qué se cambia de abogado' : 'Por qué cambia quien revisa este escalón'}
              aria-label="Motivo del cambio"
              className={campo}
            />
          ) : null}
          <div className="flex items-center gap-2">
            <Boton
              icono={<UserPlus className="w-3.5 h-3.5" />}
              disabled={!elegido || guardando || (cambiando && motivo.trim().length < 10)}
              onClick={guardar}
            >
              {cambiando ? 'Cambiar' : 'Designar'}
            </Boton>
            <BotonSecundario
              icono={null}
              onClick={() => {
                setAbierto(false);
                setElegido('');
                setMotivo('');
              }}
            >
              Cancelar
            </BotonSecundario>
          </div>
        </div>
      ) : null}
    </li>
  );
}
