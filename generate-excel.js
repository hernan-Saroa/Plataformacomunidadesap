const ExcelJS = require('exceljs');
const fs = require('fs');

async function createExcel() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Antigravity';
  workbook.created = new Date();

  // 1. DIRECCIONES_TERRITORIALES
  const sheetDT = workbook.addWorksheet('DIRECCIONES_TERRITORIALES');
  sheetDT.columns = [
    { header: 'codigo_dt', key: 'codigo_dt', width: 15 },
    { header: 'nombre_dt', key: 'nombre_dt', width: 30 },
    { header: 'nombre_normalizado', key: 'nombre_normalizado', width: 30 },
    { header: 'orden_visualizacion', key: 'orden_visualizacion', width: 20 },
    { header: 'activo', key: 'activo', width: 10 }
  ];

  const dts = [
    { nombre: 'SEDE_CENTRAL', cetaps: 1, otro: 1 },
    { nombre: 'ANTIOQUIA', cetaps: 31, otro: 1 },
    { nombre: 'ATLÁNTICO', cetaps: 9, otro: 1 },
    { nombre: 'BOLÍVAR', cetaps: 18, otro: 1 },
    { nombre: 'BOYACÁ', cetaps: 14, otro: 1 },
    { nombre: 'CALDAS', cetaps: 14, otro: 1 },
    { nombre: 'CAUCA', cetaps: 7, otro: 1 },
    { nombre: 'CHOCÓ', cetaps: 5, otro: 1 },
    { nombre: 'CUNDINAMARCA', cetaps: 27, otro: 1 },
    { nombre: 'HUILA', cetaps: 25, otro: 1 },
    { nombre: 'META', cetaps: 27, otro: 1 },
    { nombre: 'NARIÑO', cetaps: 30, otro: 1 },
    { nombre: 'NORTE DE SANTANDER', cetaps: 21, otro: 1 },
    { nombre: 'RISARALDA', cetaps: 11, otro: 1 },
    { nombre: 'SANTANDER', cetaps: 8, otro: 1 },
    { nombre: 'TOLIMA', cetaps: 14, otro: 1 },
    { nombre: 'VALLE', cetaps: 9, otro: 1 }
  ];

  const normalize = (str) => {
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
  };

  const dtRows = [];
  dts.forEach((dt, index) => {
    const isCentral = dt.nombre === 'SEDE_CENTRAL';
    const codigo = isCentral ? 'SC' : `DT-${String(index).padStart(3, '0')}`;
    dtRows.push({
      codigo_dt: codigo,
      nombre_dt: dt.nombre,
      nombre_normalizado: normalize(dt.nombre),
      orden_visualizacion: index + 1,
      activo: 'TRUE',
      // extra data for generation:
      cetaps: dt.cetaps,
      otro: dt.otro
    });
    sheetDT.addRow({
      codigo_dt: codigo,
      nombre_dt: dt.nombre,
      nombre_normalizado: normalize(dt.nombre),
      orden_visualizacion: index + 1,
      activo: 'TRUE'
    });
  });

  // 2. CETAPS
  const sheetCetaps = workbook.addWorksheet('CETAPS');
  sheetCetaps.columns = [
    { header: 'codigo_cetap', key: 'codigo_cetap', width: 15 },
    { header: 'nombre_cetap', key: 'nombre_cetap', width: 30 },
    { header: 'nombre_normalizado', key: 'nombre_normalizado', width: 30 },
    { header: 'codigo_dt', key: 'codigo_dt', width: 15 },
    { header: 'nombre_dt', key: 'nombre_dt', width: 30 },
    { header: 'tipo', key: 'tipo', width: 15 },
    { header: 'latitud', key: 'latitud', width: 15 },
    { header: 'longitud', key: 'longitud', width: 15 },
    { header: 'activo', key: 'activo', width: 10 }
  ];

  let cetapCounter = 1;
  const cetapsRows = [];

  dtRows.forEach(dt => {
    const isCentral = dt.codigo_dt === 'SC';
    
    // Create 'otro' CETAP
    const cetapOtroCodigo = `CET-${String(cetapCounter++).padStart(4, '0')}`;
    const cetapOtroNombre = `OTRO ${dt.nombre_dt}`;
    cetapsRows.push({
      codigo_cetap: cetapOtroCodigo,
      nombre_cetap: cetapOtroNombre,
      nombre_normalizado: normalize(cetapOtroNombre),
      codigo_dt: dt.codigo_dt,
      nombre_dt: dt.nombre_dt,
      tipo: 'otro',
      latitud: '',
      longitud: '',
      activo: 'TRUE'
    });

    // Create normal CETAPs
    if (isCentral) {
      // 1 sede_central
      const cetapCodigo = `CET-${String(cetapCounter++).padStart(4, '0')}`;
      const cetapNombre = `Sede Central Principal`;
      cetapsRows.push({
        codigo_cetap: cetapCodigo,
        nombre_cetap: cetapNombre,
        nombre_normalizado: normalize(cetapNombre),
        codigo_dt: dt.codigo_dt,
        nombre_dt: dt.nombre_dt,
        tipo: 'sede_central',
        latitud: '4.6486',
        longitud: '-74.0828',
        activo: 'TRUE'
      });
    } else {
      // normal cetaps
      for (let i = 1; i <= dt.cetaps; i++) {
        const cetapCodigo = `CET-${String(cetapCounter++).padStart(4, '0')}`;
        const cetapNombre = `CETAP ${dt.nombre_dt} ${i}`;
        cetapsRows.push({
          codigo_cetap: cetapCodigo,
          nombre_cetap: cetapNombre,
          nombre_normalizado: normalize(cetapNombre),
          codigo_dt: dt.codigo_dt,
          nombre_dt: dt.nombre_dt,
          tipo: 'cetap',
          latitud: '',
          longitud: '',
          activo: 'TRUE'
        });
      }
    }
  });

  cetapsRows.forEach(row => {
    sheetCetaps.addRow(row);
  });

  // 3. DICCIONARIO
  const sheetDiccionario = workbook.addWorksheet('DICCIONARIO');
  sheetDiccionario.columns = [
    { header: 'Campo', key: 'Campo', width: 25 },
    { header: 'Tipo', key: 'Tipo', width: 20 },
    { header: 'Descripción', key: 'Descripción', width: 50 }
  ];
  sheetDiccionario.addRow({ Campo: 'codigo_dt', Tipo: 'Texto', Descripción: 'Código único de la DT' });

  await workbook.xlsx.writeFile('CARGA_1_TERRITORIALES_CETAPS_2025_2.xlsx');
  console.log('Archivo CARGA_1_TERRITORIALES_CETAPS_2025_2.xlsx generado con éxito. Total DTs:', dts.length, 'Total CETAPs:', cetapsRows.length);
}

createExcel().catch(err => {
  console.error(err);
  process.exit(1);
});
