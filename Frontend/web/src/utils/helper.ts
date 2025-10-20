// utils/helper.ts
export function toBufferSource(bytes: Uint8Array): ArrayBuffer {
  // Force conversion into a true ArrayBuffer (not SharedArrayBuffer)
  return new Uint8Array(bytes).buffer;
}
