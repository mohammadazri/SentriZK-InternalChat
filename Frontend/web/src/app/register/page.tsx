"use client";

import React, { useState, useEffect } from "react";
import { prepareRegistration, submitRegistration } from "@/auth/registerLogic";
import WalletConnector from "@/components/WalletConnector";
import styles from "./register.module.css";
import { Lock, Wallet, KeyRound, Check, AlertCircle, LayoutDashboard, Database, Shield, Hexagon, ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

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

      // Check if this MAT has already been used
      const usedKey = `mat_used_${mat}`;
      if (sessionStorage.getItem(usedKey)) {
        setIsAuthorized(false);
        setError("This link has already been used. Please request a new link from the mobile app.");
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

    // Mark MAT as used when user navigates away or closes tab
    const handleBeforeUnload = () => {
      const params = new URLSearchParams(window.location.search);
      const mat = params.get("mat");
      if (mat && isAuthorized) {
        sessionStorage.setItem(`mat_used_${mat}`, "true");
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (sessionTimeout) clearTimeout(sessionTimeout);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Mark as used on cleanup
      handleBeforeUnload();
    };
  }, [isAuthorized]);

  const handleWalletConnected = (address: string) => {
    setWalletAddress(address);
    setCurrentStep(2);
  };

  const validateForm = (): boolean => {
    // Lowercase alphanumeric and underscores only, 3-20 chars, no spaces
    const usernameRegex = /^[a-z0-9_]{3,20}$/;

    if (!username || !usernameRegex.test(username)) {
      setError("Username must be 3-20 characters and contain only lowercase letters, numbers, and underscores (no spaces).");
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
      // 0️⃣ Check username availability first
      setMessage("Checking username availability...");
      const { checkUsername } = await import('@/auth/api');
      const available = await checkUsername(username);

      if (!available) {
        setError(`Username "${username}" is already taken. Please choose another.`);
        setBusy(false);
        setCurrentStep(2);
        return;
      }

      // 1️⃣ Prepare registration
      setMessage("Generating zero-knowledge proof...");
      const prep = await prepareRegistration(username, walletAddress, password);

      // 2️⃣ Submit registration
      setMessage("Submitting registration to server...");
      const resp = await submitRegistration(username, prep.proofBundle);

      if (!resp.token) throw new Error("Registration failed: no token received");

      // 3️⃣ Encrypt mnemonic for safe transport (simple base64)
      const encryptedMnemonic = btoa(prep.mnemonic);

      // 4️⃣ Mark MAT as used to prevent reuse
      const params = new URLSearchParams(window.location.search);
      const mat = params.get("mat");
      if (mat) {
        sessionStorage.setItem(`mat_used_${mat}`, "true");
      }

      // 5️⃣ Construct deep link URL
      setMessage("Registration successful! Redirecting to app...");

      const redirectUri = "sentriapp://auth-callback";
      const queryParams = new URLSearchParams({
        token: resp.token,
        username,
        encryptedSalt: prep.encryptedSalt, // encrypted salt instead of plain
        mnemonic: encryptedMnemonic,
      }).toString();

      // Small delay to show success message
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 6️⃣ Redirect automatically
      if (/android/i.test(navigator.userAgent)) {
        const intentUrl = `intent://auth-callback?${queryParams}#Intent;scheme=sentriapp;package=com.example.mobile;end`;
        window.location.href = intentUrl;
      } else {
        const redirectUrl = `${redirectUri}?${queryParams}`;
        window.location.href = redirectUrl; // iOS / fallback
      }

      // 7️⃣ Close the tab after redirect attempt
      setTimeout(() => {
        window.close();
        // Fallback: if window.close() doesn't work, replace with blank page
        if (!window.closed) {
          document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center;"><div><h2>✅ Registration Complete</h2><p>You can now close this tab and return to the app.</p></div></div>';
        }
      }, 500)
    } catch (err: any) {
      let errMsg = err instanceof Error ? err.message : String(err);
      if (err.response?.data?.error) {
        errMsg = err.response.data.error;
      }
      setError(errMsg);
      setCurrentStep(2); // Go back to form
    } finally {
      setBusy(false);
    }
  }

  // Show loading screen while checking authorization
  if (isCheckingAuth) {
    return (
      <div className={styles.container}>
        <ThemeToggle />
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
        <ThemeToggle />
        <div className={styles.accessDenied}>
          <Lock className={styles.lockIcon} color="#94a3b8" />
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
      <ThemeToggle />
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.brandLogo}>
            <div className={styles.logoGradient} style={{ background: "transparent", padding: 0 }}>
              <img src="/logo.png" alt="SentriZK Logo" style={{ width: 48, height: 48, objectFit: "contain" }} />
            </div>
            <div>
              <h1 className={styles.brandName}>SentriZK</h1>
              <p className={styles.brandTagline}>Zero-Knowledge Authentication</p>
            </div>
          </div>
        </div>

        <div className={styles.progress}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${(currentStep / 3) * 100}%` }}></div>
          </div>
          <div className={styles.progressSteps}>
            <div className={`${styles.progressStep} ${currentStep >= 1 ? styles.active : ''} ${currentStep > 1 ? styles.complete : ''}`}>
              <div className={styles.stepCircle}>
                {currentStep > 1 ? <Check size={20} /> : '1'}
              </div>
              <span>Connect</span>
            </div>
            <div className={`${styles.progressStep} ${currentStep >= 2 ? styles.active : ''} ${currentStep > 2 ? styles.complete : ''}`}>
              <div className={styles.stepCircle}>
                {currentStep > 2 ? <Check size={20} /> : '2'}
              </div>
              <span>Register</span>
            </div>
            <div className={`${styles.progressStep} ${currentStep >= 3 ? styles.active : ''}`}>
              <div className={styles.stepCircle}>3</div>
              <span>Complete</span>
            </div>
          </div>
        </div>

        {currentStep === 1 && (
          <div className={styles.content}>
            <div className={styles.stepTitle}>
              <h2>Connect Your Wallet</h2>
              <p>Your device will generate a unique deterministic wallet address</p>
            </div>
            <WalletConnector onWalletConnected={handleWalletConnected} />
          </div>
        )}

        {currentStep === 2 && (
          <div className={styles.content}>
            <div className={styles.stepTitle}>
              <h2>Create Your Account</h2>
              <p>Secure your identity with zero-knowledge proof encryption</p>
            </div>

            <div className={styles.walletBadge}>
              <Wallet size={20} color="#38bdf8" />
              <span>Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
            </div>

            <form onSubmit={onRegister} className={styles.form}>
              <div className={styles.inputGroup}>
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="Enter your username"
                  className={styles.input}
                  disabled={busy}
                  required
                  minLength={3}
                />
                <span className={styles.hint}>Minimum 3 characters</span>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className={styles.input}
                  disabled={busy}
                  required
                  minLength={8}
                />
                <span className={styles.hint}>Minimum 8 characters</span>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className={styles.input}
                  disabled={busy}
                  required
                />
              </div>

              {error && (
                <div className={styles.error}>
                  <AlertCircle size={20} />
                  {error}
                </div>
              )}

              <div className={styles.actions}>
                <button type="submit" disabled={busy} className={styles.primaryBtn}>
                  {busy ? (
                    <>
                      <span className={styles.spinner}></span>
                      Processing...
                    </>
                  ) : (
                    <>
                      Create Account
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M7 10H13M13 10L10 7M13 10L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  disabled={busy}
                  className={styles.secondaryBtn}
                >
                  <ArrowLeft size={16} /> Change Wallet
                </button>
              </div>
            </form>
          </div>
        )}

        {currentStep === 3 && (
          <div className={styles.content}>
            <div className={styles.processing}>
              <div className={styles.processingIcon}>
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="30" stroke="url(#grad2)" strokeWidth="4" strokeDasharray="188" strokeDashoffset="0" className={styles.processingCircle} />
                  <defs>
                    <linearGradient id="grad2" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#6366f1" />
                      <stop offset="1" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h2>Creating Your Account</h2>
              <p className={styles.processingMessage}>{message || 'Processing...'}</p>
              <div className={styles.securityIndicators}>
                <div className={styles.indicator}>
                  <KeyRound size={24} className={styles.indicatorIcon} />
                  <span>Generating ZK Proof</span>
                </div>
                <div className={styles.indicator}>
                  <Lock size={24} className={styles.indicatorIcon} />
                  <span>Encrypting Credentials</span>
                </div>
                <div className={styles.indicator}>
                  <Check size={24} className={styles.indicatorIcon} />
                  <span>Finalizing Registration</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={styles.footer}>
          <div className={styles.securityBadges}>
            <span><Lock size={14} /> End-to-End Encrypted</span>
            <span><Shield size={14} /> Zero-Knowledge</span>
            <span><Hexagon size={14} /> Mobile Protected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
