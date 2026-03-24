/**
 * DiasHabilesService - Servicio para cálculo de días hábiles según Ley 1437 de 2011
 * Excluye fines de semana y festivos oficiales de Colombia
 */
import { Injectable } from '@nestjs/common';

@Injectable()
export class DiasHabilesService {

    /**
     * Festivos oficiales de Colombia (fijos y calculados)
     * Algunos festivos se mueven al lunes siguiente según Ley Emiliani (Ley 51 de 1983)
     */
    private obtenerFestivosAnio(anio: number): Date[] {
        const festivos: Date[] = [];

        // Festivos FIJOS (no se mueven)
        festivos.push(new Date(anio, 0, 1));   // Año Nuevo
        festivos.push(new Date(anio, 4, 1));   // Día del Trabajo
        festivos.push(new Date(anio, 6, 20));  // Día de la Independencia
        festivos.push(new Date(anio, 7, 7));   // Batalla de Boyacá
        festivos.push(new Date(anio, 11, 8));  // Inmaculada Concepción
        festivos.push(new Date(anio, 11, 25)); // Navidad

        // Festivos MÓVILES (Ley Emiliani - se mueven al lunes)
        festivos.push(this.moverALunes(new Date(anio, 0, 6)));   // Reyes Magos
        festivos.push(this.moverALunes(new Date(anio, 2, 19)));  // San José
        festivos.push(this.moverALunes(new Date(anio, 5, 29)));  // San Pedro y San Pablo
        festivos.push(this.moverALunes(new Date(anio, 7, 15)));  // Asunción de la Virgen
        festivos.push(this.moverALunes(new Date(anio, 9, 12)));  // Día de la Raza
        festivos.push(this.moverALunes(new Date(anio, 10, 1)));  // Todos los Santos
        festivos.push(this.moverALunes(new Date(anio, 10, 11))); // Independencia de Cartagena

        // Festivos basados en Semana Santa (requieren cálculo de Pascua)
        const pascua = this.calcularPascua(anio);
        festivos.push(this.restarDias(pascua, 3));  // Jueves Santo
        festivos.push(this.restarDias(pascua, 2));  // Viernes Santo
        festivos.push(this.sumarDias(pascua, 43));  // Ascensión del Señor (movido a lunes)
        festivos.push(this.sumarDias(pascua, 64));  // Corpus Christi (movido a lunes)
        festivos.push(this.sumarDias(pascua, 71));  // Sagrado Corazón (movido a lunes)

        return festivos;
    }

    /**
     * Calcula la fecha de Pascua usando el algoritmo de Computus
     */
    private calcularPascua(anio: number): Date {
        const a = anio % 19;
        const b = Math.floor(anio / 100);
        const c = anio % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const mes = Math.floor((h + l - 7 * m + 114) / 31) - 1;
        const dia = ((h + l - 7 * m + 114) % 31) + 1;
        return new Date(anio, mes, dia);
    }

    /**
     * Mueve una fecha al siguiente lunes si no cae en lunes
     */
    private moverALunes(fecha: Date): Date {
        const dia = fecha.getDay();
        if (dia === 1) return fecha; // Ya es lunes
        const diasParaLunes = dia === 0 ? 1 : (8 - dia);
        return this.sumarDias(fecha, diasParaLunes);
    }

    private sumarDias(fecha: Date, dias: number): Date {
        const resultado = new Date(fecha);
        resultado.setDate(resultado.getDate() + dias);
        return resultado;
    }

    private restarDias(fecha: Date, dias: number): Date {
        return this.sumarDias(fecha, -dias);
    }

    /**
     * Verifica si una fecha es festivo
     */
    private esFestivo(fecha: Date): boolean {
        const anio = fecha.getFullYear();
        const festivos = this.obtenerFestivosAnio(anio);
        return festivos.some(f =>
            f.getDate() === fecha.getDate() &&
            f.getMonth() === fecha.getMonth() &&
            f.getFullYear() === fecha.getFullYear()
        );
    }

    /**
     * Verifica si una fecha es día hábil (no es fin de semana ni festivo)
     */
    esDiaHabil(fecha: Date): boolean {
        const dia = fecha.getDay();
        // 0 = Domingo, 6 = Sábado
        if (dia === 0 || dia === 6) return false;
        if (this.esFestivo(fecha)) return false;
        return true;
    }

    /**
     * Agrega días hábiles a una fecha
     * @param fechaInicio Fecha de inicio
     * @param diasHabiles Número de días hábiles a agregar
     * @returns Nueva fecha después de agregar los días hábiles
     */
    agregarDiasHabiles(fechaInicio: Date, diasHabiles: number): Date {
        let fecha = new Date(fechaInicio);
        let diasAgregados = 0;

        while (diasAgregados < diasHabiles) {
            fecha = this.sumarDias(fecha, 1);
            if (this.esDiaHabil(fecha)) {
                diasAgregados++;
            }
        }

        return fecha;
    }

    /**
     * Calcula los días hábiles entre dos fechas
     * @param fechaInicio Fecha de inicio
     * @param fechaFin Fecha de fin
     * @returns Número de días hábiles
     */
    calcularDiasHabiles(fechaInicio: Date, fechaFin: Date): number {
        let count = 0;
        let fecha = new Date(fechaInicio);

        while (fecha < fechaFin) {
            fecha = this.sumarDias(fecha, 1);
            if (this.esDiaHabil(fecha)) {
                count++;
            }
        }

        return count;
    }

    /**
     * Obtiene el término legal en días hábiles según el tipo de solicitud
     * Basado en Ley 1437 de 2011 (CPACA)
     */
    obtenerTerminoLegal(tipoSolicitud: string): number {
        switch (tipoSolicitud?.toLowerCase()) {
            case 'consulta':
                return 30; // 30 días hábiles para consultas jurídicas
            case 'concepto_juridico':
                return 30; // 30 días hábiles para conceptos formales
            case 'control_legalidad':
                return 5;  // 5 días hábiles para revisión de legalidad
            case 'derecho_peticion':
                return 15; // 15 días hábiles (Art. 14 Ley 1437)
            default:
                return 30; // Por defecto 30 días hábiles
        }
    }
}
