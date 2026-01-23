import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserServices } from '../hooks/useUserServices';
import { ServiceCard } from './ServiceCard';
import { Bell, TrendingUp, CheckCircle2, Clock } from 'lucide-react';

interface PortalDashboardProps {
  user: any; // TODO: Importar tipo UsuarioPersona desde hook
}

/**
 * Dashboard Principal del Portal Transaccional Unificado
 * 
 * Muestra servicios dinámicamente según los roles del usuario.
 */
export function PortalDashboard({ user }: PortalDashboardProps) {
  const navigate = useNavigate();
  const { servicios, tieneServicios } = useUserServices(user);

  // Calcular métricas generales
  const totalTareasPendientes = servicios.reduce((acc, servicio) => {
    return acc + (typeof servicio.badge === 'number' ? servicio.badge : 0);
  }, 0);

  const notificacionesNoLeidas = servicios.find(s => s.id === 'mis-notificaciones')?.badge || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E0EDFF] via-white to-[#FFF8E1]">
      {/* Header del Portal */}
      <div className="bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-light mb-2">
            Bienvenido, {user?.nombres} {user?.apellidos}
          </h1>
          <div className="flex items-center gap-4 text-sm text-white/80">
            {user?.sede && (
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white/60 rounded-full" />
                Sede {user.sede.nombre}
              </span>
            )}
            {user?.area && (
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white/60 rounded-full" />
                {user.area.nombre}
              </span>
            )}
            {user?.roles && user.roles.length > 0 && (
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white/60 rounded-full" />
                {user.roles.join(', ')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Métricas Generales */}
      <div className="max-w-7xl mx-auto px-6 -mt-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Tareas Pendientes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Tareas Pendientes</span>
              <Clock className="w-5 h-5 text-[#F57C00]" />
            </div>
            <div className="text-3xl font-light text-[#003DA5]">
              {totalTareasPendientes}
            </div>
          </div>

          {/* Notificaciones */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
               onClick={() => navigate('/portal/notificaciones')}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Notificaciones</span>
              <Bell className="w-5 h-5 text-[#2962FF]" />
            </div>
            <div className="text-3xl font-light text-[#003DA5]">
              {notificacionesNoLeidas}
            </div>
          </div>

          {/* Servicios Disponibles */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Servicios</span>
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-light text-[#003DA5]">
              {servicios.length}
            </div>
          </div>

          {/* Estado General */}
          <div className="bg-gradient-to-br from-[#2962FF] to-[#003DA5] rounded-xl shadow-sm p-5 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/80">Estado General</span>
              <TrendingUp className="w-5 h-5 text-white/80" />
            </div>
            <div className="text-2xl font-light">
              {totalTareasPendientes === 0 ? 'Al día' : 'Pendientes'}
            </div>
          </div>
        </div>
      </div>

      {/* Servicios Disponibles */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        <h2 className="text-2xl font-light text-[#003DA5] mb-6">
          Mis Servicios
        </h2>

        {!tieneServicios ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-gray-400 mb-4">
              <CheckCircle2 className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-xl text-gray-600 mb-2">
              No hay servicios disponibles
            </h3>
            <p className="text-gray-500">
              No se encontraron servicios asignados a tu perfil.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {servicios.map((servicio) => (
              <ServiceCard
                key={servicio.id}
                titulo={servicio.titulo}
                descripcion={servicio.descripcion}
                icono={servicio.icono}
                badge={servicio.badge}
                color={servicio.color}
                onClick={() => navigate(servicio.ruta)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mensaje de Ayuda */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        <div className="bg-gradient-to-r from-[#E0EDFF] to-[#FFF8E1] rounded-xl p-6 border border-[#2962FF]/20">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-[#2962FF] rounded-full flex items-center justify-center">
                <Bell className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-[#003DA5] mb-2">
                ¿Necesitas ayuda?
              </h3>
              <p className="text-gray-600 mb-4">
                Si no encuentras el servicio que buscas, contacta al administrador del sistema.
              </p>
              <button 
                className="px-4 py-2 bg-[#2962FF] text-white rounded-lg hover:bg-[#003DA5] transition-colors text-sm"
                onClick={() => navigate('/portal/ayuda')}
              >
                Centro de Ayuda
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
