import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { ProgramaCatalogoEntity } from './entities/programa.readonly.entity.js';
import { AsignaturaCatalogoEntity } from './entities/asignatura.readonly.entity.js';
import { UbicacionSemestralCatalogoEntity } from './entities/ubicacion-semestral.readonly.entity.js';
import { NivelAcademico, nivelDeProgramaTipo } from './nivel-academico.js';
import { nivelesVisibles, puedeVerNivel } from '../auth/programacion-permissions.js';

export interface SemestreDelCatalogo {
  semestreId: number;
  codigo: string;
  etiqueta: string;
  orden: number;
  asignaturas: Array<{
    id: string;
    codigo: string | null;
    nombre: string;
    creditos: number;
    pensum: string | null;
    modalidad: string;
    horasClase: number | null;
  }>;
}

@Injectable()
export class CatalogoService {
  constructor(
    @InjectRepository(ProgramaCatalogoEntity)
    private readonly programaRepo: Repository<ProgramaCatalogoEntity>,
    @InjectRepository(AsignaturaCatalogoEntity)
    private readonly asignaturaRepo: Repository<AsignaturaCatalogoEntity>,
    @InjectRepository(UbicacionSemestralCatalogoEntity)
    private readonly semestreRepo: Repository<UbicacionSemestralCatalogoEntity>,
  ) {}

  /**
   * Programas que el usuario puede programar (RN-08).
   *
   * El filtro por nivel se aplica SIEMPRE contra los permisos, no contra lo que
   * pida el cliente: si solicita un nivel que no le corresponde, se rechaza en
   * vez de devolverlo vacío, para que el error sea explícito.
   */
  async listarProgramas(permisos: ReadonlySet<string>, nivelSolicitado?: NivelAcademico) {
    const permitidos = nivelesVisibles(permisos);
    if (permitidos.length === 0) {
      throw new ForbiddenException(
        'No tiene permisos de programación sobre ningún nivel académico.',
      );
    }
    if (nivelSolicitado && !puedeVerNivel(permisos, nivelSolicitado)) {
      throw new ForbiddenException(
        `No tiene permiso para programar el catálogo de ${nivelSolicitado}.`,
      );
    }

    const nivelesEfectivos = nivelSolicitado ? [nivelSolicitado] : permitidos;
    const programas = await this.programaRepo.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });

    // El nivel binario se deriva de `tipo`; no existe como columna. Filtrar en
    // memoria es aceptable: el catálogo de programas es de decenas de filas.
    return programas
      .filter((p) => nivelesEfectivos.includes(nivelDeProgramaTipo(p.tipo)))
      .map((p) => ({
        id: String(p.id),
        codigo: p.codigo,
        nombre: p.nombre,
        tipo: p.tipo,
        nivel: nivelDeProgramaTipo(p.tipo),
        modalidad: p.modalidad,
        horasBasePorCredito: p.horasBasePorCredito,
      }));
  }

  /** Catálogo de un programa agrupado por semestre del plan de estudios (AC-01). */
  async catalogoPorSemestre(
    permisos: ReadonlySet<string>,
    idPrograma: string,
  ): Promise<{ programa: any; semestres: SemestreDelCatalogo[] }> {
    const programa = await this.programaRepo.findOne({ where: { id: idPrograma } });
    if (!programa) throw new NotFoundException('Programa no encontrado');

    const nivel = nivelDeProgramaTipo(programa.tipo);
    // Se valida el nivel del programa REAL, no el que declare el cliente: es lo
    // que impide que un perfil de pregrado alcance un programa de posgrado
    // conociendo su id (AC-02).
    if (!puedeVerNivel(permisos, nivel)) {
      throw new ForbiddenException(
        `No tiene permiso para consultar el catálogo de ${nivel}.`,
      );
    }

    const asignaturas = await this.asignaturaRepo.find({
      where: { idPrograma: programa.id, activa: true },
      order: { idUbicacionSemestral: 'ASC', nombre: 'ASC' },
    });

    const semestreIds = Array.from(new Set(asignaturas.map((a) => a.idUbicacionSemestral)));
    const semestres = semestreIds.length
      ? await this.semestreRepo.find({ where: { id: In(semestreIds) }, order: { orden: 'ASC' } })
      : [];

    const porSemestre = new Map<number, SemestreDelCatalogo>();
    for (const s of semestres) {
      porSemestre.set(s.id, {
        semestreId: s.id,
        codigo: s.codigo,
        etiqueta: s.etiqueta,
        orden: s.orden,
        asignaturas: [],
      });
    }

    for (const a of asignaturas) {
      const grupo = porSemestre.get(a.idUbicacionSemestral);
      if (!grupo) continue; // asignatura con semestre huérfano: no se inventa uno
      grupo.asignaturas.push({
        id: String(a.id),
        codigo: a.codigo,
        nombre: a.nombre,
        creditos: a.creditos,
        pensum: a.pensum,
        modalidad: a.modalidad,
        horasClase: a.horasClase,
      });
    }

    return {
      programa: {
        id: String(programa.id),
        codigo: programa.codigo,
        nombre: programa.nombre,
        nivel,
        tipo: programa.tipo,
      },
      semestres: [...porSemestre.values()].sort((a, b) => a.orden - b.orden),
    };
  }

  /**
   * Autocompletado por código de asignatura (EFDS-1369, AC-01).
   *
   * El código es la LLAVE MAESTRA del sistema (RN-01) y resuelve los siete
   * campos maestros del SNIES. Todos son de SOLO LECTURA (RN-02): se exponen tal
   * como están en el catálogo.
   *
   * ⚠️ Las horas NO se calculan aquí: `horasClase` y `horasPta` viajan tal cual.
   * No es créditos × 16: el factor es 16 en pregrado y especializaciones y 12 en
   * maestrías, con excepciones de horas fijas de la Circular 003 (384 / 20 / 144).
   * Cualquier fórmula propia aquí contradiría los datos reales.
   */
  async buscarPorCodigo(permisos: ReadonlySet<string>, codigo: string) {
    const limpio = String(codigo ?? '').trim();
    if (!limpio) {
      throw new BadRequestException('Debe indicar el código de la asignatura.');
    }

    const asignatura = await this.asignaturaRepo.findOne({ where: { codigo: limpio } });
    if (!asignatura) {
      // Error controlado, no un 500: un código que no existe es un caso de uso
      // normal (el programador se equivoca al teclear), no una falla.
      throw new NotFoundException(`No existe una asignatura con el código ${limpio}.`);
    }

    const programa = await this.programaRepo.findOne({ where: { id: asignatura.idPrograma } });
    if (!programa) {
      throw new NotFoundException('La asignatura no tiene un programa asociado en el catálogo.');
    }

    // Se valida el nivel del programa REAL: conocer un código de posgrado no
    // alcanza para leerlo desde un perfil de pregrado (RN-08, mismo criterio que
    // el detalle del catálogo).
    const nivel = nivelDeProgramaTipo(programa.tipo);
    if (!puedeVerNivel(permisos, nivel)) {
      throw new ForbiddenException(
        `La asignatura ${limpio} pertenece a un programa de ${nivel} y no tiene permiso para consultarlo.`,
      );
    }

    const semestre = await this.semestreRepo.findOne({
      where: { id: asignatura.idUbicacionSemestral },
    });

    return {
      // Identidad
      codigo: asignatura.codigo,
      // Los siete campos maestros del SNIES (AC-01)
      nombre: asignatura.nombre,
      creditos: asignatura.creditos,
      horasClase: asignatura.horasClase,
      horasPta: asignatura.horasPta,
      programa: { id: String(programa.id), codigo: programa.codigo, nombre: programa.nombre },
      pensum: asignatura.pensum,
      modalidad: asignatura.modalidad,
      // 'Metodología' es la del PROGRAMA (presencial / distancia / mixto), que es
      // cómo se imparte; distinta de la modalidad de la asignatura.
      metodologia: programa.modalidad,
      // Contexto útil, no parte de los siete
      nivel,
      semestre: semestre ? { etiqueta: semestre.etiqueta, orden: semestre.orden } : null,
      tipoExcepcion: asignatura.tipoExcepcion ?? null,
      // Marca explícita para la UI: estos datos no se editan (RN-02).
      soloLectura: true,
    };
  }
}
