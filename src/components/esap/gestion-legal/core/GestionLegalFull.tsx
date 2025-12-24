/**
 * GestionLegalFull - Sistema Integrado de Gestión Legal (SIGL v5.0)
 * Layout unificado con menú vertical lateral
 * DISEÑO 100% COHERENTE CON EL RESTO DEL SISTEMA ESAP
 */

import { useState } from 'react';
import { SidebarSIGL } from './SidebarSIGL';
import { SIGL_COLORS } from '../design-system/tokens';

// Componentes de módulos V3 - DISEÑO UNIFICADO
import { DashboardEjecutivoSIGL } from './DashboardEjecutivoSIGL';
import { ModuloDefensaJudicialV3 } from '../modulos/ModuloDefensaJudicialV3';
import { ModuloJuzgamientoDisciplinarioV3 } from '../modulos/ModuloJuzgamientoDisciplinarioV3';
import { ModuloAsesoriaJuridicaV3 } from '../modulos/ModuloAsesoriaJuridicaV3';
import { ModuloBuzonNotificacionesV3 } from '../modulos/ModuloBuzonNotificacionesV3';
import { ModuloTerminosInformesV3 } from '../modulos/ModuloTerminosInformesV3';

// Componentes FASE 2 - 6 MÓDULOS ADICIONALES
import { OrganosControl } from '../modulos/OrganosControl';
import { ModuloProcesosCoactivosV3 } from '../modulos/ProcesosCoactivosV3';
import { ModuloBuzonOficinaJuridicaV3 } from '../modulos/BuzonOficinaJuridicaV3';
import { ModuloPlanAccionV3 } from '../modulos/PlanAccionV3';
import { Riesgos } from '../modulos/Riesgos';
import { PlanesMejoramiento } from '../modulos/PlanesMejoramiento';

type VistaDisponible =
  | 'dashboard'
  | 'defensa-judicial'
  | 'juzgamiento'
  | 'asesoria'
  | 'buzon'
  | 'terminos'
  | 'organos-control'
  | 'procesos-coactivos'
  | 'buzon-oj'
  | 'plan-accion'
  | 'riesgos'
  | 'planes-mejoramiento';

export function GestionLegalFull() {
  const [vistaActual, setVistaActual] = useState<VistaDisponible>('defensa-judicial'); // Mostrar módulo con tarjetas profesionales por defecto

  // Renderizar vista activa
  const renderVistaActual = () => {
    switch (vistaActual) {
      case 'dashboard':
        return <DashboardEjecutivoSIGL />;
      case 'defensa-judicial':
        return <ModuloDefensaJudicialV3 />;
      case 'juzgamiento':
        return <ModuloJuzgamientoDisciplinarioV3 />;
      case 'asesoria':
        return <ModuloAsesoriaJuridicaV3 />;
      case 'buzon':
        return <ModuloBuzonNotificacionesV3 />;
      case 'terminos':
        return <ModuloTerminosInformesV3 />;
      case 'organos-control':
        return <OrganosControl />;
      case 'procesos-coactivos':
        return <ModuloProcesosCoactivosV3 />;
      case 'buzon-oj':
        return <ModuloBuzonOficinaJuridicaV3 />;
      case 'plan-accion':
        return <ModuloPlanAccionV3 />;
      case 'riesgos':
        return <Riesgos />;
      case 'planes-mejoramiento':
        return <PlanesMejoramiento />;
      default:
        return <DashboardEjecutivoSIGL />;
    }
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-gray-50">
      {/* Sidebar Vertical */}
      <SidebarSIGL 
        vistaActual={vistaActual} 
        onCambiarVista={(vista) => setVistaActual(vista as VistaDisponible)} 
      />

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderVistaActual()}
      </div>
    </div>
  );
}