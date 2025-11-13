"use client";

import React, { useEffect, useState } from "react";
import { prepareLogin } from "@/auth/loginLogic";
import { loginUser } from "@/auth/api";
import WalletConnector from "@/components/WalletConnector";
import styles from "./login.module.css";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [saltHex, setSaltHex] = useState("");
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
      const saltParam = params.get("salt");

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
      if (saltParam) setSaltHex(saltParam);

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
    if (!saltHex) {
      setError("Missing salt. Please open this page from the mobile app.");
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
      const { proofBundle } = await prepareLogin(username, walletAddress, { saltHex });

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
    <div className={styles.container}>
      <div className={styles.loginCard}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>🔓</div>
            <h1>SentriZK</h1>
          </div>
          <p className={styles.subtitle}>Secure Login with Zero-Knowledge Proof</p>
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
            <span>Enter Password</span>
          </div>
          <div className={styles.stepLine}></div>
          <div className={`${styles.step} ${currentStep >= 3 ? styles.active : ""}`}>
            <div className={styles.stepNumber}>3</div>
            <span>Complete</span>
          </div>
        </div>

        {/* User Info */}
        <div className={styles.userInfo}>
          <div className={styles.userInfoItem}>
            <span className={styles.userInfoLabel}>Username:</span>
            <span className={styles.userInfoValue}>{username || "Not provided"}</span>
          </div>
        </div>

        {/* Step 1: Wallet Connection */}
        {currentStep === 1 && (
          <div className={styles.stepContent}>
            <h2>Connect Your Wallet</h2>
            <p className={styles.stepDescription}>
              Connect the same wallet you used during registration to verify your identity.
            </p>
            <WalletConnector onWalletConnected={handleWalletConnected} />
          </div>
        )}

        {/* Step 2: Password Entry */}
        {currentStep === 2 && (
          <div className={styles.stepContent}>
            <h2>Enter Your Password</h2>
            <p className={styles.stepDescription}>
              Enter your password to decrypt your credentials and complete the login.
            </p>

            <form onSubmit={handleLogin} className={styles.form}>
              <div className={styles.walletInfo}>
                <span>🔗 Connected Wallet:</span>
                <code>{walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}</code>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={styles.input}
                  required
                  disabled={loading}
                  autoFocus
                />
                <span className={styles.inputHint}>Enter the password you created during registration</span>
              </div>

              {error && (
                <div className={styles.error}>
                  <span>⚠️</span> {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className={styles.submitButton}
              >
                {loading ? (
                  <>
                    <span className={styles.buttonSpinner}></span>
                    Authenticating...
                  </>
                ) : (
                  "Login"
                )}
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                disabled={loading}
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
              <h2>Logging You In</h2>
              {message && <p className={styles.processingMessage}>{message}</p>}
              <div className={styles.securityBadges}>
                <div className={styles.badge}>
                  <span>🔒</span>
                  <span>Secure Authentication</span>
                </div>
                <div className={styles.badge}>
                  <span>🛡️</span>
                  <span>Zero-Knowledge Proof</span>
                </div>
                <div className={styles.badge}>
                  <span>⏰</span>
                  <span>30-Minute Session</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className={styles.footer}>
          <p>🔒 Your credentials are secured with zero-knowledge proofs</p>
          <p className={styles.securityNote}>
            This page is only accessible from the mobile app and will timeout after 5 minutes
          </p>
        </div>
      </div>
    </div>
  );
}
