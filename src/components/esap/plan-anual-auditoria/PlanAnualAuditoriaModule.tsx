/**
 * ============================================
 * MÓDULO PAI - PLAN ANUAL DE AUDITORÍA INTERNA
 * ============================================
 * 
 * Módulo completamente independiente para gestión
 * del Plan Anual de Auditoría Interna (PAI)
 * 
 * CARACTERÍSTICAS:
 * - Cumplimiento 100% Decreto 648/2017
 * - Formato oficial EMFO001 PAI 2025 V.6
 * - 5 roles y 22 actividades oficiales
 * - Metodología DAFP para evaluación de riesgos
 * - 28 informes de ley integrados
 * - Exportación a Excel/PDF oficial
 * 
 * NO DUPLICA CÓDIGO:
 * - Reutiliza componentes de control-interno
 * - Usa design system existente
 * - Integra con sistema de notificaciones
 * 
 * ÚLTIMA ACTUALIZACIÓN: 31 Enero 2026
 */

'use client';

import React, { useState, useEffect } from 'react';
import { FileText, ArrowLeft, Settings } from 'lucide-react';

// ✅ Dashboard principal del PAI
import { DashboardPAI } from './components/DashboardPAI';

// ✅ Calendario de Informes de Ley
import { CalendarioInformesLey } from './components/CalendarioInformesLey';

// ✅ Wizard de creación
import { WizardCrearPAI } from './wizard/WizardCrearPAI';

// ✅ Types oficiales
import type { PlanAnualAuditoria, FormatoExportacion } from './types';

interface PlanAnualAuditoriaModuleProps {
  // Navegación
  onVolver?: () => void;
  
  // Callbacks
  onPlanCreado?: (plan: PlanAnualAuditoria) => void;
  onPlanActualizado?: (plan: PlanAnualAuditoria) => void;
  onPlanExportado?: (planId: string, formato: FormatoExportacion) => void;
  
  // Usuario actual
  usuarioActual?: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
    permisos: string[];
  };
}

/**
 * ============================================
 * MÓDULO PRINCIPAL PAI
 * ============================================
 */
export function PlanAnualAuditoriaModule({
  onVolver,
  onPlanCreado,
  onPlanActualizado,
  onPlanExportado,
  usuarioActual
}: PlanAnualAuditoriaModuleProps) {
  
  // ============================================
  // ESTADO
  // ============================================
  const [vistaActual, setVistaActual] = useState<
    'dashboard' | 'crear-plan' | 'ver-plan' | 'editar-plan' | 'wizard' | 'configuracion' | 'informes-ley'
  >('dashboard');
  
  const [planSeleccionado, setPlanSeleccionado] = useState<PlanAnualAuditoria | null>(null);
  const [planVigente, setPlanVigente] = useState<PlanAnualAuditoria | null>(null);
  const [cargando, setCargando] = useState(true);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    cargarPlanVigente();
  }, []);

  // ============================================
  // FUNCIONES
  // ============================================
  
  /**
   * Cargar plan vigente desde el servicio
   */
  const cargarPlanVigente = async () => {
    try {
      setCargando(true);
      // TODO: Implementar servicio real
      // const plan = await planAnualService.obtenerPlanVigente();
      // setPlanVigente(plan);
      
      // Por ahora, simulamos delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCargando(false);
    } catch (error) {
      console.error('Error al cargar plan vigente:', error);
      setCargando(false);
    }
  };

  /**
   * Crear nuevo plan
   */
  const handleCrearNuevoPlan = () => {
    setVistaActual('wizard');
  };

  /**
   * Ver detalle de plan
   */
  const handleVerPlan = (planId: string) => {
    // TODO: Cargar plan específico
    setVistaActual('ver-plan');
  };

  /**
   * Editar plan
   */
  const handleEditarPlan = (planId: string) => {
    // TODO: Cargar plan para edición
    setVistaActual('editar-plan');
  };

  /**
   * Exportar plan
   */
  const handleExportarPlan = async (
    planId: string, 
    formato: FormatoExportacion
  ) => {
    try {
      console.log(`Exportando plan ${planId} en formato ${formato}`);
      
      // Validar antes de exportar
      if (!planVigente) {
        alert('No hay plan vigente para exportar');
        return;
      }
      
      const { validarPlanParaExportacion, exportarPlanAnual } = await import('./services/exportacionPAI');
      
      // Validar plan
      const validacion = validarPlanParaExportacion(planVigente);
      if (!validacion.valido) {
        alert(`No se puede exportar:\n${validacion.errores.join('\n')}`);
        return;
      }
      
      // Mostrar advertencias si existen
      if (validacion.advertencias.length > 0) {
        const continuar = confirm(
          `Advertencias:\n${validacion.advertencias.join('\n')}\n\n¿Desea continuar con la exportación?`
        );
        if (!continuar) return;
      }
      
      // Exportar
      const resultado = await exportarPlanAnual(planVigente, formato);
      
      if (resultado.exito) {
        alert(`✅ Plan exportado exitosamente\n\nFormato: ${formato}\nArchivo: ${resultado.nombreArchivo}\nTamaño: ${resultado.tamanoKB} KB`);
        onPlanExportado?.(planId, formato);
      } else {
        alert(`❌ Error al exportar: ${resultado.error}`);
      }
      
    } catch (error) {
      console.error('Error al exportar plan:', error);
      alert('Error al exportar el plan');
    }
  };

  /**
   * Ver seguimiento
   */
  const handleVerSeguimiento = () => {
    // TODO: Abrir vista de seguimiento
    alert('Vista de seguimiento (por implementar)');
  };

  /**
   * Guardar plan (desde wizard)
   */
  const handleGuardarPlan = (plan: PlanAnualAuditoria) => {
    // TODO: Guardar en servicio
    setPlanVigente(plan);
    setVistaActual('dashboard');
    onPlanCreado?.(plan);
    
    // Notificar éxito
    alert('Plan Anual de Auditoría creado exitosamente');
  };

  /**
   * Actualizar plan (desde edición)
   */
  const handleActualizarPlan = (plan: PlanAnualAuditoria) => {
    // TODO: Actualizar en servicio
    setPlanVigente(plan);
    setVistaActual('dashboard');
    onPlanActualizado?.(plan);
    
    // Notificar éxito
    alert('Plan Anual de Auditoría actualizado exitosamente');
  };

  // ============================================
  // RENDER
  // ============================================
  
  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#E0EDFF] to-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#003DA5] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-[#003DA5] font-semibold">Cargando Plan Anual de Auditoría...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#E0EDFF] via-white to-[#E0EDFF]">
      
      {/* ============================================
          VISTA: DASHBOARD (Principal)
          ============================================ */}
      {vistaActual === 'dashboard' && (
        <>
          {/* Botón volver si está disponible */}
          {onVolver && (
            <div className="px-8 pt-6">
              <button
                onClick={onVolver}
                className="flex items-center space-x-2 text-[#003DA5] hover:text-[#2962FF] font-semibold transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Volver a Control Interno</span>
              </button>
            </div>
          )}
          
          <DashboardPAI
            planVigente={planVigente}
            onCrearNuevoPlan={handleCrearNuevoPlan}
            onVerPlan={handleVerPlan}
            onEditarPlan={handleEditarPlan}
            onExportarPlan={handleExportarPlan}
            onVerSeguimiento={handleVerSeguimiento}
            onVerInformesLey={() => setVistaActual('informes-ley')}
          />
        </>
      )}

      {/* ============================================
          VISTA: WIZARD DE CREACIÓN
          ============================================ */}
      {vistaActual === 'wizard' && (
        <WizardCrearPAI
          onCancelar={() => setVistaActual('dashboard')}
          onGuardar={handleGuardarPlan}
          onGuardarBorrador={(datos) => {
            console.log('Borrador guardado:', datos);
          }}
        />
      )}

      {/* ============================================
          VISTA: VER PLAN
          ============================================ */}
      {vistaActual === 'ver-plan' && (
        <div className="p-8">
          <div className="max-w-6xl mx-auto">
            <button
              onClick={() => setVistaActual('dashboard')}
              className="flex items-center space-x-2 text-[#003DA5] hover:text-[#2962FF] font-semibold transition-colors mb-6"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Volver al Dashboard</span>
            </button>
            
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-3xl font-bold text-[#003DA5] mb-6">
                📄 Detalle del Plan Anual
              </h2>
              <p className="text-gray-600">
                Vista detallada del PAI (por implementar)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
          VISTA: EDITAR PLAN
          ============================================ */}
      {vistaActual === 'editar-plan' && (
        <div className="p-8">
          <div className="max-w-6xl mx-auto">
            <button
              onClick={() => setVistaActual('dashboard')}
              className="flex items-center space-x-2 text-[#003DA5] hover:text-[#2962FF] font-semibold transition-colors mb-6"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Volver al Dashboard</span>
            </button>
            
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-3xl font-bold text-[#003DA5] mb-6">
                ✏️ Editar Plan Anual
              </h2>
              <p className="text-gray-600">
                Formulario de edición del PAI (por implementar)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
          VISTA: CONFIGURACIÓN
          ============================================ */}
      {vistaActual === 'configuracion' && (
        <div className="p-8">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => setVistaActual('dashboard')}
              className="flex items-center space-x-2 text-[#003DA5] hover:text-[#2962FF] font-semibold transition-colors mb-6"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Volver al Dashboard</span>
            </button>
            
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-3xl font-bold text-[#003DA5] mb-6 flex items-center">
                <Settings className="w-8 h-8 mr-3" />
                ⚙️ Configuración del Módulo PAI
              </h2>
              <p className="text-gray-600">
                Configuraciones del módulo (por implementar)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
          VISTA: INFORMES DE LEY
          ============================================ */}
      {vistaActual === 'informes-ley' && (
        <CalendarioInformesLey onVolverADashboard={() => setVistaActual('dashboard')} />
      )}

    </div>
  );
}

// ============================================
// EXPORT DEFAULT
// ============================================
export default PlanAnualAuditoriaModule;