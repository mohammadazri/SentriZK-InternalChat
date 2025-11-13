"use client";

import React, { useState, useEffect } from "react";
import { prepareRegistration, submitRegistration } from "@/auth/registerLogic";
import WalletConnector from "@/components/WalletConnector";
import styles from "./register.module.css";
import type { ProofBundle } from "@/lib/zkp";

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
        salt: prep.envelope.saltHex,
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
    <div className={styles.container}>
      <div className={styles.registerCard}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>🔐</div>
            <h1>SentriZK</h1>
          </div>
          <p className={styles.subtitle}>Zero-Knowledge Proof Authentication</p>
        </div>

        {/* Progress Steps */}
        <div className={styles.progressSteps}>
          <div className={`${styles.step} ${currentStep >= 1 ? styles.active : ""}`}>
            <div className={styles.stepNumber}>1</div>
            <span>Connect Wallet</span>
          </div>
          <div className={styles.stepLine}></div>
          <div className={`${styles.step} ${currentStep >= 2 ? styles.active : ""}`}>
            <div className={styles.stepNumber}>2</div>
            <span>Create Account</span>
          </div>
          <div className={styles.stepLine}></div>
          <div className={`${styles.step} ${currentStep >= 3 ? styles.active : ""}`}>
            <div className={styles.stepNumber}>3</div>
            <span>Complete</span>
          </div>
        </div>

        {/* Step 1: Wallet Connection */}
        {currentStep === 1 && (
          <div className={styles.stepContent}>
            <h2>Connect Your Wallet</h2>
            <p className={styles.stepDescription}>
              Connect your wallet to begin the registration process. This simulates a MetaMask-like wallet connection.
            </p>
            <WalletConnector onWalletConnected={handleWalletConnected} />
          </div>
        )}

        {/* Step 2: Registration Form */}
        {currentStep === 2 && (
          <div className={styles.stepContent}>
            <h2>Create Your Account</h2>
            <p className={styles.stepDescription}>
              Choose a username and password. Your credentials will be encrypted and secured.
            </p>

            <form onSubmit={onRegister} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className={styles.input}
                  required
                  disabled={busy}
                />
                <span className={styles.inputHint}>Minimum 3 characters</span>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className={styles.input}
                  required
                  disabled={busy}
                />
                <span className={styles.inputHint}>Minimum 8 characters</span>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className={styles.input}
                  required
                  disabled={busy}
                />
              </div>

              <div className={styles.walletInfo}>
                <span>🔗 Connected Wallet:</span>
                <code>{walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}</code>
              </div>

              {error && (
                <div className={styles.error}>
                  <span>⚠️</span> {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={busy}
                className={styles.submitButton}
              >
                {busy ? (
                  <>
                    <span className={styles.buttonSpinner}></span>
                    Processing...
                  </>
                ) : (
                  "Create Account"
                )}
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                disabled={busy}
                className={styles.backButton}
              >
                ← Change Wallet
              </button>
            </form>
          </div>
        )}

        {/* Step 3: Processing */}
        {currentStep === 3 && (
          <div className={styles.stepContent}>
            <div className={styles.processing}>
              <div className={styles.processingSpinner}></div>
              <h2>Creating Your Account</h2>
              {message && <p className={styles.processingMessage}>{message}</p>}
              <div className={styles.securityBadges}>
                <div className={styles.badge}>
                  <span>🔒</span>
                  <span>End-to-End Encrypted</span>
                </div>
                <div className={styles.badge}>
                  <span>🛡️</span>
                  <span>Zero-Knowledge Proof</span>
                </div>
                <div className={styles.badge}>
                  <span>🔐</span>
                  <span>Secure Wallet Integration</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className={styles.footer}>
          <p>🔒 Your data is encrypted and secured with zero-knowledge proofs</p>
          <p className={styles.securityNote}>
            This page is only accessible from the mobile app and will timeout after 5 minutes
          </p>
        </div>
      </div>
    </div>
  );
}
