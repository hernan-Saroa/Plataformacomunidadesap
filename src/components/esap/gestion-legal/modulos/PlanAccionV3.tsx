import { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Progress } from '../../../ui/progress';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import {
  Target, BarChart3, Activity, TrendingUp, Award, CheckCircle, AlertCircle,
  Calendar, Eye, Plus, Search, Filter, List, Clock, User, FolderOpen, Download
} from 'lucide-react';
import { toast } from 'sonner';
import { ModuleHeader } from '../design-system/ModuleHeader';
import { ModuleMetrics } from '../design-system/ModuleMetrics';
import { ModuleFilters } from '../design-system/ModuleFilters';
import { ModuleInfoTooltip } from '../design-system/ModuleInfoTooltip';

// Import New Modals
import { ModalCrearIndicador } from './pei/ModalCrearIndicador';
import { ModalActualizarAvance } from './pei/ModalActualizarAvance';
import { ModalDetalleIndicador } from './pei/ModalDetalleIndicador';
import axios from 'axios';

const API_URL = 'http://localhost:3008/api/legal/pei';

export function ModuloPlanAccionV3() {
  const [tipoVista, setTipoVista] = useState<'timeline' | 'lista'>('timeline');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEje, setFiltroEje] = useState<string>('TODOS');
  const [ocultarCompletados, setOcultarCompletados] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // States for Data
  const [indicadores, setIndicadores] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ indicadores_activos: 0, avance_global: 0, vencidos: 0 });
  const [loading, setLoading] = useState(true);

  // States for Modals
  const [showCrear, setShowCrear] = useState(false);
  const [showDetalle, setShowDetalle] = useState(false);
  const [showAvance, setShowAvance] = useState(false);
  const [selectedInd, setSelectedInd] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/dashboard`);
      setIndicadores(Array.isArray(res.data.indicadores) ? res.data.indicadores : []);
      setStats(res.data.stats || { indicadores_activos: 0, avance_global: 0, vencidos: 0 });
    } catch (error) {
      console.error("Error fetching PEI dashboard", error);
      toast.error("Error cargando tablero PEI");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const indicadoresFiltrados = useMemo(() => {
    if (!Array.isArray(indicadores)) return [];
    let resultado = [...indicadores];

    if (busqueda) {
      resultado = resultado.filter(i =>
        i.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (i.responsableNombre && i.responsableNombre.toLowerCase().includes(busqueda.toLowerCase()))
      );
    }

    if (filtroEje !== 'TODOS') {
      resultado = resultado.filter(i => i.ejeEstrategico === filtroEje);
    }

    if (ocultarCompletados) {
      resultado = resultado.filter(i => {
        const cleanValue = (val: any) => {
          if (!val) return 0;
          // Clean %, commas, ensure string
          const strVal = String(val).replace(/%/g, '').replace(',', '.').trim();
          return parseFloat(strVal) || 0;
        };

        const avance = cleanValue(i.avanceActual);
        const meta = cleanValue(i.metaObjetivo);

        // Ocultar si completó el 99% o más (to handle rounding)
        if (avance >= 99) return false;

        // Ocultar si alcanzó la meta (si la meta es válida)
        if (meta > 0 && avance >= meta) return false;

        return true;
      });
    }

    return resultado;
  }, [busqueda, filtroEje, indicadores, ocultarCompletados]);

  const handleVerIndicador = (ind: any) => {
    setSelectedInd(ind);
    setShowDetalle(true);
  };

  const handleActualizar = (ind: any) => {
    setSelectedInd(ind);
    setShowAvance(true);
  };

  // Helper for Eje Mapping (Backend stores short codes like GESTION, Frontend uses keys)
  // We need to align keys. Backend: GESTION, TALENTO, TRANSPARENCIA, TECNOLOGIA
  // Frontend Timeline expects these exact keys? 
  // Let's check `ColumnaEje` keys map.
  // The backend returns `ejeEstrategico` strings.

  return (
    <div className="space-y-4">
      {/* Header con ModuleHeader */}
      <ModuleHeader
        title={isMobile ? 'Plan de Acción' : 'Plan de Acción Institucional'}
        subtitle="Seguimiento a indicadores y objetivos estratégicos"
        toggleView={{
          current: tipoVista,
          onChange: (view) => setTipoVista(view as any),
          options: [
            { label: 'Timeline', icon: <TrendingUp className="w-4 h-4" />, value: 'timeline' },
            { label: 'Lista', icon: <List className="w-4 h-4" />, value: 'lista' }
          ]
        }}
        buttons={[
          {
            label: 'Nuevo Indicador',
            labelMobile: 'Nuevo',
            icon: <Plus className="w-4 h-4" />,
            onClick: () => setShowCrear(true),
            variant: 'primary'
          }
        ]}
        infoTooltip={<ModuleInfoTooltip title="Guía PEI" variant="icon" sections={[]} />}
      />

      {/* Métricas Compactas */}
      <ModuleMetrics
        metrics={[
          {
            label: 'Indicadores Activos',
            value: stats.indicadores_activos,
            icon: <Target className="w-5 h-5 text-blue-600" />,
            color: '#003DA5'
          },
          {
            label: 'Avance Global',
            value: `${stats.avance_global}%`,
            icon: <TrendingUp className="w-5 h-5 text-green-600" />,
            color: '#10B981'
          },
          {
            label: 'Vencidos',
            value: stats.vencidos,
            icon: <AlertCircle className="w-5 h-5 text-red-600" />,
            color: '#DC2626'
          }
        ]}
      />

      {/* Filtros */}
      <ModuleFilters
        searchValue={busqueda}
        onSearchChange={(value) => setBusqueda(value)}
        filters={[
          {
            type: 'select',
            value: filtroEje,
            onChange: (val) => setFiltroEje(val),
            options: [
              { value: 'TODOS', label: 'Todos los ejes' },
              { value: 'GESTION', label: 'Gestión Institucional' },
              { value: 'TALENTO', label: 'Talento Humano' },
              { value: 'TRANSPARENCIA', label: 'Transparencia' },
              { value: 'TECNOLOGIA', label: 'Tecnología' }
            ],
            colSpan: 1
          },
          {
            type: 'custom',
            value: '',
            onChange: () => { },
            colSpan: 1,
            customContent: (
              <div className="flex items-center pt-2">
                <label className="inline-flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={ocultarCompletados}
                    onChange={(e) => setOcultarCompletados(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="
                    relative w-11 h-6 bg-gray-200 
                    peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 
                    rounded-full peer 
                    peer-checked:after:translate-x-full peer-checked:after:border-white 
                    after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                    after:bg-white after:border-gray-300 after:border after:rounded-full 
                    after:h-5 after:w-5 after:transition-all after:shadow-sm
                    peer-checked:bg-[#003DA5] transition-colors duration-300 ease-in-out
                  "></div>
                  <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                    Ocultar completados
                  </span>
                </label>
              </div>
            )
          }
        ]}
      />

      {loading ? (
        <div className="p-8 text-center text-gray-500">Cargando indicadores...</div>
      ) : (
        <>
          {/* Vista Timeline */}
          {tipoVista === 'timeline' && (
            <VistaTimeline
              indicadores={indicadoresFiltrados}
              onVerIndicador={handleVerIndicador}
              onActualizar={handleActualizar}
            />
          )}

          {/* Vista Lista */}
          {tipoVista === 'lista' && (
            <VistaLista
              indicadores={indicadoresFiltrados}
              onVerIndicador={handleVerIndicador}
              onActualizar={handleActualizar}
            />
          )}
        </>
      )}

      {/* Modals */}
      <ModalCrearIndicador
        open={showCrear}
        onClose={() => setShowCrear(false)}
        onSuccess={fetchData}
      />

      <ModalDetalleIndicador
        open={showDetalle}
        onClose={() => setShowDetalle(false)}
        indicador={selectedInd}
      />

      <ModalActualizarAvance
        open={showAvance}
        onClose={() => setShowAvance(false)}
        onSuccess={fetchData}
        indicador={selectedInd}
      />

    </div>
  );
}

// ==================== VISTA TIMELINE ====================
interface VistaTimelineProps {
  indicadores: any[];
  onVerIndicador: (ind: any) => void;
  onActualizar: (ind: any) => void;
}

function VistaTimeline({ indicadores, onVerIndicador, onActualizar }: VistaTimelineProps) {
  // Agrupar por eje estratégico usando los valores exactos del backend
  const indicadoresPorEje = {
    'GESTION': indicadores.filter(i => i.ejeEstrategico === 'GESTION'),
    'TALENTO': indicadores.filter(i => i.ejeEstrategico === 'TALENTO'),
    'TRANSPARENCIA': indicadores.filter(i => i.ejeEstrategico === 'TRANSPARENCIA'),
    'TECNOLOGIA': indicadores.filter(i => i.ejeEstrategico === 'TECNOLOGIA'),
  };

  const ejes = [
    { key: 'GESTION', nombre: 'Gestión Institucional', color: '#003DA5', icono: <Target className="w-4 h-4" /> },
    { key: 'TALENTO', nombre: 'Talento Humano', color: '#6B7280', icono: <User className="w-4 h-4" /> },
    { key: 'TRANSPARENCIA', nombre: 'Transparencia', color: '#6B7280', icono: <CheckCircle className="w-4 h-4" /> },
    { key: 'TECNOLOGIA', nombre: 'Tecnología', color: '#6B7280', icono: <Activity className="w-4 h-4" /> },
  ];

  return (
    <div className="relative">
      <div
        className="flex gap-4 overflow-x-auto pb-4 scroll-smooth"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#CBD5E0 #F7FAFC',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {ejes.map((eje) => {
          const items = indicadoresPorEje[eje.key as keyof typeof indicadoresPorEje];

          return (
            <ColumnaEje
              key={eje.key}
              eje={eje.nombre}
              items={items}
              color={eje.color}
              icono={eje.icono}
              onVerIndicador={onVerIndicador}
              onActualizar={onActualizar}
            />
          );
        })}
      </div>
    </div>
  );
}

// ==================== COLUMNA EJE ESTRATÉGICO ====================
interface ColumnaEjeProps {
  eje: string;
  items: any[];
  color: string;
  icono: React.ReactNode;
  onVerIndicador: (ind: any) => void;
  onActualizar: (ind: any) => void;
}

function ColumnaEje({ eje, items, color, icono, onVerIndicador, onActualizar }: ColumnaEjeProps) {
  return (
    <motion.div
      className="flex-shrink-0"
      initial={{ width: 320 }}
      animate={{ width: 320 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <Card className="h-full border border-gray-200">
        {/* Header de Columna - ESTILO EXACTO DEFENSA JUDICIAL */}
        <div className="p-4 border-b sticky top-0 z-10 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-1">
              <div className="p-2 rounded-lg bg-white border border-gray-200">
                {icono}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-sm text-gray-800">
                  {eje}
                </h3>
              </div>
            </div>
            <Badge className="font-semibold text-sm px-2 py-1 bg-white border border-gray-200 text-gray-700">
              {items.length}
            </Badge>
          </div>
        </div>

        {/* Lista de Items */}
        <div
          className="p-3 space-y-3 overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 280px)' }}
        >
          {items.map((indicador) => (
            <TarjetaIndicador
              key={indicador.id}
              indicador={indicador}
              onVerIndicador={onVerIndicador}
              onActualizar={onActualizar}
            />
          ))}

          {/* Empty State */}
          {items.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-xs font-semibold">
                Sin indicadores
              </p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ==================== TARJETA INDICADOR ====================
interface TarjetaIndicadorProps {
  indicador: any;
  onVerIndicador: (ind: any) => void;
  onActualizar: (ind: any) => void;
}

function TarjetaIndicador({ indicador, onVerIndicador, onActualizar }: TarjetaIndicadorProps) {
  // Determinar semáforo de cumplimiento
  const semaforoIndicator = {
    verde: { color: '#10B981', label: 'Cumplido' },
    amarillo: { color: '#F59E0B', label: 'En proceso' },
    rojo: { color: '#DC2626', label: 'Atrasado' }
  };

  const cumplimiento = indicador.avanceActual || 0; // Use avanceActual from API

  let semaforoKey: 'verde' | 'amarillo' | 'rojo' = 'verde';
  if (cumplimiento < 50) {
    semaforoKey = 'rojo';
  } else if (cumplimiento < 90) {
    semaforoKey = 'amarillo';
  }

  const semaforo = semaforoIndicator[semaforoKey];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="cursor-pointer w-full"
    >
      <Card
        className="bg-white border border-gray-200 hover:shadow-md transition-all flex flex-col w-full"
        style={{
          height: '560px',
          minHeight: '560px',
          maxHeight: '560px'
        }}
      >
        {/* Barra superior azul ESAP */}
        <div
          className="h-1 flex-shrink-0"
          style={{ background: '#003DA5' }}
        />

        <div className="p-2.5 flex-1 flex flex-col overflow-y-auto min-h-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-1.5">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className="p-1.5 rounded-lg flex-shrink-0"
                style={{ background: '#E0EDFF' }}
              >
                <Target className="w-4 h-4" style={{ color: '#003DA5' }} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm truncate" style={{ color: '#003DA5' }}>
                  {indicador.id}
                </h4>
                <p className="text-xs text-gray-600 truncate">
                  {indicador.tipoIndicador}
                </p>
              </div>
            </div>
          </div>

          {/* Nombre del indicador */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">📊 Indicador:</p>
            <p className="font-bold text-sm text-gray-900 line-clamp-2">
              {indicador.nombre}
            </p>
          </div>

          {/* Descripción */}
          {indicador.descripcion && (
            <div className="mb-1.5 pb-1.5 border-b border-gray-200">
              <p className="text-xs text-gray-500 mb-0.5">📝 Descripción:</p>
              <p className="text-xs text-gray-700 line-clamp-3">
                {indicador.descripcion}
              </p>
            </div>
          )}

          {/* Responsable con Avatar */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6 flex-shrink-0">
                <AvatarFallback
                  className="text-xs"
                  style={{ background: '#E0EDFF', color: '#003DA5' }}
                >
                  {(indicador.responsableNombre || 'NA').split(' ').map((n: any) => n[0]).join('').substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">👨‍💼 Responsable:</p>
                <p className="font-bold text-sm text-gray-900 line-clamp-1">
                  {indicador.responsableNombre || 'Sin Asignar'}
                </p>
              </div>
            </div>
          </div>

          {/* Meta y Resultado */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">🎯 Meta:</p>
                <p className="font-bold text-sm text-gray-900">
                  {indicador.metaObjetivo} {indicador.unidadMedida}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">📈 Avance:</p>
                <p className="font-bold text-sm text-green-700">
                  {indicador.avanceActual || 0}%
                </p>
              </div>
            </div>
          </div>

          {/* Semáforo de cumplimiento */}
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <Badge
              className="text-xs flex items-center gap-1 font-semibold bg-gray-50 border border-gray-200"
              style={{ color: semaforo.color }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: semaforo.color }}
              />
              {indicador.avanceActual || 0}%
            </Badge>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-3 gap-1.5 mb-1.5">
            <div className="text-center p-1.5 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs font-bold text-gray-700">
                {new Date(indicador.fechaInicio).toLocaleDateString('es-CO', { month: 'short' })}
              </p>
              <p className="text-xs text-gray-500">Inicio</p>
            </div>
            <div className="text-center p-1.5 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs font-bold text-gray-700">
                {new Date(indicador.fechaFin).toLocaleDateString('es-CO', { month: 'short' })}
              </p>
              <p className="text-xs text-gray-500">Fin</p>
            </div>
            <div className="text-center p-1.5 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs font-bold text-gray-700 uppercase">{indicador.estado}</p>
              <p className="text-xs text-gray-500">Estado</p>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="mb-1.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-500">Avance</span>
              <span className="text-[10px] font-bold text-gray-700">
                {indicador.avanceActual || 0}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(indicador.avanceActual || 0, 100)}%`,
                  background: semaforo.color
                }}
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="grid grid-cols-2 gap-1.5 mt-auto pt-2 border-t border-gray-200">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 justify-start gap-1.5 hover:bg-gray-50"
              onClick={() => onVerIndicador(indicador)}
            >
              <Eye className="w-3.5 h-3.5" />
              Ver Detalle
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 justify-start gap-1.5 hover:bg-gray-50"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onActualizar(indicador);
              }}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Actualizar
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ==================== VISTA LISTA ====================
interface VistaListaProps {
  indicadores: any[]; // Changed to any to match API response
  onVerIndicador: (ind: any) => void;
  onActualizar: (ind: any) => void;
}

function VistaLista({ indicadores, onVerIndicador, onActualizar }: VistaListaProps) {
  const getSemaforoColor = (cumplimiento: number) => {
    if (cumplimiento >= 90) return '#10B981';
    if (cumplimiento >= 50) return '#F59E0B';
    return '#DC2626';
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'NA';
  };

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">Indicador</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">Eje Estratégico</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">Cumplimiento</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">Responsable</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">Meta</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {indicadores.map((ind) => (
              <tr
                key={ind.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onVerIndicador(ind)}
              >
                <td className="px-4 py-3 text-sm font-bold" style={{ color: '#003DA5' }}>
                  {ind.id}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                  {ind.nombre}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-xs">
                    {ind.ejeEstrategico}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      className="text-xs flex items-center gap-1"
                      style={{ color: getSemaforoColor(ind.avanceActual || 0) }}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: getSemaforoColor(ind.avanceActual || 0) }}
                      />
                      {ind.avanceActual || 0}%
                    </Badge>
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(ind.avanceActual || 0, 100)}%`,
                          background: getSemaforoColor(ind.avanceActual || 0)
                        }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback
                        className="text-xs"
                        style={{ background: '#E0EDFF', color: '#003DA5' }}
                      >
                        {getInitials(ind.responsableNombre || 'NA')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate max-w-[150px]">{ind.responsableNombre || 'Sin Asignar'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {ind.metaObjetivo} {ind.unidadMedida}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onVerIndicador(ind);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onActualizar(ind);
                      }}
                    >
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
