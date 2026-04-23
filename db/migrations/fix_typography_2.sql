UPDATE auth.personas SET
  nom_largo = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(nom_largo, 
    'Contrataci??n', 'Contratación'), 'J??nior', 'Júnior'), 'Revisi??n', 'Revisión'), 'Comit??', 'Comité'), 'Acad??mico', 'Académico'),
  nom_tercero = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(nom_tercero, 
    'Contrataci??n', 'Contratación'), 'J??nior', 'Júnior'), 'Revisi??n', 'Revisión'), 'Comit??', 'Comité'), 'Acad??mico', 'Académico'),
  pri_apellido = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(pri_apellido, 
    'Contrataci??n', 'Contratación'), 'J??nior', 'Júnior'), 'Revisi??n', 'Revisión'), 'Comit??', 'Comité'), 'Acad??mico', 'Académico'),
  seg_apellido = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(seg_apellido, 
    'Contrataci??n', 'Contratación'), 'J??nior', 'Júnior'), 'Revisi??n', 'Revisión'), 'Comit??', 'Comité'), 'Acad??mico', 'Académico');

UPDATE control_interno.configuracion_profesionales_ocig SET
  rol_ocig = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(rol_ocig, 
    'Contrataci??n', 'Contratación'), 'J??nior', 'Júnior'), 'Revisi??n', 'Revisión'), 'Comit??', 'Comité'), 'Acad??mico', 'Académico'),
  especialidades = string_to_array(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(array_to_string(especialidades, '|||'), 
    'Contrataci??n', 'Contratación'), 'J??nior', 'Júnior'), 'Revisi??n', 'Revisión'), 'Comit??', 'Comité'), 'Acad??mico', 'Académico'), '|||');
