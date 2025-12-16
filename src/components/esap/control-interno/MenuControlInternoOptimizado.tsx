/**
 * MENÚ OPTIMIZADO - CONTROL INTERNO DE GESTIÓN
 * Estructura compacta con 6 grupos principales
 * Reducción de 19 ítems a 6 grupos colapsables
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield, ChevronDown, ChevronRight, Target, Database,
  CalendarDays, FileSearch, ClipboardCheck, MapPin, Calendar,
  PlayCircle, Send, CheckSquare, AlertTriangle, ListChecks,
  Activity, Scale, FolderOpen, Bell, CheckCircle, Settings
} from 'lucide-react';
import { Badge } from '../../ui/badge';

interface MenuItem {
  id: string;
  label: string;
  icon: JSX.Element;
  color?: string;
  badge?: number;
  children?: MenuItem[];
}

interface MenuOptimizadoProps {
  seccionActiva: string;
  onSeccionChange: (seccion: string) => void;
}

export function MenuControlInternoOptimizado({ seccionActiva, onSeccionChange }: MenuOptimizadoProps) {
  const [gruposExpandidos, setGruposExpandidos] = useState<Set<string>>(
    new Set(['planificacion', 'auditorias', 'hallazgos', 'informes', 'control'])
  );

  const toggleGrupo = (grupoId: string) => {
    const nuevosExpandidos = new Set(gruposExpandidos);
    if (nuevosExpandidos.has(grupoId)) {
      nuevosExpandidos.delete(grupoId);
    } else {
      nuevosExpandidos.add(grupoId);
    }
    setGruposExpandidos(nuevosExpandidos);
  };

  const menuItems: MenuItem[] = [
    // 1. DASHBOARD EJECUTIVO (Standalone)
    {
      id: 'dashboard',
      label: 'Dashboard Ejecutivo',
      icon: <Shield className="w-5 h-5" />,
      color: '#3B82F6'
    },

    // 2. PLANIFICACIÓN ANUAL
    {
      id: 'planificacion',
      label: 'Planificación Anual',
      icon: <Target className="w-5 h-5" />,
      color: '#3B82F6',
      children: [
        {
          id: 'plan-anual',
          label: 'Plan Anual (5 Roles)',
          icon: <Target className="w-4 h-4" />
        },
        {
          id: 'universo-auditorias',
          label: 'Universo de Auditorías',
          icon: <Database className="w-4 h-4" />
        },
        {
          id: 'programa-anual',
          label: 'Programa Anual de Auditorías',
          icon: <CalendarDays className="w-4 h-4" />
        }
      ]
    },

    // 3. AUDITORÍAS
    {
      id: 'auditorias',
      label: 'Auditorías',
      icon: <ClipboardCheck className="w-5 h-5" />,
      color: '#F97316',
      children: [
        {
          id: 'auditorias',
          label: 'Gestión de Auditorías',
          icon: <ClipboardCheck className="w-4 h-4" />
        },
        {
          id: 'auditorias-territoriales',
          label: 'Auditorías Territoriales',
          icon: <MapPin className="w-4 h-4" />,
          badge: 16
        },
        {
          id: 'plan-individual',
          label: 'Plan Individual de Auditoría',
          icon: <FileSearch className="w-4 h-4" />
        },
        {
          id: 'etapas',
          label: 'Etapas del Proceso',
          icon: <Activity className="w-4 h-4" />,
          children: [
            {
              id: 'etapa-planeacion',
              label: 'Planeación',
              icon: <Calendar className="w-4 h-4" />
            },
            {
              id: 'etapa-ejecucion',
              label: 'Ejecución',
              icon: <PlayCircle className="w-4 h-4" />
            },
            {
              id: 'etapa-comunicacion',
              label: 'Comunicación',
              icon: <Send className="w-4 h-4" />
            }
          ]
        },
        {
          id: 'listas-chequeo',
          label: 'Listas de Chequeo',
          icon: <CheckSquare className="w-4 h-4" />
        }
      ]
    },

    // 4. HALLAZGOS Y MEJORAMIENTO
    {
      id: 'hallazgos',
      label: 'Hallazgos y Mejoramiento',
      icon: <AlertTriangle className="w-5 h-5" />,
      color: '#F97316',
      badge: 5,
      children: [
        {
          id: 'hallazgos',
          label: 'Gestión de Hallazgos',
          icon: <AlertTriangle className="w-4 h-4" />,
          badge: 5
        },
        {
          id: 'planes-mejoramiento',
          label: 'Planes de Mejoramiento',
          icon: <ListChecks className="w-4 h-4" />
        },
        {
          id: 'seguimiento-planes',
          label: 'Seguimiento de Planes',
          icon: <Activity className="w-4 h-4" />,
          badge: 2
        }
      ]
    },

    // 5. INFORMES Y DOCUMENTACIÓN
    {
      id: 'informes',
      label: 'Informes y Documentación',
      icon: <Scale className="w-5 h-5" />,
      color: '#8B5CF6',
      badge: 1,
      children: [
        {
          id: 'informes-ley',
          label: 'Informes de Ley',
          icon: <Scale className="w-4 h-4" />,
          badge: 1
        },
        {
          id: 'gestion-documental',
          label: 'Gestión Documental',
          icon: <FolderOpen className="w-4 h-4" />
        }
      ]
    },

    // 6. CENTRO DE CONTROL
    {
      id: 'control',
      label: 'Centro de Control',
      icon: <Settings className="w-5 h-5" />,
      color: '#6B7280',
      badge: 6,
      children: [
        {
          id: 'notificaciones',
          label: 'Sistema de Notificaciones',
          icon: <Bell className="w-4 h-4" />,
          badge: 3
        },
        {
          id: 'aprobaciones',
          label: 'Aprobaciones Pendientes',
          icon: <CheckCircle className="w-4 h-4" />,
          badge: 3
        },
        {
          id: 'configuracion',
          label: 'Configuración',
          icon: <Settings className="w-4 h-4" />
        }
      ]
    }
  ];

  const renderMenuItem = (item: MenuItem, nivel: number = 0) => {
    const tieneHijos = item.children && item.children.length > 0;
    const estaExpandido = gruposExpandidos.has(item.id);
    const estaActivo = seccionActiva === item.id;
    const paddingLeft = nivel === 0 ? 'pl-4' : nivel === 1 ? 'pl-8' : 'pl-12';

    return (
      <div key={item.id}>
        {/* Item principal */}
        <button
          onClick={() => {
            if (tieneHijos && nivel === 0) {
              toggleGrupo(item.id);
            } else {
              onSeccionChange(item.id);
            }
          }}
          className={`w-full flex items-center gap-3 py-2.5 px-4 ${paddingLeft} transition-colors ${
            estaActivo && !tieneHijos
              ? 'bg-blue-50 border-l-4 border-blue-600 text-blue-700'
              : 'hover:bg-gray-50 text-gray-700'
          }`}
        >
          {/* Ícono de expansión (solo grupos nivel 0) */}
          {tieneHijos && nivel === 0 && (
            <div className="flex-shrink-0">
              {estaExpandido ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </div>
          )}

          {/* Ícono del item */}
          <div
            className="flex-shrink-0"
            style={{ color: nivel === 0 ? item.color : '#6B7280' }}
          >
            {item.icon}
          </div>

          {/* Label */}
          <span
            className={`flex-1 text-left text-sm ${
              nivel === 0 ? 'font-bold' : 'font-medium'
            }`}
          >
            {item.label}
          </span>

          {/* Badge */}
          {item.badge && (
            <Badge
              style={{
                background: estaActivo ? '#3B82F6' : '#EF4444',
                color: 'white',
                fontSize: '11px',
                padding: '2px 6px'
              }}
            >
              {item.badge}
            </Badge>
          )}
        </button>

        {/* Hijos (si existen y está expandido) */}
        <AnimatePresence>
          {tieneHijos && estaExpandido && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              {item.children!.map(child => renderMenuItem(child, nivel + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="w-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5" style={{ color: '#F97316' }} />
          <div>
            <h3 className="font-black text-sm text-gray-900">CONTROL INTERNO</h3>
            <p className="text-xs text-gray-600">Gestión</p>
          </div>
        </div>
      </div>

      {/* Menú */}
      <div className="py-2">
        {menuItems.map(item => renderMenuItem(item))}
      </div>

      {/* Footer info */}
      <div className="p-4 border-t border-gray-200 mt-4">
        <div className="text-xs text-gray-500">
          <p className="font-bold mb-1">Estructura Optimizada</p>
          <p>6 grupos • 19 funcionalidades</p>
        </div>
      </div>
    </div>
  );
}
