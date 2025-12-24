/**
 * SidebarSIGL - Menú lateral vertical SIGL
 * DISEÑO 100% COHERENTE CON CONTROL DISCIPLINARIO Y CONTROL INTERNO
 * FONDO BLANCO COMO EL RESTO DEL SISTEMA
 */

import { 
  LayoutDashboard,
  Scale,
  Gavel,
  FileQuestion,
  Inbox,
  CalendarClock,
  ChevronRight,
  Briefcase,
  Building2,
  DollarSign,
  Mail,
  Target,
  AlertTriangle,
  ClipboardCheck
} from 'lucide-react';

interface SidebarSIGLProps {
  vistaActual: string;
  onCambiarVista: (vista: string) => void;
}

export function SidebarSIGL({ vistaActual, onCambiarVista }: SidebarSIGLProps) {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      color: '#003DA5',
      descripcion: 'Vista general',
      fase: 'MVP'
    },
    {
      id: 'defensa-judicial',
      label: 'Defensa Judicial',
      icon: Scale,
      color: '#10B981',
      descripcion: '15 expedientes',
      fase: 'MVP'
    },
    {
      id: 'juzgamiento',
      label: 'Juzgamiento',
      icon: Gavel,
      color: '#DC2626',
      descripcion: '12 procesos',
      fase: 'MVP'
    },
    {
      id: 'asesoria',
      label: 'Asesoría Jurídica',
      icon: FileQuestion,
      color: '#8B5CF6',
      descripcion: '12 consultas',
      fase: 'MVP'
    },
    {
      id: 'buzon',
      label: 'Buzón Notif.',
      icon: Inbox,
      color: '#3B82F6',
      descripcion: '13 notificaciones',
      fase: 'MVP'
    },
    {
      id: 'terminos',
      label: 'Términos',
      icon: CalendarClock,
      color: '#6366F1',
      descripcion: '13 términos',
      fase: 'MVP'
    },
    {
      id: 'organos-control',
      label: 'Órganos Control',
      icon: Building2,
      color: '#2563EB',
      descripcion: '6 requerimientos',
      fase: 'FASE2'
    },
    {
      id: 'procesos-coactivos',
      label: 'Procesos Coactivos',
      icon: DollarSign,
      color: '#F59E0B',
      descripcion: '6 procesos',
      fase: 'FASE2'
    },
    {
      id: 'buzon-oj',
      label: 'Buzón OJ',
      icon: Mail,
      color: '#4F46E5',
      descripcion: '8 correos',
      fase: 'FASE2'
    },
    {
      id: 'plan-accion',
      label: 'Plan de Acción',
      icon: Target,
      color: '#7C3AED',
      descripcion: '5 indicadores',
      fase: 'FASE2'
    },
    {
      id: 'riesgos',
      label: 'Riesgos',
      icon: AlertTriangle,
      color: '#DC2626',
      descripcion: '5 riesgos',
      fase: 'FASE2'
    },
    {
      id: 'planes-mejoramiento',
      label: 'Planes Mejora',
      icon: ClipboardCheck,
      color: '#14B8A6',
      descripcion: '5 planes',
      fase: 'FASE2'
    },
  ];

  return (
    <div 
      className="w-64 h-full flex flex-col border-r border-gray-200 bg-white"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#003DA5' }}
          >
            <Briefcase size={24} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">GESTIÓN LEGAL</h3>
            <p className="text-xs text-gray-500">SIGL v5.0</p>
          </div>
        </div>
        <p className="text-xs mt-2 text-gray-600">
          Sistema Integrado de Gestión Legal
        </p>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto p-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = vistaActual === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onCambiarVista(item.id)}
              className={`w-full mb-1 rounded-lg transition-all duration-200 group hover:bg-gray-50 ${
                isActive ? 'bg-gray-50' : ''
              }`}
            >
              <div className="flex items-center gap-3 p-3">
                <div 
                  className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                  style={{ 
                    backgroundColor: isActive ? item.color : '#F3F4F6',
                  }}
                >
                  <Icon 
                    size={16} 
                    className={isActive ? 'text-white' : 'text-gray-600'}
                  />
                </div>
                <div className="flex-1 text-left">
                  <p 
                    className={`text-sm font-medium ${
                      isActive ? 'text-gray-900' : 'text-gray-700'
                    }`}
                  >
                    {item.label}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.descripcion}
                  </p>
                </div>
                {isActive && (
                  <ChevronRight size={16} className="text-gray-400" />
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
          <p className="text-xs font-semibold text-blue-900 mb-1">
            💡 Ayuda Rápida
          </p>
          <p className="text-xs text-blue-700">
            Presiona <kbd className="px-1 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">F1</kbd> para atajos
          </p>
        </div>
      </div>
    </div>
  );
}