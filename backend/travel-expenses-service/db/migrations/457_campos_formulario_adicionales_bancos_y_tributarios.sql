-- Migration: 457_campos_formulario_adicionales_bancos_y_tributarios.sql
-- Descripción: Registra en el catálogo (config_campos_formulario) los campos dinámicos
--              paramétricos de información bancaria y obligación tributaria con sus
--              identificadores únicos, etiquetas, tipos, placeholders y opciones JSONB exactas.

SET client_encoding = 'UTF8';
SET search_path TO travel_expenses, public;

BEGIN;

INSERT INTO travel_expenses.config_campos_formulario
  (id, clave, etiqueta, tipo_campo, placeholder, opciones, grupo, orden, activo)
VALUES
  (
    'b9d70e39-bf34-4c5a-9881-d15fd3563bf9'::uuid,
    'tipo_cuenta',
    'Tipo de cuenta',
    'SELECT',
    'tipo de cuenta bancaría',
    '[{"label": "Cuenta de Ahorros", "value": "AHORROS"}, {"label": "Cuenta Corriente", "value": "CORRIENTE"}]'::jsonb,
    'comision',
    4,
    TRUE
  ),
  (
    '05531d61-c693-46a3-a373-1fbf32686eef'::uuid,
    'entidad_bancaria',
    'Entidad Bancaria',
    'SELECT',
    'Seleccione entidad bancaría',
    '[{"label": "Bancolombia", "value": "BANCOLOMBIA"}, {"label": "Banco de Bogotá", "value": "BANCO DE BOGOTA"}, {"label": "Davivienda", "value": "DAVIVIENDA"}, {"label": "Banco de Occidente", "value": "BANCO DE OCCIDENTE"}, {"label": "Banco Popular", "value": "BANCO POPULAR"}, {"label": "BBVA Colombia", "value": "BBVA COLOMBIA"}, {"label": "Banco Caja Social", "value": "BANCO CAJA SOCIAL"}, {"label": "Banco Agrario de Colombia", "value": "BANCO AGRARIO DE COLOMBIA"}, {"label": "Banco AV Villas", "value": "BANCO AV VILLAS"}, {"label": "Banco Falabella", "value": "BANCO FALABELLA"}, {"label": "Banco Finandina", "value": "BANCO FINANDINA"}, {"label": "Banco Pichincha", "value": "BANCO PICHINCHA"}, {"label": "Banco W", "value": "BANCO W"}, {"label": "Bancoomeva", "value": "BANCOOMEVA"}, {"label": "Scotiabank Colpatria", "value": "SCOTIABANK COLPATRIA"}, {"label": "Banco GNB Sudameris", "value": "BANCO GNB SUDAMERIS"}, {"label": "Itaú Colombia", "value": "ITAÚ COLOMBIA"}, {"label": "Citibank Colombia", "value": "CITIBANK COLOMBIA"}, {"label": "Lulo Bank", "value": "LULO BANK"}, {"label": "Bancamía", "value": "BANCO BANCAMIA"}, {"label": "Banco BTG Pactual Colombia", "value": "BANCO BTG PACTUAL COLOMBIA"}, {"label": "Banco Contactar", "value": "BANCO CONTACTAR"}, {"label": "Ban100", "value": "BAN100"}, {"label": "Banco Santander Colombia", "value": "BANCO SANTANDER COLOMBIA"}, {"label": "Banco Serfinanza", "value": "BANCO SERFINANZA"}, {"label": "Banco Cooperativo Coopcentral", "value": "BANCO COOPERATIVO COOPCENTRAL"}, {"label": "Banco Mundo Mujer", "value": "BANCO MUNDO MUJER"}, {"label": "Banco de la Microempresa de Colombia", "value": "BANCO DE LA MICROEMPRESA DE COLOMBIA"}, {"label": "Banco Unión", "value": "BANCO UNION"}, {"label": "Banco J.P. Morgan Colombia", "value": "BANCO JP MORGAN COLOMBIA"}, {"label": "Davibank", "value": "BANCO DAVIBANK"}, {"label": "Revolut Bank Colombia", "value": "BANCO REVOLUT COLOMBIA"}, {"label": "Otros", "value": "OTROS"}]'::jsonb,
    'comision',
    5,
    TRUE
  ),
  (
    '7db6aab1-408f-4ffe-8f90-a960e95beb74'::uuid,
    'num_cuenta',
    'Numero de cuenta',
    'NUMBER',
    'numero de cuenta bancaria',
    NULL,
    'comision',
    6,
    TRUE
  ),
  (
    '30fa89eb-81c0-433e-9c32-c7bc1c7d8b48'::uuid,
    'obligacion_tributaria',
    'Esta obligado a facturación electronica',
    'BOOLEAN',
    'Selecciona si esta obligado a facturar electronicamente',
    NULL,
    'comision',
    6,
    TRUE
  )
ON CONFLICT (clave) DO UPDATE SET
  etiqueta = EXCLUDED.etiqueta,
  tipo_campo = EXCLUDED.tipo_campo,
  placeholder = EXCLUDED.placeholder,
  opciones = EXCLUDED.opciones,
  grupo = EXCLUDED.grupo,
  orden = EXCLUDED.orden,
  activo = EXCLUDED.activo,
  actualizado_en = NOW();

COMMIT;
