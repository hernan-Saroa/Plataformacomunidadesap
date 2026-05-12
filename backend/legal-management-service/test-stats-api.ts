import axios from 'axios';

async function testApi() {
    try {
        const res = await axios.get('http://localhost:3008/reportes/stats');
        console.log(JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.log("Error:", e.message);
    }
}
testApi();
