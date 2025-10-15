pragma circom 2.0.0;

include "circomlib/poseidon.circom";
include "circomlib/bitify.circom"; // Num2Bits

/*
 Registration:
   commitment = Poseidon(secret, salt, unameHash)
 Public outputs:
   - commitment
 Notes:
   - secret enforced to be <= 2^256-1 (Num2Bits(256))
   - salt enforced to be <= 2^128-1  (Num2Bits(128))
   - unameHash is supplied as a public scalar (ensure canonicalization in frontend)
*/

template Registration() {
    // private inputs
    signal input secret;   // expect 256-bit integer (or canonicalized)
    signal input salt;     // expect 128-bit integer

    // public input
    signal input unameHash; // e.g. keccak/sha256 reduced to field or other scalar

    // bit-length checks
    component secretBits = Num2Bits(256);
    secretBits.in <== secret;

    component saltBits = Num2Bits(128);
    saltBits.in <== salt;

    // poseidon over [secret, salt, unameHash]
    component H = Poseidon(3);
    H.inputs[0] <== secret;
    H.inputs[1] <== salt;
    H.inputs[2] <== unameHash;

    // public commitment output (server stores this)
    signal output commitment;
    commitment <== H.out;
}

component main = Registration();
