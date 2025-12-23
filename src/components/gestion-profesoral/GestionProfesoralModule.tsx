import { useState } from 'react';
import { 
  LayoutDashboard,
  Calendar, 
  Users, 
  FileText, 
  Star, 
  ChevronRight,
  UserCheck,
  ClipboardCheck,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { DashboardGestionProfesoral } from './DashboardGestionProfesoral';
import { Modulo1PlanificacionAcademica } from './Modulo1PlanificacionAcademica';
import { Modulo2Convocatorias } from './Modulo2Convocatorias';
import { Modulo4HoraCatedra } from './Modulo4HoraCatedra';
import { Modulo5EvaluacionDocente } from './Modulo5EvaluacionDocente';
import { PTAsList } from './PTAsList';
import { CalendarioAcademicoModule } from './CalendarioAcademicoModule';
import { ModalEnviarPTA } from './ModalEnviarPTA';

// Tabs del módulo - 6 MÓDULOS PRINCIPALES
type TabType = 'dashboard' | 'calendario' | 'planificacion' | 'convocatorias' | 'ptas' | 'hora-catedra' | 'evaluacion';

interface GestionProfesoralModuleProps {
  className?: string;
}

export function GestionProfesoralModule({ className = '' }: GestionProfesoralModuleProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs = [
    { 
      id: 'dashboard' as TabType, 
      label: 'Dashboard', 
      icon: LayoutDashboard,
      description: 'Panel de control principal',
      badge: null
    },
    { 
      id: 'calendario' as TabType, 
      label: 'Calendario Académico', 
      icon: Calendar,
      description: 'Calendario académico y horarios',
      badge: null
    },
    { 
      id: 'planificacion' as TabType, 
      label: '1. Planificación', 
      icon: Calendar,
      description: 'Planificación académica y horarios',
      badge: null
    },
    { 
      id: 'convocatorias' as TabType, 
      label: '2. Convocatorias', 
      icon: Users,
      description: 'Gestión de convocatorias docentes',
      badge: '270'
    },
    { 
      id: 'ptas' as TabType, 
      label: '3. PTAs', 
      icon: FileText,
      description: 'Planes de Trabajo Académico',
      badge: '45'
    },
    { 
      id: 'hora-catedra' as TabType, 
      label: '4. Hora Cátedra', 
      icon: UserCheck,
      description: 'Docentes de hora cátedra',
      badge: '1,200'
    },
    { 
      id: 'evaluacion' as TabType, 
      label: '5. Evaluación', 
      icon: Star,
      description: 'Evaluación docente',
      badge: null
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardGestionProfesoral onNavigate={setActiveTab} />;
      case 'calendario':
        return <CalendarioAcademicoModule />;
      case 'planificacion':
        return <Modulo1Planificacion />;
      case 'convocatorias':
        return <Modulo2ConvocatoriasWrapper />;
      case 'ptas':
        return <Modulo3PTAs />;
      case 'hora-catedra':
        return <Modulo4HoraCatedraWrapper />;
      case 'evaluacion':
        return <Modulo5EvaluacionWrapper />;
      default:
        return <DashboardGestionProfesoral onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Backoffice</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-[#003DA5] font-medium">Gestión Profesoral</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900 font-medium">
            {tabs.find(t => t.id === activeTab)?.label}
          </span>
        </div>
      </div>

      {/* Navigation Tabs - Horizontal Scroll en Mobile */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto scrollbar-hide -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative flex items-center gap-2 px-4 py-4 text-sm font-medium whitespace-nowrap
                    transition-colors
                    ${isActive 
                      ? 'text-[#003DA5] border-b-2 border-[#003DA5]' 
                      : 'text-gray-600 hover:text-gray-900 hover:border-b-2 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                      {tab.badge}
                    </span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#003DA5]"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// MÓDULO 1: PLANIFICACIÓN ACADÉMICA
function Modulo1Planificacion() {
  return <Modulo1PlanificacionAcademica />;
}

// MÓDULO 2: CONVOCATORIAS Y CALIFICACIÓN DOCENTE
function Modulo2ConvocatoriasWrapper() {
  return <Modulo2Convocatorias />;
}

// MÓDULO 3: PTA (COMPONENTE CENTRAL)
function Modulo3PTAs() {
  const [showModalEnviar, setShowModalEnviar] = useState(false);
  
  // Importar PTAs desde los datos demo
  const { ptasDemoPorEstado } = require('../../data/ptasDemoPorEstado');
  const { ptasMock } = require('../../mock-data/profesoral-mock-completo');
  
  // Combinar todos los PTAs disponibles
  const todosLosPTAs = [...ptasDemoPorEstado, ...ptasMock];
  
  // Convertir PTAs al formato esperado por el modal
  const ptasParaModal = todosLosPTAs
    .filter(pta => pta.estado === 'borrador')
    .map(pta => ({
      id: pta.id,
      codigo: pta.codigo,
      docente: {
        nombre: pta.docente_nombre || 'Docente',
        email: `${pta.docente_nombre?.toLowerCase().replace(/ /g, '.').replace(/🔴/g, '').replace(/demo:/g, '').trim()}@esap.edu.co` || 'docente@esap.edu.co',
        documento: 'CC 123456789',
        programa: pta.departamento || 'Programa Académico'
      },
      periodo: pta.periodo_nombre || '2025-I',
      estado: 'BORRADOR',
      fecha_creacion: pta.created_at 
        ? new Date(pta.created_at).toLocaleDateString('es-CO', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        : 'N/A',
      horas_totales: (pta.componente_ensenanza?.horas || 0) + 
                     (pta.componente_investigacion?.horas || 0) + 
                     (pta.componente_extension?.horas || 0) + 
                     (pta.componente_apoyo_institucional?.horas || 0),
      horas_programables: 800
    }));
  
  const handleEnviarPTA = (pta: any) => {
    // Aquí iría la lógica para enviar el PTA a revisión
    toast.success(`PTA ${pta.codigo} enviado exitosamente`, {
      description: `Se notificó al docente ${pta.docente.nombre}`,
      duration: 4000
    });
    setShowModalEnviar(false);
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-[#003DA5] to-[#1e5da8] rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Módulo 3: Plan de Trabajo Académico (PTA)</h1>
          </div>
          <button
            onClick={() => setShowModalEnviar(true)}
            className="px-6 py-2.5 bg-white text-[#003DA5] rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Enviar
          </button>
        </div>
        <p className="text-sm opacity-90">
          ⭐ COMPONENTE CENTRAL - Gestión completa del PTA con 4 componentes: Docencia, Investigación, Extensión, Complementarias
        </p>
        <div className="mt-4 flex gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
            <p className="text-xs opacity-90">Docentes Carrera + Ocasionales</p>
            <p className="text-xl font-bold">~270</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
            <p className="text-xs opacity-90">PTAs Activos 2025-1</p>
            <p className="text-xl font-bold">187</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
            <p className="text-xs opacity-90">En Aprobación</p>
            <p className="text-xl font-bold">45</p>
          </div>
        </div>
      </div>
      
      <PTAsList />
      
      {/* Modal para enviar PTA */}
      <ModalEnviarPTA
        isOpen={showModalEnviar}
        onClose={() => setShowModalEnviar(false)}
        ptas={ptasParaModal}
        onEnviar={handleEnviarPTA}
      />
    </div>
  );
}

// MÓDULO 4: GESTIÓN DE DOCENTES DE HORA CÁTEDRA
function Modulo4HoraCatedraWrapper() {
  return <Modulo4HoraCatedra />;
}

// MÓDULO 5: EVALUACIÓN DOCENTE
function Modulo5EvaluacionWrapper() {
  return <Modulo5EvaluacionDocente />;
}