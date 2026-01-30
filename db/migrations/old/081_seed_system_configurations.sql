-- Seed default system configurations for legal modules
-- This populates the system_configurations table with initial values
-- that match the frontend defaults (ConfiguracionesSIGLContext.tsx)

-- Defensa Judicial Configuration
INSERT INTO "legal_management"."system_configurations" ("key", "module", "value", "description")
VALUES (
    'defensa-judicial',
    'defensa-judicial',
    '{
        "id": "defensa-judicial",
        "nombre": "Defensa Judicial",
        "estados": [
            {"id": "NOTIFICADA", "nombre": "Notificada", "color": "#3B82F6", "orden": 1, "activo": true},
            {"id": "CONTESTACIÓN", "nombre": "Contestación", "color": "#8B5CF6", "orden": 2, "activo": true},
            {"id": "PROBATORIA", "nombre": "Probatoria", "color": "#06B6D4", "orden": 3, "activo": true},
            {"id": "ALEGATOS", "nombre": "Alegatos", "color": "#EC4899", "orden": 4, "activo": true},
            {"id": "SENTENCIA", "nombre": "Sentencia", "color": "#10B981", "orden": 5, "activo": true},
            {"id": "APELACIÓN", "nombre": "Apelación", "color": "#F59E0B", "orden": 6, "activo": true},
            {"id": "CUMPLIMIENTO", "nombre": "Cumplimiento", "color": "#6B7280", "orden": 7, "activo": true}
        ],
        "tiempos": [
            {"id": "estudio-inicial", "tipo": "Estudio Inicial", "dias": 5, "alertaDias": 2, "activo": true},
            {"id": "contestacion-demanda", "tipo": "Contestación Demanda", "dias": 30, "alertaDias": 7, "activo": true},
            {"id": "presentacion-pruebas", "tipo": "Presentación Pruebas", "dias": 20, "alertaDias": 5, "activo": true},
            {"id": "alegatos-conclusion", "tipo": "Alegatos de Conclusión", "dias": 15, "alertaDias": 3, "activo": true}
        ],
        "tiposProcesos": [
            {"id": "reparacion-directa", "nombre": "Reparación Directa", "descripcion": "Acción para obtener indemnización de perjuicios.", "plazo": 30, "alertaDias": 7, "activo": true},
            {"id": "nulidad-restablecimiento", "nombre": "Nulidad y Restablecimiento del Derecho", "descripcion": "Acción para declarar la nulidad de un acto administrativo.", "plazo": 20, "alertaDias": 5, "activo": true},
            {"id": "accion-grupo", "nombre": "Acción de Grupo", "descripcion": "Acción interpuesta por un grupo de personas.", "plazo": 40, "alertaDias": 10, "activo": true},
            {"id": "accion-popular", "nombre": "Acción Popular", "descripcion": "Acción para la protección de derechos colectivos.", "plazo": 25, "alertaDias": 5, "activo": true},
            {"id": "controversias-contractuales", "nombre": "Controversias Contractuales", "descripcion": "Acción para resolver controversias de contratos estatales.", "plazo": 35, "alertaDias": 7, "activo": true},
            {"id": "tutela", "nombre": "Tutela", "descripcion": "Acción para la protección de derechos fundamentales.", "plazo": 10, "alertaDias": 2, "activo": true},
            {"id": "proceso-ejecutivo", "nombre": "Proceso Ejecutivo", "descripcion": "Proceso para el cobro de obligaciones.", "plazo": 20, "alertaDias": 5, "activo": true},
            {"id": "otro", "nombre": "Otro", "descripcion": "Otros tipos de procesos judiciales.", "plazo": 15, "alertaDias": 3, "activo": true}
        ]
    }'::jsonb,
    'Configuración de etapas, tiempos y tipos de procesos para el módulo Defensa Judicial'
)
ON CONFLICT ("key") DO UPDATE SET 
    "value" = EXCLUDED."value",
    "updated_at" = now();

-- Juzgamiento Disciplinario Configuration
INSERT INTO "legal_management"."system_configurations" ("key", "module", "value", "description")
VALUES (
    'juzgamiento',
    'juzgamiento',
    '{
        "id": "juzgamiento",
        "nombre": "Juzgamiento Disciplinario",
        "estados": [
            {"id": "E1_AVOCAMIENTO", "nombre": "Avocamiento", "color": "#3B82F6", "orden": 1, "activo": true},
            {"id": "E2_DESCARGOS", "nombre": "Descargos", "color": "#8B5CF6", "orden": 2, "activo": true},
            {"id": "E3_PRUEBAS", "nombre": "Pruebas", "color": "#06B6D4", "orden": 3, "activo": true},
            {"id": "E4_ALEGATOS", "nombre": "Alegatos", "color": "#EC4899", "orden": 4, "activo": true},
            {"id": "E5_FALLO_1I", "nombre": "Fallo 1ª Instancia", "color": "#10B981", "orden": 5, "activo": true},
            {"id": "E6_APELACIÓN", "nombre": "Apelación", "color": "#F59E0B", "orden": 6, "activo": true},
            {"id": "E7_FALLO_2I", "nombre": "Fallo 2ª Instancia", "color": "#6B7280", "orden": 7, "activo": true}
        ],
        "tiempos": [
            {"id": "indagacion-preliminar", "tipo": "Indagación Preliminar", "dias": 6, "alertaDias": 2, "activo": true},
            {"id": "descargos-investigado", "tipo": "Descargos Investigado", "dias": 10, "alertaDias": 3, "activo": true},
            {"id": "fallo-primera-instancia", "tipo": "Fallo Primera Instancia", "dias": 30, "alertaDias": 7, "activo": true}
        ]
    }'::jsonb,
    'Configuración de etapas y tiempos para el módulo Juzgamiento Disciplinario'
)
ON CONFLICT ("key") DO UPDATE SET 
    "value" = EXCLUDED."value",
    "updated_at" = now();

-- Asesoría Jurídica (Consulta Jurídica) Configuration
INSERT INTO "legal_management"."system_configurations" ("key", "module", "value", "description")
VALUES (
    'asesoria-juridica',
    'asesoria-juridica',
    '{
        "id": "asesoria-juridica",
        "nombre": "Asesoría Jurídica",
        "estados": [
            {"id": "RADICADA", "nombre": "Radicada", "color": "#3B82F6", "orden": 1, "activo": true},
            {"id": "ANÁLISIS", "nombre": "En Análisis", "color": "#8B5CF6", "orden": 2, "activo": true},
            {"id": "RESPUESTA", "nombre": "En Respuesta", "color": "#F59E0B", "orden": 3, "activo": true},
            {"id": "ENVIADA", "nombre": "Enviada", "color": "#10B981", "orden": 4, "activo": true}
        ],
        "tiempos": [
            {"id": "analisis-inicial", "tipo": "Análisis Inicial", "dias": 3, "alertaDias": 1, "activo": true},
            {"id": "emision-concepto", "tipo": "Emisión Concepto", "dias": 10, "alertaDias": 3, "activo": true},
            {"id": "revision-superior", "tipo": "Revisión Superior", "dias": 5, "alertaDias": 2, "activo": true}
        ]
    }'::jsonb,
    'Configuración de etapas y tiempos para el módulo Asesoría Jurídica (Consultas)'
)
ON CONFLICT ("key") DO UPDATE SET 
    "value" = EXCLUDED."value",
    "updated_at" = now();
