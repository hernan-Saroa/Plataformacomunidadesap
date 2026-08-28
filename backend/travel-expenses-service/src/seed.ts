import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { ComisionadoEntity } from './entities/comisionado.entity';
import { SolicitudComisionEntity } from './entities/solicitud-comision.entity';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  console.log('🌱 Iniciando seed de datos de prueba (travel-expenses)...\n');

  try {
    const comisionadoRepo = dataSource.getRepository(ComisionadoEntity);
    const solicitudRepo = dataSource.getRepository(SolicitudComisionEntity);

    const existingCount = await comisionadoRepo.count();
    if (existingCount > 0) {
      console.log(`⚠️  Ya existen ${existingCount} comisionado(s). Seed cancelado para no duplicar.`);
      await app.close();
      process.exit(0);
    }

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
        estadoSolicitud: 'SOLICITADO',
        radicadoFueraJornada: false,
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
        estadoSolicitud: 'APROBADO_JEFE',
        radicadoFueraJornada: false,
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
        estadoSolicitud: 'APROBADO_TALENTO_HUMANO',
        radicadoFueraJornada: false,
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
        estadoSolicitud: 'RESOLUCION_EMITIDA',
        radicadoFueraJornada: true,
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
        estadoSolicitud: 'TIQUETES_COMPRADOS',
        radicadoFueraJornada: false,
        creadoPorUsuarioId: 'USUARIO_NO_AUTENTICADO',
      },
    ]);

    await solicitudRepo.save(solicitudes);
    console.log(`✅ ${solicitudes.length} solicitudes de comision creadas.`);

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
