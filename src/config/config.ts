import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface AppConfig {
  slack: {
    botToken: string;
    signingSecret: string;
    appToken: string;
    channelId: string;
  };
  api: {
    url: string;
    organizationId?: string;
    additionalHeaders?: string;
  };
  polling: {
    interval: number;
  };
  gifs: {
    washing: string;
    drying: string;
    finished: string;
    available: string;
    outOfOrder: string;
  };
  debug: boolean;
}

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): AppConfig {
  const requiredEnvVars = [
    'SLACK_BOT_TOKEN',
    'SLACK_SIGNING_SECRET',
    'SLACK_APP_TOKEN',
    'SLACK_CHANNEL_ID',
    'WASHING_MACHINE_API_URL'
  ];

  // Check for required environment variables
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return {
    slack: {
      botToken: process.env.SLACK_BOT_TOKEN!,
      signingSecret: process.env.SLACK_SIGNING_SECRET!,
      appToken: process.env.SLACK_APP_TOKEN!,
      channelId: process.env.SLACK_CHANNEL_ID!,
    },
    api: {
      url: process.env.WASHING_MACHINE_API_URL!,
      organizationId: process.env.ALLIANCELS_ORGANIZATION_ID,
      additionalHeaders: process.env.API_ADDITIONAL_HEADERS,
    },
    polling: {
      interval: parseInt(process.env.POLLING_INTERVAL || '30000', 10),
    },
    gifs: {
      washing: process.env.GIF_WASHING || "https://hc-cdn.hel1.your-objectstorage.com/s/v3/8e368a0fc47167a3742c9caca26471f41bba14bd_washing_machine.gif",
      drying: process.env.GIF_DRYING || "https://hc-cdn.hel1.your-objectstorage.com/s/v3/1b14cb3416c0cb85ff7806a8483e0f4f86cf0c15_drying.gif",
      finished: process.env.GIF_FINISHED || "https://hc-cdn.hel1.your-objectstorage.com/s/v3/1225ec70e9c678f7a72a6eab419682c5ffe3bf09_laundrydone.gif",
      available: process.env.GIF_AVAILABLE || "https://hc-cdn.hel1.your-objectstorage.com/s/v3/91561a6f89701c9845ee3af28becff637b6461b7_openmachine.jpg",
      outOfOrder: process.env.GIF_OUT_OF_ORDER || "https://www.setra.com/hubfs/Sajni/crc_error.jpg"
    },
    debug: process.env.DEBUG === 'true',
  };
}
