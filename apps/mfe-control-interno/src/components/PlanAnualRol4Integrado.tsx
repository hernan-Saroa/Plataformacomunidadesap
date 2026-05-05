/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ROL 4 - PLAN ANUAL INTEGRADO CON PROGRAMA DE AUDITORÍA
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Integración completa del Rol 4 del Plan Anual de Auditoría con:
 * - Universo Auditable (selección de áreas a auditar)
 * - Módulo de Auditorías OCI (ejecución y seguimiento)
 * - Módulo de Planes de Mejoramiento (gestión de hallazgos)
 * 
 * FLUJO INTEGRADO:
 * 1. Seleccionar áreas del Universo Auditable por nivel de riesgo
 * 2. Crear programa anual de auditorías con cronograma
 * 3. Vincular cada auditoría programada con auditorías del módulo OCI
 * 4. Seguimiento en tiempo real del avance de auditorías
 * 5. Conexión automática con Planes de Mejoramiento de hallazgos
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { UniversoAuditableUnificado } from './UniversoAuditableUnificado';

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

interface PlanAnualRol4IntegradoProps {
  vigencia: number;
  onVolver: () => void;
}

export function PlanAnualRol4Integrado({ vigencia, onVolver }: PlanAnualRol4IntegradoProps) {
  // Modo seguimiento: solo muestra auditorías existentes del universo, sin opciones de creación
  return <UniversoAuditableUnificado vigencia={vigencia} onVolver={onVolver} modoSeguimiento={true} />;
}