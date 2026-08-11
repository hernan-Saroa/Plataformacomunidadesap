import React, { useEffect, useMemo, useState } from 'react';
import { Settings, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import {
  ActividadAplicable,
  CampoConfigurable,
  GuardarRegla,
  Modalidad,
  ReglaActividad,
} from '../../types';
import { ModuleHeader } from '../shared/ModuleHeader';
import { Modal } from '../shared/Modal';

import { ArbolActividades, ETAPA_INICIAL } from './ArbolActividades';
import { CabeceraActividad } from './CabeceraActividad';
import { ConstructorCondiciones } from './ConstructorCondiciones';
import { DialogoImpacto } from './DialogoImpacto';
import { EditorRegla } from './EditorRegla';
import { EditorReglaSimple } from './EditorReglaSimple';
import { LeyendaEstados } from './estados';
import { MatrizCobertura } from './MatrizCobertura';
import { PanelCampos } from './PanelCampos';
import { PanelReglas } from './PanelReglas';
import { VistaPreviaFormulario } from './VistaPreviaFormulario';

type Pestana = 'reglas' | 'cobertura' | 'campos' | 'preview';

const PESTANAS: [Pestana, string][] = [
  ['reglas', 'Reglas'],
  ['cobertura', 'Cobertura'],
  ['campos', 'Campos'],
  ['preview', 'Vista previa'],
];

/**
 * Módulo de Configuración de Etapas.
 *
 * Orquesta las piezas: el árbol a la izquierda, y a la derecha la actividad
 * elegida con sus reglas, su cobertura entre modalidades, los textos de su
 * formulario y una vista previa de lo que producen las reglas.
 *
 * La modalidad es un filtro y no el eje: la mayoría de reglas aplican a todas,
 * así que ordenar la pantalla por modalidad escondía justo lo compartido.
 */
export function VistaConfiguracion() {
  const [modalidades, setModalidades] = useState<Modalidad[]>([]);
  const [modalidad, setModalidad] = useState('');
  const [actividades, setActividades] = useState<ActividadAplicable[]>([]);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [reglas, setReglas] = useState<ReglaActividad[]>([]);
  const [campos, setCampos] = useState<CampoConfigurable[]>([]);
  const [pestana, setPestana] = useState<Pestana>('reglas');

  const [cargando, setCargando] = useState(false);
  const [cargandoReglas, setCargandoReglas] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editando, setEditando] = useState<ReglaActividad | null | undefined>(undefined);
  const [alcanceNueva, setAlcanceNueva] = useState<'global' | 'excepcion'>('global');
  const [avisandoImpacto, setAvisandoImpacto] = useState<ReglaActividad | null>(null);
  // Contratacion configura lo comun; soporte entra al constructor completo.
  const [modoAvanzado, setModoAvanzado] = useState(false);

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
    setCargando(true);
    setError(null);
    contratacionService
      .actividadesDeModalidad(modalidad)
      .then((lista) => {
        setActividades(lista);
        setSeleccion((actual) =>
          actual && lista.some((a) => a.numeral === actual)
            ? actual
            : (lista.find((a) => a.etapa === ETAPA_INICIAL) ?? lista[0])?.numeral ?? null,
        );
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setCargando(false));
  }, [modalidad]);

  useEffect(() => {
    if (!seleccion) return;
    setCargandoReglas(true);
    Promise.all([
      contratacionService.reglasDe(seleccion, modalidad),
      contratacionService.campos(seleccion),
    ])
      .then(([lista, defs]) => {
        setReglas(lista);
        setCampos(defs);
      })
      .catch(() => {
        setReglas([]);
        setCampos([]);
      })
      .finally(() => setCargandoReglas(false));
  }, [seleccion, modalidad]);

  const recargar = async () => {
    if (!seleccion) return;
    const [lista, actualizadas] = await Promise.all([
      contratacionService.reglasDe(seleccion, modalidad),
      // El árbol muestra cuántas reglas tiene cada actividad, así que crear o
      // derogar una cambia lo que se ve a la izquierda.
      contratacionService.actividadesDeModalidad(modalidad),
    ]);
    setReglas(lista);
    setActividades(actualizadas);
  };

  /** Editar una global avisa antes: el cambio se propaga a todas. */
  const pedirEdicion = (regla: ReglaActividad) => {
    // Editar entra siempre al constructor: la regla puede tener una forma que
    // el modo simple no sabria representar sin perder informacion.
    setModoAvanzado(true);
    if (!regla.modalidad) setAvisandoImpacto(regla);
    else setEditando(regla);
  };

  const guardarRegla = async (datos: GuardarRegla) => {
    if (!seleccion) return;
    try {
      if (editando) await contratacionService.reemplazarRegla(editando.id, datos);
      else await contratacionService.crearRegla(seleccion, datos);
      await recargar();
      setEditando(undefined);
      toast.success(editando ? 'Regla actualizada' : 'Regla creada');
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo guardar la regla');
    }
  };

  const derogar = async (regla: ReglaActividad) => {
    if (!window.confirm('La regla deja de aplicarse a los procesos nuevos. ¿Continuar?')) return;
    try {
      await contratacionService.derogarRegla(regla.id);
      await recargar();
      toast.success('Regla derogada');
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo derogar');
    }
  };

  const cambiarActividad = (cambios: Partial<ActividadAplicable>) =>
    setActividades((lista) =>
      lista.map((a) => (a.numeral === seleccion ? { ...a, ...cambios } : a)),
    );

  return (
    <div className="space-y-5">
      <ModuleHeader
        icon={<Settings className="w-6 h-6" />}
        title="Configuración de etapas"
        subtitle="Qué actividades recorre cada modalidad y qué debe cumplirse en cada una"
        color="#64748B"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">
            Modalidad
          </label>
          <select
            value={modalidad}
            onChange={(e) => setModalidad(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm min-w-[280px] focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] outline-none"
          >
            {modalidades.map((m) => (
              <option key={m.codigo} value={m.codigo}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>
        <LeyendaEstados />
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2"
        >
          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-800 m-0">{error}</p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] items-start">
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <ArbolActividades
            actividades={actividades}
            seleccion={seleccion}
            onSeleccionar={setSeleccion}
            cargando={cargando}
          />
        </div>

        {actividad ? (
          <div className="space-y-4">
            <CabeceraActividad
              actividad={actividad}
              modalidad={modalidad}
              onCambio={cambiarActividad}
            />

            <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
              {PESTANAS.map(([id, texto]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPestana(id)}
                  className={`whitespace-nowrap px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                    pestana === id
                      ? 'border-[#003DA5] text-[#003DA5]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {texto}
                </button>
              ))}
            </div>

            {pestana === 'reglas' && (
              <PanelReglas
                reglas={reglas}
                modalidades={modalidades}
                cargando={cargandoReglas}
                onCrear={(alcance) => {
                  setAlcanceNueva(alcance);
                  setModoAvanzado(false);
                  setEditando(null);
                }}
                onEditar={pedirEdicion}
                onDerogar={derogar}
              />
            )}

            {pestana === 'cobertura' && (
              <MatrizCobertura
                numeral={actividad.numeral}
                onAbrirRegla={(id) => {
                  const r = reglas.find((x) => x.id === id);
                  if (r) {
                    setPestana('reglas');
                    pedirEdicion(r);
                  }
                }}
              />
            )}

            {pestana === 'campos' && <PanelCampos numeral={actividad.numeral} />}

            {pestana === 'preview' && (
              <VistaPreviaFormulario
                numeral={actividad.numeral}
                modalidades={modalidades}
                modalidadInicial={modalidad}
              />
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
            <p className="text-sm text-gray-500 m-0">Elige una actividad para ver su detalle.</p>
          </div>
        )}
      </div>

      <DialogoImpacto
        abierto={avisandoImpacto !== null}
        cuantasModalidades={modalidades.length}
        modalidadActual={
          modalidades.find((m) => m.codigo === modalidad)?.nombre ?? modalidad
        }
        onCambiarEnTodas={() => {
          setEditando(avisandoImpacto);
          setAvisandoImpacto(null);
        }}
        onCrearExcepcion={() => {
          // Nace como excepción con el contenido de la global, para no
          // reescribirla desde cero.
          setAlcanceNueva('excepcion');
          setEditando(null);
          setAvisandoImpacto(null);
        }}
        onCancelar={() => setAvisandoImpacto(null)}
      />

      <Modal
        isOpen={editando !== undefined}
        onClose={() => setEditando(undefined)}
        title={editando ? 'Editar regla' : modoAvanzado ? 'Nueva regla · avanzado' : 'Nueva regla'}
        description={actividad ? `${actividad.numeral} · ${actividad.nombre}` : ''}
        size="large"
        icon={<Settings className="w-5 h-5" />}
      >
        {editando !== undefined &&
          (modoAvanzado || editando ? (
            <EditorRegla
              modalidadActual={modalidad}
              modalidades={modalidades}
              campos={campos}
              regla={editando}
              alcanceInicial={alcanceNueva}
              onGuardar={guardarRegla}
              onCancelar={() => setEditando(undefined)}
            />
          ) : (
            <EditorReglaSimple
              modalidadActual={modalidad}
              modalidades={modalidades}
              campos={campos}
              alcanceInicial={alcanceNueva}
              onGuardar={guardarRegla}
              onCancelar={() => setEditando(undefined)}
              onAvanzado={() => setModoAvanzado(true)}
            />
          ))}
      </Modal>
    </div>
  );
}
