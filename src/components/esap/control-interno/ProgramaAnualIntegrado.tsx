/**
 * PROGRAMA ANUAL DE AUDITORÍAS - VERSIÓN INTEGRADA
 * Integración Fase 2 COMPLETA: Pre-carga datos desde Universo y notifica automáticamente
 * Muestra auditorías programadas listas para crear Plan Individual
 */

import { useState } from 'react';
import { Calendar, Users, AlertCircle, FileSearch, ArrowRight, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner@2.0.3';
import { useControlInterno } from './ControlInternoContext';
import { ProgramaAnualAuditorias } from './ProgramaAnualAuditorias';
import { AccionesRapidaFlujo } from './AccionesRapidaFlujo';

// ============ INTEGRACIÓN FASE 2 COMPLETA ============
import { useIntegracionControlInterno } from '../../../hooks/useIntegracionControlInterno';

export function ProgramaAnualIntegrado({ onNavegar }: { onNavegar: (seccion: string) => void }) {
  const context = useControlInterno();
  const [mostrarAcciones, setMostrarAcciones] = useState(true);
  
  // ✅ INTEGRACIÓN COMPLETA: Hook unificado
  const { seleccionarAuditoria, programarAuditoriaConNotificacion } = useIntegracionControlInterno();

  // Auditorías que pueden generar plan individual
  const auditoriasProgramadas = context.auditoriasProgramadas.filter(a => a.estado === 'Programada');

  const handleCrearPlanIndividual = async (auditoriaId: string) => {
    const auditoria = context.auditoriasProgramadas.find(a => a.id === auditoriaId);
    
    if (!auditoria) {
      toast.error('Auditoría no encontrada');
      return;
    }

    // Validar que tenga los datos necesarios
    if (!auditoria.auditorLider) {
      toast.error('Asigna un Auditor Líder antes de crear el Plan Individual');
      return;
    }

    if (!auditoria.fechas.planeacion.inicio || !auditoria.fechas.ejecucion.inicio) {
      toast.error('Define las fechas de las etapas antes de crear el Plan Individual');
      return;
    }

    // ✅ INTEGRACIÓN: Seleccionar en contexto global
    seleccionarAuditoria(auditoriaId);
    
    // Seleccionar auditoría en el contexto local (mantener compatibilidad)
    context.setAuditoriaProgramadaSeleccionada(auditoria);
    context.setFlujoNavegacion({
      desde: 'programa-anual',
      hacia: 'plan-individual',
      datos: auditoria,
      accion: 'crear-plan'
    });

    toast.success(`Auditoría ${auditoria.codigo} seleccionada`, {
      description: 'Redirigiendo al Plan Individual...',
      duration: 2000
    });

    // Navegar a Plan Individual
    setTimeout(() => {
      onNavegar('plan-individual');
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Acciones Rápidas */}
      {mostrarAcciones && (
        <AccionesRapidaFlujo
          seccionActual="programa-anual"
          onNavegar={onNavegar}
          contadores={{
            auditoriasProgramadas: context.auditoriasProgramadas.length,
            planesIndividuales: context.planesIndividuales.length
          }}
        />
      )}

      {/* Panel de Auditorías Listas para Plan Individual */}
      {auditoriasProgramadas.length > 0 && (
        <div className="rounded-xl p-6" style={{ backgroundColor: '#F5F3FF', border: '2px solid #8B5CF6' }}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <FileSearch className="w-6 h-6" style={{ color: '#8B5CF6' }} />
                <h3 className="font-bold text-lg" style={{ color: '#6B21A8' }}>
                  Crear Planes Individuales
                </h3>
              </div>
              <p className="text-sm" style={{ color: '#6B21A8' }}>
                Auditorías programadas listas para definir su Plan Individual detallado.
              </p>
            </div>
            <div
              className="px-4 py-2 rounded-lg"
              style={{ backgroundColor: '#DDD6FE' }}
            >
              <div className="text-2xl font-bold" style={{ color: '#6B21A8' }}>
                {auditoriasProgramadas.length}
              </div>
              <div className="text-xs" style={{ color: '#6B21A8' }}>
                Disponibles
              </div>
            </div>
          </div>

          {/* Lista de auditorías */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {auditoriasProgramadas.slice(0, 4).map((auditoria) => {
              const puedeCrearPlan = auditoria.auditorLider && auditoria.fechas.planeacion.inicio;
              
              return (
                <div
                  key={auditoria.id}
                  className="p-4 rounded-xl border-2 hover:shadow-md transition-all"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: puedeCrearPlan ? '#8B5CF6' : '#E5E7EB'
                  }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm" style={{ color: '#1F2937' }}>
                          {auditoria.codigo}
                        </span>
                        <Badge
                          style={{
                            backgroundColor: auditoria.nivelRiesgo === 'CRÍTICO' ? '#DC2626' :
                              auditoria.nivelRiesgo === 'ALTO' ? '#F59E0B' :
                              auditoria.nivelRiesgo === 'MEDIO' ? '#3B82F6' : '#10B981',
                            color: '#FFFFFF'
                          }}
                        >
                          {auditoria.nivelRiesgo}
                        </Badge>
                      </div>
                      <h4 className="font-bold mb-2" style={{ color: '#1F2937' }}>
                        {auditoria.procesoAuditable}
                      </h4>
                    </div>
                  </div>

                  {/* Información clave */}
                  <div className="space-y-2 text-xs mb-3" style={{ color: '#6B7280' }}>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{auditoria.auditorLider || 'Sin asignar'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {auditoria.fechas.planeacion.inicio 
                          ? `${new Date(auditoria.fechas.planeacion.inicio).toLocaleDateString('es-CO')} - ${new Date(auditoria.fechas.comunicacion.fin).toLocaleDateString('es-CO')}`
                          : 'Fechas pendientes'
                        }
                      </span>
                    </div>
                  </div>

                  {/* Botón o mensaje */}
                  {puedeCrearPlan ? (
                    <Button
                      onClick={() => handleCrearPlanIndividual(auditoria.id)}
                      className="w-full gap-2"
                      style={{ backgroundColor: '#8B5CF6', color: '#FFFFFF' }}
                    >
                      <FileSearch className="w-4 h-4" />
                      Crear Plan Individual
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <div
                      className="flex items-center gap-2 p-2 rounded-lg text-xs"
                      style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span>Completa asignación de auditor y fechas</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {auditoriasProgramadas.length > 4 && (
            <p className="text-xs mt-3 text-center" style={{ color: '#6B21A8' }}>
              + {auditoriasProgramadas.length - 4} auditorías más disponibles (ver tabla abajo)
            </p>
          )}
        </div>
      )}

      {/* Mensaje si hay procesos importados recientemente */}
      {context.flujoNavegacion?.desde === 'universo-auditorias' && (
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{ backgroundColor: '#D1FAE5', border: '2px solid #10B981' }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#10B981', color: '#FFFFFF' }}
          >
            ✓
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: '#065F46' }}>
              Procesos importados exitosamente desde el Universo de Auditorías
            </p>
            <p className="text-xs" style={{ color: '#065F46' }}>
              Ahora puedes asignar equipos, programar fechas y crear planes individuales.
            </p>
          </div>
        </div>
      )}

      {/* Componente Original */}
      <ProgramaAnualAuditorias />

      {/* Estadísticas del Flujo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg" style={{ backgroundColor: '#F9FAFB', border: '2px solid #E5E7EB' }}>
          <div className="text-2xl font-bold" style={{ color: '#1F2937' }}>
            {context.auditoriasProgramadas.length}
          </div>
          <div className="text-sm" style={{ color: '#6B7280' }}>
            Total Programadas
          </div>
        </div>

        <div className="p-4 rounded-lg" style={{ backgroundColor: '#F5F3FF', border: '2px solid #8B5CF6' }}>
          <div className="text-2xl font-bold" style={{ color: '#6B21A8' }}>
            {auditoriasProgramadas.length}
          </div>
          <div className="text-sm" style={{ color: '#6B21A8' }}>
            Listas para Plan Individual
          </div>
        </div>

        <div className="p-4 rounded-lg" style={{ backgroundColor: '#DBEAFE', border: '2px solid #3B82F6' }}>
          <div className="text-2xl font-bold" style={{ color: '#1E40AF' }}>
            {context.planesIndividuales.length}
          </div>
          <div className="text-sm" style={{ color: '#1E40AF' }}>
            Planes Individuales Creados
          </div>
        </div>

        <div className="p-4 rounded-lg" style={{ backgroundColor: '#ECFDF5', border: '2px solid #10B981' }}>
          <div className="text-2xl font-bold" style={{ color: '#065F46' }}>
            {context.universoProcesos.filter(p => p.estado === 'Disponible').length}
          </div>
          <div className="text-sm" style={{ color: '#065F46' }}>
            Procesos Disponibles en Universo
          </div>
        </div>
      </div>
    </div>
  );
}