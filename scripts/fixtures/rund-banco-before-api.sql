WITH auth_docentes AS (
        SELECT
          u.id_user AS usuario_id,
          u.username,
          u.is_active AS activo,
          CASE
            WHEN UPPER(COALESCE(NULLIF(TRIM(d.estado), ''), CASE WHEN COALESCE(u.is_active, true) THEN 'ACTIVO' ELSE 'INACTIVO' END)) IN ('INACTIVO', 'RETIRADO', 'RETIRADO_DOCENTE', 'TERMINADO', 'DESVINCULADO') THEN false
            WHEN UPPER(COALESCE(NULLIF(TRIM(d.estado), ''), CASE WHEN COALESCE(u.is_active, true) THEN 'ACTIVO' ELSE 'INACTIVO' END)) = 'ACTIVO' THEN true
            ELSE COALESCE(u.is_active, true)
          END AS activo_efectivo,
          CASE
            WHEN UPPER(COALESCE(NULLIF(TRIM(d.estado), ''), CASE WHEN COALESCE(u.is_active, true) THEN 'ACTIVO' ELSE 'INACTIVO' END)) IN ('INACTIVO', 'RETIRADO', 'RETIRADO_DOCENTE', 'TERMINADO', 'DESVINCULADO') THEN 'INACTIVO'
            ELSE 'ACTIVO'
          END AS estado_efectivo,
          u.created_at,
          u.updated_at,
          p.id_person AS persona_id,
          p.num_identificacion AS documento_identidad,
          p.tip_identificacion AS tipo_documento,
          p.nom_largo AS nombre_completo,
          p.nom_tercero AS primer_nombre,
          p.pri_apellido AS primer_apellido,
          p.seg_apellido AS segundo_apellido,
          p.gen_tercero AS genero,
          p.fec_nacimiento AS fecha_nacimiento,
          p.dir_email AS email,
          p.tel_celular AS telefono,
          p.id_seccional AS auth_territorial_id,
          sec.nom_seccional AS auth_territorial,
          sec.cod_seccional AS auth_territorial_codigo,
          p.id_sede AS auth_sede_id,
          sede.nom_sede AS auth_sede,
          d.id AS docente_id,
          d."ordenListado" AS orden_listado,
          d."tipoVinculacion" AS vinculacion_codigo,
          d."vinculacionDisplay" AS vinculacion,
          d.dedicacion AS dedicacion_codigo,
          d."dedicacionDisplay" AS dedicacion,
          d."dedicacionHorasSemana" AS dedicacion_horas_semana,
          COALESCE(d."territorialId", p.id_seccional::text) AS territorial_id,
          COALESCE(NULLIF(BTRIM(d."territorialReportada"), ''), doc_sec.nom_seccional, sec.nom_seccional) AS territorial,
          d."territorialReportada" AS territorial_reportada,
          doc_sec.nom_seccional AS territorial_catalogo,
          COALESCE(doc_sec.cod_seccional, sec.cod_seccional) AS territorial_codigo,
          COALESCE(d."sedeId", p.id_sede::text) AS sede_id,
          COALESCE(doc_sede.nom_sede, sede.nom_sede) AS sede,
          d.escalafon AS categoria,
          d."nucleoTematico" AS nucleo_tematico,
          d."nivelFormacion" AS nivel_formacion,
          d."perfilAcademicoPro" AS perfil_academico_pro,
          d."perfilAcademico" AS perfil_academico,
          d.pregrado,
          d.especializacion,
          d.maestria,
          d.doctorado,
          d."posDoctorado" AS posdoctorado,
          d.investigacion,
          d."origenVinculacion" AS origen_vinculacion,
          d."actoAdministrativoVinculacion" AS acto_administrativo_vinculacion,
          d."correoInstitucional" AS correo_institucional,
          d."correoAlternativo" AS correo_personal,
          d."sexoBiologico" AS sexo_biologico,
          d."ultimaEvaluacion" AS ultima_evaluacion,
          d."situacionAdministrativa" AS situacion_administrativa,
          d."situacionCategoria" AS situacion_categoria,
          d."fechaInicioVinculacion" AS inicio_vinculacion,
          d."fechaFinVinculacion" AS fin_vinculacion,
          d."puntajeSalarial" AS puntaje_salarial,
          d."edadReferencia" AS edad_referencia,
          d."rangoEdad" AS rango_edad,
          d."horasAsignables" AS horas_programables,
          d."regimenNormativo" AS regimen_normativo,
          d."periodoCarga" AS periodo_carga,
          d."updatedAt" AS docente_updated_at,
          d.observaciones AS observaciones,
          d."idRund" AS id_rund,
          d.estado AS estado,
          ARRAY(
            SELECT DISTINCT r2.code
            FROM auth.user_roles ur2
            INNER JOIN auth.role r2 ON r2.id = ur2.id_rol AND COALESCE(r2.is_active, true) = true
            WHERE ur2.id_user = u.id_user
              AND COALESCE(ur2.is_active, true) = true
            ORDER BY r2.code
          ) AS roles
        FROM auth."user" u
        INNER JOIN auth.personas p ON p.id_person = u.id_person
        LEFT JOIN auth.seccionales sec ON sec.id_seccional = p.id_seccional
        LEFT JOIN auth.sedes sede ON sede.id_sede = p.id_sede
        LEFT JOIN rund."Docente" d ON d."personaId"::text = p.id_person::text
        LEFT JOIN auth.seccionales doc_sec ON doc_sec.id_seccional::text = d."territorialId"
        LEFT JOIN auth.sedes doc_sede ON doc_sede.id_sede::text = d."sedeId"
        WHERE EXISTS (
          SELECT 1
          FROM auth.user_roles ur
          INNER JOIN auth.role r ON r.id = ur.id_rol AND COALESCE(r.is_active, true) = true
          WHERE ur.id_user = u.id_user
            AND COALESCE(ur.is_active, true) = true
            AND (UPPER(r.code) = 'DOCENTE' OR UPPER(r.name) = 'DOCENTE')
        )
      )
