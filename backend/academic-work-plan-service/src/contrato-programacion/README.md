# Contrato PROG↔PTA

Superficie que **Programación Académica** (`academic-schedule-service`) consume de
este servicio. Vive aquí, y no dentro de `pta/`, por tres razones:

1. **Versionada** (`/contrato-programacion/v1/...`). El levantamiento anticipa
   tráfico bidireccional; sin versión, el primer cambio de forma rompe al
   consumidor sin aviso.
2. **DTOs propios, nunca entidades.** Exponer `DocenteEntity` filtraría cualquier
   cambio interno del PTA al otro módulo. El DTO *es* el contrato.
3. **Aditiva.** No reorganiza código existente del PTA: solo agrega.

## Reglas que hace cumplir

- **RN-09** — el RUND lo administra la Subdirección Nacional de Servicios
  Académicos; las decanaturas lo consumen en **LECTURA**. Este contrato **no
  expone ninguna ruta de escritura**, y hay un test que lo verifica
  estructuralmente. El middleware de solo lectura es la red, no la garantía.
- La identidad efectiva llega por las cabeceras del gateway (`x-user-id`,
  `x-user-roles`), que el servicio consumidor **propaga del usuario original** en
  vez de usar un token de servicio. Así, si el usuario no puede leer algo, tampoco
  podrá a través del módulo nuevo.

## Endpoints

| Método | Ruta | HU |
|---|---|---|
| `GET` | `/contrato-programacion/v1/docentes/:documento` | EFDS-1372 |

Pendientes de las siguientes HU: cálculo de horas de la Circular 003 (EFDS-1373,
cierra EFDS-1651) y confirmación de asignaciones PTA→PROG (Flujo 4).
