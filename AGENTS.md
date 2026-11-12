# Commands

## Backend Tests (travel-expenses-service)
- Run all backend tests: `cd backend/travel-expenses-service && npx jest --verbose`
- Run specific test file: `cd backend/travel-expenses-service && npx jest src/modules/travel-expenses/travel-expenses.service.spec.ts --verbose`

## Frontend Tests (mfe-viaticos)
- Run all frontend tests: `cd apps/mfe-viaticos && npx vitest run`
- Run specific test file: `cd apps/mfe-viaticos && npx vitest run <path-to-test> --reporter=verbose`

## Build Verification
- Backend build: `cd backend/travel-expenses-service && npm run build`
- Frontend TypeScript check: `cd apps/mfe-viaticos && npx tsc --noEmit`

# QA Módulo de Contratación (ESAP)

## Entorno y Credenciales QA
- URL: `https://esap-qa.fabricasoftware.co/`
- Usuario: `superuser@esap.edu.co` (Administrador)
- Clave: `Esap.2026*`

## Insumos y Documentación Clave
- Documento Maestro de QA: `docs/qa/DOSSIER_QA_MODULO_CONTRATACION_ESAP.md` y `DOC_QA_MODULO_CONTRATACION_ESAP.md`
- Matriz y Brechas: `c:\Users\juanc\Downloads\Trazabilidad_Formatos_Matriz_Flujo_Contratacion.xlsx`
- Estándar Plan de Pruebas: `c:\Users\juanc\Downloads\Gestion Infraestructura Plan Pruebas.docx`
- Flujo y Alcance: `c:\Users\juanc\Downloads\Flujo_Contratación_09072026.pptx`
- Manual de Contratación (Res. SC-1559/2025): `c:\Users\juanc\Downloads\2025-08-29RESOL1559MANUALDECONTRATACIONESAP2025.pdf`

## Reglas de Negocio QA Contratación
- Marco legal: Ley 80/1993, Ley 1150/2007, Decreto 1082/2015, Procedimiento BS-PT-002 v2.
- Etapas 1 (Identificación) y 2 (PAA) están fuera del alcance de desarrollo en Fase 1.
- Prioridad funcional #1: Contratación Directa - PSPAG (Prestación de Servicios Profesionales Persona Natural).
- Nomenclatura oficial: Casos de prueba `CP-GC-NNN` y Defectos `BUG-GC-NNN`.
- Formatos SIG vinculados: `BS-FO-046` (Estudios previos), `BS-FO-004` (Garantías), `BS-FO-025` (Informes y pagos), `BS-FO-059` (Modificaciones), `BS-FO-060` (Liquidación).

