const axios = require('axios');

const API_URL = 'https://api.sqinsights.com/washAlert/machines/13956';

async function testAPI() {
  console.log('Testing washing machine API connection...\n');
  
  try {
    // Build headers to match the browser request
    const headers = {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-GB,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'alliancels-organization-id': '4052',
      'Origin': 'https://wa.sqinsights.com',
      'Referer': 'https://wa.sqinsights.com/',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-site'
    };

    console.log('Request headers:');
    Object.entries(headers).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    console.log('');

    const response = await axios.get(API_URL, {
      timeout: 10000,
      headers: headers
    });

    console.log('✅ API connection successful!');
    console.log(`Status: ${response.status}`);
    console.log(`Response length: ${response.data.length} machines\n`);

    // Parse and display machine information
    response.data.forEach((machine, index) => {
      console.log(`Machine ${index + 1}:`);
      console.log(`  ID: ${machine.id}`);
      console.log(`  Name: ${machine.machineName}`);
      console.log(`  Type: ${machine.machineType.isWasher ? 'Washer' : 'Dryer'}`);
      
      try {
        const status = JSON.parse(machine.currentStatus);
        console.log(`  Status: ${status.statusId}`);
        console.log(`  Remaining Time: ${Math.ceil(status.remainingSeconds / 60)} minutes`);
        console.log(`  Cycle: ${status.selectedCycle?.name || 'Unknown'}`);
        console.log(`  Door Open: ${status.isDoorOpen ? 'Yes' : 'No'}`);
      } catch (error) {
        console.log(`  Status: Error parsing status - ${error.message}`);
      }
      
      console.log('');
    });

    // Check for machines that are currently in use
    const inUseMachines = response.data.filter(machine => {
      try {
        const status = JSON.parse(machine.currentStatus);
        return status.statusId === 'IN_USE';
      } catch {
        return false;
      }
    });

    console.log(`📊 Summary:`);
    console.log(`  Total machines: ${response.data.length}`);
    console.log(`  Currently in use: ${inUseMachines.length}`);
    console.log(`  Available: ${response.data.length - inUseMachines.length}`);

  } catch (error) {
    console.error('❌ API connection failed:');
    console.error(`  Error: ${error.message}`);
    
    if (error.response) {
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

// Run the test
testAPI(); 