import React, { useEffect, useState } from 'react';
import { AlertTriangle, Archive, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { ProblemaDePuestos, Puesto } from '../../types';
import { campo } from '../shared/PiezasPanel';
import { useDialogo } from '../shared/useDialogo';

/**
 * Los puestos del proceso (109), en la pestaña Flujo.
 *
 * Un puesto es un lugar que ocupa una persona en cada proceso: «Abogado»,
 * «Segundo abogado», «Jefe». Los nombra la Dirección, y lo que hace cada uno lo
 * dice cada actividad —«quién la hace» y sus aprobaciones—. Así, cuando el área
 * cambia de idea sobre quién lleva qué, se cambia aquí y no en el código.
 *
 * Debajo, el diagnóstico: lo que la configuración de hoy deja sin salida.
 */
export function PuestosConfig({ onCambio }: { onCambio?: () => void } = {}) {
  const [puestos, setPuestos] = useState<Puesto[] | null>(null);
  const [problemas, setProblemas] = useState<ProblemaDePuestos[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState<string | 'nuevo' | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [obligatorio, setObligatorio] = useState(false);
  const dialogo = useDialogo();

  const leer = () =>
    Promise.all([contratacionService.puestos(), contratacionService.diagnosticoDePuestos()])
      .then(([p, d]) => {
        setPuestos(p);
        setProblemas(d);
        setError(null);
      })
      .catch((e: any) => setError(e.message));

  useEffect(() => {
    leer();
  }, []);

  const abrir = (p?: Puesto) => {
    setEditando(p ? p.id : 'nuevo');
    setNombre(p?.nombre ?? '');
    setDescripcion(p?.descripcion ?? '');
    setObligatorio(p?.obligatorio ?? false);
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      const datos = { nombre: nombre.trim(), descripcion: descripcion.trim() || null, obligatorio };
      if (editando === 'nuevo') await contratacionService.crearPuesto(datos);
      else if (editando) await contratacionService.actualizarPuesto(editando, datos);
      toast.success(editando === 'nuevo' ? `Se creó el puesto ${datos.nombre}` : 'Se guardó el puesto');
      setEditando(null);
      await leer();
      onCambio?.();
    } catch (e: any) {
      toast.error(e.message ?? 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  const archivar = async (p: Puesto) => {
    const ok = await dialogo.confirmar({
      titulo: `Archivar el puesto ${p.nombre}`,
      descripcion:
        'Los procesos que ya lo tienen asignado lo conservan como historia. Solo se puede si ninguna actividad lo usa.',
      confirmar: 'Archivar',
      tono: 'peligro',
    });
    if (!ok) return;
    setGuardando(true);
    try {
      await contratacionService.archivarPuesto(p.id);
      toast.success(`Se archivó el puesto ${p.nombre}`);
      await leer();
      onCambio?.();
    } catch (e: any) {
      toast.error(e.message ?? 'No se pudo archivar');
    } finally {
      setGuardando(false);
    }
  };

  if (error) return <p className="text-xs text-red-600 m-0">{error}</p>;
  if (!puestos) return <p className="text-xs text-slate-400 m-0">Cargando los puestos…</p>;

  const formulario = (
    <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre del puesto, por ejemplo «Segundo abogado»"
        aria-label="Nombre del puesto"
        className={campo}
      />
      <textarea
        rows={2}
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Qué hace, en palabras del área (opcional)"
        aria-label="Descripción del puesto"
        className={campo}
      />
      <label className="flex items-center gap-2 text-xs text-slate-700">
        <input type="checkbox" checked={obligatorio} onChange={(e) => setObligatorio(e.target.checked)} />
        Obligatorio: si un proceso recibido lo tiene vacío, sale una alerta
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={guardando || nombre.trim().length < 3}
          onClick={guardar}
          className="px-3 py-1.5 text-xs font-bold rounded-md bg-[#003DA5] text-white hover:bg-blue-800 disabled:opacity-50"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={() => setEditando(null)}
          className="text-xs font-bold text-slate-500 hover:text-gray-700 px-2"
        >
          Cancelar
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="text-xs text-slate-600 leading-relaxed space-y-1">
        <p className="m-0">
          Un puesto es un cargo dentro de cada proceso, por ejemplo «Abogado» o «Jefe». Se usa en tres pasos:
        </p>
        <ol className="m-0 pl-5 space-y-0.5">
          <li>Aquí creas el puesto.</li>
          <li>En cada actividad eliges si ese puesto la hace o la aprueba.</li>
          <li>
            Al recibir un proceso (3.3) se escoge la persona que ocupa el puesto en ese proceso. Después se puede
            cambiar desde el equipo del proceso.
          </li>
        </ol>
        <p className="m-0 text-slate-500">
          Solo se puede escoger a alguien que tenga permiso para hacer lo que hace el puesto.
        </p>
      </div>

      {problemas.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 space-y-1">
          {problemas.map((p, i) => (
            <p key={i} className="m-0 flex items-start gap-2 text-[11.5px] text-amber-800 leading-relaxed">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden />
              {p.mensaje}
            </p>
          ))}
        </div>
      )}

      <ul className="m-0 p-0 list-none space-y-2">
        {puestos.map((p) =>
          editando === p.id ? (
            <li key={p.id}>{formulario}</li>
          ) : (
            <li key={p.id} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[12.5px] font-bold text-slate-800 break-words">
                    {p.nombre}
                    {p.obligatorio ? <span className="font-normal text-slate-400"> · obligatorio</span> : null}
                  </p>
                  {p.descripcion ? <p className="m-0 text-[11.5px] text-slate-500">{p.descripcion}</p> : null}
                  <p className="m-0 mt-1 text-[11px] text-slate-400">
                    {p.usos.length
                      ? p.usos
                          .map((u) => `${u.como === 'HACE' ? 'Hace' : 'Aprueba'} la ${u.numeral}${u.modalidad ? ` (${u.modalidad})` : ''}`)
                          .join(' · ')
                      : 'Ninguna actividad lo usa todavía.'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() => abrir(p)}
                  aria-label={`Editar ${p.nombre}`}
                  className="p-1 rounded text-slate-400 hover:text-[#003DA5] hover:bg-blue-50 disabled:opacity-50"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() => archivar(p)}
                  aria-label={`Archivar ${p.nombre}`}
                  className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Archive className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ),
        )}
      </ul>

      {editando === 'nuevo' ? (
        formulario
      ) : (
        <button
          type="button"
          disabled={guardando}
          onClick={() => abrir()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md border border-gray-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          Crear un puesto
        </button>
      )}

      {dialogo.elemento}
    </div>
  );
}
