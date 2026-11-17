import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../shell/src/index.css';
import { SelectorCatalogo } from '../src/components/SelectorCatalogo';
import { CalendarioHorario } from '../src/components/CalendarioHorario';
import { AsignacionAreaModal } from '../src/components/AsignacionAreaModal';
import { GestionOfertas } from '../src/components/GestionOfertas';
import { GestionPeriodos } from '../../mfe-programas-academicos/src/components/GestionPeriodos';
const periodo = { id: '12', codigo: '2027-1', estado: 'planeacion' as const, fechaInicio: '2027-01-01', fechaFin: '2027-06-30' };
const franja = (idFranja: string, diaSemana: string) => ({ idFranja, diaSemana, horaInicio: '18:15', horaFin: '19:15', tipoSesion: 'presencial' as const, jornada: 'NOCTURNA', aulaCodigo: '101', estado: 'TOMADA', idDocente: null });
const grupo = { idGrupo: 'g1', numeroGrupo: 1, estado: 'PROGRAMADO', tipoOferta: 'periodo_regular' as const, modalidad: 'presencial' as const, cicloInicio: periodo.fechaInicio, cicloFin: periodo.fechaFin, cupoMaximo: 30, oferta: null, horas: { programadas: 32, requeridas: 64, semanas: 16, excede: false }, estadoFranjas: { PROGRAMADO: 0, PUBLICADA: 0, TOMADA: 2, APROBADA: 0, DEVUELTA: 0 }, docentes: [], franjas: [franja('f1', 'LUNES'), franja('f2', 'MIERCOLES')] };
const calendario = { docente: { idDocente: 'd1', documento: '123', nombre: 'Docente QA', vinculacion: { tipo: 'carrera', texto: 'CARRERA2' } }, periodo, horas: { total: 180, tope: 800 }, horasPorGrupo: { g1: 32 }, franjas: grupo.franjas.map(f => ({ ...f, reservada: false, idGrupo: 'g1', numeroGrupo: 1, tipoOferta: 'periodo_regular', cicloInicio: periodo.fechaInicio, cicloFin: periodo.fechaFin, idAsignatura: 'a1', codigoAsignatura: 'ASIG-00001', asignatura: 'Constitución Del Territorio', programa: 'AP', nivel: 'pregrado' as const })) };
const vista = new URLSearchParams(location.search).get('vista');
createRoot(document.getElementById('root')!).render(<main style={{ padding: 12, minHeight: '100vh', background: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
  <h1 className="font-bold mb-4">Verificación de componentes construidos en producción</h1>
  <div style={{ transform: 'translateZ(0)' }}>{vista === 'asignacion' ? <AsignacionAreaModal grupo={grupo as any} asignatura="Constitución Del Territorio" cerrar={() => { document.body.dataset.cerrado = 'si'; }} retornarFoco={null} />
    : vista === 'calendario' ? <CalendarioHorario soloLectura calendario={calendario as any} />
    : vista === 'periodos' ? <GestionPeriodos onBack={() => {}} onNavigateToImport={() => { throw Error('No se puede importar desde consulta'); }} />
    : vista === 'crearperiodos' ? <GestionOfertas /> : <SelectorCatalogo idPeriodo="12" />}</div>
</main>);
