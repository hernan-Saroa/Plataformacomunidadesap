/**
 * PÁGINA DE PRUEBA - EXPEDIENTE DE AUDITORÍA
 * 
 * Para probar el componente ExpedienteAuditoriaCompleto de forma aislada
 * 
 * USO:
 * Importar este componente en App.tsx temporalmente para ver el expediente
 */

import { useState } from 'react';
import { ExpedienteAuditoriaCompleto } from './ExpedienteAuditoriaCompleto';
import { ButtonSIGL } from '../gestion-legal/design-system/Button';
import { FileText } from 'lucide-react';

export function TEST_ExpedienteAuditoria() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="text-center">
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileText className="w-12 h-12 text-blue-600" />
        </div>
        
        <h1 className="text-3xl text-gray-900 mb-4">
          Expediente Completo de Auditoría
        </h1>
        
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Modal con 6 tabs que muestra toda la información de una auditoría:
          General, Planeación, Ejecución, Comunicación, Documentación e Historial
        </p>

        <ButtonSIGL
          variant="primary"
          onClick={() => setModalOpen(true)}
          className="mx-auto"
        >
          <FileText className="w-5 h-5 mr-2" />
          Abrir Expediente de Auditoría
        </ButtonSIGL>

        <div className="mt-8 text-sm text-gray-500">
          <p>Funcionalidades incluidas:</p>
          <ul className="mt-2 space-y-1">
            <li>✅ 6 tabs navegables (General, Planeación, Ejecución, etc.)</li>
            <li>✅ Integración con PlaneacionAuditoriaModule</li>
            <li>✅ Repositorio de documentos con filtros</li>
            <li>✅ Timeline de eventos y auditoría</li>
            <li>✅ Estadísticas y métricas visuales</li>
            <li>✅ Datos de ejemplo completos</li>
          </ul>
        </div>
      </div>

      {/* Modal */}
      <ExpedienteAuditoriaCompleto
        auditoriaId="aud-001"
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        tabInicial="general"
      />
    </div>
  );
}
