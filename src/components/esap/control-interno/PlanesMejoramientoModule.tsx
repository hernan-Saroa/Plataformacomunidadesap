/**
 * PLANES DE MEJORAMIENTO - Módulo Contenedor
 * Agrupa: Formulación (RF010) + Seguimiento (RF011)
 */

import { useState } from "react";
import { AlertTriangle, TrendingUp, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { motion } from "motion/react";

// Componentes existentes
import { FormulacionPlanMejoramientoModule } from "./FormulacionPlanMejoramientoModule";
import { SeguimientoPlanMejoramientoModule } from "./SeguimientoPlanMejoramientoModule";

export function PlanesMejoramientoModule() {
  const [tabActiva, setTabActiva] = useState("formulacion");

  // Información contextual por tab
  const infoTabs = {
    "formulacion": "Formula planes de mejoramiento basados en hallazgos de auditoría",
    "seguimiento": "Hace seguimiento al cumplimiento de los planes de mejoramiento",
  };

  const proximoPasoTabs = {
    "formulacion": { label: "Ir a Seguimiento →", tab: "seguimiento" },
    "seguimiento": { label: "Volver a Formulación", tab: "formulacion" },
  };

  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumb + Indicador de Flujo */}
      <div className="bg-gradient-to-r from-[#EF4444] to-[#DC2626] text-white px-4 md:px-6 py-3 md:py-4">
        <div className="flex flex-col gap-2">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="opacity-70">Control Interno Gestión</span>
            <span className="opacity-50">›</span>
            <span className="font-semibold">Planes de Mejoramiento</span>
          </div>

          {/* Indicador de Flujo del Proceso */}
          <div className="hidden md:flex items-center gap-2 text-xs">
            <div className="opacity-60">1. Planificación</div>
            <span className="opacity-50">→</span>
            <div className="opacity-60">2. Proceso Auditoría</div>
            <span className="opacity-50">→</span>
            <div className="flex items-center gap-1 px-3 py-1.5 bg-white/20 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="font-medium">3. MEJORAMIENTO</span>
            </div>
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
        className="bg-red-50 border-l-4 border-[#EF4444] px-4 md:px-6 py-3 flex items-start gap-3"
      >
        <Info className="w-5 h-5 text-[#EF4444] flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700">{infoTabs[tabActiva as keyof typeof infoTabs]}</p>
        </div>
      </motion.div>

      {/* Tabs del Módulo */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={tabActiva} onValueChange={setTabActiva} className="h-full flex flex-col">
          {/* Tabs Header */}
          <div className="border-b bg-white px-4 md:px-6 pt-4">
            <TabsList className="w-full md:w-auto grid grid-cols-2 md:flex gap-1">
              <TabsTrigger value="formulacion" className="flex items-center gap-2 text-xs md:text-sm px-3 md:px-4">
                <AlertTriangle className="w-4 h-4" />
                <span className="hidden sm:inline">Formulación</span>
                <span className="sm:hidden">Form</span>
              </TabsTrigger>
              
              <TabsTrigger value="seguimiento" className="flex items-center gap-2 text-xs md:text-sm px-3 md:px-4">
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Seguimiento</span>
                <span className="sm:hidden">Segui</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tabs Content */}
          <div className="flex-1 overflow-auto">
            <TabsContent value="formulacion" className="h-full m-0 p-0">
              <div className="h-full flex flex-col">
                <FormulacionPlanMejoramientoModule />
                
                {/* Botón Siguiente Paso */}
                <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-6 pb-4 px-6">
                  <motion.button
                    onClick={() => setTabActiva(proximoPasoTabs["formulacion"].tab)}
                    className="w-full md:w-auto px-6 py-3 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-lg font-medium shadow-lg flex items-center justify-center gap-2 transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span>{proximoPasoTabs["formulacion"].label}</span>
                  </motion.button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="seguimiento" className="h-full m-0 p-0">
              <SeguimientoPlanMejoramientoModule />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
