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
import { controlInternoService } from '../../../services/api/controlInternoService';
import { universoAuditoriasApi } from './services/api';
import { useEffect } from 'react';

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
  const [areas, setAreas] = useState<AreaAuditable[]>([]);
  const [loading, setLoading] = useState(true);
  const [vistaActiva, setVistaActiva] = useState<'dashboard' | 'lista' | 'crear'>('dashboard');
  const [modoVista, setModoVista] = useState<'grid' | 'tabla'>('grid');
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'Todos' | TipoArea>('Todos');
  const [filtroRiesgo, setFiltroRiesgo] = useState<'Todos' | NivelRiesgo>('Todos');
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | EstadoSeleccion>('Todos');
  const [areaEditando, setAreaEditando] = useState<string | null>(null);
  const [modalNuevaArea, setModalNuevaArea] = useState(false);

  // Función para normalizar nivel de riesgo (BD puede venir en minúsculas)
  const normalizarNivelRiesgo = (nivel: string | undefined): NivelRiesgo => {
    if (!nivel) return 'Bajo';
    const nivelLower = nivel.toLowerCase();
    if (nivelLower === 'crítico' || nivelLower === 'critico') return 'Crítico';
    if (nivelLower === 'alto') return 'Alto';
    if (nivelLower === 'medio') return 'Medio';
    return 'Bajo';
  };

  // Función para mapear ProcesoAuditable a AreaAuditable
  const mapearProcesoAArea = (proceso: any): AreaAuditable => {
    const evaluacionRiesgo = proceso.evaluacionRiesgo || {};
    
    // Mapear prioridad a estado (1=seleccionada, 2=pendiente, 3=no-aplica)
    let estado: EstadoSeleccion = 'pendiente';
    if (proceso.prioridad === 1) estado = 'seleccionada';
    else if (proceso.prioridad === 2) estado = 'pendiente';
    else if (proceso.prioridad === 3) estado = 'no-aplica';

    // Mapear criticidad y exposición desde evaluacionRiesgo
    const criticidad = evaluacionRiesgo.impacto === 5 ? 5 : evaluacionRiesgo.impacto === 3 ? 3 : 1;
    const exposicion = evaluacionRiesgo.probabilidad === 5 ? 5 : evaluacionRiesgo.probabilidad === 3 ? 3 : 1;
    const mitigantes = evaluacionRiesgo.nivelControl || 1;

    const { nivel, score } = calcularRiesgo(criticidad, exposicion, mitigantes);

    // Normalizar nivel de riesgo (puede venir de BD como 'alto', 'medio', 'bajo')
    // Usar el nivel calculado si está disponible, sino usar el de la BD
    const nivelRiesgoBD = normalizarNivelRiesgo(evaluacionRiesgo.nivelRiesgo);
    const nivelRiesgoFinal = nivel || nivelRiesgoBD;

    // Determinar si es Sede o Territorial basado en el campo territorial
    // Si tiene territorial definido, es Territorial, sino es Sede
    const tipoArea: TipoArea = proceso.territorial ? 'Territorial' : 'Sede';

    return {
      id: proceso.id,
      codigo: proceso.codigo || '',
      nombre: proceso.nombre || '',
      tipo: tipoArea,
      descripcion: proceso.descripcion || '',
      responsable: proceso.responsable || '',
      criticidad: criticidad as CriticidadNivel,
      factorExposicion: exposicion as ExposicionNivel,
      factoresMitigantes: mitigantes,
      nivelRiesgo: nivelRiesgoFinal,
      scoreRiesgo: score,
      estado,
      ultimaAuditoria: proceso.ultimaAuditoria,
      proximaAuditoria: proceso.proximaAuditoria,
      numeroAuditorias: 0 // TODO: calcular desde auditorías relacionadas
    };
  };

  // Cargar procesos desde la BD
  useEffect(() => {
    const cargarProcesos = async () => {
      try {
        setLoading(true);
        const response = await universoAuditoriasApi.getAllProcesos();
        
        if (response.success && response.data) {
          const areasMapeadas = response.data.map(mapearProcesoAArea);
          setAreas(areasMapeadas);
          
          if (areasMapeadas.length === 0) {
            // Si la BD está vacía, usar mock como fallback
            setAreas(AREAS_AUDITABLES_MOCK);
            toast.info('No hay procesos en la BD, mostrando datos de demostración', {
              description: 'Puedes crear nuevos procesos desde el botón "Nueva Área"'
            });
          } else {
            toast.success(`${areasMapeadas.length} áreas auditables cargadas`, {
              description: 'Datos actualizados desde la base de datos'
            });
          }
        } else {
          // Si no hay datos en BD, usar mock como fallback (útil para desarrollo/demo)
          setAreas(AREAS_AUDITABLES_MOCK);
          if (!response.success) {
            toast.warning('Error al cargar desde BD, usando datos de demostración', {
              description: response.error || 'No se pudieron obtener los datos desde el servidor'
            });
          } else {
            toast.info('No hay procesos en la BD, mostrando datos de demostración', {
              description: 'Puedes crear nuevos procesos desde el botón "Nueva Área"'
            });
          }
        }
      } catch (error) {
        // En caso de error, usar mock como fallback
        setAreas(AREAS_AUDITABLES_MOCK);
        toast.warning('Error al conectar con el servidor, usando datos de demostración', {
          description: error instanceof Error ? error.message : 'No se pudieron obtener los datos desde el servidor'
        });
      } finally {
        setLoading(false);
      }
    };

    cargarProcesos();
  }, []);

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

  const handleCambiarEstado = async (areaId: string, nuevoEstado: EstadoSeleccion) => {
    try {
      // Mapear estado a prioridad (1=seleccionada, 2=pendiente, 3=no-aplica)
      // Nota: La prioridad en BD es inversa: 1 = mayor prioridad (4 años), 4 = menor prioridad (1 año)
      // Pero para el estado usamos: 1=seleccionada, 2=pendiente, 3=no-aplica
      // Necesitamos mapear: seleccionada=1, pendiente=2, no-aplica=3
      const prioridad = nuevoEstado === 'seleccionada' ? 1 : nuevoEstado === 'pendiente' ? 2 : 3;
      
      const response = await universoAuditoriasApi.updateProceso(areaId, { prioridad } as any);
      
      if (response.success) {
        setAreas(prev => prev.map(area => 
          area.id === areaId ? { ...area, estado: nuevoEstado } : area
        ));
        toast.success('Estado actualizado', {
          description: `Área ${areas.find(a => a.id === areaId)?.nombre} marcada como ${nuevoEstado}`
        });
      } else {
        throw new Error('Error al actualizar estado');
      }
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      toast.error('Error al actualizar estado', {
        description: 'No se pudo guardar el cambio en el servidor'
      });
    }
  };

  const handleActualizarRiesgo = async (
    areaId: string, 
    criticidad: CriticidadNivel, 
    exposicion: ExposicionNivel, 
    mitigantes: number
  ) => {
    try {
      const { nivel, score } = calcularRiesgo(criticidad, exposicion, mitigantes);
      
      // Mapear a formato del backend (igual que en el modal de nueva área)
      const mapearCriticidadAImpacto = (criticidad: CriticidadNivel): number => {
        // 5 -> 3 (alta), 3 -> 2 (media), 1 -> 1 (baja)
        return criticidad === 5 ? 3 : criticidad === 3 ? 2 : 1;
      };

      const mapearExposicionAProbabilidad = (exposicion: ExposicionNivel): number => {
        // 5 -> 3 (alta), 3 -> 2 (media), 1 -> 1 (baja)
        return exposicion === 5 ? 3 : exposicion === 3 ? 2 : 1;
      };

      const mapearMitigantesANivelControl = (mitigantes: number): number => {
        // 1-3 -> 1 (bajo), 4-6 -> 2 (medio), 7-10 -> 3 (alto)
        if (mitigantes <= 3) return 1;
        if (mitigantes <= 6) return 2;
        return 3;
      };

      const impacto = mapearCriticidadAImpacto(criticidad);
      const probabilidad = mapearExposicionAProbabilidad(exposicion);
      const nivelControl = mapearMitigantesANivelControl(mitigantes);
      
      // Obtener el área actual para preservar su estado (prioridad)
      const areaActual = areas.find(a => a.id === areaId);
      if (!areaActual) {
        throw new Error('Área no encontrada');
      }
      
      // Mapear estado actual a prioridad para preservarlo
      // El backend recalcula prioridad basándose en riesgo, pero queremos preservar el estado
      const prioridadActual = areaActual.estado === 'seleccionada' ? 1 : 
                              areaActual.estado === 'pendiente' ? 2 : 3;
      
      // Mapear a formato del backend (el backend calcula automáticamente nivelRiesgo)
      const evaluacionRiesgo = {
        probabilidad,
        impacto,
        nivelControl
        // NO enviar nivelRiesgo - el backend lo calcula automáticamente
      };

      // Enviar tanto evaluacionRiesgo como prioridad para preservar el estado
      // El backend actualizará evaluacionRiesgo pero mantendrá la prioridad (estado) que enviamos
      const response = await universoAuditoriasApi.updateProceso(areaId, { 
        evaluacionRiesgo,
        prioridad: prioridadActual  // Preservar el estado actual
      } as any);
      
      if (response.success) {
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
      } else {
        throw new Error('Error al actualizar riesgo');
      }
    } catch (error) {
      console.error('Error al actualizar riesgo:', error);
      toast.error('Error al actualizar riesgo', {
        description: 'No se pudo guardar el cambio en el servidor'
      });
    }
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
        <ModalNuevaArea
          onClose={() => setModalNuevaArea(false)}
          onGuardar={async (nuevaArea) => {
            try {
              // Mapear AreaAuditable a formato del backend (CreateProcesoAuditableDto)
              const mapearCriticidadAImpacto = (criticidad: CriticidadNivel): number => {
                // 5 -> 3 (alta), 3 -> 2 (media), 1 -> 1 (baja)
                return criticidad === 5 ? 3 : criticidad === 3 ? 2 : 1;
              };

              const mapearExposicionAProbabilidad = (exposicion: ExposicionNivel): number => {
                // 5 -> 3 (alta), 3 -> 2 (media), 1 -> 1 (baja)
                return exposicion === 5 ? 3 : exposicion === 3 ? 2 : 1;
              };

              const mapearMitigantesANivelControl = (mitigantes: number): number => {
                // 1-3 -> 1 (bajo), 4-6 -> 2 (medio), 7-10 -> 3 (alto)
                if (mitigantes <= 3) return 1;
                if (mitigantes <= 6) return 2;
                return 3;
              };

              const mapearNivelRiesgo = (nivel: NivelRiesgo): 'bajo' | 'medio' | 'alto' => {
                if (nivel === 'Crítico' || nivel === 'Alto') return 'alto';
                if (nivel === 'Medio') return 'medio';
                return 'bajo';
              };

              const mapearTipo = (tipo: TipoArea): 'estrategico' | 'misional' | 'apoyo' | 'evaluacion' => {
                // Mapear Sede/Territorial a tipos de proceso
                // Por defecto, usar 'misional' para ambos
                return 'misional';
              };

              const impacto = mapearCriticidadAImpacto(nuevaArea.criticidad);
              const probabilidad = mapearExposicionAProbabilidad(nuevaArea.factorExposicion);
              const nivelControl = mapearMitigantesANivelControl(nuevaArea.factoresMitigantes);

              // El backend calcula automáticamente riesgoInherente, riesgoResidual y nivelRiesgo
              // Solo enviamos los campos base que el DTO acepta
              const procesoData = {
                codigo: nuevaArea.codigo,
                nombre: nuevaArea.nombre,
                descripcion: nuevaArea.descripcion,
                tipo: mapearTipo(nuevaArea.tipo),
                macroproceso: nuevaArea.tipo === 'Sede' ? 'Procesos Sede' : 'Procesos Territoriales',
                responsable: nuevaArea.responsable,
                dependencia: nuevaArea.tipo === 'Sede' ? 'Sede Central' : nuevaArea.nombre,
                territorial: nuevaArea.tipo === 'Territorial' ? nuevaArea.nombre : undefined,
                evaluacionRiesgo: {
                  probabilidad,
                  impacto,
                  nivelControl,
                  // NO enviar: riesgoInherente, riesgoResidual, nivelRiesgo
                  // El backend los calcula automáticamente
                },
                frecuenciaAuditoria: 'Anual',
              };

              // Guardar en la base de datos
              const response = await universoAuditoriasApi.createProceso(procesoData);
              
              if (!response.success || !response.data) {
                throw new Error('Error al crear el proceso');
              }
              
              const procesoGuardado = response.data;

              // Mapear el proceso guardado a AreaAuditable
              const areaGuardada = mapearProcesoAArea(procesoGuardado);

              setAreas(prev => [...prev, areaGuardada]);
              setModalNuevaArea(false);
              toast.success('¡Área creada exitosamente!', {
                description: `${nuevaArea.nombre} guardada en la base de datos`
              });
            } catch (error) {
              console.error('Error al guardar área:', error);
              toast.error('Error al guardar el área', {
                description: error instanceof Error ? error.message : 'No se pudo guardar en la base de datos'
              });
            }
          }}
          ultimoCodigoPorTipo={{
            Sede: areas.filter(a => a.tipo === 'Sede' && a.codigo.startsWith('SEDE-')).length > 0
              ? Math.max(...areas.filter(a => a.tipo === 'Sede' && a.codigo.startsWith('SEDE-')).map(a => {
                  const num = parseInt(a.codigo.split('-')[1]);
                  return isNaN(num) ? 0 : num;
                }))
              : 0,
            Territorial: areas.filter(a => a.tipo === 'Territorial' && a.codigo.startsWith('TERR-')).length > 0
              ? Math.max(...areas.filter(a => a.tipo === 'Territorial' && a.codigo.startsWith('TERR-')).map(a => {
                  const num = parseInt(a.codigo.split('-')[1]);
                  return isNaN(num) ? 0 : num;
                }))
              : 0
          }}
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
          {areas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No hay áreas auditables disponibles</p>
            </div>
          ) : areas
            .sort((a, b) => b.scoreRiesgo - a.scoreRiesgo)
            .slice(0, 5)
            .map((area, idx) => {
              // Normalizar nivel de riesgo (puede venir de BD como 'alto', 'medio', 'bajo' en minúsculas)
              const normalizarNivelRiesgo = (nivel: string): NivelRiesgo => {
                const nivelLower = nivel?.toLowerCase() || 'bajo';
                if (nivelLower === 'crítico' || nivelLower === 'critico') return 'Crítico';
                if (nivelLower === 'alto') return 'Alto';
                if (nivelLower === 'medio') return 'Medio';
                return 'Bajo';
              };

              const nivelNormalizado = normalizarNivelRiesgo(area.nivelRiesgo);

              // Estilos según nivel de riesgo
              const getRiesgoStyles = (nivel: NivelRiesgo) => {
                switch (nivel) {
                  case 'Crítico':
                    return {
                      cardBg: 'bg-red-50',
                      cardBorder: 'border-red-200',
                      cardHover: 'hover:bg-red-100',
                      numberBg: '#DC2626',
                      badgeBg: '#DC2626',
                      badgeText: 'white',
                      scoreColor: '#DC2626',
                      textColor: 'text-red-600'
                    };
                  case 'Alto':
                    return {
                      cardBg: 'bg-orange-50',
                      cardBorder: 'border-orange-200',
                      cardHover: 'hover:bg-orange-100',
                      numberBg: '#F59E0B',
                      badgeBg: '#F59E0B',
                      badgeText: 'white',
                      scoreColor: '#F59E0B',
                      textColor: 'text-orange-600'
                    };
                  case 'Medio':
                    return {
                      cardBg: 'bg-blue-50',
                      cardBorder: 'border-blue-200',
                      cardHover: 'hover:bg-blue-100',
                      numberBg: '#3B82F6',
                      badgeBg: '#3B82F6',
                      badgeText: 'white',
                      scoreColor: '#3B82F6',
                      textColor: 'text-blue-600'
                    };
                  case 'Bajo':
                    return {
                      cardBg: 'bg-green-50',
                      cardBorder: 'border-green-200',
                      cardHover: 'hover:bg-green-100',
                      numberBg: '#10B981',
                      badgeBg: '#10B981',
                      badgeText: 'white',
                      scoreColor: '#10B981',
                      textColor: 'text-green-600'
                    };
                  default:
                    // Fallback por si acaso
                    return {
                      cardBg: 'bg-gray-50',
                      cardBorder: 'border-gray-200',
                      cardHover: 'hover:bg-gray-100',
                      numberBg: '#6B7280',
                      badgeBg: '#6B7280',
                      badgeText: 'white',
                      scoreColor: '#6B7280',
                      textColor: 'text-gray-600'
                    };
                }
              };

              const styles = getRiesgoStyles(nivelNormalizado);

              return (
                <div 
                  key={area.id} 
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${styles.cardBg} ${styles.cardBorder} ${styles.cardHover}`}
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 shadow-sm" 
                    style={{ background: styles.numberBg }}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 mb-1">{area.nombre}</p>
                    <p className="text-xs text-gray-600">{area.codigo} - {area.tipo}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge 
                      style={{ 
                        background: styles.badgeBg, 
                        color: styles.badgeText 
                      }}
                      className="mb-2"
                    >
                      {nivelNormalizado}
                    </Badge>
                    <p className={`text-xs mt-1 font-bold ${styles.textColor}`}>
                      Score DAFP: {area.scoreRiesgo}
                    </p>
                  </div>
                </div>
              );
            })}
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
  onGuardar: (nuevaArea: AreaAuditable) => Promise<void>;
  ultimoCodigoPorTipo: {
    Sede: number;
    Territorial: number;
  };
}

function ModalNuevaArea({ onClose, onGuardar, ultimoCodigoPorTipo }: ModalNuevaAreaProps) {
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

  const [guardando, setGuardando] = useState(false);

  const handleGuardar = async () => {
    if (!nombre || !descripcion || !responsable) {
      toast.error('Datos incompletos', {
        description: 'Por favor completa todos los campos obligatorios'
      });
      return;
    }

    setGuardando(true);
    try {
      const { nivel, score } = calcularRiesgo(criticidad, exposicion, mitigantes);
      // Generar código según el tipo, usando el último código del tipo correspondiente
      const prefijoCodigo = tipo === 'Sede' ? 'SEDE' : 'TERR';
      const ultimoCodigo = tipo === 'Sede' ? ultimoCodigoPorTipo.Sede : ultimoCodigoPorTipo.Territorial;
      const nuevoCodigo = `${prefijoCodigo}-${String(ultimoCodigo + 1).padStart(3, '0')}`;
      const nuevaArea: AreaAuditable = {
        id: `area-${ultimoCodigo + 1}`, // ID temporal, se reemplazará con el de la BD
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
      await onGuardar(nuevaArea);
    } catch (error) {
      console.error('Error en handleGuardar:', error);
      // El error ya se maneja en onGuardar
    } finally {
      setGuardando(false);
    }
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
            disabled={!nombre || !descripcion || !responsable || guardando}
          >
            <Save className="w-4 h-4" />
            {guardando ? 'Guardando...' : 'Crear Área'}
          </Button>
        </div>
      </Card>
      </motion.div>
    </div>
  );
}