const fetch = require('node-fetch');

async function testFetch() {
  try {
    const res = await fetch('http://localhost:3007/plan-anual-5-roles/year/2026', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error(err);
  }
}

testFetch();
