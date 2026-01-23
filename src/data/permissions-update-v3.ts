/**
 * ============================================
 * ACTUALIZACIÓN DE PERMISOS - VERSIÓN 3.0
 * ============================================
 * 
 * CAMBIOS PRINCIPALES:
 * 1. Se reemplazaron los permisos básicos de Certificados Laborales (15) por 65 permisos granulares
 * 2. Se reemplazaron los permisos básicos de Registro Académico (15) por 90 permisos granulares
 * 3. Total de permisos nuevos: 155
 * 4. Sistema completamente parametrizable por categorías
 * 
 * ESTRUCTURA:
 * - Certificados Laborales: 10 categorías
 * - Registro Académico: 10 categorías
 * 
 * Fecha: Enero 22, 2025
 */

import {
  FileCheck, Award, GraduationCap, BookOpen, Briefcase
} from 'lucide-react';
import type { PermissionModule } from './permissions-config-updated';
import { PERMISOS_CERTIFICADOS_LABORALES, PERMISOS_REGISTRO_ACADEMICO } from './permissions-certificados-registro-granular';

// ============================================================================
// MÓDULOS ACTUALIZADOS
// ============================================================================

export const MODULO_CERTIFICADOS_LABORALES_COMPLETO: PermissionModule = {
  id: 'certificados_laborales',
  name: 'Certificados Laborales',
  icon: FileCheck,
  color: 'text-teal-700',
  bgColor: 'bg-teal-50',
  permissions: PERMISOS_CERTIFICADOS_LABORALES
};

export const MODULO_REGISTRO_ACADEMICO_COMPLETO: PermissionModule = {
  id: 'registro_academico',
  name: 'Registro Académico',
  icon: GraduationCap,
  color: 'text-emerald-700',
  bgColor: 'bg-emerald-50',
  permissions: PERMISOS_REGISTRO_ACADEMICO
};

// ============================================================================
// ESTADÍSTICAS
// ============================================================================

export const ESTADISTICAS_PERMISOS = {
  certificados_laborales: {
    total: 65,
    categorias: [
      'Dashboard (5)',
      'Solicitudes (15)',
      'Aprobación (8)',
      'Generación (10)',
      'Firma (8)',
      'Entrega (9)',
      'Validación (5)',
      'Plantillas (5)',
      'Configuración y Reportes (5)'
    ]
  },
  registro_academico: {
    total: 90,
    categorias: [
      'Dashboard (5)',
      'Inscripciones (12)',
      'Matrículas (15)',
      'Calificaciones (13)',
      'Certificados de Grado (15)',
      'Validación de Títulos (8)',
      'Programas Académicos (10)',
      'Gestión de Graduados (12)',
      'Configuración y Reportes (5)'
    ]
  }
};

console.log('✅ Actualización de Permisos completada');
console.log(`📊 Certificados Laborales: ${ESTADISTICAS_PERMISOS.certificados_laborales.total} permisos en ${ESTADISTICAS_PERMISOS.certificados_laborales.categorias.length} categorías`);
console.log(`📊 Registro Académico: ${ESTADISTICAS_PERMISOS.registro_academico.total} permisos en ${ESTADISTICAS_PERMISOS.registro_academico.categorias.length} categorías`);
console.log(`📊 TOTAL NUEVOS PERMISOS: ${ESTADISTICAS_PERMISOS.certificados_laborales.total + ESTADISTICAS_PERMISOS.registro_academico.total}`);

// ============================================================================
// RESUMEN DE PERMISOS POR CRITICIDAD
// ============================================================================

const contarPorCriticidad = (permisos: any[]) => {
  return {
    baja: permisos.filter(p => p.criticidad === 'baja').length,
    media: permisos.filter(p => p.criticidad === 'media').length,
    alta: permisos.filter(p => p.criticidad === 'alta').length,
    critica: permisos.filter(p => p.criticidad === 'critica').length
  };
};

export const PERMISOS_POR_CRITICIDAD = {
  certificados_laborales: contarPorCriticidad(PERMISOS_CERTIFICADOS_LABORALES),
  registro_academico: contarPorCriticidad(PERMISOS_REGISTRO_ACADEMICO)
};

console.log('\n🔐 Permisos por Criticidad:');
console.log('Certificados Laborales:', PERMISOS_POR_CRITICIDAD.certificados_laborales);
console.log('Registro Académico:', PERMISOS_POR_CRITICIDAD.registro_academico);

// ============================================================================
// INTEGRACIÓN CON ROLES PREDEFINIDOS
// ============================================================================

export const ROLES_SUGERIDOS = {
  // Certificados Laborales
  'Coordinador RRHH': {
    modulo: 'certificados_laborales',
    permisos_recomendados: [
      'cl.dashboard.view',
      'cl.solicitud.view_all',
      'cl.solicitud.create',
      'cl.solicitud.assign',
      'cl.generacion.create',
      'cl.generacion.customize',
      'cl.entrega.send_email',
      'cl.reporte.general',
      'cl.reporte.export'
    ],
    descripcion: 'Coordinador de recursos humanos con permisos de gestión completa de certificados'
  },
  'Asistente RRHH': {
    modulo: 'certificados_laborales',
    permisos_recomendados: [
      'cl.dashboard.view',
      'cl.solicitud.view',
      'cl.solicitud.create',
      'cl.generacion.create',
      'cl.entrega.send_email',
      'cl.entrega.print'
    ],
    descripcion: 'Asistente con permisos operativos básicos'
  },
  'Jefe RRHH': {
    modulo: 'certificados_laborales',
    permisos_recomendados: [
      'cl.aprobacion.view_pending',
      'cl.aprobacion.approve',
      'cl.aprobacion.reject',
      'cl.firma.sign_simple',
      'cl.firma.sign_qualified',
      'cl.config.view',
      'cl.config.edit'
    ],
    descripcion: 'Jefe con permisos de aprobación y firma'
  },

  // Registro Académico
  'Coordinador Registro Académico': {
    modulo: 'registro_academico',
    permisos_recomendados: [
      'ra.dashboard.view',
      'ra.inscripcion.view_all',
      'ra.matricula.view_all',
      'ra.titulo.view_all',
      'ra.titulo.create',
      'ra.titulo.sign',
      'ra.programa.view',
      'ra.programa.edit',
      'ra.graduado.view_all',
      'ra.reporte.general'
    ],
    descripcion: 'Coordinador con acceso completo a registro académico'
  },
  'Analista Registro': {
    modulo: 'registro_academico',
    permisos_recomendados: [
      'ra.inscripcion.create',
      'ra.inscripcion.edit',
      'ra.matricula.create',
      'ra.matricula.verify_payment',
      'ra.calificacion.view',
      'ra.titulo.create'
    ],
    descripcion: 'Analista con permisos operativos'
  },
  'Docente': {
    modulo: 'registro_academico',
    permisos_recomendados: [
      'ra.calificacion.view_own',
      'ra.calificacion.create',
      'ra.calificacion.edit',
      'ra.calificacion.import',
      'ra.calificacion.approve'
    ],
    descripcion: 'Docente con permisos de calificaciones'
  },
  'Director Académico': {
    modulo: 'registro_academico',
    permisos_recomendados: [
      'ra.dashboard.view',
      'ra.inscripcion.approve',
      'ra.matricula.approve',
      'ra.calificacion.reopen',
      'ra.titulo.sign',
      'ra.titulo.revoke',
      'ra.programa.create',
      'ra.programa.update_curriculum',
      'ra.config.edit'
    ],
    descripcion: 'Director con permisos críticos y de configuración'
  }
};

console.log(`\n👥 Roles Sugeridos: ${Object.keys(ROLES_SUGERIDOS).length} roles predefinidos`);

// ============================================================================
// GUÍA DE IMPLEMENTACIÓN
// ============================================================================

export const GUIA_IMPLEMENTACION = `
# GUÍA DE IMPLEMENTACIÓN - PERMISOS GRANULARES

## Paso 1: Actualizar imports en RolePermissionsEditor.tsx

\`\`\`typescript
import { MODULO_CERTIFICADOS_LABORALES_COMPLETO, MODULO_REGISTRO_ACADEMICO_COMPLETO } from '../../data/permissions-update-v3';
\`\`\`

## Paso 2: Reemplazar módulos en PERMISSION_MODULES array

Buscar y reemplazar:
- Módulo 'certificados_laborales' (id: 4) → MODULO_CERTIFICADOS_LABORALES_COMPLETO
- Módulo 'graduados' (id: 9) → MODULO_REGISTRO_ACADEMICO_COMPLETO

## Paso 3: Actualizar contadores

Los contadores automáticos se actualizarán:
- Total permisos pasa de ~350 a ~490
- Certificados Laborales: 15 → 65 permisos (+50)
- Registro Académico: 15 → 90 permisos (+75)

## Paso 4: Revisar roles existentes

Revisar roles que ya tienen permisos de estos módulos y actualizar si es necesario.

## Paso 5: Documentar cambios

Comunicar a usuarios sobre nuevos permisos disponibles.
`;

console.log('\n📖 Guía de implementación disponible en GUIA_IMPLEMENTACION');
