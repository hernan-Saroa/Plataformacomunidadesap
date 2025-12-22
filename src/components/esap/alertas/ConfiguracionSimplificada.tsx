/**
 * ⚙️ CONFIGURACIÓN SIMPLIFICADA - ALERTAS SIGL
 * 
 * Diseño enfocado en usabilidad:
 * - Vista de lista simple
 * - Formulario limpio y espacioso
 * - Opciones agrupadas lógicamente
 * - Ayudas visuales claras
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Scale, Shield, FileText, Gavel, DollarSign, Bell, Inbox,
  Target, AlertTriangle, ClipboardList, Archive, Check, X,
  Mail, MessageSquare, Smartphone, Clock, ChevronRight, Info,
  Settings
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card } from '../../ui/card';
import { toast } from 'sonner@2.0.3';

type Modulo = {
  id: string;
  nombre: string;
  icono: any;
  color: string;
  descripcion: string;
};

const MODULOS: Modulo[] = [
  {
    id: 'DEFENSA_JUDICIAL',
    nombre: 'Defensa Judicial',
    icono: Scale,
    color: '#3B82F6',
    descripcion: 'Procesos judiciales en contra de la ESAP'
  },
  {
    id: 'ORGANOS_CONTROL',
    nombre: 'Órganos de Control',
    icono: Shield,
    color: '#EF4444',
    descripcion: 'Requerimientos de Contraloría y Procuraduría'
  },
  {
    id: 'JUZGAMIENTO_DISCIPLINARIO',
    nombre: 'Juzgamiento Disciplinario',
    icono: Gavel,
    color: '#8B5CF6',
    descripcion: 'Procesos disciplinarios internos'
  },
  {
    id: 'ASESORIA_JURIDICA',
    nombre: 'Asesoría Jurídica',
    icono: FileText,
    color: '#10B981',
    descripcion: 'Conceptos y asesorías legales internas'
  },
  {
    id: 'PROCESOS_COACTIVOS',
    nombre: 'Procesos Coactivos',
    icono: DollarSign,
    color: '#F59E0B',
    descripcion: 'Cobro de cartera y procesos coactivos'
  },
  {
    id: 'BUZON_NOTIFICACIONES',
    nombre: 'Buzón de Notificaciones',
    icono: Bell,
    color: '#EC4899',
    descripcion: 'Notificaciones judiciales electrónicas'
  },
  {
    id: 'PLAN_ACCION',
    nombre: 'Plan de Acción',
    icono: Target,
    color: '#06B6D4',
    descripcion: 'Compromisos y planes de mejoramiento'
  },
  {
    id: 'RIESGOS',
    nombre: 'Gestión de Riesgos',
    icono: AlertTriangle,
    color: '#F97316',
    descripcion: 'Riesgos jurídicos identificados'
  },
];

type ConfigModulo = {
  diasVerde: number;
  diasAmarillo: number;
  diasRojo: number;
  canales: string[];
  destinatarios: string;
  escalarEn: number;
};

const CONFIG_INICIAL: ConfigModulo = {
  diasVerde: 15,
  diasAmarillo: 10,
  diasRojo: 5,
  canales: ['EMAIL', 'IN_APP'],
  destinatarios: 'Responsable asignado',
  escalarEn: 24,
};

export function ConfiguracionSimplificada() {
  const [moduloSeleccionado, setModuloSeleccionado] = useState<string | null>(null);
  const [config, setConfig] = useState<ConfigModulo>(CONFIG_INICIAL);
  const [guardando, setGuardando] = useState(false);

  const modulo = MODULOS.find(m => m.id === moduloSeleccionado);

  const handleGuardar = () => {
    setGuardando(true);
    
    setTimeout(() => {
      toast.success('✅ Configuración guardada', {
        description: `${modulo?.nombre} actualizado correctamente`
      });
      setGuardando(false);
    }, 800);
  };

  const toggleCanal = (canal: string) => {
    setConfig(prev => ({
      ...prev,
      canales: prev.canales.includes(canal)
        ? prev.canales.filter(c => c !== canal)
        : [...prev.canales, canal]
    }));
  };

  return (
    <div className="h-full grid grid-cols-12 gap-0 bg-gray-50">
      {/* Lista de Módulos - Sidebar */}
      <div className="col-span-12 lg:col-span-4 bg-white border-r border-gray-200 h-full overflow-y-auto custom-scrollbar">
        <div className="p-6">
          <div className="mb-4">
            <h3 className="font-bold text-gray-900 text-lg">Módulos SIGL</h3>
            <p className="text-sm text-gray-600 mt-1">
              Selecciona un módulo para configurar sus alertas
            </p>
          </div>

          <div className="space-y-2">
            {MODULOS.map((m) => {
              const Icon = m.icono;
              const isActive = moduloSeleccionado === m.id;

              return (
                <motion.button
                  key={m.id}
                  onClick={() => setModuloSeleccionado(m.id)}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    w-full p-4 rounded-xl border-2 transition-all text-left
                    ${isActive 
                      ? 'bg-orange-50 border-orange-400 shadow-md' 
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2.5 rounded-lg"
                      style={{ backgroundColor: isActive ? m.color : '#F3F4F6' }}
                    >
                      <Icon 
                        className="w-5 h-5" 
                        style={{ color: isActive ? 'white' : m.color }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-bold text-sm ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                        {m.nombre}
                      </h4>
                      <p className="text-xs text-gray-600 mt-0.5 truncate">
                        {m.descripcion}
                      </p>
                    </div>
                    {isActive && (
                      <ChevronRight className="w-5 h-5 text-orange-600 flex-shrink-0" />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Panel de Configuración */}
      <div className="col-span-12 lg:col-span-8 h-full overflow-y-auto custom-scrollbar">
        {!modulo ? (
          // Estado vacío
          <div className="h-full flex items-center justify-center p-12">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="font-bold text-xl text-gray-900 mb-2">
                Selecciona un Módulo
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Elige un módulo de la lista para configurar sus alertas automáticas
              </p>
            </div>
          </div>
        ) : (
          // Formulario de configuración
          <motion.div
            key={modulo.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8"
          >
            {/* Header del módulo */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-3">
                <div 
                  className="p-4 rounded-xl"
                  style={{ backgroundColor: modulo.color }}
                >
                  {React.createElement(modulo.icono, {
                    className: 'w-7 h-7 text-white'
                  })}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{modulo.nombre}</h2>
                  <p className="text-gray-600 mt-1">{modulo.descripcion}</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">
                <Check className="w-3 h-3 mr-1" />
                Alertas activas
              </Badge>
            </div>

            {/* Formulario espacioso */}
            <div className="space-y-8">
              {/* Sección 1: Umbrales de Alerta */}
              <Card className="p-6 bg-white border-2 border-gray-200">
                <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  Umbrales de Alerta por Color
                </h3>
                <p className="text-sm text-gray-600 mb-5">
                  Define cuántos días antes del vencimiento se debe notificar
                </p>

                <div className="grid grid-cols-3 gap-4">
                  {/* Verde */}
                  <div>
                    <label className="block mb-2">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-sm font-bold text-gray-900">Verde</span>
                      </div>
                      <div className="text-xs text-gray-600 mb-2">Alerta informativa</div>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={config.diasVerde}
                        onChange={(e) => setConfig({...config, diasVerde: parseInt(e.target.value)})}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">días</span>
                    </div>
                  </div>

                  {/* Amarillo */}
                  <div>
                    <label className="block mb-2">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <span className="text-sm font-bold text-gray-900">Amarillo</span>
                      </div>
                      <div className="text-xs text-gray-600 mb-2">Precaución</div>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={config.diasAmarillo}
                        onChange={(e) => setConfig({...config, diasAmarillo: parseInt(e.target.value)})}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">días</span>
                    </div>
                  </div>

                  {/* Rojo */}
                  <div>
                    <label className="block mb-2">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-sm font-bold text-gray-900">Rojo</span>
                      </div>
                      <div className="text-xs text-gray-600 mb-2">Urgente</div>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={config.diasRojo}
                        onChange={(e) => setConfig({...config, diasRojo: parseInt(e.target.value)})}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">días</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-800">
                    <Info className="w-3 h-3 inline mr-1" />
                    <strong>Ejemplo:</strong> Si un proceso vence en 12 días, se enviará alerta amarilla (≤{config.diasAmarillo} días)
                  </p>
                </div>
              </Card>

              {/* Sección 2: Canales */}
              <Card className="p-6 bg-white border-2 border-gray-200">
                <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-orange-600" />
                  Canales de Notificación
                </h3>
                <p className="text-sm text-gray-600 mb-5">
                  Selecciona por dónde quieres recibir las alertas
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'EMAIL', nombre: 'Correo Electrónico', icono: Mail, descripcion: 'Llega a la bandeja de entrada' },
                    { id: 'TEAMS', nombre: 'Microsoft Teams', icono: MessageSquare, descripcion: 'Chat directo en Teams' },
                    { id: 'SMS', nombre: 'Mensaje de Texto', icono: Smartphone, descripcion: 'SMS al celular registrado' },
                    { id: 'IN_APP', nombre: 'Notificación Interna', icono: Bell, descripcion: 'Dentro del sistema SIGL' },
                  ].map((canal) => {
                    const Icon = canal.icono;
                    const isActive = config.canales.includes(canal.id);

                    return (
                      <button
                        key={canal.id}
                        onClick={() => toggleCanal(canal.id)}
                        className={`
                          p-4 rounded-xl border-2 transition-all text-left
                          ${isActive 
                            ? 'bg-orange-50 border-orange-400 shadow-md' 
                            : 'bg-white border-gray-200 hover:border-gray-300'
                          }
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${isActive ? 'bg-orange-500' : 'bg-gray-200'}`}>
                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-gray-900 mb-0.5">{canal.nombre}</h4>
                            <p className="text-xs text-gray-600">{canal.descripcion}</p>
                          </div>
                          {isActive && <Check className="w-5 h-5 text-orange-600 flex-shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>

              {/* Sección 3: Destinatarios */}
              <Card className="p-6 bg-white border-2 border-gray-200">
                <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-orange-600" />
                  Destinatarios
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Define quién recibirá las alertas
                </p>

                <textarea
                  value={config.destinatarios}
                  onChange={(e) => setConfig({...config, destinatarios: e.target.value})}
                  placeholder="Ejemplo: Responsable asignado, Jefe de Oficina Jurídica"
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                />
              </Card>

              {/* Sección 4: Escalamiento */}
              <Card className="p-6 bg-white border-2 border-gray-200">
                <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Escalamiento Automático
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Si no hay respuesta, escalar al supervisor
                </p>

                <div className="flex items-center gap-4">
                  <label className="text-sm text-gray-700">
                    Escalar después de
                  </label>
                  <div className="relative flex-1 max-w-xs">
                    <input
                      type="number"
                      value={config.escalarEn}
                      onChange={(e) => setConfig({...config, escalarEn: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">horas</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Botones de acción */}
            <div className="mt-8 flex items-center gap-3 pt-6 border-t-2 border-gray-200">
              <Button
                onClick={handleGuardar}
                disabled={guardando}
                className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-6 text-base font-bold"
              >
                {guardando ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Guardar Configuración
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setConfig(CONFIG_INICIAL)}
                className="px-6 py-6 text-base"
              >
                <X className="w-5 h-5 mr-2" />
                Cancelar
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}