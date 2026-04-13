"use client";

import React, { useState, useEffect } from "react";
import { recoverSaltFromMnemonic, walletSecretFromAddress } from "@/lib/secureCrypto";
import { encryptSaltHex } from "@/lib/saltEncryption";
import { prepareLogin } from "@/auth/loginLogic";
import { loginUser } from "@/auth/api";
import WalletConnector from "@/components/WalletConnector";
import PasswordStrengthChecklist from "@/components/PasswordStrengthChecklist";
import styles from "../register/register.module.css";
import { Lock, Wallet, KeyRound, Check, AlertCircle, Shield, Hexagon, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function RecoverPage() {
  const [username, setUsername] = useState("");
  const [mnemonic, setMnemonic] = useState("");
  const [bip39Passphrase, setBip39Passphrase] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [saltHex, setSaltHex] = useState("");
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

      const usedKey = `mat_used_${mat}`;
      if (sessionStorage.getItem(usedKey)) {
        setIsAuthorized(false);
        setError("This link has already been used. Please request a new link from the mobile app.");
        setIsCheckingAuth(false);
        return;
      }

      setIsAuthorized(true);
      setIsCheckingAuth(false);

      const timeout = setTimeout(() => {
        setError("Session expired. Please reopen from the mobile app.");
        setIsAuthorized(false);
      }, 5 * 60 * 1000);

      setSessionTimeout(timeout);
    };

    checkAuthorization();

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
      handleBeforeUnload();
    };
  }, [isAuthorized]);

  // Step 1: Derive salt from mnemonic
  async function onDeriveSalt(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (!username.trim()) throw new Error("Username is required");
      const words = mnemonic.trim().split(/\s+/);
      if (words.length < 12) throw new Error("Please enter a valid 12 or 24-word recovery phrase");

      setMessage("Deriving credentials from recovery phrase...");
      const derived = await recoverSaltFromMnemonic(mnemonic.trim(), bip39Passphrase.trim());
      setSaltHex(derived);
      setCurrentStep(2); // Move to wallet step
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      setMessage(null);
    }
  }

  const handleWalletConnected = (address: string) => {
    setWalletAddress(address);
    setCurrentStep(3); // Move to password step
  };

  // Step 3: Set password + login
  async function onRecoverAndLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      setError("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setBusy(true);
    setCurrentStep(4);

    try {
      // 1️⃣ Encrypt salt for future normal logins
      setMessage("Encrypting salt for secure storage...");
      const encryptedSalt = await encryptSaltHex(saltHex, password);

      // 2️⃣ Generate ZKP proof and login
      setMessage("Generating zero-knowledge proof...");
      const { proofBundle } = await prepareLogin(username, walletAddress, { saltHex });

      // 3️⃣ Submit login to backend
      setMessage("Authenticating with server...");
      const resp = await loginUser(username, proofBundle);
      if (!resp.token) throw new Error("Login failed: no token received");

      // 4️⃣ Mark MAT as used
      const params = new URLSearchParams(window.location.search);
      const mat = params.get("mat");
      if (mat) {
        sessionStorage.setItem(`mat_used_${mat}`, "true");
      }

      // 5️⃣ Redirect back to mobile app (same as registration)
      setMessage("Recovery successful! Redirecting to app...");

      const queryParams = new URLSearchParams({
        token: resp.token,
        username,
        encryptedSalt,
        sessionId: resp.sessionId || "",
      }).toString();

      await new Promise(resolve => setTimeout(resolve, 1500));

      if (/android/i.test(navigator.userAgent)) {
        const intentUrl = `intent://auth-callback?${queryParams}#Intent;scheme=sentriapp;package=com.example.mobile;end`;
        window.location.href = intentUrl;
      } else {
        const redirectUrl = `sentriapp://auth-callback?${queryParams}`;
        window.location.href = redirectUrl;
      }

      setTimeout(() => {
        window.close();
        if (!window.closed) {
          document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center;"><div><h2>✅ Recovery Complete</h2><p>You can now close this tab and return to the app.</p></div></div>';
        }
      }, 500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setCurrentStep(3);
    } finally {
      setBusy(false);
    }
  }

  // Loading screen
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

  // Access denied screen
  if (!isAuthorized) {
    return (
      <div className={styles.container}>
        <ThemeToggle />
        <div className={styles.accessDenied}>
          <Lock className={styles.lockIcon} color="#94a3b8" />
          <h1>Access Restricted</h1>
          <p>{error}</p>
          <div className={styles.instructions}>
            <h3>How to Recover:</h3>
            <ol>
              <li>Open the SentriApp mobile application</li>
              <li>Tap on &quot;Sign In&quot;</li>
              <li>Complete the recovery process</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  const stepLabels = ["Recovery", "Wallet", "Password", "Complete"];
  const totalSteps = 4;

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
              <p className={styles.brandTagline}>Account Recovery</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className={styles.progress}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${(currentStep / totalSteps) * 100}%` }}></div>
          </div>
          <div className={styles.progressSteps}>
            {stepLabels.map((label, i) => {
              const step = i + 1;
              return (
                <div key={label} className={`${styles.progressStep} ${currentStep >= step ? styles.active : ''} ${currentStep > step ? styles.complete : ''}`}>
                  <div className={styles.stepCircle}>
                    {currentStep > step ? <Check size={20} /> : String(step)}
                  </div>
                  <span>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 1: Mnemonic + Username */}
        {currentStep === 1 && (
          <div className={styles.content}>
            <div className={styles.stepTitle}>
              <h2>Enter Recovery Phrase</h2>
              <p>Use the 24-word phrase you saved during registration</p>
            </div>

            <form onSubmit={onDeriveSalt} className={styles.form}>
              <div className={styles.inputGroup}>
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className={styles.input}
                  disabled={busy}
                  required
                  autoFocus
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="mnemonic">Recovery Phrase</label>
                <textarea
                  id="mnemonic"
                  value={mnemonic}
                  onChange={(e) => setMnemonic(e.target.value)}
                  placeholder="Enter your 24-word recovery phrase, separated by spaces"
                  className={styles.input}
                  disabled={busy}
                  rows={3}
                  style={{ resize: "vertical", fontFamily: "monospace" }}
                />
                <span className={styles.hint}>Separate words with single spaces</span>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="passphrase">BIP-39 Passphrase (optional)</label>
                <input
                  id="passphrase"
                  type="text"
                  value={bip39Passphrase}
                  onChange={(e) => setBip39Passphrase(e.target.value)}
                  placeholder="Leave blank if none"
                  className={styles.input}
                  disabled={busy}
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
                      Deriving Salt...
                    </>
                  ) : (
                    <>
                      Derive Salt & Continue
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M7 10H13M13 10L10 7M13 10L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 2: Wallet Connection */}
        {currentStep === 2 && (
          <div className={styles.content}>
            <div className={styles.stepTitle}>
              <h2>Connect Your Wallet</h2>
              <p>Use the same device wallet you registered with</p>
            </div>

            <div className={styles.walletBadge} style={{ marginBottom: 16 }}>
              <KeyRound size={20} color="#10b981" />
              <span>Salt recovered ✅ — {saltHex.slice(0, 8)}…{saltHex.slice(-4)}</span>
            </div>

            <WalletConnector onWalletConnected={handleWalletConnected} />

            <div className={styles.actions} style={{ marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={styles.secondaryBtn}
              >
                <ArrowLeft size={16} /> Back
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Password */}
        {currentStep === 3 && (
          <div className={styles.content}>
            <div className={styles.stepTitle}>
              <h2>Set Your Password</h2>
              <p>This password encrypts your salt for future logins on this device</p>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              <div className={styles.walletBadge}>
                <KeyRound size={16} color="#10b981" />
                <span>Salt ✅</span>
              </div>
              <div className={styles.walletBadge}>
                <Wallet size={16} color="#38bdf8" />
                <span>{walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}</span>
              </div>
            </div>

            <form onSubmit={onRecoverAndLogin} className={styles.form}>
              <div className={styles.inputGroup}>
                <label htmlFor="password">Password</label>
                <div className={styles.inputWrapper}>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className={styles.input}
                    disabled={busy}
                    required
                    minLength={8}
                    autoFocus
                  />
                  <button
                    type="button"
                    className={styles.eyeIcon}
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <PasswordStrengthChecklist password={password} />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className={styles.inputWrapper}>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className={styles.input}
                    disabled={busy}
                    required
                  />
                  <button
                    type="button"
                    className={styles.eyeIcon}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
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
                      Recover & Login
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M7 10H13M13 10L10 7M13 10L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  disabled={busy}
                  className={styles.secondaryBtn}
                >
                  <ArrowLeft size={16} /> Change Wallet
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 4: Processing */}
        {currentStep === 4 && (
          <div className={styles.content}>
            <div className={styles.processing}>
              <div className={styles.processingIcon}>
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="30" stroke="url(#grad2)" strokeWidth="4" strokeDasharray="188" strokeDashoffset="0" className={styles.processingCircle} />
                  <defs>
                    <linearGradient id="grad2" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#10b981" />
                      <stop offset="1" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h2>Recovering Account</h2>
              <p className={styles.processingMessage}>{message || 'Processing...'}</p>
              <div className={styles.securityIndicators}>
                <div className={styles.indicator}>
                  <KeyRound size={24} className={styles.indicatorIcon} />
                  <span>Encrypting Salt</span>
                </div>
                <div className={styles.indicator}>
                  <Shield size={24} className={styles.indicatorIcon} />
                  <span>Generating Proof</span>
                </div>
                <div className={styles.indicator}>
                  <Check size={24} className={styles.indicatorIcon} />
                  <span>Authenticating</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={styles.footer}>
          <div className={styles.securityBadges}>
            <span><Lock size={14} /> Recovery Phrase</span>
            <span><Shield size={14} /> Zero-Knowledge</span>
            <span><Hexagon size={14} /> Node Validated</span>
          </div>
        </div>
      </div>
    </div>
  );
}
