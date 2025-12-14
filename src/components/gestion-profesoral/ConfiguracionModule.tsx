import { useState } from 'react';
import { Settings, Save, Mail, Bell, Calendar, Lock } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';

interface ConfiguracionModuleProps {
  className?: string;
}

export function ConfiguracionModule({ className = '' }: ConfiguracionModuleProps) {
  const [config, setConfig] = useState({
    notificaciones_email: true,
    notificaciones_sistema: true,
    auto_deteccion_conflictos: true,
    periodo_evaluacion_dias: 15,
    max_horas_docente: 40,
    min_horas_investigacion: 8,
    requiere_evidencias: true,
    auto_backup: true
  });

  const handleSave = () => {
    console.log('Guardando configuración:', config);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-600 mt-1">Parámetros del módulo</p>
        </div>
        <Button onClick={handleSave} className="bg-[#1e5da8]">
          <Save className="w-4 h-4 mr-2" />
          Guardar Cambios
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-gray-600" />
          <h3 className="font-bold text-gray-900">Notificaciones</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Notificaciones por email</Label>
            <Switch
              checked={config.notificaciones_email}
              onCheckedChange={(checked) => setConfig({ ...config, notificaciones_email: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Notificaciones en sistema</Label>
            <Switch
              checked={config.notificaciones_sistema}
              onCheckedChange={(checked) => setConfig({ ...config, notificaciones_sistema: checked })}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="font-bold text-gray-900">Sistema</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Auto-detección de conflictos</Label>
            <Switch
              checked={config.auto_deteccion_conflictos}
              onCheckedChange={(checked) => setConfig({ ...config, auto_deteccion_conflictos: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Backup automático</Label>
            <Switch
              checked={config.auto_backup}
              onCheckedChange={(checked) => setConfig({ ...config, auto_backup: checked })}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h3 className="font-bold text-gray-900">Parámetros Académicos</h3>
        </div>
        <div className="space-y-4">
          <div>
            <Label>Días de evaluación docente</Label>
            <Input
              type="number"
              value={config.periodo_evaluacion_dias}
              onChange={(e) => setConfig({ ...config, periodo_evaluacion_dias: parseInt(e.target.value) })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Máximo horas semanales por docente</Label>
            <Input
              type="number"
              value={config.max_horas_docente}
              onChange={(e) => setConfig({ ...config, max_horas_docente: parseInt(e.target.value) })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Mínimo horas investigación</Label>
            <Input
              type="number"
              value={config.min_horas_investigacion}
              onChange={(e) => setConfig({ ...config, min_horas_investigacion: parseInt(e.target.value) })}
              className="mt-1"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Requiere evidencias en PTAs</Label>
            <Switch
              checked={config.requiere_evidencias}
              onCheckedChange={(checked) => setConfig({ ...config, requiere_evidencias: checked })}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
