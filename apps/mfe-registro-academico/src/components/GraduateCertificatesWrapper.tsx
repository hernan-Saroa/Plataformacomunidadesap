/**
 * WRAPPER: VERIFICACIÓN DE TÍTULOS
 * - Solicitudes de Revisión: trabajo de revisor y correcciones.
 * - Aprobaciones Pendientes: preconcepto del aprobador o decisión final del jefe.
 * - Certificados Generados: certificados con QR ya generados y activos.
 */

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { FileSearch, Award, AlertCircle, ShieldCheck, ClipboardCheck, ChevronRight } from 'lucide-react';
import { ResponsiveHeader } from '@esap-mfe/shared-ui';
import { ReviewRequestsModule } from './ReviewRequestsModule';
import { ApprovalRequestsModule } from './ApprovalRequestsModule';
import { VerificationCertificatesModule } from './VerificationCertificatesModule';
import { authService } from '../../services/api/authService';
import graduadosService from '../../services/api/graduados.service';
import { Permissions } from '@esap-mfe/shared-types/permissions';

interface GraduateCertificatesWrapperProps {
  onPendingCountChange?: (count: number) => void;
}

type VerificationTab = 'review' | 'my-reviews' | 'approvals' | 'certificates';

const HEAD_ACADEMIC_REGISTRATION_PERMISSIONS = [
  Permissions.GRADUATES_EDIT,
  Permissions.GRADUATES_EXPORT,
  Permissions.GRADUATES_VERIFY_CERTIFICATE,
  Permissions.GRADUATES_SOLICITUDE_APROBAR,
  Permissions.GRADUATES_CERTIFICATES_VIEW,
  Permissions.GRADUATES_CERTIFICATES_EDIT,
  Permissions.GRADUATES_CERTIFICATES_EXPORT,
  Permissions.GRADUATES_SOLICITUDE_RECHAZAR,
  Permissions.GRADUATES_CERTIFICATES_REENVIAR,
];

export function GraduateCertificatesWrapper({
  onPendingCountChange,
}: GraduateCertificatesWrapperProps) {
  const canViewCertificates = authService.hasPermission(
    Permissions.GRADUATES_CERTIFICATES_VIEW,
  );
  const canViewReviewRequests = authService.hasPermission(
    Permissions.GRADUATES_SOLICITUDE_VIEW,
  ) || authService.hasPermission(Permissions.GRADUATES_SOLICITUDE_REVIEW);
  const canWorkReviewRequests = authService.hasPermission(
    Permissions.GRADUATES_SOLICITUDE_REVIEW,
  );
  const canApproveRequests = authService.hasPermission(
    Permissions.GRADUATES_SOLICITUDE_APROBAR,
  );
  const canViewMyReviewRequests = canWorkReviewRequests && !canApproveRequests;
  const isHeadRole = authService.hasAllPermissions(
    HEAD_ACADEMIC_REGISTRATION_PERMISSIONS,
  );
  const approvalStage = isHeadRole ? 'head' : 'approver';
  const initialTab: VerificationTab = canViewCertificates
    ? 'certificates'
    : canViewReviewRequests
      ? 'review'
      : 'approvals';
  const [activeTab, setActiveTab] = useState<VerificationTab>(initialTab);
  const [approvalPendingCount, setApprovalPendingCount] = useState(0);

  useEffect(() => {
    let active = true;
    const loadApprovalPendingCount = async () => {
      if (!canApproveRequests) {
        setApprovalPendingCount(0);
        return;
      }

      try {
        const response =
          await graduadosService.solicitudes.contarAprobacionPendiente(
            approvalStage,
          );
        if (active) {
          setApprovalPendingCount(response?.count || 0);
        }
      } catch {
        if (active) {
          setApprovalPendingCount(0);
        }
      }
    };

    loadApprovalPendingCount();

    return () => {
      active = false;
    };
  }, [canApproveRequests, approvalStage]);

  const tabs = [
    {
      id: 'certificates' as const,
      label: 'Certificados Generados',
      subtitle: 'Con QR único',
      icon: Award,
      color: '#10B981',
      hasPermission: canViewCertificates,
    },
    {
      id: 'review' as const,
      label: 'Solicitudes de Revisión',
      subtitle: 'Casos no encontrados',
      icon: AlertCircle,
      color: '#F59E0B',
      hasPermission: canViewReviewRequests,
    },
    {
      id: 'my-reviews' as const,
      label: 'Mis Revisiones',
      subtitle: 'Pendientes y devueltas',
      icon: ClipboardCheck,
      color: '#2563EB',
      hasPermission: canViewMyReviewRequests,
    },
    {
      id: 'approvals' as const,
      label: isHeadRole ? 'Decisión Final' : 'Aprobaciones Pendientes',
      subtitle: isHeadRole ? 'Preconceptos por definir' : 'Conceptos por definir',
      icon: ShieldCheck,
      color: '#0EA5E9',
      hasPermission: canApproveRequests,
      badge: approvalPendingCount > 0 ? approvalPendingCount : 0,
    },
  ];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <ResponsiveHeader
        key="header"
        title="Verificación de títulos"
        description="Gestiona solicitudes de revisión y certificados generados"
        icon={FileSearch}
      />
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border-1"
        style={{ borderColor: '#E5E7EB' }}
      >
        <div className="flex flex-col gap-4">

          <div className="flex flex-col sm:flex-row gap-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              if (!tab.hasPermission) return null;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className="group flex-1 rounded-xl border-2 p-4 text-left shadow-sm transition-colors duration-200 hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 cursor-pointer"
                  style={{
                    borderColor: isActive ? tab.color : '#E5E7EB',
                    background: isActive ? `${tab.color}0D` : '#FFFFFF',
                    boxShadow: isActive
                      ? `0 0 0 3px ${tab.color}14`
                      : '0 1px 2px rgba(15, 23, 42, 0.06)',
                    ['--tw-ring-color' as string]: `${tab.color}55`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center transition-colors duration-200"
                      style={{
                        background: isActive
                          ? tab.color
                          : '#F3F4F6',
                      }}
                    >
                      <Icon
                        className="w-5 h-5"
                        style={{ color: isActive ? '#FFFFFF' : '#6B7280' }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className="truncate font-semibold text-sm"
                          style={{ color: isActive ? tab.color : '#1F2937' }}
                        >
                          {tab.label}
                        </p>
                        {'badge' in tab && tab.badge > 0 && (
                          <span
                            className="inline-flex min-w-5 h-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold"
                            style={{
                              background: '#DC2626',
                              color: '#FFFFFF',
                            }}
                          >
                            {tab.badge}
                          </span>
                        )}
                      </div>
                      <p
                        className="truncate text-xs"
                        style={{ color: '#6B7280' }}
                      >
                        {tab.subtitle}
                      </p>
                    </div>
                    <ChevronRight
                      className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                      style={{ color: isActive ? tab.color : '#9CA3AF' }}
                      aria-hidden="true"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'review' && <ReviewRequestsModule />}
        {activeTab === 'my-reviews' && <ReviewRequestsModule scope="mine" />}
        {activeTab === 'approvals' && (
          <ApprovalRequestsModule
            mode={approvalStage}
            onPendingCountChange={setApprovalPendingCount}
          />
        )}
        {activeTab === 'certificates' && (
          <VerificationCertificatesModule
            onPendingCountChange={onPendingCountChange}
          />
        )}
      </motion.div>
    </div>
  );
}
