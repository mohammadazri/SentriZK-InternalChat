  // src/lib/zkp.ts
  import { config } from "./config";
  import { logger } from "./logger";

  export interface ProofBundle {
    proof: unknown;
    publicSignals: string[];
  }

  export type CircuitType = "login" | "registration";

  /**
   * Resolve circuit files (wasm + zkey) depending on type
   */
  function getCircuitFiles(circuit: CircuitType) {
    switch (circuit) {
      case "login":
        return {
          wasm: config.loginWasm,
          zkey: config.loginZkey,
        };
      case "registration":
        return {
          wasm: config.regWasm,
          zkey: config.regZkey,
        };
      default:
        throw new Error(`Unknown circuit type: ${circuit}`);
    }
  }

  /**
   * Generate a zk-SNARK proof using snarkjs for login/registration.
   *
   * @param input - The circuit input signals.
   * @param circuit - Which circuit to use ("login" | "registration").
   * @returns A proof bundle containing the proof object and public signals.
   * @throws If proof generation fails or inputs are invalid.
   */
  export async function generateProof(
    input: Record<string, string | number>,
    circuit: CircuitType
  ): Promise<ProofBundle> {
    if (!input || Object.keys(input).length === 0) {
      throw new TypeError(
        "Invalid input: expected a non-empty object with signal values."
      );
    }

    try {
      const snarkjs = await import("snarkjs");
      const { wasm, zkey } = getCircuitFiles(circuit);

      // Ensure artifacts are present (narrows types from string | undefined to string)
      if (!wasm || !zkey) {
        throw new Error(
          `Missing circuit artifacts for ${circuit}: wasm=${!!wasm}, zkey=${!!zkey}`
        );
      }

      // snarkjs typings expect a ZKArtifact; cast to any after runtime check to satisfy TS.
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        wasm as any,
        zkey as any
      );

      logger.info(`[ZKP] ${circuit} proof successfully generated`, {
        signals: publicSignals.length,
      });

      return { proof, publicSignals };
    } catch (err) {
      logger.error(`[ZKP] ${circuit} proof generation failed`, err);
      throw new Error(
        `Failed to generate ${circuit} proof. Please verify inputs and circuit files.`
      );
    }
  }
