import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { HiringAccess } from '../../auth/hiring-access';
import { CadenaAprobacion } from '../../entities/cadena-aprobacion.entity';
import { validarEscalones } from './cadena';
import { CadenaAprobacionService, NOMBRE_PAPEL } from './cadena-aprobacion.service';
import { GuardarCadenaDto } from './dto/cadena.dto';

/**
 * Las plantillas de cadena, para Configuración (migración 101).
 *
 * Se editan en su sitio y no se versionan: cada ronda guarda la copia de la
 * cadena con la que se envió, así que cambiar una plantilla solo afecta los
 * envíos siguientes. Lo que no se hace es borrarla: una ronda vieja apunta a
 * ella, y se archiva cuando ninguna actividad la usa.
 */
@Injectable()
export class PlantillasCadenaService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly cadenas: CadenaAprobacionService,
  ) {}

  /** Las plantillas activas, con los nombres de quienes deciden y dónde se usan. */
  async listar() {
    const plantillas = await this.dataSource
      .getRepository(CadenaAprobacion)
      .find({ where: { activa: true }, order: { nombre: 'ASC' } });

    const usos: { cadena_id: string; numeral: string; nombre: string }[] = await this.dataSource.query(
      `SELECT r.config ->> 'cadenaId' AS cadena_id, r.numeral, a.nombre
         FROM hiring.reglas_actividad r
         JOIN hiring.actividades a ON a.numeral = r.numeral
        WHERE r.tipo = 'EXIGE_APROBACION' AND r.vigente_hasta IS NULL AND r.config ? 'cadenaId'
        ORDER BY a.orden`,
    );

    const roles = await this.cadenas.nombresDeRoles(plantillas.flatMap((p) => p.escalones.flatMap((e) => e.roles)));
    /*
     * Los roles que siguen existiendo y activos. La cadena guarda el código: si
     * se borra, se desactiva o se le cambia el código a un rol, el escalón se
     * queda sin quién lo decida, y aquí es donde se corrige.
     */
    const codigos = [...new Set(plantillas.flatMap((p) => p.escalones.flatMap((e) => e.roles)))];
    const vigentes = new Set<string>(
      codigos.length
        ? (
            await this.dataSource.query(
              `SELECT code FROM auth.role WHERE code = ANY($1::text[]) AND is_active = true`,
              [codigos],
            )
          ).map((r: any) => r.code)
        : [],
    );
    const personas = await this.cadenas.nombresDePersonas(
      plantillas.flatMap((p) => p.escalones.flatMap((e) => e.personas)),
    );
    // Los puestos del proceso (109), con si siguen activos.
    const puestos = new Map<string, { nombre: string; activo: boolean }>(
      (await this.dataSource.query(`SELECT id::text AS id, nombre, activo FROM hiring.puestos_proceso`)).map(
        (f: any) => [f.id, { nombre: f.nombre, activo: f.activo }],
      ),
    );

    return plantillas.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion,
      permiteMismoAprobador: p.permiteMismoAprobador,
      escalones: p.escalones.map((e) => ({
        ...e,
        // Lo que la pantalla muestra; lo que guarda siguen siendo los códigos.
        nombresRoles: e.roles.map((r) => roles.get(r) ?? r),
        nombresPersonas: e.personas.map((id) => personas.get(id) ?? id),
        nombresPapeles: e.papeles.map((pa) => NOMBRE_PAPEL[pa] ?? pa),
        puestos: e.puestos ?? [],
        nombresPuestos: (e.puestos ?? []).map((id) => puestos.get(id)?.nombre ?? 'Puesto que ya no existe'),
      })),
      usadaEn: usos.filter((u) => u.cadena_id === p.id).map((u) => ({ numeral: u.numeral, nombre: u.nombre })),
      /** Lo que hay que corregir para que cada escalón tenga quién lo decida. */
      problemas: p.escalones.flatMap((e, i) => {
        const sinPuesto = (e.puestos ?? []).filter((id) => !puestos.get(id)?.activo);
        const delPuesto = sinPuesto.length
          ? [`Escalón ${i + 1} (${e.nombre}): nombra un puesto archivado o que ya no existe; elige otro`]
          : [];
        const muertos = e.roles.filter((r) => !vigentes.has(r));
        if (!muertos.length) return delPuesto;
        const todos =
          muertos.length === e.roles.length && !e.personas.length && !e.papeles.length && !(e.puestos ?? []).length;
        return [
          ...delPuesto,
          `Escalón ${i + 1} (${e.nombre}): ${muertos.length === 1 ? 'el rol' : 'los roles'} ${muertos.join(', ')} ya no ${
            muertos.length === 1 ? 'existe o está inactivo' : 'existen o están inactivos'
          }${todos ? '. Nadie puede decidirlo hasta que lo cambies' : ''}`,
        ];
      }),
      updatedAt: p.updatedAt,
      updatedBy: p.updatedBy,
    }));
  }

  /** Los papeles del proceso que pueden responder por un escalón. */
  papeles() {
    return Object.entries(NOMBRE_PAPEL).map(([codigo, nombre]) => ({ codigo, nombre }));
  }

  async crear(dto: GuardarCadenaDto, acceso: HiringAccess) {
    const datos = this.validar(dto);
    const repo = this.dataSource.getRepository(CadenaAprobacion);
    const creada = await repo.save(
      repo.create({ ...datos, createdBy: acceso.userName, updatedBy: acceso.userName }),
    );
    return { id: creada.id };
  }

  /**
   * Cambia la plantilla. Las rondas en curso no se enteran: trabajan sobre la
   * copia que se guardó al enviarlas.
   */
  async actualizar(id: string, dto: GuardarCadenaDto, acceso: HiringAccess) {
    const repo = this.dataSource.getRepository(CadenaAprobacion);
    const plantilla = await repo.findOne({ where: { id, activa: true } });
    if (!plantilla) throw new NotFoundException('La cadena no existe o ya se archivó');

    Object.assign(plantilla, this.validar(dto), { updatedBy: acceso.userName });
    await repo.save(plantilla);
    return { id };
  }

  /**
   * Archiva la plantilla. Solo si ninguna actividad la exige hoy: archivarla
   * en uso dejaría esas actividades sin aprobación sin que nadie lo decidiera.
   */
  async archivar(id: string, acceso: HiringAccess) {
    const repo = this.dataSource.getRepository(CadenaAprobacion);
    const plantilla = await repo.findOne({ where: { id, activa: true } });
    if (!plantilla) throw new NotFoundException('La cadena no existe o ya se archivó');

    const usos: { numeral: string }[] = await this.dataSource.query(
      `SELECT numeral FROM hiring.reglas_actividad
        WHERE tipo = 'EXIGE_APROBACION' AND vigente_hasta IS NULL AND config ->> 'cadenaId' = $1
        ORDER BY numeral`,
      [id],
    );
    if (usos.length) {
      throw new ConflictException(
        `La usan ${usos.map((u) => u.numeral).join(', ')}: cámbiales la aprobación antes de archivarla`,
      );
    }

    plantilla.activa = false;
    plantilla.updatedBy = acceso.userName;
    await repo.save(plantilla);
    return { id };
  }

  private validar(dto: GuardarCadenaDto) {
    const nombre = dto.nombre?.trim();
    const { escalones, problemas } = validarEscalones(dto.escalones);
    if (!nombre) problemas.unshift('La cadena necesita un nombre');
    if (problemas.length) throw new BadRequestException(problemas.join('. '));

    return {
      nombre: nombre as string,
      descripcion: dto.descripcion?.trim() || null,
      escalones,
      permiteMismoAprobador: dto.permiteMismoAprobador === true,
    };
  }
}
