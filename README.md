# Washing Machine Slack Bot

A Slack bot that monitors washing machine and dryer status from the SQ Insights API and sends notifications when loads are completed.

## Features

- 🔄 **Real-time monitoring**: Polls the washing machine API every 30 seconds (configurable)
- 🔔 **Smart notifications**: Only sends notifications when machines transition from "IN_USE" to "AVAILABLE"
- 📱 **Rich Slack messages**: Sends formatted messages with machine details and status
- 🛡️ **Error handling**: Graceful error handling and logging
- ⚙️ **Configurable**: Easy configuration via environment variables

## Prerequisites

- Node.js (v14 or higher)
- A Slack workspace where you can create apps
- Access to the SQ Insights washing machine API

## Setup

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd washing-machine-slack-bot
npm install
```

### 2. Test API Connection

First, test that the API connection works:

```bash
node test-api.js
```

You should see output showing the current status of all machines. If you get a 401 error, the API authentication headers are already configured correctly in the test script.

### 3. Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Give your app a name (e.g., "Washing Machine Bot")
4. Select your workspace

### 4. Configure Slack App Permissions

1. In your Slack app settings, go to "OAuth & Permissions"
2. Add the following bot token scopes:
   - `chat:write` - Send messages to channels
   - `chat:write.public` - Send messages to public channels
3. Install the app to your workspace
4. Copy the "Bot User OAuth Token" (starts with `xoxb-`)

### 5. Get App Credentials

1. Go to "Basic Information" in your Slack app settings
2. Copy the "Signing Secret"
3. Go to "Socket Mode" and enable it
4. Create an app-level token (starts with `xapp-`)

### 6. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp env.example .env
   ```

2. Edit `.env` with your actual values:
   ```env
   SLACK_BOT_TOKEN=xoxb-your-actual-bot-token
   SLACK_SIGNING_SECRET=your-actual-signing-secret
   SLACK_APP_TOKEN=xapp-your-actual-app-token
   SLACK_CHANNEL_ID=C1234567890
   WASHING_MACHINE_API_URL=https://api.sqinsights.com/washAlert/machines/13956
   ALLIANCELS_ORGANIZATION_ID=4052
   POLLING_INTERVAL=30000
   DEBUG=false
   ```

### 7. Get Channel ID

1. In Slack, right-click on the channel where you want notifications
2. Select "Copy link"
3. The channel ID is the last part of the URL (e.g., `C1234567890`)

## Usage

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

## How It Works

1. **API Polling**: The bot fetches machine status from the SQ Insights API every 30 seconds
2. **Status Tracking**: It maintains a record of previous machine states
3. **Change Detection**: When a machine transitions from "IN_USE" to "AVAILABLE", it triggers a notification
4. **Slack Notification**: Sends a formatted message to the specified Slack channel

## API Authentication

The bot uses the following headers to authenticate with the SQ Insights API:

- `alliancels-organization-id: 4052` - Organization identifier
- `Origin: https://wa.sqinsights.com` - Origin header
- `Referer: https://wa.sqinsights.com/` - Referer header
- Standard browser headers for compatibility

## Sample Notification

When a machine finishes, you'll get a Slack message like:

```
✅ Machine Node - 151 (dryer) is done!

Machine: Machine Node - 151
Type: Dryer
Cycle: MEDIUM
Status: Available

🕐 Your laundry is ready to be collected!
```

## Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `SLACK_BOT_TOKEN` | Your Slack bot token | Required |
| `SLACK_SIGNING_SECRET` | Your Slack app signing secret | Required |
| `SLACK_APP_TOKEN` | Your Slack app token for socket mode | Required |
| `SLACK_CHANNEL_ID` | Channel ID to send notifications to | Required |
| `WASHING_MACHINE_API_URL` | API endpoint for machine status | Required |
| `ALLIANCELS_ORGANIZATION_ID` | Organization ID for API authentication | 4052 |
| `POLLING_INTERVAL` | How often to check machine status (ms) | 30000 |
| `DEBUG` | Enable debug logging | false |

## Troubleshooting

### Common Issues

1. **"Invalid token" error**: Check that your `SLACK_BOT_TOKEN` is correct and the app is installed to your workspace
2. **"Channel not found" error**: Verify the `SLACK_CHANNEL_ID` is correct and the bot has access to the channel
3. **API 401 errors**: The bot now includes the correct authentication headers. If you still get 401 errors, check that the `ALLIANCELS_ORGANIZATION_ID` is set correctly

### Debug Mode

Enable debug logging by setting `DEBUG=true` in your `.env` file. This will log the status of each machine on every poll.

### Logs

The bot logs important events to the console:
- When it starts up
- Each time it polls the API
- When machines finish their cycles
- When notifications are sent
- Any errors that occur

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - see LICENSE file for details. 