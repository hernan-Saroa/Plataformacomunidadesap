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
          <span className="font-normal text-slate-400"> · {escalon.roles.join(' o ')}</span>
        </p>
        {escalon.designado ? (
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

      {puedeDesignar && escalon.cambiable && !abierto ? (
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
                {c.nombre} · {c.usuarioNombre}
              </option>
            ))}
          </select>
          {candidatos !== null && opciones.length === 0 ? (
            <p className="text-[11.5px] text-slate-500 m-0">
              {cambiando ? 'No hay otra cuenta con este rol.' : 'Ninguna cuenta activa tiene este rol.'}
            </p>
          ) : null}
          {cambiando ? (
            <textarea
              rows={2}
              value={motivo}
              onChange={(ev) => setMotivo(ev.target.value)}
              placeholder="Por qué cambia quien revisa este escalón"
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
