import { BadRequestException } from '@nestjs/common';

/**
 * Fechas del periodo académico: son FECHAS CIVILES (año-mes-día), sin hora y sin zona.
 *
 * ⚠️ Nunca se convierten a `Date`. `new Date('2026-08-01')` es la medianoche UTC; un
 * servidor en UTC−5 la ve como el 31 de julio a las 19:00 y TypeORM, al guardarla en
 * la columna `date`, escribe el 31 de julio: el periodo quedaba un día antes. Aquí se
 * valida el calendario y se comparan cadenas ISO (que ordenan igual que las fechas).
 */
const FECHA_CIVIL = /^(\d{4})-(\d{2})-(\d{2})/;

/** `YYYY-MM-DD` de lo que el cliente envió (admite un ISO con hora: se toma su fecha). */
export function fechaCivil(valor: unknown, mensaje: string): string {
  const m = typeof valor === 'string' ? FECHA_CIVIL.exec(valor.trim()) : null;
  if (!m) throw new BadRequestException(mensaje);
  const [, a, mes, d] = m;
  const anio = Number(a);
  const numMes = Number(mes);
  const dia = Number(d);
  // Calendario real (29 de febrero, 31 de abril…) sin pasar por la zona horaria.
  const diasDelMes = new Date(Date.UTC(anio, numMes, 0)).getUTCDate();
  if (numMes < 1 || numMes > 12 || dia < 1 || dia > diasDelMes) throw new BadRequestException(mensaje);
  return `${a}-${mes}-${d}`;
}

/** Lo que devuelve la columna `date` (cadena, o `Date` en pruebas) como `YYYY-MM-DD`. */
export function fechaCivilGuardada(valor: unknown): string {
  if (valor instanceof Date) {
    // Una Date de la columna `date` viene a medianoche LOCAL: se lee con getters locales.
    const p = (n: number) => String(n).padStart(2, '0');
    return `${valor.getFullYear()}-${p(valor.getMonth() + 1)}-${p(valor.getDate())}`;
  }
  return String(valor ?? '').slice(0, 10);
}
