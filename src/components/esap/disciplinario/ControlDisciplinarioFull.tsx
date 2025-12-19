/**
 * SISTEMA COMPLETO - CONTROL INTERNO DISCIPLINARIO
 * Módulo funcional con todas las secciones:
 * - Dashboard Operativo (Kanban)
 * - Noticias Disciplinarias
 * - Gestión de Procesos
 * - Profesionales
 * - Configuración
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, FolderOpen, Users, BarChart3, Settings,
  Search, Plus, Filter, Download, Eye, Edit, Trash2, MoreVertical,
  X, Check, Clock, AlertTriangle, CheckCircle, FolderOpen as Folder, FileText,
  Calendar, User, Mail, Phone, MapPin, Save, Upload, ChevronDown, ChevronRight,
  TrendingUp, Star, Award, Target, ChevronLeft, List, Columns3, Scale,
  Archive
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { toast } from 'sonner@2.0.3';
import { ModuleLayout, MenuItem } from '../shared/ModuleLayout';
import { GestionProcesos } from './GestionProcesos';
import { GestionProfesionales } from './GestionProfesionales';
import { ModuloConfiguracion } from './ModuloConfiguracion';
import { DashboardKanban } from './DashboardKanban';
import { GestionNoticias } from './GestionNoticias'; // NUEVO: Módulo RF001
import { GestionProcesosProfesionalesCompleto } from './GestionProcesosProfesionalesCompleto'; // ✅ RF003 100% Funcional
import { RevisionAprobacionJefe } from './RevisionAprobacionJefe'; // ✅ RF004 100% Funcional
import { ExpedienteElectronico } from './ExpedienteElectronico'; // ✅ RF005 100% Funcional
import { GestionTerminosAlertas } from './GestionTerminosAlertas'; // ✅ RF006 100% Funcional
import { DashboardEjecutivoIntegrado } from './DashboardEjecutivoIntegrado'; // ✅ Dashboard Hub Operativo
import { DashboardKanbanOperativo } from './DashboardKanbanOperativo'; // ✅ Kanban Operativo Completo

// TIPOS GLOBALES
interface Proceso {
  id: string;
  consecutivo: string;
  noticia: string;
  disciplinable: string;
  cedula: string;
  etapaActual: 'Recepción' | 'Valoración' | 'Indagación' | 'Investigación' | 'Juzgamiento' | 'Fallo';
  semaforo: 'verde' | 'amarillo' | 'rojo';
  diasRestantes: number;
  porcentajeTiempo: number;
  profesionalAsignado: string;
  fechaCreacion: string;
  ultimaActuacion: string;
  documentos: number;
  fechaVencimiento: string;
}

interface Profesional {
  id: string;
  nombre: string;
  cargo: string;
  procesosAsignados: number;
  capacidadMaxima: number;
  email: string;
  telefono: string;
  especialidad: string;
}

interface Estadistica {
  titulo: string;
  valor: number | string;
  icono: any;
  color: string;
  descripcion: string;
}

// MOCK DATA COMPLETO
const PROCESOS_MOCK: Proceso[] = [
  {
    id: '1',
    consecutivo: 'PD-2025-0025',
    noticia: 'ND-2025-0152',
    disciplinable: 'Ana María López Martínez',
    cedula: '52123456',
    etapaActual: 'Valoración',
    semaforo: 'amarillo',
    diasRestantes: 3,
    porcentajeTiempo: 70,
    profesionalAsignado: 'Juan Pérez',
    fechaCreacion: '2025-01-26',
    ultimaActuacion: 'Asignado para valoración',
    documentos: 5,
    fechaVencimiento: '2025-02-02'
  },
  {
    id: '2',
    consecutivo: 'PD-2025-0018',
    noticia: 'ND-2025-0089',
    disciplinable: 'Roberto Sánchez Cruz',
    cedula: '77385960',
    etapaActual: 'Indagación',
    semaforo: 'verde',
    diasRestantes: 45,
    porcentajeTiempo: 35,
    profesionalAsignado: 'María Torres',
    fechaCreacion: '2024-12-15',
    ultimaActuacion: 'Auto de indagación previa notificado',
    documentos: 12,
    fechaVencimiento: '2025-03-15'
  },
  {
    id: '3',
    consecutivo: 'PD-2024-0156',
    noticia: 'ND-2024-0891',
    disciplinable: 'Patricia Herrera Gómez',
    cedula: '33445556',
    etapaActual: 'Investigación',
    semaforo: 'rojo',
    diasRestantes: -12,
    porcentajeTiempo: 115,
    profesionalAsignado: 'Carlos Mendoza',
    fechaCreacion: '2024-09-20',
    ultimaActuacion: 'Investigación disciplinaria en curso',
    documentos: 28,
    fechaVencimiento: '2025-01-18'
  },
  {
    id: '4',
    consecutivo: 'PD-2025-0042',
    noticia: 'ND-2025-0201',
    disciplinable: 'Jorge Ramírez Silva',
    cedula: '11223334',
    etapaActual: 'Valoración',
    semaforo: 'verde',
    diasRestantes: 15,
    porcentajeTiempo: 20,
    profesionalAsignado: 'Juan Pérez',
    fechaCreacion: '2025-01-20',
    ultimaActuacion: 'Documentos allegados',
    documentos: 3,
    fechaVencimiento: '2025-02-15'
  },
  {
    id: '5',
    consecutivo: 'PD-2025-0008',
    noticia: 'ND-2025-0045',
    disciplinable: 'Luis Fernando Castro',
    cedula: '44556677',
    etapaActual: 'Juzgamiento',
    semaforo: 'verde',
    diasRestantes: 30,
    porcentajeTiempo: 75,
    profesionalAsignado: 'Ana González',
    fechaCreacion: '2024-11-10',
    ultimaActuacion: 'Audiencia programada',
    documentos: 45,
    fechaVencimiento: '2025-03-01'
  }
];

const PROFESIONALES_MOCK: Profesional[] = [
  {
    id: '1',
    nombre: 'Juan Pérez Rodríguez',
    cargo: 'Profesional Especializado',
    procesosAsignados: 8,
    capacidadMaxima: 12,
    email: 'juan.perez@esap.edu.co',
    telefono: '3001234567',
    especialidad: 'Derecho Disciplinario'
  },
  {
    id: '2',
    nombre: 'María Torres Gómez',
    cargo: 'Profesional Universitario',
    procesosAsignados: 6,
    capacidadMaxima: 10,
    email: 'maria.torres@esap.edu.co',
    telefono: '3109876543',
    especialidad: 'Derecho Administrativo'
  },
  {
    id: '3',
    nombre: 'Carlos Mendoza Silva',
    cargo: 'Profesional Especializado',
    procesosAsignados: 11,
    capacidadMaxima: 12,
    email: 'carlos.mendoza@esap.edu.co',
    telefono: '3205551234',
    especialidad: 'Derecho Disciplinario'
  },
  {
    id: '4',
    nombre: 'Ana González López',
    cargo: 'Profesional Universitario',
    procesosAsignados: 5,
    capacidadMaxima: 10,
    email: 'ana.gonzalez@esap.edu.co',
    telefono: '3157778899',
    especialidad: 'Derecho Público'
  }
];

// ==================== STEPPER DE ETAPAS ====================
function EtapasStepper({ etapaActual, porcentajeTiempo, semaforo }: { 
  etapaActual: string; 
  porcentajeTiempo: number;
  semaforo: 'verde' | 'amarillo' | 'rojo';
}) {
  const etapas = ['Recepción', 'Valoración', 'Indagación', 'Investigación', 'Juzgamiento', 'Fallo'];
  const currentIndex = etapas.indexOf(etapaActual);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>
          PROGRESO DEL PROCESO
        </p>
        <p className="text-xs font-bold" style={{ color: '#003DA5' }}>
          Etapa {currentIndex + 1} de {etapas.length}
        </p>
      </div>

      {/* Stepper horizontal */}
      <div className="flex items-center gap-2">
        {etapas.map((etapa, index) => (
          <div key={etapa} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              {/* Círculo */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="relative flex items-center justify-center w-10 h-10 rounded-full border-2 mb-2"
                style={{
                  background: index <= currentIndex ? '#003DA5' : '#FFFFFF',
                  borderColor: index <= currentIndex ? '#003DA5' : '#E5E7EB'
                }}
              >
                {index < currentIndex ? (
                  <CheckCircle className="w-5 h-5" style={{ color: '#FFFFFF' }} />
                ) : index === currentIndex ? (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-3 h-3 rounded-full"
                    style={{ background: '#FFFFFF' }}
                  />
                ) : (
                  <div className="w-3 h-3 rounded-full" style={{ background: '#E5E7EB' }} />
                )}
              </motion.div>

              {/* Nombre etapa */}
              <p 
                className="text-xs font-semibold text-center"
                style={{ 
                  color: index <= currentIndex ? '#003DA5' : '#9CA3AF',
                  maxWidth: '80px'
                }}
              >
                {etapa}
              </p>
            </div>

            {/* Línea conectora */}
            {index < etapas.length - 1 && (
              <div 
                className="h-0.5 flex-1 -mt-8"
                style={{ 
                  background: index < currentIndex ? '#003DA5' : '#E5E7EB'
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Barra de tiempo */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>
            TIEMPO TRANSCURRIDO
          </p>
          <p className="text-xs font-bold" style={{ 
            color: semaforo === 'rojo' ? '#DC2626' : semaforo === 'amarillo' ? '#F59E0B' : '#10B981'
          }}>
            {porcentajeTiempo}%
          </p>
        </div>
        <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(porcentajeTiempo, 100)}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{
              background: semaforo === 'rojo'
                ? 'linear-gradient(90deg, #DC2626 0%, #EF4444 100%)'
                : semaforo === 'amarillo'
                ? 'linear-gradient(90deg, #F59E0B 0%, #FFC107 100%)'
                : 'linear-gradient(90deg, #10B981 0%, #34D399 100%)'
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ==================== COMPONENTE PRINCIPAL ====================
export function ControlDisciplinarioFull() {
  const [currentSection, setCurrentSection] = useState<'dashboard' | 'noticias' | 'aprobacion' | 'expediente' | 'terminos' | 'profesionales' | 'config'>('dashboard');

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Procesos', icon: <LayoutDashboard className="w-5 h-5" />, color: '#003DA5' },
    { id: 'noticias', label: 'Noticias Disciplinarias', icon: <FileText className="w-5 h-5" />, color: '#003DA5' },
    { id: 'aprobacion', label: 'Revisión y Aprobación', icon: <CheckCircle className="w-5 h-5" />, color: '#10B981' },
    { id: 'expediente', label: 'Expediente Electrónico', icon: <Archive className="w-5 h-5" />, color: '#8B5CF6' },
    { id: 'terminos', label: 'Términos y Alertas', icon: <Clock className="w-5 h-5" />, color: '#F59E0B' },
    { id: 'profesionales', label: 'Profesionales', icon: <Users className="w-5 h-5" />, color: '#003DA5' },
    { id: 'config', label: 'Configuración', icon: <Settings className="w-5 h-5" />, color: '#6B7280' }
  ];

  const getTitleForSection = () => {
    const item = menuItems.find(m => m.id === currentSection);
    return item?.label || 'Control Interno Disciplinario';
  };

  return (
    <ModuleLayout
      moduleName="CONTROL INTERNO DISCIPLINARIO"
      moduleDescription="Sistema de Gestión"
      moduleIcon={<Scale className="w-6 h-6" />}
      moduleColor="#003DA5"
      menuItems={menuItems}
      activeSection={currentSection}
      onSectionChange={(section) => setCurrentSection(section as any)}
      breadcrumb={['Backoffice', 'Control Interno Disciplinario', getTitleForSection()]}
    >
      {/* Contenido Principal */}
      {currentSection === 'dashboard' && <DashboardKanbanOperativo onNavigateToExpediente={() => setCurrentSection('expediente')} />}
      {currentSection === 'noticias' && <GestionNoticias />}
      {currentSection === 'aprobacion' && <RevisionAprobacionJefe />}
      {currentSection === 'expediente' && <ExpedienteElectronico />}
      {currentSection === 'terminos' && <GestionTerminosAlertas />}
      {currentSection === 'profesionales' && <GestionProfesionales />}
      {currentSection === 'config' && <ModuloConfiguracion />}
    </ModuleLayout>
  );
}