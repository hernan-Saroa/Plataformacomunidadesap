import { ObjetivoAuditoria } from '../entities/objetivo-auditoria.entity';
import { EquipoAuditor } from '../entities/equipo-auditor.entity';
import { NotaAuditoria } from '../entities/nota-auditoria.entity';
import { HistorialAuditoria } from '../entities/historial-auditoria.entity';
import { AuditoriaTerritorialInfo } from '../entities/auditoria-territorial-info.entity';
import { AuditoriaEspecialInfo } from '../entities/auditoria-especial-info.entity';

export interface PersonaDto {
  nombre: string;
  cargo: string;
  iniciales: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA';
  numeroIdentificacion: string;
}

export interface ObjetivoDto {
  id: number;
  descripcion: string;
}

export interface AuditoriaKanbanDto {
  id: string;
  codigo: string;
  titulo: string;
  descripcion?: string;
  estado: string; // EstadoKanban
  riesgo: string; // RiesgoKanban
  semaforo: string; // SemaforoColor
  territorial: string;
  auditorLider?: PersonaDto;
  auditorAsignado?: PersonaDto;
  fechaInicio: string; // DD/MM/YYYY
  fechaFin: string; // DD/MM/YYYY
  progreso: number;
  hallazgos: number;
  diasRestantes: number;
  porcentajeTiempo: number;
  ultimaActuacion?: string;
  objetivos: ObjetivoDto[];
  calificacionRiesgo?: string;
  documentos: number;
  informes: number;
  tareas: number;
  tipo: string; // TipoAuditoria (Gestión, Control Interno, Académica, etc.)
  tipoKanban?: string; // TipoKanban (regular, territorial, especial)
  prioridad: string; // PrioridadKanban
  areaObjetivo?: string;
  permiteCambiarObjetivos: boolean;
  equipoAuditores: string[];
  territorialInfo?: {
    nombre: string;
    ciudad: string;
    departamento: string;
  };
  especial?: {
    tipoMotivo: string;
    solicitante: string;
    justificacion: string;
  };
  actividadesCompletas: boolean;
  actividadesPendientes: number;
  alcance?: string; // Alcance de la auditoría
  observacionesAdicionales?: string; // ✅ Observaciones adicionales de la auditoría
  programaAnualMetadata?: any; // Metadata del programa anual (mesInicio, semanaInicio, duraciones)
  // ✅ CAMPOS DE APROBACIÓN
  aprobada?: boolean; // Si la auditoría fue aprobada
  fechaAprobacion?: string; // Fecha de aprobación (DD/MM/YYYY)
  aprobadaPor?: string; // Nombre del usuario que aprobó
  aprobadaPorId?: number; // ID del usuario que aprobó
  // ✅ RESPONSABLE DEL ÁREA AUDITADA
  responsableAreaNombre?: string;
  responsableAreaCargo?: string;
  responsableAreaEmail?: string;
}



