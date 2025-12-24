import React from 'react';
import { motion } from 'motion/react';
import { BarChart3, TrendingUp, Users, AlertTriangle, Activity, Clock, MapPin, Shield } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AuditAnalyticsProps {
  events: any[];
}

export function AuditAnalytics({ events }: AuditAnalyticsProps) {
  // Calcular métricas
  const totalEvents = events.length;
  const criticalEvents = events.filter(e => e.severity === 'critical').length;
  const failedEvents = events.filter(e => e.status === 'failed').length;
  const uniqueUsers = new Set(events.map(e => e.userId)).size;

  // Datos para gráfico de actividad por hora
  const activityByHour = Array.from({ length: 24 }, (_, hour) => {
    const count = events.filter(e => {
      const eventHour = parseInt(e.timestamp.split(' ')[1].split(':')[0]);
      return eventHour === hour;
    }).length;
    return { hora: `${hour}:00`, eventos: count };
  }).filter(d => d.eventos > 0);

  // Datos para gráfico de eventos por módulo
  const eventsByModule = Object.entries(
    events.reduce((acc, event) => {
      acc[event.module] = (acc[event.module] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }))
   .sort((a, b) => b.value - a.value)
   .slice(0, 8);

  // Datos para gráfico de severidad
  const eventsBySeverity = [
    { name: 'Crítico', value: events.filter(e => e.severity === 'critical').length, color: '#DC2626' },
    { name: 'Alto', value: events.filter(e => e.severity === 'high').length, color: '#F59E0B' },
    { name: 'Medio', value: events.filter(e => e.severity === 'medium').length, color: '#3B82F6' },
    { name: 'Bajo', value: events.filter(e => e.severity === 'low').length, color: '#10B981' },
    { name: 'Info', value: events.filter(e => e.severity === 'info').length, color: '#6B7280' },
  ].filter(item => item.value > 0);

  // Top 5 usuarios más activos
  const topUsers = Object.entries(
    events.reduce((acc, event) => {
      const key = `${event.user}|${event.userId}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  )
    .map(([key, count]) => {
      const [user, userId] = key.split('|');
      return { user, userId, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Eventos críticos recientes
  const recentCriticalEvents = events
    .filter(e => e.severity === 'critical' || e.severity === 'high')
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Events */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 shadow-lg"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-blue-100 text-sm font-semibold mb-1">Total Eventos</p>
              <p className="text-white text-3xl font-extrabold">{totalEvents.toLocaleString()}</p>
              <p className="text-blue-100 text-xs mt-2">Últimas 24 horas</p>
            </div>
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
          </div>
        </motion.div>

        {/* Critical Events */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-5 shadow-lg"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-red-100 text-sm font-semibold mb-1">Eventos Críticos</p>
              <p className="text-white text-3xl font-extrabold">{criticalEvents}</p>
              <p className="text-red-100 text-xs mt-2">
                {criticalEvents > 0 ? 'Requieren atención' : 'Todo normal'}
              </p>
            </div>
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
          </div>
        </motion.div>

        {/* Failed Events */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 shadow-lg"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-orange-100 text-sm font-semibold mb-1">Eventos Fallidos</p>
              <p className="text-white text-3xl font-extrabold">{failedEvents}</p>
              <p className="text-orange-100 text-xs mt-2">
                {((failedEvents / totalEvents) * 100).toFixed(1)}% del total
              </p>
            </div>
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
          </div>
        </motion.div>

        {/* Unique Users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 shadow-lg"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-blue-100 text-sm font-semibold mb-1">Usuarios Activos</p>
              <p className="text-white text-3xl font-extrabold">{uniqueUsers}</p>
              <p className="text-blue-100 text-xs mt-2">Usuarios únicos</p>
            </div>
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity by Hour */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-[#1e5da8] to-blue-600 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Actividad por Hora</h3>
              <p className="text-sm text-gray-600">Distribución de eventos</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={activityByHour}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="hora" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff'
                }}
              />
              <Bar dataKey="eventos" fill="#1e5da8" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Events by Severity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Distribución por Severidad</h3>
              <p className="text-sm text-gray-600">Clasificación de eventos</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={eventsBySeverity}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {eventsBySeverity.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Events by Module */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Eventos por Módulo</h3>
            <p className="text-sm text-gray-600">Top 8 módulos más activos</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={eventsByModule} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis type="number" stroke="#6B7280" fontSize={12} />
            <YAxis dataKey="name" type="category" stroke="#6B7280" fontSize={12} width={150} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: 'none',
                borderRadius: '12px',
                color: '#fff'
              }}
            />
            <Bar dataKey="value" fill="#3B82F6" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Bottom Row: Top Users + Recent Critical Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Active Users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Top 5 Usuarios Activos</h3>
              <p className="text-sm text-gray-600">Mayor actividad registrada</p>
            </div>
          </div>
          <div className="space-y-3">
            {topUsers.map((user, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#1e5da8] to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">#{index + 1}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm truncate">{user.user}</p>
                    <p className="text-xs text-gray-600">{user.userId}</p>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                    {user.count} eventos
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Critical Events */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Eventos Críticos Recientes</h3>
              <p className="text-sm text-gray-600">Requieren atención inmediata</p>
            </div>
          </div>
          <div className="space-y-3">
            {recentCriticalEvents.length > 0 ? (
              recentCriticalEvents.map((event, index) => (
                <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="font-semibold text-red-900 text-sm flex-1">{event.action}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                      event.severity === 'critical' 
                        ? 'bg-red-200 text-red-800' 
                        : 'bg-orange-200 text-orange-800'
                    }`}>
                      {event.severity === 'critical' ? 'Crítico' : 'Alto'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-red-700">
                    <Clock className="w-3 h-3" />
                    <span>{event.timestamp}</span>
                    <span>•</span>
                    <span>{event.user}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-8 h-8 text-[#1e5da8]" />
                </div>
                <p className="font-semibold text-gray-900">¡Todo está bien!</p>
                <p className="text-sm text-gray-600 mt-1">No hay eventos críticos recientes</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}