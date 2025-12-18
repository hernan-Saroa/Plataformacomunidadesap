
async function testStageTransition() {
    try {
        // 1. Create News
        console.log('Creating News...');
        const newsRes = await fetch('http://localhost:3005/disciplinary-news', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                origen: 'OFICIO',
                territorial: 'Bogota',
                dependenciaDenunciado: 'Sistemas',
                denunciante: {
                    nombre: 'Juan Perez',
                    email: 'juan@example.com',
                    cedula: '12345678'
                },
                disciplinable: {
                    nombre: 'Maria Lopez',
                    cargo: 'Ingeniera',
                    cedula: '87654321'
                },
                hechos: 'Prueba de transicion de etapa'
            })
        });

        if (!newsRes.ok) {
            const err = await newsRes.text();
            throw new Error(`News creation failed: ${newsRes.status} ${err}`);
        }

        const newsData = await newsRes.json();
        const news = newsData.data || newsData;
        const newsId = news.id;
        console.log('News Created:', newsId);

        // 2. Assign Process (Starts in EVALUACION)
        const abogadoId = '123e4567-e89b-12d3-a456-426614174000';

        console.log('Assigning Process...');
        const processRes = await fetch('http://localhost:3005/disciplinary-processes/assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                newsId: newsId,
                abogadoId: abogadoId,
                observaciones: 'Asignacion automatica de prueba'
            })
        });

        if (!processRes.ok) {
            const err = await processRes.text();
            throw new Error(`Process assignment failed: ${processRes.status} ${err}`);
        }

        const processData = await processRes.json();
        const process = processData.data || processData;
        const processId = process.id;
        console.log('Process Created:', processId);
        console.log('Initial Stage:', process.etapaActual);

        // 3. Try Valid Transition: EVALUACION -> INDAGACION_PREVIA
        console.log('Attempting Valid Transition: EVALUACION -> INDAGACION_PREVIA');
        const validTransitionRes = await fetch(`http://localhost:3005/disciplinary-processes/${processId}/stage`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                stage: 'INDAGACION_PREVIA'
            })
        });

        if (validTransitionRes.ok) {
            console.log('Valid Transition SUCCESS');
            const updatedProcess = await validTransitionRes.json();
            console.log('New Stage:', updatedProcess.etapaActual);
        } else {
            const err = await validTransitionRes.text();
            console.error('Valid Transition FAILED:', validTransitionRes.status, err);
        }

        // 4. Try Invalid Transition: INDAGACION_PREVIA -> JUZGAMIENTO (Skipping INVESTIGACION)
        console.log('Attempting Invalid Transition: INDAGACION_PREVIA -> JUZGAMIENTO');
        const invalidTransitionRes = await fetch(`http://localhost:3005/disciplinary-processes/${processId}/stage`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                stage: 'JUZGAMIENTO'
            })
        });

        if (invalidTransitionRes.ok) {
            console.log('Invalid Transition SUCCESS (Unexpected)');
        } else {
            const err = await invalidTransitionRes.text();
            console.log('Invalid Transition FAILED (Expected):', invalidTransitionRes.status, err);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testStageTransition();
