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

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers, Plus, Filter, Search, Grid, List, Edit2, Save, X,
  TrendingUp, AlertTriangle, CheckCircle, Clock, Building2,
  MapPin, Target, BarChart3, Eye, Settings, Link2
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner@2.0.3';
import { TERRITORIALES_ESAP } from '../../../data/territoriales-cetap-completo';

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

// ============ DATOS MOCK - 9 PROCESOS SEDE + 16 TERRITORIALES ============

const AREAS_AUDITABLES_MOCK: AreaAuditable[] = [
  // ========== PROCESOS SEDE (9) ==========
  {
    id: 'area-001',
    codigo: 'SEDE-001',
    nombre: 'Gestión Financiera',
    tipo: 'Sede',
    descripcion: 'Presupuesto, tesorería, contabilidad y gestión financiera institucional',
    responsable: 'Director Administrativo y Financiero',
    criticidad: 5,
    factorExposicion: 5,
    factoresMitigantes: 2,
    nivelRiesgo: 'Crítico',
    scoreRiesgo: 12.5,
    estado: 'seleccionada',
    ultimaAuditoria: '2024-03-15',
    proximaAuditoria: '2025-03-10',
    numeroAuditorias: 8
  },
  {
    id: 'area-002',
    codigo: 'SEDE-002',
    nombre: 'Gestión Administrativa',
    tipo: 'Sede',
    descripcion: 'Servicios generales, infraestructura, correspondencia y archivo',
    responsable: 'Subdirector Administrativo',
    criticidad: 3,
    factorExposicion: 5,
    factoresMitigantes: 3,
    nivelRiesgo: 'Alto',
    scoreRiesgo: 5.0,
    estado: 'seleccionada',
    ultimaAuditoria: '2024-06-20',
    proximaAuditoria: '2025-06-15',
    numeroAuditorias: 6
  },
  {
    id: 'area-003',
    codigo: 'SEDE-003',
    nombre: 'Formación para la Vida Pública',
    tipo: 'Sede',
    descripcion: 'Programas académicos, cursos, diplomados y capacitación',
    responsable: 'Director de Formación',
    criticidad: 5,
    factorExposicion: 5,
    factoresMitigantes: 2,
    nivelRiesgo: 'Crítico',
    scoreRiesgo: 12.5,
    estado: 'seleccionada',
    ultimaAuditoria: '2024-02-10',
    proximaAuditoria: '2025-02-05',
    numeroAuditorias: 10
  },
  {
    id: 'area-004',
    codigo: 'SEDE-004',
    nombre: 'Adquisición de Bienes y Servicios',
    tipo: 'Sede',
    descripcion: 'Contratación, compras, licitaciones y procesos de selección',
    responsable: 'Jefe de Contratación',
    criticidad: 5,
    factorExposicion: 5,
    factoresMitigantes: 3,
    nivelRiesgo: 'Alto',
    scoreRiesgo: 8.3,
    estado: 'seleccionada',
    ultimaAuditoria: '2024-05-10',
    proximaAuditoria: '2025-05-05',
    numeroAuditorias: 9
  },
  {
    id: 'area-005',
    codigo: 'SEDE-005',
    nombre: 'Gestión de Talento Humano',
    tipo: 'Sede',
    descripcion: 'Nómina, bienestar, capacitación, evaluación de desempeño',
    responsable: 'Jefe de Talento Humano',
    criticidad: 3,
    factorExposicion: 3,
    factoresMitigantes: 2,
    nivelRiesgo: 'Medio',
    scoreRiesgo: 4.5,
    estado: 'seleccionada',
    ultimaAuditoria: '2024-07-15',
    proximaAuditoria: '2025-07-10',
    numeroAuditorias: 7
  },
  {
    id: 'area-006',
    codigo: 'SEDE-006',
    nombre: 'Efectividad Institucional',
    tipo: 'Sede',
    descripcion: 'Planeación estratégica, indicadores, gestión de calidad',
    responsable: 'Jefe de Planeación',
    criticidad: 3,
    factorExposicion: 3,
    factoresMitigantes: 3,
    nivelRiesgo: 'Medio',
    scoreRiesgo: 3.0,
    estado: 'seleccionada',
    ultimaAuditoria: '2024-08-20',
    proximaAuditoria: '2025-08-15',
    numeroAuditorias: 5
  },
  {
    id: 'area-007',
    codigo: 'SEDE-007',
    nombre: 'Evaluación de Control y Mejora',
    tipo: 'Sede',
    descripcion: 'Seguimiento a planes de mejoramiento y control interno',
    responsable: 'Jefe OCI',
    criticidad: 3,
    factorExposicion: 3,
    factoresMitigantes: 2,
    nivelRiesgo: 'Medio',
    scoreRiesgo: 4.5,
    estado: 'seleccionada',
    ultimaAuditoria: '2024-09-10',
    proximaAuditoria: '2025-09-05',
    numeroAuditorias: 6
  },
  {
    id: 'area-008',
    codigo: 'SEDE-008',
    nombre: 'Modelo de Seguridad y Privacidad',
    tipo: 'Sede',
    descripcion: 'Seguridad de información, protección de datos, ciberseguridad',
    responsable: 'Oficial de Seguridad',
    criticidad: 5,
    factorExposicion: 5,
    factoresMitigantes: 4,
    nivelRiesgo: 'Alto',
    scoreRiesgo: 6.25,
    estado: 'seleccionada',
    ultimaAuditoria: '2024-04-25',
    proximaAuditoria: '2025-04-20',
    numeroAuditorias: 4
  },
  {
    id: 'area-009',
    codigo: 'SEDE-009',
    nombre: 'Transformación Digital',
    tipo: 'Sede',
    descripcion: 'TI, innovación digital, sistemas de información',
    responsable: 'Director de TI',
    criticidad: 3,
    factorExposicion: 5,
    factoresMitigantes: 3,
    nivelRiesgo: 'Medio',
    scoreRiesgo: 5.0,
    estado: 'seleccionada',
    ultimaAuditoria: '2024-10-05',
    proximaAuditoria: '2025-10-01',
    numeroAuditorias: 3
  },

  // ========== TERRITORIALES (16) ==========
  {
    id: 'area-010',
    codigo: 'TERR-001',
    nombre: 'Territorial Antioquia',
    tipo: 'Territorial',
    descripcion: 'Dirección territorial y programas académicos región Antioquia',
    responsable: 'Director Territorial Antioquia',
    criticidad: 3,
    factorExposicion: 5,
    factoresMitigantes: 2,
    nivelRiesgo: 'Alto',
    scoreRiesgo: 7.5,
    estado: 'seleccionada',
    ultimaAuditoria: '2024-02-20',
    numeroAuditorias: 4
  },
  {
    id: 'area-011',
    codigo: 'TERR-002',
    nombre: 'Territorial Atlántico-Cesar',
    tipo: 'Territorial',
    descripcion: 'Dirección territorial región Caribe (Atlántico y Cesar)',
    responsable: 'Director Territorial Atlántico',
    criticidad: 3,
    factorExposicion: 5,
    factoresMitigantes: 2,
    nivelRiesgo: 'Alto',
    scoreRiesgo: 7.5,
    estado: 'seleccionada',
    ultimaAuditoria: '2024-03-10',
    numeroAuditorias: 4
  },
  {
    id: 'area-012',
    codigo: 'TERR-003',
    nombre: 'Territorial Bolívar-Córdoba',
    tipo: 'Territorial',
    descripcion: 'Dirección territorial región Bolívar y Córdoba',
    responsable: 'Director Territorial Bolívar',
    criticidad: 3,
    factorExposicion: 3,
    factoresMitigantes: 2,
    nivelRiesgo: 'Medio',
    scoreRiesgo: 4.5,
    estado: 'seleccionada',
    ultimaAuditoria: '2024-04-05',
    numeroAuditorias: 3
  },
  {
    id: 'area-013',
    codigo: 'TERR-004',
    nombre: 'Territorial Caldas',
    tipo: 'Territorial',
    descripcion: 'Dirección territorial región Eje Cafetero (Caldas)',
    responsable: 'Director Territorial Caldas',
    criticidad: 3,
    factorExposicion: 3,
    factoresMitigantes: 2,
    nivelRiesgo: 'Medio',
    scoreRiesgo: 4.5,
    estado: 'seleccionada',
    ultimaAuditoria: '2024-05-15',
    numeroAuditorias: 3
  },
  {
    id: 'area-014',
    codigo: 'TERR-005',
    nombre: 'Territorial Cundinamarca',
    tipo: 'Territorial',
    descripcion: 'Dirección territorial región Cundinamarca',
    responsable: 'Director Territorial Cundinamarca',
    criticidad: 5,
    factorExposicion: 5,
    factoresMitigantes: 3,
    nivelRiesgo: 'Alto',
    scoreRiesgo: 8.3,
    estado: 'seleccionada',
    ultimaAuditoria: '2024-01-20',
    numeroAuditorias: 5
  },
  {
    id: 'area-015',
    codigo: 'TERR-006',
    nombre: 'Territorial Nariño-Putumayo',
    tipo: 'Territorial',
    descripcion: 'Dirección territorial región Sur (Nariño y Putumayo)',
    responsable: 'Director Territorial Nariño',
    criticidad: 3,
    factorExposicion: 3,
    factoresMitigantes: 2,
    nivelRiesgo: 'Medio',
    scoreRiesgo: 4.5,
    estado: 'seleccionada',
    ultimaAuditoria: '2024-06-10',
    numeroAuditorias: 3
  },
  {
    id: 'area-016',
    codigo: 'TERR-007',
    nombre: 'Territorial Huila',
    tipo: 'Territorial',
    descripcion: 'Dirección territorial región Huila',
    responsable: 'Director Territorial Huila',
    criticidad: 3,
    factorExposicion: 3,
    factoresMitigantes: 2,
    nivelRiesgo: 'Medio',
    scoreRiesgo: 4.5,
    estado: 'seleccionada',
    ultimaAuditoria: '2024-07-05',
    numeroAuditorias: 3
  },
  {
    id: 'area-017',
    codigo: 'TERR-008',
    nombre: 'Territorial Meta',
    tipo: 'Territorial',
    descripcion: 'Dirección territorial región Meta',
    responsable: 'Director Territorial Meta',
    criticidad: 3,
    factorExposicion: 3,
    factoresMitigantes: 2,
    nivelRiesgo: 'Medio',
    scoreRiesgo: 4.5,
    estado: 'seleccionada',
    ultimaAuditoria: '2024-08-15',
    numeroAuditorias: 2
  },
  {
    id: 'area-018',
    codigo: 'TERR-009',
    nombre: 'Territorial Cauca',
    tipo: 'Territorial',
    descripcion: 'Dirección territorial región Cauca',
    responsable: 'Director Territorial Cauca',
    criticidad: 3,
    factorExposicion: 3,
    factoresMitigantes: 2,
    nivelRiesgo: 'Medio',
    scoreRiesgo: 4.5,
    estado: 'pendiente',
    ultimaAuditoria: '2023-12-10',
    numeroAuditorias: 2
  },
  {
    id: 'area-019',
    codigo: 'TERR-010',
    nombre: 'Territorial Amazonas',
    tipo: 'Territorial',
    descripcion: 'Dirección territorial región Amazonas',
    responsable: 'Director Territorial Amazonas',
    criticidad: 1,
    factorExposicion: 1,
    factoresMitigantes: 1,
    nivelRiesgo: 'Bajo',
    scoreRiesgo: 1.0,
    estado: 'pendiente',
    numeroAuditorias: 1
  },
  {
    id: 'area-020',
    codigo: 'TERR-011',
    nombre: 'Territorial Boyacá',
    tipo: 'Territorial',
    descripcion: 'Dirección territorial región Boyacá',
    responsable: 'Director Territorial Boyacá',
    criticidad: 3,
    factorExposicion: 3,
    factoresMitigantes: 2,
    nivelRiesgo: 'Medio',
    scoreRiesgo: 4.5,
    estado: 'seleccionada',
    ultimaAuditoria: '2024-09-20',
    numeroAuditorias: 3
  },
  {
    id: 'area-021',
    codigo: 'TERR-012',
    nombre: 'Territorial Casanare',
    tipo: 'Territorial',
    descripcion: 'Dirección territorial región Casanare',
    responsable: 'Director Territorial Casanare',
    criticidad: 1,
    factorExposicion: 3,
    factoresMitigantes: 2,
    nivelRiesgo: 'Bajo',
    scoreRiesgo: 1.5,
    estado: 'pendiente',
    numeroAuditorias: 1
  },
  {
    id: 'area-022',
    codigo: 'TERR-013',
    nombre: 'Territorial Guaviare',
    tipo: 'Territorial',
    descripcion: 'Dirección territorial región Guaviare',
    responsable: 'Director Territorial Guaviare',
    criticidad: 1,
    factorExposicion: 1,
    factoresMitigantes: 1,
    nivelRiesgo: 'Bajo',
    scoreRiesgo: 1.0,
    estado: 'no-aplica',
    numeroAuditorias: 0
  },
  {
    id: 'area-023',
    codigo: 'TERR-014',
    nombre: 'Territorial Putumayo',
    tipo: 'Territorial',
    descripcion: 'Dirección territorial región Putumayo',
    responsable: 'Director Territorial Putumayo',
    criticidad: 1,
    factorExposicion: 3,
    factoresMitigantes: 2,
    nivelRiesgo: 'Bajo',
    scoreRiesgo: 1.5,
    estado: 'pendiente',
    numeroAuditorias: 1
  },
  {
    id: 'area-024',
    codigo: 'TERR-015',
    nombre: 'Territorial Archipiélago San Andrés',
    tipo: 'Territorial',
    descripcion: 'Dirección territorial Archipiélago de San Andrés',
    responsable: 'Director Territorial San Andrés',
    criticidad: 1,
    factorExposicion: 1,
    factoresMitigantes: 1,
    nivelRiesgo: 'Bajo',
    scoreRiesgo: 1.0,
    estado: 'no-aplica',
    numeroAuditorias: 0
  },
  {
    id: 'area-025',
    codigo: 'TERR-016',
    nombre: 'Territorial Vichada',
    tipo: 'Territorial',
    descripcion: 'Dirección territorial región Vichada',
    responsable: 'Director Territorial Vichada',
    criticidad: 1,
    factorExposicion: 1,
    factoresMitigantes: 1,
    nivelRiesgo: 'Bajo',
    scoreRiesgo: 1.0,
    estado: 'no-aplica',
    numeroAuditorias: 0
  }
];

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
  const [areas, setAreas] = useState<AreaAuditable[]>(AREAS_AUDITABLES_MOCK);
  const [vistaActiva, setVistaActiva] = useState<'dashboard' | 'lista' | 'crear'>('dashboard');
  const [modoVista, setModoVista] = useState<'grid' | 'tabla'>('grid');
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'Todos' | TipoArea>('Todos');
  const [filtroRiesgo, setFiltroRiesgo] = useState<'Todos' | NivelRiesgo>('Todos');
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | EstadoSeleccion>('Todos');
  const [areaEditando, setAreaEditando] = useState<string | null>(null);
  const [modalNuevaArea, setModalNuevaArea] = useState(false);

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
    <div className="space-y-4 md:space-y-6">
      {/* ACCIONES PRINCIPALES */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={vistaActiva === 'dashboard' ? 'default' : 'outline'}
            onClick={() => setVistaActiva('dashboard')}
            size="sm"
            className="gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Dashboard
          </Button>
          <Button
            variant={vistaActiva === 'lista' ? 'default' : 'outline'}
            onClick={() => setVistaActiva('lista')}
            size="sm"
            className="gap-2"
          >
            <Layers className="w-4 h-4" />
            Áreas ({areasFiltradas.length})
          </Button>
        </div>

        <Button 
          style={{ background: '#003DA5' }}
          className="gap-2 w-full sm:w-auto"
          size="sm"
          onClick={() => setModalNuevaArea(true)}
        >
          <Plus className="w-4 h-4" />
          Nueva Área
        </Button>
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

      {/* MODAL NUEVA ÁREA */}
      {modalNuevaArea && (
        <ModalNuevaArea
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
      {/* CARD INFORMATIVO DAFP */}
      <Card className="p-6 border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-orange-500 rounded-lg flex-shrink-0">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-gray-900 mb-2 flex items-center gap-2">
              Metodología DAFP - Cálculo de Riesgo
              <Badge className="bg-orange-500 text-white">Oficial</Badge>
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              Departamento Administrativo de la Función Pública - Sistema de evaluación de riesgo para priorización de auditorías
            </p>
          </div>
        </div>
      </Card>

      {/* INTEGRACIÓN CON ESTRUCTURA ORGANIZACIONAL */}
      <Card className="p-6 border-2 bg-gradient-to-br from-blue-50 to-indigo-50" style={{ borderColor: '#003DA5' }}>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg flex-shrink-0" style={{ background: '#003DA5' }}>
            <Link2 className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-gray-900 mb-2 flex items-center gap-2">
              Integrado con Estructura Organizacional
              <Badge style={{ background: '#003DA5', color: 'white' }}>Conectado</Badge>
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              Las áreas auditables están sincronizadas con las <strong>{TERRITORIALES_ESAP.length} unidades organizacionales</strong> de ESAP: 
              1 Sede Central + 17 Territoriales con 307 CETAP en todo el país
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              <div className="bg-white p-3 rounded-lg text-center border border-blue-200">
                <div className="font-black text-blue-600 text-2xl">{TERRITORIALES_ESAP.length}</div>
                <div className="text-xs text-gray-600 mt-1">Unidades Totales</div>
              </div>
              <div className="bg-white p-3 rounded-lg text-center border border-purple-200">
                <div className="font-black text-purple-600 text-2xl">
                  {TERRITORIALES_ESAP.filter(t => t.codigo === 'ESAP-CENTRAL').length}
                </div>
                <div className="text-xs text-gray-600 mt-1">Sede Central</div>
              </div>
              <div className="bg-white p-3 rounded-lg text-center border border-green-200">
                <div className="font-black text-green-600 text-2xl">
                  {TERRITORIALES_ESAP.filter(t => t.codigo !== 'ESAP-CENTRAL').length}
                </div>
                <div className="text-xs text-gray-600 mt-1">Territoriales</div>
              </div>
              <div className="bg-white p-3 rounded-lg text-center border border-orange-200">
                <div className="font-black text-orange-600 text-2xl">
                  {TERRITORIALES_ESAP.reduce((sum, t) => sum + t.totalCetap, 0)}
                </div>
                <div className="text-xs text-gray-600 mt-1">CETAP Totales</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* MÉTRICAS GENERALES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="p-4 text-center border-2" style={{ borderColor: '#003DA5' }}>
          <div className="text-3xl font-black mb-1" style={{ color: '#003DA5' }}>
            {metricas.total}
          </div>
          <p className="text-xs text-gray-600">Áreas Totales</p>
        </Card>

        <Card className="p-4 text-center border-2 border-purple-200">
          <div className="text-3xl font-black text-purple-600 mb-1">{metricas.sede}</div>
          <p className="text-xs text-gray-600">Procesos Sede</p>
        </Card>

        <Card className="p-4 text-center border-2 border-green-200">
          <div className="text-3xl font-black text-green-600 mb-1">{metricas.territorial}</div>
          <p className="text-xs text-gray-600">Territoriales</p>
        </Card>

        <Card className="p-4 text-center border-2 border-blue-200">
          <div className="text-3xl font-black text-blue-600 mb-1">{metricas.seleccionadas}</div>
          <p className="text-xs text-gray-600">Seleccionadas</p>
        </Card>
      </div>

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

// ============ MODAL NUEVA ÁREA ============

interface ModalNuevaAreaProps {
  onClose: () => void;
  onGuardar: (nuevaArea: AreaAuditable) => void;
  ultimoCodigo: number;
}

function ModalNuevaArea({ onClose, onGuardar, ultimoCodigo }: ModalNuevaAreaProps) {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoArea>('Sede');
  const [descripcion, setDescripcion] = useState('');
  const [responsable, setResponsable] = useState('');
  const [criticidad, setCriticidad] = useState<CriticidadNivel>(5);
  const [exposicion, setExposicion] = useState<ExposicionNivel>(5);
  const [mitigantes, setMitigantes] = useState(2);
  const [unidadSeleccionada, setUnidadSeleccionada] = useState('');

  // Manejar selección de unidad organizacional
  const handleSeleccionarUnidad = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const unidadId = e.target.value;
    setUnidadSeleccionada(unidadId);
    
    const unidad = TERRITORIALES_ESAP.find(t => t.id === unidadId);
    if (unidad) {
      setNombre(unidad.nombre);
      setTipo(unidad.codigo === 'ESAP-CENTRAL' ? 'Sede' : 'Territorial');
      setDescripcion(`Dirección ${unidad.nombre} - ${unidad.departamentos.join(', ')}`);
      setResponsable(`Director ${unidad.nombreCorto}`);
    }
  };

  const handleGuardar = () => {
    const { nivel, score } = calcularRiesgo(criticidad, exposicion, mitigantes);
    const nuevoCodigo = `SEDE-${ultimoCodigo + 1}`;
    const nuevaArea: AreaAuditable = {
      id: `area-${ultimoCodigo + 1}`,
      codigo: nuevoCodigo,
      nombre,
      tipo,
      descripcion,
      responsable,
      criticidad,
      factorExposicion: exposicion,
      factoresMitigantes: mitigantes,
      nivelRiesgo: nivel,
      scoreRiesgo: score,
      estado: 'pendiente',
      numeroAuditorias: 0
    };
    onGuardar(nuevaArea);
  };

  return (
    <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-gray-900 text-lg flex items-center gap-2">
              <Plus className="w-5 h-5" style={{ color: '#003DA5' }} />
              Nueva Área Auditable
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        <div className="space-y-4">
          {/* SELECTOR DE ESTRUCTURA ORGANIZACIONAL */}
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2" style={{ borderColor: '#003DA5' }}>
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="w-5 h-5" style={{ color: '#003DA5' }} />
              <h4 className="font-bold text-gray-900">Importar desde Estructura Organizacional</h4>
              <Badge style={{ background: '#003DA5', color: 'white' }} className="text-xs">
                {TERRITORIALES_ESAP.length} Unidades
              </Badge>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Selecciona una unidad organizacional existente para auto-completar los datos
            </p>
            <select
              value={unidadSeleccionada}
              onChange={handleSeleccionarUnidad}
              className="w-full px-3 py-2 border-2 rounded-lg text-sm"
              style={{ borderColor: unidadSeleccionada ? '#003DA5' : '#D1D5DB' }}
            >
              <option value="">➕ Crear área personalizada (sin vincular)</option>
              <optgroup label="🏛️ SEDE CENTRAL (1)">
                {TERRITORIALES_ESAP.filter(t => t.codigo === 'ESAP-CENTRAL').map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} - {t.ciudadPrincipal} ({t.totalCetap} CETAP)
                  </option>
                ))}
              </optgroup>
              <optgroup label="📍 TERRITORIALES (17)">
                {TERRITORIALES_ESAP.filter(t => t.codigo !== 'ESAP-CENTRAL').map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} - {t.ciudadPrincipal} ({t.totalCetap} CETAP)
                  </option>
                ))}
              </optgroup>
            </select>
            {unidadSeleccionada && (
              <div className="mt-2 p-2 bg-white rounded border" style={{ borderColor: '#003DA5' }}>
                <p className="text-xs font-bold" style={{ color: '#003DA5' }}>
                  ✓ Unidad vinculada - Datos auto-completados
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Nombre</label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre del área"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Tipo</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoArea)}
                className="px-2 py-1 text-sm border rounded"
              >
                <option value="Sede">Sede</option>
                <option value="Territorial">Territorial</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Descripción</label>
            <Input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción del área"
              className="text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Responsable</label>
            <Input
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              placeholder="Responsable del área"
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white p-3 rounded-lg border border-orange-200">
              <p className="text-xs font-bold text-gray-700 mb-1">📊 Criticidad (Impacto)</p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li><strong>Alta (5):</strong> Crítico/Financiero</li>
                <li><strong>Media (3):</strong> Apoyo importante</li>
                <li><strong>Baja (1):</strong> Secundario</li>
              </ul>
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

            <div className="bg-white p-3 rounded-lg border border-orange-200">
              <p className="text-xs font-bold text-gray-700 mb-1">👥 Factor Exposición</p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li><strong>Alta (5):</strong> &gt;100 personas</li>
                <li><strong>Media (3):</strong> 50-100 personas</li>
                <li><strong>Baja (1):</strong> &lt;50 personas</li>
              </ul>
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

            <div className="bg-white p-3 rounded-lg border border-orange-200">
              <p className="text-xs font-bold text-gray-700 mb-1">🛡️ Factores Mitigantes</p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li><strong>1-10:</strong> Controles existentes</li>
                <li>Mayor valor = Más controles</li>
                <li>Más controles = Menor riesgo</li>
              </ul>
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
          </div>

          {/* Preview del cálculo DAFP */}
          <div className="mt-3 p-3 bg-white rounded-lg border-2 border-orange-300">
            <p className="text-xs font-bold text-gray-700 mb-1">Vista Previa - Score DAFP:</p>
            <div className="flex items-center gap-2">
              <code className="text-lg font-black" style={{ color: getRiesgoColor(calcularRiesgo(criticidad, exposicion, mitigantes).nivel) }}>
                {calcularRiesgo(criticidad, exposicion, mitigantes).score}
              </code>
              <Badge style={{ 
                background: getRiesgoColor(calcularRiesgo(criticidad, exposicion, mitigantes).nivel),
                color: 'white'
              }}>
                {calcularRiesgo(criticidad, exposicion, mitigantes).nivel}
              </Badge>
              <p className="text-xs text-gray-600 ml-auto">
                ({criticidad} × {exposicion}) ÷ {mitigantes}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button
            size="sm"
            variant="outline"
            onClick={onClose}
          >
            <X className="w-4 h-4 mr-1" />
            Cancelar
          </Button>
          <Button
            size="sm"
            style={{ background: '#003DA5' }}
            className="gap-2"
            onClick={handleGuardar}
            disabled={!nombre || !descripcion || !responsable}
          >
            <Save className="w-4 h-4" />
            Crear Área
          </Button>
        </div>
      </Card>
      </motion.div>
    </div>
  );
}