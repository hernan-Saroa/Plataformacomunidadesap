import React, { useEffect, useState } from 'react';
import { AlertTriangle, FileSignature, FileSpreadsheet, Grid3x3, Landmark, ListOrdered, Settings, ShieldCheck, Workflow } from 'lucide-react';
import { toast } from 'sonner';

import { contratacionService } from '../../services/contratacionService';
import { CampoConfigurable, FilaMatriz, Modalidad } from '../../types';
import { Modal } from '../shared/Modal';
import { ModuleHeader } from '../shared/ModuleHeader';

import { DetalleActividad } from './DetalleActividad';
import { MatrizGeneral } from './MatrizGeneral';
import { PermisosPorEtapa } from './PermisosPorEtapa';
import { TipologiasContrato } from './TipologiasContrato';
import { CdpAntesDeRadicar } from './CdpAntesDeRadicar';
import { CadenasDeAprobacion } from './CadenasDeAprobacion';
import { FlujoVisual } from './FlujoVisual';
import { PlanDeAdquisiciones } from '../paa/PlanDeAdquisiciones';
import { useAlcance } from '../../auth/alcance';
import { PETICIONES, Peticion } from './peticiones';

const PESTANAS = [
  { clave: 'matriz' as const, etiqueta: 'Matriz de actividades', icono: Grid3x3 },
  { clave: 'tipologias' as const, etiqueta: 'Tipologías', titulo: 'Tipologías de contrato', icono: FileSignature },
  { clave: 'flujo' as const, etiqueta: 'Flujo', titulo: 'Flujo de trabajo', icono: Workflow },
  { clave: 'cadenas' as const, etiqueta: 'Cadenas de aprobación', icono: ListOrdered },
  { clave: 'roles' as const, etiqueta: 'Permisos por etapa', icono: ShieldCheck },
  { clave: 'cdp' as const, etiqueta: 'CDP', titulo: 'CDP en el estudio previo', icono: Landmark },
  { clave: 'paa' as const, etiqueta: 'Plan de adquisiciones', icono: FileSpreadsheet },
];

type Pestana = (typeof PESTANAS)[number]['clave'];

/** Las pestañas agrupadas por para qué sirven: siete sueltas no se leían. */
const GRUPOS: { nombre: string; claves: Pestana[] }[] = [
  { nombre: 'Actividades', claves: ['matriz', 'tipologias'] },
  { nombre: 'Quién hace qué', claves: ['flujo', 'cadenas', 'roles'] },
  { nombre: 'Presupuesto', claves: ['cdp', 'paa'] },
];

/** Qué se abrió: la actividad, y la columna desde la que se llegó si fue una celda. */
interface Seleccion {
  numeral: string;
  modalidad: string | null;
}

/**
 * Configuraciones del módulo (EFDS-1183).
 *
 * La ficha de cada actividad se abre sin modalidad: lo que se pide, los formatos
 * y la aprobación rigen para las once, y abrirla «en Licitación Pública» hacía
 * creer que se cambiaba solo esa. Si se llega desde una celda, esa modalidad
 * queda señalada dentro de la ficha.
 */
export function VistaConfiguracion() {
  const [pestana, setPestana] = useState<Pestana>('matriz');
  const { puede } = useAlcance();
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);
  const [fila, setFila] = useState<FilaMatriz | null>(null);
  const [modalidades, setModalidades] = useState<Modalidad[]>([]);
  const [campos, setCampos] = useState<CampoConfigurable[]>([]);
  const [cargandoCampos, setCargandoCampos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Sube al cerrar la ficha: la matriz vuelve a leer lo que se cambió. */
  const [versionMatriz, setVersionMatriz] = useState(0);

  useEffect(() => {
    if (!seleccion) {
      setFila(null);
      setCampos([]);
      return;
    }
    setError(null);
    contratacionService
      .matriz()
      .then((m) => {
        setModalidades(m.modalidades);
        setFila(m.filas.find((f) => f.numeral === seleccion.numeral) ?? null);
      })
      .catch((err: any) => setError(err.message));

    setCargandoCampos(true);
    contratacionService
      .campos(seleccion.numeral)
      .then(setCampos)
      .catch(() => setCampos([]))
      .finally(() => setCargandoCampos(false));
  }, [seleccion?.numeral]);

  const recargarCampos = async () => {
    if (!seleccion) return;
    setCampos(await contratacionService.campos(seleccion.numeral));
  };

  const agregarCampo = async (peticion: Peticion) => {
    if (!seleccion) return;
    const { tipo, etiqueta } = PETICIONES[peticion];
    try {
      await contratacionService.crearCampo(seleccion.numeral, { tipo, etiqueta });
      await recargarCampos();
      toast.success('Se agregó a lo que debe diligenciar el gestor');
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

  const exigirCampo = async (campo: CampoConfigurable, obligatorio: boolean) => {
    try {
      await contratacionService.actualizarCampo(campo.id, { etiqueta: campo.etiqueta, obligatorio });
      await recargarCampos();
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo cambiar');
    }
  };

  const quitarCampo = async (campo: CampoConfigurable) => {
    try {
      await contratacionService.actualizarCampo(campo.id, { etiqueta: campo.etiqueta, activo: false });
      await recargarCampos();
      toast.success('Ya no se le pedirá al gestor');
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo quitar');
    }
  };

  const cerrar = () => {
    setSeleccion(null);
    setVersionMatriz((v) => v + 1);
  };

  return (
    <div className="space-y-3">
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-800 m-0">{error}</p>
        </div>
      )}

      {/* Cabecera y pestañas en píldora, como Configuraciones de control
          interno y gestión legal: quien administra los tres módulos encontraba
          aquí una pantalla que no se parecía a las otras dos. */}
      <ModuleHeader
        title="Configuraciones"
        subtitle="Actividades, flujo de trabajo, aprobaciones, permisos y Plan Anual de Adquisiciones"
        icon={<Settings className="w-5 h-5" />}
        color="#003DA5"
      />

      <nav
        aria-label="Secciones de configuración"
        className="bg-white rounded-xl shadow-sm border border-gray-200 px-2 py-1.5 flex flex-wrap items-end gap-y-2"
      >
        {GRUPOS.map((g, i) => {
          // El PAA se lo muestra solo a quien puede verlo: es de la Dirección,
          // no de todo el que configura actividades.
          const pestanas = PESTANAS.filter(
            (p) => g.claves.includes(p.clave) && (p.clave !== 'paa' || puede('ver', 'PAA')),
          );
          if (!pestanas.length) return null;
          return (
            <div key={g.nombre} className={`px-2 ${i > 0 ? 'border-l border-gray-100' : ''}`}>
              <p className="m-0 px-2 pb-1 text-xs font-bold uppercase tracking-wide text-slate-400">{g.nombre}</p>
              <div className="flex flex-wrap items-center gap-1">
                {pestanas.map(({ clave, etiqueta, icono: Icono, ...p }) => {
                  const activa = pestana === clave;
                  const titulo = 'titulo' in p ? p.titulo : undefined;
                  return (
                    <button
                      key={clave}
                      type="button"
                      onClick={() => setPestana(clave)}
                      aria-pressed={activa}
                      title={titulo}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5
                        transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
                          activa ? 'bg-[#003DA5] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                      <Icono className="w-4 h-4" aria-hidden="true" />
                      {etiqueta}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {pestana === 'matriz' && (
        <MatrizGeneral
          key={versionMatriz}
          onAbrir={(numeral, modalidad) => setSeleccion({ numeral, modalidad: modalidad || null })}
        />
      )}
      {pestana === 'tipologias' && <TipologiasContrato />}
      {/* De solo lectura: los roles se administran desde la plataforma, y un
          segundo sitio donde tocarlos dejaría dos verdades sin nada que las
          mantuviera de acuerdo. Aquí se verifica la que rige. */}
      {pestana === 'roles' && <PermisosPorEtapa />}
      {pestana === 'flujo' && <FlujoVisual />}
      {pestana === 'cadenas' && <CadenasDeAprobacion />}
      {pestana === 'cdp' && <CdpAntesDeRadicar />}
      {pestana === 'paa' && <PlanDeAdquisiciones />}

      <Modal
        isOpen={seleccion !== null}
        onClose={cerrar}
        title={fila ? `${fila.numeral} · ${fila.nombre}` : 'Cargando la actividad…'}
        description="Se configura una sola vez para todas las modalidades"
        size="large"
        icon={<Settings className="w-5 h-5" />}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            {/* No hay botón de guardar porque no hay nada pendiente: cada cambio
                se guarda al momento. Decirlo evita cerrar con la duda. */}
            <p className="text-[11px] text-gray-500 m-0">Cada cambio se guarda al momento.</p>
            <button
              type="button"
              onClick={cerrar}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cerrar
            </button>
          </div>
        }
      >
        {fila ? (
          <DetalleActividad
            fila={fila}
            modalidades={modalidades}
            resaltada={seleccion?.modalidad ?? null}
            campos={campos}
            cargandoCampos={cargandoCampos}
            onCambioFila={setFila}
            onAgregarCampo={agregarCampo}
            onRenombrarCampo={renombrarCampo}
            onExigirCampo={exigirCampo}
            onQuitarCampo={quitarCampo}
          />
        ) : (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
