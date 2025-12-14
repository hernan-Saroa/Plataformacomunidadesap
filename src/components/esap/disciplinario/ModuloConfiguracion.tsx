/**
 * MÓDULO DE CONFIGURACIÓN - Control Disciplinario
 * Parámetros del sistema y configuraciones generales
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Save, Settings, Clock, Users, Bell, FileText, Shield,
  AlertTriangle, CheckCircle, Mail, Calendar, Target, Zap
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner@2.0.3';

export function ModuloConfiguracion() {
  // Estados de configuración
  const [tiemposEtapas, setTiemposEtapas] = useState({
    recepcion: 3,
    valoracion: 10,
    indagacion: 40,
    investigacion: 80,
    juzgamiento: 50,
    fallo: 10
  });

  const [capacidades, setCapacidades] = useState({
    especializado: 12,
    universitario: 10,
    senior: 15,
    coordinador: 8
  });

  const [notificaciones, setNotificaciones] = useState({
    vencimiento7dias: true,
    vencimiento3dias: true,
    vencimiento1dia: true,
    procesoVencido: true,
    asignacionProceso: true,
    cambioEtapa: true,
    aprobacionRequerida: false,
    resumenDiario: true,
    resumenSemanal: true
  });

  const [alertas, setAlertas] = useState({
    porcentajeRiesgo: 85,
    porcentajeCritico: 95,
    capacidadAlerta: 90,
    diasAnticipacion: 7
  });

  const handleGuardar = () => {
    toast.success('Configuración guardada exitosamente', {
      description: 'Los cambios se aplicarán de inmediato'
    });
  };

  const handleRestablecer = () => {
    if (confirm('¿Está seguro de restablecer la configuración a valores por defecto?')) {
      toast.info('Configuración restablecida');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold mb-2" style={{ color: '#003DA5' }}>
            Configuración del Sistema
          </h1>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Parámetros y ajustes del módulo disciplinario
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRestablecer}
            className="px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2"
            style={{ background: '#F3F4F6', color: '#4B5563' }}
          >
            Restablecer
          </button>
          <button
            onClick={handleGuardar}
            className="px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:opacity-90"
            style={{ background: '#003DA5', color: '#FFFFFF' }}
          >
            <Save className="w-4 h-4" />
            Guardar Cambios
          </button>
        </div>
      </div>

      {/* Tiempos por Etapa */}
      <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl" style={{ background: '#E0EDFF' }}>
            <Clock className="w-6 h-6" style={{ color: '#003DA5' }} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: '#1F2937' }}>
              Tiempos por Etapa
            </h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Duración estándar en días para cada etapa del proceso
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(tiemposEtapas).map(([etapa, dias]) => (
            <div key={etapa} className="p-5 rounded-xl" style={{ background: '#F9FAFB' }}>
              <label className="block mb-3">
                <span className="text-sm font-bold uppercase mb-2 block" style={{ color: '#4B5563' }}>
                  {etapa}
                </span>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={dias}
                    onChange={(e) => setTiemposEtapas({
                      ...tiemposEtapas,
                      [etapa]: parseInt(e.target.value) || 0
                    })}
                    className="flex-1 px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#003DA5]"
                    style={{ borderColor: '#E5E7EB' }}
                  />
                  <span className="text-sm font-semibold whitespace-nowrap" style={{ color: '#6B7280' }}>
                    días
                  </span>
                </div>
              </label>
              <div className="flex items-center gap-2 mt-2">
                <Calendar className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                <span className="text-xs" style={{ color: '#9CA3AF' }}>
                  Tiempo estándar estimado
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-xl flex items-start gap-3" style={{ background: '#E0EDFF' }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#003DA5' }} />
          <p className="text-sm" style={{ color: '#003DA5' }}>
            <span className="font-bold">Importante:</span> Estos tiempos se utilizan para calcular las alertas automáticas y el semáforo de cada proceso.
          </p>
        </div>
      </Card>

      {/* Capacidades por Cargo */}
      <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl" style={{ background: '#D1FAE5' }}>
            <Users className="w-6 h-6" style={{ color: '#10B981' }} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: '#1F2937' }}>
              Capacidad por Cargo
            </h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Número máximo de procesos que puede gestionar cada tipo de profesional
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(capacidades).map(([cargo, cantidad]) => (
            <div key={cargo} className="p-5 rounded-xl border-2" style={{ borderColor: '#E5E7EB' }}>
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5" style={{ color: '#003DA5' }} />
                <span className="text-sm font-bold uppercase" style={{ color: '#1F2937' }}>
                  {cargo}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={cantidad}
                  onChange={(e) => setCapacidades({
                    ...capacidades,
                    [cargo]: parseInt(e.target.value) || 0
                  })}
                  className="flex-1 px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#003DA5] text-center text-xl font-bold"
                  style={{ borderColor: '#E5E7EB', color: '#003DA5' }}
                />
              </div>
              <p className="text-xs text-center mt-2" style={{ color: '#9CA3AF' }}>
                procesos máximo
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Notificaciones */}
      <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl" style={{ background: '#FEF3C7' }}>
            <Bell className="w-6 h-6" style={{ color: '#F59E0B' }} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: '#1F2937' }}>
              Notificaciones
            </h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Configura las alertas automáticas del sistema
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Alertas de Vencimiento */}
          <div className="p-5 rounded-xl" style={{ background: '#F9FAFB' }}>
            <h3 className="text-sm font-bold mb-4 uppercase" style={{ color: '#4B5563' }}>
              Alertas de Vencimiento
            </h3>
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
                    checked={notificaciones[item.key as keyof typeof notificaciones]}
                    onChange={(e) => setNotificaciones({
                      ...notificaciones,
                      [item.key]: e.target.checked
                    })}
                    className="w-5 h-5 rounded border-2 focus:outline-none"
                    style={{ 
                      borderColor: '#E5E7EB',
                      accentColor: '#003DA5'
                    }}
                  />
                  <span className="text-sm font-medium" style={{ color: '#1F2937' }}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Notificaciones de Proceso */}
          <div className="p-5 rounded-xl" style={{ background: '#F9FAFB' }}>
            <h3 className="text-sm font-bold mb-4 uppercase" style={{ color: '#4B5563' }}>
              Notificaciones de Proceso
            </h3>
            <div className="space-y-3">
              {[
                { key: 'asignacionProceso', label: 'Asignación de nuevo proceso' },
                { key: 'cambioEtapa', label: 'Cambio de etapa' },
                { key: 'aprobacionRequerida', label: 'Aprobación requerida' }
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificaciones[item.key as keyof typeof notificaciones]}
                    onChange={(e) => setNotificaciones({
                      ...notificaciones,
                      [item.key]: e.target.checked
                    })}
                    className="w-5 h-5 rounded border-2 focus:outline-none"
                    style={{ 
                      borderColor: '#E5E7EB',
                      accentColor: '#003DA5'
                    }}
                  />
                  <span className="text-sm font-medium" style={{ color: '#1F2937' }}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Resúmenes */}
          <div className="p-5 rounded-xl md:col-span-2" style={{ background: '#F9FAFB' }}>
            <h3 className="text-sm font-bold mb-4 uppercase" style={{ color: '#4B5563' }}>
              Resúmenes Automáticos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { key: 'resumenDiario', label: 'Resumen diario (8:00 AM)' },
                { key: 'resumenSemanal', label: 'Resumen semanal (Lunes 8:00 AM)' }
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificaciones[item.key as keyof typeof notificaciones]}
                    onChange={(e) => setNotificaciones({
                      ...notificaciones,
                      [item.key]: e.target.checked
                    })}
                    className="w-5 h-5 rounded border-2 focus:outline-none"
                    style={{ 
                      borderColor: '#E5E7EB',
                      accentColor: '#003DA5'
                    }}
                  />
                  <span className="text-sm font-medium" style={{ color: '#1F2937' }}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Parámetros de Alertas */}
      <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl" style={{ background: '#FEE2E2' }}>
            <AlertTriangle className="w-6 h-6" style={{ color: '#DC2626' }} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: '#1F2937' }}>
              Parámetros de Alertas
            </h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Umbrales para activar las alertas del sistema
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl" style={{ background: '#FFFBEB' }}>
            <label className="block">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold" style={{ color: '#1F2937' }}>
                  Porcentaje de Riesgo (Amarillo)
                </span>
                <Badge style={{ background: '#FEF3C7', color: '#D97706' }}>
                  {alertas.porcentajeRiesgo}%
                </Badge>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={alertas.porcentajeRiesgo}
                onChange={(e) => setAlertas({
                  ...alertas,
                  porcentajeRiesgo: parseInt(e.target.value)
                })}
                className="w-full"
              />
              <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
                Cuando el proceso alcanza este % del tiempo estimado, se marca en amarillo
              </p>
            </label>
          </div>

          <div className="p-5 rounded-xl" style={{ background: '#FEF2F2' }}>
            <label className="block">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold" style={{ color: '#1F2937' }}>
                  Porcentaje Crítico (Rojo)
                </span>
                <Badge style={{ background: '#FEE2E2', color: '#DC2626' }}>
                  {alertas.porcentajeCritico}%
                </Badge>
              </div>
              <input
                type="range"
                min="80"
                max="100"
                value={alertas.porcentajeCritico}
                onChange={(e) => setAlertas({
                  ...alertas,
                  porcentajeCritico: parseInt(e.target.value)
                })}
                className="w-full"
              />
              <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
                Cuando el proceso alcanza este % del tiempo estimado, se marca en rojo
              </p>
            </label>
          </div>

          <div className="p-5 rounded-xl" style={{ background: '#F9FAFB' }}>
            <label className="block">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold" style={{ color: '#1F2937' }}>
                  Alerta de Capacidad
                </span>
                <Badge style={{ background: '#E0EDFF', color: '#003DA5' }}>
                  {alertas.capacidadAlerta}%
                </Badge>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={alertas.capacidadAlerta}
                onChange={(e) => setAlertas({
                  ...alertas,
                  capacidadAlerta: parseInt(e.target.value)
                })}
                className="w-full"
              />
              <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
                Alertar cuando un profesional alcanza este % de su capacidad
              </p>
            </label>
          </div>

          <div className="p-5 rounded-xl" style={{ background: '#F9FAFB' }}>
            <label className="block">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold" style={{ color: '#1F2937' }}>
                  Días de Anticipación
                </span>
                <Badge style={{ background: '#E0EDFF', color: '#003DA5' }}>
                  {alertas.diasAnticipacion} días
                </Badge>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={alertas.diasAnticipacion}
                onChange={(e) => setAlertas({
                  ...alertas,
                  diasAnticipacion: parseInt(e.target.value)
                })}
                className="w-full"
              />
              <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
                Notificar con esta anticipación antes del vencimiento
              </p>
            </label>
          </div>
        </div>
      </Card>

      {/* Seguridad y Auditoría */}
      <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl" style={{ background: '#E0EDFF' }}>
            <Shield className="w-6 h-6" style={{ color: '#003DA5' }} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: '#1F2937' }}>
              Seguridad y Auditoría
            </h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Configuraciones de trazabilidad y seguridad
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center gap-3 p-4 rounded-xl hover:bg-gray-50 cursor-pointer" style={{ background: '#F9FAFB' }}>
            <input
              type="checkbox"
              defaultChecked
              className="w-5 h-5 rounded border-2"
              style={{ accentColor: '#003DA5' }}
            />
            <div>
              <p className="font-semibold text-sm" style={{ color: '#1F2937' }}>
                Registro de auditoría
              </p>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                Guardar todas las acciones en el log
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 rounded-xl hover:bg-gray-50 cursor-pointer" style={{ background: '#F9FAFB' }}>
            <input
              type="checkbox"
              defaultChecked
              className="w-5 h-5 rounded border-2"
              style={{ accentColor: '#003DA5' }}
            />
            <div>
              <p className="font-semibold text-sm" style={{ color: '#1F2937' }}>
                Firma digital requerida
              </p>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                Para aprobar actos administrativos
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 rounded-xl hover:bg-gray-50 cursor-pointer" style={{ background: '#F9FAFB' }}>
            <input
              type="checkbox"
              defaultChecked
              className="w-5 h-5 rounded border-2"
              style={{ accentColor: '#003DA5' }}
            />
            <div>
              <p className="font-semibold text-sm" style={{ color: '#1F2937' }}>
                Backup automático
              </p>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                Respaldo diario a las 00:00
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 rounded-xl hover:bg-gray-50 cursor-pointer" style={{ background: '#F9FAFB' }}>
            <input
              type="checkbox"
              defaultChecked
              className="w-5 h-5 rounded border-2"
              style={{ accentColor: '#003DA5' }}
            />
            <div>
              <p className="font-semibold text-sm" style={{ color: '#1F2937' }}>
                Notificaciones por email
              </p>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                Enviar copia de alertas a email
              </p>
            </div>
          </label>
        </div>
      </Card>

      {/* Botones de Acción */}
      <div className="flex items-center justify-between p-6 rounded-xl border-2" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6" style={{ color: '#10B981' }} />
          <div>
            <p className="font-bold text-sm" style={{ color: '#1F2937' }}>
              Cambios pendientes
            </p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              Recuerda guardar para aplicar la configuración
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRestablecer}
            className="px-6 py-2.5 rounded-xl font-semibold"
            style={{ background: '#F3F4F6', color: '#4B5563' }}
          >
            Restablecer
          </button>
          <button
            onClick={handleGuardar}
            className="px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2"
            style={{ background: '#003DA5', color: '#FFFFFF' }}
          >
            <Save className="w-4 h-4" />
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
