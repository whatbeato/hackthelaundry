# Washing Machine Slack Bot

A TypeScript-based Slack bot that monitors washing machine status and sends notifications when loads are done.

## 🏗️ Architecture

This project is refactored into a clean, modular TypeScript architecture with two main sections:

### 1. Laundry Fetcher API (`src/services/laundryFetcher.ts`)
- Handles API communication with the washing machine service
- Provides standardized data format through TypeScript interfaces
- Includes error handling and data parsing
- Utility functions for time formatting and state detection

### 2. Slack Bot Notifier (`src/services/slackNotifier.ts`)
- Manages Slack API integration
- Sends formatted notifications when machines finish
- Provides status update functionality
- Clean separation from data fetching logic

### 3. Machine Monitor (`src/services/machineMonitor.ts`)
- Orchestrates the entire monitoring process
- Handles polling intervals and state management
- Coordinates between the laundry fetcher and Slack notifier

## 📁 Project Structure

```
src/
├── types/
│   └── laundry.ts          # TypeScript interfaces for laundry data
├── services/
│   ├── laundryFetcher.ts   # API communication and data parsing
│   ├── slackNotifier.ts    # Slack bot functionality
│   └── machineMonitor.ts   # Main orchestration service
├── config/
│   └── config.ts           # Configuration management
├── index.ts                # Main entry point
└── lib.ts                  # Public API exports
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm (or npm)
- Slack Bot credentials
- Washing machine API access

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Copy the environment file and configure:
   ```bash
   cp env.example .env
   ```

4. Build the project:
   ```bash
   pnpm run build
   ```

5. Start the bot:
   ```bash
   pnpm start
   ```

### Development

For development with auto-restart:
```bash
pnpm run dev
```

For development with watch mode (faster rebuilds):
```bash
pnpm run dev:watch
```

## ⚙️ Configuration

Configure the following environment variables in your `.env` file:

### Slack Configuration
- `SLACK_BOT_TOKEN` - Bot User OAuth Token
- `SLACK_SIGNING_SECRET` - Signing Secret
- `SLACK_APP_TOKEN` - App-Level Token
- `SLACK_CHANNEL_ID` - Channel to send notifications

### API Configuration
- `WASHING_MACHINE_API_URL` - Washing machine API endpoint
- `ALLIANCELS_ORGANIZATION_ID` - Organization ID header (optional)
- `API_ADDITIONAL_HEADERS` - Additional headers (optional)

### Monitoring Configuration
- `POLLING_INTERVAL` - Polling interval in milliseconds (default: 30000)
- `DEBUG` - Enable debug logging (true/false)

### GIF Configuration (Optional)
- `GIF_WASHING` - GIF URL for washing machines in use
- `GIF_DRYING` - GIF URL for dryers in use  
- `GIF_FINISHED` - GIF URL for finished machines
- `GIF_AVAILABLE` - GIF URL for available machines
- `GIF_OUT_OF_ORDER` - GIF URL for broken machines

## 🔧 API Interface

The project uses standardized TypeScript interfaces:

```typescript
interface LaundryMachine {
  id: string;
  machineName: string;
  machineNumber: string;
  isWasher: boolean;
  isDryer: boolean;
  status: MachineStatus;
  remainingSeconds: number;
  isDoorOpen: boolean;
  selectedCycle: string;
  remainingVend?: number;
}

enum MachineStatus {
  AVAILABLE = 'AVAILABLE',
  IN_USE = 'IN_USE',
  OUT_OF_ORDER = 'OUT_OF_ORDER',
  UNKNOWN = 'UNKNOWN'
}
```

## 📦 Available Scripts

- `pnpm build` - Compile TypeScript to JavaScript
- `pnpm start` - Start the production bot
- `pnpm dev` - Start development mode with nodemon
- `pnpm dev:watch` - Start development with TypeScript watch mode

## 🧪 Features

- **Type Safety**: Full TypeScript implementation with strict type checking
- **Modular Architecture**: Clean separation of concerns
- **Error Handling**: Comprehensive error handling throughout
- **Configurable**: Environment-based configuration
- **Debug Mode**: Optional debug logging
- **Graceful Shutdown**: Proper cleanup on exit

## 🏢 Usage as a Library

You can also use this project as a library in other TypeScript projects:

```typescript
import { LaundryFetcher, SlackNotifier, MachineMonitor } from './src/lib';

// Create your own monitoring setup
const fetcher = new LaundryFetcher(apiUrl, orgId);
const notifier = new SlackNotifier(token, secret, appToken, channelId);
const monitor = new MachineMonitor(fetcher, notifier, 30000, false);

await monitor.start();
```

> Note: This was originally vibecoded, but has now been properly refactored! :)
