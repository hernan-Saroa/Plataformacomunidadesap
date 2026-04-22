async function test() {
  try {
    const res = await fetch('http://localhost:3007/configuraciones/profesionales-ocig/roles-ocig');
    console.log(await res.json());
  } catch(e) {
    console.error(e);
  }
}
test();
