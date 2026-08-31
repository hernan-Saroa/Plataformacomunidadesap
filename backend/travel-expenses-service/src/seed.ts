import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { ComisionadoEntity } from './entities/comisionado.entity';
import { SolicitudComisionEntity } from './entities/solicitud-comision.entity';
import { CampoFormularioEntity } from './entities/config/campo-formulario.entity';
import { ConfigTipoComisionadoEntity } from './entities/config/config-tipo-comisionado.entity';
import { TipoDocumentoSoporteEntity } from './entities/config/tipo-documento-soporte.entity';
import { ConfigTipoComisionadoDocumentoEntity } from './entities/config/config-tipo-comisionado-documento.entity';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  console.log('🌱 Iniciando seed de datos de prueba (travel-expenses)...\n');

  try {
    const comisionadoRepo = dataSource.getRepository(ComisionadoEntity);
    const solicitudRepo = dataSource.getRepository(SolicitudComisionEntity);
    const campoRepo = dataSource.getRepository(CampoFormularioEntity);
    const configRepo = dataSource.getRepository(ConfigTipoComisionadoEntity);

    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS travel_expenses.config_campos_formulario (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        clave VARCHAR(100) NOT NULL UNIQUE,
        etiqueta VARCHAR(200) NOT NULL,
        tipo_campo VARCHAR(50) NOT NULL,
        placeholder VARCHAR(200),
        opciones JSONB,
        grupo VARCHAR(50),
        orden INTEGER NOT NULL DEFAULT 0,
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
        actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS travel_expenses.config_tipo_comisionado (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tipo_comisionado VARCHAR(50) NOT NULL UNIQUE,
        codigo_formulario VARCHAR(50) NOT NULL,
        campos_obligatorios JSONB NOT NULL DEFAULT '[]',
        campos_opcionales JSONB NOT NULL DEFAULT '[]',
        campos_ocultos JSONB NOT NULL DEFAULT '[]',
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
        actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await dataSource.query(`
      ALTER TABLE travel_expenses.config_tipo_comisionado
        ADD COLUMN IF NOT EXISTS codigo_formulario VARCHAR(50) NOT NULL DEFAULT 'REPORTE_SOLICITUD'
    `);

    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS travel_expenses.tipos_documento_soporte (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        codigo VARCHAR(50) NOT NULL UNIQUE,
        nombre VARCHAR(100) NOT NULL,
        descripcion VARCHAR(255),
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
        actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS travel_expenses.config_tipo_comisionado_documentos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        config_tipo_comisionado_id UUID NOT NULL REFERENCES travel_expenses.config_tipo_comisionado(id) ON DELETE CASCADE,
        tipo_documento_soporte_id UUID NOT NULL REFERENCES travel_expenses.tipos_documento_soporte(id) ON DELETE CASCADE,
        tipo_requisito VARCHAR(20) NOT NULL CHECK (tipo_requisito IN ('OBLIGATORIO', 'OPCIONAL')),
        creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
        actualizado_en TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(config_tipo_comisionado_id, tipo_documento_soporte_id)
      )
    `);

    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_config_campos_clave ON travel_expenses.config_campos_formulario(clave)
    `);

    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_config_campos_grupo_orden ON travel_expenses.config_campos_formulario(grupo, orden)
    `);

    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_config_tipo_comisionado_tipo ON travel_expenses.config_tipo_comisionado(tipo_comisionado)
    `);

    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_config_tipo_comisionado_codigo_formulario ON travel_expenses.config_tipo_comisionado(codigo_formulario)
    `);

    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_tipos_documento_soporte_codigo ON travel_expenses.tipos_documento_soporte(codigo)
    `);

    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_config_tipo_comisionado_documentos_config ON travel_expenses.config_tipo_comisionado_documentos(config_tipo_comisionado_id)
    `);

    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_config_tipo_comisionado_documentos_tipo ON travel_expenses.config_tipo_comisionado_documentos(tipo_documento_soporte_id)
    `);

    const existingComisionados = await comisionadoRepo.count();
    if (existingComisionados > 0) {
      console.log(
        `⚠️  Ya existen ${existingComisionados} comisionado(s). Se omite la carga de comisionados y solicitudes.`,
      );
    } else {
      const comisionados = comisionadoRepo.create([
        {
          numeroDocumento: '123456789',
          primerNombre: 'Juan',
          segundoNombre: 'Pablo',
          primerApellido: 'Suárez',
          segundoApellido: '',
          email: 'juan.pablo.suarez@esap.edu.co',
          telefonoContacto: '3001234567',
          tipoComisionado: 'FUNCIONARIO',
          origenDatos: 'HUMANO',
          autorizacionHabeasData: true,
          fechaAutorizacionHabeasData: new Date('2026-01-15'),
          ipRegistroHabeasData: '127.0.0.1',
        },
        {
          numeroDocumento: '1004734004',
          primerNombre: 'Juan',
          segundoNombre: 'Pablo',
          primerApellido: 'Suárez',
          segundoApellido: '',
          email: 'juan.pablo.suarez2@esap.edu.co',
          telefonoContacto: '3007654321',
          tipoComisionado: 'CONTRATISTA',
          origenDatos: 'HUMANO',
          autorizacionHabeasData: true,
          fechaAutorizacionHabeasData: new Date('2026-02-10'),
          ipRegistroHabeasData: '127.0.0.1',
        },
        {
          numeroDocumento: '1019283746',
          primerNombre: 'Carlos',
          segundoNombre: 'Eduardo',
          primerApellido: 'Ramírez',
          segundoApellido: 'Gómez',
          email: 'carlos.ramirez@esap.edu.co',
          telefonoContacto: '3159876543',
          tipoComisionado: 'FUNCIONARIO',
          origenDatos: 'HUMANO',
          autorizacionHabeasData: true,
          fechaAutorizacionHabeasData: new Date('2026-03-05'),
          ipRegistroHabeasData: '127.0.0.1',
        },
        {
          numeroDocumento: '52839102',
          primerNombre: 'Ana',
          segundoNombre: 'María',
          primerApellido: 'Gómez',
          segundoApellido: 'Quintero',
          email: 'ana.gomez@esap.edu.co',
          telefonoContacto: '3204567890',
          tipoComisionado: 'DOCENTE',
          origenDatos: 'HUMANO',
          autorizacionHabeasData: true,
          fechaAutorizacionHabeasData: new Date('2026-03-20'),
          ipRegistroHabeasData: '127.0.0.1',
        },
        {
          numeroDocumento: '79483920',
          primerNombre: 'Jorge',
          segundoNombre: 'Enrique',
          primerApellido: 'Vargas',
          segundoApellido: 'Muñoz',
          email: 'jorge.vargas@esap.edu.co',
          telefonoContacto: '3501234567',
          tipoComisionado: 'FUNCIONARIO',
          origenDatos: 'HUMANO',
          autorizacionHabeasData: true,
          fechaAutorizacionHabeasData: new Date('2026-04-12'),
          ipRegistroHabeasData: '127.0.0.1',
        },
      ]);

      const savedComisionados = await comisionadoRepo.save(comisionados);
      console.log(`✅ ${savedComisionados.length} comisionados creados.`);

      const solicitudes = solicitudRepo.create([
        {
          consecutivoUnico: 'COM-2026-0001',
          comisionadoId: savedComisionados[0].id,
          destinoCiudad: 'Bogotá',
          destinoDepartamento: 'Cundinamarca',
          fechaInicio: new Date('2026-09-01'),
          fechaFin: new Date('2026-09-05'),
          objetoComision: 'Comision de servicios institucionales',
          prioridad: 'ALTA',
          rubroPresupuestal: 'Rubro 01',
          requiereTiquetes: false,
          montoViaticos: 560000,
          montoGastosViaje: 120000,
          diasComision: 5,
          estadoSolicitud: 'SOLICITADO',
          radicadoFueraJornada: false,
          extemporanea: false,
          creadoPorUsuarioId: 'USUARIO_NO_AUTENTICADO',
        },
        {
          consecutivoUnico: 'COM-2026-0002',
          comisionadoId: savedComisionados[1].id,
          destinoCiudad: 'Medellín',
          destinoDepartamento: 'Antioquia',
          fechaInicio: new Date('2026-09-10'),
          fechaFin: new Date('2026-09-12'),
          objetoComision: 'Comision de capacitacion docente',
          prioridad: 'MEDIA',
          rubroPresupuestal: 'Rubro 02',
          requiereTiquetes: true,
          montoViaticos: 420000,
          montoGastosViaje: 90000,
          diasComision: 3,
          estadoSolicitud: 'APROBADO_JEFE',
          radicadoFueraJornada: false,
          extemporanea: false,
          creadoPorUsuarioId: 'USUARIO_NO_AUTENTICADO',
        },
        {
          consecutivoUnico: 'COM-2026-0003',
          comisionadoId: savedComisionados[2].id,
          destinoCiudad: 'Cali',
          destinoDepartamento: 'Valle del Cauca',
          fechaInicio: new Date('2026-09-15'),
          fechaFin: new Date('2026-09-18'),
          objetoComision: 'Acompanamiento a autoevaluacion institucional',
          prioridad: 'ALTA',
          rubroPresupuestal: 'Rubro 03',
          requiereTiquetes: true,
          montoViaticos: 720000,
          montoGastosViaje: 180000,
          diasComision: 4,
          estadoSolicitud: 'APROBADO_TALENTO_HUMANO',
          radicadoFueraJornada: false,
          extemporanea: false,
          creadoPorUsuarioId: 'USUARIO_NO_AUTENTICADO',
        },
        {
          consecutivoUnico: 'COM-2026-0004',
          comisionadoId: savedComisionados[3].id,
          destinoCiudad: 'Bucaramanga',
          destinoDepartamento: 'Santander',
          fechaInicio: new Date('2026-09-20'),
          fechaFin: new Date('2026-09-25'),
          objetoComision: 'Sesion de trabajo territorial',
          prioridad: 'MEDIA',
          rubroPresupuestal: 'Rubro 04',
          requiereTiquetes: false,
          montoViaticos: 980000,
          montoGastosViaje: 150000,
          diasComision: 6,
          estadoSolicitud: 'EXTEMPORANEA',
          radicadoFueraJornada: true,
          extemporanea: true,
          creadoPorUsuarioId: 'USUARIO_NO_AUTENTICADO',
        },
        {
          consecutivoUnico: 'COM-2026-0005',
          comisionadoId: savedComisionados[4].id,
          destinoCiudad: 'Cartagena',
          destinoDepartamento: 'Bolívar',
          fechaInicio: new Date('2026-10-02'),
          fechaFin: new Date('2026-10-06'),
          objetoComision: 'Inspeccion de programas academicos',
          prioridad: 'ALTA',
          rubroPresupuestal: 'Rubro 05',
          requiereTiquetes: true,
          montoViaticos: 1260000,
          montoGastosViaje: 300000,
          diasComision: 5,
          estadoSolicitud: 'TIQUETES_COMPRADOS',
          radicadoFueraJornada: false,
          extemporanea: false,
          creadoPorUsuarioId: 'USUARIO_NO_AUTENTICADO',
        },
      ]);

      await solicitudRepo.save(solicitudes);
      console.log(`✅ ${solicitudes.length} solicitudes de comision creadas.`);
    }

    const existingCampos = await campoRepo.count();
    if (existingCampos === 0) {
      const campos = campoRepo.create([
        {
          clave: 'documentoComisionado',
          etiqueta: 'Documento de Identidad',
          tipoCampo: 'TEXT',
          placeholder: 'Ej. 1019283746',
          opciones: null,
          grupo: 'comisionado',
          orden: 1,
          activo: true,
        },
        {
          clave: 'objetoComision',
          etiqueta: 'Objeto / Justificación de la comisión',
          tipoCampo: 'TEXTAREA',
          placeholder: 'Describa el objetivo institucional de la comisión...',
          opciones: null,
          grupo: 'comision',
          orden: 2,
          activo: true,
        },
        {
          clave: 'destinoDepartamento',
          etiqueta: 'Departamento',
          tipoCampo: 'SELECT',
          placeholder: null,
          opciones: null,
          grupo: 'comision',
          orden: 3,
          activo: true,
        },
        {
          clave: 'destinoCiudad',
          etiqueta: 'Ciudad',
          tipoCampo: 'SELECT',
          placeholder: null,
          opciones: null,
          grupo: 'comision',
          orden: 4,
          activo: true,
        },
        {
          clave: 'fechaInicio',
          etiqueta: 'Fecha Inicio',
          tipoCampo: 'DATE',
          placeholder: null,
          opciones: null,
          grupo: 'comision',
          orden: 5,
          activo: true,
        },
        {
          clave: 'fechaFin',
          etiqueta: 'Fecha Fin',
          tipoCampo: 'DATE',
          placeholder: null,
          opciones: null,
          grupo: 'comision',
          orden: 6,
          activo: true,
        },
        {
          clave: 'rubroPresupuestal',
          etiqueta: 'Rubro Presupuestal',
          tipoCampo: 'TEXT',
          placeholder: 'Ej. Rubro 01',
          opciones: null,
          grupo: 'comision',
          orden: 7,
          activo: true,
        },
        {
          clave: 'prioridad',
          etiqueta: 'Prioridad',
          tipoCampo: 'SELECT',
          placeholder: null,
          opciones: [
            { value: 'ALTA', label: 'Alta' },
            { value: 'MEDIA', label: 'Media' },
            { value: 'BAJA', label: 'Baja' },
          ],
          grupo: 'comision',
          orden: 8,
          activo: true,
        },
        {
          clave: 'montoViaticos',
          etiqueta: 'Viáticos',
          tipoCampo: 'CURRENCY',
          placeholder: null,
          opciones: null,
          grupo: 'valores',
          orden: 9,
          activo: true,
        },
        {
          clave: 'montoGastosViaje',
          etiqueta: 'Gastos de viaje',
          tipoCampo: 'CURRENCY',
          placeholder: null,
          opciones: null,
          grupo: 'valores',
          orden: 10,
          activo: true,
        },
        {
          clave: 'diasComision',
          etiqueta: 'Días de comisión',
          tipoCampo: 'NUMBER',
          placeholder: null,
          opciones: null,
          grupo: 'valores',
          orden: 11,
          activo: true,
        },
        {
          clave: 'requiereTiquetes',
          etiqueta: 'Requiere tiquetes aéreos / pasajes',
          tipoCampo: 'BOOLEAN',
          placeholder: null,
          opciones: null,
          grupo: 'comision',
          orden: 12,
          activo: true,
        },
      ] as any);

      await campoRepo.save(campos);
      console.log(`✅ ${campos.length} campos de formulario creados.`);
    }

    const existingTiposDoc = await dataSource
      .getRepository(TipoDocumentoSoporteEntity)
      .count();
    if (existingTiposDoc === 0) {
      const tiposDoc = dataSource
        .getRepository(TipoDocumentoSoporteEntity)
        .create([
          {
            codigo: 'CDP',
            nombre: 'Certificado de Disponibilidad Presupuestal',
            descripcion: 'CDP',
            activo: true,
          },
          {
            codigo: 'RUT',
            nombre: 'RUT',
            descripcion: 'Registro único tributario',
            activo: true,
          },
          {
            codigo: 'CERT_BANCARIA',
            nombre: 'Certificación Bancaria',
            descripcion: 'Certificación bancaria',
            activo: true,
          },
          {
            codigo: 'SEGURIDAD_SOCIAL',
            nombre: 'Seguridad Social',
            descripcion: 'Certificado de seguridad social',
            activo: true,
          },
          {
            codigo: 'CONTRATO_SECOP',
            nombre: 'Contrato SECOP',
            descripcion: 'Contrato SECOP',
            activo: true,
          },
        ]);
      await dataSource.getRepository(TipoDocumentoSoporteEntity).save(tiposDoc);
      console.log(`✅ ${tiposDoc.length} tipos de documento soporte creados.`);
    }

    const existingConfigs = await configRepo.count();
    if (existingConfigs === 0) {
      const configs = configRepo.create([
        {
          tipoComisionado: 'FUNCIONARIO',
          codigoFormulario: 'REPORTE_SOLICITUD',
          camposObligatorios: [
            'documentoComisionado',
            'objetoComision',
            'destinoDepartamento',
            'destinoCiudad',
            'fechaInicio',
            'fechaFin',
            'rubroPresupuestal',
            'montoViaticos',
            'montoGastosViaje',
            'diasComision',
            'requiereTiquetes',
          ],
          camposOpcionales: ['prioridad'],
          camposOcultos: [],
          activo: true,
        },
        {
          tipoComisionado: 'CONTRATISTA',
          codigoFormulario: 'REPORTE_SOLICITUD',
          camposObligatorios: [
            'documentoComisionado',
            'objetoComision',
            'destinoDepartamento',
            'destinoCiudad',
            'fechaInicio',
            'fechaFin',
            'rubroPresupuestal',
            'montoViaticos',
            'montoGastosViaje',
            'diasComision',
            'requiereTiquetes',
          ],
          camposOpcionales: ['prioridad'],
          camposOcultos: [],
          activo: true,
        },
        {
          tipoComisionado: 'DOCENTE',
          codigoFormulario: 'REPORTE_SOLICITUD',
          camposObligatorios: [
            'documentoComisionado',
            'objetoComision',
            'destinoDepartamento',
            'destinoCiudad',
            'fechaInicio',
            'fechaFin',
            'rubroPresupuestal',
            'montoViaticos',
            'montoGastosViaje',
            'diasComision',
            'requiereTiquetes',
          ],
          camposOpcionales: ['prioridad'],
          camposOcultos: [],
          activo: true,
        },
        {
          tipoComisionado: 'ESTUDIANTE',
          codigoFormulario: 'REPORTE_SOLICITUD',
          camposObligatorios: [
            'documentoComisionado',
            'objetoComision',
            'destinoDepartamento',
            'destinoCiudad',
            'fechaInicio',
            'fechaFin',
            'rubroPresupuestal',
            'montoViaticos',
            'montoGastosViaje',
            'diasComision',
          ],
          camposOpcionales: ['prioridad', 'requiereTiquetes'],
          camposOcultos: [],
          activo: true,
        },
        {
          tipoComisionado: 'INVESTIGADOR',
          codigoFormulario: 'REPORTE_SOLICITUD',
          camposObligatorios: [
            'documentoComisionado',
            'objetoComision',
            'destinoDepartamento',
            'destinoCiudad',
            'fechaInicio',
            'fechaFin',
            'rubroPresupuestal',
            'montoViaticos',
            'montoGastosViaje',
            'diasComision',
            'requiereTiquetes',
          ],
          camposOpcionales: ['prioridad'],
          camposOcultos: [],
          activo: true,
        },
        {
          tipoComisionado: 'DEFAULT',
          codigoFormulario: 'REPORTE_SOLICITUD',
          camposObligatorios: [
            'documentoComisionado',
            'objetoComision',
            'destinoDepartamento',
            'destinoCiudad',
            'fechaInicio',
            'fechaFin',
            'rubroPresupuestal',
            'montoViaticos',
            'montoGastosViaje',
            'diasComision',
            'requiereTiquetes',
          ],
          camposOpcionales: ['prioridad'],
          camposOcultos: [],
          activo: true,
        },
      ]);

      await configRepo.save(configs);
      console.log(
        `✅ ${configs.length} configuraciones de tipo comisionado creadas.`,
      );

      const configDocumentoRepo = dataSource.getRepository(
        ConfigTipoComisionadoDocumentoEntity,
      );
      const configsCreadas = await configRepo.find({ where: { activo: true } });
      const tiposDoc = await dataSource
        .getRepository(TipoDocumentoSoporteEntity)
        .find({ where: { activo: true } });

      const obtenerTipoDoc = (codigo: string) =>
        tiposDoc.find((t) => t.codigo === codigo);

      const relaciones: ConfigTipoComisionadoDocumentoEntity[] = [];
      for (const config of configsCreadas) {
        switch (config.tipoComisionado) {
          case 'FUNCIONARIO':
            relaciones.push(
              configDocumentoRepo.create({
                configTipoComisionadoId: config.id,
                tipoDocumentoSoporteId: obtenerTipoDoc('CDP')!.id,
                tipoRequisito: 'OBLIGATORIO',
              }),
              configDocumentoRepo.create({
                configTipoComisionadoId: config.id,
                tipoDocumentoSoporteId: obtenerTipoDoc('RUT')!.id,
                tipoRequisito: 'OBLIGATORIO',
              }),
              configDocumentoRepo.create({
                configTipoComisionadoId: config.id,
                tipoDocumentoSoporteId: obtenerTipoDoc('CERT_BANCARIA')!.id,
                tipoRequisito: 'OPCIONAL',
              }),
              configDocumentoRepo.create({
                configTipoComisionadoId: config.id,
                tipoDocumentoSoporteId: obtenerTipoDoc('SEGURIDAD_SOCIAL')!.id,
                tipoRequisito: 'OPCIONAL',
              }),
            );
            break;
          case 'CONTRATISTA':
            relaciones.push(
              configDocumentoRepo.create({
                configTipoComisionadoId: config.id,
                tipoDocumentoSoporteId: obtenerTipoDoc('CDP')!.id,
                tipoRequisito: 'OBLIGATORIO',
              }),
              configDocumentoRepo.create({
                configTipoComisionadoId: config.id,
                tipoDocumentoSoporteId: obtenerTipoDoc('RUT')!.id,
                tipoRequisito: 'OBLIGATORIO',
              }),
              configDocumentoRepo.create({
                configTipoComisionadoId: config.id,
                tipoDocumentoSoporteId: obtenerTipoDoc('CONTRATO_SECOP')!.id,
                tipoRequisito: 'OBLIGATORIO',
              }),
              configDocumentoRepo.create({
                configTipoComisionadoId: config.id,
                tipoDocumentoSoporteId: obtenerTipoDoc('CERT_BANCARIA')!.id,
                tipoRequisito: 'OPCIONAL',
              }),
            );
            break;
          case 'DOCENTE':
            relaciones.push(
              configDocumentoRepo.create({
                configTipoComisionadoId: config.id,
                tipoDocumentoSoporteId: obtenerTipoDoc('CDP')!.id,
                tipoRequisito: 'OBLIGATORIO',
              }),
              configDocumentoRepo.create({
                configTipoComisionadoId: config.id,
                tipoDocumentoSoporteId: obtenerTipoDoc('RUT')!.id,
                tipoRequisito: 'OBLIGATORIO',
              }),
              configDocumentoRepo.create({
                configTipoComisionadoId: config.id,
                tipoDocumentoSoporteId: obtenerTipoDoc('SEGURIDAD_SOCIAL')!.id,
                tipoRequisito: 'OPCIONAL',
              }),
            );
            break;
          case 'ESTUDIANTE':
            relaciones.push(
              configDocumentoRepo.create({
                configTipoComisionadoId: config.id,
                tipoDocumentoSoporteId: obtenerTipoDoc('CDP')!.id,
                tipoRequisito: 'OBLIGATORIO',
              }),
              configDocumentoRepo.create({
                configTipoComisionadoId: config.id,
                tipoDocumentoSoporteId: obtenerTipoDoc('RUT')!.id,
                tipoRequisito: 'OBLIGATORIO',
              }),
            );
            break;
          case 'INVESTIGADOR':
            relaciones.push(
              configDocumentoRepo.create({
                configTipoComisionadoId: config.id,
                tipoDocumentoSoporteId: obtenerTipoDoc('CDP')!.id,
                tipoRequisito: 'OBLIGATORIO',
              }),
              configDocumentoRepo.create({
                configTipoComisionadoId: config.id,
                tipoDocumentoSoporteId: obtenerTipoDoc('RUT')!.id,
                tipoRequisito: 'OBLIGATORIO',
              }),
              configDocumentoRepo.create({
                configTipoComisionadoId: config.id,
                tipoDocumentoSoporteId: obtenerTipoDoc('CERT_BANCARIA')!.id,
                tipoRequisito: 'OBLIGATORIO',
              }),
              configDocumentoRepo.create({
                configTipoComisionadoId: config.id,
                tipoDocumentoSoporteId: obtenerTipoDoc('SEGURIDAD_SOCIAL')!.id,
                tipoRequisito: 'OPCIONAL',
              }),
            );
            break;
          case 'DEFAULT':
            relaciones.push(
              configDocumentoRepo.create({
                configTipoComisionadoId: config.id,
                tipoDocumentoSoporteId: obtenerTipoDoc('CDP')!.id,
                tipoRequisito: 'OBLIGATORIO',
              }),
              configDocumentoRepo.create({
                configTipoComisionadoId: config.id,
                tipoDocumentoSoporteId: obtenerTipoDoc('RUT')!.id,
                tipoRequisito: 'OBLIGATORIO',
              }),
            );
            break;
        }
      }

      if (relaciones.length > 0) {
        await configDocumentoRepo.save(relaciones);
        console.log(
          `✅ ${relaciones.length} relaciones documento-configuración creadas.`,
        );
      }
    }

    console.log('\n🎉 Seed finalizado correctamente.');
  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  } finally {
    await app.close();
    process.exit(0);
  }
}

seed().catch((error) => {
  console.error('\n💥 Error fatal en seed:', error);
  process.exit(1);
});
