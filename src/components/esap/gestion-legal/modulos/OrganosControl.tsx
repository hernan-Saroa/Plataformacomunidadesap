/**
 * Módulo de Órganos de Control
 * Gestión de requerimientos de órganos de control
 */

import { CardSIGL } from '../design-system/CardSIGL';
import { BadgeSIGL } from '../design-system/BadgeSIGL';
import { Building2, FileText } from 'lucide-react';

export function OrganosControl() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Órganos de Control
        </h1>
        <p className="text-gray-600">
          Gestión de requerimientos de órganos de control
        </p>
      </div>

      <CardSIGL className="p-8">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Módulo en Desarrollo
          </h3>
          <p className="text-gray-600 mb-4">
            Este módulo está en fase de desarrollo
          </p>
          <BadgeSIGL variant="warning">Próximamente</BadgeSIGL>
        </div>
      </CardSIGL>
    </div>
  );
}
