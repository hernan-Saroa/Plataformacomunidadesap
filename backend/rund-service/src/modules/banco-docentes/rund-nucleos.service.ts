import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as xlsx from 'xlsx';
import { Equivalencia, interpretarNucleo, buscarEquivalencia } from './rund-nucleos';

/**
 * EFDS-2345 / EFDS-2375 — Núcleo de cada docente (`rund.docente_nucleo`).
 *
 * - origen `rund`: se recalcula del NUCLEO_TEMATICO de "Docente" después de cada carga
 *   del RUND (y a demanda). El texto del RUND no se toca: aquí solo se interpreta.
 * - origen `puente`: archivo de Codex (INTEGRACION-claude.md §21.2). Cada carga
 *   definitiva REEMPLAZA el puente completo; se retira vaciando el archivo o apagando
 *   PROG_NUCLEO_PUENTE en Programación Académica.
 */
@Injectable()
export class RundNucleosService {
  private readonly logger = new Logger(RundNucleosService.name);

  constructor(private readonly dataSource: DataSource) {}

  async equivalencias(runner: { query: DataSource['query'] } = this.dataSource): Promise<Equivalencia[]> {
    const filas = await runner.query(
      `SELECT variante_normalizada, coincidencia, tipo, id_area
         FROM rund.nucleo_equivalencia WHERE activa`,
    );
    return filas.map((f: any) => ({
      varianteNormalizada: f.variante_normalizada,
      coincidencia: f.coincidencia,
      tipo: f.tipo,
      idArea: f.id_area == null ? null : Number(f.id_area),
    }));
  }

  /** Recalcula el núcleo `rund` de todos los docentes desde el texto del RUND. */
  async reinterpretarRund(actor = 'SISTEMA') {
    return this.dataSource.transaction(async (m) => {
      const equivalencias = await this.equivalencias(m);
      const docentes: Array<{ id_persona: string; texto: string }> = await m.query(
        `SELECT DISTINCT "personaId" AS id_persona, btrim("nucleoTematico") AS texto
           FROM rund."Docente"
          WHERE "personaId" IS NOT NULL AND coalesce(btrim("nucleoTematico"), '') <> ''`,
      );

      const personas: string[] = [];
      const areas: number[] = [];
      const textos: string[] = [];
      const reporte = { docentes: docentes.length, conArea: 0, genericos: 0 };
      const sinArea = new Map<string, number>();
      const sinResolver = new Map<string, number>();
      const conArea = new Set<string>();

      for (const d of docentes) {
        const r = interpretarNucleo(d.texto, equivalencias);
        if (r.generica) reporte.genericos++;
        for (const a of r.areas) {
          personas.push(d.id_persona);
          areas.push(a.idArea);
          textos.push(a.texto);
          conArea.add(d.id_persona);
        }
        for (const t of r.sinArea) sinArea.set(t, (sinArea.get(t) || 0) + 1);
        for (const t of r.sinResolver) sinResolver.set(t, (sinResolver.get(t) || 0) + 1);
      }
      reporte.conArea = conArea.size;

      // Retira lo que ya no sale del RUND y agrega lo nuevo; lo que no cambia conserva su fecha.
      const retirados = await m.query(
        `DELETE FROM rund.docente_nucleo dn
          WHERE dn.origen = 'rund'
            AND NOT EXISTS (SELECT 1 FROM unnest($1::uuid[], $2::bigint[]) AS n(id_persona, id_area)
                             WHERE n.id_persona = dn.id_persona AND n.id_area = dn.id_area)
          RETURNING dn.id`,
        [personas, areas],
      );
      const creados = await m.query(
        `INSERT INTO rund.docente_nucleo (id_persona, id_area, origen, texto_origen, cargado_por)
         SELECT n.id_persona, n.id_area, 'rund', n.texto, $4
           FROM unnest($1::uuid[], $2::bigint[], $3::text[]) AS n(id_persona, id_area, texto)
         ON CONFLICT (id_persona, id_area, origen) DO NOTHING
         RETURNING id`,
        [personas, areas, textos, actor],
      );

      const resultado = {
        ...reporte,
        nucleosCreados: creados.length,
        // El driver devuelve [filas, conteo] para DELETE … RETURNING.
        nucleosRetirados: Array.isArray(retirados[0]) ? retirados[0].length : retirados.length,
        sinArea: [...sinArea].map(([texto, docentes]) => ({ texto, docentes })),
        sinResolver: [...sinResolver].map(([texto, docentes]) => ({ texto, docentes })),
      };
      this.logger.log(`Núcleo RUND reinterpretado: ${resultado.conArea}/${resultado.docentes} docentes con área`);
      return resultado;
    });
  }

  /** Carga el archivo del puente (§21.2). `dryRun` valida sin escribir. */
  async cargarPuente(buffer: Buffer, opciones: { dryRun: boolean; actor?: string }) {
    const filas = this.leerPuente(buffer);
    return this.dataSource.transaction(async (m) => {
      const equivalencias = await this.equivalencias(m);
      const documentos = [...new Set(filas.map((f) => f.documento).filter(Boolean))];
      const personas: Array<{ id_person: string; num: string }> = documentos.length
        ? await m.query(
          `SELECT id_person, regexp_replace(num_identificacion, '[^0-9A-Za-z]', '', 'g') AS num
             FROM auth.personas
            WHERE regexp_replace(num_identificacion, '[^0-9A-Za-z]', '', 'g') = ANY($1::text[])`,
          [documentos],
        )
        : [];
      const porDocumento = new Map<string, string[]>();
      for (const p of personas) porDocumento.set(p.num, [...(porDocumento.get(p.num) || []), p.id_person]);

      const rechazadas: Array<{ fila: number; documento: string; motivo: string }> = [];
      const pares = new Map<string, { idPersona: string; idArea: number; texto: string[] }>();
      for (const f of filas) {
        const rechazar = (motivo: string) => rechazadas.push({ fila: f.fila, documento: f.documento, motivo });
        if (!f.documento) { rechazar('Sin documento'); continue; }
        const ids = porDocumento.get(f.documento) || [];
        if (ids.length === 0) { rechazar('El documento no existe en personas'); continue; }
        if (ids.length > 1) { rechazar('El documento está repetido en personas'); continue; }
        const eq = buscarEquivalencia(f.area, equivalencias, true);
        if (!eq) { rechazar(`Área sin equivalencia: «${f.area}»`); continue; }
        if (eq.tipo !== 'area' || eq.idArea == null) { rechazar(`«${f.area}» no es un área (${eq.tipo})`); continue; }
        const clave = `${ids[0]}|${eq.idArea}`;
        const par = pares.get(clave) || { idPersona: ids[0], idArea: eq.idArea, texto: [] };
        if (f.asignatura && !par.texto.includes(f.asignatura)) par.texto.push(f.asignatura);
        pares.set(clave, par);
      }

      const lista = [...pares.values()];
      const existentes: Array<{ id_persona: string; id_area: string }> = await m.query(
        `SELECT id_persona, id_area FROM rund.docente_nucleo WHERE origen = 'puente'`,
      );
      const claveExistente = new Set(existentes.map((e) => `${e.id_persona}|${Number(e.id_area)}`));
      const nuevos = lista.filter((p) => !claveExistente.has(`${p.idPersona}|${p.idArea}`));
      const claveNueva = new Set(lista.map((p) => `${p.idPersona}|${p.idArea}`));
      const retirar = existentes.filter((e) => !claveNueva.has(`${e.id_persona}|${Number(e.id_area)}`));

      if (!opciones.dryRun) {
        await m.query(
          `DELETE FROM rund.docente_nucleo dn
            WHERE dn.origen = 'puente'
              AND NOT EXISTS (SELECT 1 FROM unnest($1::uuid[], $2::bigint[]) AS n(id_persona, id_area)
                               WHERE n.id_persona = dn.id_persona AND n.id_area = dn.id_area)`,
          [lista.map((p) => p.idPersona), lista.map((p) => p.idArea)],
        );
        await m.query(
          `INSERT INTO rund.docente_nucleo (id_persona, id_area, origen, texto_origen, cargado_por)
           SELECT n.id_persona, n.id_area, 'puente', n.texto, $4
             FROM unnest($1::uuid[], $2::bigint[], $3::text[]) AS n(id_persona, id_area, texto)
           ON CONFLICT (id_persona, id_area, origen) DO UPDATE SET texto_origen = EXCLUDED.texto_origen`,
          [lista.map((p) => p.idPersona), lista.map((p) => p.idArea),
            lista.map((p) => 'Dicta: ' + p.texto.join(' · ')), opciones.actor || 'SISTEMA'],
        );
      }

      return {
        dryRun: opciones.dryRun,
        filas: filas.length,
        docentes: new Set(lista.map((p) => p.idPersona)).size,
        nucleosCreados: nuevos.length,
        sinCambios: lista.length - nuevos.length,
        nucleosRetirados: retirar.length,
        rechazadas,
      };
    });
  }

  private leerPuente(buffer: Buffer) {
    let libro: xlsx.WorkBook;
    try {
      // Un .xlsx es un zip («PK»); lo demás es el CSV de §21.2: UTF-8 con BOM y «;».
      const esXlsx = buffer.length > 1 && buffer[0] === 0x50 && buffer[1] === 0x4b;
      libro = esXlsx
        ? xlsx.read(buffer, { type: 'buffer', raw: true })
        : xlsx.read(buffer.toString('utf8').replace(/^﻿/, ''), { type: 'string', raw: true, FS: ';' });
    } catch {
      throw new BadRequestException('El archivo del puente no es un CSV o Excel válido.');
    }
    const hoja = libro.Sheets[libro.SheetNames[0]];
    const filas = xlsx.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: null, raw: false });
    const clave = (r: Record<string, unknown>, nombre: string) => {
      const k = Object.keys(r).find((x) => x.replace(/^﻿/, '').trim().toLowerCase() === nombre);
      return k ? String(r[k] ?? '').trim() : '';
    };
    if (filas.length > 0) {
      const columnas = Object.keys(filas[0]).map((k) => k.replace(/^﻿/, '').trim().toLowerCase());
      const faltan = ['documento', 'area_formacion'].filter((c) => !columnas.includes(c));
      if (faltan.length) throw new BadRequestException(`Faltan columnas en el puente: ${faltan.join(', ')}`);
    }
    return filas.map((r, i) => ({
      fila: i + 2,
      documento: clave(r, 'documento').replace(/[^0-9A-Za-z]/g, ''),
      asignatura: clave(r, 'asignatura'),
      area: clave(r, 'area_formacion'),
    }));
  }

  /** Cuántos docentes tienen núcleo `rund`, solo `puente`, o ninguno. */
  async cobertura() {
    const [resumen] = await this.dataSource.query(`
      WITH docentes AS (
        SELECT DISTINCT d."personaId" AS id_persona,
               coalesce(btrim(d."periodoCarga"), '') <> '' AS en_rund
          FROM rund."Docente" d WHERE d."personaId" IS NOT NULL
      ), origenes AS (
        SELECT id_persona, bool_or(origen = 'rund') AS rund, bool_or(origen = 'puente') AS puente
          FROM rund.docente_nucleo GROUP BY id_persona
      )
      SELECT count(*)::int AS docentes,
             count(*) FILTER (WHERE o.rund)::int AS con_rund,
             count(*) FILTER (WHERE NOT coalesce(o.rund, false) AND o.puente)::int AS solo_puente,
             count(*) FILTER (WHERE o.id_persona IS NULL)::int AS sin_nucleo,
             count(*) FILTER (WHERE o.id_persona IS NULL AND d.en_rund)::int AS sin_nucleo_con_carga_rund,
             (SELECT count(*)::int FROM origenes x WHERE NOT EXISTS (
                SELECT 1 FROM docentes y WHERE y.id_persona = x.id_persona)) AS con_nucleo_fuera_del_banco
        FROM docentes d LEFT JOIN origenes o ON o.id_persona = d.id_persona`);
    const porArea = await this.dataSource.query(`
      SELECT a.codigo, a.nombre,
             count(*) FILTER (WHERE dn.origen = 'rund')::int AS rund,
             count(*) FILTER (WHERE dn.origen = 'puente')::int AS puente
        FROM rund.area_formacion a
        LEFT JOIN rund.docente_nucleo dn ON dn.id_area = a.id
       GROUP BY a.id ORDER BY a.codigo`);
    return { ...resumen, porArea };
  }
}
