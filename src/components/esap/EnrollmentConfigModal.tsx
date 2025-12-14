/**
 * MODAL DE CONFIGURACIÓN DEL ENROLAMIENTO QR GENERAL
 * Panel de administración del sistema de enrolamiento con QR único institucional
 */

import { useState } from 'react';
import { X, QrCode, Download, Settings, Mail, Bell, Shield, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { copyToClipboard } from '@/utils/browser';

interface EnrollmentConfigModalProps {
  onClose: () => void;
  enrollmentStats?: {
    qr: number;
    manual: number;
    massive: number;
    total: number;
  };
}

export function EnrollmentConfigModal({ onClose }: EnrollmentConfigModalProps) {
  const [qrSystemEnabled, setQrSystemEnabled] = useState(true);
  const [emailVerificationEnabled, setEmailVerificationEnabled] = useState(true);
  const [coordinatorNotifications, setCoordinatorNotifications] = useState(true);
  const [autoApprovalEnabled, setAutoApprovalEnabled] = useState(false);

  const qrUrl = 'https://enrolamiento.esap.edu.co/qr';

  const handleToggleQrSystem = () => {
    const newState = !qrSystemEnabled;
    setQrSystemEnabled(newState);
    
    if (newState) {
      toast.success('Sistema QR Activado', { 
        description: 'Los usuarios pueden auto-enrolarse escaneando el código QR.' 
      });
    } else {
      toast.warning('Sistema QR Desactivado', { 
        description: 'El enrolamiento por QR está temporalmente deshabilitado.' 
      });
    }
  };

  const handleDownloadQr = () => {
    toast.success('QR Descargado', { 
      description: 'El código QR se descargó como imagen PNG.' 
    });
  };

  const handleCopyUrl = async () => {
    const success = await copyToClipboard(qrUrl);
    if (success) {
      toast.success('URL Copiada', { 
        description: 'La URL del QR se copió al portapapeles.' 
      });
    } else {
      toast.error('Error al copiar', {
        description: 'No se pudo copiar la URL al portapapeles.'
      });
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4"
        style={{ background: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-[95vw] sm:max-w-3xl lg:max-w-5xl max-h-[95vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div 
            className="px-4 sm:px-6 py-4 sm:py-5 border-b flex items-center justify-between"
            style={{
              background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center"
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <QrCode className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="font-bold text-white" style={{ fontSize: '16px', lineHeight: '22px' }}>
                  Configuración de Enrolamiento
                </h2>
                <p className="text-white/80 hidden sm:block" style={{ fontSize: '13px', lineHeight: '18px' }}>
                  Sistema de auto-enrolamiento con código QR general
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-all hover:bg-white/20"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Columna Izquierda - QR y Estado */}
              <div className="lg:col-span-1 space-y-4 sm:space-y-6">
                {/* Card QR */}
                <div 
                  className="bg-white rounded-xl p-6 border"
                  style={{
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    borderColor: '#E5E7EB'
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold" style={{ fontSize: '16px', color: '#1F2937' }}>
                      Código QR General
                    </h3>
                    <Badge 
                      className={`${qrSystemEnabled ? 'bg-[#ECFDF5] text-[#065F46] border-[#10B981]' : 'bg-[#F3F4F6] text-[#6B7280] border-[#D1D5DB]'} border`}
                    >
                      <div className="flex items-center gap-1.5">
                        {qrSystemEnabled ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5" />
                        )}
                        <span className="text-xs font-semibold">
                          {qrSystemEnabled ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </Badge>
                  </div>

                  {/* QR Code Visual */}
                  <div 
                    className="relative mb-4 rounded-xl overflow-hidden border-4"
                    style={{ borderColor: qrSystemEnabled ? '#003DA5' : '#D1D5DB' }}
                  >
                    <div 
                      className={`aspect-square flex items-center justify-center ${qrSystemEnabled ? 'bg-white' : 'bg-gray-100'}`}
                    >
                      {/* QR Code Placeholder - En producción sería un QR real */}
                      <div className="w-full h-full p-4">
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                          {/* Esquina superior izquierda */}
                          <rect x="0" y="0" width="28" height="28" fill={qrSystemEnabled ? "#003DA5" : "#9CA3AF"} rx="2"/>
                          <rect x="4" y="4" width="20" height="20" fill="white"/>
                          <rect x="8" y="8" width="12" height="12" fill={qrSystemEnabled ? "#003DA5" : "#9CA3AF"}/>
                          
                          {/* Esquina superior derecha */}
                          <rect x="72" y="0" width="28" height="28" fill={qrSystemEnabled ? "#003DA5" : "#9CA3AF"} rx="2"/>
                          <rect x="76" y="4" width="20" height="20" fill="white"/>
                          <rect x="80" y="8" width="12" height="12" fill={qrSystemEnabled ? "#003DA5" : "#9CA3AF"}/>
                          
                          {/* Esquina inferior izquierda */}
                          <rect x="0" y="72" width="28" height="28" fill={qrSystemEnabled ? "#003DA5" : "#9CA3AF"} rx="2"/>
                          <rect x="4" y="76" width="20" height="20" fill="white"/>
                          <rect x="8" y="80" width="12" height="12" fill={qrSystemEnabled ? "#003DA5" : "#9CA3AF"}/>
                          
                          {/* Patrón central simulado */}
                          <rect x="36" y="36" width="6" height="6" fill={qrSystemEnabled ? "#003DA5" : "#9CA3AF"}/>
                          <rect x="44" y="36" width="6" height="6" fill={qrSystemEnabled ? "#003DA5" : "#9CA3AF"}/>
                          <rect x="52" y="36" width="6" height="6" fill={qrSystemEnabled ? "#003DA5" : "#9CA3AF"}/>
                          <rect x="36" y="44" width="6" height="6" fill={qrSystemEnabled ? "#003DA5" : "#9CA3AF"}/>
                          <rect x="52" y="44" width="6" height="6" fill={qrSystemEnabled ? "#003DA5" : "#9CA3AF"}/>
                          <rect x="36" y="52" width="6" height="6" fill={qrSystemEnabled ? "#003DA5" : "#9CA3AF"}/>
                          <rect x="44" y="52" width="6" height="6" fill={qrSystemEnabled ? "#003DA5" : "#9CA3AF"}/>
                          <rect x="52" y="52" width="6" height="6" fill={qrSystemEnabled ? "#003DA5" : "#9CA3AF"}/>
                          
                          {/* Más patrones decorativos */}
                          <rect x="36" y="8" width="4" height="4" fill={qrSystemEnabled ? "#003DA5" : "#9CA3AF"}/>
                          <rect x="44" y="8" width="4" height="4" fill={qrSystemEnabled ? "#003DA5" : "#9CA3AF"}/>
                          <rect x="52" y="8" width="4" height="4" fill={qrSystemEnabled ? "#003DA5" : "#9CA3AF"}/>
                          <rect x="8" y="36" width="4" height="4" fill={qrSystemEnabled ? "#003DA5" : "#9CA3AF"}/>
                          <rect x="8" y="44" width="4" height="4" fill={qrSystemEnabled ? "#003DA5" : "#9CA3AF"}/>
                          <rect x="8" y="52" width="4" height="4" fill={qrSystemEnabled ? "#003DA5" : "#9CA3AF"}/>
                        </svg>
                      </div>
                    </div>
                    {!qrSystemEnabled && (
                      <div 
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: 'rgba(255, 255, 255, 0.9)' }}
                      >
                        <div className="text-center">
                          <AlertCircle className="w-8 h-8 mx-auto mb-2" style={{ color: '#EF4444' }} />
                          <p className="font-semibold text-sm" style={{ color: '#991B1B' }}>
                            Sistema Desactivado
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Acciones QR */}
                  <div className="space-y-2">
                    <button
                      onClick={handleDownloadQr}
                      disabled={!qrSystemEnabled}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                        qrSystemEnabled 
                          ? 'bg-[#003DA5] text-white hover:bg-[#002D7A]' 
                          : 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed'
                      }`}
                    >
                      <Download className="w-4 h-4" />
                      Descargar QR
                    </button>
                    <button
                      onClick={handleCopyUrl}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all border-2 border-[#E5E7EB] hover:border-[#003DA5] hover:bg-[#F0F6FF]"
                      style={{ color: '#003DA5' }}
                    >
                      <QrCode className="w-4 h-4" />
                      Copiar URL
                    </button>
                  </div>

                  <div 
                    className="mt-4 p-3 rounded-lg"
                    style={{ background: '#F9FAFB', borderLeft: '3px solid #003DA5' }}
                  >
                    <p className="text-xs" style={{ color: '#6B7280' }}>
                      <span className="font-semibold">URL:</span> {qrUrl}
                    </p>
                  </div>
                </div>

                {/* Card Toggle Maestro */}
                <div 
                  className="bg-white rounded-xl p-6 border"
                  style={{
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    borderColor: '#E5E7EB'
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="w-5 h-5" style={{ color: '#003DA5' }} />
                        <h3 className="font-bold" style={{ fontSize: '16px', color: '#1F2937' }}>
                          Sistema QR
                        </h3>
                      </div>
                      <p className="text-xs" style={{ color: '#6B7280' }}>
                        {qrSystemEnabled 
                          ? 'Los usuarios pueden auto-enrolarse escaneando el código QR.' 
                          : 'El sistema está desactivado temporalmente. Los usuarios no pueden enrolarse por QR.'}
                      </p>
                    </div>
                    <Switch
                      checked={qrSystemEnabled}
                      onCheckedChange={handleToggleQrSystem}
                    />
                  </div>
                </div>
              </div>

              {/* Columna Derecha - Configuraciones */}
              <div className="lg:col-span-2 space-y-6">
                {/* Configuraciones del Proceso */}
                <div 
                  className="bg-white rounded-xl p-6 border"
                  style={{
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    borderColor: '#E5E7EB'
                  }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Settings className="w-5 h-5" style={{ color: '#003DA5' }} />
                    <h3 className="font-bold" style={{ fontSize: '16px', color: '#1F2937' }}>
                      Configuración del Proceso
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {/* Verificación por Email */}
                    <div className="flex items-start justify-between gap-4 pb-4 border-b" style={{ borderColor: '#E5E7EB' }}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Mail className="w-4 h-4" style={{ color: '#6B7280' }} />
                          <h4 className="font-semibold text-sm" style={{ color: '#1F2937' }}>
                            Verificación por Email
                          </h4>
                        </div>
                        <p className="text-xs" style={{ color: '#6B7280' }}>
                          Los usuarios deben verificar su correo electrónico institucional antes de completar el enrolamiento.
                        </p>
                      </div>
                      <Switch
                        checked={emailVerificationEnabled}
                        onCheckedChange={(checked) => {
                          setEmailVerificationEnabled(checked);
                          toast.success(
                            checked ? 'Verificación de Email Activada' : 'Verificación de Email Desactivada'
                          );
                        }}
                      />
                    </div>

                    {/* Notificaciones a Administradores */}
                    <div className="flex items-start justify-between gap-4 pb-4 border-b" style={{ borderColor: '#E5E7EB' }}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Bell className="w-4 h-4" style={{ color: '#6B7280' }} />
                          <h4 className="font-semibold text-sm" style={{ color: '#1F2937' }}>
                            Notificaciones a Administradores
                          </h4>
                        </div>
                        <p className="text-xs" style={{ color: '#6B7280' }}>
                          Enviar notificación automática a administradores cuando un usuario completa el enrolamiento.
                        </p>
                      </div>
                      <Switch
                        checked={coordinatorNotifications}
                        onCheckedChange={(checked) => {
                          setCoordinatorNotifications(checked);
                          toast.success(
                            checked ? 'Notificaciones Activadas' : 'Notificaciones Desactivadas'
                          );
                        }}
                      />
                    </div>

                    {/* Auto-aprobación */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle className="w-4 h-4" style={{ color: '#6B7280' }} />
                          <h4 className="font-semibold text-sm" style={{ color: '#1F2937' }}>
                            Auto-aprobación Inmediata
                          </h4>
                        </div>
                        <p className="text-xs" style={{ color: '#6B7280' }}>
                          Los usuarios son aprobados automáticamente después de verificar su email. Si se desactiva, requieren aprobación manual de un administrador.
                        </p>
                      </div>
                      <Switch
                        checked={autoApprovalEnabled}
                        onCheckedChange={(checked) => {
                          setAutoApprovalEnabled(checked);
                          toast.success(
                            checked ? 'Auto-aprobación Activada' : 'Auto-aprobación Desactivada'
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Información Adicional */}
                <div 
                  className="p-4 rounded-xl border-2"
                  style={{
                    background: '#FFFBEB',
                    borderColor: '#FDE68A'
                  }}
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
                    <div>
                      <p className="font-semibold text-sm mb-1" style={{ color: '#92400E' }}>
                        Importante sobre el Código QR
                      </p>
                      <p className="text-xs" style={{ color: '#B45309' }}>
                        Este es el código QR general de ESAP. Todos los usuarios lo escanean para iniciar el proceso de auto-enrolamiento. 
                        El sistema discrimina automáticamente el tipo de usuario según el dominio de correo electrónico (@esap.edu.co para estudiantes/docentes, otros dominios para administrativos).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div 
            className="px-4 sm:px-6 py-3 sm:py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3"
            style={{
              background: '#F9FAFB',
              borderTop: '1px solid #E5E7EB'
            }}
          >
            <div className="flex items-center gap-2 text-xs" style={{ color: '#6B7280' }}>
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Última actualización: {new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              <span className="sm:hidden">{new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-all"
              style={{
                background: '#003DA5',
                color: '#FFFFFF'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#002D7A';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#003DA5';
              }}
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}