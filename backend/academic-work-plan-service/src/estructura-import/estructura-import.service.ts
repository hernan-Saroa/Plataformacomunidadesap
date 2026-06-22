import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as xlsx from 'xlsx';
import { DireccionTerritorialEntity } from '../pta/entities/direccion-territorial.entity';
import { CetapEntity } from '../pta/entities/cetap.entity';

@Injectable()
export class EstructuraImportService {
  constructor(
    @InjectRepository(DireccionTerritorialEntity)
    private readonly direccionRepo: Repository<DireccionTerritorialEntity>,
    @InjectRepository(CetapEntity)
    private readonly cetapRepo: Repository<CetapEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async processGeograficoUpload(buffer: Buffer, dryRun: boolean = false) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    
    // Parse DIRECCIONES_TERRITORIALES
    const dtSheetName = workbook.SheetNames.find(s => s === 'DIRECCIONES_TERRITORIALES');
    if (!dtSheetName) throw new BadRequestException('Falta la hoja DIRECCIONES_TERRITORIALES');
    
    const dtRaw = xlsx.utils.sheet_to_json(workbook.Sheets[dtSheetName]);
    const dts = this.parseDirecciones(dtRaw);

    // Parse CETAPS
    const cetapSheetName = workbook.SheetNames.find(s => s === 'CETAPS');
    if (!cetapSheetName) throw new BadRequestException('Falta la hoja CETAPS');
    
    const cetapRaw = xlsx.utils.sheet_to_json(workbook.Sheets[cetapSheetName]);
    const cetaps = this.parseCetaps(cetapRaw, dts);

    this.validateTransversal(dts, cetaps);

    if (dryRun) {
      return this.buildReport(dts, cetaps, true);
    }

    await this.dataSource.transaction(async manager => {
      // Upsert DTs
      for (const dt of dts) {
        const existing = await manager.findOne(DireccionTerritorialEntity, { where: { codigo: dt.codigo } });
        if (existing) {
          await manager.update(DireccionTerritorialEntity, { id: existing.id }, dt);
          dt.id = existing.id;
        } else {
          const created = manager.create(DireccionTerritorialEntity, dt);
          const saved = await manager.save(created);
          dt.id = saved.id;
        }
      }

      // Upsert Cetaps
      for (const c of cetaps) {
        // Resolve dt id
        const dtRef = dts.find(d => d.codigo === c.codigo_dt_temp);
        if (!dtRef || !dtRef.id) throw new Error(`DT no resuelta para ${c.codigo}`);
        c.idDireccionTerritorial = dtRef.id;

        const existing = await manager.findOne(CetapEntity, { where: { codigo: c.codigo } });
        if (existing) {
          await manager.update(CetapEntity, { id: existing.id }, c);
        } else {
          const created = manager.create(CetapEntity, c);
          await manager.save(created);
        }
      }
    });

    return this.buildReport(dts, cetaps, false);
  }

  private parseDirecciones(raw: any[]) {
    if (raw.length !== 17) {
      throw new BadRequestException(`G1: Se esperaban 17 DT, se encontraron ${raw.length}`);
    }

    const codigos = new Set();
    const nombresNorm = new Set();
    const result: any[] = [];

    for (let i = 0; i < raw.length; i++) {
      const row = raw[i];
      const codigo = row['codigo_dt'];
      const nombre = row['nombre_dt'];
      const nombre_normalizado = row['nombre_normalizado'];
      const ordenStr = row['orden_visualizacion'];
      const activoStr = row['activo'];

      if (!codigo || !nombre || !nombre_normalizado) {
        throw new BadRequestException(`G7: Campo obligatorio vacío en fila ${i + 2}`);
      }

      if (codigos.has(codigo)) throw new BadRequestException(`G2: Código duplicado: ${codigo}`);
      if (nombresNorm.has(nombre_normalizado)) throw new BadRequestException(`G3: Nombre normalizado duplicado: ${nombre_normalizado}`);

      codigos.add(codigo);
      nombresNorm.add(nombre_normalizado);

      const orden = parseInt(ordenStr, 10);
      if (isNaN(orden) || orden < 1 || orden > 17) {
        throw new BadRequestException(`G4: orden_visualizacion debe ser entero en 1-17, encontrado: ${ordenStr}`);
      }

      if (codigo === 'SC' && orden !== 1) {
        throw new BadRequestException(`G5: Sede Central debe tener código 'SC' y orden 1`);
      }

      result.push({
        codigo,
        nombre,
        nombreNormalizado: nombre_normalizado,
        orden_visualizacion: orden,
        activo: String(activoStr).toUpperCase() === 'TRUE',
      });
    }

    return result;
  }

  private parseCetaps(raw: any[], dts: any[]) {
    if (raw.length !== 290) {
      throw new BadRequestException(`C1: Se esperaban 290 CETAPs, se encontraron ${raw.length}`);
    }

    const codigos = new Set();
    const nombresNorm = new Set();
    const dtCodigos = new Set(dts.map(d => d.codigo));
    const result: any[] = [];

    for (let i = 0; i < raw.length; i++) {
      const row = raw[i];
      const codigo = row['codigo_cetap'];
      const nombre = row['nombre_cetap'];
      const nombre_normalizado = row['nombre_normalizado'];
      const codigo_dt = row['codigo_dt'];
      const tipo = row['tipo'];
      const lat = row['latitud'];
      const lng = row['longitud'];
      const activoStr = row['activo'];

      if (!codigo || !nombre || !codigo_dt || !tipo) {
        throw new BadRequestException(`C10: Campo obligatorio vacío en CETAP fila ${i + 2}`);
      }

      if (codigos.has(codigo)) throw new BadRequestException(`C2: Código CETAP duplicado: ${codigo}`);
      if (nombresNorm.has(nombre_normalizado)) throw new BadRequestException(`C3: Nombre normalizado CETAP duplicado: ${nombre_normalizado}`);

      if (!dtCodigos.has(codigo_dt)) {
        throw new BadRequestException(`C4: Código DT no encontrado: ${codigo_dt} en CETAP ${codigo}`);
      }

      if (!['sede_central', 'cetap', 'otro'].includes(tipo)) {
        throw new BadRequestException(`C5: Tipo inválido: ${tipo}`);
      }

      if (activoStr && String(activoStr).toUpperCase() !== 'TRUE' && String(activoStr).toUpperCase() !== 'FALSE') {
        throw new BadRequestException(`C11: Valor booleano inválido: ${activoStr}`);
      }

      codigos.add(codigo);
      nombresNorm.add(nombre_normalizado);

      result.push({
        codigo,
        nombre,
        nombreNormalizado: nombre_normalizado,
        codigo_dt_temp: codigo_dt,
        nombre_dt: row['nombre_dt'] || '',
        tipo,
        latitud: lat ? parseFloat(lat) : null,
        longitud: lng ? parseFloat(lng) : null,
        activo: String(activoStr).toUpperCase() === 'TRUE',
      });
    }

    return result;
  }

  private validateTransversal(dts: any[], cetaps: any[]) {
    let sedeCentralCount = 0;
    let sedeCentralOtroCount = 0;

    for (const dt of dts) {
      const dtCetaps = cetaps.filter(c => c.codigo_dt_temp === dt.codigo);
      const otros = dtCetaps.filter(c => c.tipo === 'otro');
      
      if (dt.codigo === 'SC') {
        sedeCentralCount = dtCetaps.filter(c => c.tipo === 'sede_central').length;
        sedeCentralOtroCount = otros.length;
      } else {
        if (otros.length === 0) {
          throw new BadRequestException(`C6: La DT ${dt.codigo} no tiene CETAP tipo 'otro'`);
        }
      }
    }

    if (sedeCentralCount !== 1) throw new BadRequestException(`C7: Sede Central debe tener exactamente 1 CETAP tipo 'sede_central'`);
    if (sedeCentralOtroCount !== 1) throw new BadRequestException(`C8: Sede Central debe tener exactamente 1 CETAP tipo 'otro'`);
  }

  private buildReport(dts: any[], cetaps: any[], dryRun: boolean) {
    const tipos = {
      sede_central: cetaps.filter(c => c.tipo === 'sede_central').length,
      cetap: cetaps.filter(c => c.tipo === 'cetap').length,
      otro: cetaps.filter(c => c.tipo === 'otro').length,
    };

    const porDt = {};
    for (const dt of dts) {
      porDt[dt.nombre] = cetaps.filter(c => c.codigo_dt_temp === dt.codigo).length;
    }

    return {
      success: true,
      dry_run: dryRun,
      carga: {
        direcciones_territoriales: { procesados: dts.length },
        cetaps: { procesados: cetaps.length }
      },
      indicadores: {
        cetaps_por_tipo: tipos,
        cetaps_por_dt: porDt
      }
    };
  }
}
