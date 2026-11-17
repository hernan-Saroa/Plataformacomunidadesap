const base = process.env.PA_QA_PREVIEW_URL;
const h = { programadas: 32, requeridas: 64, semanas: 16, excede: false };
const grupo = { idGrupo: 'g1', idAsignatura: 'a1', idPeriodo: '12', idOfertaCetap: 'o1', numeroGrupo: 1, idDocente: null, cupoMaximo: 30, estado: 'activo', observaciones: null, fechaInicio: '2027-01-01', fechaFin: '2027-06-30', modalidad: 'presencial' };
export const franja = (idFranja, diaSemana = 'MIERCOLES') => ({ idFranja, idGrupo: 'g1', diaSemana, horaInicio: '18:15', horaFin: '19:15', tipoSesion: 'presencial', aulaCodigo: '101', estado: 'PROGRAMADO' });
const oferta = { idOfertaCetap: 'o1', idPrograma: 'pr1', idPeriodoAcademico: '12', cetap: { id: '1', codigo: 'CET-0288', nombre: 'Sede Central' }, territorial: { codigo: 'SC', nombre: 'SEDE_CENTRAL', idSeccional: '1' } };
const candidato = (doc, nombre, asignable) => ({ documento: doc, nombre, vinculacion: 'CARRERA2', perfil: 'Perfil QA', titulos: { pregrado: 'Administración', especializacion: null, maestria: null, doctorado: null, posdoctorado: null }, nucleos: [{ area: 'Finanzas Públicas', origen: 'rund', texto: 'Finanzas Públicas' }], origenArea: 'rund', horasProgramadas: 180, horasImpacto: 16, tope: 800, cruce: !asignable, asignable, motivos: asignable ? [] : [{ tipo: 'CRUCE', regla: 'RN-07', mensaje: 'Tiene una franja ocupada el miércoles de 18:15 a 19:15', detalle: { diaSemana: 'MIERCOLES', horaInicio: '18:15', horaFin: '19:15' } }], avisos: doc === '123' ? ['Sin situación administrativa registrada en el RUND'] : [] });
export async function preparar(page, estado) {
  const errores = []; page.on('pageerror', e => errores.push(e.message));
  await page.setRequestInterception(true);
  page.on('request', req => {
    const u = new URL(req.url());
    if (!u.pathname.includes('/api/v1/')) return u.origin === new URL(base).origin || u.protocol === 'data:' ? req.continue() : req.abort();
    const ruta = u.pathname.split('/api/v1/')[1], method = req.method(), body = req.postData() ? JSON.parse(req.postData()) : null;
    estado.llamadas.push({ ruta, method, body });
    let data = null, status = 200, code, message;
    if (method === 'OPTIONS') data = null;
    else if (ruta === 'programacion/mis-permisos') data = { ver: ['pregrado'], programar: ['pregrado'], asignar: ['pregrado'], disponibilidad: true };
    else if (ruta === 'concertacion/configuracion') data = { habilitada: true, desdePeriodo: '2026-1', firmaSimulada: true, revisionesRequeridas: [] };
    else if (ruta === 'programacion/arbol') data = { periodo: { id: '12', codigo: '2027-1', estado: 'planeacion', fechaInicio: '2027-01-01', fechaFin: '2027-06-30' }, resumen: { programas: 0, asignaturas: 0, grupos: 0, franjas: 0, franjasSinDocente: 0 }, programas: [] };
    else if (ruta === 'validacion/vivos') data = { total: 0, grupo: 0, aula: 0, docente: 0, cruces: [] };
    else if (ruta.startsWith('validacion')) data = { resumen: { total: 0, aula: 0, docente: 0 }, cruces: [], periodos: [] };
    else if (ruta === 'catalogo/programas') data = estado.vacio ? [] : [{ id: 'pr1', codigo: 'PRO-001', nombre: 'Administración Pública - Diurno', tipo: 'profesional', nivel: 'pregrado', modalidad: 'presencial', horasBasePorCredito: 16 }];
    else if (ruta === 'catalogo/programas/pr1/asignaturas') data = { programa: { id: 'pr1' }, ofertadoEnPeriodo: true, semestres: [{ semestreId: 1, codigo: '1', etiqueta: 'Semestre 1', orden: 1, asignaturas: [{ id: 'a1', codigo: 'ASIG-00001', nombre: 'Constitución Del Territorio', creditos: 3, pensum: 'AP', modalidad: 'presencial', horasClase: 64 }] }] };
    else if (ruta === 'grupos') data = [grupo];
    else if (ruta === 'grupos/g1') data = grupo;
    else if (ruta === 'grupos/ofertas-cetap') { data = [oferta]; if (estado.errorOferta) { status = 503; message = 'El servicio de ofertas no está disponible'; } }
    else if (ruta === 'grupos/ofertas-cetap/estado') data = { periodoModelo: 'plataforma', periodoCodigo: '2027-1', programa: 'Administración Pública - Diurno', ofertasDelPeriodo: 325, ofertasDelPrograma: 1, cetapsCatalogo: 290, sinTerritorial: 0, unicaSede: true, motivo: 'Según la oferta cargada para 2027-1, «Administración Pública - Diurno» solo se dicta en Sede Central.' };
    else if (ruta === 'aulas') data = [{ codigo: '101', nombre: 'Aula 101', sedeCodigo: 'SC', capacidad: 30, provisional: false, cetap: oferta.cetap, territorial: oferta.territorial, idOfertaCetap: 'o1' }];
    else if (ruta === 'horarios/grupo/g1/horas') data = { ...h, programadas: estado.horas };
    else if (ruta === 'horarios' && method === 'GET') data = u.searchParams.has('grupo') ? estado.sesiones : [];
    else if (ruta === 'horarios/lote/validar') data = { valido: !estado.conflicto, dias: body.dias.map(diaSemana => ({ diaSemana, ok: !estado.conflicto || diaSemana !== 'MIERCOLES', conflictos: estado.conflicto && diaSemana === 'MIERCOLES' ? [{ tipo: 'AULA', mensaje: 'El aula tiene cruce el miércoles' }] : [] })), horas: { programadasDespues: 64, requeridas: 64, excede: false } };
    else if (ruta === 'horarios/lote') { estado.horas = 64; data = { creadas: body.dias.map((dia, i) => ({ ...franja(`n${i}`, dia), horaInicio: body.horaInicio, horaFin: body.horaFin, tipoSesion: body.tipoSesion, aulaCodigo: body.aulaCodigo })), horas: { ...h, programadas: 64 } }; estado.sesiones.push(...data.creadas); }
    else if (ruta === 'horarios/f1' && method === 'PATCH') {
      if (estado.bloqueada && !body.confirmarDevolucion) { status = 409; code = 'EN_CONCERTACION'; message = 'La sesión está en una concertación enviada; debe devolverla.'; data = { concertacion: { id: 'c1', docente: 'Docente QA', estado: 'ENVIADA' } }; }
      else { const { confirmarDevolucion, ...campos } = body; estado.sesiones[0] = { ...estado.sesiones[0], ...campos }; data = { franja: estado.sesiones[0], horas: { ...h, programadas: 48 }, concertacionDevuelta: estado.bloqueada ? 'c1' : null }; estado.horas = 48; }
    }
    else if (ruta === 'horarios/f1' && method === 'DELETE') { estado.sesiones = estado.sesiones.filter(s => s.idFranja !== 'f1'); data = { eliminado: true, horas: { ...h, programadas: 0 }, concertacionDevuelta: null }; estado.horas = 0; }
    else if (ruta === 'asignaciones/candidatos') {
      const ids = u.searchParams.get('franjas')?.split(',').filter(Boolean) ?? [], bloqueados = ids.length > 1;
      data = { grupo: 'g1', horarioPorDefinir: false, franjas: ids.map(id => ({ idFranja: id, diaSemana: id === 'f1' ? 'LUNES' : 'MIERCOLES', horaInicio: '18:15', horaFin: '19:15', docenteActual: null })), area: { codigo: 'AF-04', nombre: 'Finanzas Públicas', nucleoAsignatura: 'Finanzas Públicas' }, candidatos: [candidato('123','Docente Uno',!bloqueados),candidato('456','Docente Dos',!bloqueados),candidato('789','Docente Bloqueado',false)], resumen: { total: 3, asignables: bloqueados ? 0 : 2, bloqueados: bloqueados ? 3 : 1 }, sugerido: null, aviso: bloqueados ? 'Los 3 docentes del área tienen algún bloqueo: revise el motivo de cada uno.' : null, mensaje: null };
    }
    else if (ruta === 'asignaciones/multiple') data = estado.rechazar ? { asignado: false, errores: [{ documento: '456', motivos: [{ tipo: 'TOPE', regla: 'TOPE', mensaje: 'El tope cambió: no se guardó el reparto', detalle: null }] }] } : { asignado: true, resultados: body.asignaciones.map(a => ({ ...a, avisos: [] })) };
    else if (ruta === 'periodos-academicos' && method === 'POST') { data = { id: `nuevo-${body.anio}`, ...body, codigo: body.codigo ?? `${body.anio}-${body.semestre}`, estado: 'planeacion' }; estado.creados = [...(estado.creados ?? []), data]; }
    else if (ruta === 'periodos-academicos') data = [{ id: '12', codigo: '2027-1', anio: 2027, semestre: 1, tipo: 'semestral', estado: 'planeacion', fechaInicio: '2027-01-01', fechaFin: '2027-06-30' }];
    else if (ruta === 'periodos') data = { periodos: [{ idPeriodo: '12', codigo: '2027-1', anio: 2027, semestre: 1, modelo: 'plataforma', fechaInicio: '2027-01-01', fechaFin: '2027-06-30', estadoPlataforma: 'planeacion', programacion: { estado: 'abierta', cerradaEn: null }, programable: true, esActivo: false }, ...(estado.creados ?? []).map(p => ({ idPeriodo: p.id, codigo: p.codigo, anio: p.anio, semestre: p.semestre ?? null, modelo: 'plataforma', fechaInicio: p.fechaInicio, fechaFin: p.fechaFin, estadoPlataforma: 'planeacion', programacion: { estado: 'abierta', cerradaEn: null }, programable: true, esActivo: false }))], legado: [], permisos: { crear: true, activar: false, cerrarProgramacion: false, importar: false } };
    else if (ruta.startsWith('publicaciones/')) data = { idPeriodo: ruta.split('/').at(-1), total: 0, programado: 0, publicada: 0, tomada: 0, aprobada: 0, pendientesCierre: 0 };
    else { status = 404; message = `Ruta no simulada: ${ruta}`; }
    req.respond({ status, headers: { 'Access-Control-Allow-Origin': new URL(base).origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': req.headers()['access-control-request-headers'] || 'Content-Type,Authorization,X-Client-Version,X-Client-Platform,X-Frontend-Base-Url', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS' }, contentType: 'application/json', body: JSON.stringify(status < 400 ? { success: true, data } : { success: false, code, message, ...data }) });
  });
  return errores;
}
export const click = (page, texto) => page.evaluate(texto => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === texto); if (!b) throw Error(`Sin botón ${texto}`); b.click(); }, texto);
export const campo = (page, selector, valor) => page.$eval(selector, (e,v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,v); e.dispatchEvent(new Event('input',{bubbles:true})); }, valor);
export async function abrirGrupo(page) {
  await page.waitForSelector('select');
  for (const valor of ['pregrado', 'pr1']) {
    await page.waitForFunction(v => [...document.querySelectorAll('select')].some(s => [...s.options].some(o => o.value === v)), {}, valor);
    await page.evaluate(v => { const s = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.value === v)); s.value=v; s.dispatchEvent(new Event('change',{bubbles:true})); }, valor);
  }
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Constitución Del Territorio')));
  const abrir = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Constitución Del Territorio')));
  await abrir.asElement().click(); await abrir.dispose();
  await page.waitForSelector('[aria-label="Cerrar panel de grupos"]');
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Asignar horario'));
  await click(page,'Asignar horario');
  await page.waitForFunction(() => document.body.innerText.includes('32h programadas'));
}
