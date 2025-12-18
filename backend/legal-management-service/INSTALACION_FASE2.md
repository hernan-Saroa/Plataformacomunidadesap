# 🚀 Guía de Instalación Rápida - Fase 2

## ✅ Pre-requisitos Verificados
- ✅ NestJS instalado
- ✅ PostgreSQL corriendo
- ✅ Base de datos `esap_db` creada

---

## 📦 Paso 1: Ejecutar Migraciones SQL

### Windows
```cmd
cd ..\..\db
.\ejecutar_migraciones.bat
```

### Linux/Mac
```bash
cd ../../db
psql -U postgres -d esap_db -f init/011_schema_organos_control.sql
psql -U postgres -d esap_db -f init/012_seed_organos_control.sql
```

### Verificar Instalación
```sql
-- Conectarse a la base de datos
psql -U postgres -d esap_db

-- Verificar schema
\dn

-- Verificar tablas
\dt requerimientos_oc.*

-- Verificar datos
SELECT COUNT(*) FROM requerimientos_oc.cat_organismos_control;
-- Debe retornar: 25

SELECT COUNT(*) FROM requerimientos_oc.requerimientos;
-- Debe retornar: 5

-- Ver organismos
SELECT id, nombre, sigla, tipo FROM requerimientos_oc.cat_organismos_control ORDER BY id LIMIT 5;

-- Ver requerimientos
SELECT radicado_interno, estado, prioridad_calculada FROM requerimientos_oc.requerimientos;
```

---

## 📦 Paso 2: Instalar Dependencias (Si es necesario)

```bash
cd backend/legal-management-service
npm install
```

---

## 🚀 Paso 3: Iniciar el Servicio

```bash
npm run start:dev
```

**Salida esperada:**
```
[Nest] 12345  - 12/18/2025, 10:00:00 AM     LOG [NestFactory] Starting Nest application...
[Nest] 12345  - 12/18/2025, 10:00:00 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized
[Nest] 12345  - 12/18/2025, 10:00:00 AM     LOG [InstanceLoader] AppModule dependencies initialized
[Nest] 12345  - 12/18/2025, 10:00:01 AM     LOG [RoutesResolver] RequerimientoController {/api/oc}:
[Nest] 12345  - 12/18/2025, 10:00:01 AM     LOG [RouterExplorer] Mapped {/api/oc/requerimientos, POST} route
[Nest] 12345  - 12/18/2025, 10:00:01 AM     LOG [RouterExplorer] Mapped {/api/oc/requerimientos, GET} route
[Nest] 12345  - 12/18/2025, 10:00:01 AM     LOG [RouterExplorer] Mapped {/api/oc/requerimientos/stats, GET} route
[Nest] 12345  - 12/18/2025, 10:00:01 AM     LOG [RouterExplorer] Mapped {/api/oc/requerimientos/:id, GET} route
[Nest] 12345  - 12/18/2025, 10:00:01 AM     LOG [RouterExplorer] Mapped {/api/oc/requerimientos/:id/estado, PATCH} route
[Nest] 12345  - 12/18/2025, 10:00:01 AM     LOG [RouterExplorer] Mapped {/api/oc/requerimientos/search, POST} route
[Nest] 12345  - 12/18/2025, 10:00:01 AM     LOG [RouterExplorer] Mapped {/api/oc/organismos, GET} route
[Nest] 12345  - 12/18/2025, 10:00:01 AM     LOG [NestApplication] Nest application successfully started
```

---

## 🧪 Paso 4: Probar los Endpoints

### Opción A: Usando cURL

#### 1. Listar Organismos de Control
```bash
curl http://localhost:3006/api/oc/organismos
```

**Respuesta esperada:**
```json
[
  {
    "id": 1,
    "nombre": "Contraloría General de la República",
    "sigla": "CGR",
    "tipo": "CONTRALORIA",
    "nivel": "NACIONAL",
    "activo": true
  },
  ...
]
```

#### 2. Obtener Estadísticas
```bash
curl http://localhost:3006/api/oc/requerimientos/stats
```

**Respuesta esperada:**
```json
{
  "total": 5,
  "enPreparacion": 2,
  "enRevision": 1,
  "aprobado": 0,
  "enviado": 1,
  "cerrado": 1,
  ...
}
```

#### 3. Listar Requerimientos
```bash
curl http://localhost:3006/api/oc/requerimientos
```

#### 4. Crear Nuevo Requerimiento
```bash
curl -X POST http://localhost:3006/api/oc/requerimientos \
  -H "Content-Type: application/json" \
  -d "{\"radicadoExterno\":\"TEST-2025-001\",\"entidadId\":1,\"asunto\":\"Test de integración\",\"tipoRequerimiento\":\"INFORMACION\",\"fechaRecepcion\":\"2025-12-18\",\"diasPlazoOtorgado\":10}"
```

**Respuesta esperada:**
```json
{
  "id": "uuid-generado",
  "radicadoInterno": "OC-2025-00006",
  "radicadoExterno": "TEST-2025-001",
  "entidad": {
    "id": 1,
    "nombre": "Contraloría General de la República",
    "sigla": "CGR"
  },
  "fechaVencimiento": "2026-01-03",
  "estado": "EN_PREPARACION",
  "prioridadCalculada": "NORMAL"
}
```

### Opción B: Usando Postman

1. **Importar Colección:**
   - Abrir Postman
   - Import → File
   - Seleccionar: `backend/legal-management-service/Organos_Control_Postman_Collection.json`

2. **Configurar Variable de Entorno:**
   - En Postman, ir a Variables
   - Establecer `base_url` = `http://localhost:3006`

3. **Ejecutar Requests:**
   - Navegar por las carpetas:
     - Requerimientos (5 requests)
     - Dashboard y Estadísticas (1 request)
     - Organismos de Control (1 request)
     - Tests de Integración (6 tests)
     - Actualización de Estados (4 flujos)

---

## ✅ Verificación de Instalación

### Checklist de Verificación

- [ ] **Base de Datos:**
  - [ ] Schema `requerimientos_oc` creado
  - [ ] Tabla `cat_organismos_control` con 25 registros
  - [ ] Tabla `requerimientos` con 5 registros

- [ ] **Servicio Backend:**
  - [ ] Servicio iniciado sin errores
  - [ ] 7 rutas mapeadas correctamente
  - [ ] Conexión a BD establecida

- [ ] **Endpoints Funcionando:**
  - [ ] GET /api/oc/organismos retorna 25 organismos
  - [ ] GET /api/oc/requerimientos/stats retorna estadísticas
  - [ ] GET /api/oc/requerimientos retorna 5 requerimientos
  - [ ] POST /api/oc/requerimientos crea nuevo requerimiento

---

## 🔍 Troubleshooting

### Error: "Cannot connect to database"
```bash
# Verificar que PostgreSQL esté corriendo
psql -U postgres

# Verificar que la base de datos exista
\l

# Si no existe, crearla
CREATE DATABASE esap_db;
```

### Error: "Table does not exist"
```bash
# Re-ejecutar migraciones
cd db
psql -U postgres -d esap_db -f init/011_schema_organos_control.sql
psql -U postgres -d esap_db -f init/012_seed_organos_control.sql
```

### Error: "Port 3006 already in use"
```bash
# Cambiar puerto en src/main.ts
await app.listen(3007); // Cambiar a 3007

# O detener el proceso que usa el puerto 3006
# Windows:
netstat -ano | findstr :3006
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:3006 | xargs kill -9
```

### Error: "Module not found"
```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

---

## 📊 Datos de Prueba

### Organismos de Control Precargados

| ID | Nombre | Sigla | Tipo |
|----|--------|-------|------|
| 1 | Contraloría General de la República | CGR | CONTRALORIA |
| 6 | Procuraduría General de la Nación | PGN | PROCURADURIA |
| 8 | Ministerio de Educación Nacional | MEN | MINISTERIO |
| 12 | Superintendencia de Industria y Comercio | SIC | SUPERINTENDENCIA |

### Requerimientos de Ejemplo

| Radicado Interno | Entidad | Estado | Tipo |
|------------------|---------|--------|------|
| OC-2025-00001 | CGR | EN_PREPARACION | INFORMACION |
| OC-2025-00002 | PGN | ENVIADO | HALLAZGO |
| OC-2025-00003 | MEN | EN_REVISION | AUDITORIA |
| OC-2025-00004 | CB | EN_PREPARACION | AJUSTE |
| OC-2025-00005 | SIC | CERRADO | INFORMACION |

---

## 📚 Siguiente Paso

Una vez verificado que todo funciona correctamente:

1. **Integración con Frontend:**
   - Ver: `FASE2_INFRAESTRUCTURA_DASHBOARD.md` → Sección "Integración con Frontend"
   
2. **Testing Completo:**
   - Ejecutar toda la colección de Postman
   - Verificar flujos de estados
   - Probar búsqueda avanzada

3. **Despliegue:**
   - Ver: `README.md` → Sección "Despliegue"

---

## 🎉 ¡Instalación Completada!

Si todos los pasos anteriores funcionaron correctamente, la **Fase 2** está completamente instalada y funcionando.

**Próximos pasos sugeridos:**
1. Explorar los endpoints con Postman
2. Revisar la documentación técnica completa en `FASE2_INFRAESTRUCTURA_DASHBOARD.md`
3. Comenzar la integración con el frontend
4. Planificar la Fase 3 (Storage, Notificaciones, Reportes)

---

**¿Necesitas ayuda?**
- Revisa: `RESUMEN_FASE2_COMPLETADA.md` para ver todo lo implementado
- Revisa: `README.md` para documentación completa del servicio
- Revisa: `FASE2_INFRAESTRUCTURA_DASHBOARD.md` para detalles técnicos

🚀 **¡Disfruta del nuevo módulo de Órganos de Control!**

