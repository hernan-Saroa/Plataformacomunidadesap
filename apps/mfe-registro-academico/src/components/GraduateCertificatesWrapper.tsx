/**
 * WRAPPER: VERIFICACIÓN DE TÍTULOS
 * - Tab 1: Solicitudes de Revisión (cuando NO se encuentra el graduado en el sistema)
 * - Tab 2: Certificados Generados (certificados con QR ya generados y activos)
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { FileSearch, Award, AlertCircle } from 'lucide-react';
import { ReviewRequestsModule } from './ReviewRequestsModule';
import { VerificationCertificatesModule } from './VerificationCertificatesModule';
import { authService } from '../../services/api/authService';
import { Permissions } from '@esap-mfe/shared-types/permissions';

interface GraduateCertificatesWrapperProps {
  onPendingCountChange?: (count: number) => void;
}

export function GraduateCertificatesWrapper({ onPendingCountChange }: GraduateCertificatesWrapperProps) {
  const initial = authService.hasPermission(Permissions.GRADUATES_CERTIFICATES_VIEW) ? 'certificates' : 'requests';
  const [activeTab, setActiveTab] = useState<'requests' | 'certificates'>(initial);

  const tabs = [
    {
      id: 'certificates' as const,
      label: 'Certificados Generados',
      subtitle: 'Con QR único',
      icon: Award,
      color: '#10B981',
      hasPermission: authService.hasPermission(Permissions.GRADUATES_CERTIFICATES_VIEW)
    },
    {
      id: 'requests' as const,
      label: 'Solicitudes de Revisión',
      subtitle: 'Casos no encontrados',
      icon: AlertCircle,
      color: '#F59E0B',
      hasPermission: authService.hasPermission(Permissions.GRADUATES_SOLICITUDE_VIEW)
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header con Tabs */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border-2 p-6"
        style={{ borderColor: '#E5E7EB' }}
      >
        <div className="flex flex-col gap-4">
          {/* Título Principal */}
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)' }}
            >
              <FileSearch className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#1F2937' }}>
                Verificación de Títulos
              </h1>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                Gestiona solicitudes de revisión y certificados generados
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-col sm:flex-row gap-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              if(!tab.hasPermission) return null;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 p-4 rounded-xl border-2 transition-all text-left"
                  style={{
                    borderColor: isActive ? tab.color : '#E5E7EB',
                    background: isActive ? `${tab.color}08` : '#FFFFFF',
                    boxShadow: isActive ? `0 0 0 3px ${tab.color}20` : 'none'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{
                        background: isActive 
                          ? `linear-gradient(135deg, ${tab.color} 0%, ${tab.color}DD 100%)`
                          : '#F3F4F6'
                      }}
                    >
                      <Icon 
                        className="w-5 h-5" 
                        style={{ color: isActive ? '#FFFFFF' : '#6B7280' }}
                      />
                    </div>
                    <div className="flex-1">
                      <p 
                        className="font-semibold text-sm"
                        style={{ color: isActive ? tab.color : '#1F2937' }}
                      >
                        {tab.label}
                      </p>
                      <p 
                        className="text-xs"
                        style={{ color: '#6B7280' }}
                      >
                        {tab.subtitle}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Contenido según Tab Activo */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'requests' && <ReviewRequestsModule />}
        {activeTab === 'certificates' && (
          <VerificationCertificatesModule onPendingCountChange={onPendingCountChange} />
        )}
      </motion.div>
    </div>
  );
}