import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { EntitiesMetadataStorage } from '@nestjs/typeorm/dist/entities-metadata.storage';
import { TYPEORM_MODULE_OPTIONS } from '@nestjs/typeorm/dist/typeorm.constants';
import { DataSource, DataSourceOptions } from 'typeorm';
import { AppModule } from './app.module';
import { ProgramaEntity } from './entities/programa.entity';
import { FacultadEntity } from './entities/facultad.entity';
import { BancoDocenteEntity } from './entities/banco-docente.entity';
import { PlanTrabajoAcademicoEntity } from './entities/plan-trabajo-academico.entity';

class MetadataDataSource extends DataSource {
  prepareMetadata() {
    return this.buildMetadatas();
  }
}

describe('RUND TypeORM configuration', () => {
  it('resolves all registered entity relations without connecting to PostgreSQL', async () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule);
    const rootTypeOrmModule = imports.find((module: any) =>
      module.module === TypeOrmModule && module.imports?.some((core: any) =>
        core.providers?.some((provider: any) => provider.provide === TYPEORM_MODULE_OPTIONS),
      ),
    );
    const options: TypeOrmModuleOptions = rootTypeOrmModule.imports
      .flatMap((core: any) => core.providers || [])
      .find((provider: any) => provider.provide === TYPEORM_MODULE_OPTIONS).useValue;
    const entities = [...new Set([
      ...(options.entities as Function[]),
      ...(options.autoLoadEntities
        ? EntitiesMetadataStorage.getEntitiesByDataSource(options.name || 'default')
        : []),
    ])];
    const dataSource = new MetadataDataSource({
      ...options,
      entities,
    } as DataSourceOptions);

    await dataSource.prepareMetadata();

    expect(dataSource.hasMetadata(ProgramaEntity)).toBe(false);
    expect(dataSource.hasMetadata(FacultadEntity)).toBe(false);
    expect(dataSource.hasMetadata(PlanTrabajoAcademicoEntity)).toBe(false);
    expect(dataSource.getMetadata(BancoDocenteEntity).tablePath).toBe('rund.Docente');
    expect(dataSource.isInitialized).toBe(false);
    expect(options.synchronize).toBe(false);
  });
});
