/**
 * ============================================
 * FORMULARIO: NUEVA AUDITORÍA - RF003
 * ============================================
 * 
 * Formulario completo para crear auditorías con todos los campos
 * necesarios según estándares de Control Interno ESAP
 * 
 * CAMPOS INCLUIDOS:
 * - Información General (código, nombre, tipo)
 * - Objetivo y Alcance
 * - Área Auditable y Proceso
 * - Fechas y Duración
 * - Equipo Auditor (líder + equipo)
 * - Prioridad y Riesgo
 * - Recursos y Presupuesto
 * - Metodología y Normas
 * 
 * ÚLTIMA ACTUALIZACIÓN: 23 Diciembre 2025
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ClipboardList, Calendar, Users, Target, AlertTriangle,
  DollarSign, FileText, Check, X, Save, Send, Info, Building2,
  MapPin, Clock, ChevronRight, ChevronLeft, BookOpen, Shield,
  TrendingUp, Layers, User, Plus
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { toast } from 'sonner';
import { TERRITORIALES_ESAP } from '../../../data/territoriales-cetap-completo';

// ============ TIPOS ============

type TipoAuditoria = 'Financiera' | 'Operacional' | 'Cumplimiento' | 'TI' | 'Gestión' | 'Especial';
type PrioridadAuditoria = 'Crítica' | 'Alta' | 'Media' | 'Baja';
type TipoRecurso = 'Interno' | 'Externo' | 'Mixto';
type EstadoAuditoria = 'Planificada' | 'En Ejecución' | 'Finalizada' | 'Suspendida';

interface MiembroEquipo {
  id: string;
  nombre: string;
  cargo: string;
  rol: 'Líder' | 'Auditor' | 'Especialista';
  horasAsignadas: number;
  iniciales: string;
}

interface Auditoria {
  // Identificación
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoAuditoria;
  
  // Objetivo y Alcance
  objetivo: string;
  alcance: string;
  procesosIncluidos: string[];
  
  // Ubicación
  areaAuditable: {
    id: string;
    nombre: string;
    tipo: 'Sede' | 'Territorial';
    responsable: string;
  };
  
  // Fechas
  fechaInicio: string;
  fechaFin: string;
  duracionDias: number;
  
  // Equipo
  liderAuditor: MiembroEquipo;
  equipoAuditor: MiembroEquipo[];
  
  // Riesgo y Prioridad
  nivelRiesgo: 'Crítico' | 'Alto' | 'Medio' | 'Bajo';
  prioridad: PrioridadAuditoria;
  justificacionPrioridad: string;
  
  // Recursos
  tipoRecurso: TipoRecurso;
  presupuestoEstimado: number;
  horasTotales: number;
  
  // Metodología
  normativaAplicable: string[];
  metodologia: string;
  herramientasUtilizar: string[];
  
  // Estado
  estado: EstadoAuditoria;
  añoPlan: number;
  
  // Metadata
  fechaCreacion: string;
  creadoPor: string;
}

// ============ DATOS MOCK ============

const USUARIOS_AUDITORES = [
  { id: 'usr-001', nombre: 'Fernando Ávila García', cargo: 'Jefe OCI', iniciales: 'FA' },
  { id: 'usr-002', nombre: 'Catalina Rubio Silva', cargo: 'Auditor Líder', iniciales: 'CR' },
  { id: 'usr-003', nombre: 'Lucila Villamil Torres', cargo: 'Auditor Líder', iniciales: 'LV' },
  { id: 'usr-004', nombre: 'William Alonso Pérez', cargo: 'Auditor', iniciales: 'WA' },
  { id: 'usr-005', nombre: 'Alexandra Gómez López', cargo: 'Auditor', iniciales: 'AG' },
  { id: 'usr-006', nombre: 'Natalia Cañón Mora', cargo: 'Auditor', iniciales: 'NC' },
  { id: 'usr-007', nombre: 'Jorge Morales Ruiz', cargo: 'Especialista TI', iniciales: 'JM' },
  { id: 'usr-008', nombre: 'Diana Parra Vega', cargo: 'Especialista Financiero', iniciales: 'DP' }
];

const TIPOS_AUDITORIA: TipoAuditoria[] = [
  'Financiera',
  'Operacional',
  'Cumplimiento',
  'TI',
  'Gestión',
  'Especial'
];

const NORMATIVAS = [
  'Ley 87 de 1993',
  'Decreto 648 de 2017',
  'NTCGP 1000:2009',
  'MECI 2014',
  'Ley 1712 de 2014 (Transparencia)',
  'NIA (Normas Internacionales de Auditoría)',
  'ISO 9001:2015',
  'ISO 27001:2013',
  'Otra normativa específica'
];

const HERRAMIENTAS = [
  'Entrevistas',
  'Revisión Documental',
  'Observación Directa',
  'Muestreo Estadístico',
  'Análisis de Datos',
  'Cuestionarios de Control',
  'Listas de Verificación',
  'Software Especializado',
  'Pruebas Sustantivas'
];

const AREAS_AUDITABLES_MOCK = [
  {
    id: 'area-001',
    nombre: 'Gestión Financiera',
    tipo: 'Sede' as const,
    responsable: 'Director Administrativo y Financiero',
    procesos: ['Presupuesto', 'Tesorería', 'Contabilidad', 'Gestión de Cartera']
  },
  {
    id: 'area-002',
    nombre: 'Gestión Administrativa',
    tipo: 'Sede' as const,
    responsable: 'Subdirector Administrativo',
    procesos: ['Servicios Generales', 'Correspondencia', 'Archivo', 'Infraestructura']
  },
  {
    id: 'area-003',
    nombre: 'Adquisición de Bienes y Servicios',
    tipo: 'Sede' as const,
    responsable: 'Jefe de Contratación',
    procesos: ['Licitaciones', 'Selección Abreviada', 'Mínima Cuantía', 'Contratación Directa']
  },
  {
    id: 'area-004',
    nombre: 'Gestión de Talento Humano',
    tipo: 'Sede' as const,
    responsable: 'Jefe de Talento Humano',
    procesos: ['Nómina', 'Selección', 'Capacitación', 'Evaluación de Desempeño']
  },
  {
    id: 'area-005',
    nombre: 'Transformación Digital',
    tipo: 'Sede' as const,
    responsable: 'Director de TI',
    procesos: ['Infraestructura TI', 'Desarrollo de Software', 'Seguridad', 'Soporte']
  }
];

// Agregar territoriales
TERRITORIALES_ESAP.forEach((territorial, idx) => {
  AREAS_AUDITABLES_MOCK.push({
    id: `terr-${idx + 1}`,
    nombre: territorial.nombre,
    tipo: 'Territorial',
    responsable: `Director ${territorial.nombreCorto}`,
    procesos: ['Formación', 'Proyectos', 'Administración', 'CETAP']
  });
});

// ============ COMPONENTE PRINCIPAL ============

interface FormularioNuevaAuditoriaProps {
  onVolver?: () => void;
  onClose?: () => void;
  onGuardar?: (auditoria: Auditoria) => void | Promise<void>;
  auditoriaExistente?: Auditoria;
  loading?: boolean;
}

export function FormularioNuevaAuditoria({ onVolver, onClose, onGuardar, auditoriaExistente, loading: externalLoading }: FormularioNuevaAuditoriaProps) {
  const [paso, setPaso] = useState(1);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  
  const isLoading = externalLoading || guardando;

  // Estado para auditores cargados del backend
  const [auditoresBackend, setAuditoresBackend] = useState<typeof USUARIOS_AUDITORES>([]);
  const [cargandoAuditores, setCargandoAuditores] = useState(false);
  
  // PASO 1: Información General
  const [codigo, setCodigo] = useState(auditoriaExistente?.codigo || '');
  const [nombre, setNombre] = useState(auditoriaExistente?.nombre || '');
  const [tipo, setTipo] = useState<TipoAuditoria>(auditoriaExistente?.tipo || 'Operacional');
  const [añoPlan, setAñoPlan] = useState(auditoriaExistente?.añoPlan || new Date().getFullYear() + 1);
  
  // PASO 2: Objetivo y Alcance
  const [objetivo, setObjetivo] = useState(auditoriaExistente?.objetivo || '');
  const [alcance, setAlcance] = useState(auditoriaExistente?.alcance || '');
  const [procesosSeleccionados, setProcesosSeleccionados] = useState<string[]>(auditoriaExistente?.procesosIncluidos || []);
  
  // PASO 3: Área Auditable
  const [areaSeleccionada, setAreaSeleccionada] = useState<typeof AREAS_AUDITABLES_MOCK[0] | null>(
    auditoriaExistente ? AREAS_AUDITABLES_MOCK.find(a => a.id === auditoriaExistente.areaAuditable.id) || null : null
  );
  
  // PASO 4: Fechas
  const [fechaInicio, setFechaInicio] = useState(auditoriaExistente?.fechaInicio || '');
  const [fechaFin, setFechaFin] = useState(auditoriaExistente?.fechaFin || '');
  const [duracionDias, setDuracionDias] = useState(auditoriaExistente?.duracionDias || 0);
  
  // PASO 5: Equipo Auditor
  const [lider, setLider] = useState<MiembroEquipo | null>(auditoriaExistente?.liderAuditor || null);
  const [equipo, setEquipo] = useState<MiembroEquipo[]>(auditoriaExistente?.equipoAuditor || []);
  
  // PASO 6: Riesgo y Prioridad
  const [nivelRiesgo, setNivelRiesgo] = useState<'Crítico' | 'Alto' | 'Medio' | 'Bajo'>(
    auditoriaExistente?.nivelRiesgo || 'Medio'
  );
  const [prioridad, setPrioridad] = useState<PrioridadAuditoria>(auditoriaExistente?.prioridad || 'Media');
  const [justificacionPrioridad, setJustificacionPrioridad] = useState(auditoriaExistente?.justificacionPrioridad || '');
  
  // PASO 7: Recursos
  const [tipoRecurso, setTipoRecurso] = useState<TipoRecurso>(auditoriaExistente?.tipoRecurso || 'Interno');
  const [presupuesto, setPresupuesto] = useState(auditoriaExistente?.presupuestoEstimado || 0);
  const [horasTotales, setHorasTotales] = useState(auditoriaExistente?.horasTotales || 0);
  
  // PASO 8: Metodología
  const [normativasSeleccionadas, setNormativasSeleccionadas] = useState<string[]>(
    auditoriaExistente?.normativaAplicable || []
  );
  const [metodologia, setMetodologia] = useState(auditoriaExistente?.metodologia || '');
  const [herramientasSeleccionadas, setHerramientasSeleccionadas] = useState<string[]>(
    auditoriaExistente?.herramientasUtilizar || []
  );

  const TOTAL_PASOS = 8;

  // Auto-calcular duración cuando cambian las fechas
  useEffect(() => {
    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      const diferencia = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
      setDuracionDias(Math.max(1, diferencia));
    }
  }, [fechaInicio, fechaFin]);

  // Auto-calcular horas totales del equipo
  useEffect(() => {
    const horasEquipo = equipo.reduce((sum, m) => sum + m.horasAsignadas, 0);
    const horasLider = lider?.horasAsignadas || 0;
    setHorasTotales(horasLider + horasEquipo);
  }, [lider, equipo]);

  // Generar código automático
  useEffect(() => {
    if (!codigo && tipo && añoPlan) {
      const prefijo = tipo.substring(0, 3).toUpperCase();
      const año = añoPlan.toString().substring(2);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      setCodigo(`AUD-${prefijo}-${año}-${random}`);
    }
  }, [tipo, añoPlan]);

  // Cargar auditores desde el backend
  useEffect(() => {
    const cargarAuditores = async () => {
      setCargandoAuditores(true);
      try {
        const { auditoriasApi } = await import('./services/api');
        const response = await auditoriasApi.getPersonasDisponibles();
        
        if (response.success && response.data) {
          const personas = response.data;
          // Mapear al formato esperado por el formulario
          const auditores = personas.map((persona: any) => {
            const nombre = persona.nombre || persona.nom_largo || 'Sin nombre';
            const partes = nombre.split(' ');
            const iniciales = partes.length >= 2 
              ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
              : nombre.substring(0, 2).toUpperCase();
            
            return {
              id: String(persona.idPersona || persona.id_tercero || persona.id),
              nombre: nombre,
              cargo: persona.cargo || 'Auditor',
              iniciales: iniciales
            };
          });
          
          setAuditoresBackend(auditores);
          console.log('[FormularioNuevaAuditoria] Auditores cargados:', auditores.length);
        } else {
          console.warn('[FormularioNuevaAuditoria] Error al cargar auditores, usando mock');
          setAuditoresBackend(USUARIOS_AUDITORES);
        }
      } catch (error) {
        console.error('[FormularioNuevaAuditoria] Error al cargar auditores:', error);
        // Fallback a datos mock si falla
        setAuditoresBackend(USUARIOS_AUDITORES);
      } finally {
        setCargandoAuditores(false);
      }
    };
    
    cargarAuditores();
  }, []);

  // Lista de auditores a usar (backend si están disponibles, sino mock)
  const usuariosAuditores = auditoresBackend.length > 0 ? auditoresBackend : USUARIOS_AUDITORES;

  // ============ FUNCIÓN DE CIERRE ============

  const handleCerrar = () => {
    if (onClose) {
      onClose();
    } else if (onVolver) {
      onVolver();
    }
  };

  // ============ VALIDACIONES ============

  const validarPaso1 = () => {
    const nuevosErrores: Record<string, string> = {};
    
    if (!codigo.trim()) nuevosErrores.codigo = 'El código es obligatorio';
    if (!nombre.trim()) nuevosErrores.nombre = 'El nombre es obligatorio';
    if (nombre.length < 10) nuevosErrores.nombre = 'El nombre debe tener al menos 10 caracteres';
    if (!tipo) nuevosErrores.tipo = 'Selecciona el tipo de auditoría';
    
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const validarPaso2 = () => {
    const nuevosErrores: Record<string, string> = {};
    
    if (!objetivo.trim()) nuevosErrores.objetivo = 'El objetivo es obligatorio';
    if (objetivo.length < 20) nuevosErrores.objetivo = 'El objetivo debe ser más descriptivo (mín. 20 caracteres)';
    if (!alcance.trim()) nuevosErrores.alcance = 'El alcance es obligatorio';
    if (alcance.length < 20) nuevosErrores.alcance = 'El alcance debe ser más descriptivo (mín. 20 caracteres)';
    if (procesosSeleccionados.length === 0) nuevosErrores.procesos = 'Selecciona al menos un proceso';
    
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const validarPaso3 = () => {
    const nuevosErrores: Record<string, string> = {};
    
    if (!areaSeleccionada) nuevosErrores.area = 'Debes seleccionar un área auditable';
    
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const validarPaso4 = () => {
    const nuevosErrores: Record<string, string> = {};
    
    if (!fechaInicio) nuevosErrores.fechaInicio = 'La fecha de inicio es obligatoria';
    if (!fechaFin) nuevosErrores.fechaFin = 'La fecha de fin es obligatoria';
    
    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      
      if (fin <= inicio) {
        nuevosErrores.fechas = 'La fecha de fin debe ser posterior a la de inicio';
      }
      
      if (duracionDias < 1) {
        nuevosErrores.duracion = 'La duración debe ser de al menos 1 día';
      }
      
      if (duracionDias > 365) {
        nuevosErrores.duracion = 'La duración no puede exceder 365 días';
      }
    }
    
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const validarPaso5 = () => {
    const nuevosErrores: Record<string, string> = {};
    
    if (!lider) nuevosErrores.lider = 'Debes asignar un líder auditor';
    if (lider && lider.horasAsignadas < 8) nuevosErrores.horasLider = 'El líder debe tener al menos 8 horas asignadas';
    if (equipo.length === 0) nuevosErrores.equipo = 'Debes agregar al menos un auditor al equipo';
    
    // Validar que no haya duplicados
    const idsUnicos = new Set([lider?.id, ...equipo.map(m => m.id)]);
    if (idsUnicos.size !== (equipo.length + (lider ? 1 : 0))) {
      nuevosErrores.equipo = 'No puedes asignar la misma persona múltiples veces';
    }
    
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const validarPaso6 = () => {
    const nuevosErrores: Record<string, string> = {};
    
    if (!nivelRiesgo) nuevosErrores.riesgo = 'Selecciona el nivel de riesgo';
    if (!prioridad) nuevosErrores.prioridad = 'Selecciona la prioridad';
    if ((prioridad === 'Crítica' || prioridad === 'Alta') && !justificacionPrioridad.trim()) {
      nuevosErrores.justificacion = 'Debes justificar las prioridades alta o crítica';
    }
    
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const validarPaso7 = () => {
    const nuevosErrores: Record<string, string> = {};
    
    if (!tipoRecurso) nuevosErrores.tipoRecurso = 'Selecciona el tipo de recurso';
    if (presupuesto < 0) nuevosErrores.presupuesto = 'El presupuesto no puede ser negativo';
    if (horasTotales < 8) nuevosErrores.horas = 'El total de horas debe ser al menos 8';
    
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const validarPaso8 = () => {
    const nuevosErrores: Record<string, string> = {};
    
    if (normativasSeleccionadas.length === 0) {
      nuevosErrores.normativas = 'Selecciona al menos una normativa aplicable';
    }
    if (!metodologia.trim()) {
      nuevosErrores.metodologia = 'Describe la metodología a utilizar';
    }
    if (metodologia.length < 20) {
      nuevosErrores.metodologia = 'La metodología debe ser más descriptiva (mín. 20 caracteres)';
    }
    if (herramientasSeleccionadas.length === 0) {
      nuevosErrores.herramientas = 'Selecciona al menos una herramienta';
    }
    
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  // ============ NAVEGACIÓN ============

  const handleSiguiente = () => {
    let valido = false;
    
    switch (paso) {
      case 1: valido = validarPaso1(); break;
      case 2: valido = validarPaso2(); break;
      case 3: valido = validarPaso3(); break;
      case 4: valido = validarPaso4(); break;
      case 5: valido = validarPaso5(); break;
      case 6: valido = validarPaso6(); break;
      case 7: valido = validarPaso7(); break;
      case 8: valido = validarPaso8(); break;
      default: valido = true;
    }
    
    if (!valido) {
      toast.error('Datos incompletos', {
        description: 'Por favor completa todos los campos obligatorios'
      });
      return;
    }
    
    if (paso < TOTAL_PASOS) {
      setPaso(prev => prev + 1);
      setErrores({});
    }
  };

  const handleAnterior = () => {
    if (paso > 1) {
      setPaso(prev => prev - 1);
      setErrores({});
    }
  };

  // ============ ACCIONES ============

  const handleAgregarMiembro = (usuario: { id: string; nombre: string; cargo: string; iniciales: string }, rol: 'Líder' | 'Auditor' | 'Especialista') => {
    const nuevoMiembro: MiembroEquipo = {
      id: usuario.id,
      nombre: usuario.nombre,
      cargo: usuario.cargo,
      rol,
      horasAsignadas: rol === 'Líder' ? 40 : 20,
      iniciales: usuario.iniciales
    };

    if (rol === 'Líder') {
      setLider(nuevoMiembro);
    } else {
      // Verificar que no esté ya en el equipo o sea el líder
      if (lider?.id === usuario.id || equipo.some(m => m.id === usuario.id)) {
        toast.error('Persona ya asignada', {
          description: 'Esta persona ya está asignada en el equipo'
        });
        return;
      }
      setEquipo(prev => [...prev, nuevoMiembro]);
    }
  };

  const handleEliminarMiembro = (id: string) => {
    setEquipo(prev => prev.filter(m => m.id !== id));
  };

  const handleActualizarHoras = (id: string, horas: number) => {
    if (lider?.id === id) {
      setLider({ ...lider, horasAsignadas: horas });
    } else {
      setEquipo(prev => prev.map(m => m.id === id ? { ...m, horasAsignadas: horas } : m));
    }
  };

  const handleToggleProceso = (proceso: string) => {
    setProcesosSeleccionados(prev =>
      prev.includes(proceso) ? prev.filter(p => p !== proceso) : [...prev, proceso]
    );
  };

  const handleToggleNormativa = (normativa: string) => {
    setNormativasSeleccionadas(prev =>
      prev.includes(normativa) ? prev.filter(n => n !== normativa) : [...prev, normativa]
    );
  };

  const handleToggleHerramienta = (herramienta: string) => {
    setHerramientasSeleccionadas(prev =>
      prev.includes(herramienta) ? prev.filter(h => h !== herramienta) : [...prev, herramienta]
    );
  };

  const handleGuardar = async () => {
    if (!validarPaso8()) {
      toast.error('Datos incompletos', {
        description: 'Por favor completa todos los campos obligatorios'
      });
      return;
    }

    const nuevaAuditoria: Auditoria = {
      id: auditoriaExistente?.id || `aud-${Date.now()}`,
      codigo,
      nombre,
      tipo,
      objetivo,
      alcance,
      procesosIncluidos: procesosSeleccionados,
      areaAuditable: {
        id: areaSeleccionada!.id,
        nombre: areaSeleccionada!.nombre,
        tipo: areaSeleccionada!.tipo,
        responsable: areaSeleccionada!.responsable
      },
      fechaInicio,
      fechaFin,
      duracionDias,
      liderAuditor: lider!,
      equipoAuditor: equipo,
      nivelRiesgo,
      prioridad,
      justificacionPrioridad,
      tipoRecurso,
      presupuestoEstimado: presupuesto,
      horasTotales,
      normativaAplicable: normativasSeleccionadas,
      metodologia,
      herramientasUtilizar: herramientasSeleccionadas,
      estado: 'Planificada',
      añoPlan,
      fechaCreacion: new Date().toLocaleDateString(),
      creadoPor: 'Usuario Actual'
    };

    if (onGuardar) {
      setGuardando(true);
      try {
        await onGuardar(nuevaAuditoria);
        // El toast y cierre se manejan en el componente padre
      } catch (error) {
        // El error se maneja en el componente padre
        console.error('[FormularioNuevaAuditoria] Error en onGuardar:', error);
      } finally {
        setGuardando(false);
      }
    } else {
      toast.success('¡Auditoría creada exitosamente!', {
        description: `${codigo} - ${nombre}`
      });
      handleCerrar();
    }
  };

  const progreso = (paso / TOTAL_PASOS) * 100;

  return (
    <div className="bg-white rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
      {/* HEADER COMPACTO */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl text-white">
                {auditoriaExistente ? 'Editar Auditoría' : 'Nueva Auditoría'}
              </h2>
              <p className="text-sm text-blue-100 mt-0.5">
                Paso {paso} de {TOTAL_PASOS} - {
                  paso === 1 ? 'Información General' :
                  paso === 2 ? 'Objetivo y Alcance' :
                  paso === 3 ? 'Área Auditable' :
                  paso === 4 ? 'Programación de Fechas' :
                  paso === 5 ? 'Equipo Auditor' :
                  paso === 6 ? 'Riesgo y Prioridad' :
                  paso === 7 ? 'Recursos y Presupuesto' :
                  'Metodología y Normativa'
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Barra de progreso con indicadores */}
        <div className="relative">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full shadow-lg"
              initial={{ width: 0 }}
              animate={{ width: `${progreso}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          
          {/* Indicadores de pasos */}
          <div className="flex justify-between mt-3">
            {Array.from({ length: TOTAL_PASOS }, (_, i) => i + 1).map((p) => (
              <div
                  key={p}
                  className={`flex flex-col items-center gap-1 ${
                    paso === p ? 'opacity-100' : paso > p ? 'opacity-60' : 'opacity-30'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all shadow-lg ${
                      paso === p
                        ? 'bg-white text-blue-700 scale-110 ring-2 ring-white/50'
                        : paso > p
                        ? 'bg-green-500 text-white'
                        : 'bg-white/20 text-white/60'
                    }`}
                  >
                    {paso > p ? <Check className="w-4 h-4" /> : p}
                  </div>
                  <span className="text-[10px] text-white/80 hidden sm:block text-center max-w-[60px]">
                    {p === 1 && 'General'}
                    {p === 2 && 'Objetivo'}
                    {p === 3 && 'Área'}
                    {p === 4 && 'Fechas'}
                    {p === 5 && 'Equipo'}
                    {p === 6 && 'Riesgo'}
                    {p === 7 && 'Recursos'}
                    {p === 8 && 'Metodología'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      {/* CONTENIDO SCROLLEABLE */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <motion.div
            key={paso}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="p-6 shadow-lg border-0">
            {/* PASO 1: INFORMACIÓN GENERAL */}
            {paso === 1 && (
              <div className="space-y-6">
                <div className="text-center pb-6 border-b">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: '#003DA510' }}>
                    <ClipboardList className="w-8 h-8" style={{ color: '#003DA5' }} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Información General
                  </h2>
                  <p className="text-sm text-gray-600">
                    Define los datos básicos de identificación de la auditoría
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Código de Auditoría *
                    </label>
                    <Input
                      value={codigo}
                      onChange={(e) => {
                        setCodigo(e.target.value);
                        setErrores(prev => {const n = {...prev}; delete n.codigo; return n;});
                      }}
                      placeholder="AUD-OPE-25-001"
                      className={errores.codigo ? 'border-red-500' : ''}
                    />
                    {errores.codigo && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {errores.codigo}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Código único autogenerado. Puedes modificarlo si es necesario.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Año del Plan *
                    </label>
                    <Input
                      type="number"
                      value={añoPlan}
                      onChange={(e) => setAñoPlan(parseInt(e.target.value))}
                      min={new Date().getFullYear()}
                      max={new Date().getFullYear() + 5}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Año en el que se ejecutará esta auditoría
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Nombre de la Auditoría *
                  </label>
                  <Input
                    value={nombre}
                    onChange={(e) => {
                      setNombre(e.target.value);
                      setErrores(prev => {const n = {...prev}; delete n.nombre; return n;});
                    }}
                    placeholder="Ej: Auditoría de Cumplimiento al Proceso de Contratación Territorial Antioquia"
                    className={errores.nombre ? 'border-red-500' : ''}
                  />
                  {errores.nombre && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {errores.nombre}
                    </p>
                  )}
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-gray-500">
                      Nombre descriptivo y específico de la auditoría
                    </p>
                    <p className="text-xs text-gray-500">
                      {nombre.length} caracteres
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Tipo de Auditoría *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {TIPOS_AUDITORIA.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setTipo(t);
                          setErrores(prev => {const n = {...prev}; delete n.tipo; return n;});
                        }}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          tipo === t
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-semibold text-sm text-gray-900">{t}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          {t === 'Financiera' && 'Revisión de estados financieros'}
                          {t === 'Operacional' && 'Eficiencia de procesos'}
                          {t === 'Cumplimiento' && 'Normativa y regulación'}
                          {t === 'TI' && 'Sistemas y tecnología'}
                          {t === 'Gestión' && 'Administración y dirección'}
                          {t === 'Especial' && 'Casos específicos'}
                        </p>
                      </button>
                    ))}
                  </div>
                  {errores.tipo && (
                    <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {errores.tipo}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* PASO 2: OBJETIVO Y ALCANCE */}
            {paso === 2 && (
              <div className="space-y-6">
                <div className="text-center pb-6 border-b">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-purple-100">
                    <Target className="w-8 h-8 text-purple-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Objetivo y Alcance
                  </h2>
                  <p className="text-sm text-gray-600">
                    Define qué se evaluará y hasta dónde llegará la auditoría
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Objetivo de la Auditoría *
                  </label>
                  <textarea
                    value={objetivo}
                    onChange={(e) => {
                      setObjetivo(e.target.value);
                      setErrores(prev => {const n = {...prev}; delete n.objetivo; return n;});
                    }}
                    placeholder="Ej: Evaluar el cumplimiento de los procedimientos de contratación establecidos en el manual de contratación de ESAP, verificando la correcta aplicación de la normativa vigente..."
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errores.objetivo ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errores.objetivo && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {errores.objetivo}
                    </p>
                  )}
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-gray-500">
                      Describe claramente qué se busca lograr con esta auditoría
                    </p>
                    <p className="text-xs text-gray-500">
                      {objetivo.length} caracteres
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Alcance de la Auditoría *
                  </label>
                  <textarea
                    value={alcance}
                    onChange={(e) => {
                      setAlcance(e.target.value);
                      setErrores(prev => {const n = {...prev}; delete n.alcance; return n;});
                    }}
                    placeholder="Ej: La auditoría cubrirá todos los procesos de contratación ejecutados entre enero y diciembre de 2024, incluyendo licitaciones, selección abreviada, mínima cuantía y contratación directa..."
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errores.alcance ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errores.alcance && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {errores.alcance}
                    </p>
                  )}
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-gray-500">
                      Define los límites temporales, geográficos y funcionales
                    </p>
                    <p className="text-xs text-gray-500">
                      {alcance.length} caracteres
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Procesos Específicos a Auditar *
                  </label>
                  <p className="text-xs text-gray-600 mb-3">
                    Selecciona los procesos específicos que serán evaluados
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['Presupuesto', 'Tesorería', 'Contabilidad', 'Contratación', 'Talento Humano', 
                      'Servicios Generales', 'TI e Innovación', 'Atención al Ciudadano', 'Formación',
                      'Proyectos Especiales', 'CETAP', 'Gestión Documental', 'Compras y Adquisiciones'].map((proceso) => (
                      <button
                        key={proceso}
                        type="button"
                        onClick={() => handleToggleProceso(proceso)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          procesosSeleccionados.includes(proceso)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {procesosSeleccionados.includes(proceso) && (
                          <Check className="w-3 h-3 inline mr-1" />
                        )}
                        {proceso}
                      </button>
                    ))}
                  </div>
                  {errores.procesos && (
                    <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {errores.procesos}
                    </p>
                  )}
                  {procesosSeleccionados.length > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs font-semibold text-blue-900 mb-1">
                        Procesos seleccionados: {procesosSeleccionados.length}
                      </p>
                      <p className="text-xs text-blue-700">
                        {procesosSeleccionados.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PASO 3: ÁREA AUDITABLE */}
            {paso === 3 && (
              <div className="space-y-6">
                <div className="text-center pb-6 border-b">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-green-100">
                    <Building2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Área Auditable
                  </h2>
                  <p className="text-sm text-gray-600">
                    Selecciona la unidad organizacional que será auditada
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-bold text-gray-700">
                      Seleccionar Área *
                    </label>
                    <Badge variant="outline">
                      {AREAS_AUDITABLES_MOCK.length} áreas disponibles
                    </Badge>
                  </div>

                  {errores.area && (
                    <div className="mb-3 p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-xs text-red-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {errores.area}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {/* Áreas Sede */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-purple-50 rounded-t-lg">
                        <Building2 className="w-4 h-4 text-purple-600" />
                        <h3 className="font-bold text-sm text-purple-900">
                          Procesos de Sede Central ({AREAS_AUDITABLES_MOCK.filter(a => a.tipo === 'Sede').length})
                        </h3>
                      </div>
                      <div className="space-y-1">
                        {AREAS_AUDITABLES_MOCK.filter(a => a.tipo === 'Sede').map((area) => (
                          <button
                            key={area.id}
                            type="button"
                            onClick={() => {
                              setAreaSeleccionada(area);
                              setErrores(prev => {const n = {...prev}; delete n.area; return n;});
                            }}
                            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                              areaSeleccionada?.id === area.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-semibold text-sm text-gray-900">{area.nombre}</p>
                                  {areaSeleccionada?.id === area.id && (
                                    <Check className="w-4 h-4 text-blue-600" />
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 mb-2">
                                  <User className="w-3 h-3 inline mr-1" />
                                  {area.responsable}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {area.procesos.map((p) => (
                                    <Badge key={p} variant="outline" className="text-[10px]">
                                      {p}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Territoriales */}
                    <div>
                      <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-green-50 rounded-t-lg">
                        <MapPin className="w-4 h-4 text-green-600" />
                        <h3 className="font-bold text-sm text-green-900">
                          Territoriales ({AREAS_AUDITABLES_MOCK.filter(a => a.tipo === 'Territorial').length})
                        </h3>
                      </div>
                      <div className="space-y-1">
                        {AREAS_AUDITABLES_MOCK.filter(a => a.tipo === 'Territorial').slice(0, 5).map((area) => (
                          <button
                            key={area.id}
                            type="button"
                            onClick={() => {
                              setAreaSeleccionada(area);
                              setErrores(prev => {const n = {...prev}; delete n.area; return n;});
                            }}
                            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                              areaSeleccionada?.id === area.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <MapPin className="w-3 h-3 text-green-600" />
                                  <p className="font-semibold text-sm text-gray-900">{area.nombre}</p>
                                  {areaSeleccionada?.id === area.id && (
                                    <Check className="w-4 h-4 text-blue-600" />
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 mb-2">
                                  <User className="w-3 h-3 inline mr-1" />
                                  {area.responsable}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {area.procesos.map((p) => (
                                    <Badge key={p} variant="outline" className="text-[10px]">
                                      {p}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {areaSeleccionada && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg border-2 border-green-200">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <Check className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-green-900 mb-1">
                            Área Seleccionada
                          </p>
                          <p className="text-sm text-green-700 font-semibold">
                            {areaSeleccionada.nombre}
                          </p>
                          <p className="text-xs text-green-600 mt-1">
                            Responsable: {areaSeleccionada.responsable}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PASO 4: FECHAS */}
            {paso === 4 && (
              <div className="space-y-6">
                <div className="text-center pb-6 border-b">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-orange-100">
                    <Calendar className="w-8 h-8 text-orange-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Programación de Fechas
                  </h2>
                  <p className="text-sm text-gray-600">
                    Define el periodo de ejecución de la auditoría
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Fecha de Inicio *
                    </label>
                    <Input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => {
                        setFechaInicio(e.target.value);
                        setErrores(prev => {const n = {...prev}; delete n.fechaInicio; return n;});
                      }}
                      min={`${añoPlan}-01-01`}
                      max={`${añoPlan}-12-31`}
                      className={errores.fechaInicio ? 'border-red-500' : ''}
                    />
                    {errores.fechaInicio && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {errores.fechaInicio}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Fecha de Finalización *
                    </label>
                    <Input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => {
                        setFechaFin(e.target.value);
                        setErrores(prev => {const n = {...prev}; delete n.fechaFin; return n;});
                      }}
                      min={fechaInicio || `${añoPlan}-01-01`}
                      max={`${añoPlan}-12-31`}
                      className={errores.fechaFin ? 'border-red-500' : ''}
                    />
                    {errores.fechaFin && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {errores.fechaFin}
                      </p>
                    )}
                  </div>
                </div>

                {errores.fechas && (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-xs text-red-700 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {errores.fechas}
                    </p>
                  </div>
                )}

                {errores.duracion && (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-xs text-red-700 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {errores.duracion}
                    </p>
                  </div>
                )}

                {duracionDias > 0 && !errores.duracion && (
                  <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-blue-900">
                          Duración Calculada
                        </p>
                        <p className="text-2xl font-black text-blue-600">
                          {duracionDias} {duracionDias === 1 ? 'día' : 'días'}
                        </p>
                        {duracionDias > 0 && (
                          <p className="text-xs text-blue-700 mt-1">
                            Aproximadamente {Math.ceil(duracionDias / 7)} {Math.ceil(duracionDias / 7) === 1 ? 'semana' : 'semanas'} de trabajo
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-gray-600">
                      <p className="font-semibold mb-1">Recomendaciones de programación:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Auditorías operacionales: 15-30 días</li>
                        <li>Auditorías de cumplimiento: 20-40 días</li>
                        <li>Auditorías financieras: 30-60 días</li>
                        <li>Auditorías TI: 20-45 días</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PASO 5: EQUIPO AUDITOR */}
            {paso === 5 && (
              <div className="space-y-6">
                <div className="text-center pb-6 border-b">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-indigo-100">
                    <Users className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Equipo Auditor
                  </h2>
                  <p className="text-sm text-gray-600">
                    Asigna el líder y los miembros del equipo auditor
                  </p>
                </div>

                {/* Líder Auditor */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-bold text-gray-700">
                      Líder Auditor *
                    </label>
                    {lider && (
                      <Badge className="bg-purple-100 text-purple-800">
                        Asignado
                      </Badge>
                    )}
                  </div>

                  {errores.lider && (
                    <div className="mb-3 p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-xs text-red-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {errores.lider}
                      </p>
                    </div>
                  )}

                  {lider ? (
                    <Card className="p-4 border-2 border-purple-300 bg-purple-50">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-purple-600 text-white font-bold">
                            {lider.iniciales}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-bold text-sm text-gray-900">{lider.nombre}</p>
                          <p className="text-xs text-gray-600">{lider.cargo}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Clock className="w-3 h-3 text-gray-500" />
                            <Input
                              type="number"
                              value={lider.horasAsignadas}
                              onChange={(e) => handleActualizarHoras(lider.id, parseInt(e.target.value) || 0)}
                              className="w-20 h-7 text-xs"
                              min={8}
                            />
                            <span className="text-xs text-gray-600">horas</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLider(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <p className="text-xs text-gray-600 mb-3">
                        Selecciona un Auditor Líder o Jefe OCI:
                      </p>
                      {cargandoAuditores && (
                        <div className="flex items-center justify-center py-4">
                          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                          <span className="ml-2 text-sm text-gray-500">Cargando auditores...</span>
                        </div>
                      )}
                      <div className="space-y-2">
                        {usuariosAuditores.filter(u => 
                          u.cargo.includes('Líder') || u.cargo.includes('Jefe') || u.cargo.includes('Auditor')
                        ).map((usuario) => (
                          <button
                            key={usuario.id}
                            type="button"
                            onClick={() => handleAgregarMiembro(usuario, 'Líder')}
                            className="w-full p-3 rounded-lg border border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all text-left"
                            disabled={equipo.some(m => m.id === usuario.id)}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-purple-100 text-purple-700 text-xs font-bold">
                                  {usuario.iniciales}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold text-sm text-gray-900">{usuario.nombre}</p>
                                <p className="text-xs text-gray-600">{usuario.cargo}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Equipo */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-bold text-gray-700">
                      Equipo Auditor *
                    </label>
                    <Badge variant="outline">
                      {equipo.length} {equipo.length === 1 ? 'miembro' : 'miembros'}
                    </Badge>
                  </div>

                  {errores.equipo && (
                    <div className="mb-3 p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-xs text-red-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {errores.equipo}
                      </p>
                    </div>
                  )}

                  {/* Miembros asignados */}
                  {equipo.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {equipo.map((miembro) => (
                        <Card key={miembro.id} className="p-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-xs">
                                {miembro.iniciales}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-semibold text-sm text-gray-900">{miembro.nombre}</p>
                              <p className="text-xs text-gray-600">{miembro.cargo} • {miembro.rol}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Clock className="w-3 h-3 text-gray-500" />
                                <Input
                                  type="number"
                                  value={miembro.horasAsignadas}
                                  onChange={(e) => handleActualizarHoras(miembro.id, parseInt(e.target.value) || 0)}
                                  className="w-20 h-6 text-xs"
                                  min={1}
                                />
                                <span className="text-xs text-gray-600">horas</span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEliminarMiembro(miembro.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Agregar miembros */}
                  <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-xs text-gray-600 mb-3 font-semibold">
                      Agregar auditores o especialistas al equipo:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {usuariosAuditores.filter(u => 
                        !u.cargo.includes('Jefe') && 
                        lider?.id !== u.id &&
                        !equipo.some(m => m.id === u.id)
                      ).map((usuario) => (
                        <button
                          key={usuario.id}
                          type="button"
                          onClick={() => handleAgregarMiembro(
                            usuario, 
                            usuario.cargo.includes('Especialista') ? 'Especialista' : 'Auditor'
                          )}
                          className="p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-gray-100 text-gray-700 text-xs font-bold">
                                {usuario.iniciales}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-xs text-gray-900 truncate">
                                {usuario.nombre}
                              </p>
                              <p className="text-[10px] text-gray-600 truncate">{usuario.cargo}</p>
                            </div>
                            <Plus className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Resumen de horas */}
                  {horasTotales > 0 && (
                    <Card className="p-4 bg-blue-50 border-2 border-blue-200 mt-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <Clock className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-blue-900">
                            Total Horas Asignadas
                          </p>
                          <p className="text-2xl font-black text-blue-600">
                            {horasTotales} horas
                          </p>
                          <p className="text-xs text-blue-700 mt-1">
                            {lider && `Líder: ${lider.horasAsignadas}h`}
                            {lider && equipo.length > 0 && ' • '}
                            {equipo.length > 0 && `Equipo: ${equipo.reduce((sum, m) => sum + m.horasAsignadas, 0)}h`}
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* PASO 6: RIESGO Y PRIORIDAD */}
            {paso === 6 && (
              <div className="space-y-6">
                <div className="text-center pb-6 border-b">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-red-100">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Riesgo y Prioridad
                  </h2>
                  <p className="text-sm text-gray-600">
                    Define el nivel de riesgo del área y la prioridad de la auditoría
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      Nivel de Riesgo del Área *
                    </label>
                    <div className="space-y-2">
                      {(['Crítico', 'Alto', 'Medio', 'Bajo'] as const).map((nivel) => (
                        <button
                          key={nivel}
                          type="button"
                          onClick={() => setNivelRiesgo(nivel)}
                          className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                            nivelRiesgo === nivel
                              ? nivel === 'Crítico' ? 'border-red-500 bg-red-50' :
                                nivel === 'Alto' ? 'border-orange-500 bg-orange-50' :
                                nivel === 'Medio' ? 'border-yellow-500 bg-yellow-50' :
                                'border-green-500 bg-green-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-sm text-gray-900">{nivel}</p>
                              <p className="text-xs text-gray-600 mt-1">
                                {nivel === 'Crítico' && 'Requiere atención inmediata'}
                                {nivel === 'Alto' && 'Prioridad alta de revisión'}
                                {nivel === 'Medio' && 'Revisión programada'}
                                {nivel === 'Bajo' && 'Revisión según capacidad'}
                              </p>
                            </div>
                            {nivelRiesgo === nivel && (
                              <Check className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      Prioridad de la Auditoría *
                    </label>
                    <div className="space-y-2">
                      {(['Crítica', 'Alta', 'Media', 'Baja'] as PrioridadAuditoria[]).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPrioridad(p)}
                          className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                            prioridad === p
                              ? p === 'Crítica' ? 'border-red-500 bg-red-50' :
                                p === 'Alta' ? 'border-orange-500 bg-orange-50' :
                                p === 'Media' ? 'border-blue-500 bg-blue-50' :
                                'border-gray-500 bg-gray-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-sm text-gray-900">{p}</p>
                              <p className="text-xs text-gray-600 mt-1">
                                {p === 'Crítica' && 'Ejecución en Q1'}
                                {p === 'Alta' && 'Ejecución en primer semestre'}
                                {p === 'Media' && 'Ejecución programada anual'}
                                {p === 'Baja' && 'Según disponibilidad'}
                              </p>
                            </div>
                            {prioridad === p && (
                              <Check className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {(prioridad === 'Crítica' || prioridad === 'Alta') && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Justificación de la Prioridad *
                    </label>
                    <textarea
                      value={justificacionPrioridad}
                      onChange={(e) => {
                        setJustificacionPrioridad(e.target.value);
                        setErrores(prev => {const n = {...prev}; delete n.justificacion; return n;});
                      }}
                      placeholder="Explica por qué esta auditoría tiene prioridad crítica o alta..."
                      rows={4}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errores.justificacion ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errores.justificacion && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {errores.justificacion}
                      </p>
                    )}
                  </div>
                )}

                {/* Visualización de matriz riesgo-prioridad */}
                <Card className="p-4 bg-gray-50">
                  <p className="text-sm font-bold text-gray-700 mb-3">
                    Matriz Riesgo vs Prioridad
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`p-3 rounded-lg text-center ${
                      nivelRiesgo === 'Crítico' && prioridad === 'Crítica'
                        ? 'bg-red-500 text-white'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      <p className="text-xs font-semibold">Riesgo Crítico + Prioridad Crítica</p>
                      <p className="text-[10px] mt-1">Ejecución inmediata</p>
                    </div>
                    <div className={`p-3 rounded-lg text-center ${
                      (nivelRiesgo === 'Alto' || nivelRiesgo === 'Crítico') && prioridad === 'Alta'
                        ? 'bg-orange-500 text-white'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      <p className="text-xs font-semibold">Riesgo Alto + Prioridad Alta</p>
                      <p className="text-[10px] mt-1">Q1-Q2</p>
                    </div>
                    <div className={`p-3 rounded-lg text-center ${
                      nivelRiesgo === 'Medio' && prioridad === 'Media'
                        ? 'bg-blue-500 text-white'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      <p className="text-xs font-semibold">Riesgo Medio + Prioridad Media</p>
                      <p className="text-[10px] mt-1">Durante el año</p>
                    </div>
                    <div className={`p-3 rounded-lg text-center ${
                      nivelRiesgo === 'Bajo' && prioridad === 'Baja'
                        ? 'bg-gray-500 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}>
                      <p className="text-xs font-semibold">Riesgo Bajo + Prioridad Baja</p>
                      <p className="text-[10px] mt-1">Según capacidad</p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* PASO 7: RECURSOS Y PRESUPUESTO */}
            {paso === 7 && (
              <div className="space-y-6">
                <div className="text-center pb-6 border-b">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-emerald-100">
                    <DollarSign className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Recursos y Presupuesto
                  </h2>
                  <p className="text-sm text-gray-600">
                    Define los recursos necesarios para ejecutar la auditoría
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Tipo de Recurso *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(['Interno', 'Externo', 'Mixto'] as TipoRecurso[]).map((tr) => (
                      <button
                        key={tr}
                        type="button"
                        onClick={() => setTipoRecurso(tr)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          tipoRecurso === tr
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-bold text-sm text-gray-900">{tr}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          {tr === 'Interno' && 'Personal de OCI'}
                          {tr === 'Externo' && 'Firma externa contratada'}
                          {tr === 'Mixto' && 'Combinación de ambos'}
                        </p>
                        {tipoRecurso === tr && (
                          <Check className="w-4 h-4 text-blue-600 mt-2" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Presupuesto Estimado (COP) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        $
                      </span>
                      <Input
                        type="number"
                        value={presupuesto}
                        onChange={(e) => setPresupuesto(parseFloat(e.target.value) || 0)}
                        className="pl-7"
                        min={0}
                        step={1000}
                        placeholder="0"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {presupuesto > 0 && (
                        <>
                          {new Intl.NumberFormat('es-CO', {
                            style: 'currency',
                            currency: 'COP',
                            minimumFractionDigits: 0
                          }).format(presupuesto)}
                        </>
                      )}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Total Horas Estimadas
                    </label>
                    <Input
                      type="number"
                      value={horasTotales}
                      readOnly
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Calculadas automáticamente del equipo asignado
                    </p>
                  </div>
                </div>

                {errores.presupuesto && (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-xs text-red-700 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {errores.presupuesto}
                    </p>
                  </div>
                )}

                {errores.horas && (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-xs text-red-700 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {errores.horas}
                    </p>
                  </div>
                )}

                {/* Resumen de recursos */}
                <Card className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200">
                  <p className="text-sm font-bold text-emerald-900 mb-3">
                    Resumen de Recursos Asignados
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg">
                      <Users className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                      <p className="text-xs text-gray-600">Equipo</p>
                      <p className="text-lg font-black text-emerald-600">
                        {(lider ? 1 : 0) + equipo.length}
                      </p>
                      <p className="text-[10px] text-gray-500">personas</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <Clock className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                      <p className="text-xs text-gray-600">Horas</p>
                      <p className="text-lg font-black text-blue-600">
                        {horasTotales}
                      </p>
                      <p className="text-[10px] text-gray-500">horas totales</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <DollarSign className="w-6 h-6 text-orange-600 mx-auto mb-1" />
                      <p className="text-xs text-gray-600">Presupuesto</p>
                      <p className="text-sm font-black text-orange-600">
                        ${(presupuesto / 1000000).toFixed(1)}M
                      </p>
                      <p className="text-[10px] text-gray-500">millones COP</p>
                    </div>
                  </div>
                </Card>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-gray-600">
                      <p className="font-semibold mb-1">Consideraciones de presupuesto:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Incluye costos de personal (interno o externo)</li>
                        <li>Considera viáticos si aplica (territoriales)</li>
                        <li>Software, herramientas y materiales</li>
                        <li>Capacitación específica si se requiere</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PASO 8: METODOLOGÍA Y NORMATIVA */}
            {paso === 8 && (
              <div className="space-y-6">
                <div className="text-center pb-6 border-b">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-violet-100">
                    <BookOpen className="w-8 h-8 text-violet-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Metodología y Normativa
                  </h2>
                  <p className="text-sm text-gray-600">
                    Define el marco normativo y metodológico de la auditoría
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Normativa Aplicable *
                  </label>
                  <p className="text-xs text-gray-600 mb-3">
                    Selecciona las leyes, decretos y normas que aplican a esta auditoría
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {NORMATIVAS.map((norm) => (
                      <button
                        key={norm}
                        type="button"
                        onClick={() => handleToggleNormativa(norm)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          normativasSeleccionadas.includes(norm)
                            ? 'bg-violet-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {normativasSeleccionadas.includes(norm) && (
                          <Check className="w-3 h-3 inline mr-1" />
                        )}
                        {norm}
                      </button>
                    ))}
                  </div>
                  {errores.normativas && (
                    <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {errores.normativas}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Metodología de Auditoría *
                  </label>
                  <textarea
                    value={metodologia}
                    onChange={(e) => {
                      setMetodologia(e.target.value);
                      setErrores(prev => {const n = {...prev}; delete n.metodologia; return n;});
                    }}
                    placeholder="Ej: Se aplicará la metodología basada en riesgos según NIA. Se realizará evaluación del diseño y efectividad de controles mediante pruebas de cumplimiento y sustantivas. Se utilizará muestreo estadístico para la revisión de documentación..."
                    rows={5}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errores.metodologia ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errores.metodologia && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {errores.metodologia}
                    </p>
                  )}
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-gray-500">
                      Describe el enfoque metodológico y técnicas a utilizar
                    </p>
                    <p className="text-xs text-gray-500">
                      {metodologia.length} caracteres
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Herramientas y Técnicas *
                  </label>
                  <p className="text-xs text-gray-600 mb-3">
                    Selecciona las herramientas y técnicas que se utilizarán
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {HERRAMIENTAS.map((herr) => (
                      <button
                        key={herr}
                        type="button"
                        onClick={() => handleToggleHerramienta(herr)}
                        className={`p-3 rounded-lg text-sm font-medium transition-all text-left ${
                          herramientasSeleccionadas.includes(herr)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {herramientasSeleccionadas.includes(herr) && (
                          <Check className="w-4 h-4 inline mr-1" />
                        )}
                        {herr}
                      </button>
                    ))}
                  </div>
                  {errores.herramientas && (
                    <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {errores.herramientas}
                    </p>
                  )}
                </div>

                {/* Resumen final */}
                <Card className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-violet-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-violet-900 mb-2">
                        Marco Metodológico Definido
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="font-semibold text-violet-800 mb-1">
                            Normativas: {normativasSeleccionadas.length}
                          </p>
                          <p className="text-violet-700">
                            {normativasSeleccionadas.slice(0, 2).join(', ')}
                            {normativasSeleccionadas.length > 2 && ` +${normativasSeleccionadas.length - 2} más`}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-violet-800 mb-1">
                            Herramientas: {herramientasSeleccionadas.length}
                          </p>
                          <p className="text-violet-700">
                            {herramientasSeleccionadas.slice(0, 2).join(', ')}
                            {herramientasSeleccionadas.length > 2 && ` +${herramientasSeleccionadas.length - 2} más`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </Card>
        </motion.div>
        </div>
      </div>

      {/* FOOTER STICKY */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleAnterior}
            disabled={paso === 1 || isLoading}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </Button>

          <div className="flex items-center gap-3">
            {paso === TOTAL_PASOS && (
              <Button
                variant="outline"
                onClick={handleGuardar}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Guardar como Borrador
                  </>
                )}
              </Button>
            )}
            
            {paso < TOTAL_PASOS ? (
              <Button
                onClick={handleSiguiente}
                className="gap-2"
                style={{ background: '#003DA5' }}
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleGuardar}
                disabled={isLoading}
                className="gap-2"
                style={{ background: '#10B981' }}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Crear Auditoría
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
