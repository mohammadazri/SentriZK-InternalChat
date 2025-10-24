import axios from "axios";
import { config } from "../lib/config";

const API = config.apiUrl;

// -------------------------
// Types
// -------------------------
export interface ProofPayload {
  proof: unknown;
  publicSignals: string[];
}

export interface CommitmentResponse {
  username: string;
  commitment: string;
  nonce: string;
}

// -------------------------
// Username Availability
// -------------------------
export async function checkUsername(username: string): Promise<boolean> {
  const resp = await axios.get(`${API}/check-username/${username}`);
  return resp.data.available;
}

// -------------------------
// Get Commitment + Nonce
// -------------------------
export async function getCommitment(username: string): Promise<CommitmentResponse> {
  const resp = await axios.get(`${API}/commitment/${username}`);
  return resp.data;
}

// -------------------------
// Registration
// -------------------------
export async function registerUser(username: string, proofBundle: ProofPayload) {
  const payload = {
    username,
    proof: proofBundle.proof,
    publicSignals: proofBundle.publicSignals,
  };
  const resp = await axios.post(`${API}/register`, payload);
  return resp.data; // { status: "ok", username, commitment }
}

// -------------------------
// Login
// -------------------------
export async function loginUser(username: string, proofBundle: ProofPayload) {
  const payload = {
    username,
    proof: proofBundle.proof,
    publicSignals: proofBundle.publicSignals,
  };
  const resp = await axios.post(`${API}/login`, payload);
  return resp.data; // { status: "ok", message: "Login successful", session }
}

// -------------------------
// Health Check (optional)
// -------------------------
export async function checkServerHealth(): Promise<boolean> {
  try {
    const resp = await axios.get(`${API}/health`);
    return resp.data.ok === true;
  } catch {
    return false;
  }
}
