/**
 * Hook para Configuración de Profesionales OCI
 * 
 * Conecta con el backend:
 * - GET /auditorias/personas/disponibles: Usuarios con roles de Control Interno
 * - GET/POST/PUT/DELETE /configuraciones/profesionales-OCI: Configuraciones OCI
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { 
  auditoriasApi, 
  configuracionesProfesionalesOCIApi,
  type ConfiguracionProfesionalOCI as ConfigBackend 
} from './api';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

// Usuario del sistema obtenido del backend
export interface UsuarioSistema {
  id: string;           // id_person UUID
  idTercero: string;    // id_person UUID (para el backend)
  nombre: string;
  identificacion: string;
  email: string;
  cargo?: string;
  area?: string;
  activo: boolean;
  rolCode?: string;     // código de rol del sistema (ej: 'JEFE_OCI', 'AUDITOR')
}

// Configuración OCI del profesional
export interface ConfiguracionOCI {
  id?: string;          // UUID de la configuración (si existe en BD)
  usuarioId: string;    // id_person UUID
  idTercero: string;    // id_person UUID (para el backend)
  rolOCI: 'Jefe OCI' | 'Auditor Sénior' | 'Auditor' | 'Auditor Júnior' | 'Apoyo Técnico';
  especialidades: string[];
  capacidadMaximaAuditorias: number;
  horasMensualesDisponibles: number;
  puedeSerLider: boolean;
  activo: boolean;
  fechaAsignacion: string;
  observaciones?: string;
  // Datos enriquecidos del usuario (vienen del backend)
  nombre?: string;
  email?: string;
  identificacion?: string;
}

// Profesional OCI completo
export interface ProfesionalOCI {
  usuario: UsuarioSistema;
  configuracion: ConfiguracionOCI;
  estadisticas: {
    auditoriasTotales: number;
    auditoriasComoLider: number;
    auditoriasComoEquipo: number;
    cargaPonderada: number;
    porcentajeCarga: number;
    horasAsignadas: number;
  };
}

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════════════════════════════════════════════

export const ESPECIALIDADES_DISPONIBLES = [
  'Auditoría Financiera',
  'Auditoría de Gestión',
  'Auditoría TI',
  'Cumplimiento Normativo',
  'Gestión de Riesgos',
  'Control Interno',
  'Seguridad de la Información',
  'Gestión Tecnológica',
  'Gestión Pública',
  'Estrategia',
  'Contratación Pública',
  'Gestión Presupuestal'
];

export const ROLES_OCI = [
  'Jefe OCI',
  'Auditor Sénior',
  'Auditor',
  'Auditor Júnior',
  'Apoyo Técnico'
] as const;

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

interface PersonaDisponible {
  id: string;
  idPersona: number;
  nombre: string;
  iniciales: string;
  tipoIdentificacion: string;
  numeroIdentificacion: string;
  email: string;
  cargo: string;
  rolCode: string;
  especialidad: string;
  auditoriasConducto: number;
  disponibilidad: string;
}

function convertirPersonaAUsuarioSistema(persona: PersonaDisponible): UsuarioSistema {
  return {
    id: persona.id,
    idTercero: String(persona.idPersona),
    nombre: persona.nombre,
    identificacion: persona.numeroIdentificacion,
    email: persona.email,
    cargo: persona.cargo,
    area: undefined,
    activo: true,
    rolCode: persona.rolCode
  };
}

function convertirConfigBackendALocal(config: ConfigBackend): ConfiguracionOCI {
  return {
    id: config.id,
    usuarioId: String(config.idTercero),
    idTercero: String(config.idTercero),
    rolOCI: (config.rolOcig ?? config.rolOCI) as ConfiguracionOCI['rolOCI'],
    especialidades: config.especialidades,
    capacidadMaximaAuditorias: config.capacidadMaximaAuditorias,
    horasMensualesDisponibles: config.horasMensualesDisponibles,
    puedeSerLider: config.puedeSerLider,
    activo: config.activo,
    fechaAsignacion: config.fechaAsignacion,
    observaciones: config.observaciones,
    // Datos enriquecidos del usuario
    nombre: config.nombre,
    email: config.email,
    identificacion: config.identificacion
  };
}

// ════════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function useConfiguracionProfesionales() {
  // Estado
  const [usuariosControlInterno, setUsuariosControlInterno] = useState<UsuarioSistema[]>([]);
  const [configuracionesOCI, setConfiguracionesOCI] = useState<ConfiguracionOCI[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ══════════════════════════════════════════════════════════════════════════
  // CARGAR DATOS AL MONTAR
  // ══════════════════════════════════════════════════════════════════════════
  
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 1. Cargar usuarios candidatos de auth.personas (personas que AÚN NO están configuradas como OCI)
      const responseUsuarios = await configuracionesProfesionalesOCIApi.buscarCandidatos();
      const personas = responseUsuarios.data || [];
      const usuarios = personas.map((p: any) => ({
        id: p.id,
        idTercero: p.idTercero,
        nombre: p.nombre,
        identificacion: p.identificacion,
        email: p.email,
        cargo: '',
        area: undefined,
        activo: true,
        rolCode: p.rolCode
      }));
      setUsuariosControlInterno(usuarios);
      
      // 2. Cargar configuraciones OCI desde el backend
      const responseConfigs = await configuracionesProfesionalesOCIApi.getAll(true);
      const configuraciones = (responseConfigs.data || []).map(convertirConfigBackendALocal);
      setConfiguracionesOCI(configuraciones);
      
      console.log('✅ Profesionales cargados:', {
        usuariosCandidatos: usuarios.length,
        configuracionesOCI: configuraciones.length
      });
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al cargar profesionales';
      setError(mensaje);
      console.error('❌ Error cargando profesionales:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // ══════════════════════════════════════════════════════════════════════════
  // PROFESIONALES OCI CON ESTADÍSTICAS
  // ══════════════════════════════════════════════════════════════════════════

  const profesionalesOCI: ProfesionalOCI[] = useMemo(() => {
    console.log('=== DEBUG profesionalesOCI ===');
    console.log('configuracionesOCI:', configuracionesOCI.map(c => ({ id: c.id, idTercero: c.idTercero, nombre: c.nombre, activo: c.activo })));
    console.log('usuariosControlInterno:', usuariosControlInterno.map(u => ({ id: u.id, idTercero: u.idTercero, nombre: u.nombre })));
    
    return configuracionesOCI
      .filter(config => config.activo)
      .map(config => {
        // Buscar usuario en la lista del backend - comparar como números para evitar problemas de tipos
        let usuario = usuariosControlInterno.find(
          u => u.id === String(config.idTercero) || u.idTercero === String(config.idTercero)
        );
        
        // Si no se encuentra en usuarios disponibles, crear usuario temporal desde los datos enriquecidos de la configuración
        if (!usuario && config.nombre) {
          console.log(`Config idTercero=${config.idTercero}: Usando datos enriquecidos de la configuración (${config.nombre})`);
          usuario = {
            id: String(config.idTercero),
            idTercero: config.idTercero,
            nombre: config.nombre,
            identificacion: config.identificacion || '',
            email: config.email || '',
            cargo: config.rolOCI as string,
            area: 'OCI',
            activo: true
          };
        } else if (usuario) {
          console.log(`Config idTercero=${config.idTercero}: Usuario encontrado en lista (${usuario.nombre})`);
        } else {
          console.warn(`Config idTercero=${config.idTercero}: Sin datos - omitido`);
          return null;
        }

        // TODO: Calcular estadísticas reales desde auditorías
        return {
          usuario,
          configuracion: config,
          estadisticas: {
            auditoriasTotales: 0,
            auditoriasComoLider: 0,
            auditoriasComoEquipo: 0,
            cargaPonderada: 0,
            porcentajeCarga: 0,
            horasAsignadas: 0
          }
        };
      })
      .filter((p): p is ProfesionalOCI => p !== null);
  }, [configuracionesOCI, usuariosControlInterno]);

  // Usuarios disponibles para agregar (tienen rol de Control Interno pero no están en OCI)
  const usuariosDisponiblesParaOCI = useMemo(() => {
    const idsTercerosConfigurados = new Set(configuracionesOCI.map(c => c.idTercero));
    return usuariosControlInterno.filter(u => !idsTercerosConfigurados.has(u.idTercero) && u.activo);
  }, [usuariosControlInterno, configuracionesOCI]);

  // ══════════════════════════════════════════════════════════════════════════
  // CRUD CONFIGURACIONES OCI
  // ══════════════════════════════════════════════════════════════════════════

  const agregarProfesional = useCallback(async (config: ConfiguracionOCI) => {
    setSaving(true);
    try {
      const response = await configuracionesProfesionalesOCIApi.create({
        idTercero: config.idTercero,
        rolOcig: config.rolOCI,
        especialidades: config.especialidades,
        capacidadMaximaAuditorias: config.capacidadMaximaAuditorias,
        horasMensualesDisponibles: config.horasMensualesDisponibles,
        puedeSerLider: config.puedeSerLider,
        observaciones: config.observaciones
      });

      if (response.data) {
        const nuevaConfig = convertirConfigBackendALocal(response.data);
        setConfiguracionesOCI(prev => [...prev, nuevaConfig]);
        toast.success('✅ Profesional agregado al equipo OCI');
      }
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al agregar profesional';
      toast.error(`❌ ${mensaje}`);
      console.error('Error agregando profesional:', err);
    } finally {
      setSaving(false);
    }
  }, []);

  const actualizarProfesional = useCallback(async (usuarioId: string, cambios: Partial<ConfiguracionOCI>) => {
    setSaving(true);
    try {
      const configActual = configuracionesOCI.find(c => c.usuarioId === usuarioId);
      if (!configActual?.id) {
        throw new Error('Configuración no encontrada');
      }

      const response = await configuracionesProfesionalesOCIApi.update(configActual.id, {
        rolOcig: cambios.rolOCI,
        especialidades: cambios.especialidades,
        capacidadMaximaAuditorias: cambios.capacidadMaximaAuditorias,
        horasMensualesDisponibles: cambios.horasMensualesDisponibles,
        puedeSerLider: cambios.puedeSerLider,
        activo: cambios.activo,
        observaciones: cambios.observaciones
      });

      if (response.data) {
        const configActualizada = convertirConfigBackendALocal(response.data);
        setConfiguracionesOCI(prev => 
          prev.map(c => c.usuarioId === usuarioId ? configActualizada : c)
        );
        toast.success('✅ Configuración actualizada exitosamente');
      }
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al actualizar configuración';
      toast.error(`❌ ${mensaje}`);
      console.error('Error actualizando profesional:', err);
    } finally {
      setSaving(false);
    }
  }, [configuracionesOCI]);

  const eliminarProfesional = useCallback(async (usuarioId: string) => {
    setSaving(true);
    try {
      const configActual = configuracionesOCI.find(c => c.usuarioId === usuarioId);
      if (!configActual?.id) {
        throw new Error('Configuración no encontrada');
      }

      await configuracionesProfesionalesOCIApi.delete(configActual.id);
      
      setConfiguracionesOCI(prev => prev.filter(c => c.usuarioId !== usuarioId));
      toast.success('🗑️ Profesional removido del equipo OCI');
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al eliminar profesional';
      toast.error(`❌ ${mensaje}`);
      console.error('Error eliminando profesional:', err);
    } finally {
      setSaving(false);
    }
  }, [configuracionesOCI]);

  // ══════════════════════════════════════════════════════════════════════════
  // BÚSQUEDA DE USUARIOS
  // ══════════════════════════════════════════════════════════════════════════

  const buscarUsuariosExternos = useCallback(async (searchTerm: string): Promise<UsuarioSistema[]> => {
    if (searchTerm.trim().length < 2) {
      return [];
    }
    
    const termino = searchTerm.toLowerCase();
    const idsTercerosEquipo = configuracionesOCI.map(c => c.idTercero);
    
    return usuariosControlInterno.filter(u => 
      !idsTercerosEquipo.includes(u.idTercero) &&
      (u.nombre.toLowerCase().includes(termino) ||
       u.identificacion.includes(termino) ||
       u.email.toLowerCase().includes(termino))
    );
  }, [configuracionesOCI, usuariosControlInterno]);

  // ══════════════════════════════════════════════════════════════════════════
  // ESTADÍSTICAS GLOBALES
  // ══════════════════════════════════════════════════════════════════════════

  const estadisticasGlobales = useMemo(() => {
    const totalProfesionales = profesionalesOCI.length;
    const capacidadTotal = profesionalesOCI.reduce(
      (sum, p) => sum + p.configuracion.capacidadMaximaAuditorias, 0
    );
    const horasTotales = profesionalesOCI.reduce(
      (sum, p) => sum + p.configuracion.horasMensualesDisponibles, 0
    );
    const auditoriasTotales = profesionalesOCI.reduce(
      (sum, p) => sum + p.estadisticas.auditoriasTotales, 0
    );
    const cargaPromedio = totalProfesionales > 0
      ? Math.round(
          profesionalesOCI.reduce((sum, p) => sum + p.estadisticas.porcentajeCarga, 0) / 
          totalProfesionales
        )
      : 0;
    const sobrecargados = profesionalesOCI.filter(
      p => p.estadisticas.porcentajeCarga > 90
    ).length;

    return {
      totalProfesionales,
      capacidadTotal,
      horasTotales,
      auditoriasTotales,
      cargaPromedio,
      sobrecargados
    };
  }, [profesionalesOCI]);

  // ══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ══════════════════════════════════════════════════════════════════════════

  return {
    // Estado
    loading,
    saving,
    error,
    
    // Datos
    usuariosControlInterno,
    configuracionesOCI,
    profesionalesOCI,
    usuariosDisponiblesParaOCI,
    estadisticasGlobales,
    
    // Acciones
    cargarDatos,
    agregarProfesional,
    actualizarProfesional,
    eliminarProfesional,
    buscarUsuariosExternos,
    
    // Constantes
    ESPECIALIDADES_DISPONIBLES,
    ROLES_OCI
  };
}
