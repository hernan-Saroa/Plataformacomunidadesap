/**
 * MÓDULO COMPLETO DE CONTROL DISCIPLINARIO
 * Integra todas las mejoras de usabilidad:
 * - Búsqueda Global
 * - Timeline Visual
 * - Quick Actions
 * - Drag & Drop (Vista Kanban)
 * - Preview en Hover
 * - Notificaciones Contextuales
 * - Formularios con Progreso
 * - Toggle entre Vista Tabla, Vista Kanban y Vista Ultimate
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { List, LayoutGrid, Zap } from 'lucide-react';
import { Card } from '../ui/card';
import { ControlDisciplinarioEnhanced } from './ControlDisciplinarioEnhanced';
import { ControlDisciplinarioKanban } from './ControlDisciplinarioKanban';
import { ControlDisciplinarioUltimate } from './ControlDisciplinarioUltimateFixed';

type ViewMode = 'table' | 'kanban' | 'ultimate';

export function ControlDisciplinarioComplete() {
  const [viewMode, setViewMode] = useState<ViewMode>('ultimate');

  return (
    <div className="w-full">
      {/* Toggle de Vista */}
      <div className="flex items-center justify-end mb-6 px-8 pt-8">
        <div 
          className="inline-flex items-center gap-1 p-1 rounded-xl"
          style={{ background: '#F3F4F6' }}
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setViewMode('table')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all"
            style={{
              background: viewMode === 'table' ? '#003DA5' : 'transparent',
              color: viewMode === 'table' ? '#FFFFFF' : '#6B7280'
            }}
          >
            <List className="w-4 h-4" />
            Vista Tabla
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setViewMode('kanban')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all"
            style={{
              background: viewMode === 'kanban' ? '#003DA5' : 'transparent',
              color: viewMode === 'kanban' ? '#FFFFFF' : '#6B7280'
            }}
          >
            <LayoutGrid className="w-4 h-4" />
            Vista Kanban
            <span 
              className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ 
                background: viewMode === 'kanban' ? '#FFFFFF' : '#E0EDFF',
                color: viewMode === 'kanban' ? '#003DA5' : '#003DA5'
              }}
            >
              Drag & Drop
            </span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setViewMode('ultimate')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all"
            style={{
              background: viewMode === 'ultimate' ? '#003DA5' : 'transparent',
              color: viewMode === 'ultimate' ? '#FFFFFF' : '#6B7280'
            }}
          >
            <Zap className="w-4 h-4" />
            Vista Ultimate
            <span 
              className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ 
                background: viewMode === 'ultimate' ? '#10B981' : '#D1FAE5',
                color: viewMode === 'ultimate' ? '#FFFFFF' : '#065F46'
              }}
            >
              NUEVO
            </span>
          </motion.button>
        </div>
      </div>

      {/* Vista Actual */}
      <motion.div
        key={viewMode}
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {viewMode === 'table' ? (
          <ControlDisciplinarioEnhanced />
        ) : viewMode === 'kanban' ? (
          <ControlDisciplinarioKanban />
        ) : (
          <ControlDisciplinarioUltimate />
        )}
      </motion.div>
    </div>
  );
}