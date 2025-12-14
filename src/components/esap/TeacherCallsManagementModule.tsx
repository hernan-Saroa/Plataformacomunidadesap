/**
 * Módulo Principal de Convocatorias Docentes
 * 
 * Sistema completo para gestionar convocatorias docentes con:
 * - Creación y publicación de convocatorias
 * - Recepción de aplicaciones (abiertas al público)
 * - Evaluación documento por documento
 * - Validación requisito por requisito
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Megaphone,
  FolderKanban,
  UserPlus,
  ClipboardList,
  ChevronRight,
  Users,
  FileCheck,
  TrendingUp
} from 'lucide-react';

type SubModule = 'management' | 'applications' | 'evaluation';

export function TeacherCallsManagementModule() {
  const [activeSubModule, setActiveSubModule] = useState<SubModule>('management');
  
  // Mock stats (en producción vendrían de la API)
  const activeCallsCount = 8;
  const pendingApplications = 42;
  const documentsToReview = 127;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 mb-2 flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            Convocatorias Docentes
          </h1>
          <p className="text-gray-600">
            Sistema completo de gestión de convocatorias y postulaciones
          </p>
        </div>
      </div>

      {/* Submódulos - Cards de navegación */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* 1. Gestión de Convocatorias */}
        <motion.button
          onClick={() => setActiveSubModule('management')}
          className={`relative overflow-hidden rounded-2xl border-2 transition-all text-left ${
            activeSubModule === 'management'
              ? 'border-[#1e5da8] bg-gradient-to-br from-[#1e5da8]/5 to-blue-50 shadow-lg'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                  activeSubModule === 'management'
                    ? 'bg-gradient-to-br from-[#1e5da8] to-blue-600'
                    : 'bg-gray-100'
                }`}
              >
                <FolderKanban
                  className={`w-7 h-7 ${activeSubModule === 'management' ? 'text-white' : 'text-gray-500'}`}
                  strokeWidth={2}
                />
              </div>
              {activeCallsCount > 0 && (
                <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                  {activeCallsCount} activas
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Gestión de Convocatorias</h3>
            <p className="text-sm text-gray-600 mb-4">
              Crear, editar y publicar convocatorias docentes
            </p>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#1e5da8]">
              Ver módulo <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </motion.button>

        {/* 2. Aplicaciones */}
        <motion.button
          onClick={() => setActiveSubModule('applications')}
          className={`relative overflow-hidden rounded-2xl border-2 transition-all text-left ${
            activeSubModule === 'applications'
              ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100/50 shadow-lg'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                  activeSubModule === 'applications'
                    ? 'bg-gradient-to-br from-purple-500 to-purple-600'
                    : 'bg-gray-100'
                }`}
              >
                <UserPlus
                  className={`w-7 h-7 ${activeSubModule === 'applications' ? 'text-white' : 'text-gray-500'}`}
                  strokeWidth={2}
                />
              </div>
              {pendingApplications > 0 && (
                <span className="px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full animate-pulse">
                  {pendingApplications} pendientes
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Aplicaciones</h3>
            <p className="text-sm text-gray-600 mb-4">
              Gestiona postulaciones recibidas (acceso abierto)
            </p>
            <div className="flex items-center gap-2 text-sm font-semibold text-purple-600">
              Ver módulo <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </motion.button>

        {/* 3. Evaluación de Documentos */}
        <motion.button
          onClick={() => setActiveSubModule('evaluation')}
          className={`relative overflow-hidden rounded-2xl border-2 transition-all text-left ${
            activeSubModule === 'evaluation'
              ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/50 shadow-lg'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                  activeSubModule === 'evaluation'
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                    : 'bg-gray-100'
                }`}
              >
                <ClipboardList
                  className={`w-7 h-7 ${activeSubModule === 'evaluation' ? 'text-white' : 'text-gray-500'}`}
                  strokeWidth={2}
                />
              </div>
              {documentsToReview > 0 && (
                <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                  {documentsToReview} docs
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Evaluación de Documentos</h3>
            <p className="text-sm text-gray-600 mb-4">
              Validación requisito por requisito
            </p>
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
              Ver módulo <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </motion.button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-blue-700 font-medium">Convocatorias Activas</p>
              <p className="text-2xl font-black text-blue-900">{activeCallsCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-purple-700 font-medium">Aplicaciones Pendientes</p>
              <p className="text-2xl font-black text-purple-900">{pendingApplications}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-4 border border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-emerald-500 flex items-center justify-center">
              <FileCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-emerald-700 font-medium">Documentos por Revisar</p>
              <p className="text-2xl font-black text-emerald-900">{documentsToReview}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Submódulo activo */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubModule}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Nota: Los submódulos se renderizan directamente desde App.tsx */}
          {activeSubModule === 'posts' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
              <p className="text-gray-600">
                Haz clic en uno de los submódulos arriba para acceder a su contenido específico
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Placeholder components (se desarrollarán en detalle)
function TeacherCallsManagementContent() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Gestión de Convocatorias</h2>
      <p className="text-gray-600">
        Módulo para crear, editar y publicar convocatorias docentes. En desarrollo...
      </p>
    </div>
  );
}

function TeacherCallsApplicationsContent() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Aplicaciones Recibidas</h2>
      <p className="text-gray-600">
        Módulo para gestionar postulaciones (abiertas al público). En desarrollo...
      </p>
    </div>
  );
}

function TeacherCallsEvaluationContent() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Evaluación de Documentos</h2>
      <p className="text-gray-600">
        Módulo para validar documentos y requisitos uno por uno. En desarrollo...
      </p>
    </div>
  );
}