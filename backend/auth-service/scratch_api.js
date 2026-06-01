const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function testUpload() {
  try {
    const file = fs.createReadStream('C:\\Users\\Hernan_Buitrago\\Downloads\\CARGA_1_TERRITORIALES_CETAPS_2025_2.xlsx');
    const formData = new FormData();
    formData.append('file', file);

    console.log("Sending request to backend...");
    // Assuming backend is running on port 3002 (auth-service)
    const response = await axios.post('http://localhost:3001/estructura-import/upload-geografico?dry_run=true', formData, {
      headers: {
        ...formData.getHeaders()
      }
    });

    console.log("RESPONSE SUCCESS:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("RESPONSE ERROR STATUS:", error.response?.status);
    console.error("RESPONSE ERROR DATA:", JSON.stringify(error.response?.data, null, 2));
  }
}

testUpload();


