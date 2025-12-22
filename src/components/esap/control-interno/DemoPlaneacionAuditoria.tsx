/**
 * ============================================
 * DEMO: RF005 - FASE DE PLANEACIÓN
 * ============================================
 * 
 * Componente de demostración para visualizar el módulo
 * de planeación de auditorías con datos de ejemplo.
 * 
 * Uso: Importar en ControlInternoFull o ejecutar standalone
 */

import { useState } from 'react';
import { PlaneacionAuditoriaModule } from './PlaneacionAuditoriaModule';
import { ButtonSIGL } from '../gestion-legal/design-system/Button';
import { CardSIGL } from '../gestion-legal/design-system/Card';
import { FileSearch, ArrowRight } from 'lucide-react';

// Datos de ejemplo de una auditoría iniciada
const AUDITORIA_EJEMPLO = {
  id: 'aud-2025-001',
  codigo: 'AUD-2025-001',
  nombre: 'Auditoría al Proceso de Gestión Financiera',
  tipo: 'Sede' as const,
  areaAuditable: 'Dirección Financiera y Presupuestal',
  procesoNombre: 'Gestión Financiera',
  responsableArea: {
    id: 'usr-001',
    nombre: 'Catalina Rubio Martínez',
    cargo: 'Directora Financiera y Presupuestal',
    email: 'catalina.rubio@esap.gov.co',
  },
  auditorLider: {
    id: 'usr-002',
    nombre: 'Fernando Ávila Jiménez',
    email: 'fernando.avila@esap.gov.co',
  },
  equipoAuditores: [
    {
      id: 'usr-003',
      nombre: 'Lucila Villamil Torres',
      email: 'lucila.villamil@esap.gov.co',
    },
    {
      id: 'usr-004',
      nombre: 'Natalia Cañón Reyes',
      email: 'natalia.canon@esap.gov.co',
    },
  ],
  cronograma: {
    fechaInicio: new Date('2025-01-13'),
    fechaFin: new Date('2025-01-24'), // 10 días hábiles (2 semanas)
    duracionDias: 10,
  },
  stage: 'PLANEACION',
};

export function DemoPlaneacionAuditoria() {
  const [mostrarDemo, setMostrarDemo] = useState(false);

  if (!mostrarDemo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <CardSIGL className="max-w-2xl">
          <div className="text-center">
            {/* Header */}
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <FileSearch className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-3xl text-gray-900 mb-3">
              RF005 - Fase de Planeación
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Sistema de gestión de la fase de planeación de auditorías internas
            </p>

            {/* Características */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
              <p className="text-sm text-gray-700 mb-4">
                <strong>Funcionalidades implementadas:</strong>
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                  <span>
                    <strong>3 Actividades obligatorias:</strong> Estudios preliminares, solicitud de información, reunión de apertura
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                  <span>
                    <strong>Checklist interactivo:</strong> 6 items por actividad con seguimiento de progreso
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                  <span>
                    <strong>Gestión de documentos:</strong> Carga y visualización de archivos por actividad
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                  <span>
                    <strong>Solicitud formal:</strong> Elaboración y envío de solicitud de información al área
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                  <span>
                    <strong>Programación de reunión:</strong> Configuración de reunión de apertura (presencial/virtual/híbrida)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                  <span>
                    <strong>Validación de avance:</strong> Solo permite avanzar a Ejecución cuando todo está al 100%
                  </span>
                </li>
              </ul>
            </div>

            {/* Datos de la demo */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 text-left">
              <p className="text-sm text-blue-800 mb-3">
                <strong>Datos de ejemplo de la demostración:</strong>
              </p>
              <div className="space-y-1 text-sm text-blue-700">
                <p><strong>Auditoría:</strong> {AUDITORIA_EJEMPLO.nombre}</p>
                <p><strong>Código:</strong> {AUDITORIA_EJEMPLO.codigo}</p>
                <p><strong>Tipo:</strong> {AUDITORIA_EJEMPLO.tipo} (10 días hábiles de planeación)</p>
                <p><strong>Área auditada:</strong> {AUDITORIA_EJEMPLO.areaAuditable}</p>
                <p><strong>Responsable:</strong> {AUDITORIA_EJEMPLO.responsableArea.nombre}</p>
                <p><strong>Auditor Líder:</strong> {AUDITORIA_EJEMPLO.auditorLider.nombre}</p>
                <p>
                  <strong>Cronograma:</strong>{' '}
                  {AUDITORIA_EJEMPLO.cronograma.fechaInicio.toLocaleDateString()} -{' '}
                  {AUDITORIA_EJEMPLO.cronograma.fechaFin.toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Botón de inicio */}
            <ButtonSIGL
              variant="primary"
              onClick={() => setMostrarDemo(true)}
              className="w-full sm:w-auto"
            >
              <FileSearch className="w-5 h-5 mr-2" />
              Iniciar Demostración
              <ArrowRight className="w-5 h-5 ml-2" />
            </ButtonSIGL>

            {/* Footer */}
            <p className="text-xs text-gray-500 mt-6">
              Basado en EM-PT-004 - Auditorías Internas V3 | Control Interno de Gestión
            </p>
          </div>
        </CardSIGL>
      </div>
    );
  }

  return (
    <PlaneacionAuditoriaModule
      auditoria={AUDITORIA_EJEMPLO}
      onClose={() => setMostrarDemo(false)}
      onAvanzarEjecucion={() => {
        // En producción, esto cambiaría el estado de la auditoría
        console.log('Avanzando a fase de Ejecución...');
        alert('¡Fase de Planeación completada! La auditoría avanzará a la fase de Ejecución.');
        setMostrarDemo(false);
      }}
    />
  );
}
