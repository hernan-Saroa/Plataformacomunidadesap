const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3110,
  path: '/api/internal-institutional-control/configuraciones/profesionales-ocig',
  method: 'GET'
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);

  let data = '';
  res.on('data', d => {
    data += d;
  });

  res.on('end', () => {
    try {
      console.log(JSON.parse(data));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', error => {
  console.error(error);
});

req.end();
