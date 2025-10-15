pragma circom 2.0.0;

include "circomlib/poseidon.circom";
include "circomlib/bitify.circom"; // Num2Bits

/*
 Login (nonce-bound):
   - Recompute commitment = Poseidon(secret, salt, unameHash)
   - Require commitment == storedCommitment (public input)
   - Compute session = Poseidon(storedCommitment, nonce) and output it
 Public outputs:
   - pubCommitment (== storedCommitment)
   - pubSession (== Poseidon(storedCommitment, nonce))
 Server should:
   1) verify SNARK
   2) compute expectedSession = Poseidon(storedCommitment, nonce) (same Poseidon implementation)
   3) check pubSession == expectedSession and pubCommitment == storedCommitment
 Notes:
   - secret enforced to 256 bits; salt enforced to 128 bits; nonce enforced to 64 bits
*/

template Login() {
    // private inputs (kept secret by prover)
    signal input secret;
    signal input salt;

    // public inputs (provided by verifier / server)
    signal input unameHash;         // canonicalized username hash
    signal input storedCommitment;  // commitment stored on server (public input)
    signal input nonce;             // server-issued one-time nonce (public input)

    // Range checks
    component secretBits = Num2Bits(256);
    secretBits.in <== secret;

    component saltBits = Num2Bits(128);
    saltBits.in <== salt;

    component nonceBits = Num2Bits(64);
    nonceBits.in <== nonce;

    // Recompute commitment from private inputs + unameHash
    component H1 = Poseidon(3);
    H1.inputs[0] <== secret;
    H1.inputs[1] <== salt;
    H1.inputs[2] <== unameHash;

    // Ensure recomputed commitment matches the stored/public commitment
    H1.out === storedCommitment;

    // Bind the proof to the nonce: session = Poseidon(storedCommitment, nonce)
    component H2 = Poseidon(2);
    H2.inputs[0] <== storedCommitment;
    H2.inputs[1] <== nonce;

    // Public outputs (order matters)
    signal output pubCommitment;
    signal output pubSession;

    pubCommitment <== storedCommitment;
    pubSession <== H2.out;
}

component main = Login();
