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
      <div className={styles.container}>
        <div className={styles.connectedCard}>
          <div className={styles.checkmark}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#10b981"/>
              <path d="M9 12L11 14L15 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className={styles.connectedInfo}>
            <span className={styles.connectedLabel}>Wallet Connected</span>
            <span className={styles.connectedAddress}>
              {connectedAddress.slice(0, 6)}•••{connectedAddress.slice(-6)}
            </span>
            <span className={styles.connectedType}>Deterministic • Device-Bound</span>
          </div>
        </div>
        <button onClick={disconnect} className={styles.disconnectBtn}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 7L7 13M7 7L13 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.connectCard}>
        <div className={styles.walletIcon}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect x="8" y="12" width="32" height="24" rx="4" fill="url(#walletGrad)" stroke="#e2e8f0" strokeWidth="2"/>
            <rect x="12" y="20" width="12" height="8" rx="2" fill="white"/>
            <circle cx="30" cy="24" r="2" fill="white"/>
            <defs>
              <linearGradient id="walletGrad" x1="8" y1="12" x2="40" y2="36" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1"/>
                <stop offset="1" stopColor="#8b5cf6"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h3>Device Wallet</h3>
        <p>Your device will generate a unique deterministic address based on this device ID</p>
        {deviceId && (
          <div className={styles.deviceBadge}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect width="16" height="16" rx="3" fill="#10b981"/>
              <path d="M11 5L7 9L5 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Device Detected</span>
          </div>
        )}
      </div>
      {error && (
        <div className={styles.error}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2"/>
            <path d="M10 6V11M10 14V14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          {error}
        </div>
      )}
      <button
        onClick={connectWallet}
        disabled={isConnecting}
        className={styles.connectBtn}
      >
        {isConnecting ? (
          <>
            <span className={styles.spinner}></span>
            Connecting...
          </>
        ) : (
          <>
            Connect Wallet
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7 10H13M13 10L10 7M13 10L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </>
        )}
      </button>
    </div>
  );
}
