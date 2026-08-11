import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Settings } from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { ActividadAplicable, Modalidad } from '../../types';
import { ModuleHeader } from '../shared/ModuleHeader';
import { Modal } from '../shared/Modal';

import { DetalleActividad } from './DetalleActividad';
import { MatrizGeneral } from './MatrizGeneral';

/**
 * Módulo de Configuración de Etapas.
 *
 * Una sola pantalla: la matriz. Pulsar una celda abre esa actividad en un
 * modal, se ajusta y se cierra — la tabla sigue debajo, con el sitio donde se
 * estaba mirando intacto.
 *
 * Aquí se configura lo que cambia sin desplegar: si una actividad se recorre en
 * cada modalidad, y el texto que lee el gestor. Las condiciones que valida cada
 * actividad se escriben en el código de la etapa: son lógica de negocio, y
 * mantenerlas también en una pantalla obligaba a que dos sitios dijeran lo
 * mismo sin nada que los mantuviera de acuerdo.
 */
export function VistaConfiguracion() {
  const [modalidades, setModalidades] = useState<Modalidad[]>([]);
  const [modalidad, setModalidad] = useState('');
  const [actividades, setActividades] = useState<ActividadAplicable[]>([]);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actividad = useMemo(
    () => actividades.find((a) => a.numeral === seleccion) ?? null,
    [actividades, seleccion],
  );

  useEffect(() => {
    contratacionService
      .modalidades()
      .then((lista) => {
        setModalidades(lista);
        if (lista.length > 0) setModalidad(lista[0].codigo);
      })
      .catch((err: any) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!modalidad) return;
    setError(null);
    contratacionService
      .actividadesDeModalidad(modalidad)
      .then((lista) => {
        setActividades(lista);
        // Solo se conserva lo que ya estaba abierto. Elegir una actividad por
        // defecto abriría el modal sin que nadie lo pida.
        setSeleccion((actual) =>
          actual && lista.some((a) => a.numeral === actual) ? actual : null,
        );
      })
      .catch((err: any) => setError(err.message));
  }, [modalidad]);

  const cambiarActividad = (cambios: Partial<ActividadAplicable>) =>
    setActividades((lista) =>
      lista.map((a) => (a.numeral === seleccion ? { ...a, ...cambios } : a)),
    );

  /**
   * Abrir una celda de la matriz en el modal.
   *
   * Cambiar la modalidad recarga las actividades, así que la selección se fija
   * antes: el efecto la conserva si el numeral existe en la lista nueva.
   */
  const abrirDetalle = (numeral: string, codigoModalidad?: string) => {
    if (codigoModalidad && codigoModalidad !== modalidad) setModalidad(codigoModalidad);
    setSeleccion(numeral);
  };

  const nombreModalidad =
    modalidades.find((m) => m.codigo === modalidad)?.nombre ?? modalidad;

  return (
    <div className="space-y-5">
      <ModuleHeader
        icon={<Settings className="w-6 h-6" />}
        title="Configuración de etapas"
        subtitle="Qué actividades recorre cada modalidad de contratación"
        color="#64748B"
      />

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2"
        >
          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-800 m-0">{error}</p>
        </div>
      )}

      <MatrizGeneral onAbrir={abrirDetalle} />

      {/* La actividad se ajusta encima de la matriz, no en otra pantalla: al
          cerrar se vuelve a la tabla con la etapa desplegada y el sitio donde
          se estaba mirando tal como se dejó. */}
      <Modal
        isOpen={actividad !== null}
        onClose={() => setSeleccion(null)}
        title={actividad ? `${actividad.numeral} · ${actividad.nombre}` : ''}
        description={`En ${nombreModalidad}`}
        size="medium"
        icon={<Settings className="w-5 h-5" />}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            {/* Lo que hace seguro configurar: nada de esto toca lo que ya está
                en marcha, y saberlo antes de tocar quita el miedo a probar. */}
            <p className="text-[11px] text-gray-500 m-0">
              Los cambios no afectan procesos ya iniciados.
            </p>
            <button
              type="button"
              onClick={() => setSeleccion(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cerrar
            </button>
          </div>
        }
      >
        {actividad && (
          <DetalleActividad
            actividad={actividad}
            modalidad={modalidad}
            modalidades={modalidades}
            onCambio={cambiarActividad}
          />
        )}
      </Modal>
    </div>
  );
}
