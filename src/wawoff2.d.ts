declare module 'wawoff2' {
  const wawoff2: { decompress(buf: Uint8Array): Promise<Uint8Array>; compress(buf: Uint8Array): Promise<Uint8Array> };
  export default wawoff2;
}
