import type { CSSProperties } from 'react';
import { ChevronDown, FileText, LockKeyhole } from 'lucide-react';
import './RundDatosCargaOriginal.css';

export const COLUMNAS_CARGA_POR_BLOQUE: Record<string, Array<[string, string]>> = {
  IDENTIDAD: [['DOCUMENTO_IDENTIDAD', 'Número de documento'], ['TIPO_DOCUMENTO', 'Tipo de documento'], ['NOMBRE_COMPLETO', 'Nombre completo'], ['GENERO', 'Género'], ['SEXO_BIOLOGICO', 'Sexo biológico'], ['FECHA_NACIMIENTO', 'Fecha de nacimiento'], ['EDAD', 'Edad reportada'], ['RANGO_EDAD', 'Rango de edad reportado']],
  CONTACTO: [['CORREO_INSTITUCIONAL', 'Correo institucional'], ['CORREO_PERSONAL', 'Correo personal'], ['TELEFONO', 'Teléfono']],
  FORMACION: [['NIVEL_FORMACION', 'Nivel de formación'], ['TITULO_PREGRADO', 'Pregrado'], ['TITULO_ESPECIALIZACION', 'Especialización'], ['TITULO_MAESTRIA', 'Maestría'], ['TITULO_DOCTORADO', 'Doctorado'], ['TITULO_POSDOCTORADO', 'Posdoctorado'], ['PERFIL_ACADEMICO', 'Perfil académico']],
  VINCULACION: [['VINCULACION', 'Vinculación'], ['REGIMEN_NORMATIVO', 'Régimen normativo'], ['HORAS_PTA', 'Horas PTA'], ['TERRITORIAL', 'Territorial reportada'], ['DEDICACION', 'Dedicación'], ['DEDICACION_HORAS_SEMANA', 'Horas semanales'], ['CATEGORIA_ESCALAFON', 'Categoría / escalafón'], ['INICIO_VINCULACION', 'Inicio de vinculación'], ['FIN_VINCULACION', 'Fin de vinculación'], ['ESTADO_DOCENTE', 'Estado docente'], ['ACTO_ADMINISTRATIVO', 'Acto administrativo'], ['ORIGEN_VINCULACION', 'Origen de vinculación'], ['PUNTAJE_SALARIAL', 'Puntaje salarial'], ['SITUACION_ADMINISTRATIVA', 'Situación administrativa'], ['SITUACION_CATEGORIA', 'Situación categoría']],
  ACADEMICO: [['NUCLEO_TEMATICO', 'Núcleo temático'], ['INVESTIGACION_ACTIVA', 'Investigación activa'], ['ULTIMA_EVALUACION', 'Última evaluación']],
  TRANSVERSAL: [['OBSERVACIONES', 'Observaciones'], ['ID_RUND', 'ID RUND del archivo']],
};

export function RundDatosCargaOriginal({ bloque, datos, accesoCompleto }: {
  bloque: string;
  datos?: Record<string, unknown> | null;
  accesoCompleto: boolean;
}) {
  if (!datos || !Object.keys(datos).length) return null;
  const columnas = COLUMNAS_CARGA_POR_BLOQUE[bloque] || [];
  const campos = columnas.map(([clave, etiqueta]) => {
    const restringido = ['DOCUMENTO_IDENTIDAD', 'PUNTAJE_SALARIAL'].includes(clave) && !accesoCompleto;
    let valor = datos[clave];
    if (typeof valor === 'number' && ['FECHA_NACIMIENTO', 'INICIO_VINCULACION', 'FIN_VINCULACION'].includes(clave)) {
      valor = new Date(Math.floor(valor - 25569) * 86400000).toLocaleDateString('es-CO', { timeZone: 'UTC' });
    }
    const vacio = valor === null || valor === undefined || valor === '';
    const textoLargo = !restringido && !vacio && (['PERFIL_ACADEMICO', 'OBSERVACIONES'].includes(clave) || String(valor).length > 140 || String(valor).includes('\n'));
    return { clave, etiqueta, restringido, valor, vacio, textoLargo };
  });
  const compactos = campos.filter(campo => !campo.textoLargo).length || 1;
  const columnasEquilibradas = (maximo: number) => {
    const limite = Math.min(compactos, maximo);
    // Prefer complete rows (e.g. six fields in two rows of three).
    for (let cantidad = limite; cantidad >= 2; cantidad--) {
      if (compactos % cantidad === 0) return cantidad;
    }
    return limite;
  };
  const gridStyle = {
    '--rund-source-columns-small': columnasEquilibradas(2),
    '--rund-source-columns-medium': columnasEquilibradas(3),
    '--rund-source-columns-large': columnasEquilibradas(4),
  } as CSSProperties;
  return (
    <div className="rund-source-data">
      <details className="rund-source-data__panel">
        <summary className="rund-source-data__summary">
          <span className="rund-source-data__icon" aria-hidden="true"><FileText size={19} /></span>
          <span className="rund-source-data__heading">
            <span className="rund-source-data__title">Datos originales del archivo de carga</span>
            <span className="rund-source-data__count">{columnas.length} datos</span>
          </span>
          <ChevronDown className="rund-source-data__chevron" size={18} aria-hidden="true" />
        </summary>
        <div className="rund-source-data__content">
          <p className="rund-source-data__description">Información reportada al cargar el archivo. El perfil puede incluir correcciones posteriores y valores calculados, como la edad actual.</p>
          <dl className="rund-source-data__grid" style={gridStyle}>
            {campos.map(({ clave, etiqueta, restringido, valor, vacio, textoLargo }) => {
              return <div key={clave} className={`rund-source-data__field${textoLargo ? ' rund-source-data__field--wide' : ''}${restringido || vacio ? ' rund-source-data__field--muted' : ''}`}>
                <dt className="rund-source-data__label">{etiqueta}</dt>
                <dd className="rund-source-data__value">
                  {restringido && <LockKeyhole size={13} aria-hidden="true" />}
                  {restringido ? 'Información restringida' : vacio ? 'Sin dato en el archivo' : String(valor)}
                </dd>
              </div>;
            })}
          </dl>
        </div>
      </details>
    </div>
  );
}
