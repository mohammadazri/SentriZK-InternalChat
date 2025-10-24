import { config } from "./config";
import { logger } from "./logger";

export interface ProofBundle {
  proof: unknown;
  publicSignals: string[];
}

export type CircuitType = "login" | "registration";

/** Resolve circuit files (wasm + zkey) depending on type */
function getCircuitFiles(circuit: CircuitType) {
  switch (circuit) {
    case "login":
      return { wasm: config.loginWasm, zkey: config.loginZkey };
    case "registration":
      return { wasm: config.regWasm, zkey: config.regZkey };
    default:
      throw new Error(`Unknown circuit type: ${circuit}`);
  }
}

/**
 * Generate zk-SNARK proof using snarkjs for login/registration.
 */
export async function generateProof(
  input: Record<string, string | number>,
  circuit: CircuitType
): Promise<ProofBundle> {
  if (!input || Object.keys(input).length === 0) {
    throw new TypeError("Invalid input: expected a non-empty object with signal values.");
  }

  try {
    // Dynamic import
    const snarkjsModule: unknown = await import("snarkjs");
    const snarkjs = snarkjsModule as {
      groth16: {
        fullProve: (
          input: Record<string, string | number>,
          wasmPath: string,
          zkeyPath: string
        ) => Promise<ProofBundle>;
      };
    };

    const { wasm, zkey } = getCircuitFiles(circuit);

    if (!wasm || !zkey) throw new Error(`Missing artifacts for ${circuit}`);

    const result = await snarkjs.groth16.fullProve(input, wasm, zkey);

    logger.info(`[ZKP] ${circuit} proof generated`, { signals: result.publicSignals.length });
    return result;
  } catch (err: unknown) {
    logger.error(`[ZKP] ${circuit} proof generation failed`, err);
    throw new Error(`Failed to generate ${circuit} proof. Check inputs & circuit files.`);
  }
}
