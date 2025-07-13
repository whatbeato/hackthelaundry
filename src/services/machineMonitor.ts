import { LaundryMachine, MachineStateChange } from '../types/laundry';
import { LaundryFetcher } from './laundryFetcher';
import { SlackNotifier } from './slackNotifier';

export class MachineMonitor {
  private laundryFetcher: LaundryFetcher;
  private slackNotifier: SlackNotifier;
  private previousMachineStates: Map<string, LaundryMachine>;
  private pollingInterval: number;
  private isDebugMode: boolean;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    laundryFetcher: LaundryFetcher,
    slackNotifier: SlackNotifier,
    pollingInterval: number = 30000,
    isDebugMode: boolean = false
  ) {
    this.laundryFetcher = laundryFetcher;
    this.slackNotifier = slackNotifier;
    this.previousMachineStates = new Map();
    this.pollingInterval = pollingInterval;
    this.isDebugMode = isDebugMode;
  }

  /**
   * Start monitoring machines
   */
  public async start(): Promise<void> {
    console.log('Starting machine monitor...');
    
    // Start the Slack bot
    await this.slackNotifier.start();
    
    // Start polling immediately
    await this.pollMachines();
    
    // Send initial status update to Slack
    console.log('Sending initial status update to Slack...');
    await this.sendStatusUpdate();
    
    // Set up periodic polling
    this.intervalId = setInterval(() => {
      this.pollMachines();
    }, this.pollingInterval);
    
    console.log(`Polling every ${this.pollingInterval / 1000} seconds`);
  }

  /**
   * Stop monitoring machines
   */
  public async stop(): Promise<void> {
    console.log('Stopping machine monitor...');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    await this.slackNotifier.stop();
  }

  /**
   * Poll machines for status updates
   */
  private async pollMachines(): Promise<void> {
    console.log('Polling washing machine status...');
    
    const machines = await this.laundryFetcher.fetchMachines();
    const currentStates = new Map<string, LaundryMachine>();
    const stateChanges: MachineStateChange[] = [];

    for (const machine of machines) {
      currentStates.set(machine.id, machine);
      
      const previousState = this.previousMachineStates.get(machine.id) || null;
      const isFinished = LaundryFetcher.hasMachineFinished(previousState, machine);
      
      // Create state change event
      const stateChange: MachineStateChange = {
        machine,
        previousState,
        isFinished
      };
      
      stateChanges.push(stateChange);
      
      // Check if machine has finished and send notification
      if (isFinished) {
        console.log(`🎉 Machine ${machine.machineNumber} has finished! Status: ${previousState?.status} → ${machine.status}`);
        await this.slackNotifier.sendFinishedNotification(machine);
      }
      
      // Log current status for debugging
      if (this.isDebugMode) {
        const timeRemaining = LaundryFetcher.formatTimeRemaining(machine.remainingSeconds);
        console.log(`[DEBUG] ${machine.machineNumber}: ${machine.status} (${timeRemaining} remaining)`);
      }
    }

    // Update previous states
    this.previousMachineStates = currentStates;
  }

  /**
   * Get current machine states
   */
  public getCurrentStates(): LaundryMachine[] {
    return Array.from(this.previousMachineStates.values());
  }

  /**
   * Send status update manually
   */
  public async sendStatusUpdate(): Promise<void> {
    const machines = this.getCurrentStates();
    await this.slackNotifier.sendStatusUpdateWithMachines(machines);
  }
}
