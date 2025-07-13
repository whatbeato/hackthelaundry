import { MachineClaim, MachineSnoop } from '../types/laundry';

export class UserTrackingService {
  private claims: Map<string, MachineClaim> = new Map(); // machineId -> claim
  private snoops: Map<string, MachineSnoop[]> = new Map(); // machineId -> array of snoops

  /**
   * Claim a machine for a user
   */
  public claimMachine(machineId: string, userId: string, username: string): boolean {
    if (this.claims.has(machineId)) {
      return false; // Already claimed
    }

    const claim: MachineClaim = {
      machineId,
      userId,
      username,
      claimedAt: new Date()
    };

    this.claims.set(machineId, claim);
    console.log(`Machine ${machineId} claimed by ${username} (${userId})`);
    return true;
  }

  /**
   * Remove claim from a machine
   */
  public removeClaim(machineId: string): MachineClaim | null {
    const claim = this.claims.get(machineId);
    if (claim) {
      this.claims.delete(machineId);
      console.log(`Claim removed from machine ${machineId}`);
    }
    return claim || null;
  }

  /**
   * Get claim for a machine
   */
  public getClaim(machineId: string): MachineClaim | null {
    return this.claims.get(machineId) || null;
  }

  /**
   * Add a snoop for a machine
   */
  public addSnoop(machineId: string, userId: string, username: string): boolean {
    if (!this.snoops.has(machineId)) {
      this.snoops.set(machineId, []);
    }

    const existingSnoops = this.snoops.get(machineId)!;
    
    // Check if user already snooping this machine
    if (existingSnoops.some(snoop => snoop.userId === userId)) {
      return false; // Already snooping
    }

    const snoop: MachineSnoop = {
      machineId,
      userId,
      username,
      snoopedAt: new Date()
    };

    existingSnoops.push(snoop);
    console.log(`User ${username} (${userId}) added snoop to machine ${machineId}`);
    return true;
  }

  /**
   * Remove snoop from a machine
   */
  public removeSnoop(machineId: string, userId: string): boolean {
    const snoops = this.snoops.get(machineId);
    if (!snoops) return false;

    const index = snoops.findIndex(snoop => snoop.userId === userId);
    if (index === -1) return false;

    snoops.splice(index, 1);
    console.log(`Snoop removed from machine ${machineId} for user ${userId}`);
    
    // Clean up empty arrays
    if (snoops.length === 0) {
      this.snoops.delete(machineId);
    }
    
    return true;
  }

  /**
   * Get all snoops for a machine
   */
  public getSnoops(machineId: string): MachineSnoop[] {
    return this.snoops.get(machineId) || [];
  }

  /**
   * Clear all data for a machine (when it becomes available)
   */
  public clearMachine(machineId: string): void {
    this.claims.delete(machineId);
    this.snoops.delete(machineId);
    console.log(`Cleared all user data for machine ${machineId}`);
  }

  /**
   * Get all claims
   */
  public getAllClaims(): MachineClaim[] {
    return Array.from(this.claims.values());
  }

  /**
   * Get all snoops
   */
  public getAllSnoops(): MachineSnoop[] {
    const allSnoops: MachineSnoop[] = [];
    for (const snoops of this.snoops.values()) {
      allSnoops.push(...snoops);
    }
    return allSnoops;
  }

  /**
   * Mark 3-minute notification as sent for a claim
   */
  public markClaim3MinNotified(machineId: string): void {
    const claim = this.claims.get(machineId);
    if (claim) {
      claim.notifiedAt3Min = new Date();
    }
  }

  /**
   * Mark completion notification as sent for a claim
   */
  public markClaimCompleteNotified(machineId: string): void {
    const claim = this.claims.get(machineId);
    if (claim) {
      claim.notifiedAtComplete = new Date();
    }
  }

  /**
   * Mark 3-minute notification as sent for snoops
   */
  public markSnoops3MinNotified(machineId: string): void {
    const snoops = this.snoops.get(machineId);
    if (snoops) {
      snoops.forEach(snoop => {
        snoop.notifiedAt3Min = new Date();
      });
    }
  }

  /**
   * Mark completion notification as sent for snoops
   */
  public markSnoopsCompleteNotified(machineId: string): void {
    const snoops = this.snoops.get(machineId);
    if (snoops) {
      snoops.forEach(snoop => {
        snoop.notifiedAtComplete = new Date();
      });
    }
  }
}
