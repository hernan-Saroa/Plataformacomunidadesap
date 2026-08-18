import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Settings } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { ActividadAplicable, CampoConfigurable, Modalidad } from '../../types';
import { ModuleHeader } from '../shared/ModuleHeader';
import { Modal } from '../shared/Modal';

import { DetalleActividad } from './DetalleActividad';
import { MatrizGeneral } from './MatrizGeneral';
import { TipologiasContrato } from './TipologiasContrato';
import { PETICIONES, Peticion } from './peticiones';

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
  const [campos, setCampos] = useState<CampoConfigurable[]>([]);
  const [cargandoCampos, setCargandoCampos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Matriz de actividades o tipologías de contrato: los dos son parámetros del flujo. */
  const [pestana, setPestana] = useState<'matriz' | 'tipologias'>('matriz');

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

  // Los campos se piden al abrir una actividad y no con la matriz: son 63
  // actividades y la tabla no los enseña, así que traerlos todos de entrada
  // serían 63 consultas para dibujar una rejilla que no los usa.
  useEffect(() => {
    if (!seleccion) {
      setCampos([]);
      return;
    }
    setCargandoCampos(true);
    contratacionService
      .campos(seleccion)
      .then(setCampos)
      .catch(() => setCampos([]))
      .finally(() => setCargandoCampos(false));
  }, [seleccion]);

  const recargarCampos = async () => {
    if (!seleccion) return;
    setCampos(await contratacionService.campos(seleccion));
  };

  /** Añade algo que el gestor tendrá que hacer para terminar la actividad. */
  const agregarCampo = async (peticion: Peticion) => {
    if (!seleccion) return;
    const { tipo, etiqueta } = PETICIONES[peticion];
    try {
      await contratacionService.crearCampo(seleccion, { tipo, etiqueta });
      await recargarCampos();
      toast.success('Se agregó a lo que debe hacer el gestor');
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo agregar');
    }
  };

  const renombrarCampo = async (campo: CampoConfigurable, etiqueta: string) => {
    try {
      await contratacionService.actualizarCampo(campo.id, { etiqueta });
      await recargarCampos();
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo cambiar el texto');
      throw err;
    }
  };

  /** Decide si el gestor puede terminar la actividad sin diligenciarlo. */
  const exigirCampo = async (campo: CampoConfigurable, obligatorio: boolean) => {
    try {
      await contratacionService.actualizarCampo(campo.id, {
        etiqueta: campo.etiqueta,
        obligatorio,
      });
      await recargarCampos();
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo cambiar');
    }
  };

  /**
   * Deja de pedirlo.
   *
   * El campo se desactiva en vez de borrarse: los procesos que ya guardaron un
   * valor ahí lo conservan, y borrarlo dejaría huérfano lo diligenciado.
   */
  const quitarCampo = async (campo: CampoConfigurable) => {
    try {
      await contratacionService.actualizarCampo(campo.id, {
        etiqueta: campo.etiqueta,
        activo: false,
      });
      await recargarCampos();
      toast.success('Ya no se le pedirá al gestor');
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo quitar');
    }
  };

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

      {/* Dos pestañas y no dos secciones del menú: la matriz y las tipologías
          son parámetros del mismo flujo, y separarlas obligaría a salir de la
          configuración para volver a entrar en ella. */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {(
          [
            ['matriz', 'Matriz de actividades'],
            ['tipologias', 'Tipologías de contrato'],
          ] as const
        ).map(([clave, etiqueta]) => (
          <button
            key={clave}
            type="button"
            onClick={() => setPestana(clave)}
            className={`px-3.5 py-2 text-[12.5px] font-bold border-b-2 -mb-px transition-colors ${
              pestana === clave
                ? 'border-[#003DA5] text-[#003DA5]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {pestana === 'matriz' ? (
        <MatrizGeneral onAbrir={abrirDetalle} />
      ) : (
        <TipologiasContrato />
      )}

      {/* La actividad se ajusta encima de la matriz, no en otra pantalla: al
          cerrar se vuelve a la tabla con la etapa desplegada y el sitio donde
          se estaba mirando tal como se dejó. */}
      <Modal
        isOpen={actividad !== null}
        onClose={() => setSeleccion(null)}
        title={actividad ? `${actividad.numeral} · ${actividad.nombre}` : ''}
        description={`En ${nombreModalidad}`}
        size="large"
        icon={<Settings className="w-5 h-5" />}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            {/* No hay botón de guardar porque no hay nada pendiente de guardar:
                cada cambio se envía al salir del campo. Decirlo evita cerrar
                el modal con la duda de haber perdido lo escrito. */}
            <p className="text-[11px] text-gray-500 m-0">
              Los cambios se guardan solos y no afectan procesos ya iniciados.
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
            campos={campos}
            cargandoCampos={cargandoCampos}
            onCambio={cambiarActividad}
            onAgregarCampo={agregarCampo}
            onRenombrarCampo={renombrarCampo}
            onExigirCampo={exigirCampo}
            onQuitarCampo={quitarCampo}
          />
        )}
      </Modal>
    </div>
  );
}
