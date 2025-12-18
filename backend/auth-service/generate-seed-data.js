const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Función para generar UUID v4
function generateUUID() {
  return crypto.randomUUID();
}

// Mapeo de IDs antiguos a UUIDs
const idMapping = {};

// Importar datos desde el archivo TypeScript (necesitamos compilarlo o usar eval)
// Como alternativa, vamos a leer el archivo directamente y parsearlo

const dataFilePath = path.join(__dirname, '../../src/data/territoriales-cetap-completo.ts');
const outputPath = path.join(__dirname, 'migrations/002-seed-estructura-organizacional.sql');

console.log('Generando archivo SQL con datos iniciales...');
console.log('Leyendo:', dataFilePath);

// Leer el archivo y extraer los datos
const fileContent = fs.readFileSync(dataFilePath, 'utf8');

// Extraer el array TERRITORIALES_ESAP usando regex
const match = fileContent.match(/export const TERRITORIALES_ESAP[^=]*=\s*(\[[^\]]*\][^;]*);/s);

if (!match) {
  console.error('No se pudo extraer TERRITORIALES_ESAP del archivo');
  process.exit(1);
}

// Evaluar el contenido (solo para desarrollo local)
let TERRITORIALES_ESAP;
try {
  // Crear un contexto temporal para evaluar
  eval('TERRITORIALES_ESAP = ' + match[1]);
} catch (error) {
  console.error('Error al parsear datos:', error.message);
  process.exit(1);
}

console.log(`✓ Datos cargados: ${TERRITORIALES_ESAP.length} territoriales`);

// Generar SQL
let sql = `-- =====================================================
-- MIGRACIÓN DE DATOS INICIALES - ESTRUCTURA ORGANIZACIONAL
-- Generado automáticamente desde: territoriales-cetap-completo.ts
-- Fecha: ${new Date().toISOString()}
--
-- CONTENIDO:
-- - 1 Sede Central (nivel: nacional)
-- - 17 Territoriales (nivel: territorial)
-- - 307 CETAP (nivel: cetap)
-- TOTAL: 325 unidades organizacionales
-- =====================================================

BEGIN;

-- Limpiar datos existentes (solo para desarrollo)
-- NOTA: Comentar estas líneas en producción si hay datos que preservar
-- DELETE FROM auth.asignaciones_usuario_estructura;
-- DELETE FROM auth.unidades_organizacionales;

`;

let totalUnidades = 0;
let totalCetap = 0;

// Procesar cada territorial
TERRITORIALES_ESAP.forEach((territorial, idx) => {
  const esSedeCentral = territorial.codigo === 'ESAP-CENTRAL';
  const nivel = esSedeCentral ? 'nacional' : 'territorial';

  // Generar o reutilizar UUID para esta territorial
  if (!idMapping[territorial.id]) {
    idMapping[territorial.id] = generateUUID();
  }
  const territorialUUID = idMapping[territorial.id];

  sql += `
-- =====================================================
-- ${idx + 1}. ${territorial.nombre.toUpperCase()}
-- Departamentos: ${territorial.departamentos.join(', ')}
-- Total CETAP: ${territorial.totalCetap}
-- =====================================================

-- Insertar ${esSedeCentral ? 'Sede Central' : 'Territorial'}
INSERT INTO auth.unidades_organizacionales (
  id, codigo, nombre, nombre_corto, nivel,
  departamento, ciudad, estado,
  capacidad_estudiantes, permite_inscripciones, permite_matriculas, visible_portal,
  created_at, updated_at
) VALUES (
  '${territorialUUID}',
  '${territorial.codigo}',
  '${territorial.nombre}',
  '${territorial.nombreCorto}',
  '${nivel}',
  '${territorial.departamentos[0]}',
  '${territorial.ciudadPrincipal}',
  'activa',
  ${esSedeCentral ? '1000' : '500'},
  true,
  true,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (codigo) DO NOTHING;

`;

  totalUnidades++;

  // Procesar CETAP de esta territorial
  if (territorial.cetap && territorial.cetap.length > 0) {
    sql += `-- CETAP de ${territorial.nombreCorto}\n`;

    territorial.cetap.forEach((cetap) => {
      const esPrincipal = cetap.tipo === 'principal';

      // Generar UUID para este CETAP
      if (!idMapping[cetap.id]) {
        idMapping[cetap.id] = generateUUID();
      }
      const cetapUUID = idMapping[cetap.id];

      // Hacer el código único agregando prefijo de la territorial
      const codigoUnico = cetap.codigo === 'SEDE-PRINCIPAL' ? cetap.codigo : `${territorial.codigo}-${cetap.codigo}`;

      sql += `INSERT INTO auth.unidades_organizacionales (
  id, codigo, nombre, nombre_corto, nivel, padre_id,
  departamento, ciudad, estado,
  capacidad_estudiantes, permite_inscripciones, permite_matriculas, visible_portal,
  created_at, updated_at
) VALUES (
  '${cetapUUID}',
  '${codigoUnico}',
  '${cetap.nombre.replace(/'/g, "''")}',
  '${cetap.nombre.replace('CETAP ', '').replace(/'/g, "''")}',
  'cetap',
  '${territorialUUID}',
  '${cetap.departamento || territorial.departamentos[0]}',
  '${cetap.ciudad || territorial.ciudadPrincipal}',
  'activa',
  ${esPrincipal ? '300' : '150'},
  true,
  true,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (codigo) DO NOTHING;
`;

      totalCetap++;
    });

    sql += '\n';
  }
});

sql += `
-- =====================================================
-- RESUMEN DE LA MIGRACIÓN
-- =====================================================
-- Total territoriales insertadas: ${totalUnidades}
-- Total CETAP insertadas: ${totalCetap}
-- TOTAL UNIDADES: ${totalUnidades + totalCetap}
-- =====================================================

COMMIT;

-- Verificar inserción
SELECT
  nivel,
  COUNT(*) as total,
  COUNT(CASE WHEN estado = 'activa' THEN 1 END) as activas
FROM auth.unidades_organizacionales
GROUP BY nivel
ORDER BY
  CASE nivel
    WHEN 'nacional' THEN 1
    WHEN 'territorial' THEN 2
    WHEN 'cetap' THEN 3
    ELSE 4
  END;

-- Mostrar algunos ejemplos
SELECT
  codigo, nombre, nivel, ciudad, departamento
FROM auth.unidades_organizacionales
WHERE nivel IN ('nacional', 'territorial')
ORDER BY nivel, nombre
LIMIT 20;
`;

// Escribir archivo SQL
fs.writeFileSync(outputPath, sql, 'utf8');

console.log('✓ Archivo SQL generado exitosamente');
console.log('✓ Ubicación:', outputPath);
console.log('✓ Estadísticas:');
console.log(`  - Territoriales: ${totalUnidades}`);
console.log(`  - CETAP: ${totalCetap}`);
console.log(`  - TOTAL: ${totalUnidades + totalCetap} unidades organizacionales`);
console.log('\nPara ejecutar la migración:');
console.log('  node run-migration-seed.js');
