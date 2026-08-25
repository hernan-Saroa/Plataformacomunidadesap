import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HealthController } from './health/health.controller';
import { HiringModule } from './modules/hiring/hiring.module';
import { EstudioPrevioModule } from './modules/estudio-previo/estudio-previo.module';
import { UmbralesModule } from './modules/umbrales/umbrales.module';
import { CdpModule } from './modules/cdp/cdp.module';
import { ConfiguracionModule } from './modules/configuracion/configuracion.module';
import { PublicacionModule } from './modules/publicacion/publicacion.module';
import { ObservacionesModule } from './modules/observaciones/observaciones.module';
import { MipymeModule } from './modules/mipyme/mipyme.module';
import { DocumentosModule } from './modules/documentos/documentos.module';
import { AperturaModule } from './modules/apertura/apertura.module';
import { RiesgosModule } from './modules/riesgos/riesgos.module';
import { AdendasModule } from './modules/adendas/adendas.module';
import { OfertasModule } from './modules/ofertas/ofertas.module';
import { ComiteModule } from './modules/comite/comite.module';
import { ContratosModule } from './modules/contratos/contratos.module';
import { LegalizacionModule } from './modules/legalizacion/legalizacion.module';
import { SupervisionModule } from './modules/supervision/supervision.module';
import { RegistroPresupuestalModule } from './modules/registro-presupuestal/registro-presupuestal.module';
import { PublicacionContratoModule } from './modules/publicacion-contrato/publicacion-contrato.module';
import { ActaInicioModule } from './modules/acta-inicio/acta-inicio.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

import { Proceso } from './entities/proceso.entity';
import { Expediente } from './entities/expediente.entity';
import { ProcesoActividad } from './entities/proceso-actividad.entity';
import { CampoFormulario } from './entities/campo-formulario.entity';
import { Documento } from './entities/documento.entity';
import { Trazabilidad } from './entities/trazabilidad.entity';
import { Revision } from './entities/revision.entity';
import { Plantilla } from './entities/plantilla.entity';
import { Modalidad } from './entities/modalidad.entity';
import { UmbralModalidad } from './entities/umbral-modalidad.entity';
import { Smmlv } from './entities/smmlv.entity';
import { Cdp } from './entities/cdp.entity';
import { Actividad, ActividadExcluida, ActividadSalvedad } from './entities/actividad.entity';
import { ReglaActividad } from './entities/regla-actividad.entity';
import { PublicacionPliego } from './entities/publicacion-pliego.entity';
import { PlazoPublicacion } from './entities/plazo-publicacion.entity';
import { DiaNoHabil } from './entities/dia-no-habil.entity';
import { ObservacionPliego } from './entities/observacion-pliego.entity';
import { ManifestacionMipyme } from './entities/manifestacion-mipyme.entity';
import { LimitacionMipyme } from './entities/limitacion-mipyme.entity';
import { ParametroMipyme } from './entities/parametro-mipyme.entity';
import { DocumentoRequerido } from './entities/documento-requerido.entity';
import { DocumentoProceso } from './entities/documento-proceso.entity';
import { AperturaProceso } from './entities/apertura-proceso.entity';
import { AudienciaRiesgos, AudienciaRiesgosConfig } from './entities/audiencia-riesgos.entity';
import { Adenda } from './entities/adenda.entity';
import { RecepcionOfertas } from './entities/recepcion-ofertas.entity';
import { Oferente } from './entities/oferente.entity';
import { PlazoOfertas } from './entities/plazo-ofertas.entity';
import { ComiteEvaluador } from './entities/comite-evaluador.entity';
import { MiembroComite } from './entities/miembro-comite.entity';
import { Contrato } from './entities/contrato.entity';
import { FirmaContrato } from './entities/firma-contrato.entity';
import { Garantia } from './entities/garantia.entity';
import { Amparo, TipoAmparo } from './entities/amparo.entity';
import { AfiliacionArl } from './entities/afiliacion-arl.entity';
import { ActaInicio } from './entities/acta-inicio.entity';
import { SupervisionContrato } from './entities/supervision-contrato.entity';
import { RegistroPresupuestal } from './entities/registro-presupuestal.entity';
import { PlazoPublicacionContrato, PublicacionContrato } from './entities/publicacion-contrato.entity';
import { TipologiaContrato } from './entities/tipologia-contrato.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'postgres'),
        password: config.get<string>('DB_PASS', 'esap_secure_password_2024'),
        database: config.get<string>('DB_NAME', 'esap_db'),
        schema: config.get<string>('DB_SCHEMA', 'hiring'),
        entities: [Proceso, Expediente, ProcesoActividad, CampoFormulario, Documento, Trazabilidad, Revision, Plantilla, Modalidad, UmbralModalidad, Smmlv, Cdp, Actividad, ActividadExcluida, ActividadSalvedad, ReglaActividad, PublicacionPliego, PlazoPublicacion, DiaNoHabil, ObservacionPliego, ManifestacionMipyme, LimitacionMipyme, ParametroMipyme, DocumentoRequerido, DocumentoProceso, AperturaProceso, AudienciaRiesgos, AudienciaRiesgosConfig, Adenda, RecepcionOfertas, Oferente, PlazoOfertas, ComiteEvaluador, MiembroComite, Contrato, TipologiaContrato, FirmaContrato, Garantia, Amparo, TipoAmparo, AfiliacionArl, SupervisionContrato, RegistroPresupuestal, PublicacionContrato, PlazoPublicacionContrato, ActaInicio],
        // El esquema lo gobiernan las migraciones de db/migrations/hiring
        synchronize: false,
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),
    AuthModule,
    HiringModule,
    EstudioPrevioModule,
    UmbralesModule,
    CdpModule,
    ConfiguracionModule,
    PublicacionModule,
    ObservacionesModule,
    MipymeModule,
    // Después de CdpModule a propósito: `POST /procesos/:id/documentos/iniciar`
    // vive en el controller de la apertura y debe seguir resolviéndose antes de
    // que Nest considere las rutas de este módulo.
    DocumentosModule,
    AperturaModule,
    RiesgosModule,
    AdendasModule,
    OfertasModule,
    ComiteModule,
    ContratosModule,
    LegalizacionModule,
    SupervisionModule,
    RegistroPresupuestalModule,
    PublicacionContratoModule,
    ActaInicioModule,
  ],
  controllers: [HealthController],
  providers: [
    // Todo endpoint queda autenticado salvo que se marque con @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
