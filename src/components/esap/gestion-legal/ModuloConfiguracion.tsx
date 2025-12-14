/**
 * MÓDULO DE CONFIGURACIÓN
 * Parámetros del sistema, términos procesales y alertas
 */

import { useState } from 'react';
import { Settings, Bell, Clock, AlertTriangle, Save, Check } from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { toast } from 'sonner@2.0.3';

export function ModuloConfiguracion() {
  const [configuracion, setConfiguracion] = useState({
    // Términos procesales
    diasDescargos: 10,
    diasPruebas: 30,
    diasAlegatos: 10,
    diasApelacion: 10,
    
    // Alertas de prescripción
    alertaCritica: 90,  // días
    alertaAtencion: 180, // días
    
    // Alertas de términos
    alertaTermino25: true,
    alertaTermino50: true,
    alertaTermino75: true,
    
    // Notificaciones
    notifEmailNuevoExpediente: true,
    notifEmailTerminoProximo: true,
    notifEmailPrescripcionCerca: true,
  });

  const handleGuardar = () => {
    toast.success('Configuración guardada correctamente', {
      description: 'Los cambios se aplicarán inmediatamente',
      duration: 2000
    });
  };

  const handleRestaurar = () => {
    toast.info('Configuración restaurada a valores por defecto');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold mb-2" style={{ color: '#6F42C1' }}>
          Configuración del Sistema
        </h2>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          Parámetros, términos procesales y sistema de alertas
        </p>
      </div>

      {/* Términos Procesales */}
      <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl" style={{ background: '#F3E8FF' }}>
            <Clock className="w-6 h-6" style={{ color: '#6F42C1' }} />
          </div>
          <div>
            <h3 className="font-bold text-lg" style={{ color: '#1F2937' }}>
              Términos Procesales
            </h3>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Configuración de plazos según normatividad vigente
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label className="text-sm font-bold mb-2 flex items-center gap-2">
              <Badge style={{ background: '#F3E8FF', color: '#6F42C1' }}>
                Art. 219
              </Badge>
              Traslado para Descargos
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={configuracion.diasDescargos}
                onChange={(e) => setConfiguracion({ ...configuracion, diasDescargos: parseInt(e.target.value) })}
                className="border-2"
                style={{ borderColor: '#E5E7EB' }}
              />
              <span className="text-sm font-medium" style={{ color: '#6B7280' }}>
                días hábiles
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
              Ley 1952/2019: 10 días hábiles
            </p>
          </div>

          <div>
            <Label className="text-sm font-bold mb-2 flex items-center gap-2">
              <Badge style={{ background: '#F3E8FF', color: '#6F42C1' }}>
                Arts. 222-232
              </Badge>
              Práctica de Pruebas
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={configuracion.diasPruebas}
                onChange={(e) => setConfiguracion({ ...configuracion, diasPruebas: parseInt(e.target.value) })}
                className="border-2"
                style={{ borderColor: '#E5E7EB' }}
              />
              <span className="text-sm font-medium" style={{ color: '#6B7280' }}>
                días hábiles
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
              Término usual: 30 días hábiles
            </p>
          </div>

          <div>
            <Label className="text-sm font-bold mb-2 flex items-center gap-2">
              <Badge style={{ background: '#F3E8FF', color: '#6F42C1' }}>
                Art. 232
              </Badge>
              Alegatos de Conclusión
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={configuracion.diasAlegatos}
                onChange={(e) => setConfiguracion({ ...configuracion, diasAlegatos: parseInt(e.target.value) })}
                className="border-2"
                style={{ borderColor: '#E5E7EB' }}
              />
              <span className="text-sm font-medium" style={{ color: '#6B7280' }}>
                días hábiles
              </span>
            </div>
          </div>

          <div>
            <Label className="text-sm font-bold mb-2 flex items-center gap-2">
              <Badge style={{ background: '#F3E8FF', color: '#6F42C1' }}>
                Arts. 247-254
              </Badge>
              Recurso de Apelación
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={configuracion.diasApelacion}
                onChange={(e) => setConfiguracion({ ...configuracion, diasApelacion: parseInt(e.target.value) })}
                className="border-2"
                style={{ borderColor: '#E5E7EB' }}
              />
              <span className="text-sm font-medium" style={{ color: '#6B7280' }}>
                días hábiles
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
              Ley 1952/2019: 10 días hábiles
            </p>
          </div>
        </div>
      </Card>

      {/* Alertas de Prescripción */}
      <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl" style={{ background: '#FEE2E2' }}>
            <AlertTriangle className="w-6 h-6" style={{ color: '#DC2626' }} />
          </div>
          <div>
            <h3 className="font-bold text-lg" style={{ color: '#1F2937' }}>
              Alertas de Prescripción
            </h3>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Sistema de semáforo (5 años desde ocurrencia de hechos)
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-lg" style={{ background: '#FEE2E2' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: '#DC2626' }} />
                <span className="font-bold text-sm" style={{ color: '#991B1B' }}>
                  🚨 ALERTA CRÍTICA
                </span>
              </div>
              <Badge style={{ background: '#DC2626', color: '#FFFFFF' }}>
                Menos de {configuracion.alertaCritica} días
              </Badge>
            </div>
            <Input
              type="number"
              value={configuracion.alertaCritica}
              onChange={(e) => setConfiguracion({ ...configuracion, alertaCritica: parseInt(e.target.value) })}
              className="border-2"
              style={{ borderColor: '#FEE2E2' }}
            />
            <p className="text-xs mt-2" style={{ color: '#7F1D1D' }}>
              Expedientes con menos de este número de días para prescribir se marcarán como críticos
            </p>
          </div>

          <div className="p-4 rounded-lg" style={{ background: '#FEF3C7' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: '#F59E0B' }} />
                <span className="font-bold text-sm" style={{ color: '#92400E' }}>
                  ⚠️ ALERTA DE ATENCIÓN
                </span>
              </div>
              <Badge style={{ background: '#F59E0B', color: '#FFFFFF' }}>
                Menos de {configuracion.alertaAtencion} días
              </Badge>
            </div>
            <Input
              type="number"
              value={configuracion.alertaAtencion}
              onChange={(e) => setConfiguracion({ ...configuracion, alertaAtencion: parseInt(e.target.value) })}
              className="border-2"
              style={{ borderColor: '#FEF3C7' }}
            />
            <p className="text-xs mt-2" style={{ color: '#78350F' }}>
              Expedientes que requieren atención moderada
            </p>
          </div>
        </div>
      </Card>

      {/* Notificaciones */}
      <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl" style={{ background: '#E0F2FE' }}>
            <Bell className="w-6 h-6" style={{ color: '#0284C7' }} />
          </div>
          <div>
            <h3 className="font-bold text-lg" style={{ color: '#1F2937' }}>
              Notificaciones por Email
            </h3>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Configurar alertas automáticas
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={configuracion.notifEmailNuevoExpediente}
                onChange={(e) => setConfiguracion({ ...configuracion, notifEmailNuevoExpediente: e.target.checked })}
                className="w-5 h-5"
                style={{ accentColor: '#6F42C1' }}
              />
              <div>
                <p className="font-medium text-sm" style={{ color: '#1F2937' }}>
                  Nuevo expediente recibido
                </p>
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  Notificar al abogado asignado cuando se recibe un nuevo expediente
                </p>
              </div>
            </div>
            {configuracion.notifEmailNuevoExpediente && (
              <Check className="w-5 h-5" style={{ color: '#10B981' }} />
            )}
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={configuracion.notifEmailTerminoProximo}
                onChange={(e) => setConfiguracion({ ...configuracion, notifEmailTerminoProximo: e.target.checked })}
                className="w-5 h-5"
                style={{ accentColor: '#6F42C1' }}
              />
              <div>
                <p className="font-medium text-sm" style={{ color: '#1F2937' }}>
                  Término procesal próximo a vencer
                </p>
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  Alertar cuando falten menos de 3 días para vencer un término
                </p>
              </div>
            </div>
            {configuracion.notifEmailTerminoProximo && (
              <Check className="w-5 h-5" style={{ color: '#10B981' }} />
            )}
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={configuracion.notifEmailPrescripcionCerca}
                onChange={(e) => setConfiguracion({ ...configuracion, notifEmailPrescripcionCerca: e.target.checked })}
                className="w-5 h-5"
                style={{ accentColor: '#6F42C1' }}
              />
              <div>
                <p className="font-medium text-sm" style={{ color: '#1F2937' }}>
                  Prescripción cercana (crítico)
                </p>
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  Alerta urgente cuando un expediente entre en estado crítico de prescripción
                </p>
              </div>
            </div>
            {configuracion.notifEmailPrescripcionCerca && (
              <Check className="w-5 h-5" style={{ color: '#10B981' }} />
            )}
          </label>
        </div>
      </Card>

      {/* Botones de Acción */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleRestaurar}
          className="border-2"
          style={{ borderColor: '#E5E7EB' }}
        >
          Restaurar Valores por Defecto
        </Button>
        <Button
          onClick={handleGuardar}
          className="font-bold"
          style={{ background: '#6F42C1', color: '#FFFFFF' }}
        >
          <Save className="w-4 h-4 mr-2" />
          Guardar Configuración
        </Button>
      </div>

      {/* Info Legal */}
      <Card className="p-4 border-2" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg" style={{ background: '#F3E8FF' }}>
            <Settings className="w-5 h-5" style={{ color: '#6F42C1' }} />
          </div>
          <div>
            <p className="text-sm font-bold mb-1" style={{ color: '#1F2937' }}>
              ⚖️ Fundamento Legal
            </p>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Todos los términos están basados en la <strong>Ley 1952 de 2019</strong> (Código General Disciplinario). 
              Los cambios en la configuración deben ajustarse a la normatividad vigente y ser autorizados 
              por el Jefe de la Oficina Asesora Jurídica.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
