-- ============================================================================
-- 025 · Salvedades y variantes de la matriz por modalidad
--
-- La matriz del Excel no es booleana. Además de SI y NO, doce celdas dicen
-- "si*" y ocho traen texto libre —"TVEC", "Comunicación de aceptación",
-- "Numeral 4 Artículo 2 de la Ley 1150 de 2007"—. Ese texto es la diferencia
-- entre "la actividad aplica igual que en las demás modalidades" y "aplica,
-- pero produce otro documento".
--
-- Hasta ahora se perdía: el generador del seed lo calculaba y solo lo escribía
-- para las celdas en NO, donde nunca hay ninguno. Las veinte celdas con
-- matiz quedaban en la base indistinguibles de un SI limpio, y la pantalla de
-- configuración no tenía cómo mostrar lo que la matriz sí dice.
--
-- Va en tabla aparte y no como columnas de actividades_excluidas porque son
-- casos opuestos: allí viven las que NO aplican, aquí las que aplican con
-- matiz. Meterlas juntas obligaría a que la ausencia de fila significara dos
-- cosas distintas según una bandera.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hiring.actividades_salvedad (
  numeral    varchar(20) NOT NULL REFERENCES hiring.actividades (numeral),
  modalidad  varchar(60) NOT NULL REFERENCES hiring.modalidades (codigo),
  -- El texto tal como lo escribió Contratación cuando la celda no dice SI:
  -- "TVEC", "Comunicación de aceptación". NULL cuando la celda es "si*", que
  -- marca una condición sin redactar.
  variante   text,
  -- Por qué la actividad no se comporta igual aquí. Siempre presente: es lo
  -- que se le muestra al administrador en la celda de la matriz.
  nota       text        NOT NULL,
  PRIMARY KEY (numeral, modalidad)
);

COMMENT ON TABLE hiring.actividades_salvedad IS
  'Celdas de la matriz donde la actividad aplica pero con una condición o una variante propia de la modalidad.';
