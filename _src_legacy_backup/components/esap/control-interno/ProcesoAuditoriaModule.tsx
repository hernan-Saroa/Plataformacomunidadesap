/**
 * PROCESO DE AUDITORÍA - Módulo Contenedor
 * Agrupa: Planeación (RF005) + Ejecución (RF006-008) + Comunicación (RF009)
 */

import { useState } from "react";
import { FileSearch, Target, MessageSquare, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { motion } from "motion/react";

// Componentes existentes
import { PlaneacionAuditoriaModule } from "./PlaneacionAuditoriaModule";
import { EjecucionAuditoriaModule } from "./EjecucionAuditoriaModule";
import { ComunicacionAuditoriaModule } from "./ComunicacionAuditoriaModule";
import { HeaderModuloCIG } from "./HeaderModuloCIG";

export function ProcesoAuditoriaModule() {
  const [tabActiva, setTabActiva] = useState("planeacion");

  // Información contextual por tab
  const infoTabs = {
    "planeacion": "Planea CÓMO ejecutar la auditoría: alcance, metodología y recursos",
    "ejecucion": "Ejecuta la auditoría: recolecta evidencias y registra hallazgos",
    "comunicacion": "Comunica resultados a las áreas auditadas",
  };

  const proximoPasoTabs = {
    "planeacion": { label: "Ir a Ejecución →", tab: "ejecucion" },
    "ejecucion": { label: "Ir a Comunicación →", tab: "comunicacion" },
    "comunicacion": { label: "Volver a Planeación", tab: "planeacion" },
  };

  return (
    <div className="h-full flex flex-col">
      {/* Encabezado con Título en Naranja */}
      <div className="bg-white px-4 md:px-6 pt-6 pb-4">
        <HeaderModuloCIG
          titulo="Proceso de Auditoría"
          subtitulo="Planeación, ejecución y comunicación de auditorías"
        />
      </div>

      {/* Breadcrumb + Indicador de Flujo */}
      <div className="bg-gradient-to-r from-[#F59E0B] to-[#EA580C] text-white px-4 md:px-6 py-3 md:py-4">
        <div className="flex flex-col gap-2">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="opacity-70">Control Interno Gestión</span>
            <span className="opacity-50">›</span>
            <span className="font-semibold">Proceso de Auditoría</span>
          </div>

          {/* Indicador de Flujo del Proceso */}
          <div className="hidden md:flex items-center gap-2 text-xs">
            <div className="opacity-60">1. Planificación</div>
            <span className="opacity-50">→</span>
            <div className="flex items-center gap-1 px-3 py-1.5 bg-white/20 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="font-medium">2. PROCESO AUDITORÍA</span>
            </div>
            <span className="opacity-50">→</span>
            <div className="opacity-60">3. Mejoramiento</div>
            <span className="opacity-50">→</span>
            <div className="opacity-60">4. Soporte</div>
          </div>
        </div>
      </div>

      {/* Información Contextual */}
      <motion.div
        key={tabActiva}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-orange-50 border-l-4 border-[#F59E0B] px-4 md:px-6 py-3 flex items-start gap-3"
      >
        <Info className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
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
              <TabsTrigger value="planeacion" className="flex items-center gap-2 text-xs md:text-sm px-3 md:px-4">
                <FileSearch className="w-4 h-4" />
                <span className="hidden sm:inline">Planeación</span>
                <span className="sm:hidden">Plan</span>
              </TabsTrigger>
              
              <TabsTrigger value="ejecucion" className="flex items-center gap-2 text-xs md:text-sm px-3 md:px-4">
                <Target className="w-4 h-4" />
                <span className="hidden sm:inline">Ejecución</span>
                <span className="sm:hidden">Ejec</span>
              </TabsTrigger>
              
              <TabsTrigger value="comunicacion" className="flex items-center gap-2 text-xs md:text-sm px-3 md:px-4">
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Comunicación</span>
                <span className="sm:hidden">Comu</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tabs Content */}
          <div className="flex-1 overflow-auto">
            <TabsContent value="planeacion" className="h-full m-0 p-0">
              <div className="h-full flex flex-col">
                <PlaneacionAuditoriaModule />
                
                {/* Botón Siguiente Paso */}
                <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-6 pb-4 px-6">
                  <motion.button
                    onClick={() => setTabActiva(proximoPasoTabs["planeacion"].tab)}
                    className="w-full md:w-auto px-6 py-3 bg-[#F59E0B] hover:bg-[#EA580C] text-white rounded-lg font-medium shadow-lg flex items-center justify-center gap-2 transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span>{proximoPasoTabs["planeacion"].label}</span>
                  </motion.button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ejecucion" className="h-full m-0 p-0">
              <div className="h-full flex flex-col">
                <EjecucionAuditoriaModule />
                
                <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-6 pb-4 px-6">
                  <motion.button
                    onClick={() => setTabActiva(proximoPasoTabs["ejecucion"].tab)}
                    className="w-full md:w-auto px-6 py-3 bg-[#F59E0B] hover:bg-[#EA580C] text-white rounded-lg font-medium shadow-lg flex items-center justify-center gap-2 transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span>{proximoPasoTabs["ejecucion"].label}</span>
                  </motion.button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="comunicacion" className="h-full m-0 p-0">
              <ComunicacionAuditoriaModule />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}