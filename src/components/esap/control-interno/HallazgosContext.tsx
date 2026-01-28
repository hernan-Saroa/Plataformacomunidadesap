/**
 * ============================================
 * CONTEXTO GLOBAL: GESTIÓN DE HALLAZGOS
 * ============================================
 * 
 * RF008 - Registro de Hallazgos + Evidencias
 * 
 * FUNCIONALIDADES:
 * - CRUD completo de hallazgos por auditoría
 * - Clasificación por tipo y severidad
 * - Vinculación con evidencias
 * - Contadores dinámicos para el Kanban
 * - Generación automática de códigos HAL-YYYY-NNN
 * - Integración con Planes de Mejoramiento
 * 
 * ÚLTIMA ACTUALIZACIÓN: 23 Enero 2026
 */

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

export type TipoHallazgo = 
  | 'No Conformidad Mayor'
  | 'No Conformidad Menor'
  | 'Observación'
  | 'Oportunidad de Mejora'
  | 'Hallazgo Positivo';

export type SeveridadHallazgo = 'Baja' | 'Media' | 'Alta' | 'Crítica';

export type EstadoHallazgo = 
  | 'Abierto'
  | 'En Análisis'
  | 'Plan de Mejora'
  | 'En Seguimiento'
  | 'Cerrado';

export interface Hallazgo {
  id: string;
  codigo: string; // HAL-2025-001
  auditoriaId: string;
  
  // Clasificación
  tipo: TipoHallazgo;
  severidad: SeveridadHallazgo;
  estado: EstadoHallazgo;
  
  // Descripción
  titulo: string;
  descripcion: string;
  causaRaiz: string;
  criterioNormativo: string; // Decreto, ley o norma incumplida
  
  // Responsabilidad
  areaResponsable: string;
  responsableArea: string;
  
  // Evidencias
  evidencias: string[]; // IDs de documentos/archivos
  
  // Trazabilidad
  fechaDeteccion: string;
  responsableDeteccion: string; // Auditor que lo detectó
  fechaCreacion: string;
  fechaActualizacion?: string;
  
  // Seguimiento
  planMejoramientoId?: string; // Vinculación con plan de mejora
  observaciones?: string;
}

interface HallazgosContextType {
  // Estado
  hallazgosPorAuditoria: { [auditoriaId: string]: Hallazgo[] };
  
  // CRUD
  crearHallazgo: (auditoriaId: string, datos: Omit<Hallazgo, 'id' | 'codigo' | 'fechaCreacion'>) => string;
  editarHallazgo: (hallazgoId: string, datos: Partial<Hallazgo>) => void;
  eliminarHallazgo: (hallazgoId: string) => void;
  cambiarEstadoHallazgo: (hallazgoId: string, nuevoEstado: EstadoHallazgo) => void;
  
  // Consultas
  obtenerHallazgosPorAuditoria: (auditoriaId: string) => Hallazgo[];
  obtenerHallazgoPorId: (hallazgoId: string) => Hallazgo | undefined;
  
  // Contadores (para el Kanban)
  contarHallazgos: (auditoriaId: string) => number;
  contarHallazgosPorSeveridad: (auditoriaId: string, severidad: SeveridadHallazgo) => number;
  contarHallazgosCriticos: (auditoriaId: string) => number;
  contarHallazgosAbiertos: (auditoriaId: string) => number;
  
  // Filtros
  filtrarHallazgos: (auditoriaId: string, filtros: FiltrosHallazgo) => Hallazgo[];
}

export interface FiltrosHallazgo {
  tipo?: TipoHallazgo;
  severidad?: SeveridadHallazgo;
  estado?: EstadoHallazgo;
  busqueda?: string;
}

// ============ DATOS INICIALES MOCK ============

const HALLAZGOS_MOCK: { [auditoriaId: string]: Hallazgo[] } = {
  'aud-004': [
    {
      id: 'hall-001',
      codigo: 'HAL-2025-001',
      auditoriaId: 'aud-004',
      tipo: 'No Conformidad Mayor',
      severidad: 'Crítica',
      estado: 'Abierto',
      titulo: 'Falta de segregación de funciones en proceso de nómina',
      descripcion: 'Se identificó que la misma persona que elabora la nómina es quien la aprueba y ejecuta el pago, violando el principio de segregación de funciones.',
      causaRaiz: 'Ausencia de procedimientos documentados y falta de personal suficiente en el área de Talento Humano',
      criterioNormativo: 'Decreto 1072/2015 - Artículo 123, Modelo Estándar de Control Interno MECI',
      areaResponsable: 'Talento Humano',
      responsableArea: 'María Teresa Gómez - Jefe de Talento Humano',
      evidencias: ['evidencia-001.pdf', 'foto-proceso-001.jpg'],
      fechaDeteccion: '15/01/2025',
      responsableDeteccion: 'Catalina Rubio Silva - Auditor Líder',
      fechaCreacion: '15/01/2025 14:30',
      observaciones: 'Requiere acción inmediata. Riesgo alto de fraude.'
    },
    {
      id: 'hall-002',
      codigo: 'HAL-2025-002',
      auditoriaId: 'aud-004',
      tipo: 'No Conformidad Menor',
      severidad: 'Media',
      estado: 'En Análisis',
      titulo: 'Documentación de contratos laborales incompleta',
      descripcion: 'Se encontraron 12 contratos laborales sin anexar certificados de afiliación a seguridad social',
      causaRaiz: 'Falta de lista de chequeo en el proceso de contratación',
      criterioNormativo: 'Ley 100/1993 - Sistema General de Seguridad Social',
      areaResponsable: 'Talento Humano',
      responsableArea: 'María Teresa Gómez - Jefe de Talento Humano',
      evidencias: ['lista-contratos-001.xlsx'],
      fechaDeteccion: '16/01/2025',
      responsableDeteccion: 'Catalina Rubio Silva - Auditor Líder',
      fechaCreacion: '16/01/2025 10:15'
    },
    {
      id: 'hall-003',
      codigo: 'HAL-2025-003',
      auditoriaId: 'aud-004',
      tipo: 'Observación',
      severidad: 'Baja',
      estado: 'Abierto',
      titulo: 'Archivo físico de hojas de vida desorganizado',
      descripcion: 'El archivo físico de hojas de vida no tiene un orden lógico (alfabético o por fecha)',
      causaRaiz: 'Falta de implementación de sistema de gestión documental',
      criterioNormativo: 'Ley 594/2000 - Ley General de Archivos',
      areaResponsable: 'Talento Humano',
      responsableArea: 'María Teresa Gómez - Jefe de Talento Humano',
      evidencias: ['foto-archivo-001.jpg'],
      fechaDeteccion: '17/01/2025',
      responsableDeteccion: 'William Alonso Pérez - Auditor',
      fechaCreacion: '17/01/2025 09:45'
    },
    {
      id: 'hall-004',
      codigo: 'HAL-2025-004',
      auditoriaId: 'aud-004',
      tipo: 'No Conformidad Mayor',
      severidad: 'Alta',
      estado: 'Plan de Mejora',
      titulo: 'No se realizan evaluaciones de desempeño',
      descripcion: 'Desde 2023 no se han realizado evaluaciones de desempeño al personal de planta',
      causaRaiz: 'Falta de procedimiento establecido y ausencia de sistema tecnológico',
      criterioNormativo: 'Decreto 1083/2015 - Evaluación de Desempeño',
      areaResponsable: 'Talento Humano',
      responsableArea: 'María Teresa Gómez - Jefe de Talento Humano',
      evidencias: [],
      fechaDeteccion: '18/01/2025',
      responsableDeteccion: 'Catalina Rubio Silva - Auditor Líder',
      fechaCreacion: '18/01/2025 11:20',
      planMejoramientoId: 'pm-2025-003'
    },
    {
      id: 'hall-005',
      codigo: 'HAL-2025-005',
      auditoriaId: 'aud-004',
      tipo: 'Oportunidad de Mejora',
      severidad: 'Media',
      estado: 'Abierto',
      titulo: 'Implementar sistema de gestión de capacitaciones',
      descripcion: 'Se sugiere implementar un sistema digital para gestionar el plan de capacitaciones',
      causaRaiz: 'Gestión manual de capacitaciones en Excel',
      criterioNormativo: 'Decreto 1567/1998 - Plan Institucional de Capacitación',
      areaResponsable: 'Talento Humano',
      responsableArea: 'María Teresa Gómez - Jefe de Talento Humano',
      evidencias: ['planilla-capacitaciones-2024.xlsx'],
      fechaDeteccion: '19/01/2025',
      responsableDeteccion: 'Alexandra Gómez López - Auditor',
      fechaCreacion: '19/01/2025 15:00'
    },
    {
      id: 'hall-006',
      codigo: 'HAL-2025-006',
      auditoriaId: 'aud-004',
      tipo: 'No Conformidad Mayor',
      severidad: 'Crítica',
      estado: 'Abierto',
      titulo: 'Ausencia de análisis de cargos actualizado',
      descripcion: 'El manual de funciones y competencias no ha sido actualizado desde 2020',
      causaRaiz: 'Falta de recursos y priorización del área',
      criterioNormativo: 'Decreto 1083/2015 - Manual de Funciones',
      areaResponsable: 'Talento Humano',
      responsableArea: 'María Teresa Gómez - Jefe de Talento Humano',
      evidencias: ['manual-funciones-2020.pdf'],
      fechaDeteccion: '20/01/2025',
      responsableDeteccion: 'Catalina Rubio Silva - Auditor Líder',
      fechaCreacion: '20/01/2025 08:30'
    },
    {
      id: 'hall-007',
      codigo: 'HAL-2025-007',
      auditoriaId: 'aud-004',
      tipo: 'No Conformidad Menor',
      severidad: 'Alta',
      estado: 'En Análisis',
      titulo: 'Falta de política de teletrabajo',
      descripcion: 'No existe política formal de teletrabajo a pesar de tener 15 funcionarios trabajando remotamente',
      causaRaiz: 'Falta de lineamientos institucionales',
      criterioNormativo: 'Ley 1221/2008 - Teletrabajo',
      areaResponsable: 'Talento Humano',
      responsableArea: 'María Teresa Gómez - Jefe de Talento Humano',
      evidencias: [],
      fechaDeteccion: '21/01/2025',
      responsableDeteccion: 'William Alonso Pérez - Auditor',
      fechaCreacion: '21/01/2025 10:00'
    },
    {
      id: 'hall-008',
      codigo: 'HAL-2025-008',
      auditoriaId: 'aud-004',
      tipo: 'Hallazgo Positivo',
      severidad: 'Baja',
      estado: 'Cerrado',
      titulo: 'Implementación exitosa de programa de bienestar',
      descripcion: 'El programa de bienestar laboral ha tenido una participación del 85% del personal',
      causaRaiz: 'N/A - Buena práctica',
      criterioNormativo: 'Decreto 1567/1998 - Programa de Bienestar Social',
      areaResponsable: 'Talento Humano',
      responsableArea: 'María Teresa Gómez - Jefe de Talento Humano',
      evidencias: ['reporte-bienestar-2024.pdf'],
      fechaDeteccion: '22/01/2025',
      responsableDeteccion: 'Alexandra Gómez López - Auditor',
      fechaCreacion: '22/01/2025 14:30'
    }
  ],
  'aud-001': [
    {
      id: 'hall-009',
      codigo: 'HAL-2025-009',
      auditoriaId: 'aud-001',
      tipo: 'Observación',
      severidad: 'Media',
      estado: 'Abierto',
      titulo: 'Procedimiento de compras requiere actualización',
      descripcion: 'El procedimiento de compras menores no refleja las nuevas normativas de contratación pública',
      causaRaiz: 'Falta de actualización del sistema de gestión de calidad',
      criterioNormativo: 'Ley 1882/2018 - Contratación Pública',
      areaResponsable: 'Gestión Administrativa',
      responsableArea: 'Fernando Ávila García - Jefe Administrativo',
      evidencias: ['procedimiento-compras-v2.pdf'],
      fechaDeteccion: '10/01/2025',
      responsableDeteccion: 'Catalina Rubio Silva - Auditor Líder',
      fechaCreacion: '10/01/2025 09:00'
    }
  ]
};

// ============ CONTEXTO ============

const HallazgosContext = createContext<HallazgosContextType | undefined>(undefined);

export function HallazgosProvider({ children }: { children: ReactNode }) {
  const [hallazgosPorAuditoria, setHallazgosPorAuditoria] = useState<{
    [auditoriaId: string]: Hallazgo[];
  }>(HALLAZGOS_MOCK);

  // ============ CREAR HALLAZGO ============
  const crearHallazgo = useCallback((
    auditoriaId: string,
    datos: Omit<Hallazgo, 'id' | 'codigo' | 'fechaCreacion'>
  ): string => {
    const nuevoId = `hall-${Date.now()}`;
    
    // Generar código HAL-YYYY-NNN
    const año = new Date().getFullYear();
    const hallazgosExistentes = Object.values(hallazgosPorAuditoria)
      .flat()
      .filter(h => h.codigo.startsWith(`HAL-${año}-`));
    const numeroSecuencial = hallazgosExistentes.length + 1;
    const codigo = `HAL-${año}-${String(numeroSecuencial).padStart(3, '0')}`;

    const fechaCreacion = new Date().toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const nuevoHallazgo: Hallazgo = {
      ...datos,
      id: nuevoId,
      codigo,
      auditoriaId,
      fechaCreacion
    };

    setHallazgosPorAuditoria(prev => ({
      ...prev,
      [auditoriaId]: [...(prev[auditoriaId] || []), nuevoHallazgo]
    }));

    toast.success(`✅ Hallazgo ${codigo} creado exitosamente`);
    
    return nuevoId;
  }, [hallazgosPorAuditoria]);

  // ============ EDITAR HALLAZGO ============
  const editarHallazgo = useCallback((hallazgoId: string, datos: Partial<Hallazgo>) => {
    setHallazgosPorAuditoria(prev => {
      const nuevoEstado = { ...prev };
      
      for (const auditoriaId in nuevoEstado) {
        const indice = nuevoEstado[auditoriaId].findIndex(h => h.id === hallazgoId);
        if (indice !== -1) {
          nuevoEstado[auditoriaId][indice] = {
            ...nuevoEstado[auditoriaId][indice],
            ...datos,
            fechaActualizacion: new Date().toLocaleString('es-CO', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          };
          break;
        }
      }
      
      return nuevoEstado;
    });

    toast.success('✅ Hallazgo actualizado correctamente');
  }, []);

  // ============ ELIMINAR HALLAZGO ============
  const eliminarHallazgo = useCallback((hallazgoId: string) => {
    setHallazgosPorAuditoria(prev => {
      const nuevoEstado = { ...prev };
      
      for (const auditoriaId in nuevoEstado) {
        nuevoEstado[auditoriaId] = nuevoEstado[auditoriaId].filter(h => h.id !== hallazgoId);
      }
      
      return nuevoEstado;
    });

    toast.success('✅ Hallazgo eliminado correctamente');
  }, []);

  // ============ CAMBIAR ESTADO ============
  const cambiarEstadoHallazgo = useCallback((hallazgoId: string, nuevoEstado: EstadoHallazgo) => {
    editarHallazgo(hallazgoId, { estado: nuevoEstado });
  }, [editarHallazgo]);

  // ============ CONSULTAS ============
  const obtenerHallazgosPorAuditoria = useCallback((auditoriaId: string): Hallazgo[] => {
    return hallazgosPorAuditoria[auditoriaId] || [];
  }, [hallazgosPorAuditoria]);

  const obtenerHallazgoPorId = useCallback((hallazgoId: string): Hallazgo | undefined => {
    for (const auditoriaId in hallazgosPorAuditoria) {
      const hallazgo = hallazgosPorAuditoria[auditoriaId].find(h => h.id === hallazgoId);
      if (hallazgo) return hallazgo;
    }
    return undefined;
  }, [hallazgosPorAuditoria]);

  // ============ CONTADORES ============
  const contarHallazgos = useCallback((auditoriaId: string): number => {
    return hallazgosPorAuditoria[auditoriaId]?.length || 0;
  }, [hallazgosPorAuditoria]);

  const contarHallazgosPorSeveridad = useCallback((auditoriaId: string, severidad: SeveridadHallazgo): number => {
    return hallazgosPorAuditoria[auditoriaId]?.filter(h => h.severidad === severidad).length || 0;
  }, [hallazgosPorAuditoria]);

  const contarHallazgosCriticos = useCallback((auditoriaId: string): number => {
    return contarHallazgosPorSeveridad(auditoriaId, 'Crítica');
  }, [contarHallazgosPorSeveridad]);

  const contarHallazgosAbiertos = useCallback((auditoriaId: string): number => {
    return hallazgosPorAuditoria[auditoriaId]?.filter(h => h.estado === 'Abierto').length || 0;
  }, [hallazgosPorAuditoria]);

  // ============ FILTROS ============
  const filtrarHallazgos = useCallback((auditoriaId: string, filtros: FiltrosHallazgo): Hallazgo[] => {
    let hallazgosFiltrados = obtenerHallazgosPorAuditoria(auditoriaId);

    if (filtros.tipo) {
      hallazgosFiltrados = hallazgosFiltrados.filter(h => h.tipo === filtros.tipo);
    }

    if (filtros.severidad) {
      hallazgosFiltrados = hallazgosFiltrados.filter(h => h.severidad === filtros.severidad);
    }

    if (filtros.estado) {
      hallazgosFiltrados = hallazgosFiltrados.filter(h => h.estado === filtros.estado);
    }

    if (filtros.busqueda) {
      const busquedaLower = filtros.busqueda.toLowerCase();
      hallazgosFiltrados = hallazgosFiltrados.filter(h =>
        h.titulo.toLowerCase().includes(busquedaLower) ||
        h.descripcion.toLowerCase().includes(busquedaLower) ||
        h.codigo.toLowerCase().includes(busquedaLower)
      );
    }

    return hallazgosFiltrados;
  }, [obtenerHallazgosPorAuditoria]);

  // ============ PROVIDER ============
  return (
    <HallazgosContext.Provider
      value={{
        hallazgosPorAuditoria,
        crearHallazgo,
        editarHallazgo,
        eliminarHallazgo,
        cambiarEstadoHallazgo,
        obtenerHallazgosPorAuditoria,
        obtenerHallazgoPorId,
        contarHallazgos,
        contarHallazgosPorSeveridad,
        contarHallazgosCriticos,
        contarHallazgosAbiertos,
        filtrarHallazgos
      }}
    >
      {children}
    </HallazgosContext.Provider>
  );
}

// ============ HOOK ============
export const useHallazgos = () => {
  const context = useContext(HallazgosContext);
  if (!context) {
    throw new Error('useHallazgos debe usarse dentro de HallazgosProvider');
  }
  return context;
};
