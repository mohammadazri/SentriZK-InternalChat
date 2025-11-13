/**
 * Wallet Simulator for Demo Purposes
 * Simulates a MetaMask-like wallet connection with password protection
 */

import { sha3_256 } from "js-sha3";

export interface SimulatedWallet {
  address: string;
  name: string;
  balance: string;
}

// Predefined demo wallets
const DEMO_WALLETS: SimulatedWallet[] = [
  {
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
    name: "Demo Wallet 1",
    balance: "10.5 ETH"
  },
  {
    address: "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
    name: "Demo Wallet 2", 
    balance: "25.8 ETH"
  },
  {
    address: "0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359",
    name: "Demo Wallet 3",
    balance: "5.2 ETH"
  },
  {
    address: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
    name: "Personal Wallet",
    balance: "100.0 ETH"
  }
];

// Simple password store (in production, this would be encrypted in browser storage)
const DEFAULT_PASSWORD = "demo123";
const STORED_PASSWORD_KEY = "wallet_simulator_password";

export class WalletSimulator {
  private isUnlocked: boolean = false;
  private currentWallet: SimulatedWallet | null = null;

  /**
   * Initialize wallet simulator and check if already unlocked
   */
  constructor() {
    // Check if wallet was previously unlocked in this session (browser only)
    if (typeof window !== 'undefined') {
      const unlocked = sessionStorage.getItem("wallet_unlocked");
      const savedWallet = sessionStorage.getItem("wallet_current");
      
      if (unlocked === "true" && savedWallet) {
        this.isUnlocked = true;
        this.currentWallet = JSON.parse(savedWallet);
      }
    }
  }

  /**
   * Get list of available demo wallets (without connecting)
   */
  getAvailableWallets(): SimulatedWallet[] {
    return DEMO_WALLETS;
  }

  /**
   * Unlock wallet with password
   */
  async unlock(password: string): Promise<boolean> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Check password
    const storedPassword = typeof window !== 'undefined' 
      ? (localStorage.getItem(STORED_PASSWORD_KEY) || DEFAULT_PASSWORD)
      : DEFAULT_PASSWORD;
    
    if (password !== storedPassword) {
      throw new Error("Incorrect password");
    }

    this.isUnlocked = true;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem("wallet_unlocked", "true");
    }
    return true;
  }

  /**
   * Connect to a specific wallet (requires unlock first)
   */
  async connect(walletIndex: number = 0): Promise<SimulatedWallet> {
    if (!this.isUnlocked) {
      throw new Error("Wallet is locked. Please unlock first.");
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const wallet = DEMO_WALLETS[walletIndex];
    if (!wallet) {
      throw new Error("Invalid wallet index");
    }

    this.currentWallet = wallet;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem("wallet_current", JSON.stringify(wallet));
    }
    return wallet;
  }

  /**
   * Get currently connected wallet
   */
  getCurrentWallet(): SimulatedWallet | null {
    return this.currentWallet;
  }

  /**
   * Check if wallet is unlocked
   */
  isWalletUnlocked(): boolean {
    return this.isUnlocked;
  }

  /**
   * Lock wallet (disconnect)
   */
  lock(): void {
    this.isUnlocked = false;
    this.currentWallet = null;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem("wallet_unlocked");
      sessionStorage.removeItem("wallet_current");
    }
  }

  /**
   * Sign a message (simulated)
   */
  async signMessage(message: string): Promise<string> {
    if (!this.currentWallet) {
      throw new Error("No wallet connected");
    }

    // Simulate signing delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Create a fake signature
    const signature = sha3_256(this.currentWallet.address + message + Date.now());
    return `0x${signature}`;
  }

  /**
   * Set custom password (for demo purposes)
   */
  setPassword(newPassword: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORED_PASSWORD_KEY, newPassword);
    }
  }

  /**
   * Reset to default password
   */
  resetPassword(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORED_PASSWORD_KEY);
    }
  }
}

// Export singleton instance
export const walletSimulator = new WalletSimulator();

// Export default password for UI display
export { DEFAULT_PASSWORD };
