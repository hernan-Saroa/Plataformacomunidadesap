import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Shield, Clock, MapPin, TrendingUp, Users, Activity, ZapOff } from 'lucide-react';
import type { AuditEvent } from './AuditEventDetail';

interface Anomaly {
  id: string;
  type: 'failed_login' | 'unusual_location' | 'unusual_time' | 'high_activity' | 'permission_change' | 'data_export';
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium';
  affectedUser?: string;
  timestamp: string;
  details: string[];
  relatedEvents: AuditEvent[];
}

interface AuditAnomaliesDetectorProps {
  events: AuditEvent[];
}

export function AuditAnomaliesDetector({ events }: AuditAnomaliesDetectorProps) {
  // Detectar anomalías
  const detectAnomalies = (): Anomaly[] => {
    const anomalies: Anomaly[] = [];

    // 1. Múltiples intentos fallidos de login
    const failedLogins = events.filter(e => 
      e.action.toLowerCase().includes('fallo') && 
      e.action.toLowerCase().includes('login')
    );
    
    const failedLoginsByUser = failedLogins.reduce((acc, event) => {
      acc[event.userId] = (acc[event.userId] || []).concat(event);
      return acc;
    }, {} as Record<string, AuditEvent[]>);

    Object.entries(failedLoginsByUser).forEach(([userId, userFailedLogins]) => {
      if (userFailedLogins.length >= 3) {
        anomalies.push({
          id: `anomaly-failed-${userId}`,
          type: 'failed_login',
          title: 'Múltiples intentos fallidos de inicio de sesión',
          description: `${userFailedLogins.length} intentos fallidos detectados`,
          severity: userFailedLogins.length >= 5 ? 'critical' : 'high',
          affectedUser: userFailedLogins[0].user,
          timestamp: userFailedLogins[0].timestamp,
          details: [
            `Usuario: ${userFailedLogins[0].user} (${userId})`,
            `Intentos fallidos: ${userFailedLogins.length}`,
            `Última IP: ${userFailedLogins[0].ipAddress}`,
            `Recomendación: Verificar si es un intento de acceso no autorizado`
          ],
          relatedEvents: userFailedLogins
        });
      }
    });

    // 2. Acceso desde ubicación inusual
    const unusualLocations = events.filter(e => 
      e.location && (
        e.location.toLowerCase().includes('desconocido') || 
        !e.location.toLowerCase().includes('colombia')
      )
    );

    unusualLocations.forEach(event => {
      anomalies.push({
        id: `anomaly-location-${event.id}`,
        type: 'unusual_location',
        title: 'Acceso desde ubicación inusual',
        description: `Inicio de sesión desde ${event.location}`,
        severity: 'high',
        affectedUser: event.user,
        timestamp: event.timestamp,
        details: [
          `Usuario: ${event.user} (${event.userId})`,
          `Ubicación: ${event.location}`,
          `Dirección IP: ${event.ipAddress}`,
          `Recomendación: Contactar al usuario para verificar actividad`
        ],
        relatedEvents: [event]
      });
    });

    // 3. Actividad en horario inusual (fuera de 6am - 11pm)
    const unusualTimeEvents = events.filter(e => {
      const hour = parseInt(e.timestamp.split(' ')[1].split(':')[0]);
      return hour < 6 || hour >= 23;
    });

    if (unusualTimeEvents.length >= 5) {
      anomalies.push({
        id: 'anomaly-unusual-time',
        type: 'unusual_time',
        title: 'Actividad en horario inusual',
        description: `${unusualTimeEvents.length} eventos fuera de horario laboral`,
        severity: 'medium',
        timestamp: unusualTimeEvents[0].timestamp,
        details: [
          `Total de eventos: ${unusualTimeEvents.length}`,
          `Horario detectado: Fuera de 6:00 AM - 11:00 PM`,
          `Usuarios involucrados: ${new Set(unusualTimeEvents.map(e => e.user)).size}`,
          `Recomendación: Revisar si es mantenimiento programado o actividad no autorizada`
        ],
        relatedEvents: unusualTimeEvents.slice(0, 10)
      });
    }

    // 4. Alta actividad de un usuario (más de 50 eventos)
    const eventsByUser = events.reduce((acc, event) => {
      acc[event.userId] = (acc[event.userId] || []).concat(event);
      return acc;
    }, {} as Record<string, AuditEvent[]>);

    Object.entries(eventsByUser).forEach(([userId, userEvents]) => {
      if (userEvents.length >= 50) {
        anomalies.push({
          id: `anomaly-high-activity-${userId}`,
          type: 'high_activity',
          title: 'Actividad inusualmente alta',
          description: `${userEvents.length} eventos en período corto`,
          severity: 'medium',
          affectedUser: userEvents[0].user,
          timestamp: userEvents[0].timestamp,
          details: [
            `Usuario: ${userEvents[0].user} (${userId})`,
            `Total de eventos: ${userEvents.length}`,
            `Módulos accedidos: ${new Set(userEvents.map(e => e.module)).size}`,
            `Recomendación: Verificar si es comportamiento normal o posible automatización`
          ],
          relatedEvents: userEvents.slice(0, 10)
        });
      }
    });

    // 5. Cambios críticos en permisos
    const permissionChanges = events.filter(e => 
      e.module === 'Roles y Permisos' && 
      e.severity === 'high'
    );

    if (permissionChanges.length > 0) {
      anomalies.push({
        id: 'anomaly-permission-changes',
        type: 'permission_change',
        title: 'Cambios críticos en permisos detectados',
        description: `${permissionChanges.length} modificaciones en roles/permisos`,
        severity: 'high',
        timestamp: permissionChanges[0].timestamp,
        details: [
          `Total de cambios: ${permissionChanges.length}`,
          `Usuarios que modificaron: ${new Set(permissionChanges.map(e => e.user)).size}`,
          `Recomendación: Revisar todos los cambios de permisos`,
          `Verificar que sean cambios autorizados`
        ],
        relatedEvents: permissionChanges
      });
    }

    // 6. Exportaciones masivas de datos
    const dataExports = events.filter(e => 
      e.action.toLowerCase().includes('exporta') || 
      e.module === 'Reportes'
    );

    if (dataExports.length >= 10) {
      anomalies.push({
        id: 'anomaly-data-exports',
        type: 'data_export',
        title: 'Alto volumen de exportaciones de datos',
        description: `${dataExports.length} exportaciones detectadas`,
        severity: 'medium',
        timestamp: dataExports[0].timestamp,
        details: [
          `Total de exportaciones: ${dataExports.length}`,
          `Usuarios involucrados: ${new Set(dataExports.map(e => e.user)).size}`,
          `Recomendación: Verificar la necesidad de estas exportaciones`,
          `Asegurar cumplimiento con políticas de protección de datos`
        ],
        relatedEvents: dataExports.slice(0, 10)
      });
    }

    return anomalies.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  };

  const anomalies = detectAnomalies();

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          bg: '#FEE2E2',
          border: '#DC2626',
          text: '#991B1B',
          icon: AlertTriangle,
          label: 'Crítico'
        };
      case 'high':
        return {
          bg: '#FEF3C7',
          border: '#F59E0B',
          text: '#92400E',
          icon: AlertTriangle,
          label: 'Alto'
        };
      case 'medium':
        return {
          bg: '#DBEAFE',
          border: '#3B82F6',
          text: '#1E40AF',
          icon: Shield,
          label: 'Medio'
        };
      default:
        return {
          bg: '#F3F4F6',
          border: '#6B7280',
          text: '#1F2937',
          icon: Shield,
          label: 'Info'
        };
    }
  };

  const getAnomalyIcon = (type: string) => {
    switch (type) {
      case 'failed_login':
        return Shield;
      case 'unusual_location':
        return MapPin;
      case 'unusual_time':
        return Clock;
      case 'high_activity':
        return TrendingUp;
      case 'permission_change':
        return Users;
      case 'data_export':
        return Activity;
      default:
        return AlertTriangle;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-white" strokeWidth={2} />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900">Detector de Anomalías</h3>
          <p className="text-sm text-gray-600">
            Análisis automático de patrones sospechosos
          </p>
        </div>
        {anomalies.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 rounded-xl">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-bold text-red-700">
              {anomalies.length} {anomalies.length === 1 ? 'anomalía' : 'anomalías'}
            </span>
          </div>
        )}
      </div>

      {anomalies.length > 0 ? (
        <div className="space-y-4">
          {anomalies.map((anomaly, index) => {
            const severityConfig = getSeverityConfig(anomaly.severity);
            const SeverityIcon = severityConfig.icon;
            const AnomalyIcon = getAnomalyIcon(anomaly.type);

            return (
              <motion.div
                key={anomaly.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border-2 rounded-xl p-5 hover:shadow-lg transition-all"
                style={{ 
                  backgroundColor: severityConfig.bg,
                  borderColor: severityConfig.border
                }}
              >
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: severityConfig.border }}
                  >
                    <AnomalyIcon className="w-6 h-6 text-white" strokeWidth={2} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h4 
                        className="font-bold text-base"
                        style={{ color: severityConfig.text }}
                      >
                        {anomaly.title}
                      </h4>
                      <span 
                        className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 flex-shrink-0"
                        style={{ 
                          backgroundColor: severityConfig.border,
                          color: '#fff'
                        }}
                      >
                        <SeverityIcon className="w-3.5 h-3.5" />
                        {severityConfig.label}
                      </span>
                    </div>
                    
                    <p 
                      className="text-sm font-semibold mb-2"
                      style={{ color: severityConfig.text }}
                    >
                      {anomaly.description}
                    </p>
                    
                    {anomaly.affectedUser && (
                      <div className="flex items-center gap-2 text-xs font-medium mb-3">
                        <Users className="w-3.5 h-3.5" style={{ color: severityConfig.text }} />
                        <span style={{ color: severityConfig.text }}>
                          Usuario afectado: <strong>{anomaly.affectedUser}</strong>
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs mb-3">
                      <Clock className="w-3.5 h-3.5" style={{ color: severityConfig.text }} />
                      <span style={{ color: severityConfig.text }}>
                        Detectado: {anomaly.timestamp}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div 
                  className="rounded-lg p-4 space-y-2"
                  style={{ backgroundColor: '#fff' }}
                >
                  {anomaly.details.map((detail, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <div 
                        className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                        style={{ backgroundColor: severityConfig.border }}
                      />
                      <span className="text-gray-700">{detail}</span>
                    </div>
                  ))}
                </div>

                {/* Related Events Count */}
                <div className="mt-4 pt-4 border-t" style={{ borderColor: severityConfig.border }}>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" style={{ color: severityConfig.border }} />
                    <span 
                      className="text-sm font-semibold"
                      style={{ color: severityConfig.text }}
                    >
                      {anomaly.relatedEvents.length} eventos relacionados
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-10 h-10 text-[#1e5da8]" />
          </div>
          <h4 className="font-bold text-gray-900 mb-2">
            ¡No se detectaron anomalías!
          </h4>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            El sistema no ha identificado patrones sospechosos o comportamientos inusuales 
            en los eventos de auditoría analizados.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl border border-blue-200">
            <div className="w-2 h-2 bg-[#1e5da8] rounded-full" />
            <span className="text-sm font-semibold text-[#1e5da8]">
              Sistema operando normalmente
            </span>
          </div>
        </div>
      )}
    </div>
  );
}