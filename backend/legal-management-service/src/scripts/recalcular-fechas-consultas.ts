/**
 * Script para recalcular fechaMaximaRespuesta de consultas existentes
 * Usando días hábiles según Ley 1437
 * 
 * Ejecutar con: npx ts-node src/scripts/recalcular-fechas-consultas.ts
 */
import { DataSource } from 'typeorm';
import { databaseConfig } from '../database.config';
import { ConsultaJuridica } from '../entities/consulta-juridica.entity';
import { DiasHabilesService } from '../services/dias-habiles.service';

async function main() {
    console.log('Conectando a la base de datos...');

    const dataSource = new DataSource({
        ...(databaseConfig as any),
        entities: [ConsultaJuridica]
    });

    await dataSource.initialize();
    console.log('Conexión establecida.');

    const consultaRepo = dataSource.getRepository(ConsultaJuridica);
    const diasHabilesService = new DiasHabilesService();

    // Obtener todas las consultas que no están cerradas
    const consultas = await consultaRepo.find({
        where: [
            { estado: 'en_radicacion' },
            { estado: 'asignado' },
            { estado: 'en_analisis' },
            { estado: 'en_revision' }
        ]
    });

    console.log(`Encontradas ${consultas.length} consultas activas para recalcular.`);

    let actualizadas = 0;
    for (const consulta of consultas) {
        const tipoSolicitud = consulta.tipoSolicitud || 'consulta';
        const terminoDias = diasHabilesService.obtenerTerminoLegal(tipoSolicitud);

        // Recalcular desde fecha de recepción
        const fechaBase = consulta.fechaRecepcion || consulta.createdAt;
        const nuevaFechaMaxima = diasHabilesService.agregarDiasHabiles(new Date(fechaBase), terminoDias);

        // Solo actualizar si cambió
        const fechaAnterior = consulta.fechaMaximaRespuesta;
        if (!fechaAnterior || fechaAnterior.getTime() !== nuevaFechaMaxima.getTime()) {
            consulta.fechaMaximaRespuesta = nuevaFechaMaxima;
            consulta.terminoLegalDias = terminoDias;
            await consultaRepo.save(consulta);

            console.log(`[${consulta.numeroRadicado}] ${tipoSolicitud} -> ${terminoDias} días hábiles`);
            console.log(`   Anterior: ${fechaAnterior?.toLocaleDateString() || 'N/A'}`);
            console.log(`   Nueva:    ${nuevaFechaMaxima.toLocaleDateString()}`);
            actualizadas++;
        }
    }

    console.log(`\n✅ Proceso completado. ${actualizadas} consultas actualizadas.`);
    await dataSource.destroy();
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
