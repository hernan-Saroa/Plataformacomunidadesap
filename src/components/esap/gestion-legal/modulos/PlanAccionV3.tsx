/**
 * ModuloPlanAccionV3 - MOD-09: Plan de Acción
 * DISEÑO 100% ESTANDARIZADO CON PATRÓN WORLD CLASS
 * Timeline/Gantt con estructura idéntica a Defensa Judicial
 */

import { useState, useMemo } from 'react';
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
import type { IndicadorPlanAccion } from '../core/types';
import { indicadoresPlanAccion } from '../data/datosPlanAccion';
import { toast } from 'sonner@2.0.3';

type VistaModulo = 'timeline' | 'lista';

// Helper para determinar eje estratégico basado en el nombre del indicador
const getEjeEstrategico = (indicador: IndicadorPlanAccion): string => {
  const nombre = indicador.nombre.toLowerCase();
  if (nombre.includes('jurídic') || nombre.includes('legal') || nombre.includes('término')) {
    return 'GESTION_INSTITUCIONAL';
  } else if (nombre.includes('talento') || nombre.includes('funcionario') || nombre.includes('capacitación')) {
    return 'TALENTO_HUMANO';
  } else if (nombre.includes('transparencia') || nombre.includes('información') || nombre.includes('datos')) {
    return 'TRANSPARENCIA';
  } else if (nombre.includes('tecnología') || nombre.includes('sistema') || nombre.includes('digital')) {
    return 'TECNOLOGIA';
  }
  return 'GESTION_INSTITUCIONAL'; // Por defecto
};

export function ModuloPlanAccionV3() {
  const [tipoVista, setTipoVista] = useState<VistaModulo>('timeline');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEje, setFiltroEje] = useState<string>('TODOS');

  const indicadoresFiltrados = useMemo(() => {
    let resultado = [...indicadoresPlanAccion].filter(i => i.estado === 'ACTIVO');

    if (busqueda) {
      resultado = resultado.filter(i =>
        i.id.toLowerCase().includes(busqueda.toLowerCase()) ||
        i.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        i.objetivoPEI?.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    if (filtroEje !== 'TODOS') {
      resultado = resultado.filter(i => getEjeEstrategico(i) === filtroEje);
    }

    return resultado;
  }, [busqueda, filtroEje]);

  const handleVerIndicador = (ind: IndicadorPlanAccion) => {
    console.log('Ver indicador:', ind.id);
    toast.success('Indicador', { description: `Abriendo ${ind.id}` });
  };

  // Calcular estadísticas (SOLO 3 MÉTRICAS)
  const totalIndicadores = indicadoresPlanAccion.filter(i => i.estado === 'ACTIVO').length;
  const cumplimientoPromedio = Math.round(
    indicadoresPlanAccion.reduce((sum, i) => sum + i.cumplimiento, 0) / indicadoresPlanAccion.length
  );
  const indicadoresVencidos = indicadoresPlanAccion.filter(i => {
    const fechaVencimiento = new Date(i.fechaFin);
    return fechaVencimiento < new Date() && i.cumplimiento < 100;
  }).length;

  return (
    <div className="space-y-4">
      {/* Header Responsive - IGUAL A DEFENSA JUDICIAL */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex-1">
          <h2 
            className="font-black leading-tight"
            style={{ 
              color: '#003DA5',
              fontSize: '1.5rem'
            }}
          >
            Plan de Acción Institucional
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Seguimiento de indicadores MIPG, FURAG y gestión estratégica
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle de Vista - ESTILO DEFENSA JUDICIAL */}
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: '#F3F4F6' }}>
            <button
              onClick={() => setTipoVista('timeline')}
              className={`px-3 py-2 rounded-md text-sm font-semibold flex items-center gap-1.5 transition-all ${
                tipoVista === 'timeline'
                  ? 'bg-white shadow-sm' 
                  : 'hover:bg-gray-200'
              }`}
              style={{ 
                color: tipoVista === 'timeline' ? '#003DA5' : '#6B7280'
              }}
            >
              <Calendar className="w-4 h-4" />
              Timeline
            </button>
            <button
              onClick={() => setTipoVista('lista')}
              className={`px-3 py-2 rounded-md text-sm font-semibold flex items-center gap-1.5 transition-all ${
                tipoVista === 'lista'
                  ? 'bg-white shadow-sm' 
                  : 'hover:bg-gray-200'
              }`}
              style={{ 
                color: tipoVista === 'lista' ? '#003DA5' : '#6B7280'
              }}
            >
              <List className="w-4 h-4" />
              Lista
            </button>
          </div>

          <button
            className="px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-400 transition-all"
            style={{ color: '#003DA5' }}
          >
            <Plus className="w-4 h-4" />
            Nuevo Indicador
          </button>
        </div>
      </div>

      {/* Métricas Compactas - ESTILO DEFENSA JUDICIAL (3 COLUMNAS EXACTAS) */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 p-3">
            <div className="p-2.5 rounded-lg bg-blue-50 flex-shrink-0">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="font-black text-gray-900 leading-none" style={{ fontSize: '1.75rem' }}>
                {totalIndicadores}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Indicadores Activos
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 p-3">
            <div className="p-2.5 rounded-lg bg-green-50 flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="font-black text-gray-900 leading-none" style={{ fontSize: '1.75rem' }}>
                {cumplimientoPromedio}%
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Avance Global
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 p-3">
            <div className="p-2.5 rounded-lg bg-red-50 flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="font-black text-gray-900 leading-none" style={{ fontSize: '1.75rem' }}>
                {indicadoresVencidos}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Vencidos
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por ID, nombre, descripción..."
            className="flex-1 bg-transparent border-none outline-none text-sm"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <select
          value={filtroEje}
          onChange={(e) => setFiltroEje(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-md text-sm"
        >
          <option value="TODOS">Todos los ejes</option>
          <option value="GESTION_INSTITUCIONAL">Gestión Institucional</option>
          <option value="TALENTO_HUMANO">Talento Humano</option>
          <option value="TRANSPARENCIA">Transparencia</option>
          <option value="TECNOLOGIA">Tecnología</option>
        </select>

        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar
        </Button>
      </div>

      {/* Vista Timeline */}
      {tipoVista === 'timeline' && (
        <VistaTimeline indicadores={indicadoresFiltrados} onVerIndicador={handleVerIndicador} />
      )}

      {/* Vista Lista */}
      {tipoVista === 'lista' && (
        <VistaLista indicadores={indicadoresFiltrados} onVerIndicador={handleVerIndicador} />
      )}
    </div>
  );
}

// ==================== VISTA TIMELINE ====================
interface VistaTimelineProps {
  indicadores: IndicadorPlanAccion[];
  onVerIndicador: (ind: IndicadorPlanAccion) => void;
}

function VistaTimeline({ indicadores, onVerIndicador }: VistaTimelineProps) {
  // Agrupar por eje estratégico
  const indicadoresPorEje = {
    'GESTION_INSTITUCIONAL': indicadores.filter(i => i.ejeEstrategico === 'GESTION_INSTITUCIONAL'),
    'TALENTO_HUMANO': indicadores.filter(i => i.ejeEstrategico === 'TALENTO_HUMANO'),
    'TRANSPARENCIA': indicadores.filter(i => i.ejeEstrategico === 'TRANSPARENCIA'),
    'TECNOLOGIA': indicadores.filter(i => i.ejeEstrategico === 'TECNOLOGIA'),
  };

  const ejes = [
    { key: 'GESTION_INSTITUCIONAL', nombre: 'Gestión Institucional', color: '#003DA5', icono: <Target className="w-4 h-4" /> },
    { key: 'TALENTO_HUMANO', nombre: 'Talento Humano', color: '#6B7280', icono: <User className="w-4 h-4" /> },
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
  items: IndicadorPlanAccion[];
  color: string;
  icono: React.ReactNode;
  onVerIndicador: (ind: IndicadorPlanAccion) => void;
}

function ColumnaEje({ eje, items, color, icono, onVerIndicador }: ColumnaEjeProps) {
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
  indicador: IndicadorPlanAccion;
  onVerIndicador: (ind: IndicadorPlanAccion) => void;
}

function TarjetaIndicador({ indicador, onVerIndicador }: TarjetaIndicadorProps) {
  // Determinar semáforo de cumplimiento
  const semaforoIndicator = {
    verde: { color: '#10B981', label: 'Cumplido' },
    amarillo: { color: '#F59E0B', label: 'En proceso' },
    rojo: { color: '#DC2626', label: 'Atrasado' }
  };

  let semaforoKey: 'verde' | 'amarillo' | 'rojo' = 'verde';
  if (indicador.cumplimiento < 50) {
    semaforoKey = 'rojo';
  } else if (indicador.cumplimiento < 90) {
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
                  {indicador.responsable.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">👨‍💼 Responsable:</p>
                <p className="font-bold text-sm text-gray-900 line-clamp-1">
                  {indicador.responsable}
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
                  {indicador.meta} {indicador.unidadMedida}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">📈 Resultado:</p>
                <p className="font-bold text-sm text-green-700">
                  {indicador.resultadoActual} {indicador.unidadMedida}
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
              {indicador.cumplimiento}%
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
              <p className="text-xs font-bold text-gray-700 uppercase">{indicador.etapa}</p>
              <p className="text-xs text-gray-500">Estado</p>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="mb-1.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-500">Avance</span>
              <span className="text-[10px] font-bold text-gray-700">{indicador.cumplimiento}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all"
                style={{ 
                  width: `${indicador.cumplimiento}%`,
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
  indicadores: IndicadorPlanAccion[];
  onVerIndicador: (ind: IndicadorPlanAccion) => void;
}

function VistaLista({ indicadores, onVerIndicador }: VistaListaProps) {
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
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
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
                      style={{ color: getSemaforoColor(ind.cumplimiento) }}
                    >
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ background: getSemaforoColor(ind.cumplimiento) }}
                      />
                      {ind.cumplimiento}%
                    </Badge>
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full"
                        style={{ 
                          width: `${ind.cumplimiento}%`,
                          background: getSemaforoColor(ind.cumplimiento)
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
                        {getInitials(ind.responsable)}
                      </AvatarFallback>
                    </Avatar>
                    {ind.responsable}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {ind.meta} {ind.unidadMedida}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => onVerIndicador(ind)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <CheckCircle className="w-4 h-4" />
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