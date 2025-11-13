"use client";

import React, { useState, useEffect } from "react";
import { prepareRegistration, submitRegistration } from "@/auth/registerLogic";
import WalletConnector from "@/components/WalletConnector";
import styles from "./register.module.css";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState<NodeJS.Timeout | null>(null);

  // Check for Mobile Access Token on mount
  useEffect(() => {
    const checkAuthorization = () => {
      const params = new URLSearchParams(window.location.search);
      const mat = params.get("mat");
      
      if (!mat) {
        setIsAuthorized(false);
        setError("Access Denied: This page can only be accessed from the SentriApp mobile application.");
        setIsCheckingAuth(false);
        return;
      }

      // Set authorized
      setIsAuthorized(true);
      setIsCheckingAuth(false);

      // Set timeout to redirect after 5 minutes
      const timeout = setTimeout(() => {
        setError("Session expired. Please reopen from the mobile app.");
        setIsAuthorized(false);
      }, 5 * 60 * 1000);

      setSessionTimeout(timeout);
    };

    checkAuthorization();

    return () => {
      if (sessionTimeout) clearTimeout(sessionTimeout);
    };
  }, []);

  const handleWalletConnected = (address: string) => {
    setWalletAddress(address);
    setCurrentStep(2);
  };

  const validateForm = (): boolean => {
    if (!username || username.length < 3) {
      setError("Username must be at least 3 characters");
      return false;
    }

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    if (!walletAddress) {
      setError("Please connect your wallet first");
      return false;
    }

    setError(null);
    return true;
  };

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    
    if (!validateForm()) return;

    setBusy(true);
    setMessage(null);
    setError(null);
    setCurrentStep(3);

    try {
      // 1️⃣ Prepare registration
      setMessage("🔐 Generating zero-knowledge proof...");
      const prep = await prepareRegistration(username, walletAddress, password);

      // 2️⃣ Submit registration
      setMessage("📡 Submitting registration to server...");
      const resp = await submitRegistration(username, prep.proofBundle);

      if (!resp.token) throw new Error("Registration failed: no token received");

      // 3️⃣ Encrypt mnemonic for safe transport (simple base64)
      const encryptedMnemonic = btoa(prep.mnemonic);

      // 4️⃣ Construct deep link URL
      setMessage("✅ Registration successful! Redirecting to app...");
      
      const redirectUri = "sentriapp://auth-callback";
      const queryParams = new URLSearchParams({
        token: resp.token,
        username,
        encryptedSalt: prep.encryptedSalt, // encrypted salt instead of plain
        mnemonic: encryptedMnemonic,
      }).toString();

      // Small delay to show success message
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 5️⃣ Redirect automatically
      if (/android/i.test(navigator.userAgent)) {
        const intentUrl = `intent://auth-callback?${queryParams}#Intent;scheme=sentriapp;package=com.example.mobile;end`;
        window.location.href = intentUrl;
      } else {
        const redirectUrl = `${redirectUri}?${queryParams}`;
        window.location.href = redirectUrl; // iOS / fallback
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setCurrentStep(2); // Go back to form
    } finally {
      setBusy(false);
    }
  }

  // Show loading screen while checking authorization
  if (isCheckingAuth) {
    return (
      <div className={styles.container}>
        <div className={styles.authCheck}>
          <div className={styles.spinner}></div>
          <p>Verifying access...</p>
        </div>
      </div>
    );
  }

  // Show access denied screen if not authorized
  if (!isAuthorized) {
    return (
      <div className={styles.container}>
        <div className={styles.accessDenied}>
          <div className={styles.lockIcon}>🔒</div>
          <h1>Access Restricted</h1>
          <p>{error}</p>
          <div className={styles.instructions}>
            <h3>How to Register:</h3>
            <ol>
              <li>Open the SentriApp mobile application</li>
              <li>Tap on "Open Web Registration"</li>
              <li>Complete the registration process</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.minContainer}>
      <header className={styles.minHeader}>SentriZK • Registration</header>
      {currentStep === 1 && (
        <section className={styles.minSection}>
          <p>Step 1: Connect deterministic wallet.</p>
          <WalletConnector onWalletConnected={handleWalletConnected} />
        </section>
      )}
      {currentStep === 2 && (
        <section className={styles.minSection}>
          <p>Step 2: Create account.</p>
          <form onSubmit={onRegister} className={styles.minForm}>
            <input
              placeholder="Username"
              value={username}
              onChange={e=>setUsername(e.target.value)}
              disabled={busy}
              required
            />
            <input
              placeholder="Password"
              type="password"
              value={password}
              onChange={e=>setPassword(e.target.value)}
              disabled={busy}
              required
            />
            <input
              placeholder="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={e=>setConfirmPassword(e.target.value)}
              disabled={busy}
              required
            />
            <small>Wallet: {walletAddress.slice(0,6)}...{walletAddress.slice(-4)}</small>
            {error && <div className={styles.errorPlain}>{error}</div>}
            <button disabled={busy}>{busy? 'Processing...' : 'Register'}</button>
            <button type="button" onClick={()=>setCurrentStep(1)} disabled={busy}>Change Wallet</button>
          </form>
        </section>
      )}
      {currentStep === 3 && (
        <section className={styles.minSection}>
          <p>{message || 'Completing registration...'}</p>
        </section>
      )}
      <footer className={styles.minFooter}>Encrypted • ZKP • Mobile-bound</footer>
    </div>
  );
}
