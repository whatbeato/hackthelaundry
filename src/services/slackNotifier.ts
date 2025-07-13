import { App } from '@slack/bolt';
import { LaundryMachine, MachineStateChange, MachineClaim, MachineSnoop } from '../types/laundry';
import { UserTrackingService } from './userTrackingService';

export class SlackNotifier {
  private app: App;
  private channelId: string;
  private userTrackingService: UserTrackingService;
  
  // GIF URLs for different wash stages
  private readonly gifs: {
    washing: string;
    drying: string;
    finished: string;
    available: string;
    outOfOrder: string;
  };

  constructor(
    botToken: string, 
    signingSecret: string, 
    appToken: string, 
    channelId: string,
    gifs: {
      washing: string;
      drying: string;
      finished: string;
      available: string;
      outOfOrder: string;
    }
  ) {
    this.app = new App({
      token: botToken,
      signingSecret: signingSecret,
      socketMode: true,
      appToken: appToken,
    });
    this.channelId = channelId;
    this.gifs = gifs;
    this.userTrackingService = new UserTrackingService();
    
    this.setupInteractions();
  }

  /**
   * Start the Slack app
   */
  public async start(): Promise<void> {
    await this.app.start();
    console.log('⚡️ Slack bot is running!');
  }

  /**
   * Stop the Slack app
   */
  public async stop(): Promise<void> {
    await this.app.stop();
  }

  /**
   * Send notification to Slack channel when a machine finishes
   */
  public async sendFinishedNotification(machine: LaundryMachine): Promise<void> {
    const machineType = machine.isWasher ? 'washer' : 'dryer';
    const cycleName = machine.selectedCycle || 'Unknown cycle';
    
    const message = {
      channel: this.channelId,
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
      await this.app.client.chat.postMessage(message);
      console.log(`Notification sent for ${machine.machineName}`);
    } catch (error) {
      console.error('Error sending Slack notification:', error);
    }
  }

  /**
   * Send a general status update to Slack with interactive UI
   */
  public async sendStatusUpdate(machines: LaundryMachine[]): Promise<void> {
    if (machines.length === 0) {
      return;
    }

    const blocks = this.buildInteractiveStatusBlocks(machines);
    
    const message = {
      channel: this.channelId,
      text: '🧺 Laundry Status Update',
      blocks: blocks
    };

    try {
      await this.app.client.chat.postMessage(message);
      console.log('Interactive status update sent to Slack');
    } catch (error) {
      console.error('Error sending status update:', error);
    }
  }

  /**
   * Build status text for machines
   */
  private buildStatusText(washers: LaundryMachine[], dryers: LaundryMachine[]): string {
    let statusText = '';

    if (washers.length > 0) {
      statusText += '*Washers:*\n';
      washers.forEach(washer => {
        const status = this.getStatusEmoji(washer.status);
        statusText += `• ${washer.machineName}: ${status}\n`;
      });
      statusText += '\n';
    }

    if (dryers.length > 0) {
      statusText += '*Dryers:*\n';
      dryers.forEach(dryer => {
        const status = this.getStatusEmoji(dryer.status);
        statusText += `• ${dryer.machineName}: ${status}\n`;
      });
    }

    return statusText;
  }

  /**
   * Get status emoji and text for a machine status
   */
  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'AVAILABLE':
        return '✅ Available';
      case 'IN_USE':
        return '🔄 In Use';
      case 'FINISHED':
        return '🎉 Finished';
      case 'OUT_OF_ORDER':
        return '❌ Out of Order';
      default:
        return '❓ Unknown';
    }
  }

  /**
   * Get appropriate GIF URL for machine status
   */
  private getGifForStatus(machine: LaundryMachine): string {
    switch (machine.status) {
      case 'IN_USE':
        return machine.isWasher ? this.gifs.washing : this.gifs.drying;
      case 'FINISHED':
        return this.gifs.finished;
      case 'AVAILABLE':
        return this.gifs.available;
      case 'OUT_OF_ORDER':
        return this.gifs.outOfOrder;
      default:
        return this.gifs.available; // Default fallback
    }
  }

  /**
   * Setup interactive button handlers
   */
  private setupInteractions(): void {
    // Handle claim button clicks
    this.app.action(/^claim_machine_(.+)$/, async ({ body, ack, client }) => {
      await ack();
      
      if ('actions' in body && body.actions && body.actions.length > 0) {
        const action = body.actions[0];
        if ('action_id' in action) {
          const machineId = action.action_id.replace('claim_machine_', '');
          const userId = body.user.id;
          const username = ('username' in body.user ? body.user.username : 
                           'name' in body.user ? body.user.name : 'Unknown') || 'Unknown';
          
          const success = this.userTrackingService.claimMachine(machineId, userId, username);
          
          if (success) {
            await client.chat.postMessage({
              channel: this.channelId,
              text: `Machine ${machineId} claimed by <@${userId}>`
            });
            
            // Update the status message
            await this.updateInteractiveStatusMessage();
          } else {
            await client.chat.postMessage({
              channel: this.channelId,
              text: `Machine ${machineId} is already claimed!`
            });
          }
        }
      }
    });

    // Handle snoop button clicks
    this.app.action(/^snoop_machine_(.+)$/, async ({ body, ack, client }) => {
      await ack();
      
      if ('actions' in body && body.actions && body.actions.length > 0) {
        const action = body.actions[0];
        if ('action_id' in action) {
          const machineId = action.action_id.replace('snoop_machine_', '');
          const userId = body.user.id;
          const username = ('username' in body.user ? body.user.username : 
                           'name' in body.user ? body.user.name : 'Unknown') || 'Unknown';
          
          const success = this.userTrackingService.addSnoop(machineId, userId, username);
          
          if (success) {
            await client.chat.postMessage({
              channel: this.channelId,
              text: `<@${userId}> will be notified when machine ${machineId} is done`
            });
          } else {
            await client.chat.postMessage({
              channel: this.channelId,
              text: `<@${userId}> is already snooping machine ${machineId}!`
            });
          }
        }
      }
    });
  }

  /**
   * Update the interactive status message with current machine states
   */
  private async updateInteractiveStatusMessage(): Promise<void> {
    // This will be implemented when we have access to current machine states
    // For now, we'll just log that an update was requested
    console.log('Interactive status message update requested');
  }

  /**
   * Build interactive status blocks with GIFs and action buttons
   */
  private buildInteractiveStatusBlocks(machines: LaundryMachine[]): any[] {
    const blocks: any[] = [];
    
    const washers = machines.filter(m => m.isWasher);
    const dryers = machines.filter(m => m.isDryer);
    
    // Add Dryers section
    if (dryers.length > 0) {
      blocks.push({
        type: "header",
        text: {
          type: "plain_text",
          text: "🌪️ Dryers",
          emoji: true
        }
      });
      
      dryers.forEach((dryer, index) => {
        const statusText = this.getStatusText(dryer);
        const gifUrl = this.getGifForStatus(dryer);
        const claim = this.userTrackingService.getClaim(dryer.id);
        
        // Machine info section with GIF
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `${dryer.machineNumber} *${statusText}*${claim ? ` (claimed by <@${claim.userId}>)` : ''}`
          },
          accessory: {
            type: "image",
            image_url: gifUrl,
            alt_text: `${dryer.machineName} ${statusText}`
          }
        });
        
        // Action buttons (only show for available or in-use machines)
        if (dryer.status === 'AVAILABLE' || dryer.status === 'IN_USE') {
          const actionElements: any[] = [];
          
          if (!claim && dryer.status === 'IN_USE') {
            actionElements.push({
              type: "button",
              text: {
                type: "plain_text",
                text: "🔖 Claim load",
                emoji: true
              },
              value: dryer.id,
              action_id: `claim_${dryer.id}`
            });
          }
          
          actionElements.push({
            type: "button",
            text: {
              type: "plain_text",
              text: "👀 Snoop (notified when done)",
              emoji: true
            },
            value: dryer.id,
            action_id: `snoop_${dryer.id}`
          });
          
          if (actionElements.length > 0) {
            blocks.push({
              type: "actions",
              elements: actionElements
            });
          }
        }
        
        // Add divider between machines (except for last one)
        if (index < dryers.length - 1) {
          blocks.push({ type: "divider" });
        }
      });
    }
    
    // Add section divider between dryers and washers
    if (dryers.length > 0 && washers.length > 0) {
      blocks.push({ type: "divider" });
    }
    
    // Add Washers section
    if (washers.length > 0) {
      blocks.push({
        type: "header",
        text: {
          type: "plain_text",
          text: "🧺 Washers",
          emoji: true
        }
      });
      
      washers.forEach((washer, index) => {
        const statusText = this.getStatusText(washer);
        const gifUrl = this.getGifForStatus(washer);
        const claim = this.userTrackingService.getClaim(washer.id);
        
        // Machine info section with GIF
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `${washer.machineNumber} *${statusText}*${claim ? ` (claimed by <@${claim.userId}>)` : ''}`
          },
          accessory: {
            type: "image",
            image_url: gifUrl,
            alt_text: `${washer.machineName} ${statusText}`
          }
        });
        
        // Action buttons (only show for available or in-use machines)
        if (washer.status === 'AVAILABLE' || washer.status === 'IN_USE') {
          const actionElements: any[] = [];
          
          if (!claim && washer.status === 'IN_USE') {
            actionElements.push({
              type: "button",
              text: {
                type: "plain_text",
                text: "🔖 Claim load",
                emoji: true
              },
              value: washer.id,
              action_id: `claim_${washer.id}`
            });
          }
          
          actionElements.push({
            type: "button",
            text: {
              type: "plain_text",
              text: "👀 Snoop (notified when done)",
              emoji: true
            },
            value: washer.id,
            action_id: `snoop_${washer.id}`
          });
          
          if (actionElements.length > 0) {
            blocks.push({
              type: "actions",
              elements: actionElements
            });
          }
        }
        
        // Add divider between machines (except for last one)
        if (index < washers.length - 1) {
          blocks.push({ type: "divider" });
        }
      });
    }
    
    return blocks;
  }

  /**
   * Get status text for a machine
   */
  private getStatusText(machine: LaundryMachine): string {
    switch (machine.status) {
      case 'IN_USE':
        return machine.isWasher ? 'WASHING' : 'DRYING';
      case 'FINISHED':
        return 'FINISHED';
      case 'AVAILABLE':
        return 'AVAILABLE';
      case 'OUT_OF_ORDER':
        return 'OUT OF ORDER';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Get the user tracking service for external access
   */
  public getUserTrackingService(): UserTrackingService {
    return this.userTrackingService;
  }
}
