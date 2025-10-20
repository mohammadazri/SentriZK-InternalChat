import axios from "axios";
import { config } from "./config";

const API = config.apiUrl;

export async function checkUsername(username: string): Promise<boolean> {
  const resp = await axios.get(`${API}/check-username/${username}`);
  return resp.data.available;
}

export async function getCommitment(username: string) {
  const resp = await axios.get(`${API}/commitment/${username}`);
  return resp.data; // { username, commitment, nonce }
}

export async function registerUser(body: {
  username: string;
  proof: unknown;
  publicSignals: string[];
  uniqProof: unknown;
  uniqSignals: string[];
}) {
  const resp = await axios.post(`${API}/register`, body);
  return resp.data;
}

export async function loginUser(body: {
  username: string;
  proof: unknown;
  publicSignals: string[];
}) {
  const resp = await axios.post(`${API}/login`, body);
  return resp.data;
}
