
async function createTestData() {
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
                hechos: 'Prueba de creacion de noticia'
            })
        });

        if (!newsRes.ok) {
            const err = await newsRes.text();
            throw new Error(`News creation failed: ${newsRes.status} ${err}`);
        }

        const newsData = await newsRes.json();
        // Handle wrapped response
        const news = newsData.data || newsData;
        const newsId = news.id;

        if (!newsId) {
            console.log('News Response:', JSON.stringify(newsData, null, 2));
            throw new Error('No news ID returned');
        }
        console.log('News Created:', newsId);

        // 2. Assign Process (Create Process)
        // Generating a random UUID for abogadoId
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
        console.log('Process Created:', process.id);
        console.log('Full Process Data:', JSON.stringify(process, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
    }
}

createTestData();
