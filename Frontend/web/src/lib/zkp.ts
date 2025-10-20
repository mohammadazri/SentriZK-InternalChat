import * as snarkjs from "snarkjs";
import { buildPoseidon } from "circomlibjs";

// Poseidon prime field
const FIELD_PRIME: bigint = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");

// --- Types ---
export interface ProofBundle {
  proof: unknown;
  publicSignals: string[];
}

export interface ZkpInputs {
  [key: string]: string | number | bigint;
}

// --- Hash username to field element ---
export function hashUsername(uname: string): bigint {
  const buf = new TextEncoder().encode(uname);
  let hash = BigInt(0);
  for (let b of buf) hash = (hash * BigInt(31) + BigInt(b)) % FIELD_PRIME;
  return hash;
}

// --- Generate proof ---
export async function generateProof({
  wasmPath,
  zkeyPath,
  inputs,
}: {
  wasmPath: string;
  zkeyPath: string;
  inputs: ZkpInputs;
}): Promise<ProofBundle> {
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(inputs, wasmPath, zkeyPath);
  return { proof, publicSignals };
}

// --- Poseidon helper ---
export async function poseidonHash(arr: bigint[]): Promise<bigint> {
  const poseidon = await buildPoseidon();
  const F = poseidon.F;
  return F.toObject(poseidon(arr));
}
