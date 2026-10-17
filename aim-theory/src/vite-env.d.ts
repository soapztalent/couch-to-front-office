/// <reference types="vite/client" />

declare module "node:fs" {
  export function readFileSync(path: URL | string): Uint8Array & {
    buffer: ArrayBuffer;
    byteOffset: number;
    byteLength: number;
  };
}
