/**
 * PLANIFICACIÓN - Módulo Contenedor
 * Agrupa: Plan Anual (RF001) + Universo (RF002) + Programa (RF003) + Inicio (RF004)
 */

import { useState } from "react";
import { Calendar, Layers, ClipboardList, PlayCircle, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { motion } from "motion/react";

// Componentes existentes
import { PlanAnualModule } from "./PlanAnualModule";
import { UniversoAuditorias } from "./UniversoAuditorias";
import { ProgramaAnualCIG } from "./ProgramaAnualCIG";
import { InicioAuditoriaWizard } from "./InicioAuditoriaWizard";

export function PlanificacionModule() {
  const [tabActiva, setTabActiva] = useState("plan-anual");
  const [mostrarWizard, setMostrarWizard] = useState(false);

  // Información contextual por tab
  const infoTabs = {
    "plan-anual": "Define QUÉ procesos auditar durante el año",
    "universo": "Identifica TODOS los procesos auditables de la entidad",
    "programa": "Programa CUÁNDO se ejecutará cada auditoría",
    "inicio": "Formaliza el INICIO de una nueva auditoría",
  };

  const proximoPasoTabs = {
    "plan-anual": { label: "Ir a Universo →", tab: "universo" },
    "universo": { label: "Ir a Programa →", tab: "programa" },
    "programa": { label: "Iniciar Auditoría →", tab: "inicio" },
    "inicio": { label: "Volver a Plan Anual", tab: "plan-anual" },
  };

  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumb + Indicador de Flujo */}
      <div className="bg-gradient-to-r from-[#003DA5] to-[#0052CC] text-white px-4 md:px-6 py-3 md:py-4">
        <div className="flex flex-col gap-2">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="opacity-70">Control Interno Gestión</span>
            <span className="opacity-50">›</span>
            <span className="font-semibold">Planificación</span>
          </div>

          {/* Indicador de Flujo del Proceso */}
          <div className="hidden md:flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1 px-3 py-1.5 bg-white/20 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="font-medium">1. PLANIFICACIÓN</span>
            </div>
            <span className="opacity-50">→</span>
            <div className="opacity-60">2. Proceso Auditoría</div>
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
        className="bg-blue-50 border-l-4 border-[#003DA5] px-4 md:px-6 py-3 flex items-start gap-3"
      >
        <Info className="w-5 h-5 text-[#003DA5] flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700">{infoTabs[tabActiva as keyof typeof infoTabs]}</p>
        </div>
      </motion.div>

      {/* Tabs del Módulo */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={tabActiva} onValueChange={setTabActiva} className="h-full flex flex-col">
          {/* Tabs Header */}
          <div className="border-b bg-white px-4 md:px-6 pt-4">
            <TabsList className="w-full md:w-auto grid grid-cols-4 md:flex gap-1">
              <TabsTrigger value="plan-anual" className="flex items-center gap-2 text-xs md:text-sm px-3 md:px-4">
                <ClipboardList className="w-4 h-4" />
                <span className="hidden sm:inline">Plan Anual</span>
                <span className="sm:hidden">Plan</span>
              </TabsTrigger>
              
              <TabsTrigger value="universo" className="flex items-center gap-2 text-xs md:text-sm px-3 md:px-4">
                <Layers className="w-4 h-4" />
                <span className="hidden sm:inline">Universo</span>
                <span className="sm:hidden">Univ</span>
              </TabsTrigger>
              
              <TabsTrigger value="programa" className="flex items-center gap-2 text-xs md:text-sm px-3 md:px-4">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Programa</span>
                <span className="sm:hidden">Prog</span>
              </TabsTrigger>
              
              <TabsTrigger value="inicio" className="flex items-center gap-2 text-xs md:text-sm px-3 md:px-4">
                <PlayCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Inicio</span>
                <span className="sm:hidden">Ini</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tabs Content */}
          <div className="flex-1 overflow-auto">
            <TabsContent value="plan-anual" className="h-full m-0 p-0">
              <div className="h-full flex flex-col">
                <PlanAnualModule />
                
                {/* Botón Siguiente Paso */}
                <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-6 pb-4 px-6">
                  <motion.button
                    onClick={() => setTabActiva(proximoPasoTabs["plan-anual"].tab)}
                    className="w-full md:w-auto px-6 py-3 bg-[#003DA5] hover:bg-[#002c7a] text-white rounded-lg font-medium shadow-lg flex items-center justify-center gap-2 transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span>{proximoPasoTabs["plan-anual"].label}</span>
                  </motion.button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="universo" className="h-full m-0 p-0">
              <div className="h-full flex flex-col">
                <UniversoAuditorias />
                
                <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-6 pb-4 px-6">
                  <motion.button
                    onClick={() => setTabActiva(proximoPasoTabs["universo"].tab)}
                    className="w-full md:w-auto px-6 py-3 bg-[#003DA5] hover:bg-[#002c7a] text-white rounded-lg font-medium shadow-lg flex items-center justify-center gap-2 transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span>{proximoPasoTabs["universo"].label}</span>
                  </motion.button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="programa" className="h-full m-0 p-0">
              <div className="h-full flex flex-col">
                <ProgramaAnualCIG />
                
                <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-6 pb-4 px-6">
                  <motion.button
                    onClick={() => setTabActiva(proximoPasoTabs["programa"].tab)}
                    className="w-full md:w-auto px-6 py-3 bg-[#003DA5] hover:bg-[#002c7a] text-white rounded-lg font-medium shadow-lg flex items-center justify-center gap-2 transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span>{proximoPasoTabs["programa"].label}</span>
                  </motion.button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="inicio" className="h-full m-0 p-0">
              {mostrarWizard ? (
                <InicioAuditoriaWizard
                  onClose={() => setMostrarWizard(false)}
                  onComplete={(auditoriaId) => {
                    console.log('Auditoría iniciada:', auditoriaId);
                    setMostrarWizard(false);
                    setTabActiva("plan-anual");
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center p-6">
                  <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8 text-center">
                    <div className="w-16 h-16 bg-[#003DA5] rounded-full flex items-center justify-center mx-auto mb-4">
                      <PlayCircle className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">
                      Iniciar Nueva Auditoría
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Formaliza el inicio de una nueva auditoría definiendo alcance, equipo auditor y cronograma inicial.
                    </p>
                    <motion.button
                      onClick={() => setMostrarWizard(true)}
                      className="px-8 py-3 bg-[#003DA5] hover:bg-[#002c7a] text-white rounded-lg font-medium shadow-lg transition-all"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="flex items-center gap-2">
                        <PlayCircle className="w-5 h-5" />
                        Iniciar Wizard
                      </span>
                    </motion.button>
                  </div>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
