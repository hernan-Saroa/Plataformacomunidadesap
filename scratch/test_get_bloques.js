const http = require('http');

const url = 'http://localhost:3003/pta/banco-docentes/d7bf55f7-bc45-4a67-b092-0104e4e28e7f/bloques';

http.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('RESPONSE:', JSON.stringify(JSON.parse(data), null, 2));
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
