-- Migration 219: Carga masiva de docentes oficiales ESAP 2025-1 (listado GGP / Arley).
-- Fuente: LISTADO_DOCENTES_TC_ESAP_2025_1.md (263 docentes TC).
-- Crea cada docente como USUARIO VÁLIDO: auth.personas + auth."user" + rol DOCENTE + academic_work_plan."Docente".
-- La territorial se asigna en auth.personas.id_seccional (resuelta por código contra auth.seccionales de la migración 215).
-- Contraseña inicial '123456'. Idempotente: no duplica por documento ni por correo.
-- REQUIERE haber corrido antes la migración 215 (seccionales/territoriales).

DO $$
DECLARE
  v_docente_role uuid;
  v_pwd text := '$2b$10$lWsenGxE2s8d4IxweYD2Jue13J6V6vPUP3vS1sx9TeRcwVcaCxjD2';
BEGIN
  SELECT id INTO v_docente_role FROM auth.role WHERE UPPER(code) = 'DOCENTE' OR UPPER(name) = 'DOCENTE' LIMIT 1;
  IF v_docente_role IS NULL THEN
    RAISE EXCEPTION 'No existe rol DOCENTE en auth.role';
  END IF;

  CREATE TEMP TABLE tmp_doc_seed (
    num_doc text, nombre_completo text, nom text, ape1 text, ape2 text,
    terr_cod text, vinculacion text, correo text
  ) ON COMMIT DROP;

  INSERT INTO tmp_doc_seed (num_doc, nombre_completo, nom, ape1, ape2, terr_cod, vinculacion, correo) VALUES
    ('479678','ABEL ANTONIO ABELLA BELTRAN','ABEL ANTONIO','ABELLA','BELTRAN','MET','OCASIONAL','abelabel@esap.edu.co'),
    ('19195704','ALBERTO GIRALDO SAAVEDRA','ALBERTO','GIRALDO','SAAVEDRA','SC','CARRERA_003','albegira@esap.edu.co'),
    ('91350046','ALEXANDER ARCINIEGAS CARREÑO','ALEXANDER','ARCINIEGAS','CARREÑO','NSA','PERIODO_DE_PRUEBA','alexander.arciniegas@esap.edu.co'),
    ('11186033','ALEXANDER COTTE POVEDA','ALEXANDER','COTTE','POVEDA','SC','PERIODO_DE_PRUEBA','alexander.cotte@esap.edu.co'),
    ('88034156','ALEXANDER PARADA VALENCIA','ALEXANDER','PARADA','VALENCIA','MET','CARRERA_003','alexander.parada@esap.edu.co'),
    ('37291100','ALIX ZULAY HURTADO SOTO','ALIX ZULAY','HURTADO','SOTO','NSA','OCASIONAL','alix.hurtado@esap.edu.co'),
    ('14224261','ALVARO CRUZ VARON','ALVARO','CRUZ','VARON','TOL','OCASIONAL','alvaro.cruzv@esap.edu.co'),
    ('12630026','ALVARO LUIS MERCADO SUAREZ','ALVARO LUIS','MERCADO','SUAREZ','ATL','PERIODO_DE_PRUEBA','alvaro.mercado@esap.edu.co'),
    ('28556463','ANA ESTELA CABRERA PUCHANA','ANA ESTELA','CABRERA','PUCHANA','NAR','OCASIONAL','anycabrera88@gmail.com'),
    ('41689873','ANA MARIA TORRES HERNANDEZ','ANA MARIA','TORRES','HERNANDEZ','SC','OCASIONAL','ana.torres@esap.edu.co'),
    ('1077862966','ANDREA MARCELA BONELO CHAVARRO','ANDREA MARCELA','BONELO','CHAVARRO','HUI','OCASIONAL','andrea.bonelo@esap.edu.co'),
    ('3228513','ANDRES DE ZUBIRIA SAMPER','ANDRES DE','ZUBIRIA','SAMPER','SC','CARRERA_003','andres.dezubiria@esap.edu.co'),
    ('16710079','ANDRES GOMEZ ROLDAN','ANDRES','GOMEZ','ROLDAN','SC','OCASIONAL','andres.gomezr@esap.edu.co'),
    ('80830838','ANDRES MAURICIO GUZMAN RINCON','ANDRES MAURICIO','GUZMAN','RINCON','CUN','CARRERA_003','andres.guzman@esap.edu.co'),
    ('52423939','ANGELICA FABIOLA BERNAL OLARTE','ANGELICA FABIOLA','BERNAL','OLARTE','CUN','CARRERA_003','angelicaf.bernal@esap.edu.co'),
    ('8702503','ANIBAL MENDOZA DAZA','ANIBAL','MENDOZA','DAZA','HUI','CARRERA_003','anibal.mendoza@esap.edu.co'),
    ('77021522','ANTONIO YESID PEDROZA ESTRADA','ANTONIO YESID','PEDROZA','ESTRADA','ATL','OCASIONAL','antonio.pedroza@esap.edu.co'),
    ('7712669','ARISTIDES PEÑA ZUÑIGA','ARISTIDES','PEÑA','ZUÑIGA','CAL','CARRERA_003','aristides.pena@esap.edu.co'),
    ('59831050','BEATRIZ ANDREA RENGIFO RENGIFO','BEATRIZ ANDREA','RENGIFO','RENGIFO','NAR','OCASIONAL','beatriz.rengifo@esap.edu.co'),
    ('70081594','BELTRAN DE JESUS RESTREPO ARREDONDO','BELTRAN DE JESUS','RESTREPO','ARREDONDO','ANT','OCASIONAL','beltranrestrepo@esap.edu.co'),
    ('71696186','BIAFARA DE JESUS LEDEZMA GARCIA','BIAFARA DE JESUS','LEDEZMA','GARCIA','CHO','OCASIONAL','biafara.ledezma@esap.edu.co'),
    ('1063720504','BLAS MELENDEZ CARABALLO','BLAS','MELENDEZ','CARABALLO','BCS','CARRERA_003','blas.melendez@esap.edu.co'),
    ('1075211206','BREIDY FERNANDO CASTRO CAMPOS','BREIDY FERNANDO','CASTRO','CAMPOS','HUI','CARRERA_003','breicast@esap.edu.co'),
    ('93398738','CAMILO CLAVIJO GARCIA','CAMILO','CLAVIJO','GARCIA','TOL','CARRERA_003','camilo.clavijo@esap.edu.co'),
    ('79579074','CAMILO JOSE URIBE OTERO','CAMILO JOSE','URIBE','OTERO','BCS','OCASIONAL','camilo.uribe@esap.edu.co'),
    ('1061712832','CARLOS ALBERTO GUTIERREZ SALAZAR','CARLOS ALBERTO','GUTIERREZ','SALAZAR','CAU','OCASIONAL','carlos.gsalazar@esap.edu.co'),
    ('19386703','CARLOS ALFONSO PARDO TORRES','CARLOS ALFONSO','PARDO','TORRES','TOL','OCASIONAL','cpardo1129@hotmail.com'),
    ('18522517','CARLOS ANDRES BARCO ROJAS','CARLOS ANDRES','BARCO','ROJAS','CAL','CARRERA_003','carlos.barco@esap.edu.co'),
    ('73578918','CARLOS ANDRES BROCHET BAYONA','CARLOS ANDRES','BROCHET','BAYONA','BCS','OCASIONAL','carlos.brochet@esap.edu.co'),
    ('1061748671','CARLOS ANDRES LEITON PIAMBA','CARLOS ANDRES','LEITON','PIAMBA','CAU','OCASIONAL','carlos.leiton@esap.edu.co'),
    ('10276049','CARLOS EDUARDO GARCIA LOPEZ','CARLOS EDUARDO','GARCIA','LOPEZ','CAL','OCASIONAL','carlos.glopez@esap.edu.co'),
    ('1110459627','CARLOS FERNEY FORERO HERNANDEZ','CARLOS FERNEY','FORERO','HERNANDEZ','TOL','OCASIONAL','carlosf.forero@esap.edu.co'),
    ('16754844','CARLOS HERNAN FAJARDO TORO','CARLOS HERNAN','FAJARDO','TORO','VAL','CARRERA_003','carlosh.fajardo@esap.edu.co'),
    ('74182096','CARLOS MAURICIO ROJAS GUEZGUAN','CARLOS MAURICIO','ROJAS','GUEZGUAN','CUN','CARRERA_003','carlos.rojas@esap.edu.co'),
    ('19241494','CARLOS MORENO OSPINA','CARLOS','MORENO','OSPINA','SC','CARRERA_003','carlmore@esap.edu.co'),
    ('30230914','CAROLINA GARCIA SANCHEZ','CAROLINA','GARCIA','SANCHEZ','CAL','OCASIONAL','carolina.garcia@esap.edu.co'),
    ('9193635','CAYETANO JIMENEZ MUNIVE','CAYETANO','JIMENEZ','MUNIVE','BCS','PERIODO_DE_PRUEBA','cayetano.jimenez@esap.edu.co'),
    ('9397297','CESAR ALEJANDRO RAMIREZ CHAPARRO','CESAR ALEJANDRO','RAMIREZ','CHAPARRO','TOL','CARRERA_003','cesar.ramirez@esap.edu.co'),
    ('79838783','CESAR ARTURO VANEGAS RODRIGUEZ','CESAR ARTURO','VANEGAS','RODRIGUEZ','MET','OCASIONAL','cesar.vanegas@esap.edu.co'),
    ('10296336','CHRISTIAN ALEXANDER NARVAEZ ALVAREZ','CHRISTIAN ALEXANDER','NARVAEZ','ALVAREZ','VAL','OCASIONAL','christian.narvaez@esap.edu.co'),
    ('4615873','CHRISTIAN FELIPE ORTEGA GOMEZ','CHRISTIAN FELIPE','ORTEGA','GOMEZ','CAU','OCASIONAL','christian.ortega@esap.edu.co'),
    ('49729646','CLARA INES COLLAZOS MARTINEZ','CLARA INES','COLLAZOS','MARTINEZ','ATL','OCASIONAL','clara.collazos@esap.edu.co'),
    ('30318787','CLAUDIA JURADO ALVARAN','CLAUDIA','JURADO','ALVARAN','CAL','OCASIONAL','claudia.jurado@esap.edu.co'),
    ('23622695','CLAUDIA SOFIA RODRIGUEZ BERNAL','CLAUDIA SOFIA','RODRIGUEZ','BERNAL','MET','PERIODO_DE_PRUEBA','claudias.rodriguez@esap.edu.co'),
    ('86075572','DAGOBERTO TORRES FLOREZ','DAGOBERTO','TORRES','FLOREZ','MET','PERIODO_DE_PRUEBA','dagoberto.torres@esap.edu.co'),
    ('80779449','DANIEL ESTEBAN UNIGARRO CAGUASANGO','DANIEL ESTEBAN','UNIGARRO','CAGUASANGO','MET','PERIODO_DE_PRUEBA','daniel.unigarro@esap.edu.co'),
    ('1085288611','DANIEL OSWALDO MUÑOZ CASTRO','DANIEL OSWALDO','MUÑOZ','CASTRO','NAR','OCASIONAL','danielo.munoz@esap.edu.co'),
    ('1053772989','DANIELA MEJÍA NARANJO','DANIELA','MEJÍA','NARANJO','SC','OCASIONAL','daniela.mejian@esap.edu.co'),
    ('11447367','DAVID JULIAN MOLINA BELTRAN','DAVID JULIAN','MOLINA','BELTRAN','SC','CARRERA_003','davidj.molina@esap.edu.co'),
    ('79706077','DAVID LEONARDO QUITIAN ROLDAN','DAVID LEONARDO','QUITIAN','ROLDAN','MET','CARRERA_003','david.quitian@esap.edu.co'),
    ('79041880','DEAN LERMEN GONZALEZ','DEAN','LERMEN','GONZALEZ','SC','VISITANTE','deam.lermen@esap.edu.co'),
    ('1023864005','DELIO ALEXANDER BALCAZAR CAMACHO','DELIO ALEXANDER','BALCAZAR','CAMACHO','ANT','CARRERA_003','delio.balcazar@esap.edu.co'),
    ('11802595','DHORTON PINO SERNA','DHORTON','PINO','SERNA','CHO','OCASIONAL','dhorton.pino@esap.edu.co'),
    ('30338632','DIANA CAROLINA RICO REVELO','DIANA CAROLINA','RICO','REVELO','RIS','PERIODO_DE_PRUEBA','diana.rico@esap.edu.co'),
    ('40386883','DIANA VICTORIA RODRIGUEZ VEGA','DIANA VICTORIA','RODRIGUEZ','VEGA','CUN','OCASIONAL','dianvrodr@esap.edu.co'),
    ('76318005','DIEGO ANDRES GUEVARA FLETCHER','DIEGO ANDRES','GUEVARA','FLETCHER','SC','PERIODO_DE_PRUEBA','diego.guevara@esap.edu.co'),
    ('7732011','DIEGO ARMANDO ALDANA SANCHEZ','DIEGO ARMANDO','ALDANA','SANCHEZ','HUI','OCASIONAL','diego.aldana@esap.edu.co'),
    ('1089458130','DIEGO ARMANDO JURADO ZAMBRANO','DIEGO ARMANDO','JURADO','ZAMBRANO','ANT','CARRERA_003','diego.jurado@esap.edu.co'),
    ('19486550','EDGAR ALBERTO PEÑA ESPINOSA','EDGAR ALBERTO','PEÑA','ESPINOSA','NSA','OCASIONAL','alberto.pena@esap.edu.co'),
    ('91068392','EDGAR EDUARDO GUERRERO RODRIGUEZ','EDGAR EDUARDO','GUERRERO','RODRIGUEZ','SAN','OCASIONAL','edgar.guerrero@esap.edu.co'),
    ('7220912','EDGAR ENRIQUE MARTINEZ CARDENAS','EDGAR ENRIQUE','MARTINEZ','CARDENAS','SC','CARRERA_003','edgamart@esap.edu.co'),
    ('19301408','EDGAR RODRIGUEZ DIAZ','EDGAR','RODRIGUEZ','DIAZ','SC','OCASIONAL','edgar.rodriguez@esap.edu.co'),
    ('9773378','EDUARDO ANDRES BOTERO CEDEÑO','EDUARDO ANDRES','BOTERO','CEDEÑO','NSA','OCASIONAL','eduardo.botero@esap.edu.co'),
    ('98383203','EDUARDO YOVANY DELGADO MENESES','EDUARDO YOVANY','DELGADO','MENESES','NAR','OCASIONAL','eduardo.delgado@esap.edu.co'),
    ('79964415','EDWIN MANUEL TAPIA GONGORA','EDWIN MANUEL','TAPIA','GONGORA','ATL','CARRERA_003','edwin.tapia@esap.edu.co'),
    ('79488901','EDWIN MURILLO AMARIS','EDWIN','MURILLO','AMARIS','CUN','CARRERA_003','edwin.murilloa@esap.edu.co'),
    ('88211500','EIMER ALEXIS BARAJAS ROMAN','EIMER ALEXIS','BARAJAS','ROMAN','RIS','PERIODO_DE_PRUEBA','eimer.barajas@esap.edu.co'),
    ('51569906','ELSY LUZ BARRERA','ELSY','LUZ','BARRERA','SC','CARRERA_003','elsybarr@esap.edu.co'),
    ('87718683','ERLINTO VELASCO ARTEAGA','ERLINTO','VELASCO','ARTEAGA','NAR','OCASIONAL','erlinto.velasco@esap.edu.co'),
    ('63445154','ESTHER PARRA RAMIREZ','ESTHER','PARRA','RAMIREZ','SAN','CARRERA_003','esthparr@esap.edu.co'),
    ('38254438','EUNICE RAMIREZ VARON','EUNICE','RAMIREZ','VARON','TOL','OCASIONAL','eunice.ramirez@esap.edu.co'),
    ('1061709480','FABIAN ENRIQUE SALAZAR VILLANO','FABIAN ENRIQUE','SALAZAR','VILLANO','CAU','CARRERA_003','fabian.salazar@esap.edu.co'),
    ('1049628159','FABIAN LEONARDO ROMERO BOLIVAR','FABIAN LEONARDO','ROMERO','BOLIVAR','BOY','PERIODO_DE_PRUEBA','fabian.romero@esap.edu.co'),
    ('73087903','FERNAN FORTICH PACHECO','FERNAN','FORTICH','PACHECO','SC','CARRERA_003','fernan.fortich@esap.edu.co'),
    ('19327342','FRANCISCO ALBERTO BAUTISTA','FRANCISCO','ALBERTO','BAUTISTA','MET','OCASIONAL','fabautista@esap.edu.co'),
    ('10089129','FRANCISCO EDUARDO MEJIA LEMA','FRANCISCO EDUARDO','MEJIA','LEMA','RIS','OCASIONAL','francisco.mejia@esap.edu.co'),
    ('10566497','FRANSISCO JAVIER VARGAS CRUZ','FRANSISCO JAVIER','VARGAS','CRUZ','CAU','OCASIONAL','franciscoj.vargas@esap.edu.co'),
    ('79302631','FREDY EDUARDO CANTE MALDONADO','FREDY EDUARDO','CANTE','MALDONADO','SC','PERIODO_DE_PRUEBA','fredy.cante@esap.edu.co'),
    ('7722817','FREDY WILLIAM ANDRADE PEREZ','FREDY WILLIAM','ANDRADE','PEREZ','HUI','CARRERA_003','fredy.andrade@esap.edu.co'),
    ('12602296','FREDYS PADILLA GONZALEZ','FREDYS','PADILLA','GONZALEZ','ATL','PERIODO_DE_PRUEBA','fredys.padilla@esap.edu.co'),
    ('79750179','GABRIEL VILLALOBOS CAMARGO','GABRIEL','VILLALOBOS','CAMARGO','SC','CARRERA_003','gabriel.villalobos@esap.edu.co'),
    ('80219035','GERMAN ANDRES MOLINA GARRIDO','GERMAN ANDRES','MOLINA','GARRIDO','CAU','CARRERA_003','german.molina@esap.edu.co'),
    ('79205006','GERMAN CARVAJAL AHUMADA','GERMAN','CARVAJAL','AHUMADA','SC','OCASIONAL','german.carvajal@esap.edu.co'),
    ('94375494','GERMAN MARIN ZAFRA','GERMAN','MARIN','ZAFRA','VAL','OCASIONAL','german.marin@esap.edu.co'),
    ('1077442112','GEYDI DAHIANA DEMARCHI SANCHEZ','GEYDI DAHIANA','DEMARCHI','SANCHEZ','ANT','OCASIONAL','geydi.demarchi@esap.edu.co'),
    ('40029903','GILMA SOCORRO VANEGAS ROMERO','GILMA SOCORRO','VANEGAS','ROMERO','BOY','OCASIONAL','gilma.vanegas@esap.edu.co'),
    ('79856565','GIOVANNI MAURICIO CASTRO LEGUIZAMON','GIOVANNI MAURICIO','CASTRO','LEGUIZAMON','CUN','CARRERA_003','giovanni.castro@esap.edu.co'),
    ('46382302','GLADYS ANDREA TORRES ESTEPA','GLADYS ANDREA','TORRES','ESTEPA','BOY','CARRERA_003','gladys.torres@esap.edu.co'),
    ('68297820','GLYNIS LUCIA PANESSO CHAVERRA','GLYNIS LUCIA','PANESSO','CHAVERRA','NSA','OCASIONAL','glynisl.panesso@esap.edu.co'),
    ('31873677','GRACILIANA MORENO ECHAVARRIA','GRACILIANA','MORENO','ECHAVARRIA','SAN','CARRERA_003','graciliana.moreno@esap.edu.co'),
    ('71776491','GUSTAVO ADOLFO MUÑOZ GAVIRIA','GUSTAVO ADOLFO','MUÑOZ','GAVIRIA','CAL','CARRERA_003','gustavo.munoz@esap.edu.co'),
    ('1085247118','HAMILTON MAURICIO RUIZ','HAMILTON','MAURICIO','RUIZ','NAR','PERIODO_DE_PRUEBA','hamilton.ruiz@esap.edu.co'),
    ('98215205','HARVEY OLIVER CRIOLLO MANCHABAJOY','HARVEY OLIVER','CRIOLLO','MANCHABAJOY','NAR','CARRERA_003','harvey.criollo@esap.edu.co'),
    ('79330878','HECTOR ELIAS PINZON TORRES','HECTOR ELIAS','PINZON','TORRES','SC','OCASIONAL','hectpinz@esap.edu.co'),
    ('79669055','HELVER JAVIER CADAVID RAMIREZ','HELVER JAVIER','CADAVID','RAMIREZ','VAL','CARRERA_003','helver.cadavid@esap.edu.co'),
    ('7226078','HENRY ERNESTO GONZALEZ BECERRA','HENRY ERNESTO','GONZALEZ','BECERRA','BOY','CARRERA_003','henrye.gonzalez@esap.edu.co'),
    ('12190874','HERNANDO PERDOMO GOMEZ','HERNANDO','PERDOMO','GOMEZ','NSA','OCASIONAL','hernando.perdomog@esap.edu.co'),
    ('71799891','HERWIN EDUARDO CARDONA QUITIAN','HERWIN EDUARDO','CARDONA','QUITIAN','CHO','CARRERA_003','herwin.cardona@esap.edu.co'),
    ('22435531','HORTENSIA DEL SOCORRO PEREZ VARGAS','HORTENSIA DEL SOCORRO','PEREZ','VARGAS','ATL','OCASIONAL','hortensia.perez@esap.edu.co'),
    ('79964723','HUGO DANIEL ORTIZ VANEGAS','HUGO DANIEL','ORTIZ','VANEGAS','HUI','CARRERA_003','hugo.ortiz@esap.edu.co'),
    ('16625079','ILDEBRANDO AREVALO OSORIO','ILDEBRANDO','AREVALO','OSORIO','VAL','OCASIONAL','ildebrando.arevalo@esap.edu.co'),
    ('7305383','JACINTO PINEDA JIMENEZ','JACINTO','PINEDA','JIMENEZ','RIS','CARRERA_003','jacipine@esap.edu.co'),
    ('93397140','JAIDER FREDERICH ACOSTA GUZMAN','JAIDER FREDERICH','ACOSTA','GUZMAN','TOL','OCASIONAL','jaider.acosta@esap.edu.co'),
    ('14256213','JAIME ALBERTO GOMEZ WALTEROS','JAIME ALBERTO','GOMEZ','WALTEROS','SC','OCASIONAL','jaimgome@esap.edu.co'),
    ('13834013','JAIME MORENO QUIJANO','JAIME','MORENO','QUIJANO','SC','OCASIONAL','jaimmore@esap.edu.co'),
    ('19104732','JAIRO ALBERTO DIAZ PINZON','JAIRO ALBERTO','DIAZ','PINZON','SC','OCASIONAL','jairdiaz@esap.edu.co'),
    ('19330343','JAIRO ELIAS RINCON PACHON','JAIRO ELIAS','RINCON','PACHON','SC','CARRERA_003','jairo.rincon@esap.edu.co'),
    ('1075214369','JAIRO HUMBERTO MUÑOZ CABRERA','JAIRO HUMBERTO','MUÑOZ','CABRERA','HUI','OCASIONAL','jairo.munoz@esap.edu.co'),
    ('13886142','JAIRO VARGAS LEON','JAIRO','VARGAS','LEON','SAN','CARRERA_003','jairo.vargas@esap.edu.co'),
    ('37898365','JAKELINE VARGAS PARRA','JAKELINE','VARGAS','PARRA','BCS','CARRERA_003','jakeline.vargas@esap.edu.co'),
    ('72158172','JAVIER ENRIQUE DE LA HOZ MERCADO','JAVIER ENRIQUE DE LA','HOZ','MERCADO','ATL','OCASIONAL','javier.delahoz@esap.edu.co'),
    ('79371959','JAVIER FERMIN GACHARNA MUÑOZ','JAVIER FERMIN','GACHARNA','MUÑOZ','RIS','CARRERA_003','javier.gacharna@esap.edu.co'),
    ('65630864','JEAMMY JULIETH SIERRA HERNANDEZ','JEAMMY JULIETH','SIERRA','HERNANDEZ','TOL','PERIODO_DE_PRUEBA','jeammy.sierra@esap.edu.co'),
    ('52328009','JENNY ELISA LOPEZ RODRIGUEZ','JENNY ELISA','LOPEZ','RODRIGUEZ','BOY','CARRERA_003','jenny.lopez@esap.edu.co'),
    ('88241723','JERSON SANTIAGO ORTEGA BONFANTE','JERSON SANTIAGO','ORTEGA','BONFANTE','NSA','OCASIONAL','jerson.ortega@esap.edu.co'),
    ('19089076','JESUS CAMILO BAUTISTA BELTRAN','JESUS CAMILO','BAUTISTA','BELTRAN','SC','OCASIONAL','jesubaut@esap.edu.co'),
    ('79875581','JESUS EDUARDO BOHORQUEZ MENDEZ','JESUS EDUARDO','BOHORQUEZ','MENDEZ','NSA','OCASIONAL','jesus.bohorquez@esap.edu.co'),
    ('79597535','JESUS MARIA MOLINA GIRALDO','JESUS MARIA','MOLINA','GIRALDO','SC','CARRERA_003','jesumoli@esap.edu.co'),
    ('98195192','JESUS PAGUATIAN SANCHEZ','JESUS','PAGUATIAN','SANCHEZ','NAR','OCASIONAL','jesus.paguatian@esap.edu.co'),
    ('9865817','JHON ALEXANDER LOAIZA GONZALEZ','JHON ALEXANDER','LOAIZA','GONZALEZ','RIS','OCASIONAL','jhon.loaizag@esap.edu.co'),
    ('98395604','JHON ALEXANDER MUÑOZ GOMEZ','JHON ALEXANDER','MUÑOZ','GOMEZ','NAR','CARRERA_003','alexmuno@esap.edu.co'),
    ('11793482','JHON FRANCISCO ABADIA MOYA','JHON FRANCISCO','ABADIA','MOYA','CHO','OCASIONAL','jhon.abadia@esap.edu.co'),
    ('1061691275','JHON FREDY GALVIS PEREZ','JHON FREDY','GALVIS','PEREZ','CAU','OCASIONAL','jhon.galvis@esap.edu.co'),
    ('8698150','JOAQUIN BELTRAN RADA','JOAQUIN','BELTRAN','RADA','ATL','OCASIONAL','joaquin.beltran@esap.edu.co'),
    ('79892117','JOHN JAIRO CUELLAR ESCOBAR','JOHN JAIRO','CUELLAR','ESCOBAR','SC','PERIODO_DE_PRUEBA','johnj.cuellar@esap.edu.co'),
    ('1143445332','JONATHAN ALBERTO CERVANTES BARRAZA','JONATHAN ALBERTO','CERVANTES','BARRAZA','HUI','PERIODO_DE_PRUEBA','jonathan.cervantes@esap.edu.co'),
    ('1022940120','JONNY FERNANDO BARRETO CASTAÑEDA','JONNY FERNANDO','BARRETO','CASTAÑEDA','BOY','CARRERA_003','jonny.barreto@esap.edu.co'),
    ('13258907','JORGE ELIECER BAUTISTA RODRIGUEZ','JORGE ELIECER','BAUTISTA','RODRIGUEZ','NSA','OCASIONAL','jorge.bautista@esap.edu.co'),
    ('79324341','JORGE ELIECER FERNANDEZ RUBIO','JORGE ELIECER','FERNANDEZ','RUBIO','SC','CARRERA_003','jorgefern@esap.edu.co'),
    ('19341050','JORGE IVAN MARIN TABORDA','JORGE IVAN','MARIN','TABORDA','SC','CARRERA_003','ivanmari@esap.edu.co'),
    ('19769785','JORGE MEJIA TURIZO','JORGE','MEJIA','TURIZO','ATL','PERIODO_DE_PRUEBA','jorge.mejiat@esap.edu.co'),
    ('13268293','JORGE MILTON MATAJIRA VERA','JORGE MILTON','MATAJIRA','VERA','NSA','OCASIONAL','jorge.matajira@esap.edu.co'),
    ('80030089','JORGE MORALES PAREDES','JORGE','MORALES','PAREDES','MET','CARRERA_003','jorge.moralesp@esap.edu.co'),
    ('10283577','JOSE ALDEMAR LOAIZA NARANJO','JOSE ALDEMAR','LOAIZA','NARANJO','RIS','OCASIONAL','josea.loaiza@esap.edu.co'),
    ('17327246','JOSE ALEJANDRO CUELLAR TOVAR','JOSE ALEJANDRO','CUELLAR','TOVAR','MET','OCASIONAL','josecuel@esap.edu.co'),
    ('316647','JOSE ARMANDO SANTIAGO GARNICA','JOSE ARMANDO','SANTIAGO','GARNICA','NSA','OCASIONAL','jose.garnica@esap.edu.co'),
    ('11385545','JOSE DEL CARMEN CORREA ALFONSO','JOSE DEL CARMEN','CORREA','ALFONSO','CUN','CARRERA_003','jose.correa@esap.edu.co'),
    ('76317298','JOSE ENRIQUE URRESTE CAMPO','JOSE ENRIQUE','URRESTE','CAMPO','CAU','CARRERA_003','jose.urreste@esap.edu.co'),
    ('75092858','JOSE FERNANDO MUÑOZ OSPINA','JOSE FERNANDO','MUÑOZ','OSPINA','CAL','CARRERA_003','jose.fmunoz@esap.edu.co'),
    ('79906288','JOSE FRANCISCO PUELLO SOCARRAS','JOSE FRANCISCO','PUELLO','SOCARRAS','SC','CARRERA_003','josepuel@esap.edu.co'),
    ('72049822','JOSE GREGORIO SOLORZANO MOVILLA','JOSE GREGORIO','SOLORZANO','MOVILLA','ATL','CARRERA_003','jose.solorzanom@esap.edu.co'),
    ('88198032','JOSE HONORIO MARTINEZ TORRES','JOSE HONORIO','MARTINEZ','TORRES','SC','OCASIONAL','joseh.martinez@esap.edu.co'),
    ('93375013','JOSE LISANDRO BERNAL VELASCO','JOSE LISANDRO','BERNAL','VELASCO','TOL','OCASIONAL','lisandro.bernal@esap.edu.co'),
    ('88154191','JOSE LUIS SILVA SUAREZ','JOSE LUIS','SILVA','SUAREZ','BCS','CARRERA_003','jose.silvas@esap.edu.co'),
    ('9193183','JOSE MARIA JIMENEZ MUNIVE','JOSE MARIA','JIMENEZ','MUNIVE','ATL','CARRERA_003','josemjimenez@esap.edu.co'),
    ('1026263695','JOSE MIGUEL MAYORGA GONZALEZ','JOSE MIGUEL','MAYORGA','GONZALEZ','ANT','CARRERA_003','jose.mayorga@esap.edu.co'),
    ('19219489','JOSE PLACIDO SILVA RUIZ','JOSE PLACIDO','SILVA','RUIZ','SC','CARRERA_003','josesilv@esap.edu.co'),
    ('79945005','JOSE RICARDO ALVAREZ PUERTO','JOSE RICARDO','ALVAREZ','PUERTO','CAL','OCASIONAL','jose.alvarez@esap.edu.co'),
    ('3152270','JOSE ROBERTO CALCETERO GUTIERREZ','JOSE ROBERTO','CALCETERO','GUTIERREZ','TOL','CARRERA_003','jose.calcetero@esap.edu.co'),
    ('79605682','JOSE YEZID RODRIGUEZ MARTINEZ','JOSE YEZID','RODRIGUEZ','MARTINEZ','SC','OCASIONAL','joseye.rodriguezm@esap.edu.co'),
    ('12120326','JUAN ARTURO PEÑA LABRADOR','JUAN ARTURO','PEÑA','LABRADOR','HUI','OCASIONAL','juan.pena@esap.edu.co'),
    ('1098609912','JUAN CAMILO ZAMBRANO DE LA HOZ','JUAN CAMILO ZAMBRANO DE','LA','HOZ','SC','OCASIONAL','juan.zambrano@esap.edu.co'),
    ('9312525','JUAN CARLOS CASTRO BAÑOS','JUAN CARLOS','CASTRO','BAÑOS','VAL','OCASIONAL','juan.castro@esap.edu.co'),
    ('6774044','JUAN CARLOS CORREA GÓMEZ','JUAN CARLOS','CORREA','GÓMEZ','HUI','PERIODO_DE_PRUEBA','juan.correa@esap.edu.co'),
    ('17349972','JUAN CARLOS GONZALEZ VILLA','JUAN CARLOS','GONZALEZ','VILLA','MET','OCASIONAL','juan.gonzalez@esap.edu.co'),
    ('16791253','JUAN CARLOS QUINTERO CALVACHE','JUAN CARLOS','QUINTERO','CALVACHE','VAL','PERIODO_DE_PRUEBA','juan.quinteroc@esap.edu.co'),
    ('10136330','JUAN CARLOS ZAPATA MARIN','JUAN CARLOS','ZAPATA','MARIN','RIS','OCASIONAL','juan.zapata@esap.edu.co'),
    ('8046106','JUAN DE JESUS SANDOVAL','JUAN DE','JESUS','SANDOVAL','ANT','CARRERA_003','juanj.sandoval@esap.edu.co'),
    ('74085446','JULIAN CAMILO BARRETO GARCIA','JULIAN CAMILO','BARRETO','GARCIA','BOY','CARRERA_003','julian.barreto@esap.edu.co'),
    ('1075232907','JULIAN FELIPE BELLO LOPEZ','JULIAN FELIPE','BELLO','LOPEZ','HUI','PERIODO_DE_PRUEBA','julian.lopez@esap.edu.co'),
    ('1057587472','JULIETH KARINA ROJAS GRANADOS','JULIETH KARINA','ROJAS','GRANADOS','BOY','OCASIONAL','julieth.rojas@esap.edu.co'),
    ('7179463','JULIO CESAR CARO MORENO','JULIO CESAR','CARO','MORENO','BOY','CARRERA_003','julio.caro@esap.edu.co'),
    ('80422411','JULIO CESAR CORTES MUÑOZ','JULIO CESAR','CORTES','MUÑOZ','SC','OCASIONAL','julio.cortes@esap.edu.co'),
    ('93285031','JULIO CESAR VASQUEZ FIGUEROA','JULIO CESAR','VASQUEZ','FIGUEROA','TOL','OCASIONAL','julio.vasquez@esap.edu.co'),
    ('17592981','JULIO SIMON ESCOBAR OSTOS','JULIO SIMON','ESCOBAR','OSTOS','NSA','OCASIONAL','julios.escobar@esap.edu.co'),
    ('52880332','KARIM LORENA RAMIREZ PARRA','KARIM LORENA','RAMIREZ','PARRA','SC','OCASIONAL','karim.ramirez@esap.edu.co'),
    ('66986551','KRUPSCAIA ROIMA STERLING SANCHEZ','KRUPSCAIA ROIMA','STERLING','SANCHEZ','VAL','OCASIONAL','info@krupscaiasterling.com'),
    ('53045417','LADY ANDREA SUAREZ CARVAJAL','LADY ANDREA','SUAREZ','CARVAJAL','BCS','CARRERA_003','lady.suarez@esap.edu.co'),
    ('33377124','LADY CAROLINA BAYONA ESTUPIÑAN','LADY CAROLINA','BAYONA','ESTUPIÑAN','BOY','CARRERA_003','carolina.bayona@esap.edu.co'),
    ('79599981','LEANDRO GONZALEZ TAMARA','LEANDRO','GONZALEZ','TAMARA','CUN','CARRERA_003','leandrog.tamara@esap.edu.co'),
    ('1121883040','LEIDY JOHANA ARIZA MARIN','LEIDY JOHANA','ARIZA','MARIN','MET','CARRERA_003','leidy.ariza@esap.edu.co'),
    ('7730723','LEONARDO FABIO MEDINA ORTIZ','LEONARDO FABIO','MEDINA','ORTIZ','HUI','OCASIONAL','leonardo.medina@esap.edu.co'),
    ('30357940','LIDA PATRICIA RIVILLAS VALENCIA','LIDA PATRICIA','RIVILLAS','VALENCIA','RIS','OCASIONAL','lida.rivillas@esap.edu.co'),
    ('76295624','LORENZO ANTONIO NOGUERA','LORENZO','ANTONIO','NOGUERA','CAU','OCASIONAL','lorenzo.noguera@esap.edu.co'),
    ('1023861638','LUIS ALBERTO GALEANO ESCUCHA','LUIS ALBERTO','GALEANO','ESCUCHA','SC','OCASIONAL','luis.galeano@esap.edu.co'),
    ('10232357','LUIS ALFONSO SANCHEZ CARDONA','LUIS ALFONSO','SANCHEZ','CARDONA','CUN','OCASIONAL','luis.sanchez@esap.edu.co'),
    ('75065064','LUIS CARLOS TORO MARULANDA','LUIS CARLOS','TORO','MARULANDA','CAL','OCASIONAL','luisc.toro@esap.edu.co'),
    ('19397995','LUIS EDUARDO AMADOR CABRA','LUIS EDUARDO','AMADOR','CABRA','SC','CARRERA_003','luis.amador@esap.edu.co'),
    ('91228769','LUIS EDUARDO TORRES GALVIS','LUIS EDUARDO','TORRES','GALVIS','SAN','OCASIONAL','luise.torres@esap.edu.co'),
    ('7368608','LUIS FERNANDO MACEA MERCADO','LUIS FERNANDO','MACEA','MERCADO','VAL','CARRERA_003','luis.macea@esap.edu.co'),
    ('13246085','LUIS HERNANDO DURAN ANTOLINEZ','LUIS HERNANDO','DURAN','ANTOLINEZ','NSA','OCASIONAL','luis.duran@esap.edu.co'),
    ('19472887','LUIS JAIR PACHECO','LUIS','JAIR','PACHECO','CUN','OCASIONAL','luis.pacheco@esap.edu.co'),
    ('12126186','LUIS MIGUEL CABRERA GONZALEZ','LUIS MIGUEL','CABRERA','GONZALEZ','HUI','CARRERA_003','luis.cabrera@esap.edu.co'),
    ('79242932','LUIS NELSON BELTRAN MORA','LUIS NELSON','BELTRAN','MORA','SC','CARRERA_003','luis.beltran@esap.edu.co'),
    ('24623457','LUZ ADRIANA MEJIA ALVAREZ','LUZ ADRIANA','MEJIA','ALVAREZ','SC','CARRERA_003','luz.mejia@esap.edu.co'),
    ('40008425','LUZ STELLA SANTAMARIA DE FUENTES','LUZ STELLA SANTAMARIA','DE','FUENTES','VAL','OCASIONAL','luz.santamaria@esap.edu.co'),
    ('52845106','LYDA MARCELA HERRERA CAMARGO','LYDA MARCELA','HERRERA','CAMARGO','ANT','OCASIONAL','lydam.herrera@esap.edu.co'),
    ('91177397','MANUEL BAYONA SARMIENTO','MANUEL','BAYONA','SARMIENTO','SAN','CARRERA_003','manubayo@esap.edu.co'),
    ('11793112','MANUEL ENRIQUE ANDRADE CUESTA','MANUEL ENRIQUE','ANDRADE','CUESTA','CHO','OCASIONAL','manuel.andrade@esap.edu.co'),
    ('73103013','MANUEL ESTEBAN PERALTA MATOS','MANUEL ESTEBAN','PERALTA','MATOS','BCS','OCASIONAL','manuel.peralta@esap.edu.co'),
    ('79398773','MANUEL RICARDO CONTENTO RUBIO','MANUEL RICARDO','CONTENTO','RUBIO','SC','ESPECIAL','manuel.contento@esap.edu.co'),
    ('45502716','MARA LUZ AMADOR GIL','MARA LUZ','AMADOR','GIL','BCS','OCASIONAL','mara.amador@esap.edu.co'),
    ('52211659','MARCELA BIBIANA GUERRERO ROJAS','MARCELA BIBIANA','GUERRERO','ROJAS','ATL','PERIODO_DE_PRUEBA','marcela.guerrero@esap.edu.co'),
    ('41689316','MARGARITA ROSA MEDINA VARGAS','MARGARITA ROSA','MEDINA','VARGAS','SC','ESPECIAL','margarita.medina@esap.edu.co'),
    ('1010179454','MARIA CAROLINA HERNANDEZ LOSADA','MARIA CAROLINA','HERNANDEZ','LOSADA','SC','OCASIONAL','maria.hernandezl@esap.edu.co'),
    ('52262920','MARIA DEL PILAR SANCHEZ MUÑOZ','MARIA DEL PILAR','SANCHEZ','MUÑOZ','HUI','CARRERA_003','mariap.sanchez@esap.edu.co'),
    ('38260151','MARIA ELVIA MONCADA MARROQUIN','MARIA ELVIA','MONCADA','MARROQUIN','TOL','OCASIONAL','mariae.moncada@esap.edu.co'),
    ('38249429','MARIA EUNICE QUIÑONEZ VARON','MARIA EUNICE','QUIÑONEZ','VARON','TOL','OCASIONAL','maria.quinonez@esap.edu.co'),
    ('25284513','MARIA FERNANDA PERALTA GOYES','MARIA FERNANDA','PERALTA','GOYES','CAU','OCASIONAL','maria.peralta@esap.edu.co'),
    ('37316122','MARIA LUCIA SIERRA SIERRA','MARIA LUCIA','SIERRA','SIERRA','SAN','OCASIONAL','mariasier@esap.edu.co'),
    ('16783250','MARINO RENGIFO GARCIA','MARINO','RENGIFO','GARCIA','ATL','PERIODO_DE_PRUEBA','marino.rengifo@esap.edu.co'),
    ('85167270','MARIO DE JESUS ZAMBRANO MIRANDA','MARIO DE JESUS','ZAMBRANO','MIRANDA','NSA','PERIODO_DE_PRUEBA','mario.zambrano@esap.edu.co'),
    ('65745784','MARTHA LILIANA LEAL PULIDO','MARTHA LILIANA','LEAL','PULIDO','TOL','OCASIONAL','marthal.lealp@esap.edu.co'),
    ('52083740','MARTHA PATRICIA VIVES HURTADO','MARTHA PATRICIA','VIVES','HURTADO','RIS','CARRERA_003','martha.vives@esap.edu.co'),
    ('32939973','MARY CRUZ ORTEGA HERNANDEZ','MARY CRUZ','ORTEGA','HERNANDEZ','BCS','PERIODO_DE_PRUEBA','mary.ortega@esap.edu.co'),
    ('13536151','MAURICIO JAIMES ROA','MAURICIO','JAIMES','ROA','SAN','CARRERA_003','mauricio.jaimes@esap.edu.co'),
    ('15372806','MAURICIO JAVIER LUNA GALVAN','MAURICIO JAVIER','LUNA','GALVAN','BCS','CARRERA_003','mauricioj.luna@esap.edu.co'),
    ('79360500','MAURICIO TELLEZ VERA','MAURICIO','TELLEZ','VERA','CUN','OCASIONAL','mauricio.tellez@esap.edu.co'),
    ('6280534','MIGUEL ANTONIO BORJA ALARCON','MIGUEL ANTONIO','BORJA','ALARCON','SC','CARRERA_003','miguel.borja@esap.edu.co'),
    ('30736303','MIRIAM LUCIA FLOREZ VILLOTA','MIRIAM LUCIA','FLOREZ','VILLOTA','NAR','PERIODO_DE_PRUEBA','myriam.florez@esap.edu.co'),
    ('45506970','MONICA PATRICIA FORTICH NAVARRO','MONICA PATRICIA','FORTICH','NAVARRO','BCS','CARRERA_003','monica.fortich@esap.edu.co'),
    ('1102853186','NADIN ANDRES MADERA ARIAS','NADIN ANDRES','MADERA','ARIAS','ATL','PERIODO_DE_PRUEBA','nadin.madderaa@esap.edu.co'),
    ('52337063','NAIDU DUQUE CANTE','NAIDU','DUQUE','CANTE','SC','CARRERA_003','naidu.duque@esap.edu.co'),
    ('52717747','NATHALY BURBANO MUÑOZ','NATHALY','BURBANO','MUÑOZ','NAR','CARRERA_003','nathaly.burbano@esap.edu.co'),
    ('51804365','NEISE VANEGAS NIETO','NEISE','VANEGAS','NIETO','RIS','OCASIONAL','neise.vanegas@esap.edu.co'),
    ('7178602','NELSON ANDRES MONTERO RAMIREZ','NELSON ANDRES','MONTERO','RAMIREZ','BOY','OCASIONAL','nelson.montero@esap.edu.co'),
    ('80271530','NELSON DARIO RINCON GARCIA','NELSON DARIO','RINCON','GARCIA','HUI','CARRERA_003','nelsrinc@esap.edu.co'),
    ('87100191','NELSON ORLANDO NARVAEZ MORA','NELSON ORLANDO','NARVAEZ','MORA','NAR','CARRERA_003','nelson.narvaez@esap.edu.co'),
    ('79122843','NESTOR ORLANDO AVILA CORTES','NESTOR ORLANDO','AVILA','CORTES','CUN','CARRERA_003','nestor.avila@esap.edu.co'),
    ('86044754','OMAR REY ANACONA','OMAR','REY','ANACONA','MET','CARRERA_003','omar.rey@esap.edu.co'),
    ('15030163','ONASIS RAFAEL ORTEGA NARVAEZ','ONASIS RAFAEL','ORTEGA','NARVAEZ','VAL','OCASIONAL','onasis.ortega@esap.edu.co'),
    ('14271071','ORLANDO ACUÑA ANGULO','ORLANDO','ACUÑA','ANGULO','TOL','OCASIONAL','orlando.acuna@esap.edu.co'),
    ('7226973','ORLANDO MORENO MORENO','ORLANDO','MORENO','MORENO','BOY','OCASIONAL','orlando.moreno@esap.edu.co'),
    ('4106512','ORLANDO VELASCO ULLOA','ORLANDO','VELASCO','ULLOA','CUN','CARRERA_003','orlando.velasco@esap.edu.co'),
    ('10292684','OSCAR EDUARDO VALENCIA MESA','OSCAR EDUARDO','VALENCIA','MESA','CAU','CARRERA_003','oscar.valenciam@esap.edu.co'),
    ('14214454','OSCAR SALAZAR DUQUE','OSCAR','SALAZAR','DUQUE','TOL','CARRERA_003','oscar.salazar@esap.edu.co'),
    ('79259475','PEDRO NEL PAEZ PEREZ','PEDRO NEL','PAEZ','PEREZ','SC','CARRERA_003','pedrpaez@esap.edu.co'),
    ('82389993','RAFAEL ANTONIO CARDENAS VELEZ','RAFAEL ANTONIO','CARDENAS','VELEZ','CUN','OCASIONAL','rafacarde@esap.edu.co'),
    ('1026277351','RAFAEL ARTURO AMAYA MEJIA','RAFAEL ARTURO','AMAYA','MEJIA','SC','OCASIONAL','rafaelamaya@esap.edu.co'),
    ('19191503','RAMIRO CESAR BARAJAS GOMEZ','RAMIRO CESAR','BARAJAS','GOMEZ','CUN','OCASIONAL','ramibara@esap.edu.co'),
    ('92504501','RAMIRO ENRIQUE SALAZAR RAMOS','RAMIRO ENRIQUE','SALAZAR','RAMOS','BCS','CARRERA_003','ramiro.salazarr@esap.edu.co'),
    ('13009744','RAMON ANTONIO BASTIDAS UNIGARRO','RAMON ANTONIO','BASTIDAS','UNIGARRO','NAR','OCASIONAL','antobast@esap.edu.co'),
    ('1121825584','RICARDO ALEXANDER APOLINAR CARDENAS','RICARDO ALEXANDER','APOLINAR','CARDENAS','MET','PERIODO_DE_PRUEBA','ricardo.apolinar@esap.edu.co'),
    ('10267732','RICARDO ANTONIO ESCOBAR','RICARDO','ANTONIO','ESCOBAR','RIS','PERIODO_DE_PRUEBA','ricardo.escobar@esap.edu.co'),
    ('98381113','ROBERT WILSON ORTIZ LOPEZ','ROBERT WILSON','ORTIZ','LOPEZ','NAR','OCASIONAL','robert.ortiz@esap.edu.co'),
    ('13005558','RODRIGO ALFONSO FIGUEROA GUERRERO','RODRIGO ALFONSO','FIGUEROA','GUERRERO','NAR','OCASIONAL','rodrigo.figueroa@esap.edu.co'),
    ('12127386','RODRIGO ANTONIO URREA BELTRAN','RODRIGO ANTONIO','URREA','BELTRAN','HUI','OCASIONAL','rodrigo.urrea@esap.edu.co'),
    ('10292766','RONALD ALEJANDRO MACUACE OTERO','RONALD ALEJANDRO','MACUACE','OTERO','CAU','CARRERA_003','ronald.macuace@esap.edu.co'),
    ('42496905','ROSALVINA ALVIS BARRANCO','ROSALVINA','ALVIS','BARRANCO','ATL','CARRERA_003','rosalvina.alvis@esap.edu.co'),
    ('10094605','RUBEN DARIO DE JESUS NARANJO SALDARRIAGA','RUBEN DARIO DE JESUS','NARANJO','SALDARRIAGA','RIS','OCASIONAL','ruben.naranjo@esap.edu.co'),
    ('52336004','SANDRA MILENA POLO BUITRAGO','SANDRA MILENA','POLO','BUITRAGO','SC','OCASIONAL','sandra.polo@esap.edu.co'),
    ('79829053','SANTOS ALONSO BELTRAN BELTRAN','SANTOS ALONSO','BELTRAN','BELTRAN','TOL','CARRERA_003','santos.beltran@esap.edu.co'),
    ('79905168','SERGIO ALBERTO CHICA VELEZ','SERGIO ALBERTO','CHICA','VELEZ','ANT','CARRERA_003','sergchic@esap.edu.co'),
    ('1018446712','SHANNON REY CADAVID','SHANNON','REY','CADAVID','SC','OCASIONAL','shannon.rey@esap.edu.co'),
    ('33333865','SILVIA MARGARITA BALDIRIS NAVARRO','SILVIA MARGARITA','BALDIRIS','NAVARRO','ATL','PERIODO_DE_PRUEBA','silvia.baldiris@esap.edu.co'),
    ('75077672','SILVIO LEON ROSERO OTERO','SILVIO LEON','ROSERO','OTERO','CAL','CARRERA_003','silvio.rosero@esap.edu.co'),
    ('19066675','SIMON MARTINEZ URBANEZ','SIMON','MARTINEZ','URBANEZ','ATL','OCASIONAL','simon.martinezu@esap.edu.co'),
    ('1094247389','TATIANA MARCELA ESPINOSA BAUTISTA','TATIANA MARCELA','ESPINOSA','BAUTISTA','MET','PERIODO_DE_PRUEBA','tatiana.espinosa@esap.edu.co'),
    ('91216105','URIEL SANDOVAL RUEDA','URIEL','SANDOVAL','RUEDA','SC','OCASIONAL','uriesand@esap.edu.co'),
    ('34065777','VIVIANA GALLEGO RUDAS','VIVIANA','GALLEGO','RUDAS','RIS','OCASIONAL','viviana.gallegor@esap.edu.co'),
    ('1042434473','WENDY LORAINE DE LEON ZAMORA','WENDY LORAINE DE','LEON','ZAMORA','ATL','CARRERA_003','wendy.deleon@esap.edu.co'),
    ('10306054','WILLIAM BERNARDO MACIAS OROZCO','WILLIAM BERNARDO','MACIAS','OROZCO','CAU','CARRERA_003','william.macias@esap.edu.co'),
    ('1143122185','WILLIAM DE JESUS MANJARRES DE AVILA','WILLIAM DE JESUS MANJARRES','DE','AVILA','ATL','CARRERA_003','william.manjarres@esap.edu.co'),
    ('4080160','WILLIAM GUILLERMO JIMENEZ BENITEZ','WILLIAM GUILLERMO','JIMENEZ','BENITEZ','SC','CARRERA_003','willjime@esap.edu.co'),
    ('79388826','WILLIAM HERNANDO ALFONSO PIÑA','WILLIAM HERNANDO','ALFONSO','PIÑA','BOY','CARRERA_003','william.alfonso@esap.edu.co'),
    ('80054833','WILMAR ANTONIO PALACIOS MACHADO','WILMAR ANTONIO','PALACIOS','MACHADO','CHO','OCASIONAL','wilman.palacios@esap.edu.co'),
    ('17321741','WILSON HERNANDO LADINO ORJUELA','WILSON HERNANDO','LADINO','ORJUELA','BCS','CARRERA_003','wilsladi@esap.edu.co'),
    ('79627916','WILSON RIGOBERTO PABON QUINTERO','WILSON RIGOBERTO','PABON','QUINTERO','HUI','CARRERA_003','wilsonr.pabon@esap.edu.co'),
    ('91473579','WILSON RODRIGUEZ CALDERON','WILSON','RODRIGUEZ','CALDERON','HUI','CARRERA_003','wilson.rodriguezc@esap.edu.co'),
    ('79137214','YESID HERNANDO TAFUR PRADA','YESID HERNANDO','TAFUR','PRADA','TOL','OCASIONAL','yesid.tafur@esap.edu.co'),
    ('39750090','YOLANDA RODRIGUEZ RINCON','YOLANDA','RODRIGUEZ','RINCON','SC','CARRERA_003','yolanda.rodriguez@esap.edu.co'),
    ('77016614','YOVANNY ORLANDO ROMERO RAMIREZ','YOVANNY ORLANDO','ROMERO','RAMIREZ','ATL','OCASIONAL','yovannyromero@esap.edu.co'),
    ('1061725863','YULIETH KARINA MERA PAZ','YULIETH KARINA','MERA','PAZ','CAU','PERIODO_DE_PRUEBA','yulieth.mera@esap.edu.co');

  -- Resolver id_seccional real por código de territorial
  CREATE TEMP TABLE tmp_doc_resolved ON COMMIT DROP AS
  SELECT t.*,
    (SELECT sec.id_seccional FROM auth.seccionales sec
      WHERE UPPER(NULLIF(BTRIM(sec.cod_seccional),'')) = UPPER(t.terr_cod)
      ORDER BY sec.id_seccional LIMIT 1) AS id_seccional
  FROM tmp_doc_seed t;

  -- 1. auth.personas (por num_identificacion)
  INSERT INTO auth.personas (
    id_person, num_identificacion, tip_identificacion, nom_largo, nom_tercero,
    pri_apellido, seg_apellido, gen_tercero, dir_email, id_seccional,
    fec_creacion, fec_modificacion, usu_creacion, usu_modificacion
  )
  SELECT gen_random_uuid(), t.num_doc, 'CC', t.nombre_completo, t.nom,
         NULLIF(t.ape1,''), NULLIF(t.ape2,''), 'N', t.correo, t.id_seccional,
         NOW(), NOW(), 'migration_219', 'migration_219'
  FROM tmp_doc_resolved t
  WHERE NOT EXISTS (SELECT 1 FROM auth.personas p WHERE p.num_identificacion = t.num_doc)
    AND NOT EXISTS (SELECT 1 FROM auth.personas p WHERE LOWER(p.dir_email) = LOWER(t.correo));

  -- Actualizar id_seccional de los que ya existían pero sin territorial
  UPDATE auth.personas p
  SET id_seccional = t.id_seccional
  FROM tmp_doc_resolved t
  WHERE p.num_identificacion = t.num_doc AND p.id_seccional IS NULL AND t.id_seccional IS NOT NULL;

  -- 2. auth."user" (username = correo)
  INSERT INTO auth."user" (id_user, username, password_hash, id_person, is_active, password_temp, created_at, updated_at)
  SELECT gen_random_uuid(), t.correo, v_pwd, p.id_person, true, true, NOW(), NOW()
  FROM tmp_doc_resolved t
  JOIN auth.personas p ON p.num_identificacion = t.num_doc
  WHERE NOT EXISTS (SELECT 1 FROM auth."user" u WHERE LOWER(u.username) = LOWER(t.correo) OR u.id_person = p.id_person);

  -- 3. Rol DOCENTE
  INSERT INTO auth.user_roles (id_user, id_rol)
  SELECT u.id_user, v_docente_role
  FROM tmp_doc_resolved t
  JOIN auth.personas p ON p.num_identificacion = t.num_doc
  JOIN auth."user" u ON u.id_person = p.id_person
  WHERE NOT EXISTS (SELECT 1 FROM auth.user_roles ur WHERE ur.id_user = u.id_user AND ur.id_rol = v_docente_role);

  -- 4. academic_work_plan."Docente" (personaId = id_person)
  INSERT INTO academic_work_plan."Docente" (
    id, "personaId", "territorialId", "tipoVinculacion", dedicacion, estado,
    "horasAsignables", "correoInstitucional", "createdAt", "updatedAt"
  )
  -- personaId es uuid (FK a auth.personas tras migración 315).
  -- territorialId guarda el id_seccional (bigint as text) de auth.seccionales, SIN FK.
  SELECT p.id_person, p.id_person,
         COALESCE(t.id_seccional::text, (SELECT id_seccional::text FROM auth.seccionales ORDER BY id_seccional LIMIT 1)),
         t.vinculacion, 'Tiempo Completo', 'ACTIVO',
         800, t.correo, NOW(), NOW()
  FROM tmp_doc_resolved t
  JOIN auth.personas p ON p.num_identificacion = t.num_doc
  WHERE NOT EXISTS (
    SELECT 1 FROM academic_work_plan."Docente" d
    WHERE d."personaId" = p.id_person OR d.id = p.id_person
  );
END $$;
