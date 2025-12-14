/**
 * SECCIÓN DE ENROLAMIENTO PARA DETALLES DE USUARIO
 * Muestra información de cómo fue enrolado el usuario (SOLO LECTURA)
 * El QR es GENERAL para todo el sistema, no por usuario
 */

import { QrCode, Shield, Calendar, UserCheck, Upload, UserPlus } from 'lucide-react';
import { Badge } from '../ui/badge';

interface UserEnrollmentSectionProps {
  enrollmentMethod: 'qr' | 'manual' | 'massive' | null;
  enrollmentDate: string | null;
  createdBy: string | null;
  userName: string;
}

export function UserEnrollmentSection({ 
  enrollmentMethod, 
  enrollmentDate, 
  createdBy,
  userName
}: UserEnrollmentSectionProps) {
  
  // Si no hay información de enrolamiento, no mostrar nada
  if (!enrollmentMethod || !enrollmentDate) {
    return null;
  }
  
  // Helper para badges
  const getEnrollmentBadge = (method: 'qr' | 'manual' | 'massive') => {
    const methodConfig: Record<string, { label: string; className: string; icon: any }> = {
      qr: { 
        label: 'Auto-servicio QR', 
        className: 'bg-[#EDE9FE] text-[#5B21B6] border-[#8B5CF6]',
        icon: QrCode
      },
      manual: { 
        label: 'Creación Manual', 
        className: 'bg-[#EFF6FF] text-[#1E40AF] border-[#3B82F6]',
        icon: UserPlus
      },
      massive: { 
        label: 'Carga Masiva', 
        className: 'bg-[#D1FAE5] text-[#065F46] border-[#10B981]',
        icon: Upload
      }
    };
    
    // ✅ Validar que el método existe, si no, usar 'manual' como fallback
    const config = methodConfig[method] || methodConfig.manual;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.className} border hover:${config.className}`}>
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">{config.label}</span>
        </div>
      </Badge>
    );
  };

  return (
    <div className="md:col-span-2 mt-4">
      <div 
        className="bg-white rounded-xl p-4 border"
        style={{
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          borderColor: '#E5E7EB'
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h4 
            className="font-bold flex items-center gap-2"
            style={{
              fontSize: '14px',
              lineHeight: '20px',
              color: '#1F2937'
            }}
          >
            <Shield className="w-4 h-4" style={{ color: '#003DA5' }} />
            Información de Enrolamiento
          </h4>
          {getEnrollmentBadge(enrollmentMethod)}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Método de Enrolamiento */}
          <div className="space-y-2">
            <span 
              className="block text-xs font-semibold uppercase"
              style={{ color: '#9CA3AF', letterSpacing: '0.5px' }}
            >
              Método de Enrolamiento
            </span>
            <div 
              className="p-3 rounded-lg border"
              style={{ 
                backgroundColor: '#F9FAFB',
                borderColor: '#E5E7EB'
              }}
            >
              <p 
                className="font-semibold flex items-center gap-2"
                style={{ fontSize: '14px', color: '#1F2937' }}
              >
                {enrollmentMethod === 'qr' && (
                  <>
                    <QrCode className="w-4 h-4" style={{ color: '#8B5CF6' }} />
                    Auto-servicio QR
                  </>
                )}
                {enrollmentMethod === 'manual' && (
                  <>
                    <UserPlus className="w-4 h-4" style={{ color: '#3B82F6' }} />
                    Creación Manual
                  </>
                )}
                {enrollmentMethod === 'massive' && (
                  <>
                    <Upload className="w-4 h-4" style={{ color: '#10B981' }} />
                    Carga Masiva
                  </>
                )}
              </p>
              <p 
                className="text-xs mt-1"
                style={{ color: '#6B7280' }}
              >
                {enrollmentMethod === 'qr' && 'Usuario escaneó QR general y se auto-enroló'}
                {enrollmentMethod === 'manual' && 'Creado manualmente por administrador'}
                {enrollmentMethod === 'massive' && 'Importado desde archivo CSV/Excel'}
              </p>
            </div>
          </div>

          {/* Fecha de Enrolamiento */}
          <div className="space-y-2">
            <span 
              className="block text-xs font-semibold uppercase"
              style={{ color: '#9CA3AF', letterSpacing: '0.5px' }}
            >
              Fecha de Enrolamiento
            </span>
            <div 
              className="p-3 rounded-lg border"
              style={{ 
                backgroundColor: '#F9FAFB',
                borderColor: '#E5E7EB'
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                <span 
                  className="font-semibold"
                  style={{ fontSize: '14px', color: '#1F2937' }}
                >
                  {new Date(enrollmentDate).toLocaleDateString('es-CO', { 
                    day: '2-digit', 
                    month: 'long', 
                    year: 'numeric'
                  })}
                </span>
              </div>
              <p 
                className="text-xs"
                style={{ color: '#6B7280' }}
              >
                {new Date(enrollmentDate).toLocaleTimeString('es-CO', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          {/* Creado Por */}
          <div className="space-y-2">
            <span 
              className="block text-xs font-semibold uppercase"
              style={{ color: '#9CA3AF', letterSpacing: '0.5px' }}
            >
              {createdBy ? 'Creado Por' : 'Origen'}
            </span>
            <div 
              className="p-3 rounded-lg border"
              style={{ 
                backgroundColor: createdBy ? '#F9FAFB' : '#ECFDF5',
                borderColor: createdBy ? '#E5E7EB' : '#D1FAE5'
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <UserCheck className="w-4 h-4" style={{ color: createdBy ? '#9CA3AF' : '#10B981' }} />
                <span 
                  className="font-semibold"
                  style={{ fontSize: '14px', color: '#1F2937' }}
                >
                  {createdBy || 'Auto-enrolamiento'}
                </span>
              </div>
              <p 
                className="text-xs"
                style={{ color: createdBy ? '#6B7280' : '#065F46' }}
              >
                {createdBy 
                  ? 'Creado por administrador' 
                  : 'Usuario se registró por sí mismo'}
              </p>
            </div>
          </div>
        </div>

        {/* Nota informativa */}
        {enrollmentMethod === 'qr' && (
          <div 
            className="mt-4 p-3 rounded-lg border flex items-start gap-2"
            style={{ 
              backgroundColor: '#EDE9FE',
              borderColor: '#D8B4FE'
            }}
          >
            <QrCode className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#8B5CF6' }} />
            <div>
              <p 
                className="font-semibold text-xs mb-0.5"
                style={{ color: '#5B21B6' }}
              >
                Enrolamiento mediante QR General
              </p>
              <p 
                className="text-xs"
                style={{ color: '#7C3AED' }}
              >
                Este usuario escaneó el código QR general de ESAP, ingresó su documento de identidad y completó el proceso de verificación por correo electrónico.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}