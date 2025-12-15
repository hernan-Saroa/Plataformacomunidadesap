/**
 * PLAN INDIVIDUAL DE AUDITORÍA - VERSIÓN INTEGRADA
 * Integración Fase 2: Pre-carga datos desde contexto global y guarda documentos centralizados
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, FileSearch, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner@2.0.3';
import { useControlInterno, PlanIndividual } from './ControlInternoContext';
import { PlanIndividualAuditoria as PlanOriginal } from './PlanIndividualAuditoria';
import { ModalPlanIndividualWizard } from './ModalPlanIndividualWizard';
import { AccionesRapidaFlujo } from './AccionesRapidaFlujo';

// ============ INTEGRACIÓN FASE 2 ============
import { useIntegracionControlInterno } from '../../../hooks/useIntegracionControlInterno';

export function PlanIndividualIntegrado({ onNavegar }: { onNavegar: (seccion: string) => void }) {
  const context = useControlInterno();
  const [mostrarWizard, setMostrarWizard] = useState(false);
  const [mostrarAcciones, setMostrarAcciones] = useState(true);
  
  // ✅ INTEGRACIÓN: Hook unificado
  const { auditoria, guardarDocumento, actualizarAuditoria } = useIntegracionControlInterno();

  // Verificar si viene desde Programa Anual con una auditoría seleccionada
  useEffect(() => {
    if (context.auditoriaProgramadaSeleccionada && context.flujoNavegacion?.accion === 'crear-plan') {
      // Abrir wizard automáticamente
      setMostrarWizard(true);
      
      // Limpiar la acción del flujo
      setTimeout(() => {
        context.setFlujoNavegacion(null);
      }, 100);
    }
  }, [context.auditoriaProgramadaSeleccionada, context.flujoNavegacion]);

  const handleCrearPlan = async (plan: any) => {
    try {
      // Convertir al formato del contexto
      const nuevoPlan: PlanIndividual = {
        id: plan.id,
        codigo: plan.codigo,
        auditoriaOrigenId: plan.auditoriaOrigenId,
        procesoAuditable: plan.procesoAuditable,
        alcance: plan.alcance,
        objetivos: plan.objetivos,
        riesgos: plan.riesgos,
        criteriosAuditoria: plan.criteriosAuditoria,
        estado: plan.estado,
        fechaCreacion: plan.fechaCreacion,
        creadoPor: plan.creadoPor
      };

      // Agregar al contexto local
      context.setPlanesIndividuales([...context.planesIndividuales, nuevoPlan]);

      // ✅ INTEGRACIÓN: Actualizar en contexto global
      if (auditoria && auditoria.id === plan.auditoriaOrigenId) {
        await actualizarAuditoria(auditoria.id, {
          objetivos: plan.objetivos.map((obj: any) => ({
            id: obj.id,
            descripcion: obj.descripcion,
            tipo: obj.tipo || 'Específico',
            alcance: obj.alcance
          })),
          alcance: plan.alcance,
          criterios: plan.criteriosAuditoria.map((crit: any) => ({
            id: crit.id,
            norma: crit.norma,
            descripcion: crit.descripcion,
            referencia: crit.referencia
          })),
          riesgosIdentificados: plan.riesgos,
          estado: 'Planeación', // Avanza de Programada a Planeación
          planIndividualId: plan.id
        });
      }

      // ✅ INTEGRACIÓN: Guardar documento del plan (si se generó PDF)
      if (plan.documentoPDF) {
        await guardarDocumento({
          nombre: `Plan Individual ${plan.codigo}`,
          tipo: "Plan Individual",
          archivo: plan.documentoPDF,
          origenModulo: "Plan Individual de Auditoría",
          origenId: plan.id,
          auditoriaId: plan.auditoriaOrigenId,
          codigoAuditoria: plan.codigo.split('-PI')[0], // AUD-2025-001
          descripcion: `Plan Individual de Auditoría para ${plan.procesoAuditable}`,
          tags: ['plan-individual', 'auditoria', plan.codigo]
        });
      }

      // Actualizar estado de la auditoría en el Programa Anual
      const auditoriaActualizada = context.auditoriasProgramadas.map(a =>
        a.id === plan.auditoriaOrigenId
          ? { ...a, estado: 'En Ejecución' as const }
          : a
      );
      context.setAuditoriasProgramadas(auditoriaActualizada);

      toast.success('Plan Individual creado exitosamente', {
        description: `${plan.codigo} - ${plan.procesoAuditable}`,
        duration: 4000
      });

      setMostrarWizard(false);
      context.setAuditoriaProgramadaSeleccionada(null);
    } catch (error) {
      console.error('Error al crear plan:', error);
      toast.error('Error al crear Plan Individual');
    }
  };

  return (
    <div className="space-y-6">
      {/* Mensaje si viene desde Programa Anual */}
      {context.flujoNavegacion?.desde === 'programa-anual' && context.auditoriaProgramadaSeleccionada && (
        <div
          className="rounded-xl p-4 flex items-start gap-3"
          style={{ backgroundColor: '#F5F3FF', border: '2px solid #8B5CF6' }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#8B5CF6', color: '#FFFFFF' }}
          >
            <FileSearch className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm mb-1" style={{ color: '#6B21A8' }}>
              Auditoría seleccionada desde Programa Anual
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-bold" style={{ color: '#6B21A8' }}>
                {context.auditoriaProgramadaSeleccionada.codigo}:
              </span>
              <span className="text-sm" style={{ color: '#6B21A8' }}>
                {context.auditoriaProgramadaSeleccionada.procesoAuditable}
              </span>
              <Badge
                style={{
                  backgroundColor: context.auditoriaProgramadaSeleccionada.nivelRiesgo === 'CRÍTICO' ? '#DC2626' :
                    context.auditoriaProgramadaSeleccionada.nivelRiesgo === 'ALTO' ? '#F59E0B' :
                    context.auditoriaProgramadaSeleccionada.nivelRiesgo === 'MEDIO' ? '#3B82F6' : '#10B981',
                  color: '#FFFFFF'
                }}
              >
                {context.auditoriaProgramadaSeleccionada.nivelRiesgo}
              </Badge>
            </div>
            <p className="text-xs" style={{ color: '#6B21A8' }}>
              Los datos base se han prellenado automáticamente en el wizard.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              context.setAuditoriaProgramadaSeleccionada(null);
              onNavegar('programa-anual');
            }}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
        </div>
      )}

      {/* Acciones Rápidas */}
      {mostrarAcciones && !context.auditoriaProgramadaSeleccionada && (
        <AccionesRapidaFlujo
          seccionActual="plan-individual"
          onNavegar={onNavegar}
          contadores={{
            auditoriasProgramadas: context.auditoriasProgramadas.length,
            planesIndividuales: context.planesIndividuales.length
          }}
        />
      )}

      {/* Resumen de integración */}
      {context.planesIndividuales.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg" style={{ backgroundColor: '#ECFDF5', border: '2px solid #10B981' }}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5" style={{ color: '#10B981' }} />
              <span className="text-sm font-bold" style={{ color: '#065F46' }}>
                Desde Programa Anual
              </span>
            </div>
            <div className="text-2xl font-bold" style={{ color: '#065F46' }}>
              {context.planesIndividuales.length}
            </div>
            <div className="text-xs" style={{ color: '#065F46' }}>
              Planes creados desde auditorías programadas
            </div>
          </div>

          <div className="p-4 rounded-lg" style={{ backgroundColor: '#DBEAFE', border: '2px solid #3B82F6' }}>
            <div className="flex items-center gap-2 mb-2">
              <FileSearch className="w-5 h-5" style={{ color: '#3B82F6' }} />
              <span className="text-sm font-bold" style={{ color: '#1E40AF' }}>
                Estado Actual
              </span>
            </div>
            <div className="text-2xl font-bold" style={{ color: '#1E40AF' }}>
              {context.planesIndividuales.filter(p => p.estado === 'Borrador').length}
            </div>
            <div className="text-xs" style={{ color: '#1E40AF' }}>
              Borradores pendientes de aprobación
            </div>
          </div>

          <div className="p-4 rounded-lg" style={{ backgroundColor: '#F5F3FF', border: '2px solid #8B5CF6' }}>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5" style={{ color: '#8B5CF6' }} />
              <span className="text-sm font-bold" style={{ color: '#6B21A8' }}>
                Pendientes
              </span>
            </div>
            <div className="text-2xl font-bold" style={{ color: '#6B21A8' }}>
              {context.auditoriasProgramadas.filter(a => a.estado === 'Programada').length}
            </div>
            <div className="text-xs" style={{ color: '#6B21A8' }}>
              Auditorías sin plan individual
            </div>
          </div>
        </div>
      )}

      {/* Componente Original */}
      <PlanOriginal />

      {/* Wizard de Creación */}
      {mostrarWizard && context.auditoriaProgramadaSeleccionada && (
        <ModalPlanIndividualWizard
          isOpen={mostrarWizard}
          onClose={() => {
            setMostrarWizard(false);
            context.setAuditoriaProgramadaSeleccionada(null);
          }}
          onCrear={handleCrearPlan}
          auditoriaBase={context.auditoriaProgramadaSeleccionada}
        />
      )}

      {/* Traza del flujo */}
      {context.planesIndividuales.length > 0 && (
        <div className="rounded-xl p-4" style={{ backgroundColor: '#F9FAFB', border: '2px solid #E5E7EB' }}>
          <h4 className="font-bold text-sm mb-3" style={{ color: '#1F2937' }}>
            🔄 Trazabilidad del Flujo
          </h4>
          <div className="space-y-2 text-xs" style={{ color: '#6B7280' }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#F97316' }} />
              <span>
                <strong>{context.universoProcesos.filter(p => p.estado === 'Programada').length}</strong> procesos del Universo fueron importados al Programa Anual
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10B981' }} />
              <span>
                <strong>{context.auditoriasProgramadas.length}</strong> auditorías programadas con equipos y fechas asignadas
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8B5CF6' }} />
              <span>
                <strong>{context.planesIndividuales.length}</strong> planes individuales creados con alcance, objetivos, riesgos y criterios definidos
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3B82F6' }} />
              <span>
                <strong>{context.planesIndividuales.reduce((acc, p) => acc + (p.criteriosAuditoria?.length || 0), 0)}</strong> criterios de auditoría con normativa definida
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}