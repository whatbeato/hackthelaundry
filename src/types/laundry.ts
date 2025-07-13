/**
 * Standard interface for laundry machine data
 */
export interface LaundryMachine {
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

/**
 * Machine status enum
 */
export enum MachineStatus {
  AVAILABLE = 'AVAILABLE',
  IN_USE = 'IN_USE',
  FINISHED = 'FINISHED',
  OUT_OF_ORDER = 'OUT_OF_ORDER',
  UNKNOWN = 'UNKNOWN'
}

/**
 * User claim data for machines
 */
export interface MachineClaim {
  machineId: string;
  userId: string;
  username: string;
  claimedAt: Date;
  notifiedAt3Min?: Date;
  notifiedAtComplete?: Date;
}

/**
 * User snoop data for machines
 */
export interface MachineSnoop {
  machineId: string;
  userId: string;
  username: string;
  snoopedAt: Date;
  notifiedAt3Min?: Date;
  notifiedAtComplete?: Date;
}

/**
 * Machine state change event
 */
export interface MachineStateChange {
  machine: LaundryMachine;
  previousState: LaundryMachine | null;
  isFinished: boolean;
}

/**
 * Raw API response interface (for the current API)
 */
export interface RawMachineData {
  id: string;
  machineName: string;
  machineNumber: string;
  machineType: {
    isWasher: boolean;
    isDryer: boolean;
  };
  currentStatus: string; // JSON string that needs to be parsed
}

/**
 * Parsed status from the API response
 */
export interface ParsedMachineStatus {
  statusId: string;
  remainingSeconds: number;
  isDoorOpen: boolean;
  selectedCycle?: {
    name: string;
  };
  remainingVend?: number;
}
