/**
 * ============================================
 * MODELOS DE SOPORTE - Control Interno Disciplinario
 * ============================================
 * 
 * Módulo limpio y simple que agrupa:
 * - Informes de Ley
 * - Gestión Documental
 * - Notificaciones
 * 
 * Diseño unificado con Proceso de Auditoría
 * ÚLTIMA ACTUALIZACIÓN: 24 Diciembre 2025
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, FolderOpen, Bell, ChevronDown, ChevronRight,
  CheckCircle2, Upload, Eye, Calendar, CheckSquare, X, File,
  Download, Trash2, Plus, AlertTriangle, Clock, BookOpen,
  Info, MessageSquare, Mail, ExternalLink, Sparkles, Search, Filter
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// Design System
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';
import { ModalSIGL } from '../gestion-legal/design-system/ModalSIGL';
import { ButtonSIGL } from '../gestion-legal/design-system/ButtonSIGL';
import { HeaderModuloCIG } from '../control-interno/HeaderModuloCIG';

// ============ TIPOS ============

type TabActivo = 'informes' | 'documental' | 'notificaciones';

interface InformeLey {
  id: string;
  nombre: string;
  normativa: string;
  tipo: 'RF-ANUAL' | 'Trimestral' | 'Semestral' | 'Bimestral';
  estado: 'Pendiente' | 'En Progreso' | 'Enviado' | 'Atrasado';
  destinatario: string;
  plazoEntrega: string;
  responsable: string;
  fechaEnvio?: string;
}

interface Documento {
  id: string;
  nombre: string;
  tipo: string;
  carpeta: string;
  tamano: string;
  fechaSubida: string;
  subidoPor: string;
  etiquetas: string[];
}

interface Notificacion {
  id: string;
  tipo: 'alerta' | 'recordatorio' | 'vencimiento' | 'sistema';
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
  prioridad: 'alta' | 'media' | 'baja';
  origen: string;
}

interface CarpetaDocumental {
  id: string;
  nombre: string;
  descripcion: string;
  color: string;
  documentosCount: number;
}

// ============ DATOS MOCK - INFORMES DE LEY ============

const INFORMES_LEY_MOCK: InformeLey[] = [
  {
    id: '1',
    nombre: 'Informe Pormenorizado',
    normativa: 'Ley 1474 de 2011 (Estatuto Anticorrupción) - Art. 9',
    tipo: 'Trimestral',
    estado: 'Enviado',
    destinatario: 'Consejo Superior, DAFP, Contraloría General',
    plazoEntrega: 'Últimos 5 días hábiles de febrero y agosto',
    responsable: 'Jefe OCI',
    fechaEnvio: 'Antes del 28 de febrero'
  },
  {
    id: '2',
    nombre: 'Informe Anual OCI',
    normativa: 'Decreto 648 de 2017 - Art. 14',
    tipo: 'RF-ANUAL',
    estado: 'En Progreso',
    destinatario: 'Rectoría, Comunidad Universitaria',
    plazoEntrega: 'Antes del 28 de febrero',
    responsable: 'Jefe OCI'
  },
  {
    id: '3',
    nombre: 'Informe de Gestión Anual',
    normativa: 'Ley 1952 de 2019 (Código Disciplinario Único)',
    tipo: 'RF-ANUAL',
    estado: 'Pendiente',
    destinatario: 'Procuraduría General de la Nación',
    plazoEntrega: '31 de marzo de cada año',
    responsable: 'Jefe OCI'
  },
  {
    id: '4',
    nombre: 'Reporte de Procesos Disciplinarios',
    normativa: 'Circular Externa 100-008 de 2021 - PGN',
    tipo: 'Trimestral',
    estado: 'Pendiente',
    destinatario: 'Procuraduría General - SIDEIP',
    plazoEntrega: '15 días después de cerrar trimestre',
    responsable: 'Jefe OCI'
  },
  {
    id: '5',
    nombre: 'Informe Ejecutivo Trimestral',
    normativa: 'Manual Interno OCI - ESAP',
    tipo: 'Trimestral',
    estado: 'Enviado',
    destinatario: 'Rectoría, Vicerrectoría',
    plazoEntrega: 'Primeros 10 días del mes siguiente',
    responsable: 'Jefe OCI',
    fechaEnvio: 'Antes del 18 de febrero'
  },
  {
    id: '6',
    nombre: 'Informe de Rendición de Cuentas',
    normativa: 'Ley 1474 de 2011 - Art. 78',
    tipo: 'RF-ANUAL',
    estado: 'Pendiente',
    destinatario: 'Ciudadanía, Grupos de Interés',
    plazoEntrega: 'Antes del 30 de abril',
    responsable: 'Jefe OCI'
  },
  {
    id: '7',
    nombre: 'Balance Social',
    normativa: 'Decreto 1083 de 2015',
    tipo: 'RF-ANUAL',
    estado: 'Pendiente',
    destinatario: 'Comunidad Universitaria, DAFP',
    plazoEntrega: 'Antes del 31 de marzo',
    responsable: 'Jefe OCI'
  },
  {
    id: '8',
    nombre: 'Informe de Control Interno Contable',
    normativa: 'Resolución 357 de 2008 CGN',
    tipo: 'RF-ANUAL',
    estado: 'Pendiente',
    destinatario: 'Contaduría General de la Nación',
    plazoEntrega: 'Antes del 28 de febrero',
    responsable: 'Jefe OCI'
  },
  {
    id: '9',
    nombre: 'Informe de Evaluación del Sistema de Control Interno',
    normativa: 'Ley 87 de 1993',
    tipo: 'RF-ANUAL',
    estado: 'En Progreso',
    destinatario: 'Rectoría, Consejo Superior',
    plazoEntrega: 'Antes del 31 de marzo',
    responsable: 'Jefe OCI'
  },
  {
    id: '10',
    nombre: 'Plan Anual de Auditoría',
    normativa: 'Decreto 648 de 2017',
    tipo: 'RF-ANUAL',
    estado: 'Pendiente',
    destinatario: 'Rectoría, Alta Dirección',
    plazoEntrega: 'Antes del 31 de enero',
    responsable: 'Jefe OCI'
  },
  {
    id: '11',
    nombre: 'Seguimiento a Planes de Mejoramiento',
    normativa: 'Ley 1474 de 2011',
    tipo: 'Trimestral',
    estado: 'Pendiente',
    destinatario: 'Áreas auditadas, Alta Dirección',
    plazoEntrega: 'Últimos 5 días del trimestre',
    responsable: 'Jefe OCI'
  },
  {
    id: '12',
    nombre: 'Informe de Riesgos Institucionales',
    normativa: 'Decreto 1499 de 2017',
    tipo: 'Semestral',
    estado: 'Pendiente',
    destinatario: 'Comité Institucional de Riesgos',
    plazoEntrega: 'Antes del 15 de julio y 15 de enero',
    responsable: 'Jefe OCI'
  },
  {
    id: '13',
    nombre: 'Evaluación de la Gestión de Calidad',
    normativa: 'Decreto 1072 de 2015',
    tipo: 'RF-ANUAL',
    estado: 'Pendiente',
    destinatario: 'Alta Dirección, Representante de Calidad',
    plazoEntrega: 'Antes del 31 de marzo',
    responsable: 'Jefe OCI'
  },
  {
    id: '14',
    nombre: 'Informe de Auditorías Realizadas',
    normativa: 'Manual de Auditoría Interna - ESAP',
    tipo: 'Trimestral',
    estado: 'Pendiente',
    destinatario: 'Rectoría, Áreas Auditadas',
    plazoEntrega: 'Primeros 10 días del mes siguiente',
    responsable: 'Jefe OCI'
  },
  {
    id: '15',
    nombre: 'Evaluación del Código de Integridad',
    normativa: 'Ley 1952 de 2019',
    tipo: 'RF-ANUAL',
    estado: 'Pendiente',
    destinatario: 'Talento Humano, Alta Dirección',
    plazoEntrega: 'Antes del 28 de febrero',
    responsable: 'Jefe OCI'
  },
  {
    id: '16',
    nombre: 'Informe de Transparencia y Acceso a la Información',
    normativa: 'Ley 1712 de 2014',
    tipo: 'RF-ANUAL',
    estado: 'Pendiente',
    destinatario: 'Ciudadanía, Procuraduría',
    plazoEntrega: 'Antes del 31 de enero',
    responsable: 'Jefe OCI'
  }
];

// ============ DATOS MOCK - CARPETAS DOCUMENTALES ============

const CARPETAS_MOCK: CarpetaDocumental[] = [
  { id: '1', nombre: 'Informes de Ley', descripcion: 'Informes obligatorios', color: '#1e5da8', documentosCount: 42 },
  { id: '2', nombre: 'Actas y Reuniones', descripcion: 'Actas de reuniones y comités', color: '#10b981', documentosCount: 18 },
  { id: '3', nombre: 'Oficios y Comunicaciones', descripcion: 'Oficios enviados y recibidos', color: '#f59e0b', documentosCount: 156 },
  { id: '4', nombre: 'Formatos y Plantillas', descripcion: 'Formatos estándar OCI', color: '#8b5cf6', documentosCount: 28 },
  { id: '5', nombre: 'Evidencias', descripcion: 'Evidencias de procesos', color: '#ef4444', documentosCount: 312 },
  { id: '6', nombre: 'Normativa', descripcion: 'Leyes y decretos', color: '#3b82f6', documentosCount: 64 }
];

// ============ DATOS MOCK - NOTIFICACIONES ============

const NOTIFICACIONES_MOCK: Notificacion[] = [
  {
    id: '1',
    tipo: 'alerta',
    titulo: 'Informe Pormenorizado próximo a vencer',
    mensaje: 'El Informe Pormenorizado debe ser enviado antes del 28 de febrero',
    fecha: '2025-01-24T10:30:00',
    leida: false,
    prioridad: 'alta',
    origen: 'Sistema de Informes'
  },
  {
    id: '2',
    tipo: 'recordatorio',
    titulo: 'Reunión de seguimiento programada',
    mensaje: 'Reunión de seguimiento a procesos disciplinarios el 30 de enero',
    fecha: '2025-01-24T09:00:00',
    leida: false,
    prioridad: 'media',
    origen: 'Calendario'
  },
  {
    id: '3',
    tipo: 'vencimiento',
    titulo: 'Plan Anual de Auditoría vencido',
    mensaje: 'El Plan Anual de Auditoría debió ser entregado el 31 de enero',
    fecha: '2025-01-23T14:00:00',
    leida: true,
    prioridad: 'alta',
    origen: 'Sistema de Informes'
  },
  {
    id: '4',
    tipo: 'sistema',
    titulo: 'Actualización del sistema',
    mensaje: 'Nueva versión del módulo de Control Interno Disciplinario disponible',
    fecha: '2025-01-22T16:45:00',
    leida: true,
    prioridad: 'baja',
    origen: 'Administrador'
  }
];

// ============ COMPONENTE PRINCIPAL ============

export function ModelosSoporteDisciplinario() {
  const [tabActivo, setTabActivo] = useState<TabActivo>('informes');
  const [busqueda, setBusqueda] = useState('');
  const [informeExpandido, setInformeExpandido] = useState<string | null>('1');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Unificado con Título */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <HeaderModuloCIG
          titulo="Modelos de Soporte"
          subtitulo="Informes de Ley, Gestión Documental y Notificaciones"
        />
      </div>

      {/* Barra de Progreso */}
      <div className="bg-white border-b px-6 py-3">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700">Estado General de Informes de Ley</span>
            <span className="text-sm text-gray-900">12.5% (2 de 16)</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="h-full bg-[#1e5da8] rounded-full" style={{ width: '12.5%' }} />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>16 informes totales • 3 tabs • 6 carpetas</span>
            <span>2 enviados • 2 en progreso • 12 pendientes</span>
          </div>
        </div>
      </div>

      {/* Tabs de Navegación */}
      <div className="bg-white border-b px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-1">
            <TabButton
              activo={tabActivo === 'informes'}
              onClick={() => setTabActivo('informes')}
              icono={<FileText className="w-4 h-4" />}
              titulo="Informes de Ley"
              count={16}
            />
            <TabButton
              activo={tabActivo === 'documental'}
              onClick={() => setTabActivo('documental')}
              icono={<FolderOpen className="w-4 h-4" />}
              titulo="Gestión Documental"
              count={620}
            />
            <TabButton
              activo={tabActivo === 'notificaciones'}
              onClick={() => setTabActivo('notificaciones')}
              icono={<Bell className="w-4 h-4" />}
              titulo="Notificaciones"
              count={4}
              alert={2}
            />
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <AnimatePresence mode="wait">
          {tabActivo === 'informes' && (
            <TabInformesLey
              informes={INFORMES_LEY_MOCK}
              informeExpandido={informeExpandido}
              setInformeExpandido={setInformeExpandido}
              busqueda={busqueda}
              setBusqueda={setBusqueda}
            />
          )}

          {tabActivo === 'documental' && (
            <TabDocumental carpetas={CARPETAS_MOCK} />
          )}

          {tabActivo === 'notificaciones' && (
            <TabNotificaciones notificaciones={NOTIFICACIONES_MOCK} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============ COMPONENTE: TAB BUTTON ============

function TabButton({ 
  activo, 
  onClick, 
  icono, 
  titulo,
  count,
  alert
}: { 
  activo: boolean; 
  onClick: () => void; 
  icono: React.ReactNode; 
  titulo: string;
  count?: number;
  alert?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-3 text-sm transition-all border-b-2 ${
        activo 
          ? 'text-[#1e5da8] border-[#1e5da8] font-semibold' 
          : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {icono}
      <span>{titulo}</span>
      {count !== undefined && (
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          activo ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
        }`}>
          {count}
        </span>
      )}
      {alert && alert > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
          {alert}
        </span>
      )}
    </button>
  );
}

// ============ TAB: INFORMES DE LEY ============

function TabInformesLey({
  informes,
  informeExpandido,
  setInformeExpandido,
  busqueda,
  setBusqueda
}: {
  informes: InformeLey[];
  informeExpandido: string | null;
  setInformeExpandido: (id: string | null) => void;
  busqueda: string;
  setBusqueda: (value: string) => void;
}) {
  const toggleInforme = (id: string) => {
    setInformeExpandido(informeExpandido === id ? null : id);
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Enviado': return '#10b981';
      case 'En Progreso': return '#f59e0b';
      case 'Pendiente': return '#6b7280';
      case 'Atrasado': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <motion.div
      key="informes"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-3"
    >
      {/* Barra de Búsqueda */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar informes..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filtrar
        </button>
      </div>

      {/* Lista de Informes */}
      {informes.map((informe) => (
        <CardSIGL key={informe.id} className="overflow-hidden">
          {/* Header de Informe */}
          <button
            onClick={() => toggleInforme(informe.id)}
            className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0"
              style={{ backgroundColor: getEstadoColor(informe.estado) }}
            >
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm text-gray-900 mb-1">{informe.nombre}</h3>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <BadgeSIGL variant="outline" size="sm">{informe.tipo}</BadgeSIGL>
                <span>•</span>
                <BadgeSIGL 
                  variant="outline" 
                  size="sm"
                  style={{ 
                    borderColor: getEstadoColor(informe.estado),
                    color: getEstadoColor(informe.estado)
                  }}
                >
                  {informe.estado}
                </BadgeSIGL>
              </div>
            </div>
            <motion.div
              animate={{ rotate: informeExpandido === informe.id ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </motion.div>
          </button>

          {/* Detalle del Informe */}
          <AnimatePresence>
            {informeExpandido === informe.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="border-t bg-gray-50"
              >
                <div className="p-5 space-y-4">
                  {/* Información del Informe */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Normativa Base</label>
                      <p className="text-sm text-gray-900">{informe.normativa}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Destinatario</label>
                      <p className="text-sm text-gray-900">{informe.destinatario}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Plazo de Entrega</label>
                      <p className="text-sm text-gray-900">{informe.plazoEntrega}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Responsable</label>
                      <p className="text-sm text-gray-900">{informe.responsable}</p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2 pt-3 border-t">
                    <ButtonSIGL variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalle
                    </ButtonSIGL>
                    <ButtonSIGL variant="default" size="sm">
                      <FileText className="w-4 h-4 mr-2" />
                      Generar Informe
                    </ButtonSIGL>
                    <ButtonSIGL variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Descargar
                    </ButtonSIGL>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardSIGL>
      ))}
    </motion.div>
  );
}

// ============ TAB: GESTIÓN DOCUMENTAL ============

function TabDocumental({ carpetas }: { carpetas: CarpetaDocumental[] }) {
  return (
    <motion.div
      key="documental"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {carpetas.map((carpeta) => (
        <CardSIGL
          key={carpeta.id}
          className="p-5 hover:shadow-lg transition-all cursor-pointer group"
        >
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-white flex-shrink-0"
              style={{ backgroundColor: carpeta.color }}
            >
              <FolderOpen className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                {carpeta.nombre}
              </h3>
              <p className="text-xs text-gray-500 mb-2">{carpeta.descripcion}</p>
              <div className="flex items-center gap-2">
                <File className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-600">{carpeta.documentosCount} documentos</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </div>
        </CardSIGL>
      ))}
    </motion.div>
  );
}

// ============ TAB: NOTIFICACIONES ============

function TabNotificaciones({ notificaciones }: { notificaciones: Notificacion[] }) {
  const getIconoNotificacion = (tipo: string) => {
    switch (tipo) {
      case 'alerta': return <AlertTriangle className="w-5 h-5" />;
      case 'recordatorio': return <Calendar className="w-5 h-5" />;
      case 'vencimiento': return <Clock className="w-5 h-5" />;
      case 'sistema': return <Info className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const getColorNotificacion = (prioridad: string) => {
    switch (prioridad) {
      case 'alta': return '#ef4444';
      case 'media': return '#f59e0b';
      case 'baja': return '#6b7280';
      default: return '#6b7280';
    }
  };

  return (
    <motion.div
      key="notificaciones"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-3"
    >
      {notificaciones.map((notif) => (
        <CardSIGL
          key={notif.id}
          className={`p-5 transition-all cursor-pointer hover:shadow-lg ${
            !notif.leida ? 'bg-blue-50 border-blue-200' : ''
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0"
              style={{ backgroundColor: getColorNotificacion(notif.prioridad) }}
            >
              {getIconoNotificacion(notif.tipo)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-1">
                <h3 className="text-sm text-gray-900 font-semibold">{notif.titulo}</h3>
                {!notif.leida && (
                  <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 ml-2 mt-1"></span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2">{notif.mensaje}</p>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{new Date(notif.fecha).toLocaleString('es-ES')}</span>
                <span>•</span>
                <span>{notif.origen}</span>
                <span>•</span>
                <BadgeSIGL variant="outline" size="sm">
                  {notif.prioridad}
                </BadgeSIGL>
              </div>
            </div>
          </div>
        </CardSIGL>
      ))}
    </motion.div>
  );
}
