import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import AprobacionPorComponente from './AprobacionPorComponente';
import { SolicitudViatico } from '../types/viaticos';

describe('AprobacionPorComponente — Gestor de Firmas', () => {
  const baseSolicitud: SolicitudViatico = {
    id: 'sol-001',
    codigo: 'VIAT-2026-0001',
    cedulaComisionado: '12345678',
    nombreComisionado: 'Carlos Rodriguez',
    cargoComisionado: 'Docente Ocasional',
    dependencia: 'Facultad de Posgrados',
    sedeOrigen: 'Sede Central',
    ciudadDestino: 'Medellín',
    departamentoDestino: 'Antioquia',
    fechaInicio: '2026-10-10',
    fechaFin: '2026-10-12',
    diasComision: 3,
    tipoComision: 'SERVICIOS_INSTITUCIONALES',
    medioTransporte: 'AEREO',
    justificacion: 'Capacitación presencial territorial',
    montoSolicitadoViaticos: 900000,
    montoSolicitadoGastosViaje: 150000,
    montoTotalEstimado: 1050000,
    estado: 'PENDIENTE_FIRMAS',
    extemporanea: false,
    radicadoFueraJornada: false,
    requiereTiqueteAereo: true,
    creadoEn: '2026-10-01T08:00:00Z',
    actualizadoEn: '2026-10-01T08:00:00Z',
  };

  it('en estado PENDIENTE_FIRMAS: muestra firmas esperadas de Jefe y Gerente y etapas posteriores como No aplica', () => {
    render(
      <AprobacionPorComponente
        solicitud={baseSolicitud}
        solicitudCompleta={null}
        estadoFirmas={{
          solicitudId: 'sol-001',
          consecutivoUnico: 'VIAT-2026-0001',
          estadoSolicitud: 'PENDIENTE_FIRMAS',
          reglaDesplazamiento: 'REGULAR',
          descripcionRegla: 'Flujo regular',
          firmantes: [
            {
              tipo: 'JEFE_DEPENDENCIA',
              titulo: 'Jefe de Dependencia',
              cargo: 'Jefe Inmediato',
              descripcion: 'Firma de jefe',
              esRequerido: true,
              firmado: false,
              firma: null,
            },
            {
              tipo: 'GERENTE_PROYECTO',
              titulo: 'Gerente de Proyecto',
              cargo: 'Gerente de Proyecto',
              descripcion: 'Firma de gerente',
              esRequerido: true,
              firmado: false,
              firma: null,
            },
          ],
          completado: false,
          requiereFirmasParaRadicar: true,
          mensaje: 'Pendiente de firmas',
        }}
      />,
    );

    // Encabezado
    expect(screen.getByText('Aprobación por Componente')).toBeDefined();

    // Banner informativo para el proceso del enlace
    expect(
      screen.getByText('Trámite en espera de firmas de aprobación previa'),
    ).toBeDefined();

    // Componente Elaboración Enlace debe estar aprobado
    expect(screen.getByText('ELABORACIÓN — ENLACE')).toBeDefined();

    // Componentes Jefe y Gerente
    expect(screen.getByText('JEFE DE DEPENDENCIA')).toBeDefined();
    expect(screen.getByText('GERENTE DE PROYECTO')).toBeDefined();

    // Componentes no aplicables en esta fase
    expect(screen.getByText('REVISIÓN — ANALISTA')).toBeDefined();
    expect(screen.getByText('CONTROL CRUZADO')).toBeDefined();
    expect(screen.getByText('AUTORIZACIÓN CORPORATIVA')).toBeDefined();
    expect(screen.getByText('PRESUPUESTO — RP')).toBeDefined();
    expect(screen.getByText('TESORERÍA — GIRO')).toBeDefined();

    // Verificar que existen insignias "No aplica"
    const noAplicaElements = screen.getAllByText('No aplica');
    expect(noAplicaElements.length).toBeGreaterThanOrEqual(4);
  });

  it('en estado RADICADA con firmas completadas: muestra el resto del flujo activo', () => {
    const solicitudRadicada: SolicitudViatico = {
      ...baseSolicitud,
      estado: 'RADICADA',
    };

    render(
      <AprobacionPorComponente
        solicitud={solicitudRadicada}
        solicitudCompleta={{
          ...solicitudRadicada,
          consecutivoUnico: 'VIAT-2026-0001',
          comisionadoId: 'com-1',
          fechaInicio: new Date('2026-10-10'),
          fechaFin: new Date('2026-10-12'),
          objetoComision: 'Capacitación presencial territorial',
          prioridad: 'MEDIA',
          rubroPresupuestal: 'A-02-02',
          requiereTiquetes: true,
          montoViaticos: 900000,
          montoGastosViaje: 150000,
          diasComision: 3,
          estadoSolicitud: 'RADICADA',
          tipoComision: 'SERVICIOS_INSTITUCIONALES',
          esInternacional: false,
          radicadoFueraJornada: false,
          extemporanea: false,
          creadoPorUsuarioId: 'user-enlace',
          creadoEn: new Date('2026-10-01T08:00:00Z'),
          actualizadoEn: new Date('2026-10-01T08:00:00Z'),
          camposAdicionales: {
            firmasAprobacion: [
              {
                tipo: 'JEFE_DEPENDENCIA',
                nombreFirmante: 'DRA. CAROLINA GARCIA',
                cargoFirmante: 'Directora Territorial',
                fechaFirma: '2026-10-01T10:00:00Z',
                estado: 'FIRMADO',
                firmadoDigitalmente: true,
              },
              {
                tipo: 'GERENTE_PROYECTO',
                nombreFirmante: 'ING. HERNAN LOPEZ',
                cargoFirmante: 'Gerente Proyecto Inversión',
                fechaFirma: '2026-10-01T11:00:00Z',
                estado: 'FIRMADO',
                firmadoDigitalmente: true,
              },
            ],
          },
        }}
      />,
    );

    // Deben verse los nombres de los firmantes aprobados
    expect(screen.getByText('DRA. CAROLINA GARCIA')).toBeDefined();
    expect(screen.getByText('ING. HERNAN LOPEZ')).toBeDefined();

    // No debe haber insignias "No aplica" en estado RADICADA
    const noAplicaElements = screen.queryAllByText('No aplica');
    expect(noAplicaElements.length).toBe(0);

    // Debe mostrar la fecha en formato amigable
    expect(screen.getAllByText('01 de oct de 2026').length).toBeGreaterThanOrEqual(1);
  });
});
