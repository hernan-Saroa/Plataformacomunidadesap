/**
 * MÓDULOS DE SOPORTE - Módulo Contenedor
 * Agrupa: Informes de Ley (RF012) + Gestión Documental (RF013) + Notificaciones (RF014)
 */

import { useState } from "react";
import { FileText, FolderOpen, Bell, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { motion } from "motion/react";

// Componentes existentes
import { InformesLeyModule } from "./InformesLeyModule";
import { GestionDocumentalModule } from "./GestionDocumentalModule";
import { NotificacionesModule } from "./NotificacionesModule";

export function SoporteModule() {
  const [tabActiva, setTabActiva] = useState("informes");

  // Información contextual por tab
  const infoTabs = {
    "informes": "Genera y gestiona informes de ley (Informe Ejecutivo Anual, Pormenorizado, etc.)",
    "documental": "Administra todos los documentos del sistema de control interno",
    "notificaciones": "Gestiona alertas, recordatorios y notificaciones automáticas",
  };

  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumb + Indicador de Flujo */}
      <div className="bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white px-4 md:px-6 py-3 md:py-4">
        <div className="flex flex-col gap-2">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="opacity-70">Control Interno Gestión</span>
            <span className="opacity-50">›</span>
            <span className="font-semibold">Módulos de Soporte</span>
          </div>

          {/* Indicador de Flujo del Proceso */}
          <div className="hidden md:flex items-center gap-2 text-xs">
            <div className="opacity-60">1. Planificación</div>
            <span className="opacity-50">→</span>
            <div className="opacity-60">2. Proceso Auditoría</div>
            <span className="opacity-50">→</span>
            <div className="opacity-60">3. Mejoramiento</div>
            <span className="opacity-50">→</span>
            <div className="flex items-center gap-1 px-3 py-1.5 bg-white/20 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="font-medium">4. SOPORTE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Información Contextual */}
      <motion.div
        key={tabActiva}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-purple-50 border-l-4 border-[#8B5CF6] px-4 md:px-6 py-3 flex items-start gap-3"
      >
        <Info className="w-5 h-5 text-[#8B5CF6] flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700">{infoTabs[tabActiva as keyof typeof infoTabs]}</p>
        </div>
      </motion.div>

      {/* Tabs del Módulo */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={tabActiva} onValueChange={setTabActiva} className="h-full flex flex-col">
          {/* Tabs Header */}
          <div className="border-b bg-white px-4 md:px-6 pt-4">
            <TabsList className="w-full md:w-auto grid grid-cols-3 md:flex gap-1">
              <TabsTrigger value="informes" className="flex items-center gap-2 text-xs md:text-sm px-3 md:px-4">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Informes de Ley</span>
                <span className="sm:hidden">Inform</span>
              </TabsTrigger>
              
              <TabsTrigger value="documental" className="flex items-center gap-2 text-xs md:text-sm px-3 md:px-4">
                <FolderOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Documental</span>
                <span className="sm:hidden">Docs</span>
              </TabsTrigger>
              
              <TabsTrigger value="notificaciones" className="flex items-center gap-2 text-xs md:text-sm px-3 md:px-4">
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Notificaciones</span>
                <span className="sm:hidden">Notif</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tabs Content */}
          <div className="flex-1 overflow-auto">
            <TabsContent value="informes" className="h-full m-0 p-0">
              <InformesLeyModule />
            </TabsContent>

            <TabsContent value="documental" className="h-full m-0 p-0">
              <GestionDocumentalModule />
            </TabsContent>

            <TabsContent value="notificaciones" className="h-full m-0 p-0">
              <NotificacionesModule />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
