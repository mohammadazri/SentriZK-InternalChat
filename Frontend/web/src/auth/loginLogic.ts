import { walletSecretFromAddress } from "../lib/secureCrypto";
import { generateProof } from "../lib/zkp";
import { getCommitment } from "./api";
import { sha3_256 } from "js-sha3";

function normalizeUsername(uname: string) {
  return uname.trim().toLowerCase();
}

function unameHashToDecimal(username: string): string {
  const canonical = normalizeUsername(username);
  const h = sha3_256(canonical);
  return BigInt("0x" + h).toString();
}

/**
 * Mobile-ready login
 * @param username 
 * @param walletAddress 
 * @param envelope Stored envelope object from secure storage { saltHex }
 */
export async function prepareLogin(
  username: string,
  walletAddress: string,
  envelope: { saltHex: string }
) {
  if (!envelope || !envelope.saltHex) throw new Error("Envelope required");

  // --- Convert salt to decimal
  const saltDecimal = BigInt("0x" + envelope.saltHex).toString();

  // --- Wallet secret
  const secretHex = walletSecretFromAddress(walletAddress.trim().toLowerCase());
  const secretDecimal = BigInt("0x" + secretHex).toString();

  // --- Fetch commitment + nonce
  const { commitment: storedCommitmentStr, nonce: nonceStr } = await getCommitment(username);
  if (!storedCommitmentStr || !nonceStr) throw new Error("Failed to fetch commitment or nonce");

  const storedCommitment = BigInt(storedCommitmentStr).toString();
  const nonce = BigInt(nonceStr).toString();

  // --- Prepare circuit inputs
  const unameHashDecimal = unameHashToDecimal(username);
  const input = { secret: secretDecimal, salt: saltDecimal, unameHash: unameHashDecimal, storedCommitment, nonce };

  const proofBundle = await generateProof(input, "login");

  return { proofBundle, publicSignals: proofBundle.publicSignals, session: proofBundle.publicSignals[1] };
}
