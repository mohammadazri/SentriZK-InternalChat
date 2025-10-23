import { generateRecoveryPhrase, recoverSaltFromMnemonic, walletSecretFromAddress } from "../lib/secureCrypto";
import { generateProof, ProofBundle } from "../lib/zkp";
import { registerUser } from "./api";
import { sha3_256 } from "js-sha3";

export interface PreparedRegistration {
  mnemonic: string;          // 24 words
  envelope: { saltHex: string }; // store securely in mobile storage
  proofBundle: ProofBundle;
  commitment: string;
  publicSignals: string[];
}

function normalizeUsername(uname: string) {
  return uname.trim().toLowerCase();
}

function unameHashToDecimal(username: string): string {
  const canonical = normalizeUsername(username);
  const h = sha3_256(canonical);
  return BigInt("0x" + h).toString();
}

export async function prepareRegistration(username: string, walletAddress: string, password: string): Promise<PreparedRegistration> {
  if (!username || !walletAddress || !password) throw new Error("username, walletAddress, password required");

  // 1) Generate mnemonic
  const mnemonic = generateRecoveryPhrase();

  // 2) Derive salt
  const saltHex = await recoverSaltFromMnemonic(mnemonic);
  const saltDecimal = BigInt('0x' + saltHex).toString();

  // 3) Wallet secret
  const secretHex = walletSecretFromAddress(walletAddress);
  const secretDecimal = BigInt('0x' + secretHex).toString();

  // 4) Envelope (store securely on mobile)
  const envelope = { saltHex }; 

  // 5) Public input
  const unameHashDecimal = unameHashToDecimal(username);

  // 6) Generate ZKP
  const input = { secret: secretDecimal, salt: saltDecimal, unameHash: unameHashDecimal };
  const proofBundle = await generateProof(input, "registration");

  // 7) Commitment
  const commitment = String(proofBundle.publicSignals[0]);

  return { mnemonic, envelope, proofBundle, publicSignals: proofBundle.publicSignals, commitment };
}

/**
 * Submit registration to server — server returns { token } for mobile session
 */
export async function submitRegistration(username: string, proofBundle: ProofBundle) {
  if (!username || !proofBundle) throw new Error("username and proofBundle required");
  return registerUser(username, proofBundle);
}
