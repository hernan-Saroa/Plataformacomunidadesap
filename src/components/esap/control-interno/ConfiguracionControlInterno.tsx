/**
 * CONFIGURACIÓN - Control Interno de Gestión
 * Parámetros y configuraciones del sistema
 */

import { motion } from 'motion/react';
import {
  Settings, Users, Bell, FileText, Calendar, Shield
} from 'lucide-react';
import { Button } from '../../ui/button';

export function ConfiguracionControlInterno() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Configuración de Usuarios */}
        <motion.div
          className="p-6 rounded-2xl border-2"
          style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
          whileHover={{ y: -2 }}
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 rounded-xl" style={{ background: '#EFF6FF' }}>
              <Users className="w-6 h-6" style={{ color: '#3B82F6' }} />
            </div>
            <div className="flex-1">
              <h3 className="font-black mb-2" style={{ color: '#1F2937' }}>
                Gestión de Usuarios
              </h3>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                Administra permisos y roles de usuarios del módulo
              </p>
            </div>
          </div>
          <Button className="w-full" variant="outline" className="border-2">
            <Settings className="w-4 h-4 mr-2" />
            Configurar Usuarios
          </Button>
        </motion.div>

        {/* Notificaciones */}
        <motion.div
          className="p-6 rounded-2xl border-2"
          style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
          whileHover={{ y: -2 }}
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 rounded-xl" style={{ background: '#FEF3C7' }}>
              <Bell className="w-6 h-6" style={{ color: '#F59E0B' }} />
            </div>
            <div className="flex-1">
              <h3 className="font-black mb-2" style={{ color: '#1F2937' }}>
                Notificaciones
              </h3>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                Configura alertas y recordatorios automáticos
              </p>
            </div>
          </div>
          <Button className="w-full" variant="outline" className="border-2">
            <Settings className="w-4 h-4 mr-2" />
            Configurar Alertas
          </Button>
        </motion.div>

        {/* Plantillas de Documentos */}
        <motion.div
          className="p-6 rounded-2xl border-2"
          style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
          whileHover={{ y: -2 }}
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 rounded-xl" style={{ background: '#F3E8FF' }}>
              <FileText className="w-6 h-6" style={{ color: '#8B5CF6' }} />
            </div>
            <div className="flex-1">
              <h3 className="font-black mb-2" style={{ color: '#1F2937' }}>
                Plantillas de Documentos
              </h3>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                Personaliza plantillas de informes y actas
              </p>
            </div>
          </div>
          <Button className="w-full" variant="outline" className="border-2">
            <Settings className="w-4 h-4 mr-2" />
            Gestionar Plantillas
          </Button>
        </motion.div>

        {/* Calendario de Auditorías */}
        <motion.div
          className="p-6 rounded-2xl border-2"
          style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
          whileHover={{ y: -2 }}
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 rounded-xl" style={{ background: '#F0FDF4' }}>
              <Calendar className="w-6 h-6" style={{ color: '#10B981' }} />
            </div>
            <div className="flex-1">
              <h3 className="font-black mb-2" style={{ color: '#1F2937' }}>
                Calendario de Auditorías
              </h3>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                Define periodo fiscal y fechas importantes
              </p>
            </div>
          </div>
          <Button className="w-full" variant="outline" className="border-2">
            <Settings className="w-4 h-4 mr-2" />
            Configurar Calendario
          </Button>
        </motion.div>

        {/* Parámetros del Sistema */}
        <motion.div
          className="p-6 rounded-2xl border-2"
          style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
          whileHover={{ y: -2 }}
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 rounded-xl" style={{ background: '#FFF7ED' }}>
              <Shield className="w-6 h-6" style={{ color: '#F97316' }} />
            </div>
            <div className="flex-1">
              <h3 className="font-black mb-2" style={{ color: '#1F2937' }}>
                Parámetros del Sistema
              </h3>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                Configuración general del módulo de Control Interno
              </p>
            </div>
          </div>
          <Button className="w-full" variant="outline" className="border-2">
            <Settings className="w-4 h-4 mr-2" />
            Configurar Sistema
          </Button>
        </motion.div>

        {/* Criterios de Evaluación */}
        <motion.div
          className="p-6 rounded-2xl border-2"
          style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
          whileHover={{ y: -2 }}
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 rounded-xl" style={{ background: '#FEE2E2' }}>
              <Settings className="w-6 h-6" style={{ color: '#EF4444' }} />
            </div>
            <div className="flex-1">
              <h3 className="font-black mb-2" style={{ color: '#1F2937' }}>
                Criterios de Evaluación
              </h3>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                Define criterios y escalas de evaluación
              </p>
            </div>
          </div>
          <Button className="w-full" variant="outline" className="border-2">
            <Settings className="w-4 h-4 mr-2" />
            Configurar Criterios
          </Button>
        </motion.div>
      </div>

      {/* Información del Sistema */}
      <div className="p-6 rounded-2xl border-2" style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}>
        <h3 className="font-black mb-4" style={{ color: '#1F2937' }}>
          Información del Sistema
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-bold mb-1" style={{ color: '#6B7280' }}>Versión del Módulo</p>
            <p className="font-bold" style={{ color: '#1F2937' }}>v2.0.0</p>
          </div>
          <div>
            <p className="text-xs font-bold mb-1" style={{ color: '#6B7280' }}>Última Actualización</p>
            <p className="font-bold" style={{ color: '#1F2937' }}>01 Diciembre 2024</p>
          </div>
          <div>
            <p className="text-xs font-bold mb-1" style={{ color: '#6B7280' }}>Usuarios Activos</p>
            <p className="font-bold" style={{ color: '#1F2937' }}>15 usuarios</p>
          </div>
        </div>
      </div>
    </div>
  );
}
