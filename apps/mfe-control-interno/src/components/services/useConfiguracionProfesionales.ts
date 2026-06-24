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
import { auditoriaService } from './auditoriaService';
import {
  ROLES_OCI_DEFAULT,
  ROLES_OCIG_OPERATIVOS,
  normalizarRolOcigOperativo,
} from '../../config/roles-ocig-operativos';

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
  roles?: string[];     // roles del usuario en el sistema
}

// Configuración OCI del profesional
export interface ConfiguracionOCI {
  id?: string;          // UUID de la configuración (si existe en BD)
  usuarioId: string;    // id_person UUID
  idTercero: string;    // id_person UUID (para el backend)
  rolOCI: string;
  rolOCIG?: string;
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
  roles?: string[];
}

// Profesional OCI completo
export interface ProfesionalOCI {
  usuario: UsuarioSistema;
  configuracion: ConfiguracionOCI;
  estadisticas: {
    auditoriasTotales: number;
    auditoriasComoLider: number;
    auditoriasComoEquipo: number;
    auditoriasComoSupervisor: number;
    cargaPonderada: number;
    porcentajeCarga: number;
    horasAsignadas: number;
  };
}

export type ConfiguracionOCIG = ConfiguracionOCI;
export type ProfesionalOCIG = ProfesionalOCI;

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════════════════════════════════════════════

// Especialidades dinámicas (ahora siempre desde la API)
export const ESPECIALIDADES_DEFAULT: string[] = [];

// Interfaz para especialidades con descripción desde la BD
export interface EspecialidadOCIG {
  id: number;
  nombre: string;
  descripcion: string;
}

// Exportación de compatibilidad (se sobreescribe dinámicamente en el hook)
export let ESPECIALIDADES_DISPONIBLES: string[] = [];

// Re-export del catálogo operativo fijo
export { ROLES_OCI_DEFAULT, ROLES_OCIG_OPERATIVOS };

// Interfaz para roles con descripción desde la BD
export interface RolOCIG {
  name: string;
  description: string;
}

// Exportaciones de compatibilidad (se sobreescriben dinámicamente en el hook)
export let ROLES_OCI: readonly string[] = [];
export let ROLES_OCIG: readonly string[] = [];

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
  roles: string[];
  especialidad: string;
  auditoriasConducto: number;
  disponibilidad: string;
}

function esNombrePlaceholder(nombre?: string | null): boolean {
  const valor = (nombre || '').trim().toLowerCase();
  return (
    !valor ||
    valor === 'usuario sin nombre' ||
    valor === 'sin nombre' ||
    valor === 'no asignado' ||
    valor === 'n/a'
  );
}

function nombreDesdePartes(data: any): string {
  const partes = [
    data?.primerNombre,
    data?.segundoNombre,
    data?.primerApellido,
    data?.segundoApellido,
  ].filter(Boolean);
  return partes.join(' ').trim();
}

function convertirPersonaAUsuarioSistema(persona: PersonaDisponible): UsuarioSistema {
  const nombre =
    persona.nombre
    || (persona as any).nombreCompleto
    || nombreDesdePartes(persona)
    || '';

  return {
    id: persona.id,
    idTercero: String(persona.idPersona),
    nombre: esNombrePlaceholder(nombre) ? (persona.email || `Usuario ${persona.numeroIdentificacion || persona.idPersona}`) : nombre,
    identificacion: persona.numeroIdentificacion || (persona as any).identificacion || '',
    email: persona.email || (persona as any).correo || '',
    cargo: persona.cargo,
    area: undefined,
    activo: true,
    roles: persona.roles
  };
}

function convertirConfigBackendALocal(config: ConfigBackend): ConfiguracionOCI {
  const nombreBackend =
    config.nombre
    || (config as any).nombreCompleto
    || nombreDesdePartes(config);

  const rolOCI = normalizarRolOcigOperativo(
    config.rolOcig ?? config.rolOCI,
  ) as ConfiguracionOCI['rolOCI'];
  return {
    id: config.id,
    usuarioId: String(config.idTercero),
    idTercero: String(config.idTercero),
    rolOCI,
    rolOCIG: rolOCI,
    especialidades: config.especialidades,
    capacidadMaximaAuditorias: config.capacidadMaximaAuditorias,
    horasMensualesDisponibles: config.horasMensualesDisponibles,
    puedeSerLider: config.puedeSerLider,
    activo: config.activo,
    fechaAsignacion: config.fechaAsignacion,
    observaciones: config.observaciones,
    // Datos enriquecidos del usuario
    nombre: esNombrePlaceholder(nombreBackend) ? undefined : nombreBackend,
    email: config.email || (config as any).correo || undefined,
    identificacion: config.identificacion || (config as any).numeroIdentificacion || undefined,
    roles: config.roles
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
  
  // Estados para datos dinámicos de la BD
  const [rolesOCIG, setRolesOCIG] = useState<RolOCIG[]>([]);
  const [rolesOCIGNames, setRolesOCIGNames] = useState<readonly string[]>([]);
  const [especialidadesOCIG, setEspecialidadesOCIG] = useState<EspecialidadOCIG[]>([]);
  const [especialidadesNames, setEspecialidadesNames] = useState<string[]>([]);

  const [auditorias, setAuditorias] = useState<any[]>([]);
  const [cargandoAuditorias, setCargandoAuditorias] = useState(false);

  // ══════════════════════════════════════════════════════════════════════════
  // CARGAR DATOS AL MONTAR
  // ══════════════════════════════════════════════════════════════════════════
  
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 1. Catálogo operativo fijo (misma lista que expone la API roles-ocig)
      const rolesOperativos = [...ROLES_OCIG_OPERATIVOS];
      setRolesOCIG(
        rolesOperativos.map((name) => ({
          name,
          description: '',
        })),
      );
      setRolesOCIGNames(rolesOperativos);
      ROLES_OCI = rolesOperativos;
      ROLES_OCIG = rolesOperativos;

      // 2. Cargar especialidades OCIG desde la BD (no hardcodeadas)
      const responseEsp = await configuracionesProfesionalesOCIApi.getEspecialidades();
      if (responseEsp.data && responseEsp.data.length > 0) {
        setEspecialidadesOCIG(responseEsp.data);
        const nombresEsp = responseEsp.data.map(e => e.nombre);
        setEspecialidadesNames(nombresEsp);
        ESPECIALIDADES_DISPONIBLES = nombresEsp;
      }

      // 2. Cargar usuarios candidatos de auth.personas
      const responseUsuarios = await configuracionesProfesionalesOCIApi.buscarCandidatos();
      const personas = responseUsuarios.data || [];
      const usuarios = personas.map((p: any) => ({
        id: p.id,
        idTercero: p.idTercero,
        nombre: esNombrePlaceholder(p.nombre)
          ? (p.nombreCompleto || nombreDesdePartes(p) || p.email || `Usuario ${p.identificacion || p.idTercero}`)
          : p.nombre,
        identificacion: p.identificacion || p.numeroIdentificacion || '',
        email: p.email || p.correo || '',
        cargo: '',
        area: undefined,
        activo: true,
        roles: p.roles || []
      }));
      setUsuariosControlInterno(usuarios);
      
      // 3. Cargar configuraciones OCI desde el backend
      const responseConfigs = await configuracionesProfesionalesOCIApi.getAll(true);
      const configuraciones = (responseConfigs.data || []).map(convertirConfigBackendALocal);
      setConfiguracionesOCI(configuraciones);

      // 4. Cargar auditorías para estadísticas (Usamos el servicio centralizado que coincide con el Programa Anual)
      setCargandoAuditorias(true);
      let auditoriasData: any[] = [];
      try {
        auditoriasData = await auditoriaService.listar();
        setAuditorias(auditoriasData || []);
      } catch (err) {
        console.error('Error cargando auditorías para estadísticas:', err);
        setAuditorias([]);
      }
      setCargandoAuditorias(false);
      
      console.log('✅ Profesionales y Auditorías cargados:', {
        usuariosCandidatos: usuarios.length,
        configuracionesOCI: configuraciones.length,
        auditorias: (auditoriasData || []).length
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
  // PROFESIONALES OCI CON ESTADÍSTICAS REALES
  // ══════════════════════════════════════════════════════════════════════════

  const profesionalesOCI: ProfesionalOCI[] = useMemo(() => {
    // Helpers para extracción de datos de equipo auditor (pueden ser strings o objetos)
    const extraerNombre = (val: any): string => {
      if (!val) return '';
      if (typeof val === 'string') return val.toLowerCase().trim();
      return (val.nombre || val.nombreCompleto || val.nombre_completo || '').toLowerCase().trim();
    };

    const extraerId = (val: any): string => {
      if (!val) return '';
      if (typeof val === 'string' || typeof val === 'number') return String(val).trim();
      return String(val.id || val.usuarioId || val.idTercero || val.personaId || '').trim();
    };

    return configuracionesOCI
      .filter(config => config.activo)
      .map(config => {
        let usuario: UsuarioSistema;
        const encontrado = usuariosControlInterno.find(
          u => u.id === String(config.idTercero) || u.idTercero === String(config.idTercero)
        );
        const nombreFinal = !esNombrePlaceholder(config.nombre)
          ? config.nombre!
          : (encontrado?.nombre || config.email || config.identificacion || `Usuario ${config.idTercero}`);

        if (config.nombre || encontrado) {
          usuario = {
            id: encontrado?.id || String(config.idTercero),
            idTercero: config.idTercero,
            nombre: nombreFinal,
            identificacion: config.identificacion || encontrado?.identificacion || '',
            email: config.email || encontrado?.email || '',
            cargo: config.rolOCI as string,
            area: 'OCI',
            activo: true,
            roles: config.roles || encontrado?.roles || []
          };
        } else {
          if (!encontrado) return null;
          usuario = encontrado;
        }

        // --- CÁLCULO DE ESTADÍSTICAS REALES ---
        const nombreBusqueda = usuario.nombre.toLowerCase().trim();
        const idTercero = String(config.idTercero).trim();
        const configId = String(config.id || '').trim();
        const identificacion = String(usuario.identificacion || '').trim();

        /**
         * Helper para verificar si un profesional coincide con los datos de una auditoría
         */
        const esMismoProfesional = (pId: string, pNombre: string): boolean => {
          // 1. Coincidencia por ID (UUID de tercero, ID de configuración o CC/Identificación)
          if (pId) {
            const idNorm = pId.trim();
            if (idNorm === idTercero || idNorm === configId || (identificacion && idNorm === identificacion)) {
              return true;
            }
          }

          // 2. Coincidencia por Nombre
          if (pNombre && nombreBusqueda) {
            const nombreNorm = pNombre.toLowerCase().trim();
            if (nombreNorm === nombreBusqueda) return true;
            
            // Coincidencias parciales significativas
            if (nombreNorm.includes(nombreBusqueda) || nombreBusqueda.includes(nombreNorm)) {
              return true;
            }

            // Coincidencia por tokens (ej: "Mario Bernal" coincide con "Mario Oswaldo Bernal Rodríguez")
            const tokensBusqueda = nombreBusqueda.split(/\s+/).filter(t => t.length > 2);
            const tokensNombre = nombreNorm.split(/\s+/).filter(t => t.length > 2);
            const comunes = tokensBusqueda.filter(t => tokensNombre.includes(t));
            
            // Si coinciden al menos 2 palabras significativas, lo consideramos el mismo profesional
            if (comunes.length >= 2) return true;
          }

          return false;
        };

        // Auditorías donde es líder
        const comoLider = auditorias.filter(a => {
          const liderNombre = extraerNombre(a.auditorLider);
          const liderId = extraerId(a.auditorLiderId || a.auditorLider);
          
          return esMismoProfesional(liderId, liderNombre);
        });

        // Auditorías donde está en el equipo (sin contar doble si es líder)
        const comoEquipo = auditorias.filter(a => {
          // Si ya es líder, no lo sumamos como equipo para no duplicar carga
          if (comoLider.some(l => l.id === a.id)) return false;
          
          const equipo = a.equipo || a.equipoAuditor || [];
          const equipoIds = a.equipoAuditorIds || [];
          
          // Verificar en nombres del equipo
          const matchNombre = equipo.some((e: any) => esMismoProfesional(extraerId(e), extraerNombre(e)));
          // Verificar en IDs del equipo (respaldo)
          const matchId = equipoIds.some((id: any) => esMismoProfesional(String(id), ''));
          
          return matchNombre || matchId;
        });

        // Auditorías donde es supervisor (Rol típico del Jefe OCI)
        const comoSupervisor = auditorias.filter(a => {
          if (comoLider.some(l => l.id === a.id) || comoEquipo.some(e => e.id === a.id)) return false;
          
          const supervisorNombre = a.supervisorAsignado || '';
          const supervisorId = String(a.supervisorAsignadoId || '').trim();
          
          return esMismoProfesional(supervisorId, supervisorNombre);
        });

        const auditoriasTotales = comoLider.length + comoEquipo.length + comoSupervisor.length;
        
        // Calcular horas asignadas sumando las horas de cada auditoría
        const horasAsignadas = [...comoLider, ...comoEquipo, ...comoSupervisor].reduce((total, a) => {
          // Si la auditoría tiene horas estimadas, usarlas; de lo contrario usar un promedio de 40h
          const horas = a.horasEstimadas || 40;
          return total + horas;
        }, 0);

        // ✅ Normalización anual (para coincidir con UniversoAuditableUnificado)
        const MESES_VIGENCIA = 12;
        const capacidadMensual = config.capacidadMaximaAuditorias || 4;
        const capacidadAnual = capacidadMensual * MESES_VIGENCIA;
        const horasMensualesDisponibles = config.horasMensualesDisponibles || 150;
        const horasAnualesDisponibles = horasMensualesDisponibles * MESES_VIGENCIA;
        
        // 1. Porcentaje por cantidad de auditorías
        const porcentajePorAuditorias = capacidadAnual > 0 
          ? Math.round((auditoriasTotales / capacidadAnual) * 100) 
          : 0;

        // 2. Porcentaje por carga horaria
        const porcentajePorHoras = horasAnualesDisponibles > 0 
          ? Math.round((horasAsignadas / horasAnualesDisponibles) * 100) 
          : 0;
        
        // El porcentaje de carga real es el mayor de los dos (mismo criterio que TabProfesionales)
        const porcentajeCarga = Math.max(porcentajePorAuditorias, porcentajePorHoras);

        return {
          usuario,
          configuracion: config,
          estadisticas: {
            auditoriasTotales,
            auditoriasComoLider: comoLider.length,
            auditoriasComoEquipo: comoEquipo.length,
            auditoriasComoSupervisor: comoSupervisor.length,
            cargaPonderada: (porcentajeCarga / 100) * capacidadMensual, // Carga en unidades de auditoría (ponderada por horas)
            porcentajeCarga: Math.min(porcentajeCarga, 100),
            horasAsignadas
          }
        };
      })
      .filter((p): p is ProfesionalOCI => p !== null);
  }, [configuracionesOCI, usuariosControlInterno, auditorias]);

  // Usuarios disponibles para agregar (tienen rol de Control Interno pero no están en OCI)
  const usuariosDisponiblesParaOCI = useMemo(() => {
    const idsTercerosConfiguradosActivos = new Set(
      configuracionesOCI.filter(c => c.activo).map(c => c.idTercero)
    );
    return usuariosControlInterno.filter(u => !idsTercerosConfiguradosActivos.has(u.idTercero) && u.activo);
  }, [usuariosControlInterno, configuracionesOCI]);

  // ══════════════════════════════════════════════════════════════════════════
  // CRUD CONFIGURACIONES OCI
  // ══════════════════════════════════════════════════════════════════════════

  const agregarProfesional = useCallback(async (config: ConfiguracionOCI) => {
    setSaving(true);
    try {
      const response = await configuracionesProfesionalesOCIApi.create({
        idTercero: config.idTercero,
        rolOcig: config.rolOCIG ?? config.rolOCI,
        especialidades: config.especialidades,
        capacidadMaximaAuditorias: config.capacidadMaximaAuditorias,
        horasMensualesDisponibles: config.horasMensualesDisponibles,
        puedeSerLider: config.puedeSerLider,
        observaciones: config.observaciones
      });

      if (!response.success) {
        throw new Error(response.error || 'Error al agregar profesional');
      }

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
        rolOcig: cambios.rolOCIG ?? cambios.rolOCI,
        especialidades: cambios.especialidades,
        capacidadMaximaAuditorias: cambios.capacidadMaximaAuditorias,
        horasMensualesDisponibles: cambios.horasMensualesDisponibles,
        puedeSerLider: cambios.puedeSerLider,
        activo: cambios.activo,
        observaciones: cambios.observaciones
      });

      if (!response.success) {
        throw new Error(response.error || 'Error al actualizar configuración');
      }

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

      const response = await configuracionesProfesionalesOCIApi.delete(configActual.id);
      if (!response.success) {
        throw new Error(response.error || 'Error al eliminar profesional');
      }
      
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
    configuracionesOCIG: configuracionesOCI,
    profesionalesOCIG: profesionalesOCI,
    usuariosDisponiblesParaOCIG: usuariosDisponiblesParaOCI,
    estadisticasGlobales,
    
    // Acciones
    cargarDatos,
    agregarProfesional,
    actualizarProfesional,
    eliminarProfesional,
    buscarUsuariosExternos,
    
    // Constantes (dinámicas desde BD)
    ESPECIALIDADES_DISPONIBLES: especialidadesNames,
    especialidadesConDescripcion: especialidadesOCIG,
    ROLES_OCI: rolesOCIGNames,
    ROLES_OCIG: rolesOCIGNames,
    rolesOCIGConDescripcion: rolesOCIG,
  };
}
