/**
 * ModuloConfiguracionDefensaJudicial - Configuración del Sistema de Defensa Judicial
 * ✅ Diseño corporativo ESAP 2025
 * ✅ Incluye configurador de plantillas de oficios
 * ✅ Gestión de parámetros del sistema
 */

import { useState } from 'react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Button } from '@esap-mfe/shared-ui/button';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@esap-mfe/shared-ui/tabs';
import { 
  Settings, FileText, Users, Bell, Shield, Database,
  Mail, Calendar, Scale, AlertCircle
} from 'lucide-react';
import { ConfiguradorPlantillasOficios } from './ConfiguradorPlantillasOficios';

export function ModuloConfiguracionDefensaJudicial() {
  const [tabActual, setTabActual] = useState('plantillas');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Principal */}
        <Card className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Settings className="w-8 h-8" />
                <h1 className="text-3xl font-black">
                  Configuración del Sistema
                </h1>
              </div>
              <p className="text-blue-100">
                Gestión Legal - Defensa Judicial | Parámetros y ajustes del módulo
              </p>
            </div>
            <Badge variant="outline" className="bg-white text-blue-700 font-bold border-0 text-lg px-4 py-2">
              <Scale className="w-5 h-5 mr-2" />
              Defensa Judicial
            </Badge>
          </div>
        </Card>

        {/* Tabs de configuración */}
        <Card className="p-6">
          <Tabs value={tabActual} onValueChange={setTabActual}>
            <TabsList className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-6">
              <TabsTrigger value="plantillas" className="font-bold">
                <FileText className="w-4 h-4 mr-2" />
                Plantillas de Oficios
              </TabsTrigger>
              <TabsTrigger value="usuarios" className="font-bold">
                <Users className="w-4 h-4 mr-2" />
                Usuarios
              </TabsTrigger>
              <TabsTrigger value="notificaciones" className="font-bold">
                <Bell className="w-4 h-4 mr-2" />
                Notificaciones
              </TabsTrigger>
              <TabsTrigger value="seguridad" className="font-bold">
                <Shield className="w-4 h-4 mr-2" />
                Seguridad
              </TabsTrigger>
              <TabsTrigger value="integraciones" className="font-bold">
                <Database className="w-4 h-4 mr-2" />
                Integraciones
              </TabsTrigger>
            </TabsList>

            {/* Tab: Plantillas de Oficios */}
            <TabsContent value="plantillas">
              <ConfiguradorPlantillasOficios />
            </TabsContent>

            {/* Tab: Usuarios (placeholder) */}
            <TabsContent value="usuarios">
              <Card className="p-8 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-black text-gray-700 mb-2">
                  Gestión de Usuarios
                </h3>
                <p className="text-sm text-gray-600">
                  Configuración de permisos, roles y accesos al módulo de Defensa Judicial
                </p>
              </Card>
            </TabsContent>

            {/* Tab: Notificaciones (placeholder) */}
            <TabsContent value="notificaciones">
              <Card className="p-8 text-center">
                <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-black text-gray-700 mb-2">
                  Notificaciones y Alertas
                </h3>
                <p className="text-sm text-gray-600">
                  Configuración de recordatorios, vencimientos y alertas automáticas
                </p>
              </Card>
            </TabsContent>

            {/* Tab: Seguridad (placeholder) */}
            <TabsContent value="seguridad">
              <Card className="p-8 text-center">
                <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-black text-gray-700 mb-2">
                  Seguridad y Auditoría
                </h3>
                <p className="text-sm text-gray-600">
                  Registro de actividades, logs del sistema y configuración de seguridad
                </p>
              </Card>
            </TabsContent>

            {/* Tab: Integraciones (placeholder) */}
            <TabsContent value="integraciones">
              <Card className="p-8 text-center">
                <Database className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-black text-gray-700 mb-2">
                  Integraciones Externas
                </h3>
                <p className="text-sm text-gray-600">
                  Conexiones con sistemas judiciales, bases de datos externas y APIs
                </p>
              </Card>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Información adicional */}
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-900 mb-1">
                ⚙️ Configuración del Sistema
              </p>
              <p className="text-xs text-amber-800 leading-relaxed">
                Los cambios realizados en esta sección afectan el comportamiento general del módulo 
                de Defensa Judicial. Asegúrate de probar los cambios antes de aplicarlos en producción. 
                Las configuraciones se guardan automáticamente y pueden ser restauradas a sus valores 
                por defecto en cualquier momento.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
