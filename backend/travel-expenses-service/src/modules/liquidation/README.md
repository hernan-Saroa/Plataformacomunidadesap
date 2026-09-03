# Módulo de Autoliquidación de Viáticos

## Descripción

Módulo backend/frontend para el cálculo de autoliquidación de viáticos según el **Decreto 314 de 2026**. Implementa la determinación del salario base, búsqueda de escala por rango, aplicación de factores por tipo de comisionado y pernocta, generación de desglose diario, redondeo a enteros (COP) y excepción regional Art. 5.

## Stack

- **Backend**: NestJS + TypeORM + class-validator
- **Frontend**: React + TypeScript + Vitest
- **Base de datos**: PostgreSQL (schema `travel_expenses`)

## Estructura

```
backend/travel-expenses-service/src/modules/liquidation/
  liquidation.module.ts
  liquidation.controller.ts
  liquidation.service.ts
  __tests__/liquidation.service.spec.ts

backend/travel-expenses-service/src/dto/liquidation/
  calcular-liquidacion.dto.ts
  liquidacion-response.dto.ts

backend/travel-expenses-service/src/entities/liquidation/
  escala-viatico.entity.ts
  tarifa-investigador.entity.ts
  tarifa-regional-excepcion.entity.ts

apps/mfe-viaticos/src/components/
  LiquidacionPanel.tsx
  NuevaSolicitudModal.tsx

apps/mfe-viaticos/src/services/api/
  viaticosService.ts

apps/mfe-viaticos/src/types/
  viaticos.ts
```

## Reglas de Negocio

### 1. Determinación del Salario Base

| Tipo Comisionado | Regla |
|------------------|-------|
| FUNCIONARIO | Usa la asignación básica enviada. Si hay varias, toma la mayor. |
| CONTRATISTA | Usa la asignación básica enviada. Si hay varias, toma la mayor. |
| DOCENTE | Usa la asignación básica enviada. Si hay varias, toma la mayor. |
| ESTUDIANTE | Usa SMMLV 2026 ($1.423.500 COP). |
| INVESTIGADOR | Usa la tarifa diaria de la categoría de investigador. |

### 2. Búsqueda de Escala por Rango Salarial

Se consulta la tabla `escalas_viaticos` filtrando por `ano_vigencia = 2026` y por rango:

```sql
salario_base >= rango_minimo AND salario_base <= rango_maximo
```

Si no existe una escala para el salario, se lanza `BadRequestException`.

### 3. Factor por Tipo de Comisionado

| Tipo | Factor |
|------|--------|
| FUNCIONARIO | 1.0 |
| CONTRATISTA | 0.8 |
| DOCENTE | 1.0 |
| ESTUDIANTE | 1.0 |
| INVESTIGADOR | 1.0 |

### 4. Factor de Pernocta

| Pernocta | Factor | Observación |
|----------|--------|-------------|
| true | 1.0 | Aplica el 100% de la tarifa. |
| false | 0.5 | Aplica el 50% de la tarifa. Genera alerta. |

### 5. Cálculo de Días y Noches

- **Sin pernocta**: 1 día.
- **Con pernocta**: Diferencia en días entre `fecha_fin` y `fecha_inicio`, mínimo 1.

### 6. Desglose Diario

- **Sin pernocta**: 1 ítem con `pernocta: false`.
- **Con pernocta**: 1 ítem por cada noche, con fechas consecutivas desde `fecha_inicio`.

### 7. Redondeo COP

Todas las tarifas y totales se redondean a enteros usando `Math.round`.

### 8. Excepción Regional (Art. 5 Decreto 314 de 2026)

Cuando `aplicaExcepcionRegional = true` y se envía `destinoDepartamento`, se consulta la tabla `tarifas_regionales_excepcion`. Si existe una excepción activa para el departamento, se usa su `tarifa_diaria` y su `decreto_referencia`. Si no existe, se cae al flujo normal de escalas.

### 9. Caché en Memoria

Las consultas a las tablas de escalas, tarifas de investigadores y excepciones regionales se cachean en memoria con TTL de **5 minutos** para reducir carga en base de datos.

## API

### POST /liquidation/calculate

Calcula la autoliquidación de viáticos.

**Headers**
- `Authorization: Bearer <token>`
- Permiso requerido: `travel_expenses:read`

**Request Body**

```json
{
  "comisionadoId": "string (opcional)",
  "tipoComisionado": "FUNCIONARIO | CONTRATISTA | DOCENTE | ESTUDIANTE | INVESTIGADOR",
  "asignacionesBasicas": [4500000, 3200000],
  "categoriaInvestigador": "JUNIOR | ASOCIADO | SENIOR (opcional, requerido para INVESTIGADOR)",
  "fechaInicio": "YYYY-MM-DD",
  "fechaFin": "YYYY-MM-DD",
  "pernocta": true | false,
  "destinoCiudad": "string (opcional)",
  "destinoDepartamento": "string (opcional)",
  "aplicaExcepcionRegional": true | false (opcional)"
}
```

**Response**

```json
{
  "success": true,
  "data": {
    "salarioBaseAplicado": 4500000,
    "decretoAplicado": "Decreto 314 de 2026",
    "tarifaDiariaBase": 335520,
    "factorComisionado": 1,
    "factorPernocta": 1,
    "tarifaFinalAplicadaDia": 335520,
    "numeroDiasNoches": 2,
    "valorTotalViaticos": 671040,
    "desgloseCalculo": [
      {
        "dia": 1,
        "fecha": "2026-09-20",
        "valor": 335520,
        "pernocta": true
      },
      {
        "dia": 2,
        "fecha": "2026-09-21",
        "valor": 335520,
        "pernocta": true
      }
    ],
    "alertas": []
  }
}
```

### GET /liquidation/health

Health check del servicio.

```json
{
  "status": "ok",
  "service": "liquidation"
}
```

## Pruebas

### Backend

```bash
cd backend/travel-expenses-service
npx jest
```

**Cobertura de pruebas unitarias por proceso:**

1. Determinación de salario base
2. Búsqueda de escala por rango salarial
3. Factor por tipo de comisionado
4. Factor de pernocta (regla 50%)
5. Cálculo de días/noches
6. Generación de desglose diario
7. Redondeo COP
8. Caché en memoria
9. Excepción regional Art. 5
10. Validaciones de entrada

### Frontend

```bash
cd apps/mfe-viaticos
npx vitest run
```

## Migraciones y Datos Iniciales

```sql
-- Tablas
db/migrations/012_escalas_viaticos.sql

-- Semillas
db/migrations/seed_escalas_viaticos.sql
db/migrations/seed_tarifas_investigadores.sql
db/migrations/seed_tarifas_regionales_excepcion.sql
```

## Consideraciones

- Las fechas se parsean como fecha local (sin desfase UTC) para evitar errores de zona horaria.
- El redondeo COP se aplica en el valor final por día y en el total.
- El frontend integra el panel de liquidación dentro de `NuevaSolicitudModal` y consume el endpoint a través de `viaticosService.calcularLiquidacion`.
