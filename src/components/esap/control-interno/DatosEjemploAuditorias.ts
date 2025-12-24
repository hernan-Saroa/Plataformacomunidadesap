/**
 * DATOS DE EJEMPLO: AUDITORÍAS CON HALLAZGOS
 * 
 * Proporciona datos de ejemplo para probar la integración
 * entre Auditorías y Planes de Mejoramiento
 */

import { useEffect } from 'react';
import { useIntegracionAuditoriaPlanes, type AuditoriaParaPlan } from './IntegracionAuditoriasPlanesContext';

/**
 * Hook para inicializar datos de ejemplo
 * Solo para desarrollo/demo
 */
export function useInicializarDatosEjemplo() {
  const { auditoriasConHallazgos, agregarAuditoriaConHallazgos } = useIntegracionAuditoriaPlanes();

  useEffect(() => {
    // Solo inicializar si no hay datos
    if (auditoriasConHallazgos.length === 0) {
      AUDITORIAS_EJEMPLO.forEach((auditoria) => {
        agregarAuditoriaConHallazgos(auditoria);
      });
    }
  }, []); // Solo ejecutar una vez al montar
}

// ============ DATOS DE EJEMPLO ============

const AUDITORIAS_EJEMPLO: AuditoriaParaPlan[] = [
  {
    id: 'aud-005',
    codigo: 'AUD-2025-005',
    nombre: 'Auditoría de Gestión Financiera',
    areaResponsable: 'Dirección Administrativa y Financiera',
    responsable: 'María González Ramírez',
    cargo: 'Directora Administrativa',
    fechaFinalizacion: '15/12/2024',
    estadoPlan: 'SIN_PLAN',
    fechaLimitePlan: '15/01/2025',
    plazoFormulacion: 30,
    hallazgos: [
      {
        id: 'h1',
        titulo: 'Falta de conciliaciones bancarias mensuales',
        gravedad: 'GRAVE',
        descripcion: 'No se realizan conciliaciones bancarias de manera mensual, solo trimestrales. Esto genera riesgo de inconsistencias no detectadas oportunamente.',
        causas: [
          'Falta de personal capacitado en el área contable',
          'Procesos manuales que requieren mucho tiempo',
          'No hay software especializado para conciliaciones'
        ],
        efectos: [
          'Riesgo de fraude no detectado oportunamente',
          'Información financiera potencialmente inexacta',
          'Posibles observaciones de contraloría'
        ],
        recomendaciones: [
          'Implementar software de conciliación bancaria automatizada',
          'Capacitar personal en procedimientos de conciliación',
          'Establecer calendario mensual obligatorio'
        ]
      },
      {
        id: 'h2',
        titulo: 'Documentación de gastos incompleta',
        gravedad: 'MODERADO',
        descripcion: 'Algunos gastos no cuentan con toda la documentación soporte requerida por la normativa vigente.',
        causas: [
          'Falta de procedimiento documentado claro',
          'Desconocimiento de normativa por parte del personal',
          'No hay checklist de verificación'
        ],
        efectos: [
          'Posibles glosas en auditorías externas',
          'Riesgo de rechazo de gastos',
          'Debilidad en control interno'
        ],
        recomendaciones: [
          'Crear checklist de documentos obligatorios por tipo de gasto',
          'Socializar normativa con todo el personal',
          'Implementar sistema de verificación previo al pago'
        ]
      },
      {
        id: 'h3',
        titulo: 'Retraso en reportes presupuestales',
        gravedad: 'LEVE',
        descripcion: 'Los reportes presupuestales se entregan 2-3 días después del plazo establecido.',
        causas: [
          'Volumen de trabajo elevado en ciertos periodos',
          'Falta de priorización de actividades',
          'Dependencia de información de otras áreas'
        ],
        efectos: [
          'Información no oportuna para toma de decisiones',
          'Incumplimiento de compromisos institucionales'
        ],
        recomendaciones: [
          'Redistribuir carga de trabajo',
          'Implementar calendario con alertas tempranas',
          'Establecer procedimiento de escalamiento'
        ]
      }
    ]
  },
  {
    id: 'aud-007',
    codigo: 'AUD-2025-007',
    nombre: 'Auditoría de Gestión Ambiental',
    areaResponsable: 'Dirección de Gestión Ambiental',
    responsable: 'Carlos Mendoza Pérez',
    cargo: 'Director Ambiental',
    fechaFinalizacion: '10/12/2024',
    estadoPlan: 'EN_FORMULACION',
    fechaLimitePlan: '10/01/2025',
    plazoFormulacion: 30,
    hallazgos: [
      {
        id: 'h4',
        titulo: 'Falta de plan de gestión de residuos',
        gravedad: 'GRAVE',
        descripcion: 'No existe un plan documentado para la gestión de residuos peligrosos.',
        causas: [
          'No se ha priorizado este tema',
          'Falta de conocimiento técnico',
          'Presupuesto insuficiente'
        ],
        efectos: [
          'Incumplimiento normativa ambiental',
          'Riesgo de sanciones ambientales',
          'Daño ambiental potencial'
        ],
        recomendaciones: [
          'Contratar consultor especializado',
          'Asignar presupuesto específico',
          'Capacitar equipo en gestión ambiental'
        ]
      }
    ]
  },
  {
    id: 'aud-003',
    codigo: 'AUD-2025-003',
    nombre: 'Auditoría de Sistemas de Información',
    areaResponsable: 'Dirección de Tecnología',
    responsable: 'Andrea Castro López',
    cargo: 'Directora de TI',
    fechaFinalizacion: '05/12/2024',
    estadoPlan: 'EN_SEGUIMIENTO',
    fechaLimitePlan: '05/01/2025',
    plazoFormulacion: 30,
    hallazgos: [
      {
        id: 'h5',
        titulo: 'Vulnerabilidades de seguridad informática',
        gravedad: 'GRAVE',
        descripcion: 'Se detectaron vulnerabilidades críticas en los sistemas de información.',
        causas: [
          'Falta de actualizaciones de seguridad',
          'No hay política de contraseñas robustas',
          'Ausencia de pruebas de penetración'
        ],
        efectos: [
          'Riesgo de brechas de seguridad',
          'Posible pérdida de información',
          'Daño reputacional'
        ],
        recomendaciones: [
          'Implementar política de parches de seguridad',
          'Establecer política de contraseñas robustas',
          'Contratar servicios de hacking ético'
        ]
      },
      {
        id: 'h6',
        titulo: 'Falta de respaldos automatizados',
        gravedad: 'MODERADO',
        descripcion: 'Los respaldos de información se hacen manualmente y no de forma automatizada.',
        causas: [
          'No hay solución de backup implementada',
          'Falta de recursos técnicos',
          'Desconocimiento de soluciones en la nube'
        ],
        efectos: [
          'Riesgo de pérdida de información',
          'Tiempo de recuperación elevado',
          'Incumplimiento de estándares'
        ],
        recomendaciones: [
          'Implementar solución de backup automatizada',
          'Establecer política de respaldos',
          'Realizar pruebas de recuperación periódicas'
        ]
      }
    ]
  },
  {
    id: 'aud-012',
    codigo: 'AUD-2024-012',
    nombre: 'Auditoría de Sistema de Gestión de Calidad',
    areaResponsable: 'Oficina de Calidad',
    responsable: 'Patricia Ruiz Gómez',
    cargo: 'Jefa de Calidad',
    fechaFinalizacion: '31/12/2024',
    estadoPlan: 'COMPLETADO',
    fechaLimitePlan: '31/01/2025',
    plazoFormulacion: 30,
    hallazgos: [
      {
        id: 'h7',
        titulo: 'Indicadores de gestión sin seguimiento',
        gravedad: 'MODERADO',
        descripcion: 'Los indicadores de gestión no tienen seguimiento periódico documentado.',
        causas: [
          'Falta de herramienta de seguimiento',
          'No hay responsable designado',
          'Ausencia de cultura de medición'
        ],
        efectos: [
          'Imposibilidad de medir mejora continua',
          'Decisiones sin sustento en datos',
          'Debilidad en gestión institucional'
        ],
        recomendaciones: [
          'Implementar tablero de indicadores',
          'Designar responsables por indicador',
          'Establecer reuniones de seguimiento'
        ]
      }
    ]
  }
];
