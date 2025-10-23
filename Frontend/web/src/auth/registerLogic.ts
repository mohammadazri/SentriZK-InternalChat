// File: src/auth/registerLogic.ts
/*
  Client-side registration logic for ZKP-based registration.
  - Generates mnemonic
  - Derives salt from mnemonic
  - Derives wallet secret from address
  - Encrypts salt (envelope) with password
  - Generates ZKP proof using your existing zkp.generateProof (snarkjs)

  Exports:
    prepareRegistration(username, walletAddress, password)
      -> returns { mnemonic, envelopeJson, proofBundle, publicSignals, commitment }

    submitRegistration(username, proofBundle)
      -> calls backend /register via your existing auth api (registerUser)

  Notes:
    - This file expects `secureCrypto`, `zkp` and `auth/api` modules to be present and match the APIs you shared.
    - The unameHash public input is computed using sha3_256(username_normalized) and passed as a decimal string.
*/

import { generateRecoveryPhrase, recoverSaltFromMnemonic, walletSecretFromAddress, encryptEnvelope } from "../lib/secureCrypto";
import { generateProof, ProofBundle } from "../lib/zkp";
import { registerUser } from "./api";
import { sha3_256 } from "js-sha3";

export interface PreparedRegistration {
  mnemonic: string; // 24 words
  envelopeJson: string; // encrypted envelope (stringified JSON) user downloads
  proofBundle: ProofBundle; // { proof, publicSignals }
  commitment: string; // publicSignals[0]
  publicSignals: string[];
}

function normalizeUsername(uname: string) {
  return uname.trim().toLowerCase();
}

function unameHashToDecimal(username: string): string {
  // Use sha3_256 of canonicalized username, convert to bigint decimal string.
  // This must match whatever canonicalization you intend on-chain/server-side.
  const canonical = normalizeUsername(username);
  const h = sha3_256(canonical); // 64 hex chars (32 bytes)
  // convert hex to BigInt decimal string
  return BigInt('0x' + h).toString();
}

export async function prepareRegistration(username: string, walletAddress: string, password: string): Promise<PreparedRegistration> {
  if (!username) throw new Error("username required");
  if (!walletAddress) throw new Error("wallet address required");
  if (!password) throw new Error("password required");

  // 1) Generate mnemonic
  const mnemonic = generateRecoveryPhrase();

  // 2) Derive salt from mnemonic (hex string)
  const saltHex = await recoverSaltFromMnemonic(mnemonic);
  // saltHex is lowercase hex without 0x. Circuit expects numeric <= 2^128-1
  const saltDecimal = BigInt('0x' + saltHex).toString();

  // 3) Derive secret from wallet address
  const secretHex = walletSecretFromAddress(walletAddress); // 64 hex chars
  const secretDecimal = BigInt('0x' + secretHex).toString();

  // 4) Create encrypted envelope (salt-only) using password
  const envelopeJson = await encryptEnvelope(saltHex, password);

  // 5) Compute unameHash (public input)
  const unameHashDecimal = unameHashToDecimal(username);

  // 6) Prepare inputs for the registration circuit
  const input = {
    secret: secretDecimal,
    salt: saltDecimal,
    unameHash: unameHashDecimal,
  } as Record<string, string>;

  // 7) Generate proof using your registration circuit
  const proofBundle = await generateProof(input, "registration");

  // commit is expected to be publicSignals[0]
  const commitment = String(proofBundle.publicSignals[0]);

  return {
    mnemonic,
    envelopeJson,
    proofBundle,
    publicSignals: proofBundle.publicSignals,
    commitment,
  };
}

export async function submitRegistration(username: string, proofBundle: ProofBundle) {
  if (!username) throw new Error("username required");
  if (!proofBundle) throw new Error("proof bundle required");

  // call your API wrapper
  return registerUser(username, proofBundle);
}

