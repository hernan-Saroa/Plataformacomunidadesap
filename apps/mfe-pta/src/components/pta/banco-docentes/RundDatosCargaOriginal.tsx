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
  return (
    <details style={{ marginBottom: 20, border: '1px solid #CBD5E1', borderRadius: 10, padding: 14, background: '#FFFFFF' }}>
      <summary style={{ cursor: 'pointer', color: '#003DA5', fontWeight: 600 }}>Datos originales del archivo de carga ({columnas.length})</summary>
      <p style={{ fontSize: 12, color: '#64748B' }}>Información reportada al cargar el archivo. El perfil puede incluir correcciones posteriores y valores calculados, como la edad actual.</p>
      <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 16, margin: 0 }}>
        {columnas.map(([clave, etiqueta]) => {
          const restringido = ['DOCUMENTO_IDENTIDAD', 'PUNTAJE_SALARIAL'].includes(clave) && !accesoCompleto;
          let valor = datos[clave];
          if (typeof valor === 'number' && ['FECHA_NACIMIENTO', 'INICIO_VINCULACION', 'FIN_VINCULACION'].includes(clave)) {
            valor = new Date(Math.floor(valor - 25569) * 86400000).toLocaleDateString('es-CO', { timeZone: 'UTC' });
          }
          return <div key={clave} style={{ minWidth: 0 }}>
            <dt style={{ fontSize: 11, color: '#64748B' }}>{etiqueta}</dt>
            <dd style={{ margin: '4px 0 0', fontSize: 13, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
              {restringido ? 'Información restringida' : valor === null || valor === undefined || valor === '' ? 'Sin dato en el archivo' : String(valor)}
            </dd>
          </div>;
        })}
      </dl>
    </details>
  );
}
