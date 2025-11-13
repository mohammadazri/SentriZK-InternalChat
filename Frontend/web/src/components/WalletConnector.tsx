"use client";

import React, { useState, useEffect } from "react";
import { walletSimulator, DEFAULT_PASSWORD, SimulatedWallet } from "@/lib/walletSimulator";
import styles from "./WalletConnector.module.css";

interface WalletConnectorProps {
  onWalletConnected: (address: string) => void;
}

export default function WalletConnector({ onWalletConnected }: WalletConnectorProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [selectedWalletIndex, setSelectedWalletIndex] = useState(0);
  const [connectedWallet, setConnectedWallet] = useState<SimulatedWallet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const wallets = walletSimulator.getAvailableWallets();

  useEffect(() => {
    // Check if already unlocked
    const unlocked = walletSimulator.isWalletUnlocked();
    const current = walletSimulator.getCurrentWallet();
    
    setIsUnlocked(unlocked);
    setConnectedWallet(current);
    
    if (current) {
      onWalletConnected(current.address);
    }
  }, [onWalletConnected]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await walletSimulator.unlock(password);
      setIsUnlocked(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlock wallet");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const wallet = await walletSimulator.connect(selectedWalletIndex);
      setConnectedWallet(wallet);
      onWalletConnected(wallet.address);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    walletSimulator.lock();
    setIsUnlocked(false);
    setConnectedWallet(null);
    setPassword("");
  };

  // If wallet is connected, show connected state
  if (connectedWallet) {
    return (
      <div className={styles.connectedContainer}>
        <div className={styles.connectedHeader}>
          <div className={styles.walletIcon}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#4CAF50"/>
              <path d="M22 16C22 15.4477 21.5523 15 21 15H11C10.4477 15 10 15.4477 10 16V20C10 20.5523 10.4477 21 11 21H21C21.5523 21 22 20.5523 22 20V16Z" fill="white"/>
              <circle cx="19" cy="18" r="1" fill="#4CAF50"/>
            </svg>
          </div>
          <div className={styles.connectedInfo}>
            <div className={styles.connectedLabel}>Connected Wallet</div>
            <div className={styles.walletName}>{connectedWallet.name}</div>
            <div className={styles.walletAddress}>
              {connectedWallet.address.slice(0, 6)}...{connectedWallet.address.slice(-4)}
            </div>
            <div className={styles.walletBalance}>{connectedWallet.balance}</div>
          </div>
        </div>
        <button onClick={handleDisconnect} className={styles.disconnectBtn}>
          Disconnect Wallet
        </button>
      </div>
    );
  }

  // If unlocked but not connected, show wallet selection
  if (isUnlocked) {
    return (
      <div className={styles.selectionContainer}>
        <h3 className={styles.selectionTitle}>Select a Wallet</h3>
        <div className={styles.walletList}>
          {wallets.map((wallet, index) => (
            <div
              key={wallet.address}
              className={`${styles.walletItem} ${selectedWalletIndex === index ? styles.selected : ""}`}
              onClick={() => setSelectedWalletIndex(index)}
            >
              <div className={styles.walletItemIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect width="24" height="24" rx="6" fill={selectedWalletIndex === index ? "#2196F3" : "#757575"}/>
                  <path d="M16 12C16 11.4477 15.5523 11 15 11H9C8.44772 11 8 11.4477 8 12V15C8 15.5523 8.44772 16 9 16H15C15.5523 16 16 15.5523 16 15V12Z" fill="white"/>
                </svg>
              </div>
              <div className={styles.walletItemInfo}>
                <div className={styles.walletItemName}>{wallet.name}</div>
                <div className={styles.walletItemAddress}>
                  {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                </div>
                <div className={styles.walletItemBalance}>{wallet.balance}</div>
              </div>
              {selectedWalletIndex === index && (
                <div className={styles.checkmark}>✓</div>
              )}
            </div>
          ))}
        </div>
        {error && <div className={styles.error}>{error}</div>}
        <button 
          onClick={handleConnect} 
          disabled={isLoading}
          className={styles.connectBtn}
        >
          {isLoading ? "Connecting..." : "Connect Selected Wallet"}
        </button>
        <button onClick={handleDisconnect} className={styles.backBtn}>
          ← Back to Unlock
        </button>
      </div>
    );
  }

  // Show unlock screen
  return (
    <div className={styles.unlockContainer}>
      <div className={styles.unlockHeader}>
        <div className={styles.lockIcon}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="24" fill="#2196F3" fillOpacity="0.1"/>
            <path d="M30 22H18C16.8954 22 16 22.8954 16 24V32C16 33.1046 16.8954 34 18 34H30C31.1046 34 32 33.1046 32 32V24C32 22.8954 31.1046 22 30 22Z" stroke="#2196F3" strokeWidth="2"/>
            <path d="M20 22V18C20 15.7909 21.7909 14 24 14C26.2091 14 28 15.7909 28 18V22" stroke="#2196F3" strokeWidth="2"/>
            <circle cx="24" cy="28" r="2" fill="#2196F3"/>
          </svg>
        </div>
        <h2 className={styles.unlockTitle}>Unlock Your Wallet</h2>
        <p className={styles.unlockSubtitle}>
          Enter your password to access demo wallets
        </p>
      </div>

      <form onSubmit={handleUnlock} className={styles.unlockForm}>
        <div className={styles.inputGroup}>
          <label htmlFor="password" className={styles.label}>
            Password
          </label>
          <div className={styles.passwordInput}>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter wallet password"
              className={styles.input}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={styles.showPasswordBtn}
            >
              {showPassword ? "👁️" : "👁️‍🗨️"}
            </button>
          </div>
          <div className={styles.hint}>
            💡 Demo password: <code>{DEFAULT_PASSWORD}</code>
          </div>
        </div>

        {error && (
          <div className={styles.error}>
            <span>⚠️</span> {error}
          </div>
        )}

        <button 
          type="submit" 
          disabled={isLoading || !password}
          className={styles.unlockBtn}
        >
          {isLoading ? (
            <>
              <span className={styles.spinner}></span>
              Unlocking...
            </>
          ) : (
            "Unlock Wallet"
          )}
        </button>
      </form>

      <div className={styles.securityNote}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 1L3 3V7C3 10.3 5.4 13.1 8 14C10.6 13.1 13 10.3 13 7V3L8 1Z" stroke="#757575" strokeWidth="1.5"/>
        </svg>
        <span>Your wallet is simulated for demo purposes only</span>
      </div>
    </div>
  );
}
