import { loadConfig } from './config/config';
import { LaundryFetcher } from './services/laundryFetcher';
import { SlackNotifier } from './services/slackNotifier';
import { MachineMonitor } from './services/machineMonitor';

async function main(): Promise<void> {
  try {
    // Load configuration
    const config = loadConfig();
    console.log('Configuration loaded successfully');

    // Initialize services
    const laundryFetcher = new LaundryFetcher(
      config.api.url,
      config.api.organizationId,
      config.api.additionalHeaders
    );

    const slackNotifier = new SlackNotifier(
      config.slack.botToken,
      config.slack.signingSecret,
      config.slack.appToken,
      config.slack.channelId,
      config.gifs
    );

    const machineMonitor = new MachineMonitor(
      laundryFetcher,
      slackNotifier,
      config.polling.interval,
      config.debug
    );

    // Handle graceful shutdown
    const shutdown = async () => {
      console.log('Shutting down...');
      await machineMonitor.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Start monitoring
    await machineMonitor.start();
    console.log('🚀 Washing Machine Monitor is running!');

  } catch (error) {
    console.error('Error starting application:', error);
    process.exit(1);
  }
}

// Start the application
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
