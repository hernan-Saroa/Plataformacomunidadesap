/**
 * CONFIGURACIÓN DE NOTIFICACIONES Y ALERTAS
 * Componente modular para gestionar notificaciones y parámetros de alertas
 * Control Interno Disciplinario
 */

import { useState, useEffect } from 'react';
import { AlertCircle, Save, RotateCcw, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { disciplinaryService } from '../../../../services/api/disciplinary.service';
import { authService } from '../../../../services/api/authService';
import { Permissions } from '@esap-mfe/shared-types/permissions';

interface ConfiguracionNotificaciones {
  vencimiento7dias: boolean;
  vencimiento3dias: boolean;
  vencimiento1dia: boolean;
  procesoVencido: boolean;
  asignacionProceso: boolean;
  cambioEtapa: boolean;
  aprobacionRequerida: boolean;
  resumenDiario: boolean;
  resumenSemanal: boolean;
}

interface ConfiguracionAlertas {
  porcentajeRiesgo: number;
  porcentajeCritico: number;
  capacidadAlerta: number;
  diasAnticipacion: number;
}

const NOTIFICACIONES_DEFECTO: ConfiguracionNotificaciones = {
  vencimiento7dias: true,
  vencimiento3dias: true,
  vencimiento1dia: true,
  procesoVencido: true,
  asignacionProceso: true,
  cambioEtapa: true,
  aprobacionRequerida: false,
  resumenDiario: true,
  resumenSemanal: true,
};

const ALERTAS_DEFECTO: ConfiguracionAlertas = {
  porcentajeRiesgo: 85,
  porcentajeCritico: 95,
  capacidadAlerta: 90,
  diasAnticipacion: 7,
};

export function ConfiguracionNotificacionesAlertas() {
  const [notificaciones, setNotificaciones] = useState<ConfiguracionNotificaciones>(NOTIFICACIONES_DEFECTO);
  const [alertas, setAlertas] = useState<ConfiguracionAlertas>(ALERTAS_DEFECTO);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      setLoading(true);
      const globalConfig = await disciplinaryService.getGlobalConfig();

      if (globalConfig) {
        if (globalConfig.notificationSettings && Object.keys(globalConfig.notificationSettings).length > 0) {
          setNotificaciones(globalConfig.notificationSettings as ConfiguracionNotificaciones);
        }
        if (globalConfig.alertSettings && Object.keys(globalConfig.alertSettings).length > 0) {
          setAlertas(globalConfig.alertSettings as ConfiguracionAlertas);
        }
      }
    } catch (error) {
      console.error('Error cargando configuración de notificaciones y alertas:', error);
      toast.error('Error al cargar configuración', {
        description: 'Se usarán valores por defecto'
      });
    } finally {
      setLoading(false);
    }
  };

  const guardarConfiguraciones = async () => {
    console.log('🔵 Guardando configuración de notificaciones y alertas...');

    try {
      // 1. Cargar configuración actual para no sobrescribir otras secciones
      const currentConfig = await disciplinaryService.getGlobalConfig();
      console.log('🔵 Configuración actual del backend:', currentConfig);

      // 2. Preparar payload con las configuraciones actualizadas
      const globalPayload = {
        roleCapacities: currentConfig?.roleCapacities || {},
        notificationSettings: notificaciones,
        alertSettings: alertas,
        securitySettings: currentConfig?.securitySettings || { auditEnabled: true, digitalSignature: true, backupEnabled: true },
        documentTemplates: currentConfig?.documentTemplates || {}
      };

      console.log('🔵 Payload COMPLETO para backend:', globalPayload);

      await disciplinaryService.updateGlobalConfig(globalPayload);

      console.log('✅ Configuración guardada en el backend');
      setCambiosPendientes(false);
      toast.success('Configuración guardada exitosamente', {
        description: 'Los cambios se han guardado en el servidor'
      });
    } catch (error) {
      console.error('❌ Error al guardar configuración:', error);
      toast.error('Error al guardar configuración', {
        description: 'No se pudieron guardar los cambios en el servidor'
      });
    }
  };

  const restablecerDefecto = () => {
    if (window.confirm('¿Está seguro de restablecer a valores por defecto?')) {
      setNotificaciones(NOTIFICACIONES_DEFECTO);
      setAlertas(ALERTAS_DEFECTO);
      setCambiosPendientes(true);
      toast.success('Configuraciones restablecidas');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header con acciones */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Notificaciones y Alertas</h3>
          <p className="text-sm text-gray-600 mt-1">
            Configura las alertas automáticas y parámetros del semáforo del sistema
          </p>
        </div>
        <div className="flex items-center gap-3">
          {cambiosPendientes && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
              <AlertCircle className="w-3 h-3 mr-1" />
              Sin guardar
            </span>
          )}
          {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_RESET) && (
          <button
            onClick={restablecerDefecto}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Restablecer
          </button>
          )}
          {authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIG_NOTIFICACIONES_GUARDAR) && (
          <button
            onClick={guardarConfiguraciones}
            disabled={!cambiosPendientes}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              background: cambiosPendientes ? 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' : '#9CA3AF',
            }}
          >
            <Save className="w-4 h-4" />
            Guardar Cambios
          </button>
          )}
        </div>
      </div>

      {/* Sección Notificaciones */}
      <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-blue-600" />
          <h4 className="text-md font-bold text-gray-900">Notificaciones del Sistema</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Alertas de Vencimiento */}
          <div className="p-4 rounded-lg bg-gray-50">
            <h5 className="text-sm font-bold mb-4 uppercase text-gray-700">
              Alertas de Vencimiento
            </h5>
            <div className="space-y-3">
              {[
                { key: 'vencimiento7dias', label: '7 días antes del vencimiento' },
                { key: 'vencimiento3dias', label: '3 días antes del vencimiento' },
                { key: 'vencimiento1dia', label: '1 día antes del vencimiento' },
                { key: 'procesoVencido', label: 'Proceso vencido (inmediato)' }
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificaciones[item.key as keyof ConfiguracionNotificaciones] as boolean}
                    onChange={(e) => {
                      setNotificaciones({
                        ...notificaciones,
                        [item.key]: e.target.checked
                      });
                      setCambiosPendientes(true);
                    }}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Notificaciones de Proceso */}
          <div className="p-4 rounded-lg bg-gray-50">
            <h5 className="text-sm font-bold mb-4 uppercase text-gray-700">
              Notificaciones de Proceso
            </h5>
            <div className="space-y-3">
              {[
                { key: 'asignacionProceso', label: 'Asignación de nuevo proceso' },
                { key: 'cambioEtapa', label: 'Cambio de etapa' },
                { key: 'aprobacionRequerida', label: 'Aprobación requerida' }
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificaciones[item.key as keyof ConfiguracionNotificaciones] as boolean}
                    onChange={(e) => {
                      setNotificaciones({
                        ...notificaciones,
                        [item.key]: e.target.checked
                      });
                      setCambiosPendientes(true);
                    }}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Resúmenes */}
          <div className="p-4 rounded-lg bg-gray-50 md:col-span-2">
            <h5 className="text-sm font-bold mb-4 uppercase text-gray-700">
              Resúmenes Automáticos
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { key: 'resumenDiario', label: 'Resumen diario (8:00 AM)' },
                { key: 'resumenSemanal', label: 'Resumen semanal (Lunes 8:00 AM)' }
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificaciones[item.key as keyof ConfiguracionNotificaciones] as boolean}
                    onChange={(e) => {
                      setNotificaciones({
                        ...notificaciones,
                        [item.key]: e.target.checked
                      });
                      setCambiosPendientes(true);
                    }}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sección Parámetros de Alertas */}
      <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <h4 className="text-md font-bold text-gray-900">Parámetros de Alertas y Semáforo</h4>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Configure el sistema de semáforo que indica el estado de avance de cada proceso
        </p>

        {/* Explicación Visual del Semáforo */}
        <div className="mb-6 p-5 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
          <h5 className="text-sm font-bold text-gray-900 mb-3">
            🎯 Cómo funciona el Semáforo
          </h5>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span className="font-semibold text-gray-800">Verde:</span>
              <span className="text-gray-700">Proceso dentro del tiempo esperado (0% - {alertas.porcentajeRiesgo}% del tiempo transcurrido)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
              <span className="font-semibold text-gray-800">Amarillo:</span>
              <span className="text-gray-700">Proceso en riesgo ({alertas.porcentajeRiesgo}% - {alertas.porcentajeCritico}% del tiempo transcurrido)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span className="font-semibold text-gray-800">Rojo:</span>
              <span className="text-gray-700">Proceso crítico (más del {alertas.porcentajeCritico}% del tiempo transcurrido)</span>
            </div>
          </div>
        </div>

        {/* Controles de Parámetros */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 rounded-lg bg-gray-50">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              🟡 Umbral de Riesgo (%)
            </label>
            <input
              type="number"
              min="50"
              max="100"
              value={alertas.porcentajeRiesgo}
              onChange={(e) => {
                setAlertas({ ...alertas, porcentajeRiesgo: parseInt(e.target.value) || 85 });
                setCambiosPendientes(true);
              }}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-yellow-500"
              style={{ color: '#F59E0B' }}
            />
            <p className="text-xs text-center mt-2 text-gray-600">
              El proceso pasa a amarillo cuando supera este %
            </p>
          </div>

          <div className="p-4 rounded-lg bg-gray-50">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              🔴 Umbral Crítico (%)
            </label>
            <input
              type="number"
              min="80"
              max="100"
              value={alertas.porcentajeCritico}
              onChange={(e) => {
                setAlertas({ ...alertas, porcentajeCritico: parseInt(e.target.value) || 95 });
                setCambiosPendientes(true);
              }}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
              style={{ color: '#DC2626' }}
            />
            <p className="text-xs text-center mt-2 text-gray-600">
              El proceso pasa a rojo cuando supera este %
            </p>
          </div>

          <div className="p-4 rounded-lg bg-gray-50">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              ⚠️ Alerta de Capacidad (%)
            </label>
            <input
              type="number"
              min="50"
              max="100"
              value={alertas.capacidadAlerta}
              onChange={(e) => {
                setAlertas({ ...alertas, capacidadAlerta: parseInt(e.target.value) || 90 });
                setCambiosPendientes(true);
              }}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ color: '#003DA5' }}
            />
            <p className="text-xs text-center mt-2 text-gray-600">
              Alerta cuando un profesional supera este % de su capacidad
            </p>
          </div>

          <div className="p-4 rounded-lg bg-gray-50">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              📆 Días de Anticipación
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={alertas.diasAnticipacion}
              onChange={(e) => {
                setAlertas({ ...alertas, diasAnticipacion: parseInt(e.target.value) || 7 });
                setCambiosPendientes(true);
              }}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ color: '#003DA5' }}
            />
            <p className="text-xs text-center mt-2 text-gray-600">
              Días antes para mostrar alertas de vencimiento próximo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
