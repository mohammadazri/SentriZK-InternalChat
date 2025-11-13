"use client";

import React, { useState, useEffect } from "react";
import { sha3_256 } from "js-sha3";
import styles from "./WalletConnector.module.css";

interface WalletConnectorProps {
  onWalletConnected: (address: string) => void;
}

export default function WalletConnector({ onWalletConnected }: WalletConnectorProps) {
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Extract a device identifier (passed by mobile optionally as 'device' param)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const d = params.get('device');
    if (d) setDeviceId(d);
  }, []);

  function deterministicAddress(id: string): string {
    // Hash device id and format like an Ethereum-style address
    const h = sha3_256(id);
    return '0x' + h.slice(0, 40);
  }

  async function connectWallet() {
    setError(null);
    setIsConnecting(true);
    try {
      // Simulate delay / animation
      await new Promise(r => setTimeout(r, 1200));
      const idSource = deviceId || 'demo-device';
      const addr = deterministicAddress(idSource);
      setConnectedAddress(addr);
      onWalletConnected(addr);
    } catch (e) {
      setError('Failed to connect');
    } finally {
      setIsConnecting(false);
    }
  }

  function disconnect() {
    setConnectedAddress(null);
  }

  if (connectedAddress) {
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
            <div className={styles.walletAddress}>
              {connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}
            </div>
            <div className={styles.walletBalance}>Device bound address</div>
          </div>
        </div>
        <button onClick={disconnect} className={styles.disconnectBtn}>
          Disconnect Wallet
        </button>
      </div>
    );
  }
  return (
    <div className={styles.unlockContainer}>
      <h2 className={styles.selectionTitle}>Connect Wallet</h2>
      <p className={styles.unlockSubtitle}>Deterministic device-bound address {deviceId ? '(device detected)' : '(demo)'}.</p>
      {error && <div className={styles.error}>{error}</div>}
      <button
        onClick={connectWallet}
        disabled={isConnecting}
        className={styles.unlockBtn}
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
    </div>
  );
}
