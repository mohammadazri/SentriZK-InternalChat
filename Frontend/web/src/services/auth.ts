import axios from "axios";
import { hashUsername, generateProof, poseidonHash, ProofBundle } from "../lib/zkp";

const SERVER = "http://localhost:5000";

export interface CommitmentResponse {
  username: string;
  commitment: string;
  nonce: string;
}

// --- Registration ---
export async function register({
  username,
  secret,
  salt,
}: {
  username: string;
  secret: bigint | number | string;
  salt: bigint | number | string;
}) {
  const unameHash = hashUsername(username);

  const { proof, publicSignals } = await generateProof({
    wasmPath: "/circuits/registration.wasm",
    zkeyPath: "/circuits/registration_final.zkey",
    inputs: { secret, salt, unameHash },
  });

  const res = await axios.post(`${SERVER}/register`, { username, proof, publicSignals });
  return res.data;
}

// --- Fetch commitment + nonce for login ---
export async function getCommitment(username: string): Promise<CommitmentResponse> {
  const res = await axios.get(`${SERVER}/commitment/${username}`);
  return res.data;
}

// --- Login ---
export async function login({
  username,
  secret,
  salt,
  nonce,
  storedCommitment,
}: {
  username: string;
  secret: bigint | number | string;
  salt: bigint | number | string;
  nonce: string;
  storedCommitment: string;
}) {
  const unameHash = hashUsername(username);

  const { proof, publicSignals } = await generateProof({
    wasmPath: "/circuits/login.wasm",
    zkeyPath: "/circuits/login_final.zkey",
    inputs: { secret, salt, unameHash, storedCommitment, nonce },
  });

  const res = await axios.post(`${SERVER}/login`, { username, proof, publicSignals });
  return res.data;
}
