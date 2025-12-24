/**
 * ============================================
 * CONFIGURACIÓN AUDITORÍAS - MÓDULO INDEPENDIENTE
 * ============================================
 * 
 * Tipos, listas y parámetros de auditoría:
 * - Tipos de Auditoría (5 tipos principales)
 * - Listas de Chequeo (plantillas de verificación)
 * 
 * ÚLTIMA ACTUALIZACIÓN: 24 Diciembre 2025
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Target, CheckSquare, List, ChevronRight, Info, Save,
  Plus, Edit, Eye, Clock, Users, HelpCircle
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';

// ====================================
// TIPOS
// ====================================

type TabActiva = 'tipos' | 'listas';

interface TabConfig {
  id: TabActiva;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  badge?: number;
}

const TABS_CONFIG: TabConfig[] = [
  {
    id: 'tipos',
    label: 'Tipos de Auditoría',
    description: 'Gestión, Financiera, Cumplimiento, TI, Territorial',
    icon: CheckSquare,
    color: '#10B981',
    badge: 5
  },
  {
    id: 'listas',
    label: 'Listas de Chequeo',
    description: 'Plantillas de verificación estándar',
    icon: List,
    color: '#3B82F6',
    badge: 8
  }
];

// ====================================
// DATOS MOCK
// ====================================

interface TipoAuditoria {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  alcance: string;
  duracionPromedio: number;
  equipoPromedio: number;
  color: string;
  activa: boolean;
  auditoriasProgramadas: number;
}

const TIPOS_AUDITORIA: TipoAuditoria[] = [
  {
    id: 'tipo-001',
    codigo: 'AUD-GEST',
    nombre: 'Auditoría de Gestión',
    descripcion: 'Evaluación de la eficiencia y eficacia de los procesos',
    alcance: 'Procesos administrativos, académicos y financieros',
    duracionPromedio: 30,
    equipoPromedio: 3,
    color: '#3B82F6',
    activa: true,
    auditoriasProgramadas: 8
  },
  {
    id: 'tipo-002',
    codigo: 'AUD-FIN',
    nombre: 'Auditoría Financiera',
    descripcion: 'Revisión de estados financieros y manejo de recursos',
    alcance: 'Presupuesto, contabilidad y tesorería',
    duracionPromedio: 45,
    equipoPromedio: 4,
    color: '#10B981',
    activa: true,
    auditoriasProgramadas: 4
  },
  {
    id: 'tipo-003',
    codigo: 'AUD-COMP',
    nombre: 'Auditoría de Cumplimiento',
    descripcion: 'Verificación del cumplimiento normativo',
    alcance: 'Normas legales, decretos y resoluciones',
    duracionPromedio: 20,
    equipoPromedio: 2,
    color: '#F59E0B',
    activa: true,
    auditoriasProgramadas: 12
  },
  {
    id: 'tipo-004',
    codigo: 'AUD-TI',
    nombre: 'Auditoría de Sistemas de Información',
    descripcion: 'Evaluación de controles en sistemas TI',
    alcance: 'Infraestructura tecnológica y seguridad',
    duracionPromedio: 25,
    equipoPromedio: 3,
    color: '#8B5CF6',
    activa: true,
    auditoriasProgramadas: 3
  },
  {
    id: 'tipo-005',
    codigo: 'AUD-TERR',
    nombre: 'Auditoría Territorial',
    descripcion: 'Auditoría a sedes territoriales',
    alcance: 'Procesos de territoriales',
    duracionPromedio: 19,
    equipoPromedio: 3,
    color: '#EC4899',
    activa: true,
    auditoriasProgramadas: 16
  }
];

// ====================================
// COMPONENTE PRINCIPAL
// ====================================

export function ConfiguracionAuditoriasModule() {
  const [tabActiva, setTabActiva] = useState<TabActiva>('tipos');

  const tabConfig = TABS_CONFIG.find(t => t.id === tabActiva);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <div className="max-w-[1600px] mx-auto p-6">
        
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6 mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#059669] to-[#047857] rounded-xl flex items-center justify-center shadow-lg">
                <Target className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Configuración de Auditorías
                </h1>
                <p className="text-sm text-gray-600">
                  Tipos, listas y parámetros de auditoría
                </p>
              </div>
            </div>

            <Button onClick={() => toast.success('Guardado')} style={{ background: '#003DA5' }}>
              <Save className="w-4 h-4 mr-2" />
              Guardar
            </Button>
          </div>

          {/* TABS */}
          <div className="flex gap-2 mt-6">
            {TABS_CONFIG.map((tab) => {
              const isActive = tabActiva === tab.id;
              const Icon = tab.icon;

              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setTabActiva(tab.id)}
                  className={`
                    relative flex items-center gap-3 px-5 py-3 rounded-xl transition-all flex-1
                    ${isActive ? 'bg-white shadow-lg ring-2 ring-[#003DA5]/20' : 'hover:bg-white/50'}
                  `}
                  whileHover={{ y: -2 }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r rounded-xl opacity-5"
                      style={{ background: `linear-gradient(135deg, ${tab.color}20, ${tab.color}10)` }}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <div
                    className="relative p-2 rounded-lg"
                    style={{ background: isActive ? `${tab.color}15` : 'transparent' }}
                  >
                    <Icon className="w-5 h-5" style={{ color: isActive ? tab.color : '#6B7280' }} />
                  </div>
                  <div className="flex-1 text-left">
                    <span className={`font-semibold text-sm ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                      {tab.label}
                    </span>
                    <p className="text-xs text-gray-500">{tab.description}</p>
                  </div>
                  {tab.badge && (
                    <Badge variant={isActive ? 'default' : 'outline'} className="text-xs">{tab.badge}</Badge>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* CONTENIDO */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tabActiva}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {tabActiva === 'tipos' && <SeccionTiposAuditoria />}
            {tabActiva === 'listas' && <SeccionListasChequeo />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function SeccionTiposAuditoria() {
  const [tipos] = useState(TIPOS_AUDITORIA);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Tipos de Auditoría</h3>
          <p className="text-sm text-gray-600 mt-1">Gestiona los tipos de auditoría disponibles</p>
        </div>
        <Button style={{ background: '#003DA5' }}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Tipo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tipos.map((tipo) => (
          <div
            key={tipo.id}
            className="p-4 border-2 rounded-xl"
            style={{
              borderColor: tipo.activa ? tipo.color : '#E5E7EB',
              background: tipo.activa ? tipo.color + '10' : '#F9FAFB'
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <Badge variant="outline" className="mb-2" style={{ background: tipo.color + '20', color: tipo.color, border: 'none' }}>
                  {tipo.codigo}
                </Badge>
                <h4 className="font-bold text-gray-900">{tipo.nombre}</h4>
              </div>
              <Button variant="outline" size="sm">
                <Edit className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-sm text-gray-600 mb-3">{tipo.descripcion}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-1 text-gray-600">
                <Clock className="w-3 h-3" />
                <span>{tipo.duracionPromedio} días</span>
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <Users className="w-3 h-3" />
                <span>{tipo.equipoPromedio} personas</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SeccionListasChequeo() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Listas de Chequeo Estándar</h3>
          <p className="text-sm text-gray-600 mt-1">Administra listas de verificación</p>
        </div>
        <Button style={{ background: '#003DA5' }}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Lista
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
          <div key={idx} className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer">
            <CheckSquare className="w-8 h-8 text-blue-600 mb-3" />
            <h4 className="font-bold text-gray-900 mb-1">Lista de Chequeo #{idx}</h4>
            <p className="text-sm text-gray-600 mb-3">Auditoría de Gestión</p>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>15 ítems</span>
              <Button variant="outline" size="sm">
                <Eye className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default ConfiguracionAuditoriasModule;
