import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import {
  Scale,
  Shield,
  FileText,
  ChevronRight,
  LayoutDashboard,
  Gavel,
  ClipboardCheck,
  Briefcase
} from 'lucide-react';
import { DashboardProcesos } from './DashboardProcesos';
import { ControlDisciplinarioModule } from './ControlDisciplinarioModule';
import { ControlGestionModule } from './ControlGestionModule';
import { GestionLegalModule } from './GestionLegalModule';

type TabType = 'dashboard' | 'disciplinario' | 'gestion' | 'legal';

interface ProcesosAdministrativosModuleProps {
  className?: string;
}

export function ProcesosAdministrativosModule({ className = '' }: ProcesosAdministrativosModuleProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs = [
    {
      id: 'dashboard' as TabType,
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Panel de control de procesos',
      badge: null
    },
    {
      id: 'disciplinario' as TabType,
      label: 'Control Interno Disciplinario',
      icon: Gavel,
      description: 'Procesos disciplinarios',
      badge: '3'
    },
    {
      id: 'gestion' as TabType,
      label: 'Control Interno de Gestión',
      icon: ClipboardCheck,
      description: 'Auditorías y control de gestión',
      badge: '2'
    },
    {
      id: 'legal' as TabType,
      label: 'Gestión Legal',
      icon: Scale,
      description: 'Procesos judiciales y legales',
      badge: '3'
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardProcesos onNavigate={setActiveTab} />;
      case 'disciplinario':
        return <ControlDisciplinarioModule />;
      case 'gestion':
        return <ControlGestionModule />;
      case 'legal':
        return <GestionLegalModule />;
      default:
        return <DashboardProcesos onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Backoffice</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-[#003DA5] font-medium">Procesos Administrativos</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900 font-medium">
            {tabs.find(t => t.id === activeTab)?.label}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
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
                      layoutId="activeTabIndicatorProcesos"
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
