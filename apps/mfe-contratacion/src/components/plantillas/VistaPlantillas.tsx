import React from 'react';
import { FileText } from 'lucide-react';

import { ModuleHeader } from '../shared/ModuleHeader';
import { BibliotecaFormatos } from '../configuracion/BibliotecaFormatos';

/**
 * Los formatos institucionales del Sistema Integrado de Gestión.
 *
 * Sección propia y no una pestaña de Configuración: administrar el catálogo de
 * formatos no es configurar el flujo, y quien sube una versión nueva de
 * BS-FO-047 no está tocando qué actividades recorre cada modalidad.
 */
export function VistaPlantillas() {
  return (
    <div className="space-y-5">
      <ModuleHeader
        icon={<FileText className="w-6 h-6" />}
        title="Plantillas"
        subtitle="Formatos aprobados del Sistema Integrado de Gestión"
        color="#0891B2"
      />

      <BibliotecaFormatos />
    </div>
  );
}
