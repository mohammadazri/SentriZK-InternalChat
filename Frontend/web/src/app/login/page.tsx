"use client";

import React, { useEffect, useState } from "react";
import { prepareLogin } from "@/auth/loginLogic";
import { decryptSaltHex } from "@/lib/saltEncryption";
import { loginUser } from "@/auth/api";
import WalletConnector from "@/components/WalletConnector";
import styles from "./login.module.css";
import { Lock, Wallet, KeyRound, Check, AlertCircle, LayoutDashboard, Database, Shield, Hexagon } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

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

      // Pre-fill username and salt from mobile
      if (userParam) setUsername(userParam);
      if (saltParam) setEncryptedSalt(saltParam);

      // Check if plaintext salt was provided (recovery flow)
      const directSalt = params.get("saltHex");
      if (directSalt) {
        setDecryptedSaltHex(directSalt);
      }

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
    // If we already have the decrypted salt (recovery flow), skip salt/password checks
    if (decryptedSaltHex) {
      if (!walletAddress) {
        setError("Please connect your wallet first");
        return false;
      }
      setError(null);
      return true;
    }

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

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      // Pre-validation: skip checks for recovery flow (salt already derived)
      if (!decryptedSaltHex) {
        if (!encryptedSalt) {
          setError("Missing encrypted salt. Please open this page from the mobile app.");
          setLoading(false);
          return;
        }
        if (!password || password.length < 8) {
          setError("Password must be at least 8 characters");
          setLoading(false);
          return;
        }
      }

      if (!walletAddress) {
        setError("Please connect your wallet first");
        setLoading(false);
        return;
      }

      setCurrentStep(3);

      // 1️⃣ Prepare login proof
      let saltHex = decryptedSaltHex;
      if (!saltHex) {
        // Normal flow: decrypt from encrypted salt
        setMessage("Decrypting salt and generating proof...");
        saltHex = await decryptSaltHex(encryptedSalt, password);
        setDecryptedSaltHex(saltHex);
      } else {
        // Recovery flow: salt already derived from mnemonic
        setMessage("Generating zero-knowledge proof...");
      }

      const { proofBundle } = await prepareLogin(username, walletAddress, { saltHex });

      // 2️⃣ Send proof to backend
      setMessage("Authenticating with server...");
      const resp = await loginUser(username, proofBundle);

      if (!resp.token) throw new Error("Login failed: no token received");

      setMessage("Login successful! Returning to the app...");

      // 3️⃣ Mark MAT as used to prevent reuse
      const params = new URLSearchParams(window.location.search);
      const mat = params.get("mat");
      if (mat) {
        sessionStorage.setItem(`mat_used_${mat}`, "true");
      }

      // 4️⃣ Construct query params with session ID
      const queryParams = new URLSearchParams({
        token: resp.token,
        username,
        sessionId: resp.sessionId || "",
      }).toString();

      // Small delay to show success message
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 5️⃣ Redirect back to mobile app
      if (/android/i.test(navigator.userAgent)) {
        const intentUrl = `intent://login-success?${queryParams}#Intent;scheme=sentriapp;package=com.example.mobile;end`;
        window.location.href = intentUrl;
      } else {
        const redirectUrl = `sentriapp://login-success?${queryParams}`;
        window.location.href = redirectUrl;
      }

      // 6️⃣ Close the tab after redirect attempt
      setTimeout(() => {
        window.close();
        // Fallback: if window.close() doesn't work, replace with blank page
        if (!window.closed) {
          document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center;"><div><h2>✅ Login Complete</h2><p>You can now close this tab and return to the app.</p></div></div>';
        }
      }, 500)

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
            <h3>How to Login:</h3>
            <ol>
              <li>Open the SentriApp mobile application</li>
              <li>Tap on &quot;Open Web Login&quot;</li>
              <li>Complete the login process</li>
            </ol>
          </div>
          <div style={{ marginTop: 16, opacity: 0.9 }}>
            <p>If you're trying to sign in from a different device without the mobile app:</p>
            <ul style={{ lineHeight: 1.7 }}>
              <li>
                Use <a href="/forgot-password" style={{ color: '#93c5fd' }}>Forgot Password</a> to derive your salt from the recovery phrase
              </li>
              <li>
                Then go to <a href="/signin" style={{ color: '#93c5fd' }}>Sign In</a> to authenticate with your wallet
              </li>
            </ul>
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
              <p className={styles.brandTagline}>Secure Login Portal</p>
            </div>
          </div>
        </div>

        {username && (
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>
              {username.charAt(0).toUpperCase()}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userLabel}>Logging in as</span>
              <span className={styles.userName}>{username.toLowerCase()}</span>
            </div>
          </div>
        )}

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
              <span>Authenticate</span>
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
              <p>Use the same device wallet you registered with</p>
            </div>
            <WalletConnector onWalletConnected={handleWalletConnected} />
          </div>
        )}

        {currentStep === 2 && (
          <div className={styles.content}>
            <div className={styles.stepTitle}>
              <h2>{decryptedSaltHex ? 'Ready to Authenticate' : 'Enter Your Password'}</h2>
              <p>{decryptedSaltHex ? 'Your credentials were recovered. Just click Login to continue.' : 'Decrypt your credentials to complete authentication'}</p>
            </div>

            <div className={styles.statusCards}>
              <div className={styles.statusCard}>
                <Wallet size={20} color="#38bdf8" />
                <div>
                  <span className={styles.statusLabel}>Wallet</span>
                  <span className={styles.statusValue}>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                </div>
              </div>
              <div className={styles.statusCard}>
                <KeyRound size={20} color={decryptedSaltHex ? '#10b981' : '#f59e0b'} />
                <div>
                  <span className={styles.statusLabel}>Salt Status</span>
                  <span className={styles.statusValue}>
                    {decryptedSaltHex ? '✅ Recovered' : encryptedSalt ? 'Encrypted' : 'Missing'}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleLogin} className={styles.form}>
              {!decryptedSaltHex && (
                <div className={styles.inputGroup}>
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className={styles.input}
                    disabled={loading}
                    required
                    autoFocus
                  />
                  <span className={styles.hint}>Used to decrypt your salt locally</span>
                </div>
              )}

              {error && (
                <div className={styles.error}>
                  <AlertCircle size={20} />
                  {error}
                </div>
              )}

              <div className={styles.actions}>
                <button type="submit" disabled={loading} className={styles.primaryBtn}>
                  {loading ? (
                    <>
                      <span className={styles.spinner}></span>
                      Authenticating...
                    </>
                  ) : (
                    <>
                      Login Securely
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M7 10H13M13 10L10 7M13 10L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  disabled={loading}
                  className={styles.secondaryBtn}
                >
                  ← Change Wallet
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
                      <stop stopColor="#10b981" />
                      <stop offset="1" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h2>Authenticating</h2>
              <p className={styles.processingMessage}>{message || 'Verifying credentials...'}</p>
              <div className={styles.securityIndicators}>
                <div className={styles.indicator}>
                  <KeyRound size={24} className={styles.indicatorIcon} />
                  <span>Decrypting Salt</span>
                </div>
                <div className={styles.indicator}>
                  <Database size={24} className={styles.indicatorIcon} />
                  <span>Generating Proof</span>
                </div>
                <div className={styles.indicator}>
                  <LayoutDashboard size={24} className={styles.indicatorIcon} />
                  <span>Validating Session</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={styles.footer}>
          <div className={styles.securityBadges}>
            <span><Lock size={14} /> Password Protected</span>
            <span><Shield size={14} /> Zero-Knowledge</span>
            <span><Hexagon size={14} /> Node Validated</span>
          </div>
        </div>
      </div>
    </div>
  );
}
