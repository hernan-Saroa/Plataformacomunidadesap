/**
 * VISTA EXPANDIDA DE USUARIO
 * Diseño profesional de 2 columnas: Información Personal y Activación
 * Ocupa todo el ancho disponible con mejor UX
 */

import { 
  Users, 
  UserCheck, 
  FileText, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock,
  QrCode,
  UserPlus,
  Upload
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { motion } from 'motion/react';

interface UserExpandedViewProps {
  user: any;
  getStatusBadge: (status: string) => JSX.Element;
  getRoleBadge: (roleName: string, roleColor: string) => JSX.Element;
  onOpenDigitalFolder: () => void;
}

export function UserExpandedView({
  user,
  getStatusBadge,
  getRoleBadge,
  onOpenDigitalFolder
}: UserExpandedViewProps) {
  return (
    <motion.div
      initial={{ height: 0 }}
      animate={{ height: 'auto' }}
      exit={{ height: 0 }}
      className="overflow-hidden"
    >
      <div 
        className="p-6"
        style={{
          background: 'linear-gradient(135deg, #FAFBFC 0%, #F0F6FF 100%)',
          borderTop: '1px solid #DBEAFE',
          borderBottom: '3px solid #003DA5'
        }}
      >
        {/* GRID DE 2 COLUMNAS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* ═══════════════════════════════════════ */}
          {/* COLUMNA 1: INFORMACIÓN PERSONAL */}
          {/* ═══════════════════════════════════════ */}
          <div className="space-y-4 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#003DA5' }}>
                <Users className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-lg text-gray-900">
                Información Personal
              </h3>
            </div>

            {/* Card de información */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 space-y-4 flex-1">
              {/* Documento */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#F3F4F6' }}>
                  <FileText className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">Documento</p>
                  <p className="text-sm font-semibold text-gray-900">{user.documentType} {user.documentNumber}</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#F3F4F6' }}>
                  <Mail className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">Correo Electrónico</p>
                  <p className="text-sm font-semibold text-gray-900 break-all">{user.email}</p>
                </div>
              </div>

              {/* Teléfono */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#F3F4F6' }}>
                  <Phone className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">Teléfono</p>
                  <p className="text-sm font-semibold text-gray-900">{user.phone}</p>
                </div>
              </div>

              {/* Ubicación */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#F3F4F6' }}>
                  <MapPin className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">Ubicación</p>
                  <p className="text-sm font-semibold text-gray-900">{user.location}</p>
                </div>
              </div>

              {/* Fecha de nacimiento */}
              {user.birthDate && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#F3F4F6' }}>
                    <Calendar className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-0.5">Fecha de Nacimiento</p>
                    <p className="text-sm font-semibold text-gray-900">{user.birthDate}</p>
                  </div>
                </div>
              )}

              {/* Dirección */}
              {user.address && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#F3F4F6' }}>
                    <MapPin className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-0.5">Dirección</p>
                    <p className="text-sm font-semibold text-gray-900">{user.address}</p>
                  </div>
                </div>
              )}

              {/* Roles asignados */}
              <div className="pt-3 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-700 mb-2">ROLES ASIGNADOS</p>
                <div className="flex flex-wrap gap-1.5">
                  {user.roles.map((role: any, idx: number) => (
                    <div key={idx}>
                      {getRoleBadge(role.name, 'blue')}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════ */}
          {/* COLUMNA 2: ACTIVACIÓN */}
          {/* ═══════════════════════════════════════ */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#10B981' }}>
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-lg text-gray-900">
                Activación
              </h3>
            </div>

            {/* Card de activación */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 space-y-5">
              {/* Método de activación */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Método de Activación</p>
                  {user.enrollmentMethod === 'qr' && (
                    <Badge className="bg-green-100 text-green-700 border-green-300">
                      <QrCode className="w-3 h-3 mr-1" />
                      QR Code
                    </Badge>
                  )}
                  {user.enrollmentMethod === 'manual' && (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                      <UserPlus className="w-3 h-3 mr-1" />
                      Manual
                    </Badge>
                  )}
                  {user.enrollmentMethod === 'massive' && (
                    <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                      <Upload className="w-3 h-3 mr-1" />
                      Masivo
                    </Badge>
                  )}
                </div>

                {/* Descripción del método */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {user.enrollmentMethod === 'qr' && 'Usuario se registró de forma automática escaneando código QR desde la app móvil.'}
                    {user.enrollmentMethod === 'manual' && 'Usuario creado manualmente por un administrador del sistema.'}
                    {user.enrollmentMethod === 'massive' && 'Usuario importado mediante carga masiva de datos desde archivo Excel.'}
                  </p>
                </div>
              </div>

              {/* Fecha de activación */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#EFF6FF' }}>
                  <Calendar className="w-4 h-4" style={{ color: '#003DA5' }} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">Fecha de Activación</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(user.enrollmentDate).toLocaleDateString('es-CO', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(user.enrollmentDate).toLocaleTimeString('es-CO', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>

              {/* Último acceso */}
              {user.lastLogin && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#FEF3C7' }}>
                    <Clock className="w-4 h-4 text-yellow-700" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-0.5">Último Acceso</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(user.lastLogin).toLocaleDateString('es-CO', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Hace {Math.floor((Date.now() - new Date(user.lastLogin).getTime()) / (1000 * 60 * 60 * 24))} días
                    </p>
                  </div>
                </div>
              )}

              {/* Territorial y CETAP */}
              {(user.territorial || user.cetap || user.sedeCentral) && (
                <div className="space-y-2 pt-3 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Unidad Organizacional</p>
                  
                  {user.territorial && (
                    <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-green-100">
                        <MapPin className="w-4 h-4 text-green-700" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-green-600 font-medium">Territorial</p>
                        <p className="text-sm font-semibold text-green-900">{user.territorial.nombre}</p>
                      </div>
                    </div>
                  )}

                  {user.cetap && (
                    <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-orange-100">
                        <MapPin className="w-4 h-4 text-orange-700" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-orange-600 font-medium">CETAP</p>
                        <p className="text-sm font-semibold text-orange-900">{user.cetap.nombre}</p>
                      </div>
                    </div>
                  )}

                  {user.sedeCentral && !user.territorial && !user.cetap && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-100">
                        <Users className="w-4 h-4 text-blue-700" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-blue-600 font-medium">Sede Central</p>
                        <p className="text-sm font-semibold text-blue-900">Bogotá D.C.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Estado del usuario */}
              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-700">ESTADO ACTUAL</p>
                  {getStatusBadge(user.status)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}