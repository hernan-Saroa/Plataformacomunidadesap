import React, { useEffect, useMemo, useState } from 'react';
import {
  FileSignature,
  Plus,
  Search,
  FileText,
  AlertTriangle,
  CheckCircle2,
  FolderOpen,
  ArrowRight,
  Send,
  Lock,
} from 'lucide-react';

import { contratacionService } from '../../services/contratacionService';
import { Modalidad, ProcesoResumen } from '../../types';
import { ModuleHeader } from '../shared/ModuleHeader';
import { Modal } from '../shared/Modal';
import { StepperCompacto } from './StepperCompacto';

interface Props {
  /** Abre directamente el formulario del estudio previo. */
  onAbrir: (procesoId: string) => void;
  /** Abre el detalle con las actividades de la etapa. */
  onVerEtapa?: (procesoId: string) => void;
}

/** Estado del estudio previo, que es lo único que este HU gestiona. */
function estadoDe(proceso: ProcesoResumen) {
  const ep = proceso.estudioPrevio;
  if (ep?.estado === 'APROBADO') {
    return {
      texto: 'Aprobado',
      detalle: 'Puede continuar a las etapas siguientes',
      clase: 'bg-emerald-50 text-emerald-700',
      icono: <CheckCircle2 className="w-3.5 h-3.5" />,
      colorDetalle: 'text-emerald-700',
    };
  }
  if (ep?.estado === 'EN_REVISION') {
    return {
      texto: 'En revisión',
      detalle: 'Pendiente de aprobación',
      clase: 'bg-blue-50 text-[#003DA5]',
      icono: <Lock className="w-3.5 h-3.5" />,
      colorDetalle: 'text-[#003DA5]',
    };
  }
  const faltan = ep?.camposFaltantes ?? 0;
  if (faltan > 0) {
    return {
      texto: 'En elaboración',
      detalle: `Faltan ${faltan} ${faltan === 1 ? 'campo obligatorio' : 'campos obligatorios'}`,
      clase: 'bg-amber-50 text-amber-700',
      icono: <AlertTriangle className="w-3.5 h-3.5" />,
      colorDetalle: 'text-amber-700',
    };
  }
  return {
    texto: 'Listo para enviar',
    detalle: 'Todos los campos obligatorios diligenciados',
    clase: 'bg-blue-50 text-[#003DA5]',
    icono: <Send className="w-3.5 h-3.5" />,
    colorDetalle: 'text-[#003DA5]',
  };
}

/** El botón dice qué va a pasar, no un genérico "Abrir". */
function enviadoOEnCurso(proceso: ProcesoResumen) {
  const estado = proceso.estudioPrevio?.estado;
  if (estado === 'APROBADO') return 'Consultar';
  if (estado === 'EN_REVISION') return 'Revisar';
  return 'Diligenciar';
}

export function VistaProcesos({ onAbrir, onVerEtapa }: Props) {
  const [procesos, setProcesos] = useState<ProcesoResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [objeto, setObjeto] = useState('');
  const [modalidades, setModalidades] = useState<Modalidad[]>([]);
  const [modalidad, setModalidad] = useState('');
  const [errorModalidades, setErrorModalidades] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const cargar = async () => {
    setCargando(true);
    try {
      setProcesos(await contratacionService.listarProcesos());
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // El catálogo cambia con la normativa, así que se lee del backend en vez
    // de fijarlo en el bundle. Si falla hay que decirlo: la modalidad es
    // obligatoria, y un desplegable vacío sin explicación deja al usuario sin
    // poder crear el proceso ni saber por qué.
    contratacionService
      .modalidades()
      .then((lista) => {
        setModalidades(lista);
        setErrorModalidades(
          lista.length === 0 ? 'No hay modalidades configuradas. Avisa al administrador.' : null,
        );
      })
      .catch((err: any) => setErrorModalidades(err.message));
  }, []);

  const crear = async () => {
    if (!objeto.trim() || !modalidad) return;
    setGuardando(true);
    setError(null);
    try {
      const proceso = await contratacionService.crearProceso(objeto.trim(), modalidad);
      setCreando(false);
      setObjeto('');
      setModalidad('');
      onAbrir(proceso.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return procesos;
    return procesos.filter(
      (p) => p.radicado.toLowerCase().includes(q) || p.objeto.toLowerCase().includes(q),
    );
  }, [procesos, busqueda]);

  return (
    <div className="space-y-3 md:space-y-4">
      <ModuleHeader
        title="Procesos Contractuales"
        icon={<FileSignature className="w-[18px] h-[18px] text-white" strokeWidth={2} />}
        buttons={[
          {
            label: 'Nuevo proceso',
            labelMobile: 'Nuevo',
            icon: <Plus className="w-3.5 h-3.5" />,
            onClick: () => setCreando(true),
          },
        ]}
      />

      <Modal
        isOpen={creando}
        onClose={() => setCreando(false)}
        title="Nuevo proceso contractual"
        description="Se abrirá su expediente electrónico y se habilitará el estudio previo"
        icon={<Plus className="w-5 h-5 text-white" />}
        size="medium"
        footer={
          <>
            <button
              onClick={crear}
              disabled={!objeto.trim() || !modalidad || guardando}
              className="px-3.5 py-2 text-xs font-extrabold rounded-lg text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm active:scale-95 disabled:opacity-50 transition-all"
            >
              {guardando ? 'Creando…' : 'Crear y abrir estudio previo'}
            </button>
            <button
              onClick={() => setCreando(false)}
              className="px-3.5 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-700 hover:border-[#003DA5] hover:text-[#003DA5]"
            >
              Cancelar
            </button>
          </>
        }
      >
        <label htmlFor="nuevo-objeto" className="block text-xs font-bold text-gray-600 mb-1.5">
          Objeto a contratar <span className="text-red-600">*</span>
        </label>
        <textarea
          id="nuevo-objeto"
          value={objeto}
          onChange={(e) => setObjeto(e.target.value)}
          placeholder="Ej.: Adquisición de 50 equipos de cómputo para las sedes territoriales"
          className="w-full min-h-[110px] px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20"
        />
        <p className="text-[11px] text-gray-500 mt-2 mb-0 leading-relaxed">
          Describe con precisión el bien, servicio u obra a contratar. Este texto queda como objeto
          del proceso y se precarga en el estudio previo.
        </p>

        <label htmlFor="nueva-modalidad" className="block text-xs font-bold text-gray-600 mb-1.5 mt-4">
          Modalidad de selección <span className="text-red-600">*</span>
        </label>
        <select
          id="nueva-modalidad"
          value={modalidad}
          onChange={(e) => setModalidad(e.target.value)}
          disabled={modalidades.length === 0}
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white disabled:bg-gray-50 disabled:text-gray-400 focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20"
        >
          <option value="">
            {modalidades.length === 0 ? 'No se pudo cargar el listado' : 'Selecciona la modalidad…'}
          </option>
          {modalidades.map((m) => (
            <option key={m.codigo} value={m.codigo}>
              {m.nombre}
            </option>
          ))}
        </select>
        {errorModalidades ? (
          <p role="alert" className="text-[11px] font-bold text-red-600 mt-2 mb-0 leading-relaxed">
            {errorModalidades}
          </p>
        ) : (
          <p className="text-[11px] text-gray-500 mt-2 mb-0 leading-relaxed">
            Define qué actividades recorre el proceso: no todas aplican a todas las modalidades. Se
            ratifica al definir la modalidad en la actividad 3.5.
          </p>
        )}
      </Modal>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5">
          <p className="text-xs font-bold text-red-700 m-0">{error}</p>
        </div>
      )}

      {/* Buscador — solo aparece cuando hay suficientes procesos para justificarlo */}
      {procesos.length > 5 && (
        <div className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 flex items-center gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por radicado u objeto…"
              className="w-full pl-9 pr-3 py-1.5 text-[13px] rounded-lg border border-slate-300 focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20"
            />
          </div>
          <span className="text-[11px] font-semibold text-gray-400 tabular-nums">
            {filtrados.length} de {procesos.length}
          </span>
        </div>
      )}

      {cargando ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <p className="text-sm text-slate-500 m-0">Cargando procesos…</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <FolderOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-bold text-gray-600 m-0">
            {busqueda ? 'Sin resultados' : 'Aún no hay procesos'}
          </p>
          <p className="text-xs text-gray-400 m-0 mt-1">
            {busqueda
              ? 'Prueba con otro radicado u objeto.'
              : 'Crea el primero para elaborar su estudio previo.'}
          </p>
        </div>
      ) : (
        <div
          className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col"
          style={{ maxHeight: 'calc(100vh - 260px)' }}
        >
          <div className="overflow-y-auto">
            {filtrados.map((p) => {
              const estado = estadoDe(p);
              return (
                <div
                  key={p.id}
                  className="group flex items-start gap-3 px-4 py-3.5 border-b border-gray-100
                    last:border-b-0 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#E0EDFF] flex items-center justify-center flex-shrink-0">
                    <FileText className="w-[18px] h-[18px] text-[#003DA5]" strokeWidth={2} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-black text-[#003DA5] tabular-nums">
                        {p.radicado}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${estado.clase}`}
                      >
                        {estado.icono}
                        {estado.texto}
                      </span>
                    </div>

                    <p className="text-[13px] text-gray-700 m-0 mt-1 leading-snug line-clamp-2">
                      {p.objeto}
                    </p>

                    {/* Avance del proceso en las 10 etapas */}
                    <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                      <StepperCompacto etapaActual={p.etapa} />
                      <span className="text-[11px] font-bold text-gray-500 tabular-nums">
                        Etapa {p.etapa} de 10
                      </span>
                      <span className="text-gray-300 text-[11px]">·</span>
                      <span className={`text-[11px] font-semibold ${estado.colorDetalle}`}>
                        {estado.detalle}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-400 m-0 mt-1.5 tabular-nums">
                      Radicado {new Date(p.fechaRadicacion).toLocaleDateString('es-CO')}
                      {p.expediente ? ` · ${p.expediente.numeroExpediente}` : ''}
                    </p>
                  </div>

                  {/* Acción principal directa al formulario; el detalle de la
                      etapa queda como enlace secundario. */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                    {onVerEtapa && (
                      <button
                        type="button"
                        onClick={() => onVerEtapa(p.id)}
                        className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg text-slate-500
                          hover:text-[#003DA5] hover:bg-white border border-transparent
                          hover:border-slate-200 transition-all"
                      >
                        Ver etapa
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onAbrir(p.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold
                        rounded-lg text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm
                        active:scale-95 transition-all"
                    >
                      {enviadoOEnCurso(p)} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
