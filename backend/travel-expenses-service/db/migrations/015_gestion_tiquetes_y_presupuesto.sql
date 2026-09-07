-- Migration: gestion tiquetes, restricciones y saldo presupuestal
-- Created: 2026-09-03
-- Description: RF-LIQ-003 / RF-LIQ-004 — Crea saldos_tiquetes,
--   rutas_restringidas, excepciones_autorizadas_tiquetes y el parámetro
--   global HOLGURA_TIQUETES_PORCENTAJE para absorber la volatilidad del
--   precio del tiquete aéreo.

CREATE TABLE IF NOT EXISTS travel_expenses.saldos_tiquetes (
    id                          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    dependencia_id              VARCHAR(100)    NOT NULL UNIQUE,
    nombre_dependencia          VARCHAR(150)    NOT NULL,
    presupuesto_inicial         NUMERIC(12, 2)  NOT NULL CHECK (presupuesto_inicial >= 0),
    presupuesto_reservado       NUMERIC(12, 2)  NOT NULL DEFAULT 0 CHECK (presupuesto_reservado >= 0),
    presupuesto_disponible      NUMERIC(12, 2)  NOT NULL,
    holgura_porcentaje          NUMERIC(5, 2)   NOT NULL DEFAULT 15.00
                                CHECK (holgura_porcentaje >= 0 AND holgura_porcentaje <= 100),
    activo                      BOOLEAN         NOT NULL DEFAULT TRUE,
    creado_en                   TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizado_en              TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saldos_tiquetes_activo
    ON travel_expenses.saldos_tiquetes (activo);

CREATE TABLE IF NOT EXISTS travel_expenses.rutas_restringidas (
    id                          SERIAL          PRIMARY KEY,
    origen_ciudad               VARCHAR(100)    NOT NULL,
    destino_ciudad              VARCHAR(100)    NOT NULL,
    descripcion_restriccion     VARCHAR(255),
    activo                      BOOLEAN         NOT NULL DEFAULT TRUE,
    creado_en                   TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_rutas_restringidas UNIQUE (origen_ciudad, destino_ciudad)
);

CREATE INDEX IF NOT EXISTS idx_rutas_restringidas_activo
    ON travel_expenses.rutas_restringidas (activo);

INSERT INTO travel_expenses.rutas_restringidas (origen_ciudad, destino_ciudad, descripcion_restriccion) VALUES
    ('IBAGUE',         'BOGOTA',         'Ruta corta restringida. Requiere autorización del Director Nacional o Sindicato.'),
    ('BOGOTA',         'IBAGUE',         'Ruta corta restringida. Requiere autorización del Director Nacional o Sindicato.'),
    ('VILLAVICENCIO',  'BOGOTA',         'Ruta corta restringida. Requiere autorización del Director Nacional o Sindicato.'),
    ('BOGOTA',         'VILLAVICENCIO',  'Ruta corta restringida. Requiere autorización del Director Nacional o Sindicato.')
ON CONFLICT (origen_ciudad, destino_ciudad) DO NOTHING;

CREATE TABLE IF NOT EXISTS travel_expenses.excepciones_autorizadas_tiquetes (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitud_id                    UUID NOT NULL,
    tipo_excepcion                  VARCHAR(50) NOT NULL
                                    CHECK (tipo_excepcion IN ('RUTA_CORTA', 'PRESUPUESTO_AGOTADO')),
    autorizado_por                  VARCHAR(150) NOT NULL
                                    CHECK (autorizado_por IN ('DIRECTOR_NACIONAL', 'SINDICATO')),
    numero_documento_soporte        VARCHAR(100) NOT NULL,
    documento_soporte_url           VARCHAR(500),
    comentarios                     TEXT,
    creado_en                       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_excep_tiquetes_solicitud
    ON travel_expenses.excepciones_autorizadas_tiquetes (solicitud_id);
CREATE INDEX IF NOT EXISTS idx_excep_tiquetes_tipo
    ON travel_expenses.excepciones_autorizadas_tiquetes (tipo_excepcion);

INSERT INTO travel_expenses.liquidation_params (clave, valor, tipo, descripcion)
VALUES (
    'HOLGURA_TIQUETES_PORCENTAJE',
    '15',
    'NUMBER',
    'Holgura porcentual aplicada a la reserva presupuestal de tiquetes para absorber fluctuaciones de tarifa aérea (RF-LIQ-004).'
)
ON CONFLICT (clave) DO NOTHING;