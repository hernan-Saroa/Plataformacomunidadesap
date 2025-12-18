// Native fetch is available in Node 20+

async function seed() {
    const missing = [
        {
            radicado: '050013331001202500001',
            jurisdiccion: 'LABORAL',
            tipoProceso: 'ACOSO LABORAL',
            demandante: 'Maria Fernanda Cabal',
            demandado: 'ESAP',
            estado: 'RADICADO',
            fechaRadicacion: '2025-02-01T10:15:00.000Z',
            cuantia: 0,
            abogadoSustanciador: 'Sin Asignar',
            terminoProcesalDias: 30,
            ultimaActuacion: 'Reparto a juzgado'
        },
        {
            radicado: '680013334004202400234',
            jurisdiccion: 'PENAL',
            tipoProceso: 'QUERELLA POR CALUMNIA',
            demandante: 'Pedro Pablo Kuczynski',
            demandado: 'ESAP (Funcionario)',
            estado: 'EN_TRAMITE',
            fechaRadicacion: '2024-09-20T16:45:00.000Z',
            cuantia: 0,
            abogadoSustanciador: 'Dr. Carlos Mendoza',
            terminoProcesalDias: 15,
            ultimaActuacion: 'Audiencia de conciliación fallida'
        }
    ];

    for (const exp of missing) {
        try {
            const resp = await fetch('http://localhost:3008/api/legal/expedientes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(exp)
            });
            if (resp.ok) {
                console.log(`Included ${exp.radicado}`);
            } else {
                const txt = await resp.text();
                console.error(`Failed ${exp.radicado}: ${txt}`);
            }
        } catch (e) {
            console.error(e);
        }
    }
}

seed();
