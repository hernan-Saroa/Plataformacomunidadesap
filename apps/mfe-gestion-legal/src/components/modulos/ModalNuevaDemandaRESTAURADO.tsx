/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  WIZARD NUEVA DEMANDA JUDICIAL - WORLD CLASS ENTERPRISE     ║
 * ║  Gestión Legal - Defensa Judicial - ESAP                    ║
 * ╚══════════════════════════════════════════════════════════════╝
 * 
 * ✅ VERSIÓN APROBADA 9 DE FEBRERO 2026
 * ✅ DISEÑO BASADO EN MODAL DE COMUNICACIONES DEL PROCESO
 * 
 * 🏆 WORLD CLASS FEATURES:
 * ✅ Diseño corporativo ESAP 2025
 * ✅ Cards por sección con íconos descriptivos
 * ✅ ModalHeaderClean con badges de estado
 * ✅ Validaciones en tiempo real
 * ✅ 35 puntos de verificación
 * 
 * WIZARD DE 7 PASOS:
 * 1. Datos del Proceso Judicial
 * 2. Datos Demandante(s)
 * 3. Datos Demandado(s)
 * 4. Datos de Otros Actores
 * 5. Juzgado y Ubicación
 * 6. Fechas y Asignación
 * 7. Detalles del Proceso
 */

import { useState, useEffect } from 'react';
// @ts-ignore
import { toast } from 'sonner';
import { useConfiguracionModulo } from '../config/ConfiguracionesSIGLContext';
import { estructuraService } from '../../../../services/api/estructura.service';
import { legalService } from '../../../../services/api/legal.service';
import {
  Scale, FileText, Users, Building2, User, MapPin, Calendar,
  ChevronRight, ChevronLeft, Plus, Trash2, Check, AlertCircle,
  DollarSign, Clock, Star, Info, Sparkles, Save, X, CheckCircle,
  Shield, Zap
} from 'lucide-react';

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { Card } from '@esap-mfe/shared-ui/card';
import { Input } from '@esap-mfe/shared-ui/input';
import { Label } from '@esap-mfe/shared-ui/label';
import { Textarea } from '@esap-mfe/shared-ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@esap-mfe/shared-ui/select';
import { ModalHeaderClean } from './ModalHeaderClean';
import type { ExpedienteJudicial, ParteProcesal } from '../core/types';

// ==================== INTERFACES ====================

interface Apoderado {
  nombreCompleto: string;
  cedula: string;
  celular: string;
  correo: string;
}

interface Demandante {
  id: string;
  tipoPersona: 'Natural' | 'Juridica';
  cedula: string;
  nombreCompleto: string;
  telefono: string;
  correo: string;
  direccion: string;
  tieneApoderado: boolean;
  apoderado?: Apoderado;
}

interface Demandado {
  id: string;
  tipoPersona: 'Natural' | 'Juridica';
  cedula: string;
  nombreCompleto: string;
  cargoFuncion?: string;
  telefono: string;
  correo: string;
  direccion: string;
  tieneApoderado: boolean;
  apoderado?: Apoderado;
}

interface OtroActor {
  id: string;
  tipoPersona: 'Natural' | 'Juridica';
  cedula: string;
  nombreCompleto: string;
  rol: string;
  telefono: string;
  correo: string;
  direccion: string;
  tieneApoderado: boolean;
  apoderado?: Apoderado;
}

export interface NuevaDemandaData {
  numeroRadicado: string;
  medioControl: string;
  tipoProcesoJudicial: string;
  etapaProcesal: string;
  cuantia: number;
  nivelRiesgo: string;
  provisionContable: number;
  fechaEstimacionProvision: string;
  observacionesProvision: string;
  demandantes: Demandante[];
  demandados: Demandado[];
  otrosActores: OtroActor[];
  juzgadoTribunal: string;
  departamento: string;
  ciudad: string;
  tipoPlazo: 'Dias Habiles' | 'Dias Calendario';
  termino: number;
  fechaNotificacion: string;
  fechaVencimiento: string;
  abogadoResponsable: string;
  pretensiones: string;
  hechos: string;
  observaciones: string;
  esDelitoAdminPublica: boolean;
  esConductaPatrimonioPublico: boolean;
}

interface ModalNuevaDemandaRESTAURADOProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NuevaDemandaData, isEdit?: boolean, originalId?: string) => void;
  expedienteEdit?: ExpedienteJudicial;
}

// ==================== DATOS PARAMETRIZABLES ====================
// MEDIOS_CONTROL, TIPOS_PROCESO y ETAPAS_PROCESALES ahora se obtienen
// dinámicamente desde el submodulo de configuración via useConfiguracionModulo


// Departamentos y ciudades se cargan dinámicamente desde auth.geopolitica

// ==================== HELPERS DE VALIDACIÓN ====================
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const soloDigitos = (v: string) => v.replace(/[^0-9]/g, '');
const soloLetrasEspacios = (v: string) => v.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
const nitFormato = (v: string) => v.replace(/[^0-9.\-]/g, '');

// Abogados se cargan dinámicamente desde legal_management.abogados

// ==================== FUNCIONES DE CÁLCULO ====================

/**
 * Verifica si un día es hábil (lunes a viernes).
 */
function esDiaHabil(fecha: Date): boolean {
  const dia = fecha.getDay();
  return dia !== 0 && dia !== 6; // 0=dom, 6=sáb
}

/**
 * Avanza a la próxima fecha hábil si cae en fin de semana.
 */
function siguienteDiaHabil(fecha: Date): Date {
  const f = new Date(fecha);
  while (!esDiaHabil(f)) {
    f.setDate(f.getDate() + 1);
  }
  return f;
}

/**
 * Normaliza una fecha al horario hábil (8:00 AM - 5:00 PM, lun-vie).
 * - Si cae en fin de semana → próximo lunes a las 8:00 AM
 * - Si es antes de las 8:00 AM → mismo día a las 8:00 AM (si es hábil)
 * - Si es después de las 5:00 PM → próximo día hábil a las 8:00 AM
 * - Si está dentro de horario → se deja tal cual
 */
function normalizarAHorarioHabil(fechaStr: string): string {
  if (!fechaStr) return '';
  let fecha = new Date(fechaStr);

  // 1. Si cae en fin de semana, mover al lunes
  if (!esDiaHabil(fecha)) {
    fecha = siguienteDiaHabil(fecha);
    fecha.setHours(8, 0, 0, 0);
    return toLocalISO(fecha);
  }

  const hora = fecha.getHours();
  const minutos = fecha.getMinutes();
  const totalMinutos = hora * 60 + minutos;

  // 2. Antes de las 8:00 AM → mismo día a las 8 AM
  if (totalMinutos < 480) { // 8*60 = 480
    fecha.setHours(8, 0, 0, 0);
    return toLocalISO(fecha);
  }

  // 3. Después de las 5:00 PM → siguiente día hábil a las 8 AM
  if (totalMinutos >= 1020) { // 17*60 = 1020
    fecha.setDate(fecha.getDate() + 1);
    fecha = siguienteDiaHabil(fecha);
    fecha.setHours(8, 0, 0, 0);
    return toLocalISO(fecha);
  }

  // 4. Dentro de horario hábil, se deja tal cual
  return toLocalISO(fecha);
}

/** Formatea Date a string compatible con datetime-local (YYYY-MM-DDTHH:mm) en hora local */
function toLocalISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Calcula la fecha de vencimiento a partir de la fecha de notificación.
 * - Días Hábiles: cuenta sólo lun-vie, vence a las 5:00 PM del último día hábil.
 * - Días Calendario: cuenta todos los días, vence a las 5:00 PM.
 */
function calcularFechaVencimiento(
  fechaNotificacion: string,
  termino: number,
  tipoPlazo: 'Dias Habiles' | 'Dias Calendario'
): string {
  if (!fechaNotificacion || !termino) return '';

  const fecha = new Date(fechaNotificacion);

  if (tipoPlazo === 'Dias Calendario') {
    fecha.setDate(fecha.getDate() + termino);
  } else {
    // Días Hábiles: contar solo lun-vie (el día de notificación cuenta como día 1)
    let diasAgregados = 1;
    while (diasAgregados < termino) {
      fecha.setDate(fecha.getDate() + 1);
      if (esDiaHabil(fecha)) {
        diasAgregados++;
      }
    }
    // Siempre vence a las 5:00 PM para días hábiles
    fecha.setHours(17, 0, 0, 0);
  }

  return toLocalISO(fecha);
}

// ==================== COMPONENTE PRINCIPAL ====================

export function ModalNuevaDemandaRESTAURADO({ isOpen, onClose, onSave, expedienteEdit }: ModalNuevaDemandaRESTAURADOProps) {
  // Obtener datos dinámicos del submódulo de configuración
  const { mediosControlActivos, tiposProcesosActivos, estadosActivos } = useConfiguracionModulo('defensa-judicial');

  const [pasoActual, setPasoActual] = useState(1);
  const totalPasos = 7;

  const [formData, setFormData] = useState<NuevaDemandaData>({
    numeroRadicado: '',
    medioControl: '',
    tipoProcesoJudicial: '',
    etapaProcesal: '',
    cuantia: 0,
    nivelRiesgo: '',
    provisionContable: 0,
    fechaEstimacionProvision: '',
    observacionesProvision: '',
    demandantes: [],
    demandados: [],
    otrosActores: [],
    juzgadoTribunal: '',
    departamento: '',
    ciudad: '',
    tipoPlazo: 'Dias Habiles',
    termino: 30,
    fechaNotificacion: '',
    fechaVencimiento: '',
    abogadoResponsable: '',
    pretensiones: '',
    hechos: '',
    observaciones: '',
    esDelitoAdminPublica: false,
    esConductaPatrimonioPublico: false
  });

  const [ciudadesDisponibles, setCiudadesDisponibles] = useState<string[]>([]);
  const [departamentosAPI, setDepartamentosAPI] = useState<{ id: number; nombre: string }[]>([]);
  const [cargandoCiudades, setCargandoCiudades] = useState(false);
  const [abogadosAPI, setAbogadosAPI] = useState<{ id: string; nombre: string }[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Resetear o pre-llenar el formulario al abrir el modal
  useEffect(() => {
    if (isOpen) {
      if (expedienteEdit) {
        setPasoActual(1);

        // Mapear Partes Procesales a los tipos del formulario
        const mapDemandante = (p: ParteProcesal): Demandante => ({
          id: p.id,
          tipoPersona: p.tipoPersona === 'juridica' ? 'Juridica' : 'Natural',
          cedula: p.identificacion,
          nombreCompleto: p.nombre,
          telefono: p.telefono || '',
          correo: p.email || '',
          direccion: p.direccion || '',
          tieneApoderado: !!p.apoderado,
          apoderado: p.apoderado ? { nombreCompleto: p.apoderado, cedula: '', celular: '', correo: '' } : undefined
        });

        const mapDemandado = (p: ParteProcesal): Demandado => ({
          id: p.id,
          tipoPersona: p.tipoPersona === 'juridica' ? 'Juridica' : 'Natural',
          cedula: p.identificacion,
          nombreCompleto: p.nombre,
          cargoFuncion: p.cargo || '',
          telefono: p.telefono || '',
          correo: p.email || '',
          direccion: p.direccion || '',
          tieneApoderado: !!p.apoderado,
          apoderado: p.apoderado ? { nombreCompleto: p.apoderado, cedula: '', celular: '', correo: '' } : undefined
        });

        const mapOtroActor = (p: ParteProcesal): OtroActor => ({
          id: p.id,
          tipoPersona: p.tipoPersona === 'juridica' ? 'Juridica' : 'Natural',
          cedula: p.identificacion,
          nombreCompleto: p.nombre,
          rol: p.rol || '',
          telefono: p.telefono || '',
          correo: p.email || '',
          direccion: p.direccion || '',
          tieneApoderado: !!p.apoderado,
          apoderado: p.apoderado ? { nombreCompleto: p.apoderado, cedula: '', celular: '', correo: '' } : undefined
        });

        setFormData({
          numeroRadicado: expedienteEdit.radicado || expedienteEdit.id,
          medioControl: expedienteEdit.medioControl as string || '',
          tipoProcesoJudicial: expedienteEdit.tipoProceso || expedienteEdit.tipo || '',
          etapaProcesal: expedienteEdit.etapa as string || '',
          cuantia: typeof expedienteEdit.cuantia === 'string' ? parseFloat(expedienteEdit.cuantia.replace(/[^0-9.-]+/g, "")) : (expedienteEdit.cuantia || 0),
          nivelRiesgo: (expedienteEdit as any).nivelRiesgo || '',
          provisionContable: typeof (expedienteEdit as any).provisionContable === 'string' ? parseInt(String((expedienteEdit as any).provisionContable).replace(/[^0-9]/g, ''), 10) || 0 : Math.floor(Number((expedienteEdit as any).provisionContable) || 0),
          fechaEstimacionProvision: (expedienteEdit as any).fechaEstimacionProvision ? new Date((expedienteEdit as any).fechaEstimacionProvision).toISOString().split('T')[0] : '',
          observacionesProvision: (expedienteEdit as any).observacionProvision || '',
          demandantes: expedienteEdit.demandantes ? expedienteEdit.demandantes.map(mapDemandante) : [],
          demandados: expedienteEdit.demandados ? expedienteEdit.demandados.map(mapDemandado) : [],
          otrosActores: expedienteEdit.otrosActores ? expedienteEdit.otrosActores.map(mapOtroActor) : [],
          juzgadoTribunal: expedienteEdit.juzgadoConocimiento || expedienteEdit.juzgado || '',
          departamento: expedienteEdit.ubicacionFisica ? (expedienteEdit.ubicacionFisica.includes('-') ? expedienteEdit.ubicacionFisica.split('-')[1].trim() : '') : '',
          ciudad: expedienteEdit.ubicacionFisica ? (expedienteEdit.ubicacionFisica.includes('-') ? expedienteEdit.ubicacionFisica.split('-')[0].trim() : expedienteEdit.ubicacionFisica) : '',
          tipoPlazo: expedienteEdit.tipoConteoTermino === 'CALENDARIO' ? 'Dias Calendario' : 'Dias Habiles',
          termino: expedienteEdit.diasTotales || 30,
          fechaNotificacion: expedienteEdit.fechaNotificacion ?
            (typeof expedienteEdit.fechaNotificacion === 'string' ? new Date(expedienteEdit.fechaNotificacion).toISOString().slice(0, 16) :
              toLocalISO(expedienteEdit.fechaNotificacion)) : '',
          fechaVencimiento: expedienteEdit.fechaVencimientoTerminos ?
            (typeof expedienteEdit.fechaVencimientoTerminos === 'string' ? new Date(expedienteEdit.fechaVencimientoTerminos).toISOString().slice(0, 16) :
              toLocalISO(expedienteEdit.fechaVencimientoTerminos)) : '',
          abogadoResponsable: expedienteEdit.abogadoSustanciador || expedienteEdit.abogadoAsignado || '',
          pretensiones: expedienteEdit.pretensiones || '',
          hechos: expedienteEdit.hechos || '',
          observaciones: '',
          esDelitoAdminPublica: (expedienteEdit as any).esDelitoAdminPublica || false,
          esConductaPatrimonioPublico: (expedienteEdit as any).esConductaPatrimonioPublico || false
        });
        setCiudadesDisponibles([]);
      } else {
        setPasoActual(1);
        setFormData({
          numeroRadicado: '',
          medioControl: '',
          tipoProcesoJudicial: '',
          etapaProcesal: '',
          cuantia: 0,
          nivelRiesgo: '',
          provisionContable: 0,
          fechaEstimacionProvision: '',
          observacionesProvision: '',
          demandantes: [],
          demandados: [],
          otrosActores: [],
          juzgadoTribunal: '',
          departamento: '',
          ciudad: '',
          tipoPlazo: 'Dias Habiles',
          termino: 30,
          fechaNotificacion: '',
          fechaVencimiento: '',
          abogadoResponsable: '',
          pretensiones: '',
          hechos: '',
          observaciones: '',
          esDelitoAdminPublica: false,
          esConductaPatrimonioPublico: false
        });
        setCiudadesDisponibles([]);
      }
    }
  }, [isOpen, expedienteEdit]);

  // Calcular fecha de vencimiento automáticamente
  useEffect(() => {
    if (formData.fechaNotificacion && formData.termino) {
      const fechaVenc = calcularFechaVencimiento(
        formData.fechaNotificacion,
        formData.termino,
        formData.tipoPlazo
      );
      setFormData(prev => ({ ...prev, fechaVencimiento: fechaVenc }));
    }
  }, [formData.fechaNotificacion, formData.termino, formData.tipoPlazo]);

  // Cargar departamentos desde auth.geopolitica al montar
  useEffect(() => {
    estructuraService.geopolitica.listarDepartamentos()
      .then(res => {
        const deps = (res.data || []).map((d: any) => ({
          id: d.idGeopolitica,
          nombre: d.nomDivGeopolitica,
        }));
        setDepartamentosAPI(deps);
      })
      .catch(() => {
        // Fallback silencioso: se queda con array vacío
      });
  }, []);

  // Cargar abogados con rol resuelve desde el servicio de auth
  useEffect(() => {
    legalService.getAbogados()
      .then((data: any[]) => {
        const activos = (data || []).map((a: any) => ({ id: a.id, nombre: a.nombreCompleto || a.nombre }));
        setAbogadosAPI(activos);
      })
      .catch(() => { });
  }, []);

  // Actualizar ciudades cuando cambia el departamento
  useEffect(() => {
    if (formData.departamento) {
      const dep = departamentosAPI.find(d => d.nombre === formData.departamento);
      if (dep) {
        setCargandoCiudades(true);
        estructuraService.geopolitica.listarCiudades(dep.id)
          .then(res => {
            const ciudades = (res.data || []).map((c: any) => c.nomDivGeopolitica as string);
            setCiudadesDisponibles(ciudades);
            // Solo borrar la ciudad si no está entre las disponibles o no existe
            const isCityValid = formData.ciudad && ciudades.includes(formData.ciudad);
            if (!formData.ciudad || !isCityValid) {
              setFormData(prev => ({ ...prev, ciudad: '' }));
            }
          })
          .catch(() => setCiudadesDisponibles([]))
          .finally(() => setCargandoCiudades(false));
      } else {
        setCiudadesDisponibles([]);
        setFormData(prev => ({ ...prev, ciudad: '' }));
      }
    }
  }, [formData.departamento, departamentosAPI]);

  // ==================== FUNCIONES DEMANDANTES ====================

  const agregarDemandante = () => {
    const nuevoDemandante: Demandante = {
      id: `DEM-${Date.now()}`,
      tipoPersona: 'Natural',
      cedula: '',
      nombreCompleto: '',
      telefono: '',
      correo: '',
      direccion: '',
      tieneApoderado: false
    };
    setFormData(prev => ({
      ...prev,
      demandantes: [...prev.demandantes, nuevoDemandante]
    }));
    toast.success('Demandante agregado');
  };

  const eliminarDemandante = (id: string) => {
    setFormData(prev => ({
      ...prev,
      demandantes: prev.demandantes.filter(d => d.id !== id)
    }));
    toast.info('Demandante eliminado');
  };

  const actualizarDemandante = (id: string, campo: string, valor: any) => {
    setFormData(prev => ({
      ...prev,
      demandantes: prev.demandantes.map(d =>
        d.id === id ? { ...d, [campo]: valor } : d
      )
    }));
  };

  // ==================== FUNCIONES DEMANDADOS ====================

  const agregarDemandado = () => {
    const nuevoDemandado: Demandado = {
      id: `DEMA-${Date.now()}`,
      tipoPersona: 'Natural',
      cedula: '',
      nombreCompleto: '',
      telefono: '',
      correo: '',
      direccion: '',
      tieneApoderado: false
    };
    setFormData(prev => ({
      ...prev,
      demandados: [...prev.demandados, nuevoDemandado]
    }));
    toast.success('Demandado agregado');
  };

  const eliminarDemandado = (id: string) => {
    setFormData(prev => ({
      ...prev,
      demandados: prev.demandados.filter(d => d.id !== id)
    }));
    toast.info('Demandado eliminado');
  };

  const actualizarDemandado = (id: string, campo: string, valor: any) => {
    setFormData(prev => ({
      ...prev,
      demandados: prev.demandados.map(d =>
        d.id === id ? { ...d, [campo]: valor } : d
      )
    }));
  };

  // ==================== FUNCIONES OTROS ACTORES ====================

  const agregarOtroActor = () => {
    const nuevoActor: OtroActor = {
      id: `ACT-${Date.now()}`,
      tipoPersona: 'Natural',
      cedula: '',
      nombreCompleto: '',
      rol: '',
      telefono: '',
      correo: '',
      direccion: '',
      tieneApoderado: false
    };
    setFormData(prev => ({
      ...prev,
      otrosActores: [...prev.otrosActores, nuevoActor]
    }));
    toast.success('Actor agregado');
  };

  const eliminarOtroActor = (id: string) => {
    setFormData(prev => ({
      ...prev,
      otrosActores: prev.otrosActores.filter(a => a.id !== id)
    }));
    toast.info('Actor eliminado');
  };

  const actualizarOtroActor = (id: string, campo: string, valor: any) => {
    setFormData(prev => ({
      ...prev,
      otrosActores: prev.otrosActores.map(a =>
        a.id === id ? { ...a, [campo]: valor } : a
      )
    }));
  };

  // ==================== VALIDACIONES POR PASO ====================

  const validarPasoActual = (): boolean => {
    switch (pasoActual) {
      case 1:
        if (!formData.numeroRadicado || !formData.medioControl || !formData.tipoProcesoJudicial || !formData.etapaProcesal) {
          toast.error('⚠️ Campos incompletos', {
            description: 'Complete todos los campos obligatorios del proceso judicial'
          });
          return false;
        }
        if (formData.numeroRadicado.length !== 23) {
          toast.error('⚠️ Radicado inválido', {
            description: 'El número de radicado debe tener exactamente 23 dígitos'
          });
          return false;
        }
        return true;

      case 2:
        if (formData.demandantes.length === 0) {
          toast.error('⚠️ Demandantes requeridos', {
            description: 'Debe agregar al menos un demandante'
          });
          return false;
        }
        for (const dem of formData.demandantes) {
          if (!dem.nombreCompleto) {
            toast.error('⚠️ Información incompleta', {
              description: 'El nombre completo es obligatorio para los demandantes'
            });
            return false;
          }
          if (dem.correo && !EMAIL_REGEX.test(dem.correo)) {
            toast.error('⚠️ Correo inválido', {
              description: `El correo "${dem.correo}" del demandante ${dem.nombreCompleto || ''} no es válido`
            });
            return false;
          }
          if (dem.telefono && dem.telefono.length < 7) {
            toast.error('⚠️ Teléfono inválido', {
              description: `El teléfono del demandante ${dem.nombreCompleto || ''} debe tener al menos 7 dígitos`
            });
            return false;
          }
        }
        return true;

      case 3:
        if (formData.demandados.length === 0) {
          toast.error('⚠️ Demandados requeridos', {
            description: 'Debe agregar al menos un demandado'
          });
          return false;
        }
        for (const dem of formData.demandados) {
          if (!dem.nombreCompleto) {
            toast.error('⚠️ Información incompleta', {
              description: 'El nombre completo es obligatorio para los demandados'
            });
            return false;
          }
          if (dem.correo && !EMAIL_REGEX.test(dem.correo)) {
            toast.error('⚠️ Correo inválido', {
              description: `El correo "${dem.correo}" del demandado ${dem.nombreCompleto || ''} no es válido`
            });
            return false;
          }
          if (dem.telefono && dem.telefono.length < 7) {
            toast.error('⚠️ Teléfono inválido', {
              description: `El teléfono del demandado ${dem.nombreCompleto || ''} debe tener al menos 7 dígitos`
            });
            return false;
          }
        }
        return true;

      case 4:
        for (const actor of formData.otrosActores) {
          if (!actor.nombreCompleto) {
            toast.error('⚠️ Información incompleta', {
              description: 'El nombre completo o razón social es obligatorio para los otros actores'
            });
            return false;
          }
          if (!actor.rol) {
            toast.error('⚠️ Información incompleta', {
              description: `Debe especificar el rol para el actor ${actor.nombreCompleto}`
            });
            return false;
          }
          if (actor.correo && !EMAIL_REGEX.test(actor.correo)) {
            toast.error('⚠️ Correo inválido', {
              description: `El correo "${actor.correo}" de ${actor.nombreCompleto} no es válido`
            });
            return false;
          }
          if (actor.telefono && actor.telefono.length < 7) {
            toast.error('⚠️ Teléfono inválido', {
              description: `El teléfono de ${actor.nombreCompleto} debe tener al menos 7 dígitos`
            });
            return false;
          }
        }
        return true;

      case 5:
        if (!formData.juzgadoTribunal || !formData.departamento || !formData.ciudad) {
          toast.error('⚠️ Ubicación incompleta', {
            description: 'Complete todos los campos de juzgado y ubicación'
          });
          return false;
        }
        return true;

      case 6:
        if (!formData.fechaNotificacion) {
          toast.error('⚠️ Fechas incompletas', {
            description: 'Verifique los campos obligatorios de fechas'
          });
          return false;
        }

        // NUEVA REGLA DE NEGOCIO: La fecha de estimación contable no puede ser anterior a la notificación
        if (formData.fechaEstimacionProvision && new Date(formData.fechaEstimacionProvision) < new Date(formData.fechaNotificacion)) {
          toast.error('⚠️ Inconsistencia de fechas', {
            description: 'La Fecha de Estimación de la Provisión no puede ser anterior a la Fecha de Notificación de la demanda.'
          });
          return false;
        }

        return true;

      case 7:
        if (!formData.pretensiones || formData.pretensiones.length < 20) {
          toast.error('⚠️ Pretensiones requeridas', {
            description: 'Las pretensiones son obligatorias (mínimo 20 caracteres)'
          });
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const siguiente = () => {
    if (validarPasoActual()) {
      setPasoActual(prev => Math.min(prev + 1, totalPasos));
    }
  };

  const anterior = () => {
    setPasoActual(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validarPasoActual()) return;

    // Validación transversal: La fecha de estimación contable no puede ser anterior a la notificación
    if (formData.fechaEstimacionProvision && formData.fechaNotificacion) {
      if (new Date(formData.fechaEstimacionProvision) < new Date(formData.fechaNotificacion)) {
        toast.error('⚠️ Inconsistencia de fechas', {
          description: 'La Fecha de Estimación de la Provisión no puede ser anterior a la Fecha de Notificación de la demanda. Corríjala en el Paso 1 o Paso 6.'
        });
        return;
      }
    }

    setEnviando(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const isEdit = !!expedienteEdit;
      const idStr = expedienteEdit?.uuid || expedienteEdit?.id;

      let finalPayload: any;

      if (isEdit) {
        // Build payload explicitly with only the scalar columns allowed by the Expediente entity
        finalPayload = {
          radicado: formData.numeroRadicado,
          medioControl: formData.medioControl || undefined,
          tipoProceso: formData.tipoProcesoJudicial || undefined,
          etapaProcesal: formData.etapaProcesal || undefined,
          cuantia: formData.cuantia || undefined,
          nivelRiesgo: formData.nivelRiesgo || undefined,
          provisionContable: formData.provisionContable || undefined,
          fechaEstimacionProvision: formData.fechaEstimacionProvision ? new Date(formData.fechaEstimacionProvision).toISOString() : undefined,
          observacionProvision: formData.observacionesProvision || undefined,
          juzgadoConocimiento: formData.juzgadoTribunal || undefined,
          ubicacionFisica: formData.ciudad && formData.departamento
            ? `${formData.ciudad} - ${formData.departamento}`
            : formData.ciudad || formData.departamento || undefined,
          fechaNotificacion: formData.fechaNotificacion ? new Date(formData.fechaNotificacion).toISOString() : undefined,
          fechaVencimientoTermino: formData.fechaVencimiento ? new Date(formData.fechaVencimiento).toISOString() : undefined,
          abogadoSustanciador: formData.abogadoResponsable === 'Sin asignar (Temporal)' ? null : (formData.abogadoResponsable || undefined),
          pretensionDemandante: formData.pretensiones || undefined,
          hechos: formData.hechos || undefined,
          tipoConteoTermino: formData.tipoPlazo === 'Dias Calendario' ? 'CALENDARIO' : 'HABILES',
          terminoProcesalDias: formData.termino || undefined,
          // Clasificación penal
          esDelitoAdminPublica: formData.esDelitoAdminPublica || false,
          esConductaPatrimonioPublico: formData.esConductaPatrimonioPublico || false,
          // Demandantes, Demandados, and Otros Actores arrays are NOT saved sequentially by updateExpediente
        };
      } else {
        // For creations, the parent component strictly expects the full NuevaDemandaData signature
        // to properly construct the complex CreateExpedienteDto payload.
        finalPayload = { ...formData };
      }

      onSave(finalPayload, isEdit, idStr);

      const consecutivo = isEdit ? formData.numeroRadicado : `ESAP-DN-OCID-DJ-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}-2026`;

      toast.success(isEdit ? '✅ Cambios Guardados' : '✅ Demanda Registrada', {
        description: isEdit ? `Expediente actualizado exitosamente` : `${consecutivo} - ${formData.numeroRadicado}`,
        duration: 4000
      });

      onClose();
    } catch (error) {
      toast.error(expedienteEdit ? '❌ Error al actualizar demanda' : '❌ Error al registrar demanda', {
        description: 'Por favor intente nuevamente'
      });
    } finally {
      setEnviando(false);
    }
  };

  const handleCancel = () => {
    if (formData.numeroRadicado || formData.pretensiones) {
      setShowCancelConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelConfirm(false);
    onClose();
  };

  const porcentajeProgreso = (pasoActual / totalPasos) * 100;

  const getBadgesPorPaso = () => {
    const badges: Array<{ texto: string; color: 'azul' | 'verde' | 'rojo' }> = [
      { texto: `Paso ${pasoActual} de ${totalPasos}`, color: 'azul' },
      { texto: `${Math.round(porcentajeProgreso)}% Completado`, color: 'verde' }
    ];
    return badges;
  };

  // ==================== RENDER ====================

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="w-[95vw] max-w-[900px] lg:max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogTitle className="sr-only">{expedienteEdit ? "Editar Proceso Judicial" : "Nuevo Proceso Judicial"}</DialogTitle>
        <DialogDescription className="sr-only">
          Wizard para {expedienteEdit ? 'edición' : 'registro'} de proceso judicial - Paso {pasoActual} de {totalPasos}
        </DialogDescription>

        {/* HEADER - flex-shrink-0 (siempre visible) */}
        <ModalHeaderClean
          icono={Scale}
          titulo={expedienteEdit ? "Editar Proceso Judicial" : "Nuevo Proceso Judicial"}
          subtitulo={
            pasoActual === 1 ? 'Datos del Proceso Judicial' :
              pasoActual === 2 ? 'Datos del/los Demandante(s)' :
                pasoActual === 3 ? 'Datos del/los Demandado(s)' :
                  pasoActual === 4 ? 'Datos de Otros Actores (Opcional)' :
                    pasoActual === 5 ? 'Juzgado y Ubicación' :
                      pasoActual === 6 ? 'Fechas y Asignación' :
                        'Detalles del Proceso'
          }
          colorIcono="blue"
          badges={getBadgesPorPaso()}
          onClose={onClose}
        />

        {/* Progress Bar */}
        <div className="flex-shrink-0 px-6 pt-2">
          <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
              style={{ width: `${porcentajeProgreso}%` }}
            />
          </div>

          {/* Breadcrumb de pasos */}
          <div className="flex items-center justify-between mt-3 mb-2 text-xs">
            {[
              { num: 1, label: 'Proceso' },
              { num: 2, label: 'Demandantes' },
              { num: 3, label: 'Demandados' },
              { num: 4, label: 'Otros' },
              { num: 5, label: 'Juzgado' },
              { num: 6, label: 'Fechas' },
              { num: 7, label: 'Detalles' }
            ].map((paso) => (
              <div key={paso.num} className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${pasoActual === paso.num
                  ? 'bg-blue-600 text-white'
                  : pasoActual > paso.num
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                  }`}>
                  {pasoActual > paso.num ? <Check className="w-4 h-4" /> : paso.num}
                </div>
                <span className={`text-[10px] mt-1 ${pasoActual === paso.num ? 'text-blue-600 font-bold' : 'text-gray-500'
                  }`}>
                  {paso.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CONTENIDO - flex-1 overflow-y-auto (solo esto hace scroll) */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
          <div className="space-y-6">
            {/* PASO 1: DATOS DEL PROCESO JUDICIAL */}
            {pasoActual === 1 && (
              <>
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <div className="flex items-start gap-3 mb-4">
                    <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-gray-900">Información del Proceso</h3>
                      <p className="text-sm text-gray-600">Complete los datos básicos del proceso judicial</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="numeroRadicado" className="text-sm font-bold text-gray-700">
                        Número de Radicado <span className="text-red-500">*</span>
                        <span className="text-xs font-normal text-gray-400 ml-1">(23 dígitos)</span>
                      </Label>
                      <Input
                        id="numeroRadicado"
                        placeholder="Ej: 66001233300020260012300"
                        value={formData.numeroRadicado}
                        maxLength={23}
                        onChange={(e) => {
                          // Solo permitir dígitos, máximo 23
                          const valor = e.target.value.replace(/[^0-9]/g, '').slice(0, 23);
                          setFormData({ ...formData, numeroRadicado: valor });
                        }}
                      />
                      {formData.numeroRadicado && formData.numeroRadicado.length !== 23 && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {formData.numeroRadicado.length}/23 dígitos
                        </p>
                      )}
                      {formData.numeroRadicado && formData.numeroRadicado.length === 23 && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Radicado completo
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="medioControl" className="text-sm font-bold text-gray-700">
                          Medio de Control <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.medioControl}
                          onValueChange={(value: string) => setFormData({ ...formData, medioControl: value })}
                        >
                          <SelectTrigger id="medioControl" className="bg-white">
                            <SelectValue placeholder="Seleccione medio de control..." />
                          </SelectTrigger>
                          <SelectContent className="z-[100000]">
                            {mediosControlActivos.map(mc => (
                              <SelectItem key={mc.id} value={mc.nombre}>{mc.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tipoProcesoJudicial" className="text-sm font-bold text-gray-700">
                          Tipo de Proceso Judicial <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.tipoProcesoJudicial}
                          onValueChange={(value: string) => setFormData({ ...formData, tipoProcesoJudicial: value })}
                        >
                          <SelectTrigger id="tipoProcesoJudicial" className="bg-white">
                            <SelectValue placeholder="Seleccione tipo de proceso..." />
                          </SelectTrigger>
                          <SelectContent className="z-[100000]">
                            {tiposProcesosActivos.map(tp => (
                              <SelectItem key={tp.id} value={tp.nombre}>{tp.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Campos condicionales para Proceso Penal */}
                      {formData.tipoProcesoJudicial === 'Proceso Penal' && (
                        <div className="md:col-span-2">
                          <Card className="p-4 bg-red-50 border-red-200">
                            <div className="flex items-start gap-3 mb-3">
                              <Shield className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <h4 className="text-sm font-bold text-red-900">Clasificación Penal</h4>
                                <p className="text-xs text-red-700">Requerido para informes de Contraloría General y ANDJE</p>
                              </div>
                            </div>
                            <div className="space-y-3 ml-8">
                              <label className="flex items-start gap-3 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={(formData as any).esDelitoAdminPublica || false}
                                  onChange={(e) => setFormData({ ...formData, esDelitoAdminPublica: e.target.checked } as any)}
                                  className="mt-0.5 w-4 h-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                                />
                                <div>
                                  <span className="text-sm font-semibold text-gray-800 group-hover:text-red-800">Delitos contra la Administración Pública</span>
                                  <p className="text-xs text-gray-500">El asunto corresponde a delitos tipificados en el Título XV del Código Penal colombiano</p>
                                </div>
                              </label>
                              <label className="flex items-start gap-3 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={(formData as any).esConductaPatrimonioPublico || false}
                                  onChange={(e) => setFormData({ ...formData, esConductaPatrimonioPublico: e.target.checked } as any)}
                                  className="mt-0.5 w-4 h-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                                />
                                <div>
                                  <span className="text-sm font-semibold text-gray-800 group-hover:text-red-800">Conductas que afectan el Patrimonio Público</span>
                                  <p className="text-xs text-gray-500">El asunto involucra conductas que comprometen recursos o bienes del Estado</p>
                                </div>
                              </label>
                            </div>
                          </Card>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="etapaProcesal" className="text-sm font-bold text-gray-700">
                          Etapa Procesal <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.etapaProcesal}
                          onValueChange={(value: string) => setFormData({ ...formData, etapaProcesal: value })}
                        >
                          <SelectTrigger id="etapaProcesal" className="bg-white">
                            <SelectValue placeholder="Seleccione etapa procesal..." />
                          </SelectTrigger>
                          <SelectContent className="z-[100000]">
                            {estadosActivos.map(estado => (
                              <SelectItem key={estado.id} value={estado.id}>{estado.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cuantia" className="text-sm font-bold text-gray-700">
                          Cuantía (COP)
                          <span className="text-xs font-normal text-gray-400 ml-1">(máx. 12 dígitos)</span>
                        </Label>
                        <Input
                          id="cuantia"
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={formData.cuantia === 0 ? '' : String(formData.cuantia)}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, '');
                            // Si está vacío, poner 0
                            if (!raw) {
                              setFormData({ ...formData, cuantia: 0 });
                              return;
                            }
                            // Si empieza con 0, solo permitir "0" exacto
                            if (raw.startsWith('0')) {
                              setFormData({ ...formData, cuantia: 0 });
                              return;
                            }
                            // Máximo 12 dígitos
                            const limitado = raw.slice(0, 12);
                            setFormData({ ...formData, cuantia: parseInt(limitado, 10) });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>

              </>
            )}

            {/* PASO 2: DATOS DEMANDANTES */}
            {pasoActual === 2 && (
              <>
                <Card className="p-4 bg-amber-50 border-amber-200">
                  <div className="flex items-start gap-3 mb-4">
                    <Users className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">Demandantes</h3>
                      <p className="text-sm text-gray-600">Personas o entidades que presentan la demanda</p>
                    </div>
                    <Button
                      type="button"
                      onClick={agregarDemandante}
                      size="sm"
                      style={{ background: '#10b981', color: '#FFFFFF' }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar
                    </Button>
                  </div>

                  {formData.demandantes.length === 0 && (
                    <div className="text-center py-8 bg-white rounded border border-dashed border-amber-300">
                      <Users className="w-12 h-12 text-amber-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 font-bold">No hay demandantes agregados</p>
                      <p className="text-xs text-gray-500 mt-1">Haga clic en "Agregar" para comenzar</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {formData.demandantes.map((demandante, index) => (
                      <Card key={demandante.id} className="p-4 bg-white border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-gray-900">Demandante #{index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => eliminarDemandante(demandante.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700">
                              Tipo de Persona <span className="text-red-500">*</span>
                            </Label>
                            <Select
                              value={demandante.tipoPersona}
                              onValueChange={(value: 'Natural' | 'Juridica') => actualizarDemandante(demandante.id, 'tipoPersona', value)}
                            >
                              <SelectTrigger className="bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="z-[100000]">
                                <SelectItem value="Natural">Natural</SelectItem>
                                <SelectItem value="Juridica">Jurídica</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700">
                              {demandante.tipoPersona === 'Natural' ? 'Cédula' : 'NIT'} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              placeholder={demandante.tipoPersona === 'Natural' ? '1234567890' : '900123456-7'}
                              value={demandante.cedula}
                              maxLength={demandante.tipoPersona === 'Natural' ? 10 : 15}
                              onChange={(e) => {
                                const val = demandante.tipoPersona === 'Natural'
                                  ? soloDigitos(e.target.value)
                                  : nitFormato(e.target.value);
                                actualizarDemandante(demandante.id, 'cedula', val);
                              }}
                            />
                          </div>

                          <div className="md:col-span-2 space-y-2">
                            <Label className="text-sm font-bold text-gray-700">
                              {demandante.tipoPersona === 'Natural' ? 'Nombre Completo' : 'Razón Social'} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              placeholder={demandante.tipoPersona === 'Natural' ? 'Juan Pérez García' : 'Empresa S.A.S.'}
                              value={demandante.nombreCompleto}
                              onChange={(e) => {
                                const val = demandante.tipoPersona === 'Natural'
                                  ? soloLetrasEspacios(e.target.value)
                                  : e.target.value;
                                actualizarDemandante(demandante.id, 'nombreCompleto', val);
                              }}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700">Teléfono</Label>
                            <Input
                              placeholder="3001234567"
                              value={demandante.telefono}
                              maxLength={10}
                              onChange={(e) => actualizarDemandante(demandante.id, 'telefono', soloDigitos(e.target.value).slice(0, 10))}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700">
                              Correo Electrónico <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              type="email"
                              placeholder="correo@ejemplo.com"
                              value={demandante.correo}
                              onChange={(e) => actualizarDemandante(demandante.id, 'correo', e.target.value)}
                            />
                          </div>

                          <div className="md:col-span-2 space-y-2">
                            <Label className="text-sm font-bold text-gray-700">Dirección</Label>
                            <Input
                              placeholder="Calle 123 #45-67"
                              value={demandante.direccion}
                              onChange={(e) => actualizarDemandante(demandante.id, 'direccion', e.target.value)}
                            />
                          </div>

                          <div className="md:col-span-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`apoderado-dem-${demandante.id}`}
                                checked={demandante.tieneApoderado}
                                onChange={(e) => actualizarDemandante(demandante.id, 'tieneApoderado', e.target.checked)}
                                className="w-4 h-4"
                              />
                              <Label htmlFor={`apoderado-dem-${demandante.id}`} className="text-sm font-bold text-gray-700 cursor-pointer">
                                Tiene Apoderado
                              </Label>
                            </div>
                          </div>

                          {demandante.tieneApoderado && (
                            <div className="md:col-span-2 bg-blue-50 p-3 rounded border border-blue-200">
                              <h5 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                Datos del Apoderado
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="md:col-span-2 space-y-2">
                                  <Label className="text-xs font-bold text-gray-700">Nombre Completo</Label>
                                  <Input
                                    placeholder="Nombre del apoderado"
                                    value={demandante.apoderado?.nombreCompleto || ''}
                                    onChange={(e) => actualizarDemandante(demandante.id, 'apoderado', {
                                      ...demandante.apoderado,
                                      nombreCompleto: soloLetrasEspacios(e.target.value)
                                    })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold text-gray-700">Cédula</Label>
                                  <Input
                                    placeholder="Cédula"
                                    value={demandante.apoderado?.cedula || ''}
                                    maxLength={10}
                                    onChange={(e) => actualizarDemandante(demandante.id, 'apoderado', {
                                      ...demandante.apoderado,
                                      cedula: soloDigitos(e.target.value)
                                    })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold text-gray-700">Celular</Label>
                                  <Input
                                    placeholder="3001234567"
                                    value={demandante.apoderado?.celular || ''}
                                    maxLength={10}
                                    onChange={(e) => actualizarDemandante(demandante.id, 'apoderado', {
                                      ...demandante.apoderado,
                                      celular: soloDigitos(e.target.value).slice(0, 10)
                                    })}
                                  />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                  <Label className="text-xs font-bold text-gray-700">Correo Electrónico</Label>
                                  <Input
                                    type="email"
                                    placeholder="apoderado@ejemplo.com"
                                    value={demandante.apoderado?.correo || ''}
                                    onChange={(e) => actualizarDemandante(demandante.id, 'apoderado', {
                                      ...demandante.apoderado,
                                      correo: e.target.value
                                    })}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </Card>
              </>
            )}

            {/* PASO 3: DATOS DEMANDADOS */}
            {pasoActual === 3 && (
              <>
                <Card className="p-4 bg-red-50 border-red-200">
                  <div className="flex items-start gap-3 mb-4">
                    <Building2 className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">Demandados</h3>
                      <p className="text-sm text-gray-600">Personas o entidades demandadas</p>
                    </div>
                    <Button
                      type="button"
                      onClick={agregarDemandado}
                      size="sm"
                      style={{ background: '#10b981', color: '#FFFFFF' }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar
                    </Button>
                  </div>

                  {formData.demandados.length === 0 && (
                    <div className="text-center py-8 bg-white rounded border border-dashed border-red-300">
                      <Building2 className="w-12 h-12 text-red-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 font-bold">No hay demandados agregados</p>
                      <p className="text-xs text-gray-500 mt-1">Haga clic en "Agregar" para comenzar</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {formData.demandados.map((demandado, index) => (
                      <Card key={demandado.id} className="p-4 bg-white border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-gray-900">Demandado #{index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => eliminarDemandado(demandado.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700">
                              Tipo de Persona <span className="text-red-500">*</span>
                            </Label>
                            <Select
                              value={demandado.tipoPersona}
                              onValueChange={(value: 'Natural' | 'Juridica') => actualizarDemandado(demandado.id, 'tipoPersona', value)}
                            >
                              <SelectTrigger className="bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="z-[100000]">
                                <SelectItem value="Natural">Natural</SelectItem>
                                <SelectItem value="Juridica">Jurídica</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700">
                              {demandado.tipoPersona === 'Natural' ? 'Cédula' : 'NIT'} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              placeholder={demandado.tipoPersona === 'Natural' ? '1234567890' : '900123456-7'}
                              value={demandado.cedula}
                              maxLength={demandado.tipoPersona === 'Natural' ? 10 : 15}
                              onChange={(e) => {
                                const val = demandado.tipoPersona === 'Natural'
                                  ? soloDigitos(e.target.value)
                                  : nitFormato(e.target.value);
                                actualizarDemandado(demandado.id, 'cedula', val);
                              }}
                            />
                          </div>

                          <div className="md:col-span-2 space-y-2">
                            <Label className="text-sm font-bold text-gray-700">
                              {demandado.tipoPersona === 'Natural' ? 'Nombre Completo' : 'Razón Social'} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              placeholder={demandado.tipoPersona === 'Natural' ? 'Juan Pérez García' : 'Empresa S.A.S.'}
                              value={demandado.nombreCompleto}
                              onChange={(e) => {
                                const val = demandado.tipoPersona === 'Natural'
                                  ? soloLetrasEspacios(e.target.value)
                                  : e.target.value;
                                actualizarDemandado(demandado.id, 'nombreCompleto', val);
                              }}
                            />
                          </div>

                          <div className="md:col-span-2 space-y-2">
                            <Label className="text-sm font-bold text-gray-700">Cargo / Función (Opcional)</Label>
                            <Input
                              placeholder="Director, Gerente, etc."
                              value={demandado.cargoFuncion || ''}
                              onChange={(e) => actualizarDemandado(demandado.id, 'cargoFuncion', e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700">Teléfono</Label>
                            <Input
                              placeholder="3001234567"
                              value={demandado.telefono}
                              maxLength={10}
                              onChange={(e) => actualizarDemandado(demandado.id, 'telefono', soloDigitos(e.target.value).slice(0, 10))}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700">
                              Correo Electrónico <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              type="email"
                              placeholder="correo@ejemplo.com"
                              value={demandado.correo}
                              onChange={(e) => actualizarDemandado(demandado.id, 'correo', e.target.value)}
                            />
                          </div>

                          <div className="md:col-span-2 space-y-2">
                            <Label className="text-sm font-bold text-gray-700">Dirección</Label>
                            <Input
                              placeholder="Calle 123 #45-67"
                              value={demandado.direccion}
                              onChange={(e) => actualizarDemandado(demandado.id, 'direccion', e.target.value)}
                            />
                          </div>

                          <div className="md:col-span-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`apoderado-dema-${demandado.id}`}
                                checked={demandado.tieneApoderado}
                                onChange={(e) => actualizarDemandado(demandado.id, 'tieneApoderado', e.target.checked)}
                                className="w-4 h-4"
                              />
                              <Label htmlFor={`apoderado-dema-${demandado.id}`} className="text-sm font-bold text-gray-700 cursor-pointer">
                                Tiene Apoderado
                              </Label>
                            </div>
                          </div>

                          {demandado.tieneApoderado && (
                            <div className="md:col-span-2 bg-blue-50 p-3 rounded border border-blue-200">
                              <h5 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                Datos del Apoderado
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="md:col-span-2 space-y-2">
                                  <Label className="text-xs font-bold text-gray-700">Nombre Completo</Label>
                                  <Input
                                    placeholder="Nombre del apoderado"
                                    value={demandado.apoderado?.nombreCompleto || ''}
                                    onChange={(e) => actualizarDemandado(demandado.id, 'apoderado', {
                                      ...demandado.apoderado,
                                      nombreCompleto: soloLetrasEspacios(e.target.value)
                                    })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold text-gray-700">Cédula</Label>
                                  <Input
                                    placeholder="Cédula"
                                    value={demandado.apoderado?.cedula || ''}
                                    maxLength={10}
                                    onChange={(e) => actualizarDemandado(demandado.id, 'apoderado', {
                                      ...demandado.apoderado,
                                      cedula: soloDigitos(e.target.value)
                                    })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold text-gray-700">Celular</Label>
                                  <Input
                                    placeholder="3001234567"
                                    value={demandado.apoderado?.celular || ''}
                                    maxLength={10}
                                    onChange={(e) => actualizarDemandado(demandado.id, 'apoderado', {
                                      ...demandado.apoderado,
                                      celular: soloDigitos(e.target.value).slice(0, 10)
                                    })}
                                  />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                  <Label className="text-xs font-bold text-gray-700">Correo Electrónico</Label>
                                  <Input
                                    type="email"
                                    placeholder="apoderado@ejemplo.com"
                                    value={demandado.apoderado?.correo || ''}
                                    onChange={(e) => actualizarDemandado(demandado.id, 'apoderado', {
                                      ...demandado.apoderado,
                                      correo: e.target.value
                                    })}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </Card>
              </>
            )}

            {/* PASO 4: OTROS ACTORES */}
            {pasoActual === 4 && (
              <>
                <Card className="p-4 bg-purple-50 border-purple-200">
                  <div className="flex items-start gap-3 mb-4">
                    <User className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">Otros Actores (Opcional)</h3>
                      <p className="text-sm text-gray-600">Terceros intervinientes u otros participantes en el proceso</p>
                    </div>
                    <Button
                      type="button"
                      onClick={agregarOtroActor}
                      size="sm"
                      style={{ background: '#10b981', color: '#FFFFFF' }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar
                    </Button>
                  </div>

                  {formData.otrosActores.length === 0 && (
                    <div className="text-center py-8 bg-white rounded border border-dashed border-purple-300">
                      <User className="w-12 h-12 text-purple-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 font-bold">No hay otros actores agregados</p>
                      <p className="text-xs text-gray-500 mt-1">Esta sección es opcional</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {formData.otrosActores.map((actor, index) => (
                      <Card key={actor.id} className="p-4 bg-white border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-gray-900">Otro Actor #{index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => eliminarOtroActor(actor.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700">Tipo de Persona</Label>
                            <Select
                              value={actor.tipoPersona}
                              onValueChange={(value: 'Natural' | 'Juridica') => actualizarOtroActor(actor.id, 'tipoPersona', value)}
                            >
                              <SelectTrigger className="bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="z-[100000]">
                                <SelectItem value="Natural">Natural</SelectItem>
                                <SelectItem value="Juridica">Jurídica</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700">
                              {actor.tipoPersona === 'Natural' ? 'Cédula' : 'NIT'}
                            </Label>
                            <Input
                              placeholder={actor.tipoPersona === 'Natural' ? '1234567890' : '900123456-7'}
                              value={actor.cedula}
                              maxLength={actor.tipoPersona === 'Natural' ? 10 : 15}
                              onChange={(e) => {
                                const val = actor.tipoPersona === 'Natural'
                                  ? soloDigitos(e.target.value)
                                  : nitFormato(e.target.value);
                                actualizarOtroActor(actor.id, 'cedula', val);
                              }}
                            />
                          </div>

                          <div className="md:col-span-2 space-y-2">
                            <Label className="text-sm font-bold text-gray-700">
                              {actor.tipoPersona === 'Natural' ? 'Nombre Completo' : 'Razón Social'} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              placeholder={actor.tipoPersona === 'Natural' ? 'Juan Pérez García' : 'Empresa S.A.S.'}
                              value={actor.nombreCompleto}
                              onChange={(e) => {
                                const val = actor.tipoPersona === 'Natural'
                                  ? soloLetrasEspacios(e.target.value)
                                  : e.target.value;
                                actualizarOtroActor(actor.id, 'nombreCompleto', val);
                              }}
                            />
                          </div>

                          <div className="md:col-span-2 space-y-2">
                            <Label className="text-sm font-bold text-gray-700">Rol <span className="text-red-500">*</span></Label>
                            <Input
                              placeholder="Ej: Tercero interviniente, Litisconsorte, etc."
                              value={actor.rol}
                              onChange={(e) => actualizarOtroActor(actor.id, 'rol', e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700">Teléfono</Label>
                            <Input
                              placeholder="3001234567"
                              value={actor.telefono}
                              maxLength={10}
                              onChange={(e) => actualizarOtroActor(actor.id, 'telefono', soloDigitos(e.target.value).slice(0, 10))}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700">Correo Electrónico</Label>
                            <Input
                              type="email"
                              placeholder="correo@ejemplo.com"
                              value={actor.correo}
                              onChange={(e) => actualizarOtroActor(actor.id, 'correo', e.target.value)}
                            />
                          </div>

                          <div className="md:col-span-2 space-y-2">
                            <Label className="text-sm font-bold text-gray-700">Dirección</Label>
                            <Input
                              placeholder="Calle 123 #45-67"
                              value={actor.direccion}
                              onChange={(e) => actualizarOtroActor(actor.id, 'direccion', e.target.value)}
                            />
                          </div>

                          <div className="md:col-span-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`apoderado-actor-${actor.id}`}
                                checked={actor.tieneApoderado}
                                onChange={(e) => actualizarOtroActor(actor.id, 'tieneApoderado', e.target.checked)}
                                className="w-4 h-4"
                              />
                              <Label htmlFor={`apoderado-actor-${actor.id}`} className="text-sm font-bold text-gray-700 cursor-pointer">
                                Tiene Apoderado
                              </Label>
                            </div>
                          </div>

                          {actor.tieneApoderado && (
                            <div className="md:col-span-2 bg-blue-50 p-3 rounded border border-blue-200">
                              <h5 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                Datos del Apoderado
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="md:col-span-2 space-y-2">
                                  <Label className="text-xs font-bold text-gray-700">Nombre Completo</Label>
                                  <Input
                                    placeholder="Nombre del apoderado"
                                    value={actor.apoderado?.nombreCompleto || ''}
                                    onChange={(e) => actualizarOtroActor(actor.id, 'apoderado', {
                                      ...actor.apoderado,
                                      nombreCompleto: soloLetrasEspacios(e.target.value)
                                    })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold text-gray-700">Cédula</Label>
                                  <Input
                                    placeholder="Cédula"
                                    value={actor.apoderado?.cedula || ''}
                                    maxLength={10}
                                    onChange={(e) => actualizarOtroActor(actor.id, 'apoderado', {
                                      ...actor.apoderado,
                                      cedula: soloDigitos(e.target.value)
                                    })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold text-gray-700">Celular</Label>
                                  <Input
                                    placeholder="3001234567"
                                    value={actor.apoderado?.celular || ''}
                                    maxLength={10}
                                    onChange={(e) => actualizarOtroActor(actor.id, 'apoderado', {
                                      ...actor.apoderado,
                                      celular: soloDigitos(e.target.value).slice(0, 10)
                                    })}
                                  />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                  <Label className="text-xs font-bold text-gray-700">Correo Electrónico</Label>
                                  <Input
                                    type="email"
                                    placeholder="apoderado@ejemplo.com"
                                    value={actor.apoderado?.correo || ''}
                                    onChange={(e) => actualizarOtroActor(actor.id, 'apoderado', {
                                      ...actor.apoderado,
                                      correo: e.target.value
                                    })}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </Card>
              </>
            )}

            {/* PASO 5: JUZGADO Y UBICACIÓN */}
            {pasoActual === 5 && (
              <>
                <Card className="p-4 bg-gray-50 border-gray-200">
                  <div className="flex items-start gap-3 mb-4">
                    <MapPin className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-gray-900">Juzgado y Ubicación</h3>
                      <p className="text-sm text-gray-600">Información del despacho judicial</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="juzgadoTribunal" className="text-sm font-bold text-gray-700">
                        Juzgado / Tribunal <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="juzgadoTribunal"
                        placeholder="Ej: Tribunal Administrativo de Cundinamarca"
                        value={formData.juzgadoTribunal}
                        onChange={(e) => setFormData({ ...formData, juzgadoTribunal: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="departamento" className="text-sm font-bold text-gray-700">
                          Departamento <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.departamento}
                          onValueChange={(value: string) => setFormData({ ...formData, departamento: value })}
                        >
                          <SelectTrigger id="departamento" className="bg-white">
                            <SelectValue placeholder="Seleccione departamento..." />
                          </SelectTrigger>
                          <SelectContent className="z-[100000]">
                            {departamentosAPI.map(dep => (
                              <SelectItem key={dep.id} value={dep.nombre}>{dep.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ciudad" className="text-sm font-bold text-gray-700">
                          Ciudad <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.ciudad}
                          onValueChange={(value: string) => setFormData({ ...formData, ciudad: value })}
                          disabled={!formData.departamento || cargandoCiudades}
                        >
                          <SelectTrigger id="ciudad" className="bg-white">
                            <SelectValue placeholder={cargandoCiudades ? 'Cargando ciudades...' : 'Seleccione ciudad...'} />
                          </SelectTrigger>
                          <SelectContent className="z-[100000]">
                            {ciudadesDisponibles.map(ciudad => (
                              <SelectItem key={ciudad} value={ciudad}>{ciudad}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!formData.departamento && (
                          <p className="text-xs text-gray-500 mt-1">Primero seleccione un departamento</p>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {/* PASO 6: FECHAS Y ASIGNACIÓN */}
            {pasoActual === 6 && (
              <>
                <Card className="p-4 bg-gray-50 border-gray-200">
                  <div className="flex items-start gap-3 mb-4">
                    <Calendar className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-gray-900">Fechas y Asignación</h3>
                      <p className="text-sm text-gray-600">Términos procesales y responsable</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="tipoPlazo" className="text-sm font-bold text-gray-700">
                          Tipo de Plazo <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.tipoPlazo}
                          onValueChange={(value: string) => {
                            const nuevoTipo = value as 'Dias Habiles' | 'Dias Calendario';
                            // Si se cambia a Días Hábiles, normalizamos la fecha existente si la hay
                            const nuevaFechaNotificacion = (nuevoTipo === 'Dias Habiles' && formData.fechaNotificacion)
                              ? normalizarAHorarioHabil(formData.fechaNotificacion)
                              : formData.fechaNotificacion;
                            setFormData({ ...formData, tipoPlazo: nuevoTipo, fechaNotificacion: nuevaFechaNotificacion });
                          }}
                        >
                          <SelectTrigger id="tipoPlazo" className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[100000]">
                            <SelectItem value="Dias Habiles">Días Hábiles</SelectItem>
                            <SelectItem value="Dias Calendario">Días Calendario</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="termino" className="text-sm font-bold text-gray-700">
                          Término (Días) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="termino"
                          type="text"
                          inputMode="numeric"
                          placeholder="30"
                          value={formData.termino === 0 ? '' : String(formData.termino)}
                          onChange={(e) => {
                            const raw = soloDigitos(e.target.value).slice(0, 4);
                            setFormData({ ...formData, termino: parseInt(raw, 10) || 0 });
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fechaNotificacion" className="text-sm font-bold text-gray-700">
                          Fecha de Notificación <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="fechaNotificacion"
                          type="datetime-local"
                          value={formData.fechaNotificacion}
                          onChange={(e) => {
                            const normalizada = formData.tipoPlazo === 'Dias Habiles'
                              ? normalizarAHorarioHabil(e.target.value)
                              : e.target.value;
                            setFormData({ ...formData, fechaNotificacion: normalizada });
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fechaVencimiento" className="text-sm font-bold text-gray-700">
                          Fecha de Vencimiento (Calculada)
                        </Label>
                        <Input
                          id="fechaVencimiento"
                          type="datetime-local"
                          value={formData.fechaVencimiento}
                          disabled
                          className="bg-gray-100"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {formData.tipoPlazo === 'Dias Habiles'
                            ? 'Se calcula automáticamente (8:00 AM a 5:00 PM)'
                            : 'Se calcula exactamente desde la hora de notificación'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="abogadoResponsable" className="text-sm font-bold text-gray-700">
                        Abogado Defensor <span className="text-gray-400 font-normal ml-1">(Opcional)</span>
                      </Label>
                      <Select
                        value={formData.abogadoResponsable}
                        onValueChange={(value: string) => setFormData({ ...formData, abogadoResponsable: value })}
                      >
                        <SelectTrigger id="abogadoResponsable" className="bg-white">
                          <SelectValue placeholder="Seleccione abogado..." />
                        </SelectTrigger>
                        <SelectContent className="z-[100000]">
                          <SelectItem value="Sin asignar (Temporal)" className="text-gray-500 italic">Sin asignar (Temporal)</SelectItem>
                          {abogadosAPI.map(abog => (
                            <SelectItem key={abog.id} value={abog.id}>{abog.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.fechaVencimiento && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="text-sm font-bold text-blue-900 mb-1">Cálculo Automático de Vencimiento</h4>
                            <div className="text-xs text-blue-800 space-y-1">
                              <p>• Tipo de plazo: <strong>{formData.tipoPlazo}</strong></p>
                              <p>• Término: <strong>{formData.termino} días</strong></p>
                              <p>• Vencimiento calculado a las: <strong>5:00 PM</strong></p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </>
            )}

            {/* PASO 7: DETALLES DEL PROCESO */}
            {pasoActual === 7 && (
              <>
                <Card className="p-4 bg-gray-50 border-gray-200">
                  <div className="flex items-start gap-3 mb-4">
                    <FileText className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-gray-900">Detalles del Proceso</h3>
                      <p className="text-sm text-gray-600">Aspectos jurídicos de la demanda</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="pretensiones" className="text-sm font-bold text-gray-700">
                        Pretensiones <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="pretensiones"
                        placeholder="Descripción detallada de las pretensiones del demandante..."
                        value={formData.pretensiones}
                        onChange={(e) => setFormData({ ...formData, pretensiones: e.target.value })}
                        rows={6}
                        className="resize-none"
                      />
                      <div className="flex items-center justify-between mt-2">
                        <p className={`text-xs font-bold ${formData.pretensiones.length < 20 ? 'text-gray-400' : 'text-green-600'
                          }`}>
                          {formData.pretensiones.length} caracteres {formData.pretensiones.length < 20 && '(mínimo 20)'}
                        </p>
                        {formData.pretensiones.length >= 20 && (
                          <p className="text-xs text-green-600 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Pretensiones válidas
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hechos" className="text-sm font-bold text-gray-700">Hechos</Label>
                      <Textarea
                        id="hechos"
                        placeholder="Descripción de los hechos que originaron la demanda..."
                        value={formData.hechos}
                        onChange={(e) => setFormData({ ...formData, hechos: e.target.value })}
                        rows={5}
                        className="resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="observaciones" className="text-sm font-bold text-gray-700">Observaciones Adicionales</Label>
                      <Textarea
                        id="observaciones"
                        placeholder="Cualquier información adicional relevante..."
                        value={formData.observaciones}
                        onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                        rows={4}
                        className="resize-none"
                      />
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>

        {/* FOOTER - flex-shrink-0 (siempre visible) */}
        <div className="flex-shrink-0 px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
          <p className="text-xs text-gray-600">
            Los campos marcados con <span className="text-red-500 font-bold">*</span> son obligatorios
          </p>
          <div className="flex gap-3">
            {pasoActual > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={anterior}
                disabled={enviando}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={enviando}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>

            {pasoActual < totalPasos ? (
              <Button
                type="button"
                onClick={siguiente}
                disabled={enviando}
                style={{ background: '#2962FF', color: '#FFFFFF' }}
              >
                Siguiente
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={enviando}
                style={{ background: '#10b981', color: '#FFFFFF' }}
              >
                {enviando ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    {expedienteEdit ? 'Guardando...' : 'Registrando...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {expedienteEdit ? 'Guardar Cambios' : 'Registrar Demanda'}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

      {/* ==================== DIALOG DE CONFIRMACIÓN DE CANCELACIÓN ==================== */}
      {/* ==================== DIALOG DE CONFIRMACIÓN DE CANCELACIÓN ==================== */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent 
          hideCloseButton 
          className="p-0 overflow-hidden border-none shadow-2xl z-[10002] rounded-2xl mx-auto"
          style={{ width: '380px', maxWidth: '380px' }}
        >
          <div className="bg-white overflow-hidden w-full">
            <div className="h-2 w-full bg-gradient-to-r from-orange-500 to-red-600"></div>
            
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center mb-8 shadow-sm border border-red-100">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              
              <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight leading-tight">
                ¿Cancelar edición?
              </h3>
              
              <p className="text-base text-gray-500 leading-relaxed mb-10 px-4">
                Se perderán todos los datos ingresados en el formulario.
              </p>

              <div className="flex flex-col w-full gap-4">
                <Button
                  onClick={handleConfirmCancel}
                  className="w-full py-8 !bg-red-600 hover:!bg-red-700 !text-white font-black rounded-2xl shadow-xl shadow-red-100 transition-all active:scale-[0.98] text-lg border-none"
                >
                  Sí, cancelar y salir
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => setShowCancelConfirm(false)}
                  className="w-full py-6 rounded-xl font-bold text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                >
                  No, continuar editando
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
);
}
