/**
 * Módulo de Gestión de Comunidad Premium
 * 
 * Gestión unificada del Portal Transaccional - La Comunidad ESAP
 * Incluye Posts y Eventos con diseño premium consistente
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Calendar, 
  Sparkles,
  TrendingUp,
  Hash,
  Users,
  Heart,
  Eye
} from 'lucide-react';
import { CommunityPostsModuleUnified } from './CommunityPostsModuleUnified';
import { CommunityEventsModuleUnified } from './CommunityEventsModuleUnified';
import { Card } from '../ui/card';

type SubModule = 'posts' | 'events';

export function CommunityManagementModulePremium() {
  const [activeSubModule, setActiveSubModule] = useState<SubModule>('posts');
  
  // Mock stats (en producción vendrían de la API)
  const stats = {
    totalPosts: 1234,
    totalEvents: 89,
    totalEngagement: 15678,
    activeUsers: 3421
  };

  const pendingPosts = 5;
  const upcomingEvents = 12;

  return (
    <div className="space-y-6">
      {/* Header Premium */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#003DA5] to-[#0052cc]">
              <Sparkles className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl lg:text-xl xl:text-2xl font-extrabold text-[--esap-gray-900] tracking-tight">
              Gestión de Comunidad
            </h1>
          </div>
          <p className="text-xs lg:text-[11px] xl:text-xs text-[--esap-gray-600]">
            Administra publicaciones y eventos del Portal Transaccional - La Comunidad ESAP
          </p>
        </div>
      </motion.div>

      {/* Stats Cards Premium */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Posts */}
          <motion.div
            className="bg-white rounded-xl p-5 border border-[--esap-gray-200]"
            style={{ boxShadow: 'var(--esap-shadow-sm)' }}
            whileHover={{ y: -2, boxShadow: 'var(--esap-shadow-md)' }}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 flex-shrink-0">
                <MessageSquare className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-3xl font-black text-[--esap-gray-900] mb-1.5">
              {stats.totalPosts.toLocaleString()}
            </p>
            <p className="text-xs font-bold text-[--esap-gray-600] uppercase tracking-wide">
              Publicaciones
            </p>
          </motion.div>

          {/* Total Events */}
          <motion.div
            className="bg-white rounded-xl p-5 border border-[--esap-gray-200]"
            style={{ boxShadow: 'var(--esap-shadow-sm)' }}
            whileHover={{ y: -2, boxShadow: 'var(--esap-shadow-md)' }}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-600 flex-shrink-0">
                <Calendar className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-3xl font-black text-[--esap-gray-900] mb-1.5">
              {stats.totalEvents}
            </p>
            <p className="text-xs font-bold text-[--esap-gray-600] uppercase tracking-wide">
              Eventos
            </p>
          </motion.div>

          {/* Engagement */}
          <motion.div
            className="bg-white rounded-xl p-5 border border-[--esap-gray-200]"
            style={{ boxShadow: 'var(--esap-shadow-sm)' }}
            whileHover={{ y: -2, boxShadow: 'var(--esap-shadow-md)' }}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-pink-500 to-pink-600 flex-shrink-0">
                <Heart className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-3xl font-black text-[--esap-gray-900] mb-1.5">
              {stats.totalEngagement.toLocaleString()}
            </p>
            <p className="text-xs font-bold text-[--esap-gray-600] uppercase tracking-wide">
              Engagement
            </p>
          </motion.div>

          {/* Active Users */}
          <motion.div
            className="bg-white rounded-xl p-5 border border-[--esap-gray-200]"
            style={{ boxShadow: 'var(--esap-shadow-sm)' }}
            whileHover={{ y: -2, boxShadow: 'var(--esap-shadow-md)' }}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-green-500 to-green-600 flex-shrink-0">
                <Users className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-3xl font-black text-[--esap-gray-900] mb-1.5">
              {stats.activeUsers.toLocaleString()}
            </p>
            <p className="text-xs font-bold text-[--esap-gray-600] uppercase tracking-wide">
              Usuarios Activos
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Tabs de Submódulos Premium */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-0">
              {/* Tab Posts */}
              <button
                onClick={() => setActiveSubModule('posts')}
                className={`relative px-6 py-5 text-left transition-all ${
                  activeSubModule === 'posts'
                    ? 'bg-white'
                    : 'hover:bg-white/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                      activeSubModule === 'posts'
                        ? 'bg-gradient-to-br from-[#003DA5] to-[#0052cc]'
                        : 'bg-gray-200'
                    }`}
                  >
                    <MessageSquare
                      className={`w-6 h-6 ${activeSubModule === 'posts' ? 'text-white' : 'text-gray-500'}`}
                      strokeWidth={2.5}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-sm ${
                      activeSubModule === 'posts' ? 'text-gray-900' : 'text-gray-600'
                    }`}>
                      Posts y Publicaciones
                    </h3>
                    <p className="text-xs text-gray-500">
                      Gestiona contenido de la comunidad
                    </p>
                  </div>
                  {pendingPosts > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse" />
                      <span className="text-xs font-bold">{pendingPosts}</span>
                    </div>
                  )}
                </div>
                {activeSubModule === 'posts' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#003DA5] to-[#0052cc]"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>

              {/* Tab Events */}
              <button
                onClick={() => setActiveSubModule('events')}
                className={`relative px-6 py-5 text-left transition-all border-l border-gray-200 ${
                  activeSubModule === 'events'
                    ? 'bg-white'
                    : 'hover:bg-white/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                      activeSubModule === 'events'
                        ? 'bg-gradient-to-br from-purple-500 to-purple-600'
                        : 'bg-gray-200'
                    }`}
                  >
                    <Calendar
                      className={`w-6 h-6 ${activeSubModule === 'events' ? 'text-white' : 'text-gray-500'}`}
                      strokeWidth={2.5}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-sm ${
                      activeSubModule === 'events' ? 'text-gray-900' : 'text-gray-600'
                    }`}>
                      Eventos
                    </h3>
                    <p className="text-xs text-gray-500">
                      Administra eventos de la comunidad
                    </p>
                  </div>
                  {upcomingEvents > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
                      <span className="text-xs font-bold">{upcomingEvents}</span>
                    </div>
                  )}
                </div>
                {activeSubModule === 'events' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-purple-600"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            </div>
          </div>

          {/* Contenido del Submódulo Activo */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSubModule}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {activeSubModule === 'posts' && <CommunityPostsModuleUnified />}
                {activeSubModule === 'events' && <CommunityEventsModuleUnified />}
              </motion.div>
            </AnimatePresence>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}