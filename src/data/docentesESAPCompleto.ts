/**
 * BASE DE DATOS COMPLETA DE DOCENTES ESAP - 263 DOCENTES
 * 
 * Período: 2025-1 (Actualizado: Diciembre 2024)
 * Fuente: Base_Datos_Docentes_ESAP.md
 * 
 * Todos los docentes transformados a formato UserWithSedes
 * para integración directa con módulo de personas
 */

import { UserWithSedes } from './mockUsersWithSedes';

// Mapeo de territoriales a códigos de sede
const TERRITORIAL_MAP: { [key: string]: { id: string, codigo: string, nombre: string, ciudad: string } } = {
  'SEDE_CENTRAL': { id: 'sede-nacional', codigo: 'ESAP-NAC', nombre: 'Sede Nacional', ciudad: 'Bogotá D.C.' },
  'ANTIOQUIA': { id: 'ter-antioquia', codigo: 'ESAP-ANT', nombre: 'Territorial Antioquia', ciudad: 'Medellín' },
  'ATLÁNTICO': { id: 'ter-atlantico', codigo: 'ESAP-ATL', nombre: 'Territorial Atlántico', ciudad: 'Barranquilla' },
  'BOLÍVAR': { id: 'ter-bolivar', codigo: 'ESAP-BOL', nombre: 'Territorial Bolívar', ciudad: 'Cartagena' },
  'BOYACÁ': { id: 'ter-boyaca', codigo: 'ESAP-BOY', nombre: 'Territorial Boyacá', ciudad: 'Tunja' },
  'CALDAS': { id: 'ter-caldas', codigo: 'ESAP-CAL', nombre: 'Territorial Caldas', ciudad: 'Manizales' },
  'CAUCA': { id: 'ter-cauca', codigo: 'ESAP-CAU', nombre: 'Territorial Cauca', ciudad: 'Popayán' },
  'CHOCÓ': { id: 'ter-choco', codigo: 'ESAP-CHO', nombre: 'Territorial Chocó', ciudad: 'Quibdó' },
  'CUNDINAMARCA': { id: 'ter-cundinamarca', codigo: 'ESAP-CUN', nombre: 'Territorial Cundinamarca', ciudad: 'Zipaquirá' },
  'HUILA': { id: 'ter-huila', codigo: 'ESAP-HUI', nombre: 'Territorial Huila', ciudad: 'Neiva' },
  'META': { id: 'ter-meta', codigo: 'ESAP-MET', nombre: 'Territorial Meta', ciudad: 'Villavicencio' },
  'NARIÑO': { id: 'ter-narino', codigo: 'ESAP-NAR', nombre: 'Territorial Nariño', ciudad: 'Pasto' },
  'NORTESANTANDER': { id: 'ter-nortesantander', codigo: 'ESAP-NSA', nombre: 'Territorial Norte de Santander', ciudad: 'Cúcuta' },
  'RISARALDA': { id: 'ter-risaralda', codigo: 'ESAP-RIS', nombre: 'Territorial Risaralda', ciudad: 'Pereira' },
  'SANTANDER': { id: 'ter-santander', codigo: 'ESAP-SAN', nombre: 'Territorial Santander', ciudad: 'Bucaramanga' },
  'TOLIMA': { id: 'ter-tolima', codigo: 'ESAP-TOL', nombre: 'Territorial Tolima', ciudad: 'Ibagué' },
  'VALLE': { id: 'ter-valle', codigo: 'ESAP-VAL', nombre: 'Territorial Valle del Cauca', ciudad: 'Cali' },
};

// Datos brutos de docentes (nombre, territorial, categoría, formación, vinculación)
const DOCENTES_RAW = [
  // ANTIOQUIA (8 docentes)
  ['BELTRAN DE JESUS RESTREPO ARREDONDO', 'ANTIOQUIA', 'Titular', 'Maestría', 'Ocasional'],
  ['DELIO ALEXANDER BALCAZAR CAMACHO', 'ANTIOQUIA', 'Asociado', 'Doctorado', 'Carrera2'],
  ['DIEGO ARMANDO JURADO ZAMBRANO', 'ANTIOQUIA', 'Asistente', 'Maestría', 'Carrera2'],
  ['GEYDI DAHIANA DEMARCHI SANCHEZ', 'ANTIOQUIA', 'Titular', 'Doctorado', 'Ocasional'],
  ['JOSE MIGUEL MAYORGA GONZALEZ', 'ANTIOQUIA', 'Titular', 'Doctorado', 'Carrera2'],
  ['JUAN DE JESUS SANDOVAL', 'ANTIOQUIA', 'Titular', 'Doctorado', 'Carrera2'],
  ['LYDA MARCELA HERRERA CAMARGO', 'ANTIOQUIA', 'Asociado', 'Maestría', 'Ocasional'],
  ['SERGIO ALBERTO CHICA VELEZ', 'ANTIOQUIA', 'Asistente', 'Magister cursando Doctorado', 'Carrera2'],

  // ATLÁNTICO (20 docentes)
  ['ALVARO LUIS MERCADO SUAREZ', 'ATLÁNTICO', 'Auxiliar', 'Maestría', 'Periodo de Prueba'],
  ['ANTONIO YESID PEDROZA ESTRADA', 'ATLÁNTICO', 'Titular', 'Doctorado', 'Ocasional'],
  ['CLARA INES COLLAZOS MARTINEZ', 'ATLÁNTICO', 'Titular', 'Maestría', 'Ocasional'],
  ['EDWIN MANUEL TAPIA GONGORA', 'ATLÁNTICO', 'Asistente', 'Maestría', 'Carrera2'],
  ['FREDYS PADILLA GONZALEZ', 'ATLÁNTICO', 'Auxiliar', 'Doctorado', 'Periodo de Prueba'],
  ['HORTENSIA DEL SOCORRO PEREZ VARGAS', 'ATLÁNTICO', 'Asociado', 'Maestría', 'Ocasional'],
  ['JAVIER ENRIQUE DE LA HOZ MERCADO', 'ATLÁNTICO', 'Asociado', 'Especialización', 'Ocasional'],
  ['JOAQUIN BELTRAN RADA', 'ATLÁNTICO', 'Titular', 'Maestría', 'Ocasional'],
  ['JORGE MEJIA TURIZO', 'ATLÁNTICO', 'Asistente', 'Doctorado', 'Periodo de Prueba'],
  ['JOSE GREGORIO SOLORZANO MOVILLA', 'ATLÁNTICO', 'Asistente', 'Maestría', 'Carrera2'],
  ['JOSE MARIA JIMENEZ MUNIVE', 'ATLÁNTICO', 'Asistente', 'Maestría', 'Carrera2'],
  ['MARCELA BIBIANA GUERRERO ROJAS', 'ATLÁNTICO', 'Auxiliar', 'Maestría', 'Periodo de Prueba'],
  ['MARINO RENGIFO GARCIA', 'ATLÁNTICO', 'Auxiliar', 'Maestría', 'Periodo de Prueba'],
  ['NADIN ANDRES MADERA ARIAS', 'ATLÁNTICO', 'Auxiliar', 'Maestría', 'Periodo de Prueba'],
  ['ROSALVINA ALVIS BARRANCO', 'ATLÁNTICO', 'Asociado', 'Doctorado', 'Carrera2'],
  ['SILVIA MARGARITA BALDIRIS NAVARRO', 'ATLÁNTICO', 'Titular', 'Doctorado', 'Periodo de Prueba'],
  ['SIMON MARTINEZ URBANEZ', 'ATLÁNTICO', 'Asociado', 'Maestría', 'Ocasional'],
  ['WENDY LORAINE DE LEON ZAMORA', 'ATLÁNTICO', 'Auxiliar', 'Maestría', 'Carrera2'],
  ['WILLIAM DE JESUS MANJARRES DE AVILA', 'ATLÁNTICO', 'Asistente', 'Maestría', 'Carrera2'],
  ['YOVANNY ORLANDO ROMERO RAMIREZ', 'ATLÁNTICO', 'Asistente', 'Especialización', 'Ocasional'],

  // BOLÍVAR (14 docentes)
  ['BLAS MELENDEZ CARABALLO', 'BOLÍVAR', 'Titular', 'Doctorado', 'Carrera2'],
  ['CAMILO JOSE URIBE OTERO', 'BOLÍVAR', 'Asociado', 'Maestría', 'Ocasional'],
  ['CARLOS ANDRES BROCHET BAYONA', 'BOLÍVAR', 'Asociado', 'Maestría', 'Ocasional'],
  ['CAYETANO JIMENEZ MUNIVE', 'BOLÍVAR', 'Asistente', 'Maestría', 'Periodo de Prueba'],
  ['JAKELINE VARGAS PARRA', 'BOLÍVAR', 'Asistente', 'Doctorado', 'Carrera2'],
  ['JOSE LUIS SILVA SUAREZ', 'BOLÍVAR', 'Auxiliar', 'Maestría', 'Carrera2'],
  ['LADY ANDREA SUAREZ CARVAJAL', 'BOLÍVAR', 'Asistente', 'Maestría', 'Carrera2'],
  ['MANUEL ESTEBAN PERALTA MATOS', 'BOLÍVAR', 'Titular', 'Maestría', 'Ocasional'],
  ['MARA LUZ AMADOR GIL', 'BOLÍVAR', 'Asociado', 'Maestría', 'Ocasional'],
  ['MARY CRUZ ORTEGA HERNANDEZ', 'BOLÍVAR', 'Auxiliar', 'Doctorado', 'Periodo de Prueba'],
  ['MAURICIO JAVIER LUNA GALVAN', 'BOLÍVAR', 'Auxiliar', 'Maestría', 'Carrera2'],
  ['MONICA PATRICIA FORTICH NAVARRO', 'BOLÍVAR', 'Asistente', 'Doctorado', 'Carrera2'],
  ['RAMIRO ENRIQUE SALAZAR RAMOS', 'BOLÍVAR', 'Asistente', 'Maestría', 'Carrera2'],
  ['WILSON HERNANDO LADINO ORJUELA', 'BOLÍVAR', 'Titular', 'Doctorado', 'Carrera1'],

  // BOYACÁ (13 docentes)
  ['FABIAN LEONARDO ROMERO BOLIVAR', 'BOYACÁ', 'Auxiliar', 'Maestría', 'Periodo de Prueba'],
  ['GILMA SOCORRO VANEGAS ROMERO', 'BOYACÁ', 'Auxiliar', 'Especialización', 'Ocasional'],
  ['GLADYS ANDREA TORRES ESTEPA', 'BOYACÁ', 'Titular', 'Doctorado y Posdoctorado', 'Carrera2'],
  ['HENRY ERNESTO GONZALEZ BECERRA', 'BOYACÁ', 'Asistente', 'Maestría', 'Carrera2'],
  ['JENNY ELISA LOPEZ RODRIGUEZ', 'BOYACÁ', 'Titular', 'Doctorado', 'Carrera2'],
  ['JONNY FERNANDO BARRETO CASTAÑEDA', 'BOYACÁ', 'Auxiliar', 'Doctorado', 'Carrera2'],
  ['JULIAN CAMILO BARRETO GARCIA', 'BOYACÁ', 'Asistente', 'Maestría', 'Carrera2'],
  ['JULIETH KARINA ROJAS GRANADOS', 'BOYACÁ', 'Asociado', 'Maestría', 'Ocasional'],
  ['JULIO CESAR CARO MORENO', 'BOYACÁ', 'Titular', 'Doctorado', 'Carrera2'],
  ['LADY CAROLINA BAYONA ESTUPIÑAN', 'BOYACÁ', 'Asistente', 'Maestría', 'Carrera2'],
  ['NELSON ANDRES MONTERO RAMIREZ', 'BOYACÁ', 'Asociado', 'Maestría', 'Ocasional'],
  ['ORLANDO MORENO MORENO', 'BOYACÁ', 'Auxiliar', 'Maestría', 'Ocasional'],
  ['WILLIAM HERNANDO ALFONSO PIÑA', 'BOYACÁ', 'Titular', 'Doctorado', 'Carrera2'],

  // CALDAS (10 docentes)
  ['ARISTIDES PEÑA ZUÑIGA', 'CALDAS', 'Asistente', 'Maestría', 'Carrera2'],
  ['CARLOS ANDRES BARCO ROJAS', 'CALDAS', 'Auxiliar', 'Doctorado', 'Carrera2'],
  ['CARLOS EDUARDO GARCIA LOPEZ', 'CALDAS', 'Titular', 'Doctorado', 'Ocasional'],
  ['CAROLINA GARCIA SANCHEZ', 'CALDAS', 'Asociado', 'Maestría', 'Ocasional'],
  ['CLAUDIA JURADO ALVARAN', 'CALDAS', 'Titular', 'Doctorado', 'Ocasional'],
  ['GUSTAVO ADOLFO MUÑOZ GAVIRIA', 'CALDAS', 'Titular', 'Doctorado', 'Carrera2'],
  ['JOSE FERNANDO MUÑOZ OSPINA', 'CALDAS', 'Titular', 'Doctorado', 'Carrera2'],
  ['JOSE RICARDO ALVAREZ PUERTO', 'CALDAS', 'Asociado', 'Maestría', 'Ocasional'],
  ['LUIS CARLOS TORO MARULANDA', 'CALDAS', 'Titular', 'Doctorado', 'Ocasional'],
  ['SILVIO LEON ROSERO OTERO', 'CALDAS', 'Auxiliar', 'Maestría', 'Carrera2'],

  // CAUCA (14 docentes)
  ['CARLOS ALBERTO GUTIERREZ SALAZAR', 'CAUCA', 'Titular', 'Doctorado', 'Ocasional'],
  ['CARLOS ANDRES LEITON PIAMBA', 'CAUCA', 'Asistente', 'Maestría', 'Ocasional'],
  ['CHRISTIAN FELIPE ORTEGA GOMEZ', 'CAUCA', 'Asociado', 'Maestría', 'Ocasional'],
  ['FABIAN ENRIQUE SALAZAR VILLANO', 'CAUCA', 'Asistente', 'Doctorado', 'Carrera2'],
  ['FRANSISCO JAVIER VARGAS CRUZ', 'CAUCA', 'Auxiliar', 'Especialización', 'Ocasional'],
  ['GERMAN ANDRES MOLINA GARRIDO', 'CAUCA', 'Titular', 'Doctorado', 'Carrera2'],
  ['JHON FREDY GALVIS PEREZ', 'CAUCA', 'Asociado', 'Maestría', 'Ocasional'],
  ['JOSE ENRIQUE URRESTE CAMPO', 'CAUCA', 'Asistente', 'Doctorado', 'Carrera2'],
  ['LORENZO ANTONIO NOGUERA', 'CAUCA', 'Titular', 'Doctorado', 'Ocasional'],
  ['MARIA FERNANDA PERALTA GOYES', 'CAUCA', 'Asociado', 'Maestría', 'Ocasional'],
  ['OSCAR EDUARDO VALENCIA MESA', 'CAUCA', 'Auxiliar', 'Maestría', 'Carrera2'],
  ['RONALD ALEJANDRO MACUACE OTERO', 'CAUCA', 'Asistente', 'Doctorado', 'Carrera1'],
  ['WILLIAM BERNARDO MACIAS OROZCO', 'CAUCA', 'Asistente', 'Maestría', 'Carrera2'],
  ['YULIETH KARINA MERA PAZ', 'CAUCA', 'Auxiliar', 'Maestría', 'Periodo de Prueba'],

  // CHOCÓ (6 docentes)
  ['BIAFARA DE JESUS LEDEZMA GARCIA', 'CHOCÓ', 'Auxiliar', 'Especialización', 'Ocasional'],
  ['DHORTON PINO SERNA', 'CHOCÓ', 'Asociado', 'Maestría', 'Ocasional'],
  ['HERWIN EDUARDO CARDONA QUITIAN', 'CHOCÓ', 'Titular', 'Doctorado', 'Carrera2'],
  ['JHON FRANCISCO ABADIA MOYA', 'CHOCÓ', 'Auxiliar', 'Maestría', 'Ocasional'],
  ['MANUEL ENRIQUE ANDRADE CUESTA', 'CHOCÓ', 'Titular', 'Doctorado', 'Ocasional'],
  ['WILMAR ANTONIO PALACIOS MACHADO', 'CHOCÓ', 'Asociado', 'Maestría', 'Ocasional'],

  // CUNDINAMARCA (15 docentes)
  ['ANDRES MAURICIO GUZMAN RINCON', 'CUNDINAMARCA', 'Asistente', 'Maestría', 'Carrera2'],
  ['ANGELICA FABIOLA BERNAL OLARTE', 'CUNDINAMARCA', 'Titular', 'Doctorado', 'Carrera2'],
  ['CARLOS MAURICIO ROJAS GUEZGUAN', 'CUNDINAMARCA', 'Auxiliar', 'Maestría', 'Carrera2'],
  ['DIANA VICTORIA RODRIGUEZ VEGA', 'CUNDINAMARCA', 'Asociado', 'Maestría', 'Ocasional'],
  ['EDWIN MURILLO AMARIS', 'CUNDINAMARCA', 'Titular', 'Doctorado', 'Carrera2'],
  ['GIOVANNI MAURICIO CASTRO LEGUIZAMON', 'CUNDINAMARCA', 'Auxiliar', 'Maestría', 'Carrera2'],
  ['JOSE DEL CARMEN CORREA ALFONSO', 'CUNDINAMARCA', 'Auxiliar', 'Doctorado', 'Carrera2'],
  ['LEANDRO GONZALEZ TAMARA', 'CUNDINAMARCA', 'Asistente', 'Maestría', 'Carrera2'],
  ['LUIS ALFONSO SANCHEZ CARDONA', 'CUNDINAMARCA', 'Asistente', 'Especialización', 'Ocasional'],
  ['LUIS JAIR PACHECO', 'CUNDINAMARCA', 'Asociado', 'Magister cursando Doctorado', 'Ocasional'],
  ['MAURICIO TELLEZ VERA', 'CUNDINAMARCA', 'Titular', 'Magister cursando Doctorado', 'Ocasional'],
  ['NESTOR ORLANDO AVILA CORTES', 'CUNDINAMARCA', 'Auxiliar', 'Maestría', 'Carrera2'],
  ['ORLANDO VELASCO ULLOA', 'CUNDINAMARCA', 'Asistente', 'Maestría', 'Carrera2'],
  ['RAFAEL ANTONIO CARDENAS VELEZ', 'CUNDINAMARCA', 'Asistente', 'Especialización', 'Ocasional'],
  ['RAMIRO CESAR BARAJAS GOMEZ', 'CUNDINAMARCA', 'Titular', 'Maestría', 'Ocasional'],

  // HUILA (18 docentes)
  ['ANDREA MARCELA BONELO CHAVARRO', 'HUILA', 'Auxiliar', 'Maestría', 'Ocasional'],
  ['ANIBAL MENDOZA DAZA', 'HUILA', 'Auxiliar', 'Maestría', 'Carrera2'],
  ['BREIDY FERNANDO CASTRO CAMPOS', 'HUILA', 'Auxiliar', 'Maestría', 'Carrera2'],
  ['DIEGO ARMANDO ALDANA SANCHEZ', 'HUILA', 'Asistente', 'Especialización', 'Ocasional'],
  ['FREDY WILLIAM ANDRADE PEREZ', 'HUILA', 'Auxiliar', 'Maestría', 'Carrera2'],
  ['HUGO DANIEL ORTIZ VANEGAS', 'HUILA', 'Asistente', 'Maestría', 'Carrera2'],
  ['JAIRO HUMBERTO MUÑOZ CABRERA', 'HUILA', 'Titular', 'Maestría', 'Ocasional'],
  ['JONATHAN ALBERTO CERVANTES BARRAZA', 'HUILA', 'Asistente', 'Doctorado', 'Periodo de Prueba'],
  ['JUAN ARTURO PEÑA LABRADOR', 'HUILA', 'Asistente', 'Especialización', 'Ocasional'],
  ['JUAN CARLOS CORREA GÓMEZ', 'HUILA', 'Auxiliar', 'Maestría', 'Periodo de Prueba'],
  ['JULIAN FELIPE BELLO LOPEZ', 'HUILA', 'Auxiliar', 'Maestría', 'Periodo de Prueba'],
  ['LEONARDO FABIO MEDINA ORTIZ', 'HUILA', 'Asociado', 'Maestría', 'Ocasional'],
  ['LUIS MIGUEL CABRERA GONZALEZ', 'HUILA', 'Auxiliar', 'Magister cursando Doctorado', 'Carrera2'],
  ['MARIA DEL PILAR SANCHEZ MUÑOZ', 'HUILA', 'Titular', 'Doctorado', 'Carrera2'],
  ['NELSON DARIO RINCON GARCIA', 'HUILA', 'Asistente', 'Especialización', 'Carrera1'],
  ['RODRIGO ANTONIO URREA BELTRAN', 'HUILA', 'Auxiliar', 'Especialización', 'Ocasional'],
  ['WILSON RIGOBERTO PABON QUINTERO', 'HUILA', 'Asistente', 'Maestría', 'Carrera2'],
  ['WILSON RODRIGUEZ CALDERON', 'HUILA', 'Titular', 'Doctorado', 'Carrera2'],

  // META (15 docentes)
  ['ABEL ANTONIO ABELLA BELTRAN', 'META', 'Asociado', 'Maestría', 'Ocasional'],
  ['ALEXANDER PARADA VALENCIA', 'META', 'Titular', 'Doctorado', 'Carrera2'],
  ['CESAR ARTURO VANEGAS RODRIGUEZ', 'META', 'Asistente', 'Especialización', 'Ocasional'],
  ['CLAUDIA SOFIA RODRIGUEZ BERNAL', 'META', 'Auxiliar', 'Doctorado', 'Periodo de Prueba'],
  ['DAGOBERTO TORRES FLOREZ', 'META', 'Titular', 'Doctorado', 'Periodo de Prueba'],
  ['DANIEL ESTEBAN UNIGARRO CAGUASANGO', 'META', 'Asistente', 'Maestría', 'Periodo de Prueba'],
  ['DAVID LEONARDO QUITIAN ROLDAN', 'META', 'Titular', 'Doctorado', 'Carrera2'],
  ['FRANCISCO ALBERTO BAUTISTA', 'META', 'Asociado', 'Maestría', 'Ocasional'],
  ['JORGE MORALES PAREDES', 'META', 'Titular', 'Doctorado', 'Carrera2'],
  ['JOSE ALEJANDRO CUELLAR TOVAR', 'META', 'Asociado', 'Maestría', 'Ocasional'],
  ['JUAN CARLOS GONZALEZ VILLA', 'META', 'Asociado', 'Especialización', 'Ocasional'],
  ['LEIDY JOHANA ARIZA MARIN', 'META', 'Asistente', 'Maestría', 'Carrera2'],
  ['OMAR REY ANACONA', 'META', 'Titular', 'Doctorado', 'Carrera1'],
  ['RICARDO ALEXANDER APOLINAR CARDENAS', 'META', 'Asistente', 'Maestría', 'Periodo de Prueba'],
  ['TATIANA MARCELA ESPINOSA BAUTISTA', 'META', 'Auxiliar', 'Maestría', 'Periodo de Prueba'],

  // NARIÑO (15 docentes)
  ['ANA ESTELA CABRERA PUCHANA', 'NARIÑO', 'Asociado', 'Maestría', 'Ocasional'],
  ['BEATRIZ ANDREA RENGIFO RENGIFO', 'NARIÑO', 'Asociado', 'Maestría', 'Ocasional'],
  ['DANIEL OSWALDO MUÑOZ CASTRO', 'NARIÑO', 'Asociado', 'Maestría', 'Ocasional'],
  ['EDUARDO YOVANY DELGADO MENESES', 'NARIÑO', 'Asistente', 'Maestría', 'Ocasional'],
  ['ERLINTO VELASCO ARTEAGA', 'NARIÑO', 'Asociado', 'Maestría', 'Ocasional'],
  ['HAMILTON MAURICIO RUIZ', 'NARIÑO', 'Auxiliar', 'Doctorado', 'Periodo de Prueba'],
  ['HARVEY OLIVER CRIOLLO MANCHABAJOY', 'NARIÑO', 'Asistente', 'Maestría', 'Carrera2'],
  ['JESUS PAGUATIAN SANCHEZ', 'NARIÑO', 'Asociado', 'Maestría', 'Ocasional'],
  ['JHON ALEXANDER MUÑOZ GOMEZ', 'NARIÑO', 'Auxiliar', 'Maestría', 'Carrera2'],
  ['MIRIAM LUCIA FLOREZ VILLOTA', 'NARIÑO', 'Auxiliar', 'Maestría', 'Periodo de Prueba'],
  ['NATHALY BURBANO MUÑOZ', 'NARIÑO', 'Titular', 'Doctorado', 'Carrera2'],
  ['NELSON ORLANDO NARVAEZ MORA', 'NARIÑO', 'Auxiliar', 'Maestría', 'Carrera2'],
  ['RAMON ANTONIO BASTIDAS UNIGARRO', 'NARIÑO', 'Titular', 'Maestría', 'Ocasional'],
  ['ROBERT WILSON ORTIZ LOPEZ', 'NARIÑO', 'Asociado', 'Especialización', 'Ocasional'],
  ['RODRIGO ALFONSO FIGUEROA GUERRERO', 'NARIÑO', 'Asistente', 'Especialización', 'Ocasional'],

  // NORTESANTANDER (14 docentes)
  ['ALEXANDER ARCINIEGAS CARREÑO', 'NORTESANTANDER', 'Asistente', 'Doctorado', 'Periodo de Prueba'],
  ['ALIX ZULAY HURTADO SOTO', 'NORTESANTANDER', 'Asociado', 'Maestría', 'Ocasional'],
  ['EDGAR ALBERTO PEÑA ESPINOSA', 'NORTESANTANDER', 'Asistente', 'Especialización', 'Ocasional'],
  ['EDUARDO ANDRES BOTERO CEDEÑO', 'NORTESANTANDER', 'Titular', 'Maestría', 'Ocasional'],
  ['GLYNIS LUCIA PANESSO CHAVERRA', 'NORTESANTANDER', 'Asociado', 'Maestría', 'Ocasional'],
  ['HERNANDO PERDOMO GOMEZ', 'NORTESANTANDER', 'Asociado', 'Maestría', 'Ocasional'],
  ['JERSON SANTIAGO ORTEGA BONFANTE', 'NORTESANTANDER', 'Asociado', 'Maestría', 'Ocasional'],
  ['JESUS EDUARDO BOHORQUEZ MENDEZ', 'NORTESANTANDER', 'Asociado', 'Maestría', 'Ocasional'],
  ['JORGE ELIECER BAUTISTA RODRIGUEZ', 'NORTESANTANDER', 'Asociado', 'Maestría', 'Ocasional'],
  ['JORGE MILTON MATAJIRA VERA', 'NORTESANTANDER', 'Asociado', 'Maestría', 'Ocasional'],
  ['JOSE ARMANDO SANTIAGO GARNICA', 'NORTESANTANDER', 'Titular', 'Doctorado', 'Ocasional'],
  ['JULIO SIMON ESCOBAR OSTOS', 'NORTESANTANDER', 'Auxiliar', 'Especialización', 'Ocasional'],
  ['LUIS HERNANDO DURAN ANTOLINEZ', 'NORTESANTANDER', 'Asistente', 'Especialización', 'Ocasional'],
  ['MARIO DE JESUS ZAMBRANO MIRANDA', 'NORTESANTANDER', 'Asistente', 'Maestría', 'Periodo de Prueba'],

  // RISARALDA (14 docentes)
  ['DIANA CAROLINA RICO REVELO', 'RISARALDA', 'Titular', 'Doctorado', 'Periodo de Prueba'],
  ['EIMER ALEXIS BARAJAS ROMAN', 'RISARALDA', 'Auxiliar', 'Maestría', 'Periodo de Prueba'],
  ['FRANCISCO EDUARDO MEJIA LEMA', 'RISARALDA', 'Titular', 'Maestría', 'Ocasional'],
  ['JACINTO PINEDA JIMENEZ', 'RISARALDA', 'Asistente', 'Maestría', 'Carrera2'],
  ['JAVIER FERMIN GACHARNA MUÑOZ', 'RISARALDA', 'Asistente', 'Doctorado', 'Carrera2'],
  ['JHON ALEXANDER LOAIZA GONZALEZ', 'RISARALDA', 'Asociado', 'Maestría', 'Ocasional'],
  ['JOSE ALDEMAR LOAIZA NARANJO', 'RISARALDA', 'Auxiliar', 'Especialización', 'Ocasional'],
  ['JUAN CARLOS ZAPATA MARIN', 'RISARALDA', 'Auxiliar', 'Especialización', 'Ocasional'],
  ['LIDA PATRICIA RIVILLAS VALENCIA', 'RISARALDA', 'Asociado', 'Maestría', 'Ocasional'],
  ['MARTHA PATRICIA VIVES HURTADO', 'RISARALDA', 'Titular', 'Doctorado', 'Carrera2'],
  ['NEISE VANEGAS NIETO', 'RISARALDA', 'Titular', 'Doctorado', 'Ocasional'],
  ['RICARDO ANTONIO ESCOBAR', 'RISARALDA', 'Asistente', 'Doctorado', 'Periodo de Prueba'],
  ['RUBEN DARIO DE JESUS NARANJO SALDARRIAGA', 'RISARALDA', 'Titular', 'Maestría', 'Ocasional'],
  ['VIVIANA GALLEGO RUDAS', 'RISARALDA', 'Asociado', 'Maestría', 'Ocasional'],

  // SANTANDER (8 docentes)
  ['EDGAR EDUARDO GUERRERO RODRIGUEZ', 'SANTANDER', 'Asistente', 'Maestría', 'Ocasional'],
  ['ESTHER PARRA RAMIREZ', 'SANTANDER', 'Titular', 'Doctorado', 'Carrera1'],
  ['GRACILIANA MORENO ECHAVARRIA', 'SANTANDER', 'Asistente', 'Maestría', 'Carrera2'],
  ['JAIRO VARGAS LEON', 'SANTANDER', 'Asistente', 'Doctorado', 'Carrera2'],
  ['LUIS EDUARDO TORRES GALVIS', 'SANTANDER', 'Asociado', 'Maestría', 'Ocasional'],
  ['MANUEL BAYONA SARMIENTO', 'SANTANDER', 'Asistente', 'Maestría', 'Carrera2'],
  ['MARIA LUCIA SIERRA SIERRA', 'SANTANDER', 'Titular', 'Maestría', 'Ocasional'],
  ['MAURICIO JAIMES ROA', 'SANTANDER', 'Asistente', 'Maestría', 'Carrera2'],

  // SEDE_CENTRAL (50 docentes)
  ['ALBERTO GIRALDO SAAVEDRA', 'SEDE_CENTRAL', 'Asociado', 'Doctorado', 'Carrera1'],
  ['ALEXANDER COTTE POVEDA', 'SEDE_CENTRAL', 'Asistente', 'Maestría', 'Periodo de Prueba'],
  ['ANA MARIA TORRES HERNANDEZ', 'SEDE_CENTRAL', 'Asociado', 'Doctorado', 'Ocasional'],
  ['ANDRES DE ZUBIRIA SAMPER', 'SEDE_CENTRAL', 'Asistente', 'Maestría', 'Carrera1'],
  ['ANDRES GOMEZ ROLDAN', 'SEDE_CENTRAL', 'Asociado', 'Maestría', 'Ocasional'],
  ['CARLOS MORENO OSPINA', 'SEDE_CENTRAL', 'Asociado', 'Doctorado', 'Carrera1'],
  ['DANIELA MEJÍA NARANJO', 'SEDE_CENTRAL', 'Titular', 'Doctorado', 'Ocasional'],
  ['DAVID JULIAN MOLINA BELTRAN', 'SEDE_CENTRAL', 'Asociado', 'Doctorado', 'Carrera2'],
  ['DEAN LERMEN GONZALEZ', 'SEDE_CENTRAL', 'Visitante', 'Maestría', 'Visitante'],
  ['DIEGO ANDRES GUEVARA FLETCHER', 'SEDE_CENTRAL', 'Asociado', 'Maestría', 'Periodo de Prueba'],
  ['EDGAR ENRIQUE MARTINEZ CARDENAS', 'SEDE_CENTRAL', 'Titular', 'Doctorado y Posdoctorado', 'Carrera1'],
  ['EDGAR RODRIGUEZ DIAZ', 'SEDE_CENTRAL', 'Titular', 'Especialización', 'Ocasional'],
  ['ELSY LUZ BARRERA', 'SEDE_CENTRAL', 'Asociado', 'Doctorado', 'Carrera1'],
  ['FERNAN FORTICH PACHECO', 'SEDE_CENTRAL', 'Asistente', 'Magister cursando Doctorado', 'Carrera1'],
  ['FREDY EDUARDO CANTE MALDONADO', 'SEDE_CENTRAL', 'Titular', 'Doctorado', 'Periodo de Prueba'],
  ['GABRIEL VILLALOBOS CAMARGO', 'SEDE_CENTRAL', 'Titular', 'Doctorado', 'Carrera2'],
  ['GERMAN CARVAJAL AHUMADA', 'SEDE_CENTRAL', 'Titular', 'Maestría', 'Ocasional'],
  ['HECTOR ELIAS PINZON TORRES', 'SEDE_CENTRAL', 'Titular', 'Maestría', 'Ocasional'],
  ['JAIME ALBERTO GOMEZ WALTEROS', 'SEDE_CENTRAL', 'Titular', 'Doctorado', 'Ocasional'],
  ['JAIME MORENO QUIJANO', 'SEDE_CENTRAL', 'Titular', 'Maestría', 'Ocasional'],
  ['JAIRO ALBERTO DIAZ PINZON', 'SEDE_CENTRAL', 'Titular', 'Doctorado', 'Ocasional'],
  ['JAIRO ELIAS RINCON PACHON', 'SEDE_CENTRAL', 'Asistente', 'Magister cursando Doctorado', 'Carrera1'],
  ['JESUS CAMILO BAUTISTA BELTRAN', 'SEDE_CENTRAL', 'Titular', 'Maestría', 'Ocasional'],
  ['JESUS MARIA MOLINA GIRALDO', 'SEDE_CENTRAL', 'Titular', 'Doctorado', 'Carrera1'],
  ['JOHN JAIRO CUELLAR ESCOBAR', 'SEDE_CENTRAL', 'Auxiliar', 'Maestría', 'Periodo de Prueba'],
  ['JORGE ELIECER FERNANDEZ RUBIO', 'SEDE_CENTRAL', 'Asistente', 'Doctorado', 'Carrera1'],
  ['JORGE IVAN MARIN TABORDA', 'SEDE_CENTRAL', 'Titular', 'Doctorado', 'Carrera1'],
  ['JOSE FRANCISCO PUELLO SOCARRAS', 'SEDE_CENTRAL', 'Asociado', 'Magister cursando Doctorado', 'Carrera1'],
  ['JOSE HONORIO MARTINEZ TORRES', 'SEDE_CENTRAL', 'Titular', 'Doctorado', 'Ocasional'],
  ['JOSE PLACIDO SILVA RUIZ', 'SEDE_CENTRAL', 'Titular', 'Doctorado', 'Carrera1'],
  ['JOSE YEZID RODRIGUEZ MARTINEZ', 'SEDE_CENTRAL', 'Asociado', 'Maestría', 'Ocasional'],
  ['JUAN CAMILO ZAMBRANO DE LA HOZ', 'SEDE_CENTRAL', 'Asociado', 'Maestría', 'Ocasional'],
  ['JULIO CESAR CORTES MUÑOZ', 'SEDE_CENTRAL', 'Titular', 'Maestría', 'Ocasional'],
  ['KARIM LORENA RAMIREZ PARRA', 'SEDE_CENTRAL', 'Asociado', 'Maestría', 'Ocasional'],
  ['LUIS ALBERTO GALEANO ESCUCHA', 'SEDE_CENTRAL', 'Asociado', 'Maestría', 'Ocasional'],
  ['LUIS EDUARDO AMADOR CABRA', 'SEDE_CENTRAL', 'Asistente', 'Doctorado', 'Carrera1'],
  ['LUIS NELSON BELTRAN MORA', 'SEDE_CENTRAL', 'Asociado', 'Doctorado', 'Carrera1'],
  ['LUZ ADRIANA MEJIA ALVAREZ', 'SEDE_CENTRAL', 'Asistente', 'Doctorado', 'Carrera1'],
  ['MANUEL RICARDO CONTENTO RUBIO', 'SEDE_CENTRAL', 'Auxiliar', 'Maestría', 'Especial'],
  ['MARGARITA ROSA MEDINA VARGAS', 'SEDE_CENTRAL', 'Titular', 'Doctorado', 'Especial'],
  ['MARIA CAROLINA HERNANDEZ LOSADA', 'SEDE_CENTRAL', 'Titular', 'Doctorado', 'Ocasional'],
  ['MIGUEL ANTONIO BORJA ALARCON', 'SEDE_CENTRAL', 'Titular', 'Doctorado', 'Carrera1'],
  ['NAIDU DUQUE CANTE', 'SEDE_CENTRAL', 'Asociado', 'Doctorado', 'Carrera1'],
  ['PEDRO NEL PAEZ PEREZ', 'SEDE_CENTRAL', 'Titular', 'Doctorado y Posdoctorado', 'Carrera1'],
  ['RAFAEL ARTURO AMAYA MEJIA', 'SEDE_CENTRAL', 'Asociado', 'Maestría', 'Ocasional'],
  ['SANDRA MILENA POLO BUITRAGO', 'SEDE_CENTRAL', 'Titular', 'Doctorado', 'Ocasional'],
  ['SHANNON REY CADAVID', 'SEDE_CENTRAL', 'Asociado', 'Maestría', 'Ocasional'],
  ['URIEL SANDOVAL RUEDA', 'SEDE_CENTRAL', 'Titular', 'Maestría', 'Ocasional'],
  ['WILLIAM GUILLERMO JIMENEZ BENITEZ', 'SEDE_CENTRAL', 'Titular', 'Doctorado y Posdoctorado', 'Carrera1'],
  ['YOLANDA RODRIGUEZ RINCON', 'SEDE_CENTRAL', 'Asistente', 'Doctorado', 'Carrera1'],

  // TOLIMA (18 docentes)
  ['ALVARO CRUZ VARON', 'TOLIMA', 'Asociado', 'Maestría', 'Ocasional'],
  ['CAMILO CLAVIJO GARCIA', 'TOLIMA', 'Asistente', 'Maestría', 'Carrera2'],
  ['CARLOS ALFONSO PARDO TORRES', 'TOLIMA', 'Asociado', 'Maestría', 'Ocasional'],
  ['CARLOS FERNEY FORERO HERNANDEZ', 'TOLIMA', 'Asociado', 'Maestría', 'Ocasional'],
  ['CESAR ALEJANDRO RAMIREZ CHAPARRO', 'TOLIMA', 'Asistente', 'Maestría', 'Carrera2'],
  ['EUNICE RAMIREZ VARON', 'TOLIMA', 'Titular', 'Especialización', 'Ocasional'],
  ['JAIDER FREDERICH ACOSTA GUZMAN', 'TOLIMA', 'Asistente', 'Especialización', 'Ocasional'],
  ['JEAMMY JULIETH SIERRA HERNANDEZ', 'TOLIMA', 'Auxiliar', 'Maestría', 'Periodo de Prueba'],
  ['JOSE LISANDRO BERNAL VELASCO', 'TOLIMA', 'Titular', 'Maestría', 'Ocasional'],
  ['JOSE ROBERTO CALCETERO GUTIERREZ', 'TOLIMA', 'Titular', 'Doctorado', 'Carrera2'],
  ['JULIO CESAR VASQUEZ FIGUEROA', 'TOLIMA', 'Titular', 'Maestría', 'Ocasional'],
  ['MARIA ELVIA MONCADA MARROQUIN', 'TOLIMA', 'Titular', 'Maestría', 'Ocasional'],
  ['MARIA EUNICE QUIÑONEZ VARON', 'TOLIMA', 'Asistente', 'Especialización', 'Ocasional'],
  ['MARTHA LILIANA LEAL PULIDO', 'TOLIMA', 'Asociado', 'Maestría', 'Ocasional'],
  ['ORLANDO ACUÑA ANGULO', 'TOLIMA', 'Titular', 'Maestría', 'Ocasional'],
  ['OSCAR SALAZAR DUQUE', 'TOLIMA', 'Asociado', 'Doctorado', 'Carrera2'],
  ['SANTOS ALONSO BELTRAN BELTRAN', 'TOLIMA', 'Asistente', 'Doctorado', 'Carrera2'],
  ['YESID HERNANDO TAFUR PRADA', 'TOLIMA', 'Auxiliar', 'Especialización', 'Ocasional'],

  // VALLE (11 docentes)
  ['CARLOS HERNAN FAJARDO TORO', 'VALLE', 'Asociado', 'Doctorado', 'Carrera2'],
  ['CHRISTIAN ALEXANDER NARVAEZ ALVAREZ', 'VALLE', 'Titular', 'Maestría', 'Ocasional'],
  ['GERMAN MARIN ZAFRA', 'VALLE', 'Auxiliar', 'Especialización', 'Ocasional'],
  ['HELVER JAVIER CADAVID RAMIREZ', 'VALLE', 'Asistente', 'Maestría', 'Carrera2'],
  ['ILDEBRANDO AREVALO OSORIO', 'VALLE', 'Titular', 'Maestría', 'Ocasional'],
  ['JUAN CARLOS CASTRO BAÑOS', 'VALLE', 'Asociado', 'Magister cursando Doctorado', 'Ocasional'],
  ['JUAN CARLOS QUINTERO CALVACHE', 'VALLE', 'Titular', 'Doctorado', 'Periodo de Prueba'],
  ['KRUPSCAIA ROIMA STERLING SANCHEZ', 'VALLE', 'Asociado', 'Maestría', 'Ocasional'],
  ['LUIS FERNANDO MACEA MERCADO', 'VALLE', 'Titular', 'Doctorado', 'Carrera2'],
  ['LUZ STELLA SANTAMARIA DE FUENTES', 'VALLE', 'Asistente', 'Especialización', 'Ocasional'],
  ['ONASIS RAFAEL ORTEGA NARVAEZ', 'VALLE', 'Titular', 'Maestría', 'Ocasional'],
];

// Funciones utilitarias
function generarEmail(nombre: string): string {
  const partes = nombre.toLowerCase().split(' ').filter(p => p.length > 2);
  if (partes.length >= 2) {
    return `${partes[0]}.${partes[partes.length - 1]}@esap.edu.co`.replace(/ñ/g, 'n');
  }
  return `${partes[0]}@esap.edu.co`.replace(/ñ/g, 'n');
}

function splitNombre(nombreCompleto: string): { firstName: string, lastName: string } {
  const partes = nombreCompleto.split(' ');
  if (partes.length <= 2) {
    return { firstName: partes[0], lastName: partes[1] || partes[0] };
  }
  const mitad = Math.ceil(partes.length / 2);
  return {
    firstName: partes.slice(0, mitad).join(' '),
    lastName: partes.slice(mitad).join(' ')
  };
}

function generarDocumento(index: number): string {
  const base = 10000000 + index * 137;
  return base.toString();
}

function generarTelefono(index: number): string {
  const prefijos = ['300', '301', '310', '311', '312', '313', '314', '315', '316', '317', '318', '319', '320', '321'];
  const prefijo = prefijos[index % prefijos.length];
  const numero = (2000000 + index * 1234) % 10000000;
  return `+57 ${prefijo} ${numero.toString().padStart(7, '0')}`;
}

function generarFechaNacimiento(index: number): string {
  const year = 1960 + (index % 30);
  const month = (index % 12) + 1;
  const day = (index % 28) + 1;
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function obtenerRolPorCategoria(categoria: string): { id: string, name: string, code: string } {
  const roles: any = {
    'Titular': { id: 'role-titular', name: 'Docente Titular', code: 'DOC_TITULAR' },
    'Asociado': { id: 'role-asociado', name: 'Docente Asociado', code: 'DOC_ASOCIADO' },
    'Asistente': { id: 'role-asistente', name: 'Docente Asistente', code: 'DOC_ASISTENTE' },
    'Auxiliar': { id: 'role-auxiliar', name: 'Docente Auxiliar', code: 'DOC_AUXILIAR' },
    'Visitante': { id: 'role-visitante', name: 'Docente Visitante', code: 'DOC_VISITANTE' },
  };
  return roles[categoria] || roles['Asistente'];
}

// Generar todos los docentes
export const TODOS_LOS_DOCENTES_ESAP: UserWithSedes[] = DOCENTES_RAW.map((docente, index) => {
  const [nombre, territorial, categoria, formacion, vinculacion] = docente;
  const { firstName, lastName } = splitNombre(nombre);
  const terrInfo = TERRITORIAL_MAP[territorial];
  const nivelSede = territorial === 'SEDE_CENTRAL' ? 'sede-central' : 'territorial';

  return {
    id: `doc-${(index + 1).toString().padStart(3, '0')}`,
    personId: `person-doc-${(index + 1).toString().padStart(3, '0')}`,
    firstName,
    lastName,
    email: generarEmail(nombre),
    phone: generarTelefono(index),
    status: 'active' as const,
    roles: [
      { 
        id: 'role-docente', 
        name: 'Docente', 
        code: 'DOCENTE',
        alcance: nivelSede === 'sede-central' ? 'nacional' : 'territorial',
        unidadOrganizacionalId: terrInfo.id
      },
      obtenerRolPorCategoria(categoria)
    ],
    location: terrInfo.ciudad,
    sedes: [{
      id: terrInfo.id,
      codigo: terrInfo.codigo,
      nombre: terrInfo.nombre,
      nivel: nivelSede,
      esPrincipal: true
    }],
    enrollmentMethod: 'manual' as const,
    enrollmentDate: '2024-01-15',
    lastLogin: `2024-12-${(index % 28) + 1}T${(index % 24).toString().padStart(2, '0')}:${(index % 60).toString().padStart(2, '0')}:00`,
    documentType: 'CC',
    documentNumber: generarDocumento(index),
    document: generarDocumento(index),
    birthDate: generarFechaNacimiento(index),
    address: `Calle ${(index % 100) + 1} #${(index % 50) + 10}-${(index % 90) + 10}, ${terrInfo.ciudad}`
  };
});

export const TOTAL_DOCENTES_ESAP = TODOS_LOS_DOCENTES_ESAP.length;

console.log(`✅ ${TOTAL_DOCENTES_ESAP} docentes ESAP cargados correctamente`);
