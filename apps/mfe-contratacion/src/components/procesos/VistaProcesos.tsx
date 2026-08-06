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
  List as ListIcon,
  Columns3,
  Lightbulb,
} from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@esap-mfe/shared-ui/empty-state';
import { SkeletonTable } from '@esap-mfe/shared-ui/skeleton';

import { contratacionService } from '../../services/contratacionService';
import { useSugerenciaModalidad } from '../../hooks/useSugerenciaModalidad';
import { Modalidad, ProcesoResumen } from '../../types';
import { ModuleHeader } from '../shared/ModuleHeader';
import { Modal } from '../shared/Modal';
import { PaginationPremium } from '../shared/PaginationPremium';
import { TableroProcesos } from './TableroProcesos';
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

const formatoPesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/**
 * Acepta lo que la gente escribe de verdad —"45.000.000", "45000000",
 * "$ 45.000.000"— y devuelve el número, o null si no hay uno válido.
 */
function aNumero(texto: string): number | null {
  const limpio = texto.replace(/[^\d,]/g, '').replace(',', '.');
  if (!limpio) return null;
  const n = Number(limpio);
  return Number.isFinite(n) && n >= 0 ? n : null;
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
  // Falló la carga del listado: cambia qué se pinta, por eso es estado y no
  // solo un toast. El detalle del error va en la notificación.
  const [fallo, setFallo] = useState(false);
  const [creando, setCreando] = useState(false);
  const [objeto, setObjeto] = useState('');
  const [valorTexto, setValorTexto] = useState('');
  const [modalidades, setModalidades] = useState<Modalidad[]>([]);
  const [modalidad, setModalidad] = useState('');
  const [errorModalidades, setErrorModalidades] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(20);
  // La lista responde "qué hay"; el tablero, "dónde está represado". Se recuerda
  // la elección para no obligar a cambiarla en cada visita.
  const [vista, setVista] = useState<'lista' | 'tablero'>(
    () => (localStorage.getItem('contratacion:vista') as 'lista' | 'tablero') || 'lista',
  );

  const cambiarVista = (nueva: 'lista' | 'tablero') => {
    setVista(nueva);
    localStorage.setItem('contratacion:vista', nueva);
  };

  const cargar = async () => {
    setCargando(true);
    try {
      setProcesos(await contratacionService.listarProcesos());
      setFallo(false);
    } catch (err: any) {
      setFallo(true);
      // id fijo: si la carga falla varias veces (montaje, reintento, recarga),
      // el toast se reemplaza en vez de apilar copias idénticas.
      toast.error('No se pudieron cargar los procesos', {
        id: 'procesos-carga',
        description: err.message,
      });
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

  const valorEstimado = useMemo(() => aNumero(valorTexto), [valorTexto]);
  const { sugerencia, consultando } = useSugerenciaModalidad(creando ? valorEstimado : null);

  const bloqueadas = sugerencia?.modalidadesBloqueadas ?? [];

  // Superado el umbral, la licitación pública es obligatoria: se fija sola en
  // vez de dejar al usuario elegir algo que el backend va a rechazar. Solo se
  // pisa lo que quedó vetado; si eligió una modalidad permitida, se respeta.
  useEffect(() => {
    if (!sugerencia?.forzosa || !sugerencia.modalidad) return;
    if (modalidad === '' || bloqueadas.includes(modalidad)) {
      setModalidad(sugerencia.modalidad);
    }
  }, [sugerencia, modalidad]);

  const crear = async () => {
    if (!objeto.trim() || !modalidad || valorEstimado === null) return;
    setGuardando(true);
    try {
      const proceso = await contratacionService.crearProceso(
        objeto.trim(),
        modalidad,
        valorEstimado,
      );
      setCreando(false);
      setObjeto('');
      setModalidad('');
      setValorTexto('');
      toast.success(`Proceso ${proceso.radicado} creado`);
      onAbrir(proceso.id);
    } catch (err: any) {
      // El modal sigue abierto con lo digitado, para que no haya que
      // reescribirlo si el guardado falla.
      toast.error('No se pudo crear el proceso', { description: err.message });
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

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));

  // Al filtrar, la página actual puede quedar más allá del último resultado y
  // la tabla se vería vacía teniendo resultados. Se vuelve a la primera.
  useEffect(() => {
    setPagina(1);
  }, [busqueda, porPagina]);

  const visibles = useMemo(
    () => filtrados.slice((pagina - 1) * porPagina, pagina * porPagina),
    [filtrados, pagina, porPagina],
  );

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
              disabled={!objeto.trim() || !modalidad || valorEstimado === null || guardando}
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

        {/* Se pide aquí y no en el estudio previo porque de la cuantía depende
            la modalidad aplicable (EFDS-1147). */}
        <label htmlFor="nuevo-valor" className="block text-xs font-bold text-gray-600 mb-1.5 mt-4">
          Valor estimado del contrato <span className="text-red-600">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
            $
          </span>
          <input
            id="nuevo-valor"
            type="text"
            inputMode="numeric"
            value={valorTexto}
            onChange={(e) => setValorTexto(e.target.value)}
            placeholder="45.000.000"
            className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-gray-300 tabular-nums focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20"
          />
        </div>
        <p className="text-[11px] text-gray-500 mt-2 mb-0 leading-relaxed">
          {valorEstimado !== null
            ? `${formatoPesos.format(valorEstimado)} · presupuesto oficial en pesos, según el análisis del sector.`
            : 'Presupuesto oficial en pesos, según el análisis del sector.'}
        </p>

        <label htmlFor="nueva-modalidad" className="block text-xs font-bold text-gray-600 mb-1.5 mt-4">
          Modalidad de selección <span className="text-red-600">*</span>
        </label>
        <select
          id="nueva-modalidad"
          value={modalidad}
          onChange={(e) => setModalidad(e.target.value)}
          disabled={modalidades.length === 0}
          aria-describedby="ayuda-modalidad"
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white disabled:bg-gray-50 disabled:text-gray-400 focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20"
        >
          <option value="">
            {modalidades.length === 0 ? 'No se pudo cargar el listado' : 'Selecciona la modalidad…'}
          </option>
          {modalidades.map((m) => {
            // Se deshabilitan en vez de ocultarse: ver la opción vetada y su
            // motivo explica la regla; quitarla del listado la haría parecer
            // inexistente.
            const vetada = bloqueadas.includes(m.codigo);
            return (
              <option key={m.codigo} value={m.codigo} disabled={vetada}>
                {m.nombre}
                {vetada ? ' — no aplica por la cuantía' : ''}
              </option>
            );
          })}
        </select>

        <div id="ayuda-modalidad">
          {errorModalidades ? (
            <p role="alert" className="text-[11px] font-bold text-red-600 mt-2 mb-0 leading-relaxed">
              {errorModalidades}
            </p>
          ) : consultando ? (
            <p className="text-[11px] text-gray-400 mt-2 mb-0">Calculando la modalidad…</p>
          ) : sugerencia?.forzosa && sugerencia.modalidad ? (
            // Asignación obligatoria: el tono es de aviso, no de sugerencia.
            <div
              role="status"
              className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 flex items-start gap-2"
            >
              <Lock className="w-3.5 h-3.5 text-amber-700 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-amber-900 m-0 leading-relaxed">
                <span className="font-bold">{sugerencia.nombre} obligatoria.</span>{' '}
                {sugerencia.motivo}. Las modalidades de menor cuantía quedan deshabilitadas.
              </p>
            </div>
          ) : sugerencia?.modalidad ? (
            // Orientación: se puede ignorar, y se dice explícitamente.
            <div
              role="status"
              className="mt-2 rounded-lg border border-[#003DA5]/20 bg-[#E0EDFF] px-3 py-2 flex items-start gap-2"
            >
              <Lightbulb className="w-3.5 h-3.5 text-[#003DA5] mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-slate-700 m-0 leading-relaxed">
                Por la cuantía corresponde <span className="font-bold">{sugerencia.nombre}</span>.
                Es una sugerencia: puedes elegir otra si la causal lo justifica.
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-gray-500 mt-2 mb-0 leading-relaxed">
              Define qué actividades recorre el proceso: no todas aplican a todas las modalidades.
              Se ratifica al definir la modalidad en la actividad 3.5.
            </p>
          )}
        </div>
      </Modal>

      {/* Barra de herramientas: buscar a la izquierda, elegir vista a la derecha. */}
      {!cargando && !fallo && procesos.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 flex items-center gap-3 flex-wrap shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search
              className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por radicado u objeto…"
              aria-label="Buscar procesos"
              className="w-full pl-9 pr-3 py-2 text-[13px] rounded-lg border border-slate-200 bg-slate-50
                placeholder:text-slate-400 transition-colors
                hover:border-slate-300
                focus:bg-white focus:outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/15"
            />
          </div>

          {/* El contador solo aparece cuando filtra: sin búsqueda repetiría el
              total que ya está en el pie de la tabla. */}
          {busqueda.trim() && (
            <span className="text-[11px] font-bold text-slate-500 tabular-nums" aria-live="polite">
              {filtrados.length} de {procesos.length}
            </span>
          )}

          <div className="ml-auto flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5" role="group" aria-label="Vista">
            {(
              [
                { id: 'lista', etiqueta: 'Lista', icono: <ListIcon className="w-3.5 h-3.5" /> },
                { id: 'tablero', etiqueta: 'Tablero', icono: <Columns3 className="w-3.5 h-3.5" /> },
              ] as const
            ).map((opcion) => (
              <button
                key={opcion.id}
                type="button"
                onClick={() => cambiarVista(opcion.id)}
                aria-pressed={vista === opcion.id}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                  vista === opcion.id
                    ? 'bg-white text-[#003DA5] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {opcion.icono}
                {opcion.etiqueta}
              </button>
            ))}
          </div>
        </div>
      )}

      {cargando ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <SkeletonTable rows={5} columns={4} />
        </div>
      ) : fallo ? (
        <div className="bg-white border border-gray-200 rounded-xl">
          <EmptyState
            variant="error"
            icon={AlertTriangle}
            title="No se pudieron cargar los procesos"
            description="Revisa tu conexión e inténtalo de nuevo."
            action={{ label: 'Reintentar', onClick: cargar }}
          />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl">
          <EmptyState
            variant={busqueda ? 'search' : 'default'}
            icon={busqueda ? Search : FolderOpen}
            title={busqueda ? 'Sin resultados' : 'Aún no hay procesos'}
            description={
              busqueda
                ? 'Prueba con otro radicado u objeto.'
                : 'Crea el primero para elaborar su estudio previo.'
            }
            action={
              busqueda ? undefined : { label: 'Nuevo proceso', onClick: () => setCreando(true), icon: Plus }
            }
          />
        </div>
      ) : vista === 'tablero' ? (
        <TableroProcesos procesos={filtrados} estadoDe={estadoDe} onAbrir={onAbrir} />
      ) : (
        <div
          className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col
            shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          style={{ maxHeight: 'calc(100vh - 260px)' }}
        >
          {/* Encabezados solo donde hay columnas: por debajo de 1280px la fila
              se apila y unos rótulos fijos no corresponderían a nada. */}
          <div
            className="encabezado-procesos px-4 py-2 border-b border-gray-200 bg-slate-50"
            aria-hidden="true"
          >
            <span />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Proceso
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Etapa
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Estado
            </span>
            <span />
          </div>

          <div className="overflow-y-auto">
            {visibles.map((p) => {
              const estado = estadoDe(p);
              return (
                <div
                  key={p.id}
                  /* La rejilla vive en layout.css: apilada en pantallas
                     estrechas, en columnas desde 1280px. */
                  className="fila-proceso group px-4 py-3.5 border-b border-gray-100
                    last:border-b-0 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#E0EDFF] flex items-center justify-center flex-shrink-0">
                    <FileText className="w-[18px] h-[18px] text-[#003DA5]" strokeWidth={2} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-black text-[#003DA5] tabular-nums">
                        {p.radicado}
                      </span>
                      {/* Con columnas, el estado tiene la suya. */}
                      <span
                        className={`solo-apilado inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${estado.clase}`}
                      >
                        {estado.icono}
                        {estado.texto}
                      </span>
                    </div>

                    <p className="text-[13px] text-gray-700 m-0 mt-1 leading-snug line-clamp-2">
                      {p.objeto}
                    </p>

                    {/* Sin columna de estado, el detalle acompaña al objeto. */}
                    <span
                      className={`solo-apilado text-[11px] font-semibold mt-1 ${estado.colorDetalle}`}
                    >
                      {estado.detalle}
                    </span>

                    {/* La modalidad decide qué actividades recorre el proceso;
                        sin verla, dos procesos distintos parecen el mismo. */}
                    <p className="text-[11px] text-gray-400 m-0 mt-1.5 tabular-nums">
                      {p.modalidadNombre || p.modalidad ? (
                        <span className="font-bold text-[#003DA5]">
                          {p.modalidadNombre ?? p.modalidad}
                        </span>
                      ) : null}
                      {(p.modalidadNombre || p.modalidad) && ' · '}
                      {typeof p.valorEstimado === 'number'
                        ? `${formatoPesos.format(p.valorEstimado)} · `
                        : ''}
                      Radicado {new Date(p.fechaRadicacion).toLocaleDateString('es-CO')}
                      {p.expediente ? ` · ${p.expediente.numeroExpediente}` : ''}
                    </p>
                  </div>

                  {/* Etapa */}
                  <div className="celda-apilada min-w-0">
                    <StepperCompacto etapaActual={p.etapa} />
                    <span className="block text-[11px] font-bold text-gray-500 tabular-nums mt-1">
                      Etapa {p.etapa} de 10
                    </span>
                  </div>

                  {/* Estado: columna propia solo cuando hay ancho para ella. */}
                  <div className="solo-columnas min-w-0">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${estado.clase}`}
                    >
                      {estado.icono}
                      {estado.texto}
                    </span>
                    <span
                      className={`block text-[11px] font-semibold mt-1 ${estado.colorDetalle}`}
                    >
                      {estado.detalle}
                    </span>
                  </div>

                  {/* Acción principal directa al formulario; el detalle de la
                      etapa queda como enlace secundario. */}
                  <div className="celda-apilada flex items-center gap-1.5 flex-shrink-0 justify-end">
                    {onVerEtapa && (
                      <button
                        type="button"
                        onClick={() => onVerEtapa(p.id)}
                        className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg text-slate-500
                          hover:text-[#003DA5] hover:bg-white border border-transparent
                          hover:border-slate-200 transition-all
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003DA5]/40"
                      >
                        Ver etapa
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onAbrir(p.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold
                        rounded-lg text-white bg-[#003DA5] hover:bg-[#002e7d] shadow-sm
                        active:scale-95 transition-all
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003DA5]/40
                        focus-visible:ring-offset-1"
                    >
                      {enviadoOEnCurso(p)} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Con pocos procesos el pie estorba más de lo que ayuda; el selector
              de tamaño solo aparece cuando hay algo que paginar. */}
          {filtrados.length > porPagina && (
            <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex-shrink-0">
              <PaginationPremium
                currentPage={pagina}
                totalPages={totalPaginas}
                onPageChange={setPagina}
                itemsPerPage={porPagina}
                totalItems={filtrados.length}
                onItemsPerPageChange={setPorPagina}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
