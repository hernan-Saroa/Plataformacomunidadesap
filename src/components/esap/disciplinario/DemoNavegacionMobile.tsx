/**
 * DEMO VISUAL - NAVEGACIÓN MOBILE
 * Muestra cómo funciona el drawer mobile en Control Interno Disciplinario
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, X, Scale, LayoutDashboard, FileText, CheckCircle, 
  Archive, Clock, Users, Settings 
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';

const MENU_ITEMS = [
  { id: 'procesos', label: 'Procesos', icon: <LayoutDashboard className="w-5 h-5" />, badge: 6 },
  { id: 'noticias', label: 'Noticias Disciplinarias', icon: <FileText className="w-5 h-5" />, badge: 3 },
  { id: 'revision', label: 'Revisión y Aprobación', icon: <CheckCircle className="w-5 h-5" />, badge: 2 },
  { id: 'expediente', label: 'Expediente Electrónico', icon: <Archive className="w-5 h-5" /> },
  { id: 'terminos', label: 'Términos y Alertas', icon: <Clock className="w-5 h-5" />, badge: 4 },
  { id: 'profesionales', label: 'Profesionales', icon: <Users className="w-5 h-5" /> },
  { id: 'config', label: 'Configuración', icon: <Settings className="w-5 h-5" /> }
];

export function DemoNavegacionMobile() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('procesos');
  const moduleColor = '#003DA5';

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setMenuOpen(false);
  };

  const getActiveLabel = () => {
    const item = MENU_ITEMS.find(m => m.id === activeSection);
    return item?.label || 'Procesos';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SIMULACIÓN DE PANTALLA MOBILE */}
      <div className="max-w-md mx-auto bg-white shadow-2xl min-h-screen relative overflow-hidden">
        
        {/* OVERLAY */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setMenuOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* DRAWER MOBILE */}
        <AnimatePresence>
          {menuOpen && (
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] z-50 flex flex-col bg-white"
              style={{ 
                boxShadow: '4px 0 12px rgba(0, 0, 0, 0.1)'
              }}
            >
              {/* Header del Drawer */}
              <div className="p-4 border-b-2 border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 rounded-xl" style={{ background: `${moduleColor}15` }}>
                      <Scale className="w-6 h-6" style={{ color: moduleColor }} />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-black text-xs leading-tight" style={{ color: moduleColor }}>
                        CONTROL INTERNO DISCIPLINARIO
                      </h2>
                      <p className="text-xs text-gray-500">
                        Sistema de Gestión
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setMenuOpen(false)}
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0"
                    style={{ color: moduleColor }}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Menu Items */}
              <nav className="flex-1 overflow-y-auto p-3">
                <div className="space-y-1">
                  {MENU_ITEMS.map((item) => {
                    const isActive = activeSection === item.id;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSectionChange(item.id)}
                        className="w-full rounded-xl p-3 transition-all relative"
                        style={{
                          background: isActive ? `${moduleColor}15` : 'transparent',
                          color: isActive ? moduleColor : '#6B7280'
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            {item.icon}
                          </div>
                          <span className="font-bold text-sm flex-1 text-left">
                            {item.label}
                          </span>
                          {item.badge && (
                            <Badge 
                              className="text-xs font-bold"
                              style={{ 
                                background: moduleColor,
                                color: '#FFFFFF'
                              }}
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </div>

                        {/* Indicador activo */}
                        {isActive && (
                          <div
                            className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full"
                            style={{ background: moduleColor }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </nav>

              {/* Footer del Drawer */}
              <div className="p-4 border-t-2 border-gray-200">
                <p className="text-xs text-center text-gray-500">
                  ESAP - Backoffice
                </p>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex flex-col h-screen">
          {/* Breadcrumb con Hamburguesa */}
          <div className="p-3 border-b-2 border-gray-200 bg-white">
            <div className="flex items-center gap-3">
              {/* Botón Hamburguesa */}
              <Button
                onClick={() => setMenuOpen(true)}
                variant="ghost"
                size="sm"
                className="flex-shrink-0 -ml-2"
                style={{ color: moduleColor }}
              >
                <Menu className="w-6 h-6" />
              </Button>
              
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-xs overflow-x-auto flex-1">
                <span className="text-gray-500">Backoffice</span>
                <span className="text-gray-300">/</span>
                <span className="text-gray-500">Control Interno Disciplinario</span>
                <span className="text-gray-300">/</span>
                <span className="font-bold" style={{ color: moduleColor }}>
                  {getActiveLabel()}
                </span>
              </div>
            </div>
          </div>

          {/* Área de Contenido */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="p-6">
                  <div className="text-center">
                    <div className="p-4 rounded-full inline-block mb-4" style={{ background: `${moduleColor}15` }}>
                      {MENU_ITEMS.find(m => m.id === activeSection)?.icon}
                    </div>
                    <h2 className="text-xl font-bold mb-2" style={{ color: moduleColor }}>
                      {getActiveLabel()}
                    </h2>
                    <p className="text-sm text-gray-600 mb-4">
                      Sección activa del módulo de Control Interno Disciplinario
                    </p>
                    
                    {/* Instrucciones */}
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-left">
                      <p className="text-sm font-bold text-blue-900 mb-2">
                        💡 ¿Cómo navegar?
                      </p>
                      <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                        <li>Toca el botón <span className="font-bold">☰</span> en la parte superior izquierda</li>
                        <li>Se abrirá el menú lateral desde la izquierda</li>
                        <li>Selecciona cualquier sección del menú</li>
                        <li>El menú se cerrará automáticamente</li>
                        <li>Verás el contenido de la nueva sección</li>
                      </ol>
                    </div>

                    {/* Estadísticas de Demo */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="bg-gray-100 rounded-lg p-3">
                        <p className="text-2xl font-bold text-gray-900">
                          {MENU_ITEMS.find(m => m.id === activeSection)?.badge || 0}
                        </p>
                        <p className="text-xs text-gray-600">Items pendientes</p>
                      </div>
                      <div className="bg-gray-100 rounded-lg p-3">
                        <p className="text-2xl font-bold text-gray-900">7</p>
                        <p className="text-xs text-gray-600">Secciones totales</p>
                      </div>
                    </div>

                    {/* Botón de Prueba */}
                    <Button
                      onClick={() => setMenuOpen(true)}
                      className="w-full mt-4 font-bold"
                      style={{ background: moduleColor, color: '#FFFFFF' }}
                    >
                      <Menu className="w-4 h-4 mr-2" />
                      Abrir Menú de Navegación
                    </Button>
                  </div>
                </Card>

                {/* Tarjetas de ejemplo */}
                <div className="grid gap-3 mt-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-100">
                        <FileText className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Noticia ND-2025-0260</p>
                        <p className="text-xs text-gray-600">Presunto acoso laboral</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg" style={{ background: `${moduleColor}15` }}>
                        <LayoutDashboard className="w-5 h-5" style={{ color: moduleColor }} />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Proceso PD-2025-0032</p>
                        <p className="text-xs text-gray-600">Etapa: Indagación</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* INSTRUCCIONES EXTERNAS */}
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg">
        <h3 className="text-lg font-bold mb-4 text-gray-900">
          📱 Demo de Navegación Mobile
        </h3>
        <div className="space-y-3 text-sm text-gray-700">
          <p>
            <span className="font-bold">✅ Problema resuelto:</span> El módulo de Control Interno Disciplinario ahora es completamente navegable en dispositivos móviles.
          </p>
          <p>
            <span className="font-bold">🎯 Funcionalidad:</span> Toca el botón ☰ para abrir el menú lateral y navegar entre las 7 secciones disponibles.
          </p>
          <p>
            <span className="font-bold">🎨 Diseño:</span> Drawer animado desde la izquierda con overlay oscuro de fondo.
          </p>
          <p>
            <span className="font-bold">⚡ Auto-cierre:</span> El menú se cierra automáticamente al seleccionar una opción.
          </p>
        </div>
      </div>
    </div>
  );
}
