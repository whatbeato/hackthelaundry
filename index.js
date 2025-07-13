require('dotenv').config();
const { App } = require('@slack/bolt');
const axios = require('axios');

// Initialize Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

// Store previous machine states to detect changes
let previousMachineStates = new Map();

// Parse machine status from the API response
function parseMachineStatus(machine) {
  try {
    const status = JSON.parse(machine.currentStatus);
    return {
      id: machine.id,
      machineName: machine.machineName,
      machineNumber: machine.machineNumber,
      isWasher: machine.machineType.isWasher,
      isDryer: machine.machineType.isDryer,
      statusId: status.statusId,
      remainingSeconds: status.remainingSeconds,
      isDoorOpen: status.isDoorOpen,
      selectedCycle: status.selectedCycle?.name || 'Unknown',
      remainingVend: status.remainingVend
    };
  } catch (error) {
    console.error(`Error parsing status for machine ${machine.id}:`, error);
    return null;
  }
}

// Check if a machine has finished its cycle
function hasMachineFinished(previousState, currentState) {
  if (!previousState || !currentState) return false;
  
  // Machine is finished when it goes from IN_USE to AVAILABLE
  return previousState.statusId === 'IN_USE' && currentState.statusId === 'AVAILABLE';
}

// Format time remaining in a human-readable format
function formatTimeRemaining(seconds) {
  if (!seconds || seconds <= 0) return '0 minutes';
  
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
}

// Send notification to Slack channel
async function sendNotification(machine, previousState) {
  const machineType = machine.isWasher ? 'washer' : 'dryer';
  const cycleName = machine.selectedCycle || 'Unknown cycle';
  
  const message = {
    channel: process.env.SLACK_CHANNEL_ID,
    text: `:white_check_mark: *${machine.machineName} (${machineType}) is done!*`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `:white_check_mark: *${machine.machineName} (${machineType}) is done!*`
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Machine:*\n${machine.machineName}`
          },
          {
            type: "mrkdwn",
            text: `*Type:*\n${machineType.charAt(0).toUpperCase() + machineType.slice(1)}`
          },
          {
            type: "mrkdwn",
            text: `*Cycle:*\n${cycleName}`
          },
          {
            type: "mrkdwn",
            text: `*Status:*\nAvailable`
          }
        ]
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `:clock1: Your laundry is ready to be collected!`
          }
        ]
      }
    ]
  };

  try {
    await app.client.chat.postMessage(message);
    console.log(`Notification sent for ${machine.machineName}`);
  } catch (error) {
    console.error('Error sending Slack notification:', error);
  }
}

// Fetch machine status from API
async function fetchMachineStatus() {
  try {
    // Build headers based on environment variables
    const headers = {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-GB,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Origin': 'https://wa.sqinsights.com',
      'Referer': 'https://wa.sqinsights.com/',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-site'
    };

    // Add organization ID header
    if (process.env.ALLIANCELS_ORGANIZATION_ID) {
      headers['alliancels-organization-id'] = process.env.ALLIANCELS_ORGANIZATION_ID;
    }

    // Add any additional headers from environment
    if (process.env.API_ADDITIONAL_HEADERS) {
      const additionalHeaders = process.env.API_ADDITIONAL_HEADERS.split(',');
      additionalHeaders.forEach(header => {
        const [key, value] = header.split('=');
        if (key && value) {
          headers[key.trim()] = value.trim();
        }
      });
    }

    const response = await axios.get(process.env.WASHING_MACHINE_API_URL, {
      timeout: 10000,
      headers: headers
    });

    if (response.status === 200 && Array.isArray(response.data)) {
      return response.data;
    } else {
      console.error('Invalid response format from API');
      return [];
    }
  } catch (error) {
    console.error('Error fetching machine status:', error.message);
    return [];
  }
}

// Main polling function
async function pollMachines() {
  console.log('Polling washing machine status...');
  
  const machines = await fetchMachineStatus();
  const currentStates = new Map();

  for (const machine of machines) {
    const parsedStatus = parseMachineStatus(machine);
    if (parsedStatus) {
      currentStates.set(machine.id, parsedStatus);
      
      const previousState = previousMachineStates.get(machine.id);
      
      // Check if machine has finished
      if (hasMachineFinished(previousState, parsedStatus)) {
        console.log(`Machine ${parsedStatus.machineName} has finished!`);
        await sendNotification(parsedStatus, previousState);
      }
      
      // Log current status for debugging
      if (process.env.DEBUG === 'true') {
        console.log(`${parsedStatus.machineName}: ${parsedStatus.statusId} (${formatTimeRemaining(parsedStatus.remainingSeconds)} remaining)`);
      }
    }
  }

  // Update previous states
  previousMachineStates = currentStates;
}

// Start the bot
async function startBot() {
  try {
    await app.start();
    console.log('⚡️ Washing Machine Bot is running!');
    
    // Start polling immediately
    await pollMachines();
    
    // Set up periodic polling
    const pollingInterval = parseInt(process.env.POLLING_INTERVAL) || 30000;
    setInterval(pollMachines, pollingInterval);
    
    console.log(`Polling every ${pollingInterval / 1000} seconds`);
  } catch (error) {
    console.error('Error starting bot:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down bot...');
  await app.stop();
  process.exit(0);
});

// Start the bot
startBot(); 