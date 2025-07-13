import axios from 'axios';
import { LaundryMachine, MachineStatus, RawMachineData, ParsedMachineStatus } from '../types/laundry';

export class LaundryFetcher {
  private apiUrl: string;
  private headers: Record<string, string>;

  constructor(apiUrl: string, organizationId?: string, additionalHeaders?: string) {
    this.apiUrl = apiUrl;
    this.headers = this.buildHeaders(organizationId, additionalHeaders);
  }

  /**
   * Build headers for API requests
   */
  private buildHeaders(organizationId?: string, additionalHeaders?: string): Record<string, string> {
    const headers: Record<string, string> = {
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

    // Add organization ID header if provided
    if (organizationId) {
      headers['alliancels-organization-id'] = organizationId;
    }

    // Add any additional headers from environment
    if (additionalHeaders) {
      const additionalHeadersArray = additionalHeaders.split(',');
      additionalHeadersArray.forEach(header => {
        const [key, value] = header.split('=');
        if (key && value) {
          headers[key.trim()] = value.trim();
        }
      });
    }

    return headers;
  }

  /**
   * Parse machine status from the API response
   */
  private parseMachineStatus(machine: RawMachineData): LaundryMachine | null {
    try {
      const status: ParsedMachineStatus = JSON.parse(machine.currentStatus);
      
      // Enhanced logging to help identify status flags
      console.log(`[DEBUG] Machine ${machine.machineName} (${machine.id}) raw status:`, {
        statusId: status.statusId,
        remainingSeconds: status.remainingSeconds,
        isDoorOpen: status.isDoorOpen,
        selectedCycle: status.selectedCycle?.name,
        remainingVend: status.remainingVend
      });
      
      return {
        id: machine.id,
        machineName: machine.machineName,
        machineNumber: machine.machineNumber,
        isWasher: machine.machineType.isWasher,
        isDryer: machine.machineType.isDryer,
        status: this.mapStatusId(status.statusId),
        remainingSeconds: status.remainingSeconds || 0,
        isDoorOpen: status.isDoorOpen || false,
        selectedCycle: status.selectedCycle?.name || 'Unknown',
        remainingVend: status.remainingVend
      };
    } catch (error) {
      console.error(`Error parsing status for machine ${machine.id}:`, error);
      return null;
    }
  }

  /**
   * Map API status ID to our standard enum
   */
  private mapStatusId(statusId: string): MachineStatus {
    console.log(`[DEBUG] Mapping statusId: "${statusId}" (type: ${typeof statusId})`);
    
    switch (statusId) {
      case 'AVAILABLE':
        return MachineStatus.AVAILABLE;
      case 'IN_USE':
        return MachineStatus.IN_USE;
      case 'COMPLETE': // Machine finished status
        console.log(`[DEBUG] Machine finished detected (status: ${statusId})`);
        return MachineStatus.FINISHED;
      case 'OUT_OF_ORDER':
        return MachineStatus.OUT_OF_ORDER;
      default:
        console.warn(`[WARN] Unknown statusId encountered: "${statusId}" - mapping to UNKNOWN`);
        return MachineStatus.UNKNOWN;
    }
  }

  /**
   * Fetch machine status from API
   */
  public async fetchMachines(): Promise<LaundryMachine[]> {
    try {
      const response = await axios.get<RawMachineData[]>(this.apiUrl, {
        timeout: 10000,
        headers: this.headers
      });

      if (response.status === 200 && Array.isArray(response.data)) {
        const machines: LaundryMachine[] = [];
        
        for (const rawMachine of response.data) {
          const parsedMachine = this.parseMachineStatus(rawMachine);
          if (parsedMachine) {
            machines.push(parsedMachine);
          }
        }
        
        return machines;
      } else {
        console.error('Invalid response format from API');
        return [];
      }
    } catch (error) {
      console.error('Error fetching machine status:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  /**
   * Check if a machine has finished its cycle
   */
  public static hasMachineFinished(previousState: LaundryMachine | null, currentState: LaundryMachine): boolean {
    if (!previousState) return false;
    
    // Machine is finished when:
    // 1. It goes from IN_USE to AVAILABLE
    // 2. It goes from IN_USE to FINISHED
    // 3. Current status is FINISHED (regardless of previous state)
    return (
      (previousState.status === MachineStatus.IN_USE && currentState.status === MachineStatus.AVAILABLE) ||
      (previousState.status === MachineStatus.IN_USE && currentState.status === MachineStatus.FINISHED) ||
      (currentState.status === MachineStatus.FINISHED)
    );
  }

  /**
   * Format time remaining in a human-readable format
   */
  public static formatTimeRemaining(seconds: number): string {
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
}
