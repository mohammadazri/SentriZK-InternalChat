"use client";

import React, { useEffect, useState } from "react";
import { prepareLogin } from "@/auth/loginLogic";
import { decryptSaltHex } from "@/lib/saltEncryption";
import { loginUser } from "@/auth/api";
import WalletConnector from "@/components/WalletConnector";
import styles from "./login.module.css";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [encryptedSalt, setEncryptedSalt] = useState("");
  const [decryptedSaltHex, setDecryptedSaltHex] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState<NodeJS.Timeout | null>(null);

  // Check for Mobile Access Token and pre-filled data
  useEffect(() => {
    const checkAuthorization = () => {
      const params = new URLSearchParams(window.location.search);
      const mat = params.get("mat");
      const userParam = params.get("username");
      const saltParam = params.get("encryptedSalt");

      if (!mat) {
        setIsAuthorized(false);
        setError("Access Denied: This page can only be accessed from the SentriApp mobile application.");
        setIsCheckingAuth(false);
        return;
      }

      // Set authorized
      setIsAuthorized(true);
      setIsCheckingAuth(false);

      // Pre-fill username and salt from mobile
      if (userParam) setUsername(userParam);
      if (saltParam) setEncryptedSalt(saltParam);

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
    if (!encryptedSalt) {
      setError("Missing encrypted salt. Please open this page from the mobile app.");
      return false;
    }

    if (!walletAddress) {
      setError("Please connect your wallet first");
      return false;
    }

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }

    setError(null);
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setMessage(null);
    setError(null);
    setCurrentStep(3);

    try {
      // 1️⃣ Prepare login proof
      setMessage("🔐 Generating zero-knowledge proof...");
      // Decrypt salt with password first time (cache in state)
      if (!decryptedSaltHex) {
        setMessage("🔐 Decrypting salt with password...");
        const saltHex = await decryptSaltHex(encryptedSalt, password);
        setDecryptedSaltHex(saltHex);
      }
      const { proofBundle } = await prepareLogin(username, walletAddress, { saltHex: decryptedSaltHex! });

      // 2️⃣ Send proof to backend
      setMessage("📡 Authenticating with server...");
      const resp = await loginUser(username, proofBundle);

      if (!resp.token) throw new Error("Login failed: no token received");

      setMessage("✅ Login successful! Returning to the app...");

      // 3️⃣ Construct query params with session ID
      const queryParams = new URLSearchParams({
        token: resp.token,
        username,
        sessionId: resp.sessionId || "",
      }).toString();

      // Small delay to show success message
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 4️⃣ Redirect back to mobile app
      if (/android/i.test(navigator.userAgent)) {
        const intentUrl = `intent://login-success?${queryParams}#Intent;scheme=sentriapp;package=com.example.mobile;end`;
        window.location.href = intentUrl;
      } else {
        const redirectUrl = `sentriapp://login-success?${queryParams}`;
        window.location.href = redirectUrl;
      }

    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
      setCurrentStep(2); // Go back to form
    } finally {
      setLoading(false);
    }
  };

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
            <h3>How to Login:</h3>
            <ol>
              <li>Open the SentriApp mobile application</li>
              <li>Tap on "Open Web Login"</li>
              <li>Complete the login process</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.minContainer}>
      <header className={styles.minHeader}>SentriZK • Login</header>
      <div className={styles.minInfo}>User: {username || '—'}</div>
      {currentStep === 1 && (
        <section className={styles.minSection}>
          <p>Step 1: Connect wallet.</p>
          <WalletConnector onWalletConnected={handleWalletConnected} />
        </section>
      )}
      {currentStep === 2 && (
        <section className={styles.minSection}>
          <p>Step 2: Decrypt & login.</p>
          <form onSubmit={handleLogin} className={styles.minForm}>
            <small>Wallet: {walletAddress.slice(0,6)}...{walletAddress.slice(-4)}</small>
            <small>Salt: {decryptedSaltHex ? 'decrypted' : encryptedSalt ? 'encrypted' : 'missing'}</small>
            <input
              placeholder="Password"
              type="password"
              value={password}
              onChange={e=>setPassword(e.target.value)}
              disabled={loading}
              required
              autoFocus
            />
            {error && <div className={styles.errorPlain}>{error}</div>}
            <button disabled={loading}>{loading? 'Authenticating...' : 'Login'}</button>
            <button type="button" onClick={()=>setCurrentStep(1)} disabled={loading}>Change Wallet</button>
          </form>
        </section>
      )}
      {currentStep === 3 && (
        <section className={styles.minSection}>
          <p>{message || 'Completing login...'}</p>
        </section>
      )}
      <footer className={styles.minFooter}>ZKP • Encrypted • Mobile-bound</footer>
    </div>
  );
}
