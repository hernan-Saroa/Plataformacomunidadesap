/**
 * Módulo de Configuración - Control Interno Disciplinario
 * Configuración organizada por módulos con navegación lateral
 * DISEÑO COHERENTE CON CONFIGURACIONES SIGL - ESAP 4K
 */

import { useState, useEffect } from 'react';
import {
  Settings, LayoutDashboard, CheckCircle, Archive, Clock, Users, FileText,
  Save, RotateCcw, AlertCircle, Plus, Trash2, Edit3, LayoutGrid, Mail, 
  Bell, Target, AlertTriangle, GripVertical, X, Upload, Download, Eye
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import disciplinaryService from '../../../services/api/disciplinary.service';
import { SeccionPlantillasAutos, ETAPAS_PROCESO, type EtapaProcesoId } from './SeccionPlantillasAutos';
import { ModalEdicionPlantillaAuto } from './ModalEdicionPlantillaAuto';
import { useOficiosConfiguration } from '../../../hooks/useOficiosConfiguration';

// ============ INTERFACES ============

export interface EstadoKanban {
  id: string;
  nombre: string;
  color: string;
  dias: number;
  alertaDias: number;
  orden: number;
  activo: boolean;
}

export interface Cargo {
  id: string;
  nombre: string;
  capacidad: number;
  activo: boolean;
}

export interface ConfiguracionNotificaciones {
  vencimiento7dias: boolean;
  vencimiento3dias: boolean;
  vencimiento1dia: boolean;
  procesoVencido: boolean;
  asignacionProceso: boolean;
  cambioEtapa: boolean;
  aprobacionRequerida: boolean;
  resumenDiario: boolean;
  resumenSemanal: boolean;
}

export interface ConfiguracionAlertas {
  porcentajeRiesgo: number;
  porcentajeCritico: number;
  capacidadAlerta: number;
  diasAnticipacion: number;
}

export interface EntidadRemision {
  id: string;
  nombre: string;
  correo: string;
  activo: boolean;
}

export interface PlantillaAuto {
  id: string;
  tipo: string;
  nombre: string;
  contenido: string;
  variables: string[];
  activo: boolean;
  etapa: EtapaProcesoId; // ✅ Nueva propiedad
  descripcionUso: string; // ✅ Nueva propiedad
}

// ✅ Nueva interfaz para Tipos de Carpeta
export interface TipoCarpeta {
  id: string;
  nombre: string;
  descripcion: string;
  color: string;
  icono: string;
  orden: number;
  activo: boolean;
}

// ✅ Interfaz para Tipos de Oficios
export interface TipoOficio {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string;
  activo: boolean;
}

// ✅ Interfaz para Plantillas de Actas
export interface PlantillaActa {
  id: string;
  nombre: string;
  tipo: string;
  descripcion: string;
  archivo?: string;
  fechaCarga: string;
  activo: boolean;
}

// ============ CONFIGURACIONES POR DEFECTO ============

const ESTADOS_KANBAN_DEFECTO: EstadoKanban[] = [
  { id: 'recepcion', nombre: 'Recepción', color: '#3B82F6', dias: 3, alertaDias: 1, orden: 1, activo: true },
  { id: 'valoracion', nombre: 'Valoración', color: '#F59E0B', dias: 10, alertaDias: 3, orden: 2, activo: true },
  { id: 'indagacion', nombre: 'Indagación', color: '#8B5CF6', dias: 40, alertaDias: 10, orden: 3, activo: true },
  { id: 'investigacion', nombre: 'Investigación', color: '#EC4899', dias: 60, alertaDias: 15, orden: 4, activo: true },
  { id: 'juzgamiento', nombre: 'Juzgamiento', color: '#06B6D4', dias: 50, alertaDias: 10, orden: 5, activo: true },
  { id: 'fallo', nombre: 'Fallo', color: '#10B981', dias: 10, alertaDias: 3, orden: 6, activo: true },
];

const CARGOS_DEFECTO: Cargo[] = [
  { id: 'especializado', nombre: 'PROFESIONAL ESPECIALIZADO', capacidad: 12, activo: true },
  { id: 'universitario', nombre: 'PROFESIONAL UNIVERSITARIO', capacidad: 10, activo: true },
  { id: 'senior', nombre: 'PROFESIONAL SENIOR', capacidad: 15, activo: true },
  { id: 'coordinador', nombre: 'COORDINADOR', capacidad: 8, activo: true },
];

const NOTIFICACIONES_DEFECTO: ConfiguracionNotificaciones = {
  vencimiento7dias: true,
  vencimiento3dias: true,
  vencimiento1dia: true,
  procesoVencido: true,
  asignacionProceso: true,
  cambioEtapa: true,
  aprobacionRequerida: false,
  resumenDiario: true,
  resumenSemanal: true,
};

const ALERTAS_DEFECTO: ConfiguracionAlertas = {
  porcentajeRiesgo: 85,
  porcentajeCritico: 95,
  capacidadAlerta: 90,
  diasAnticipacion: 7,
};

const ENTIDADES_REMISION_DEFECTO: EntidadRemision[] = [
  { id: 'procuraduria', nombre: 'Procuraduría General de la Nación', correo: 'contacto@procuraduria.gov.co', activo: true },
  { id: 'contraloria', nombre: 'Contraloría General de la República', correo: 'info@contraloria.gov.co', activo: true },
  { id: 'fiscalia', nombre: 'Fiscalía General de la Nación', correo: 'denuncias@fiscalia.gov.co', activo: true },
  { id: 'defensoria', nombre: 'Defensoría del Pueblo', correo: 'contacto@defensoria.gov.co', activo: true },
  { id: 'personeria', nombre: 'Personería Municipal', correo: 'info@personeria.gov.co', activo: true },
  { id: 'otra-entidad', nombre: 'Otra Entidad Competente', correo: 'contacto@entidad.gov.co', activo: true }
];

// ✅ Plantillas de Autos y Providencias por defecto
const PLANTILLAS_AUTOS_DEFECTO: PlantillaAuto[] = [
  {
    id: 'auto-001',
    tipo: 'Auto de Apertura de Indagación Preliminar',
    nombre: 'Apertura Indagación',
    etapa: 'INDAGACION',
    descripcionUso: 'Usar cuando se recibe una queja o denuncia y se decide iniciar la etapa de indagación preliminar para verificar si hay mérito para abrir investigación formal.',
    contenido: `AUTO No. {numero_auto}

Bogotá D.C., {fecha}

El suscrito, {funcionario_sustanciador}, {cargo_sustanciador}, en ejercicio de sus funciones legales y en especial las conferidas por la Ley 734 de 2002, y

CONSIDERANDO:

Que mediante {tipo_documento} con radicado No. {numero_radicado} se puso en conocimiento de esta Oficina de Control Interno Disciplinario hechos que podrían configurar falta disciplinaria.

Que los hechos descritos son: {hechos}

Que es deber de la Oficina de Control Interno Disciplinario verificar si los hechos puestos en conocimiento ameritan la apertura de investigación disciplinaria formal.

Por lo anterior,

RESUELVE:

ARTÍCULO PRIMERO: Abrir indagación preliminar con el fin de establecer la veracidad de los hechos y determinar si amerita la apertura de investigación disciplinaria.

ARTÍCULO SEGUNDO: Ordenar la práctica de las siguientes diligencias: {diligencias_ordenadas}

NOTIFÍQUESE Y CÚMPLASE

{funcionario_sustanciador}
{cargo_sustanciador}`,
    variables: ['numero_auto', 'fecha', 'funcionario_sustanciador', 'cargo_sustanciador', 'tipo_documento', 'numero_radicado', 'hechos', 'diligencias_ordenadas'],
    activo: true
  },
  {
    id: 'auto-002',
    tipo: 'Auto de Apertura de Investigación Disciplinaria',
    nombre: 'Apertura Investigación',
    etapa: 'INVESTIGACION',
    descripcionUso: 'Usar cuando después de la indagación preliminar se determina que hay mérito suficiente para iniciar formalmente la investigación disciplinaria.',
    contenido: `AUTO No. {numero_auto}

Bogotá D.C., {fecha}

El suscrito, {funcionario_sustanciador}, {cargo_sustanciador}, en ejercicio de sus funciones legales y en especial las conferidas por la Ley 734 de 2002, y

CONSIDERANDO:

Que mediante Auto No. {numero_auto_indagacion} se abrió indagación preliminar.

Que del análisis de los hechos y las pruebas recaudadas se establece que existen méritos suficientes para abrir investigación disciplinaria formal.

Que los hechos materia de investigación son: {hechos}

Que las normas presuntamente violadas son: {normas_presuntamente_violadas}

Por lo anterior,

RESUELVE:

ARTÍCULO PRIMERO: Abrir investigación disciplinaria en contra de {nombre_investigado}, identificado(a) con cédula de ciudadanía No. {cedula_investigado}, quien desempeña el cargo de {cargo_investigado} en {dependencia}.

ARTÍCULO SEGUNDO: Vincular formalmente al investigado y ordenar su notificación personal.

ARTÍCULO TERCERO: Ordenar la práctica de las siguientes pruebas: {pruebas_ordenadas}

NOTIFÍQUESE Y CÚMPLASE

{funcionario_sustanciador}
{cargo_sustanciador}`,
    variables: ['numero_auto', 'fecha', 'funcionario_sustanciador', 'cargo_sustanciador', 'numero_auto_indagacion', 'hechos', 'normas_presuntamente_violadas', 'nombre_investigado', 'cedula_investigado', 'cargo_investigado', 'dependencia', 'pruebas_ordenadas'],
    activo: true
  },
  {
    id: 'providencia-001',
    tipo: 'Pliego de Cargos',
    nombre: 'Pliego de Cargos',
    etapa: 'CARGOS',
    descripcionUso: 'Usar cuando se ha concluido la etapa de investigación y se procede a formular cargos concretos contra el investigado. Este es el documento más importante del proceso.',
    contenido: `PLIEGO DE CARGOS No. {numero_pliego}

Bogotá D.C., {fecha}

El suscrito, {funcionario_sustanciador}, {cargo_sustanciador}, en uso de las facultades legales, en especial las consagradas en la Ley 734 de 2002, procede a formular pliego de cargos en contra de:

INVESTIGADO: {nombre_investigado}
IDENTIFICACIÓN: {cedula_investigado}
CARGO: {cargo_investigado}
DEPENDENCIA: {dependencia}

HECHOS:

{hechos}

CARGOS:

Se imputa al investigado la presunta comisión de las siguientes faltas disciplinarias:

{cargos_formulados}

NORMAS PRESUNTAMENTE VIOLADAS:

{normas_presuntamente_violadas}

CALIFICACIÓN PROVISIONAL:

La conducta descrita se califica provisionalmente como FALTA DISCIPLINARIA GRAVÍSIMA/GRAVE/LEVE.

TÉRMINO PARA DESCARGOS:

Se concede al investigado el término de DIEZ (10) días hábiles contados a partir de la notificación del presente pliego de cargos para que presente sus descargos por escrito y solicite las pruebas que considere pertinentes.

NOTIFÍQUESE PERSONALMENTE

{funcionario_sustanciador}
{cargo_sustanciador}`,
    variables: ['numero_pliego', 'fecha', 'funcionario_sustanciador', 'cargo_sustanciador', 'nombre_investigado', 'cedula_investigado', 'cargo_investigado', 'dependencia', 'hechos', 'cargos_formulados', 'normas_presuntamente_violadas'],
    activo: true
  },
  {
    id: 'auto-003',
    tipo: 'Auto de Archivo',
    nombre: 'Auto de Archivo',
    etapa: 'ARCHIVO',
    descripcionUso: 'Usar cuando se determina en cualquier etapa del proceso que no hay mérito para continuar con la investigación disciplinaria.',
    contenido: `AUTO No. {numero_auto}

Bogotá D.C., {fecha}

El suscrito, {funcionario_sustanciador}, {cargo_sustanciador}, en ejercicio de sus funciones legales, y

CONSIDERANDO:

Que mediante {acto_administrativo_previo} se dio inicio a {tipo_actuacion}.

Que del análisis de las pruebas recaudadas y los hechos investigados se establece que: {motivacion_archivo}

Que conforme a lo establecido en el artículo 73 de la Ley 734 de 2002, procede el archivo de las diligencias cuando los hechos no constituyen falta disciplinaria o cuando no se logra su comprobación.

Por lo anterior,

RESUELVE:

ARTÍCULO ÚNICO: Archivar definitivamente las diligencias adelantadas por esta Oficina de Control Interno Disciplinario.

NOTIFÍQUESE Y CÚMPLASE

{funcionario_sustanciador}
{cargo_sustanciador}`,
    variables: ['numero_auto', 'fecha', 'funcionario_sustanciador', 'cargo_sustanciador', 'acto_administrativo_previo', 'tipo_actuacion', 'motivacion_archivo'],
    activo: true
  },
  {
    id: 'providencia-002',
    tipo: 'Fallo de Primera Instancia',
    nombre: 'Fallo',
    etapa: 'FALLO',
    descripcionUso: 'Usar cuando se ha concluido toda la etapa probatoria y de descargos, y se procede a emitir la decisión final del proceso disciplinario.',
    contenido: `FALLO DE PRIMERA INSTANCIA No. {numero_fallo}

Bogotá D.C., {fecha}

El suscrito, {funcionario_sustanciador}, {cargo_sustanciador}, en uso de las facultades legales, profiere el siguiente fallo dentro del proceso disciplinario adelantado en contra de:

INVESTIGADO: {nombre_investigado}
IDENTIFICACIÓN: {cedula_investigado}
CARGO: {cargo_investigado}
DEPENDENCIA: {dependencia}

ANTECEDENTES:

{antecedentes_proceso}

HECHOS PROBADOS:

{hechos_probados}

CONSIDERACIONES:

{consideraciones_juridicas}

DECISIÓN:

Por lo expuesto, este Despacho,

RESUELVE:

ARTÍCULO PRIMERO: {decision_articulo_primero}

ARTÍCULO SEGUNDO: CONTRA EL PRESENTE FALLO proceden los recursos de reposición y apelación, los cuales deberán interponerse dentro de los DIEZ (10) días hábiles siguientes a la notificación del presente acto administrativo.

NOTIFÍQUESE PERSONALMENTE

{funcionario_sustanciador}
{cargo_sustanciador}`,
    variables: ['numero_fallo', 'fecha', 'funcionario_sustanciador', 'cargo_sustanciador', 'nombre_investigado', 'cedula_investigado', 'cargo_investigado', 'dependencia', 'antecedentes_proceso', 'hechos_probados', 'consideraciones_juridicas', 'decision_articulo_primero'],
    activo: true
  }
];

// ✅ Tipos de carpeta para el expediente electrónico
const TIPOS_CARPETA_DEFECTO: TipoCarpeta[] = [
  { id: 'documentos-iniciales', nombre: 'Documentos Iniciales', descripcion: 'Denuncia, queja o informe disciplinario', color: '#3B82F6', icono: '📝', orden: 1, activo: true },
  { id: 'auto-apertura', nombre: 'Auto de Apertura', descripcion: 'Auto de apertura de investigación', color: '#10B981', icono: '⚖️', orden: 2, activo: true },
  { id: 'pruebas', nombre: 'Pruebas', descripcion: 'Evidencias y documentos probatorios', color: '#F59E0B', icono: '📎', orden: 3, activo: true },
  { id: 'declaraciones', nombre: 'Declaraciones', descripcion: 'Declaraciones de testigos e investigados', color: '#8B5CF6', icono: '🎤', orden: 4, activo: true },
  { id: 'comunicaciones', nombre: 'Comunicaciones', descripcion: 'Oficios, notificaciones y correspondencia', color: '#EC4899', icono: '📧', orden: 5, activo: true },
  { id: 'autos-providencias', nombre: 'Autos y Providencias', descripcion: 'Autos y providencias del proceso', color: '#06B6D4', icono: '📋', orden: 6, activo: true },
  { id: 'fallo', nombre: 'Fallo', descripcion: 'Fallo final del proceso disciplinario', color: '#EF4444', icono: '⚡', orden: 7, activo: true },
  { id: 'recursos', nombre: 'Recursos', descripcion: 'Recursos de apelación y reposición', color: '#6366F1', icono: '🔄', orden: 8, activo: true },
];

// ✅ Tipos de oficios para el expediente electrónico
const TIPOS_OFICIO_DEFECTO: TipoOficio[] = [
  { id: 'oficio-001', nombre: 'Oficio de Apertura', codigo: 'OA-001', descripcion: 'Oficio para abrir un nuevo proceso disciplinario', activo: true },
  { id: 'oficio-002', nombre: 'Oficio de Investigación', codigo: 'OI-002', descripcion: 'Oficio para solicitar información adicional', activo: true },
  { id: 'oficio-003', nombre: 'Oficio de Cierre', codigo: 'OC-003', descripcion: 'Oficio para cerrar un proceso disciplinario', activo: true },
  { id: 'oficio-004', nombre: 'Oficio de Revisión', codigo: 'OR-004', descripcion: 'Oficio para solicitar una revisión del proceso', activo: true },
  { id: 'oficio-005', nombre: 'Oficio de Notificación', codigo: 'ON-005', descripcion: 'Oficio para notificar a las partes interesadas', activo: true },
];

// ✅ Plantillas de actas para el expediente electrónico
const PLANTILLAS_ACTA_DEFECTO: PlantillaActa[] = [
  { id: 'acta-001', nombre: 'Acta de Apertura', tipo: 'apertura', descripcion: 'Acta para registrar la apertura de un proceso disciplinario', archivo: 'acta_apertura.pdf', fechaCarga: '2023-10-01', activo: true },
  { id: 'acta-002', nombre: 'Acta de Investigación', tipo: 'investigacion', descripcion: 'Acta para registrar la investigación realizada', archivo: 'acta_investigacion.pdf', fechaCarga: '2023-10-02', activo: true },
  { id: 'acta-003', nombre: 'Acta de Cierre', tipo: 'cierre', descripcion: 'Acta para registrar el cierre de un proceso disciplinario', archivo: 'acta_cierre.pdf', fechaCarga: '2023-10-03', activo: true },
  { id: 'acta-004', nombre: 'Acta de Revisión', tipo: 'revision', descripcion: 'Acta para registrar una revisión del proceso', archivo: 'acta_revision.pdf', fechaCarga: '2023-10-04', activo: true },
  { id: 'acta-005', nombre: 'Acta de Notificación', tipo: 'notificacion', descripcion: 'Acta para registrar una notificación a las partes interesadas', archivo: 'acta_notificacion.pdf', fechaCarga: '2023-10-05', activo: true },
];

// ============ COMPONENTE PRINCIPAL ============

export function ModuloConfiguracionRelacionado() {
  const [moduloActivo, setModuloActivo] = useState<string>('dashboard');
  const [tabActivo, setTabActivo] = useState<'estados' | 'cargos' | 'plantillas' | 'entidades' | 'notificaciones' | 'alertas'>('estados');
  const [cambiosPendientes, setCambiosPendientes] = useState(false);

  // Estados
  const [estadosKanban, setEstadosKanban] = useState<EstadoKanban[]>(ESTADOS_KANBAN_DEFECTO);
  const [cargos, setCargos] = useState<Cargo[]>(CARGOS_DEFECTO);
  const [notificaciones, setNotificaciones] = useState<ConfiguracionNotificaciones>(NOTIFICACIONES_DEFECTO);
  const [alertas, setAlertas] = useState<ConfiguracionAlertas>(ALERTAS_DEFECTO);
  const [entidadesRemision, setEntidadesRemision] = useState<EntidadRemision[]>(ENTIDADES_REMISION_DEFECTO);
  const [plantillasAutos, setPlantillasAutos] = useState<PlantillaAuto[]>(PLANTILLAS_AUTOS_DEFECTO);
  const [tiposCarpeta, setTiposCarpeta] = useState<TipoCarpeta[]>(TIPOS_CARPETA_DEFECTO);
  const [tiposOficio, setTiposOficio] = useState<TipoOficio[]>(TIPOS_OFICIO_DEFECTO);
  const [plantillasActa, setPlantillasActa] = useState<PlantillaActa[]>(PLANTILLAS_ACTA_DEFECTO);

  // Drag and Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ✅ Cargar configuración desde localStorage al iniciar
  useEffect(() => {
    try {
      const configString = localStorage.getItem('disciplinario-configuracion');
      if (configString) {
        const config = JSON.parse(configString);
        if (config.estadosKanban) setEstadosKanban(config.estadosKanban);
        if (config.cargos) setCargos(config.cargos);
        if (config.notificaciones) setNotificaciones(config.notificaciones);
        if (config.alertas) setAlertas(config.alertas);
        if (config.entidadesRemision) setEntidadesRemision(config.entidadesRemision);
        if (config.plantillasAutos) setPlantillasAutos(config.plantillasAutos);
        if (config.tiposCarpeta) setTiposCarpeta(config.tiposCarpeta);
        if (config.tiposOficio) setTiposOficio(config.tiposOficio);
        if (config.plantillasActa) setPlantillasActa(config.plantillasActa);
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error);
    }
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setEstadosKanban((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((item, index) => ({ ...item, orden: index + 1 }));
      });
      setCambiosPendientes(true);
    }
  };

  const guardarConfiguraciones = () => {
    const config = {
      estadosKanban,
      cargos,
      notificaciones,
      alertas,
      entidadesRemision,
      plantillasAutos,
      tiposCarpeta,
      tiposOficio,
      plantillasActa
    };
    localStorage.setItem('disciplinario-configuracion', JSON.stringify(config));
    toast.success('Configuración guardada exitosamente', {
      description: 'Los cambios se han aplicado a todos los módulos relacionados',
      duration: 3000,
    });
    setCambiosPendientes(false);
  };

  const restablecerDefecto = () => {
    if (confirm('¿Estás seguro de restablecer la configuración por defecto? Se perderán todos los cambios actuales.')) {
      setEstadosKanban(ESTADOS_KANBAN_DEFECTO);
      setCargos(CARGOS_DEFECTO);
      setNotificaciones(NOTIFICACIONES_DEFECTO);
      setAlertas(ALERTAS_DEFECTO);
      setEntidadesRemision(ENTIDADES_REMISION_DEFECTO);
      setPlantillasAutos(PLANTILLAS_AUTOS_DEFECTO);
      setTiposCarpeta(TIPOS_CARPETA_DEFECTO);
      setTiposOficio(TIPOS_OFICIO_DEFECTO);
      setPlantillasActa(PLANTILLAS_ACTA_DEFECTO);
      setCambiosPendientes(false);
      toast.success('Configuración restaurada a valores por defecto');
    }
  };

  // Definición de módulos disciplinarios
  const modulosDisciplinarios = [
    {
      id: 'dashboard',
      nombre: 'Procesos (Kanban)',
      icon: LayoutDashboard,
      estadosCount: estadosKanban.filter(e => e.activo).length + entidadesRemision.filter(e => e.activo).length,
      descripcion: 'Estados, columnas y entidades de remisión'
    },
    {
      id: 'profesionales',
      nombre: 'Profesionales',
      icon: Users,
      estadosCount: cargos.filter(c => c.activo).length,
      descripcion: 'Cargos y capacidad'
    },
    {
      id: 'autos',
      nombre: 'Autos y Providencias',
      icon: FileText,
      estadosCount: plantillasAutos.filter(p => p.activo).length,
      descripcion: 'Plantillas de documentos'
    },
    {
      id: 'oficios',
      nombre: 'Oficios',
      icon: Mail,
      estadosCount: tiposOficio.filter(t => t.activo).length,
      descripcion: 'Tipos de oficios'
    },
    {
      id: 'actas',
      nombre: 'Actas',
      icon: FileText,
      estadosCount: plantillasActa.filter(p => p.activo).length,
      descripcion: 'Plantillas de actas'
    },
    {
      id: 'expediente',
      nombre: 'Expediente Electrónico',
      icon: Archive,
      estadosCount: tiposCarpeta.filter(t => t.activo).length,
      descripcion: 'Tipos de carpeta'
    },
    {
      id: 'terminos',
      nombre: 'Términos y Alertas',
      icon: Clock,
      estadosCount: Object.values(notificaciones).filter(v => v).length,
      descripcion: 'Notificaciones y umbrales'
    },
    {
      id: 'aprobacion',
      nombre: 'Revisión y Aprobación',
      icon: CheckCircle,
      estadosCount: 3,
      descripcion: 'Niveles de aprobación'
    }
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
          <div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E0EDFF' }}>
                <Settings size={20} className="sm:w-6 sm:h-6" style={{ color: '#003DA5' }} />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold" style={{ color: '#003DA5' }}>
                  Configuraciones Disciplinarias
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                  Gestiona la configuración de cada módulo del sistema disciplinario
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {cambiosPendientes && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                <AlertCircle className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Cambios sin guardar</span>
                <span className="sm:hidden">Sin guardar</span>
              </span>
            )}
            <button
              onClick={restablecerDefecto}
              className="flex items-center gap-1 sm:gap-2 px-3 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all flex-shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Restablecer</span>
            </button>
            <button
              onClick={guardarConfiguraciones}
              disabled={!cambiosPendientes}
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                background: cambiosPendientes ? 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' : '#9CA3AF',
                boxShadow: cambiosPendientes ? '0 2px 4px rgba(41, 98, 255, 0.2)' : 'none'
              }}
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Guardar Cambios</span>
              <span className="sm:hidden">Guardar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* Sidebar de Módulos */}
        <div className="lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 overflow-y-auto">
          <div className="p-3 sm:p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 sm:mb-3">
              Módulos Disciplinarios
            </h3>
            <div className="space-y-1 flex lg:flex-col overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
              {modulosDisciplinarios.map((modulo) => {
                const Icon = modulo.icon;
                return (
                  <button
                    key={modulo.id}
                    onClick={() => {
                      setModuloActivo(modulo.id);
                      // Reset tab cuando cambia de módulo
                      if (modulo.id === 'dashboard') setTabActivo('estados');
                      else if (modulo.id === 'profesionales') setTabActivo('cargos');
                      else if (modulo.id === 'autos') setTabActivo('plantillas');
                      else if (modulo.id === 'expediente') setTabActivo('entidades');
                      else if (modulo.id === 'terminos') setTabActivo('notificaciones');
                      else if (modulo.id === 'aprobacion') setTabActivo('estados');
                    }}
                    className={`flex-shrink-0 lg:w-full text-left px-3 py-2 sm:py-2.5 rounded-lg transition-colors whitespace-nowrap lg:whitespace-normal ${
                      moduloActivo === modulo.id
                        ? 'bg-blue-50 text-blue-900 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span className="text-xs sm:text-sm">{modulo.nombre}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 ml-6 hidden lg:flex">
                      <span className="text-xs text-gray-500">
                        {modulo.estadosCount} configuraciones
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Panel Principal */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Banner informativo del módulo */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-4 sm:p-6">
              <div className="flex gap-4">
                {(() => {
                  const modulo = modulosDisciplinarios.find(m => m.id === moduloActivo);
                  const Icon = modulo?.icon || Settings;
                  return (
                    <>
                      <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
                      <div>
                        <h3 className="font-bold text-blue-900 text-lg sm:text-xl mb-2">
                          Configuración de {modulo?.nombre}
                        </h3>
                        <p className="text-blue-700 text-sm sm:text-base mb-3">
                          {getDescripcionModulo(moduloActivo)}
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-semibold">
                            Módulo: {modulo?.nombre}
                          </span>
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs sm:text-sm font-semibold">
                            Impacto: Alto
                          </span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Contenido específico por módulo */}
            {moduloActivo === 'dashboard' && (
              <ConfiguracionDashboard
                estadosKanban={estadosKanban}
                setEstadosKanban={setEstadosKanban}
                entidadesRemision={entidadesRemision}
                setEntidadesRemision={setEntidadesRemision}
                setCambiosPendientes={setCambiosPendientes}
                sensors={sensors}
                handleDragEnd={handleDragEnd}
                tabActivo={tabActivo}
                setTabActivo={setTabActivo}
              />
            )}

            {moduloActivo === 'profesionales' && (
              <ConfiguracionProfesionales
                cargos={cargos}
                setCargos={setCargos}
                setCambiosPendientes={setCambiosPendientes}
              />
            )}

            {moduloActivo === 'autos' && (
              <ConfiguracionAutos
                plantillasAutos={plantillasAutos}
                setPlantillasAutos={setPlantillasAutos}
                setCambiosPendientes={setCambiosPendientes}
              />
            )}

            {moduloActivo === 'oficios' && (
              <ConfiguracionOficios
                tiposOficio={tiposOficio}
                setTiposOficio={setTiposOficio}
                setCambiosPendientes={setCambiosPendientes}
              />
            )}

            {moduloActivo === 'actas' && (
              <ConfiguracionActas
                plantillasActa={plantillasActa}
                setPlantillasActa={setPlantillasActa}
                setCambiosPendientes={setCambiosPendientes}
              />
            )}

            {moduloActivo === 'expediente' && (
              <ConfiguracionExpediente
                tiposCarpeta={tiposCarpeta}
                setTiposCarpeta={setTiposCarpeta}
                setCambiosPendientes={setCambiosPendientes}
              />
            )}

            {moduloActivo === 'terminos' && (
              <ConfiguracionTerminos
                notificaciones={notificaciones}
                setNotificaciones={setNotificaciones}
                alertas={alertas}
                setAlertas={setAlertas}
                setCambiosPendientes={setCambiosPendientes}
              />
            )}

            {moduloActivo === 'aprobacion' && (
              <ConfiguracionAprobacion />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ FUNCIONES AUXILIARES ============

function getDescripcionModulo(modulo: string): string {
  const descripciones: Record<string, string> = {
    dashboard: 'Configura las columnas del tablero Kanban, tiempos estándar de cada etapa del proceso disciplinario y las entidades externas para remisión por competencia. Los cambios afectarán directamente la visualización y gestión de procesos.',
    profesionales: 'Configura los tipos de cargo y la capacidad de carga de trabajo para cada profesional. Esta configuración se utiliza para la asignación automática de procesos y el control de sobrecarga.',
    autos: 'Administra las plantillas de documentos disciplinarios que se utilizan para generar autos y providencias. Las variables configuradas permiten la personalización automática de documentos.',
    oficios: 'Configura los tipos de oficios que se utilizan para generar documentos oficiales. Cada tipo de oficio tiene un código único y una descripción detallada.',
    actas: 'Administra las plantillas de actas que se utilizan para generar documentos oficiales. Las variables configuradas permiten la personalización automática de documentos.',
    expediente: 'Configura los tipos de carpeta del expediente electrónico disciplinario. Cada tipo de carpeta organiza los documentos según su naturaleza procesal y facilita la búsqueda y consulta.',
    terminos: 'Define el sistema de notificaciones automáticas y los umbrales de alerta. Estas configuraciones determinan cuándo y cómo se enviarán las alertas de vencimiento a los profesionales.',
    aprobacion: 'Configura el flujo de aprobaciones y los niveles de autorización para documentos disciplinarios. Esta configuración determina quién puede aprobar o rechazar documentos.'
  };
  return descripciones[modulo] || '';
}

// ============ COMPONENTES DE CONFIGURACIÓN POR MÓDULO ============

// Configuración Dashboard/Procesos
function ConfiguracionDashboard(props: any) {
  const { estadosKanban, setEstadosKanban, entidadesRemision, setEntidadesRemision, setCambiosPendientes, sensors, handleDragEnd, tabActivo, setTabActivo } = props;

  function SortableEstado({ estado }: { estado: EstadoKanban }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: estado.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    // Función para eliminar un estado
    const eliminarEstado = async (id: string) => {
      if (confirm('¿Estás seguro de eliminar este estado? Esta acción puede afectar procesos existentes.')) {
        try {
          // Intentar eliminar en el backend si es un UUID válido
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(id)) {
            await disciplinaryService.deleteStage(id);
          }
          // Eliminar localmente
          const nuevosEstados = estadosKanban.filter((e: EstadoKanban) => e.id !== id);
          setEstadosKanban(nuevosEstados.map((e: EstadoKanban, index: number) => ({ ...e, orden: index + 1 })));
          setCambiosPendientes(true);
          toast.success('Estado eliminado correctamente');
        } catch (error) {
          console.error('Error al eliminar estado:', error);
          // Eliminar localmente aunque falle el backend
          const nuevosEstados = estadosKanban.filter((e: EstadoKanban) => e.id !== id);
          setEstadosKanban(nuevosEstados.map((e: EstadoKanban, index: number) => ({ ...e, orden: index + 1 })));
          setCambiosPendientes(true);
          toast.success('Estado eliminado correctamente');
        }
      }
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-white rounded-lg border-2 border-gray-200 p-3 sm:p-4 hover:border-blue-300 transition-all"
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            {...attributes}
            {...listeners}
            className="cursor-move text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <GripVertical className="w-5 h-5" />
          </button>
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: estado.color }}
          ></div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-gray-900 text-sm sm:text-base truncate">{estado.nombre}</h4>
            <p className="text-xs sm:text-sm text-gray-600">
              {estado.dias} días • Alerta: {estado.alertaDias} días antes
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
              estado.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {estado.activo ? 'Activo' : 'Inactivo'}
            </span>
            <button
              onClick={() => {
                const nuevosEstados = estadosKanban.map((e: EstadoKanban) =>
                  e.id === estado.id ? { ...e, activo: !e.activo } : e
                );
                setEstadosKanban(nuevosEstados);
                setCambiosPendientes(true);
              }}
              className="min-h-[44px] min-w-[44px] p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
              title={estado.activo ? 'Desactivar' : 'Activar'}
            >
              <Edit3 className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => eliminarEstado(estado.id)}
              className="min-h-[44px] min-w-[44px] p-2 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ✅ Tabs de navegación */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setTabActivo('estados')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm whitespace-nowrap transition-colors ${
              tabActivo === 'estados'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Estados Kanban
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              tabActivo === 'estados' ? 'bg-white/20' : 'bg-gray-200'
            }`}>
              {estadosKanban.filter(e => e.activo).length}
            </span>
          </button>
          <button
            onClick={() => setTabActivo('entidades')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm whitespace-nowrap transition-colors ${
              tabActivo === 'entidades'
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Mail className="w-4 h-4" />
            Entidades de Remisión
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              tabActivo === 'entidades' ? 'bg-white/20' : 'bg-gray-200'
            }`}>
              {entidadesRemision.filter(e => e.activo).length}
            </span>
          </button>
        </div>
      </div>

      {/* Contenido de tab: Estados Kanban */}
      {tabActivo === 'estados' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#003DA5' }} />
                  Estados / Columnas Kanban
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Arrastra para reordenar las etapas del proceso disciplinario
                </p>
              </div>
              <button
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm text-white transition-all hover:shadow-lg flex-shrink-0"
                style={{ 
                  background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
                  boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
                }}
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Estado</span>
              </button>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={estadosKanban.map((e: EstadoKanban) => e.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {estadosKanban.map((estado: EstadoKanban) => (
                    <SortableEstado key={estado.id} estado={estado} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Vista Previa del Tablero */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                Vista Previa del Tablero Kanban
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                {estadosKanban.filter((e: EstadoKanban) => e.activo).map((estado: EstadoKanban) => (
                  <div key={estado.id} className="bg-white rounded-lg p-2 sm:p-3 border-2 border-gray-200">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                      <div
                        className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
                        style={{ backgroundColor: estado.color }}
                      ></div>
                      <h4 className="font-bold text-xs sm:text-sm text-gray-900 truncate">{estado.nombre}</h4>
                    </div>
                    <p className="text-xs text-gray-600">{estado.dias} días</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Contenido de tab: Entidades de Remisión */}
      {tabActivo === 'entidades' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                  Entidades de Remisión por Competencia
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Administra las entidades externas para remisión de procesos disciplinarios
                </p>
              </div>
              <button
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm text-white transition-all hover:shadow-lg flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #9333EA 0%, #7E22CE 100%)',
                  boxShadow: '0 2px 4px rgba(147, 51, 234, 0.2)'
                }}
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Entidad</span>
              </button>
            </div>

            <div className="space-y-3">
              {entidadesRemision.map((entidad: EntidadRemision) => (
                <div
                  key={entidad.id}
                  className="bg-white rounded-lg border-2 border-gray-200 p-3 sm:p-4 hover:border-purple-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base">{entidad.nombre}</h4>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 flex items-center gap-1 break-all">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        {entidad.correo}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                        entidad.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {entidad.activo ? 'Activa' : 'Inactiva'}
                      </span>
                      <button
                        onClick={() => {
                          const nuevasEntidades = entidadesRemision.map((e: EntidadRemision) =>
                            e.id === entidad.id ? { ...e, activo: !e.activo } : e
                          );
                          setEntidadesRemision(nuevasEntidades);
                          setCambiosPendientes(true);
                        }}
                        className="min-h-[44px] min-w-[44px] p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
                      >
                        <Edit3 className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Configuración Profesionales
function ConfiguracionProfesionales(props: any) {
  const { cargos, setCargos, setCambiosPendientes } = props;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-3">
          <div>
            <h3 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              Cargos y Capacidad de Carga
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Configura los tipos de cargo y el número máximo de procesos simultáneos
            </p>
          </div>
          <button
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold transition-all shadow-md text-sm"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            Nuevo Cargo
          </button>
        </div>

        <div className="space-y-3">
          {cargos.map((cargo: Cargo) => (
            <div
              key={cargo.id}
              className="bg-white rounded-lg border-2 border-gray-200 p-3 sm:p-4 hover:border-blue-300 transition-all"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 text-sm sm:text-base truncate">{cargo.nombre}</h4>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Capacidad máxima: <strong>{cargo.capacidad}</strong> procesos simultáneos
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                    cargo.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {cargo.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  <button className="min-h-[44px] min-w-[44px] p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center">
                    <Edit3 className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4 sm:p-6">
          <div className="text-center">
            <p className="text-gray-600 text-xs sm:text-sm mb-2">Cargos Activos</p>
            <p className="text-3xl sm:text-4xl font-bold text-blue-600">
              {cargos.filter((c: Cargo) => c.activo).length}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4 sm:p-6">
          <div className="text-center">
            <p className="text-gray-600 text-xs sm:text-sm mb-2">Capacidad Promedio</p>
            <p className="text-3xl sm:text-4xl font-bold text-green-600">
              {Math.round(cargos.reduce((sum: number, c: Cargo) => sum + c.capacidad, 0) / cargos.length)}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4 sm:p-6">
          <div className="text-center">
            <p className="text-gray-600 text-xs sm:text-sm mb-2">Capacidad Total</p>
            <p className="text-3xl sm:text-4xl font-bold text-purple-600">
              {cargos.filter((c: Cargo) => c.activo).reduce((sum: number, c: Cargo) => sum + c.capacidad, 0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Configuración Autos y Providencias
function ConfiguracionAutos(props: any) {
  const { plantillasAutos, setPlantillasAutos, setCambiosPendientes } = props;
  const [mostrarModal, setMostrarModal] = useState(false);
  const [plantillaEdicion, setPlantillaEdicion] = useState<PlantillaAuto | null>(null);

  const abrirModalNuevo = () => {
    setPlantillaEdicion(null);
    setMostrarModal(true);
  };

  const abrirModalEditar = (plantilla: PlantillaAuto) => {
    setPlantillaEdicion(plantilla);
    setMostrarModal(true);
  };

  const guardarPlantilla = (plantilla: PlantillaAuto) => {
    if (plantillaEdicion) {
      // Editar existente
      const nuevasPlantillas = plantillasAutos.map((p: PlantillaAuto) =>
        p.id === plantilla.id ? plantilla : p
      );
      setPlantillasAutos(nuevasPlantillas);
      toast.success('Plantilla actualizada correctamente');
    } else {
      // Crear nueva
      setPlantillasAutos([...plantillasAutos, { ...plantilla, id: Date.now().toString() }]);
      toast.success('Plantilla creada correctamente');
    }
    setCambiosPendientes(true);
    setMostrarModal(false);
  };

  return (
    <>
      <SeccionPlantillasAutos
        plantillas={plantillasAutos}
        onAgregar={abrirModalNuevo}
        onEditar={abrirModalEditar}
        onEliminar={(id: string) => {
          const nuevasPlantillas = plantillasAutos.filter((p: PlantillaAuto) => p.id !== id);
          setPlantillasAutos(nuevasPlantillas);
          setCambiosPendientes(true);
          toast.success('Plantilla eliminada correctamente');
        }}
        onToggleActivo={(id: string, activo: boolean) => {
          const nuevasPlantillas = plantillasAutos.map((p: PlantillaAuto) =>
            p.id === id ? { ...p, activo } : p
          );
          setPlantillasAutos(nuevasPlantillas);
          setCambiosPendientes(true);
        }}
      />
      
      {mostrarModal && (
        <ModalEdicionPlantillaAuto
          plantilla={plantillaEdicion}
          onGuardar={guardarPlantilla}
          onCancelar={() => setMostrarModal(false)}
        />
      )}
    </>
  );
}

// Configuración Oficios
function ConfiguracionOficios(props: any) {
  const { tiposOficio, setTiposOficio, setCambiosPendientes } = props;
  const [mostrarModalOficio, setMostrarModalOficio] = useState(false);
  const [oficiEdicion, setOficiEdicion] = useState<TipoOficio | null>(null);

  // ✅ Usar el hook de configuración de oficios desde el backend
  const { 
    configurations: oficiosFromBackend, 
    loading, 
    error,
    fetchConfigurations,
    createConfiguration,
    updateConfiguration,
    deleteConfiguration,
    toggleEstado 
  } = useOficiosConfiguration();

  // ✅ Cargar configuraciones al montar el componente
  useEffect(() => {
    fetchConfigurations();
  }, [fetchConfigurations]);

  // ✅ Sincronizar con el estado del padre si hay datos del backend
  useEffect(() => {
    if (oficiosFromBackend.length > 0) {
      // Mapear del formato del backend al formato local
      const mappedTipos: TipoOficio[] = oficiosFromBackend.map((oficio: any) => ({
        id: oficio.id,
        nombre: oficio.nombre,
        codigo: oficio.codigo,
        descripcion: oficio.descripcion,
        activo: oficio.estado === 'activo'
      }));
      setTiposOficio(mappedTipos);
    }
  }, [oficiosFromBackend, setTiposOficio]);

  const abrirModalNuevo = () => {
    setOficiEdicion(null);
    setMostrarModalOficio(true);
  };

  const abrirModalEditar = (oficio: TipoOficio) => {
    setOficiEdicion(oficio);
    setMostrarModalOficio(true);
  };

  // ✅ Función para guardar que también sincroniza con el backend
  const guardarOficio = async (oficio: TipoOficio) => {
    try {
      if (oficiEdicion) {
        // Actualizar en backend
        await updateConfiguration(oficio.id, {
          nombre: oficio.nombre,
          codigo: oficio.codigo,
          descripcion: oficio.descripcion,
          estado: oficio.activo ? 'activo' : 'inactivo'
        });
        // Actualizar estado local
        const nuevosTipos = tiposOficio.map((t: TipoOficio) =>
          t.id === oficio.id ? oficio : t
        );
        setTiposOficio(nuevosTipos);
        toast.success('Tipo de oficio actualizado');
      } else {
        // Crear en backend
        const newOficio = await createConfiguration({
          tipo: oficio.nombre.toUpperCase().replace(/\s+/g, '_'),
          nombre: oficio.nombre,
          codigo: oficio.codigo,
          descripcion: oficio.descripcion,
          estado: oficio.activo ? 'activo' : 'inactivo'
        });
        // Agregar al estado local
        setTiposOficio([...tiposOficio, { ...oficio, id: newOficio.id }]);
        toast.success('Tipo de oficio creado');
      }
      setCambiosPendientes(true);
      setMostrarModalOficio(false);
    } catch (err) {
      console.error('Error guardando oficio:', err);
      toast.error('Error al guardar el tipo de oficio');
    }
  };

  // ✅ Función para eliminar que también elimina del backend
  const eliminarOficio = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este tipo de oficio?')) {
      try {
        await deleteConfiguration(id);
        setTiposOficio(tiposOficio.filter((t: TipoOficio) => t.id !== id));
        setCambiosPendientes(true);
        toast.success('Tipo de oficio eliminado');
      } catch (err) {
        console.error('Error eliminando oficio:', err);
        toast.error('Error al eliminar el tipo de oficio');
      }
    }
  };

  // ✅ Función para togglear estado
  const toggleActivo = async (id: string) => {
    try {
      await toggleEstado(id);
      const nuevosTipos = tiposOficio.map((t: TipoOficio) =>
        t.id === id ? { ...t, activo: !t.activo } : t
      );
      setTiposOficio(nuevosTipos);
      setCambiosPendientes(true);
    } catch (err) {
      console.error('Error toggling estado:', err);
    }
  };

  // ✅ Mostrar estado de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-600">Cargando configuraciones...</span>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-3">
          <div>
            <h3 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              Tipos de Oficios
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Configura los tipos de oficios para generar documentos oficiales
            </p>
          </div>
          <button
            onClick={abrirModalNuevo}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 font-semibold transition-all shadow-md text-sm"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            Nuevo Tipo
          </button>
        </div>

        <div className="space-y-3">
          {tiposOficio.length === 0 ? (
            // ✅ Mostrar mensaje cuando no hay oficios en la BD
            <div className="text-center py-12 px-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 mb-4">
                <Mail className="w-8 h-8 text-purple-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                No hay oficios configurados
              </h4>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Comienza configurando los tipos de oficios que se utilizarán para generar documentos oficiales en los procesos disciplinarios.
              </p>
              <button
                onClick={abrirModalNuevo}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 font-semibold transition-all shadow-md"
              >
                <Plus className="w-5 h-5" />
                Crear primer oficio
              </button>
            </div>
          ) : (
            tiposOficio.map((tipo: TipoOficio) => (
              <div
                key={tipo.id}
                className="bg-white rounded-lg border-2 border-gray-200 p-3 sm:p-4 hover:border-purple-300 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base">{tipo.nombre}</h4>
                      <span className="px-2 py-0.5 rounded text-xs font-mono bg-purple-100 text-purple-700">
                        {tipo.codigo}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">{tipo.descripcion}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                      tipo.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tipo.activo ? 'Activo' : 'Inactivo'}
                    </span>
                    <button
                      onClick={() => abrirModalEditar(tipo)}
                      className="min-h-[44px] min-w-[44px] p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
                      title="Editar"
                    >
                      <Edit3 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => eliminarOficio(tipo.id)}
                      className="min-h-[44px] min-w-[44px] p-2 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Vista Previa */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Vista Previa de Oficios Activos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {tiposOficio.filter((t: TipoOficio) => t.activo).map((tipo: TipoOficio) => (
              <div key={tipo.id} className="p-3 bg-white rounded-lg border border-purple-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-purple-600">{tipo.codigo}</span>
                  <Mail className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-sm font-semibold text-gray-800 mt-1 truncate">{tipo.nombre}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal para crear/editar oficio */}
      {mostrarModalOficio && (
        <ModalOficio
          oficio={oficiEdicion}
          onGuardar={guardarOficio}
          onCancelar={() => setMostrarModalOficio(false)}
        />
      )}
    </>
  );
}

// Configuración Actas
function ConfiguracionActas(props: any) {
  const { plantillasActa, setPlantillasActa, setCambiosPendientes } = props;
  const [mostrarModalActa, setMostrarModalActa] = useState(false);
  const [actaEdicion, setActaEdicion] = useState<PlantillaActa | null>(null);
  const [actaVisualizacion, setActaVisualizacion] = useState<PlantillaActa | null>(null);

  const abrirModalNuevo = () => {
    setActaEdicion(null);
    setMostrarModalActa(true);
  };

  const abrirModalEditar = (acta: PlantillaActa) => {
    setActaEdicion(acta);
    setMostrarModalActa(true);
  };

  const guardarActa = (acta: PlantillaActa) => {
    if (actaEdicion) {
      const nuevasPlantillas = plantillasActa.map((t: PlantillaActa) =>
        t.id === acta.id ? acta : t
      );
      setPlantillasActa(nuevasPlantillas);
      toast.success('Plantilla de acta actualizada');
    } else {
      setPlantillasActa([...plantillasActa, acta]);
      toast.success('Plantilla de acta creada');
    }
    setCambiosPendientes(true);
    setMostrarModalActa(false);
  };

  const eliminarActa = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta plantilla de acta?')) {
      setPlantillasActa(plantillasActa.filter((t: PlantillaActa) => t.id !== id));
      setCambiosPendientes(true);
      toast.success('Plantilla de acta eliminada');
    }
  };

  const descargarPlantilla = (acta: PlantillaActa) => {
    toast.success(`Descargando plantilla: ${acta.nombre}`);
    // Aquí se implementaría la descarga real del archivo
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-3">
          <div>
            <h3 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              Plantillas de Actas
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Administra las plantillas de actas disciplinarias disponibles para los funcionarios
            </p>
          </div>
          <button
            onClick={abrirModalNuevo}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold transition-all shadow-md text-sm"
          >
            <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
            Cargar Plantilla
          </button>
        </div>

        <div className="space-y-3">
          {plantillasActa.map((plantilla: PlantillaActa) => (
            <div
              key={plantilla.id}
              className="bg-white rounded-lg border-2 border-gray-200 p-3 sm:p-4 hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 border-2 border-blue-200 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-sm sm:text-base">{plantilla.nombre}</h4>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">{plantilla.descripcion}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <span className="font-semibold">Tipo:</span> {plantilla.tipo}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <span className="font-semibold">Fecha:</span> {plantilla.fechaCarga}
                      </span>
                      {plantilla.archivo && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-semibold">
                          Archivo cargado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                  <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                    plantilla.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {plantilla.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  {plantilla.archivo && (
                    <>
                      <button
                        onClick={() => setActaVisualizacion(plantilla)}
                        className="min-h-[44px] min-w-[44px] p-2 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center"
                        title="Ver plantilla"
                      >
                        <Eye className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => descargarPlantilla(plantilla)}
                        className="min-h-[44px] min-w-[44px] p-2 hover:bg-green-50 rounded-lg transition-colors flex items-center justify-center"
                        title="Descargar plantilla"
                      >
                        <Download className="w-4 h-4 text-green-600" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => abrirModalEditar(plantilla)}
                    className="min-h-[44px] min-w-[44px] p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
                    title="Editar"
                  >
                    <Edit3 className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => eliminarActa(plantilla.id)}
                    className="min-h-[44px] min-w-[44px] p-2 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Estadísticas */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-600 font-semibold mb-1">Total Plantillas</p>
            <p className="text-2xl font-bold text-blue-900">{plantillasActa.length}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-xs text-green-600 font-semibold mb-1">Plantillas Activas</p>
            <p className="text-2xl font-bold text-green-900">
              {plantillasActa.filter((p: PlantillaActa) => p.activo).length}
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-xs text-purple-600 font-semibold mb-1">Con Archivo</p>
            <p className="text-2xl font-bold text-purple-900">
              {plantillasActa.filter((p: PlantillaActa) => p.archivo).length}
            </p>
          </div>
        </div>
      </div>

      {/* Modal para crear/editar acta */}
      {mostrarModalActa && (
        <ModalActa
          acta={actaEdicion}
          onGuardar={guardarActa}
          onCancelar={() => setMostrarModalActa(false)}
        />
      )}

      {/* Modal para visualizar acta */}
      {actaVisualizacion && (
        <ModalVisualizarActa
          acta={actaVisualizacion}
          onCerrar={() => setActaVisualizacion(null)}
          onDescargar={() => descargarPlantilla(actaVisualizacion)}
        />
      )}
    </>
  );
}

// Configuración Expediente Electrónico
function ConfiguracionExpediente(props: any) {
  const { tiposCarpeta, setTiposCarpeta, setCambiosPendientes } = props;

  return (
    <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-3">
        <div>
          <h3 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Archive className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
            Tipos de Carpeta del Expediente
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Configura los tipos de carpeta para organizar documentos del expediente disciplinario
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 font-semibold transition-all shadow-md text-sm"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          Nuevo Tipo
        </button>
      </div>

      <div className="space-y-3">
        {tiposCarpeta.map((tipo: TipoCarpeta) => (
          <div
            key={tipo.id}
            className="bg-white rounded-lg border-2 border-gray-200 p-3 sm:p-4 hover:border-orange-300 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ backgroundColor: tipo.color + '20', border: `2px solid ${tipo.color}` }}
                >
                  {tipo.icono}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 text-sm sm:text-base">{tipo.nombre}</h4>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">{tipo.descripcion}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">Orden: {tipo.orden}</span>
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: tipo.color }}
                      title={tipo.color}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                  tipo.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tipo.activo ? 'Activo' : 'Inactivo'}
                </span>
                <button
                  onClick={() => {
                    const nuevosTipos = tiposCarpeta.map((t: TipoCarpeta) =>
                      t.id === tipo.id ? { ...t, activo: !t.activo } : t
                    );
                    setTiposCarpeta(nuevosTipos);
                    setCambiosPendientes(true);
                  }}
                  className="min-h-[44px] min-w-[44px] p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
                >
                  <Edit3 className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Vista Previa */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Vista Previa del Expediente</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {tiposCarpeta.filter((t: TipoCarpeta) => t.activo).sort((a, b) => a.orden - b.orden).map((tipo: TipoCarpeta) => (
            <div
              key={tipo.id}
              className="text-center p-2 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
              style={{ backgroundColor: tipo.color + '10', border: `1px solid ${tipo.color}` }}
            >
              <div className="text-2xl mb-1">{tipo.icono}</div>
              <p className="text-xs font-semibold text-gray-800 truncate">{tipo.nombre}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Configuración Términos y Alertas
function ConfiguracionTerminos(props: any) {
  const { notificaciones, setNotificaciones, alertas, setAlertas, setCambiosPendientes } = props;

  return (
    <div className="space-y-6">
      {/* Notificaciones */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4 sm:p-6">
        <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
          Notificaciones por Email
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {Object.entries(notificaciones).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
              <label htmlFor={key} className="text-xs sm:text-sm font-medium text-gray-700 cursor-pointer flex-1">
                {getNombreNotificacion(key)}
              </label>
              <input
                id={key}
                type="checkbox"
                checked={value as boolean}
                onChange={(e) => {
                  setNotificaciones({
                    ...notificaciones,
                    [key]: e.target.checked
                  });
                  setCambiosPendientes(true);
                }}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 flex-shrink-0 ml-2"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Umbrales de Alerta */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4 sm:p-6">
        <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
          Umbrales de Semáforo
        </h3>
        
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">
                Umbral Amarillo (Riesgo)
              </label>
              <span className="text-lg font-bold text-amber-600">{alertas.porcentajeRiesgo}%</span>
            </div>
            <input
              type="range"
              min="50"
              max={alertas.porcentajeCritico - 1}
              value={alertas.porcentajeRiesgo}
              onChange={(e) => {
                setAlertas({
                  ...alertas,
                  porcentajeRiesgo: parseInt(e.target.value)
                });
                setCambiosPendientes(true);
              }}
              className="w-full h-2 bg-gradient-to-r from-green-300 via-yellow-400 to-amber-500 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">
                Umbral Rojo (Crítico)
              </label>
              <span className="text-lg font-bold text-red-600">{alertas.porcentajeCritico}%</span>
            </div>
            <input
              type="range"
              min={alertas.porcentajeRiesgo + 1}
              max="100"
              value={alertas.porcentajeCritico}
              onChange={(e) => {
                setAlertas({
                  ...alertas,
                  porcentajeCritico: parseInt(e.target.value)
                });
                setCambiosPendientes(true);
              }}
              className="w-full h-2 bg-gradient-to-r from-amber-300 via-red-400 to-red-600 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Configuración Aprobaciones
function ConfiguracionAprobacion() {
  return (
    <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4 sm:p-6">
      <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
        Niveles de Aprobación
      </h3>
      
      <div className="space-y-4">
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-green-900 text-sm sm:text-base">Jefe de Oficina</h4>
              <p className="text-xs sm:text-sm text-green-700">Aprobación final de autos y providencias</p>
            </div>
            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
          </div>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-blue-900 text-sm sm:text-base">Coordinador</h4>
              <p className="text-xs sm:text-sm text-blue-700">Revisión previa de documentos</p>
            </div>
            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-gray-900 text-sm sm:text-base">Profesional</h4>
              <p className="text-xs sm:text-sm text-gray-700">Creación y envío de documentos</p>
            </div>
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 flex-shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper para nombres de notificaciones
function getNombreNotificacion(key: string): string {
  const nombres: Record<string, string> = {
    vencimiento7dias: 'Alerta 7 días antes',
    vencimiento3dias: 'Alerta 3 días antes',
    vencimiento1dia: 'Alerta 1 día antes',
    procesoVencido: 'Proceso vencido',
    asignacionProceso: 'Asignación de proceso',
    cambioEtapa: 'Cambio de etapa',
    aprobacionRequerida: 'Solicitud de aprobación',
    resumenDiario: 'Resumen diario',
    resumenSemanal: 'Resumen semanal'
  };
  return nombres[key] || key;
}

// ============ MODALES ============

// Modal para crear/editar Tipo de Oficio
function ModalOficio({ oficio, onGuardar, onCancelar }: {
  oficio: TipoOficio | null;
  onGuardar: (oficio: TipoOficio) => void;
  onCancelar: () => void;
}) {
  const [nombre, setNombre] = useState(oficio?.nombre || '');
  const [codigo, setCodigo] = useState(oficio?.codigo || '');
  const [descripcion, setDescripcion] = useState(oficio?.descripcion || '');
  const [activo, setActivo] = useState(oficio?.activo ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nombre.trim() || !codigo.trim()) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    const nuevoOficio: TipoOficio = {
      id: oficio?.id || `oficio-${Date.now()}`,
      nombre: nombre.trim(),
      codigo: codigo.trim().toUpperCase(),
      descripcion: descripcion.trim(),
      activo
    };

    onGuardar(nuevoOficio);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 sm:p-6 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6" />
            <h2 className="text-xl sm:text-2xl font-bold">
              {oficio ? 'Editar Tipo de Oficio' : 'Nuevo Tipo de Oficio'}
            </h2>
          </div>
          <button
            onClick={onCancelar}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre del Oficio <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Oficio de Apertura"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-base"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Código <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="Ej: OA-001"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-base font-mono"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Código único para identificar el tipo de oficio</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe el propósito de este tipo de oficio..."
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-base resize-none"
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="activo-oficio"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
            />
            <label htmlFor="activo-oficio" className="text-sm font-medium text-gray-700 cursor-pointer">
              Activar este tipo de oficio
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancelar}
              className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 font-semibold transition-all shadow-md"
            >
              {oficio ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal para crear/editar Plantilla de Acta
function ModalActa({ acta, onGuardar, onCancelar }: {
  acta: PlantillaActa | null;
  onGuardar: (acta: PlantillaActa) => void;
  onCancelar: () => void;
}) {
  const [nombre, setNombre] = useState(acta?.nombre || '');
  const [tipo, setTipo] = useState(acta?.tipo || '');
  const [descripcion, setDescripcion] = useState(acta?.descripcion || '');
  const [archivo, setArchivo] = useState(acta?.archivo || '');
  const [activo, setActivo] = useState(acta?.activo ?? true);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(false);

  const handleFileChange = () => {
    // Simular selección de archivo
    setArchivo(`acta_${Date.now()}.pdf`);
    setArchivoSeleccionado(true);
    toast.success('Archivo seleccionado correctamente');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nombre.trim() || !tipo.trim()) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    const nuevaActa: PlantillaActa = {
      id: acta?.id || `acta-${Date.now()}`,
      nombre: nombre.trim(),
      tipo: tipo.trim().toLowerCase(),
      descripcion: descripcion.trim(),
      archivo: archivo || undefined,
      fechaCarga: acta?.fechaCarga || new Date().toISOString().split('T')[0],
      activo
    };

    onGuardar(nuevaActa);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sm:p-6 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6" />
            <h2 className="text-xl sm:text-2xl font-bold">
              {acta ? 'Editar Plantilla de Acta' : 'Nueva Plantilla de Acta'}
            </h2>
          </div>
          <button
            onClick={onCancelar}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre de la Plantilla <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Acta de Apertura"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-base"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tipo de Acta <span className="text-red-500">*</span>
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-base"
              required
            >
              <option value="">Seleccionar tipo...</option>
              <option value="apertura">Apertura</option>
              <option value="investigacion">Investigación</option>
              <option value="cierre">Cierre</option>
              <option value="revision">Revisión</option>
              <option value="notificacion">Notificación</option>
              <option value="audiencia">Audiencia</option>
              <option value="pruebas">Pruebas</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe el propósito de esta plantilla de acta..."
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-base resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Archivo de Plantilla
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-2">
                {archivoSeleccionado || archivo ? 'Archivo cargado' : 'Haz clic para cargar un archivo'}
              </p>
              {(archivoSeleccionado || archivo) && (
                <p className="text-xs text-green-600 font-semibold">
                  {archivo || 'archivo.pdf'}
                </p>
              )}
              <button
                type="button"
                onClick={handleFileChange}
                className="mt-3 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold text-sm"
              >
                Seleccionar archivo
              </button>
              <p className="text-xs text-gray-500 mt-2">Formatos: PDF, DOCX (máx. 5MB)</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="activo-acta"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="activo-acta" className="text-sm font-medium text-gray-700 cursor-pointer">
              Activar esta plantilla de acta
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancelar}
              className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold transition-all shadow-md"
            >
              {acta ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal para visualizar Acta
function ModalVisualizarActa({ acta, onCerrar, onDescargar }: {
  acta: PlantillaActa;
  onCerrar: () => void;
  onDescargar: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sm:p-6 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6" />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">{acta.nombre}</h2>
              <p className="text-sm text-blue-100 mt-1">Plantilla de Acta - {acta.tipo}</p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {/* Información de la plantilla */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-blue-900 mb-2">Información de la Plantilla</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-semibold text-blue-800">Tipo:</span> {acta.tipo}</p>
              <p><span className="font-semibold text-blue-800">Descripción:</span> {acta.descripcion}</p>
              <p><span className="font-semibold text-blue-800">Fecha de carga:</span> {acta.fechaCarga}</p>
              <p><span className="font-semibold text-blue-800">Archivo:</span> {acta.archivo || 'No disponible'}</p>
            </div>
          </div>

          {/* Simulación de vista previa del documento */}
          <div className="border-2 border-gray-200 rounded-lg p-8 bg-white min-h-[400px]">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {acta.nombre.toUpperCase()}
                </h1>
                <p className="text-sm text-gray-600">Plantilla de Acta Disciplinaria</p>
              </div>

              <div className="space-y-4 text-gray-700">
                <p className="text-sm">
                  <strong>FECHA:</strong> ____ / ____ / ________
                </p>
                <p className="text-sm">
                  <strong>NÚMERO DE ACTA:</strong> ________________
                </p>
                <p className="text-sm">
                  <strong>PROCESO DISCIPLINARIO No.:</strong> ________________
                </p>

                <div className="border-t-2 border-gray-200 pt-4 mt-6">
                  <p className="text-sm mb-4">
                    En la ciudad de ______________, siendo las _____ horas del día ____ del mes de ______________ 
                    del año ________, se da inicio al acta de {acta.tipo} del proceso disciplinario.
                  </p>

                  <p className="text-sm mb-4">
                    <strong>ASUNTO:</strong> {acta.descripcion}
                  </p>

                  <p className="text-sm mb-4">
                    <strong>PARTES:</strong>
                  </p>
                  <ul className="list-disc list-inside text-sm mb-4 ml-4">
                    <li>Investigado: ____________________</li>
                    <li>Investigador: ____________________</li>
                  </ul>

                  <p className="text-sm mb-4">
                    <strong>DESARROLLO:</strong>
                  </p>
                  <div className="min-h-[200px] border border-gray-300 rounded p-4 bg-gray-50">
                    <p className="text-sm text-gray-500 italic">
                      [Espacio para describir el desarrollo del acta...]
                    </p>
                  </div>
                </div>

                <div className="border-t-2 border-gray-200 pt-6 mt-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-sm mb-12">_____________________</p>
                      <p className="text-sm font-semibold text-center">Firma Funcionario</p>
                    </div>
                    <div>
                      <p className="text-sm mb-12">_____________________</p>
                      <p className="text-sm font-semibold text-center">Firma Investigado</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onDescargar}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 font-semibold transition-all shadow-md"
            >
              <Download className="w-5 h-5" />
              Descargar Plantilla
            </button>
            <button
              onClick={onCerrar}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}