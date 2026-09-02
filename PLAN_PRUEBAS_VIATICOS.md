# Plan de Pruebas - Módulo de Autoliquidación de Viáticos

## Resumen del Módulo

Implementación del cálculo de autoliquidación de viáticos según **Decreto 314 de 2026**. El módulo permite calcular automáticamente el valor de viáticos basándose en el tipo de comisionado, salario base, días de comisión y pernocta.

## Estado de Pruebas Automatizadas

### Backend (NestJS)
- **Tests unitarios**: 59/59 pasan
- **Cobertura**: Servicio de liquidación, controladores, entidades
- **Comando**: `cd backend/travel-expenses-service && npx jest`

### Frontend (React + Vitest)
- **Tests unitarios**: 35/37 pasan
- **Tests fallidos**: 2 tests por timeout (problema preexistente de rendimiento, no funcional)
- **Comando**: `cd apps/mfe-viaticos && npx vitest run`

## Configuración Previa

### 1. Base de Datos
```sql
-- Ejecutar migraciones
cd backend/travel-expenses-service
npm run migration:run

-- Poblar datos iniciales
psql -U usuario -d travel_expenses -f db/migrations/seed_escalas_viaticos.sql
psql -U usuario -d travel_expenses -f db/migrations/seed_tarifas_investigadores.sql
psql -U usuario -d travel_expenses -f db/migrations/seed_tarifas_regionales_excepcion.sql
```

### 2. Backend
```bash
cd backend/travel-expenses-service
npm install
npm run start:dev
```

### 3. Frontend
```bash
cd apps/mfe-viaticos
npm install
npm run dev
```

## Casos de Prueba Funcionales

### Grupo 1: Autenticación y Permisos

| ID | Caso | Pasos | Resultado Esperado |
|----|------|-------|-------------------|
| F-01 | Acceso sin token | 1. Abrir Postman<br>2. `POST /liquidation/calculate` sin header Authorization | `401 Unauthorized` |
| F-02 | Acceso con token inválido | 1. Enviar token inválido/expirado | `401 Unauthorized` |
| F-03 | Acceso con token válido pero sin permiso | 1. Usar token de usuario sin permiso `travel_expenses:read` | `403 Forbidden` |
| F-04 | Acceso con token y permiso válidos | 1. Usar token de usuario con permiso | `200 OK` |

### Grupo 2: Cálculo por Tipo de Comisionado

#### F-05: FUNCIONARIO - Con pernocta
```json
{
  "tipoComisionado": "FUNCIONARIO",
  "asignacionesBasicas": [4500000],
  "fechaInicio": "2026-09-20",
  "fechaFin": "2026-09-21",
  "pernocta": true,
  "destinoCiudad": "Bogotá"
}
```
**Validar:**
- `salarioBaseAplicado` = 4.500.000
- `factorComisionado` = 1.0
- `factorPernocta` = 1.0
- `tarifaDiariaBase` = corresponde a escala para $4.500.000
- `tarifaFinalAplicadaDia` = tarifaDiariaBase × 1.0 × 1.0 (redondeado)
- `numeroDiasNoches` = 2
- `valorTotalViaticos` = tarifaFinalAplicadaDia × 2
- `alertas` = undefined o vacío
- `desgloseCalculo` tiene 2 elementos con pernocta=true

#### F-06: FUNCIONARIO - Sin pernocta
```json
{
  "tipoComisionado": "FUNCIONARIO",
  "asignacionesBasicas": [4500000],
  "fechaInicio": "2026-09-20",
  "fechaFin": "2026-09-20",
  "pernocta": false,
  "destinoCiudad": "Bogotá"
}
```
**Validar:**
- `factorPernocta` = 0.5
- `alertas` contiene "Comisión sin pernoctación: Se aplicará el 50% de la tarifa."
- `numeroDiasNoches` = 1
- `desgloseCalculo` tiene 1 elemento con pernocta=false

#### F-07: CONTRATISTA - Con pernocta
```json
{
  "tipoComisionado": "CONTRATISTA",
  "asignacionesBasicas": [4500000],
  "fechaInicio": "2026-09-20",
  "fechaFin": "2026-09-21",
  "pernocta": true,
  "destinoCiudad": "Bogotá"
}
```
**Validar:**
- `factorComisionado` = 0.8
- `tarifaFinalAplicadaDia` = tarifaDiariaBase × 0.8 × 1.0 (redondeado)
- Debe ser menor que FUNCIONARIO con mismos parámetros

#### F-08: CONTRATISTA - Sin pernocta
```json
{
  "tipoComisionado": "CONTRATISTA",
  "asignacionesBasicas": [4500000],
  "fechaInicio": "2026-09-20",
  "fechaFin": "2026-09-20",
  "pernocta": false,
  "destinoCiudad": "Bogotá"
}
```
**Validar:**
- `factorComisionado` = 0.8
- `factorPernocta` = 0.5
- `tarifaFinalAplicadaDia` = tarifaDiariaBase × 0.8 × 0.5 (redondeado)

#### F-09: DOCENTE
```json
{
  "tipoComisionado": "DOCENTE",
  "asignacionesBasicas": [4500000],
  "fechaInicio": "2026-09-20",
  "fechaFin": "2026-09-21",
  "pernocta": true,
  "destinoCiudad": "Bogotá"
}
```
**Validar:**
- `factorComisionado` = 1.0
- Mismo comportamiento que FUNCIONARIO

#### F-10: ESTUDIANTE
```json
{
  "tipoComisionado": "ESTUDIANTE",
  "fechaInicio": "2026-09-20",
  "fechaFin": "2026-09-21",
  "pernocta": true,
  "destinoCiudad": "Bogotá"
}
```
**Validar:**
- `salarioBaseAplicado` = 1.423.500 (SMMLV 2026)
- `factorComisionado` = 1.0
- No requiere `asignacionesBasicas`

#### F-11: INVESTIGADOR - Categoría JUNIOR
```json
{
  "tipoComisionado": "INVESTIGADOR",
  "categoriaInvestigador": "JUNIOR",
  "fechaInicio": "2026-09-20",
  "fechaFin": "2026-09-21",
  "pernocta": true,
  "destinoCiudad": "Bogotá"
}
```
**Validar:**
- `salarioBaseAplicado` = tarifa de JUNIOR
- `tarifaDiariaBase` = tarifa de JUNIOR
- `factorComisionado` = 1.0

#### F-12: INVESTIGADOR - Categoría ASOCIADO
```json
{
  "tipoComisionado": "INVESTIGADOR",
  "categoriaInvestigador": "ASOCIADO",
  "fechaInicio": "2026-09-20",
  "fechaFin": "2026-09-21",
  "pernocta": true,
  "destinoCiudad": "Bogotá"
}
```
**Validar:**
- `salarioBaseAplicado` = tarifa de ASOCIADO
- `tarifaDiariaBase` = tarifa de ASOCIADO

#### F-13: INVESTIGADOR - Categoría SENIOR
```json
{
  "tipoComisionado": "INVESTIGADOR",
  "categoriaInvestigador": "SENIOR",
  "fechaInicio": "2026-09-20",
  "fechaFin": "2026-09-21",
  "pernocta": true,
  "destinoCiudad": "Bogotá"
}
```
**Validar:**
- `salarioBaseAplicado` = tarifa de SENIOR
- `tarifaDiariaBase` = tarifa de SENIOR

### Grupo 3: Doble Rol

#### F-14: Doble rol - Usa salario mayor
```json
{
  "tipoComisionado": "FUNCIONARIO",
  "asignacionesBasicas": [3500000, 5500000],
  "fechaInicio": "2026-09-20",
  "fechaFin": "2026-09-21",
  "pernocta": true,
  "destinoCiudad": "Bogotá"
}
```
**Validar:**
- `salarioBaseAplicado` = 5.500.000 (el mayor)
- Esca correspondiente a $5.500.000

### Grupo 4: Excepción Regional (Art. 5)

#### F-15: Excepción regional activa
```json
{
  "tipoComisionado": "FUNCIONARIO",
  "asignacionesBasicas": [4500000],
  "fechaInicio": "2026-09-20",
  "fechaFin": "2026-09-21",
  "pernocta": true,
  "destinoCiudad": "Cartagena",
  "destinoDepartamento": "Bolívar",
  "aplicaExcepcionRegional": true
}
```
**Validar:**
- `decretoAplicado` = decreto de la excepción regional
- `tarifaDiariaBase` = tarifa de la excepción regional
- Debe ser diferente a la escala normal

#### F-16: Excepción regional inactiva
```json
{
  "tipoComisionado": "FUNCIONARIO",
  "asignacionesBasicas": [4500000],
  "fechaInicio": "2026-09-20",
  "fechaFin": "2026-09-21",
  "pernocta": true,
  "destinoCiudad": "Bogotá",
  "aplicaExcepcionRegional": true
}
```
**Validar:**
- `decretoAplicado` = "Decreto 314 de 2026"
- Usa escala normal

### Grupo 5: Validaciones de Entrada

#### F-17: Fecha fin anterior a fecha inicio
```json
{
  "tipoComisionado": "FUNCIONARIO",
  "asignacionesBasicas": [4500000],
  "fechaInicio": "2026-09-21",
  "fechaFin": "2026-09-20",
  "pernocta": true,
  "destinoCiudad": "Bogotá"
}
```
**Resultado esperado:** `400 Bad Request` - "La fecha fin no puede ser anterior a la fecha inicio."

#### F-18: Fechas inválidas
```json
{
  "tipoComisionado": "FUNCIONARIO",
  "asignacionesBasicas": [4500000],
  "fechaInicio": "fecha-invalida",
  "fechaFin": "2026-09-20",
  "pernocta": true,
  "destinoCiudad": "Bogotá"
}
```
**Resultado esperado:** `400 Bad Request` - "Las fechas de inicio y fin son obligatorias y válidas."

#### F-19: Investigador sin categoría
```json
{
  "tipoComisionado": "INVESTIGADOR",
  "fechaInicio": "2026-09-20",
  "fechaFin": "2026-09-21",
  "pernocta": true,
  "destinoCiudad": "Bogotá"
}
```
**Resultado esperado:** `400 Bad Request` - "La categoría de investigador es obligatoria para tipo INVESTIGADOR."

#### F-20: Sin asignaciones básicas para funcionario
```json
{
  "tipoComisionado": "FUNCIONARIO",
  "fechaInicio": "2026-09-20",
  "fechaFin": "2026-09-21",
  "pernocta": true,
  "destinoCiudad": "Bogotá"
}
```
**Resultado esperado:** `400 Bad Request` - "No se encontró una escala de viáticos para el salario base 0."

### Grupo 6: Caché

#### F-21: Verificar caché de escalas
1. Primera llamada a `/liquidation/calculate` - verificar tiempo de respuesta
2. Segunda llamada con mismos parámetros - debe ser más rápida
3. Esperar 5 minutos
4. Tercera llamada - debe volver a consultar BD

**Resultado esperado:** Segunda llamada responde desde caché

### Grupo 7: Redondeo COP

#### F-22: Verificar redondeo
Usar valores que generen decimales:
```json
{
  "tipoComisionado": "CONTRATISTA",
  "asignacionesBasicas": [4500000],
  "fechaInicio": "2026-09-20",
  "fechaFin": "2026-09-21",
  "pernocta": true,
  "destinoCiudad": "Bogotá"
}
```
**Validar:**
- `tarifaFinalAplicadaDia` es entero (sin decimales)
- `valorTotalViaticos` es entero
- Usar `Math.round()` para redondeo

## Casos de Prueba de Integración Frontend-Backend

### IF-01: Flujo completo de solicitud
1. Abrir modal de nueva solicitud
2. Consultar comisionado por documento
3. Seleccionar tipo de comisionado
4. Ingresar asignaciones básicas (si aplica)
5. Seleccionar fechas
6. Seleccionar destino
7. Verificar cálculo automático en LiquidacionPanel
8. Hacer clic en "Aplicar" para transferir valores
9. Completar documentos
10. Radicar solicitud
11. Verificar en listado

### IF-02: Validación de campos monetarios
1. Ingresar texto en campo de viáticos → debe rechazarse
2. Ingresar números con formato → debe formatearse como moneda
3. Verificar que el total estimado se actualice automáticamente
4. Verificar que los valores se envíen correctamente al backend

### IF-03: Manejo de errores
1. Sin conexión a backend → verificar mensaje de error
2. Fechas inválidas → verificar validación frontend
3. Campos obligatorios vacíos → verificar mensajes

## Checklist de Aceptación

### Backend
- [ ] Todos los endpoints responden correctamente
- [ ] Cálculos matemáticos son exactos según Decreto 314 de 2026
- [ ] Redondeo COP funciona correctamente
- [ ] Validaciones de entrada funcionan
- [ ] Caché TTL 5 minutos funciona
- [ ] Excepción regional Art. 5 funciona
- [ ] Swagger documenta todos los endpoints
- [ ] Logs son claros para debugging

### Frontend
- [ ] Formulario se carga correctamente
- [ ] Campos monetarios se formatean como moneda
- [ ] LiquidacionPanel calcula en tiempo real
- [ ] Botón "Aplicar" transfiere valores al formulario
- [ ] Validaciones de fechas funcionan
- [ ] Manejo de errores es amigable
- [ ] Responsive en móvil y escritorio

### Datos
- [ ] Escalas de viáticas cargadas correctamente
- [ ] Tarifas de investigadores cargadas
- [ ] Excepciones regionales cargadas
- [ ] Migraciones ejecutadas sin errores

## Troubleshooting Común

### Backend no inicia
```bash
# Verificar puerto 3010 disponible
netstat -ano | findstr :3010

# Verificar logs
npm run start:dev
```

### Frontend no conecta con backend
```bash
# Verificar variable de entorno VITE_API_URL
# Debe apuntar a http://localhost:3010
```

### Tests lentos/faltan
```bash
# Backend - aumentar timeout si es necesario
npx jest --testTimeout=30000

# Frontend - verificar configuración en vitest.config.ts
```

## Contacto y Soporte

- **Documentación técnica**: `backend/travel-expenses-service/src/modules/liquidation/README.md`
- **Swagger UI**: `http://localhost:3010/docs`
- **Código fuente**: Ver archivos en `backend/travel-expenses-service/src/modules/liquidation/`
