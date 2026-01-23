/**
 * DATOS DE EJEMPLO: AUDITORÍAS CON HALLAZGOS
 * Datos de ejemplo para demostración del módulo de Control Interno
 */

import { useEffect } from 'react';
import { useIntegracionAuditoriaPlanes, type AuditoriaParaPlan } from './IntegracionAuditoriasPlanesContext';

/**
 * Hook para inicializar datos de ejemplo
 */
export function useInicializarDatosEjemplo() {
  const { agregarAuditoriaConHallazgos } = useIntegracionAuditoriaPlanes();

  useEffect(() => {
    // Inicializar con datos de ejemplo
    AUDITORIAS_EJEMPLO.forEach(auditoria => {
      agregarAuditoriaConHallazgos(auditoria);
    });
  }, []);
}

// Datos de ejemplo de auditorías con hallazgos
const AUDITORIAS_EJEMPLO: AuditoriaParaPlan[] = [
  {
    id: 'AUD-2024-001',
    codigo: 'AUD-INT-001-2024',
    titulo: 'Auditoría de Gestión Contractual - Sede Central',
    area: 'Dirección Administrativa y Financiera',
    tipo: 'gestion',
    fechaInicio: '2024-01-15',
    fechaFin: '2024-02-15',
    estado: 'completada',
    auditorLider: 'Jorge Enrique Pérez Gutiérrez',
    sede: 'Sede Central Bogotá',
    hallazgos: [
      {
        id: 'HALL-001',
        codigo: 'H-001-2024',
        titulo: 'Falta de documentación de seguimiento contractual',
        descripcion: 'Se evidenció ausencia de actas de seguimiento en 15 contratos de prestación de servicios del año 2023',
        tipo: 'no-conformidad-menor',
        criterio: 'Procedimiento de Gestión Contractual PRO-CON-001',
        evidencia: 'Revisión expedientes contractuales',
        impacto: 'medio',
        probabilidad: 'alta',
        nivelRiesgo: 'alto'
      },
      {
        id: 'HALL-002',
        codigo: 'H-002-2024',
        titulo: 'Demora en elaboración de certificados de cumplimiento',
        descripcion: 'Se identificaron 8 contratos con certificados de cumplimiento expedidos con más de 30 días de retraso',
        tipo: 'no-conformidad-menor',
        criterio: 'Manual de Contratación - Artículo 45',
        evidencia: 'Análisis de tiempos de respuesta',
        impacto: 'bajo',
        probabilidad: 'media',
        nivelRiesgo: 'medio'
      }
    ]
  },
  {
    id: 'AUD-2024-002',
    codigo: 'AUD-INT-002-2024',
    titulo: 'Auditoría de Gestión Documental - Territorial Antioquia',
    area: 'Territorial Antioquia',
    tipo: 'cumplimiento',
    fechaInicio: '2024-01-20',
    fechaFin: '2024-02-20',
    estado: 'en-ejecucion',
    auditorLider: 'María Claudia Rodríguez Martínez',
    sede: 'Territorial Antioquia',
    hallazgos: [
      {
        id: 'HALL-003',
        codigo: 'H-003-2024',
        titulo: 'Falta de aplicación de Tablas de Retención Documental (TRD)',
        descripcion: 'No se evidencia aplicación sistemática de las TRD en el archivo de gestión de la Territorial',
        tipo: 'no-conformidad-mayor',
        criterio: 'Ley 594 de 2000 - Ley General de Archivos',
        evidencia: 'Inspección física archivo de gestión',
        impacto: 'alto',
        probabilidad: 'alta',
        nivelRiesgo: 'critico'
      }
    ]
  },
  {
    id: 'AUD-2024-003',
    codigo: 'AUD-INT-003-2024',
    titulo: 'Auditoría de Sistemas de Información - Nacional',
    area: 'Oficina de Tecnología',
    tipo: 'gestion',
    fechaInicio: '2024-02-01',
    fechaFin: '2024-03-01',
    estado: 'planeacion',
    auditorLider: 'Carlos Alberto Gómez Silva',
    sede: 'Sede Central Bogotá',
    hallazgos: []
  }
];
