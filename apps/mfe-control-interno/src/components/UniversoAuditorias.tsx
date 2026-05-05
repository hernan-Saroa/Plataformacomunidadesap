/**
 * ============================================
 * RF002: UNIVERSO DE AUDITORÍAS + MATRIZ DE RIESGO DAFP
 * ============================================
 * 
 * Sistema de Evaluación y Priorización de Áreas Auditables
 * Metodología: Departamento Administrativo de la Función Pública (DAFP)
 * 
 * INTEGRACIÓN CON ESTRUCTURA ORGANIZACIONAL:
 * - Conectado con módulo de Gestión Personas - Estructura Organizacional
 * - Áreas auditables basadas en unidades organizacionales reales
 * - Sincronización con territoriales y CETAP de ESAP
 * 
 * FUNCIONALIDADES:
 * - Catálogo completo de áreas auditables (9 Sede + 16 Territoriales)
 * - Matriz de Riesgo DAFP con cálculo automático
 * - Priorización basada en criticidad y exposición
 * - Filtros avanzados y búsqueda inteligente
 * - Edición inline de parámetros de riesgo
 * - Selección de áreas para programa anual
 * - Dashboard ejecutivo con KPIs
 * - Historial de auditorías por área
 * 
 * METODOLOGÍA DAFP:
 * Riesgo = (Criticidad × Factor_Exposición) / Factores_Mitigantes
 * 
 * Criticidad (Impacto potencial):
 *   - ALTA (5): Procesos críticos misionales o financieros
 *   - MEDIA (3): Procesos de apoyo importantes
 *   - BAJA (1): Procesos secundarios
 * 
 * Factor de Exposición (Alcance):
 *   - ALTA (5): >100 beneficiarios o stakeholders
 *   - MEDIA (3): 50-100 beneficiarios
 *   - BAJA (1): <50 beneficiarios
 * 
 * Factores Mitigantes (Controles existentes):
 *   - Valor numérico 1-10
 *   - Mayor valor = más controles = menor riesgo
 * 
 * Clasificación de Riesgo Resultante:
 *   - CRÍTICO: Score > 10 (Requiere auditoría inmediata)
 *   - ALTO: Score 5-10 (Auditoría prioritaria)
 *   - MEDIO: Score 3-5 (Auditoría programada)
 *   - BAJO: Score < 3 (Auditoría según capacidad)
 * 
 * ÚLTIMA ACTUALIZACIÓN: 21 Diciembre 2025
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers, Plus, Filter, Search, Grid, List, Edit2, Save, X,
  TrendingUp, AlertTriangle, CheckCircle, Clock, Building2,
  MapPin, Target, BarChart3, Eye, Settings, Link2, Info
} from 'lucide-react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { toast } from 'sonner';
import { TERRITORIALES_ESAP } from '../../../data/territoriales-cetap-completo';
import { ModalNuevaAreaWorldClass } from './ModalNuevaAreaWorldClass';
// ✅ INTEGRACIÓN BACKEND
import { useUniversoAuditableData, type ProcesoAuditableUI } from './hooks/useUniversoAuditableData';

// ============ TIPOS ============

type TipoArea = 'Sede' | 'Territorial';
type NivelRiesgo = 'Crítico' | 'Alto' | 'Medio' | 'Bajo';
type EstadoSeleccion = 'seleccionada' | 'pendiente' | 'no-aplica';
type CriticidadNivel = 5 | 3 | 1;
type ExposicionNivel = 5 | 3 | 1;

interface AreaAuditable {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoArea;
  descripcion: string;
  responsable: string;
  criticidad: CriticidadNivel;
  factorExposicion: ExposicionNivel;
  factoresMitigantes: number;
  nivelRiesgo: NivelRiesgo;
  scoreRiesgo: number;
  estado: EstadoSeleccion;
  ultimaAuditoria?: string;
  proximaAuditoria?: string;
  numeroAuditorias: number;
}

// ============ MAPPER: Backend ProcesoAuditable → AreaAuditable ============

function mapProcesoToAreaAuditable(proceso: ProcesoAuditableUI): AreaAuditable {
  // Mapear puntajeRiesgo (0-100) a criticidad DAFP (5|3|1)
  const criticidad: CriticidadNivel = proceso.puntajeRiesgo >= 70 ? 5 : proceso.puntajeRiesgo >= 40 ? 3 : 1;
  // Mapear nivel de riesgo a factor exposición
  const factorExposicion: ExposicionNivel = proceso.nivelRiesgo === 'Crítico' || proceso.nivelRiesgo === 'Alto' ? 5 : proceso.nivelRiesgo === 'Medio' ? 3 : 1;
  // Mapear calificación DAFP (1-5) a factores mitigantes (1-10)
  const factoresMitigantes = Math.max(1, Math.round(proceso.calificacionDafp * 2));
  
  const scoreCalc = calcularRiesgo(criticidad, factorExposicion, factoresMitigantes);

  return {
    id: proceso.id,
    codigo: proceso._codigo || `PROC-${proceso.id.substring(0, 6).toUpperCase()}`,
    nombre: proceso.nombre,
    tipo: proceso._territorial ? 'Territorial' : 'Sede',
    descripcion: proceso.descripcion,
    responsable: proceso.responsable,
    criticidad,
    factorExposicion,
    factoresMitigantes,
    nivelRiesgo: scoreCalc.nivel,
    scoreRiesgo: scoreCalc.score,
    estado: proceso.auditable ? 'seleccionada' : 'pendiente',
    ultimaAuditoria: proceso.ultimaAuditoria,
    numeroAuditorias: proceso.ultimaAuditoria ? 1 : 0,
  };
}
// ============ UTILIDADES ============

const calcularRiesgo = (criticidad: number, exposicion: number, mitigantes: number): { nivel: NivelRiesgo; score: number } => {
  const score = (criticidad * exposicion) / mitigantes;
  
  let nivel: NivelRiesgo;
  if (score > 10) nivel = 'Crítico';
  else if (score > 5) nivel = 'Alto';
  else if (score >= 3) nivel = 'Medio';
  else nivel = 'Bajo';
  
  return { nivel, score: Math.round(score * 10) / 10 };
};

const getRiesgoColor = (nivel: NivelRiesgo) => {
  const colores = {
    'Crítico': '#DC2626',
    'Alto': '#F59E0B',
    'Medio': '#3B82F6',
    'Bajo': '#10B981'
  };
  return colores[nivel];
};

const getEstadoInfo = (estado: EstadoSeleccion) => {
  const info = {
    'seleccionada': { label: 'Seleccionada', color: '#10B981', icono: <CheckCircle className="w-4 h-4" /> },
    'pendiente': { label: 'Pendiente', color: '#F59E0B', icono: <Clock className="w-4 h-4" /> },
    'no-aplica': { label: 'No Aplica', color: '#6B7280', icono: <X className="w-4 h-4" /> }
  };
  return info[estado];
};

// ============ COMPONENTE PRINCIPAL ============

export function UniversoAuditorias() {
  const { procesos: backendProcesos, loading, error, refetch } = useUniversoAuditableData({ showToasts: false });
  const [areas, setAreas] = useState<AreaAuditable[]>([]);
  const [vistaActiva, setVistaActiva] = useState<'dashboard' | 'lista' | 'crear'>('dashboard');
  const [modoVista, setModoVista] = useState<'grid' | 'tabla'>('grid');
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'Todos' | TipoArea>('Todos');
  const [filtroRiesgo, setFiltroRiesgo] = useState<'Todos' | NivelRiesgo>('Todos');
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | EstadoSeleccion>('Todos');
  const [areaEditando, setAreaEditando] = useState<string | null>(null);
  const [modalNuevaArea, setModalNuevaArea] = useState(false);

  // Sincronizar datos del backend con state local
  useEffect(() => {
    if (backendProcesos.length > 0) {
      setAreas(backendProcesos.map(mapProcesoToAreaAuditable));
    }
  }, [backendProcesos]);

  // Filtrado de áreas
  const areasFiltradas = useMemo(() => {
    return areas.filter(area => {
      const matchBusqueda = area.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          area.codigo.toLowerCase().includes(busqueda.toLowerCase());
      const matchTipo = filtroTipo === 'Todos' || area.tipo === filtroTipo;
      const matchRiesgo = filtroRiesgo === 'Todos' || area.nivelRiesgo === filtroRiesgo;
      const matchEstado = filtroEstado === 'Todos' || area.estado === filtroEstado;
      
      return matchBusqueda && matchTipo && matchRiesgo && matchEstado;
    });
  }, [areas, busqueda, filtroTipo, filtroRiesgo, filtroEstado]);

  // Métricas
  const metricas = useMemo(() => {
    const total = areas.length;
    const sede = areas.filter(a => a.tipo === 'Sede').length;
    const territorial = areas.filter(a => a.tipo === 'Territorial').length;
    const critico = areas.filter(a => a.nivelRiesgo === 'Crítico').length;
    const alto = areas.filter(a => a.nivelRiesgo === 'Alto').length;
    const medio = areas.filter(a => a.nivelRiesgo === 'Medio').length;
    const bajo = areas.filter(a => a.nivelRiesgo === 'Bajo').length;
    const seleccionadas = areas.filter(a => a.estado === 'seleccionada').length;
    
    return { total, sede, territorial, critico, alto, medio, bajo, seleccionadas };
  }, [areas]);

  const handleCambiarEstado = (areaId: string, nuevoEstado: EstadoSeleccion) => {
    setAreas(prev => prev.map(area => 
      area.id === areaId ? { ...area, estado: nuevoEstado } : area
    ));
    toast.success('Estado actualizado', {
      description: `Área ${areas.find(a => a.id === areaId)?.nombre} marcada como ${nuevoEstado}`
    });
  };

  const handleActualizarRiesgo = (
    areaId: string, 
    criticidad: CriticidadNivel, 
    exposicion: ExposicionNivel, 
    mitigantes: number
  ) => {
    const { nivel, score } = calcularRiesgo(criticidad, exposicion, mitigantes);
    
    setAreas(prev => prev.map(area => 
      area.id === areaId ? {
        ...area,
        criticidad,
        factorExposicion: exposicion,
        factoresMitigantes: mitigantes,
        nivelRiesgo: nivel,
        scoreRiesgo: score
      } : area
    ));
    
    setAreaEditando(null);
    toast.success('Riesgo actualizado', {
      description: `Nuevo nivel de riesgo: ${nivel} (${score})`
    });
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* HEADER CON TABS Y ACCIÓN PRINCIPAL */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          {/* Tabs de vista */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant={vistaActiva === 'dashboard' ? 'default' : 'ghost'}
              onClick={() => setVistaActiva('dashboard')}
              size="sm"
              className="gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden md:inline">Dashboard</span>
            </Button>
            <Button
              variant={vistaActiva === 'lista' ? 'default' : 'ghost'}
              onClick={() => setVistaActiva('lista')}
              size="sm"
              className="gap-2"
            >
              <Layers className="w-4 h-4" />
              <span className="hidden md:inline">Lista de Áreas</span>
              <span className="md:hidden">({areasFiltradas.length})</span>
            </Button>
          </div>

          {/* Stats rápidas */}
          <div className="hidden lg:flex items-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: '#003DA5' }} />
              <strong>{metricas.total}</strong> áreas
            </span>
            <span className="w-px h-4 bg-gray-300" />
            <span><strong>{metricas.seleccionadas}</strong> seleccionadas</span>
            <span className="w-px h-4 bg-gray-300" />
            <span className="text-red-600"><strong>{metricas.critico}</strong> críticas</span>
          </div>

          {/* Acción principal */}
          <Button 
            style={{ background: '#003DA5' }}
            className="gap-2"
            size="sm"
            onClick={() => setModalNuevaArea(true)}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva Área</span>
          </Button>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="flex-1 overflow-auto p-6">
        {/* INFO CÁLCULO DEL SCORE */}
        <div className="mb-4 bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-gray-900 mb-1">¿Cómo se calcula el Score?</p>
            <p className="text-gray-800 mb-2">
              Puntaje de prioridad (0-100) que ordena los procesos de mayor a menor urgencia.
              <strong> Fórmula:</strong> riesgoResidual = (Probabilidad × Impacto) ÷ Nivel de Control → score = (riesgoResidual ÷ 9) × 100
            </p>
            <p className="text-xs text-gray-700">
              <span className="inline-block mr-4">🔴 90-100: Prioridad alta (auditoría urgente)</span>
              <span className="inline-block mr-4">🟡 50-89: Prioridad media</span>
              <span className="inline-block">🟢 0-49: Prioridad baja (postergable)</span>
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {vistaActiva === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <DashboardUniverso metricas={metricas} areas={areas} />
            </motion.div>
          )}

          {vistaActiva === 'lista' && (
            <motion.div
              key="lista"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
            {/* FILTROS Y BÚSQUEDA */}
            <Card className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Búsqueda */}
                <div className="lg:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por nombre o código..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Filtro Tipo */}
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="Todos">Todos los tipos</option>
                  <option value="Sede">Sede</option>
                  <option value="Territorial">Territorial</option>
                </select>

                {/* Filtro Riesgo */}
                <select
                  value={filtroRiesgo}
                  onChange={(e) => setFiltroRiesgo(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="Todos">Todos los riesgos</option>
                  <option value="Crítico">Crítico</option>
                  <option value="Alto">Alto</option>
                  <option value="Medio">Medio</option>
                  <option value="Bajo">Bajo</option>
                </select>

                {/* Filtro Estado */}
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="Todos">Todos los estados</option>
                  <option value="seleccionada">Seleccionada</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="no-aplica">No Aplica</option>
                </select>
              </div>

              {/* Modo de Vista */}
              <div className="flex justify-between items-center mt-3 pt-3 border-t">
                <p className="text-sm text-gray-600">
                  Mostrando <strong>{areasFiltradas.length}</strong> de <strong>{areas.length}</strong> áreas
                </p>
                <div className="flex gap-2">
                  <Button
                    variant={modoVista === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setModoVista('grid')}
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={modoVista === 'tabla' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setModoVista('tabla')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* LISTA DE ÁREAS */}
            {modoVista === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {areasFiltradas.map(area => (
                  <CardAreaAuditable
                    key={area.id}
                    area={area}
                    onCambiarEstado={handleCambiarEstado}
                    onEditarRiesgo={() => setAreaEditando(area.id)}
                    editando={areaEditando === area.id}
                    onGuardarRiesgo={handleActualizarRiesgo}
                    onCancelarEdicion={() => setAreaEditando(null)}
                  />
                ))}
              </div>
            ) : (
              <TablaAreasAuditables
                areas={areasFiltradas}
                onCambiarEstado={handleCambiarEstado}
              />
            )}

            {areasFiltradas.length === 0 && (
              <Card className="p-12">
                <div className="text-center">
                  <Layers className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="font-bold text-gray-900 mb-2">
                    No se encontraron áreas
                  </h3>
                  <p className="text-sm text-gray-600">
                    Intenta ajustar los filtros de búsqueda
                  </p>
                </div>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* MODAL NUEVA ÁREA */}
      {modalNuevaArea && (
        <ModalNuevaAreaWorldClass
          open={modalNuevaArea}
          onClose={() => setModalNuevaArea(false)}
          onGuardar={(nuevaArea) => {
            setAreas(prev => [...prev, nuevaArea]);
            setModalNuevaArea(false);
            toast.success('¡Área creada exitosamente!', {
              description: `${nuevaArea.nombre} agregada al universo de auditorías`
            });
          }}
          ultimoCodigo={areas.length > 0 ? Math.max(...areas.map(a => {
            const num = parseInt(a.codigo.split('-')[1]);
            return isNaN(num) ? 0 : num;
          })) : 0}
          unidadesOrganizacionales={TERRITORIALES_ESAP}
        />
      )}
    </div>
  );
}

// ============ DASHBOARD ============

interface DashboardUniversoProps {
  metricas: {
    total: number;
    sede: number;
    territorial: number;
    critico: number;
    alto: number;
    medio: number;
    bajo: number;
    seleccionadas: number;
  };
  areas: AreaAuditable[];
}

function DashboardUniverso({ metricas, areas }: DashboardUniversoProps) {
  return (
    <div className="space-y-6">
      {/* DISTRIBUCIÓN DE RIESGO DAFP */}
      <Card className="p-6">
        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-orange-600" />
          Matriz de Riesgo DAFP - Distribución por Nivel
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Clasificación según metodología del Departamento Administrativo de la Función Pública
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-red-50 rounded-lg border-2 border-red-200">
            <div className="text-3xl font-black text-red-600 mb-1">{metricas.critico}</div>
            <Badge className="bg-red-100 text-red-800 text-xs">Crítico (&gt;10)</Badge>
            <p className="text-xs text-gray-600 mt-2">Requiere auditoría inmediata</p>
          </div>

          <div className="text-center p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
            <div className="text-3xl font-black text-orange-600 mb-1">{metricas.alto}</div>
            <Badge className="bg-orange-100 text-orange-800 text-xs">Alto (5-10)</Badge>
            <p className="text-xs text-gray-600 mt-2">Auditoría prioritaria</p>
          </div>

          <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <div className="text-3xl font-black text-blue-600 mb-1">{metricas.medio}</div>
            <Badge className="bg-blue-100 text-blue-800 text-xs">Medio (3-5)</Badge>
            <p className="text-xs text-gray-600 mt-2">Auditoría programada</p>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
            <div className="text-3xl font-black text-green-600 mb-1">{metricas.bajo}</div>
            <Badge className="bg-green-100 text-green-800 text-xs">Bajo (&lt;3)</Badge>
            <p className="text-xs text-gray-600 mt-2">Según capacidad</p>
          </div>
        </div>
      </Card>

      {/* TOP ÁREAS DE RIESGO */}
      <Card className="p-6">
        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          Top 5 Áreas de Mayor Riesgo (Score DAFP)
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Áreas con mayor puntuación de riesgo según cálculo DAFP
        </p>

        <div className="space-y-3">
          {areas
            .filter(a => a.nivelRiesgo === 'Crítico' || a.nivelRiesgo === 'Alto')
            .sort((a, b) => b.scoreRiesgo - a.scoreRiesgo)
            .slice(0, 5)
            .map((area, idx) => (
              <div key={area.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white" 
                     style={{ background: getRiesgoColor(area.nivelRiesgo) }}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900">{area.nombre}</p>
                  <p className="text-xs text-gray-600">{area.codigo} - {area.tipo}</p>
                </div>
                <div className="text-right">
                  <Badge style={{ background: getRiesgoColor(area.nivelRiesgo), color: 'white' }}>
                    {area.nivelRiesgo}
                  </Badge>
                  <p className="text-xs text-gray-600 mt-1">Score DAFP: {area.scoreRiesgo}</p>
                </div>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}

// ============ CARD ÁREA AUDITABLE ============

interface CardAreaAuditableProps {
  area: AreaAuditable;
  onCambiarEstado: (areaId: string, estado: EstadoSeleccion) => void;
  onEditarRiesgo: () => void;
  editando: boolean;
  onGuardarRiesgo: (areaId: string, criticidad: CriticidadNivel, exposicion: ExposicionNivel, mitigantes: number) => void;
  onCancelarEdicion: () => void;
}

function CardAreaAuditable({ 
  area, 
  onCambiarEstado, 
  onEditarRiesgo, 
  editando, 
  onGuardarRiesgo,
  onCancelarEdicion 
}: CardAreaAuditableProps) {
  const [criticidad, setCriticidad] = useState<CriticidadNivel>(area.criticidad);
  const [exposicion, setExposicion] = useState<ExposicionNivel>(area.factorExposicion);
  const [mitigantes, setMitigantes] = useState(area.factoresMitigantes);

  const estadoInfo = getEstadoInfo(area.estado);

  return (
    <Card className="p-4 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {area.tipo === 'Sede' ? (
            <Building2 className="w-5 h-5 text-purple-600" />
          ) : (
            <MapPin className="w-5 h-5 text-green-600" />
          )}
          <Badge variant="outline" className="text-xs">
            {area.codigo}
          </Badge>
        </div>
        <Badge style={{ background: getRiesgoColor(area.nivelRiesgo), color: 'white' }}>
          {area.nivelRiesgo}
        </Badge>
      </div>

      <h4 className="font-bold text-sm text-gray-900 mb-1">{area.nombre}</h4>
      <p className="text-xs text-gray-600 mb-3 line-clamp-2">{area.descripcion}</p>

      {editando ? (
        <div className="space-y-2 mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs font-bold text-gray-700 mb-2 text-center">📊 Editar Parámetros DAFP</p>
          
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Criticidad (Impacto)</label>
            <select
              value={criticidad}
              onChange={(e) => setCriticidad(Number(e.target.value) as CriticidadNivel)}
              className="w-full px-2 py-1 text-xs border rounded"
            >
              <option value={5}>Alta (5) - Crítico/Financiero</option>
              <option value={3}>Media (3) - Apoyo importante</option>
              <option value={1}>Baja (1) - Secundario</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Factor Exposición (Alcance)</label>
            <select
              value={exposicion}
              onChange={(e) => setExposicion(Number(e.target.value) as ExposicionNivel)}
              className="w-full px-2 py-1 text-xs border rounded"
            >
              <option value={5}>Alta (5) - &gt;100 personas</option>
              <option value={3}>Media (3) - 50-100 personas</option>
              <option value={1}>Baja (1) - &lt;50 personas</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Factores Mitigantes (1-10)</label>
            <Input
              type="number"
              value={mitigantes}
              onChange={(e) => setMitigantes(Number(e.target.value))}
              min={1}
              max={10}
              className="text-xs"
              placeholder="Controles existentes"
            />
            <p className="text-xs text-gray-500 mt-1">Mayor valor = más controles = menor riesgo</p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => onGuardarRiesgo(area.id, criticidad, exposicion, mitigantes)}
              className="flex-1 gap-1"
              style={{ background: '#003DA5' }}
            >
              <Save className="w-3 h-3" />
              Guardar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onCancelarEdicion}
              className="flex-1 gap-1"
            >
              <X className="w-3 h-3" />
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Score DAFP:</span>
            <span className="font-bold" style={{ color: getRiesgoColor(area.nivelRiesgo) }}>
              {area.scoreRiesgo}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Auditorías:</span>
            <span className="font-bold text-gray-900">{area.numeroAuditorias}</span>
          </div>
          {area.ultimaAuditoria && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Última:</span>
              <span className="text-gray-900">{area.ultimaAuditoria}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <select
          value={area.estado}
          onChange={(e) => onCambiarEstado(area.id, e.target.value as EstadoSeleccion)}
          className="flex-1 px-2 py-1.5 text-xs border rounded-lg"
          style={{ 
            borderColor: estadoInfo.color,
            backgroundColor: `${estadoInfo.color}10`
          }}
        >
          <option value="seleccionada">✅ Seleccionada</option>
          <option value="pendiente">⏳ Pendiente</option>
          <option value="no-aplica">❌ No Aplica</option>
        </select>

        {!editando && (
          <Button
            size="sm"
            variant="outline"
            onClick={onEditarRiesgo}
          >
            <Edit2 className="w-3 h-3" />
          </Button>
        )}
      </div>
    </Card>
  );
}

// ============ TABLA ÁREAS AUDITABLES ============

interface TablaAreasAuditablesProps {
  areas: AreaAuditable[];
  onCambiarEstado: (areaId: string, estado: EstadoSeleccion) => void;
}

function TablaAreasAuditables({ areas, onCambiarEstado }: TablaAreasAuditablesProps) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-bold text-gray-700">Código</th>
              <th className="px-4 py-3 text-left font-bold text-gray-700">Nombre</th>
              <th className="px-4 py-3 text-left font-bold text-gray-700">Tipo</th>
              <th className="px-4 py-3 text-left font-bold text-gray-700">Riesgo DAFP</th>
              <th className="px-4 py-3 text-center font-bold text-gray-700">Score</th>
              <th className="px-4 py-3 text-center font-bold text-gray-700">Auditorías</th>
              <th className="px-4 py-3 text-left font-bold text-gray-700">Estado</th>
              <th className="px-4 py-3 text-center font-bold text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {areas.map(area => {
              const estadoInfo = getEstadoInfo(area.estado);
              return (
                <tr key={area.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Badge variant="outline">{area.codigo}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-gray-900">{area.nombre}</p>
                    <p className="text-xs text-gray-600">{area.responsable}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {area.tipo === 'Sede' ? (
                        <Building2 className="w-4 h-4 text-purple-600" />
                      ) : (
                        <MapPin className="w-4 h-4 text-green-600" />
                      )}
                      <span className="text-xs">{area.tipo}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge style={{ background: getRiesgoColor(area.nivelRiesgo), color: 'white' }}>
                      {area.nivelRiesgo}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center font-bold" style={{ color: getRiesgoColor(area.nivelRiesgo) }}>
                    {area.scoreRiesgo}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-gray-900">
                    {area.numeroAuditorias}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={area.estado}
                      onChange={(e) => onCambiarEstado(area.id, e.target.value as EstadoSeleccion)}
                      className="px-2 py-1 text-xs border rounded"
                      style={{ 
                        borderColor: estadoInfo.color,
                        backgroundColor: `${estadoInfo.color}10`
                      }}
                    >
                      <option value="seleccionada">Seleccionada</option>
                      <option value="pendiente">Pendiente</option>
                      <option value="no-aplica">No Aplica</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button size="sm" variant="outline">
                      <Eye className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}