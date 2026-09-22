declare module "@cornerstonejs/codec-openjpeg/decodewasmjs" {
  export interface J2KDecoder {
    getEncodedBuffer(length: number): Uint8Array
    decode(): void
    getFrameInfo(): {
      width: number
      height: number
      bitsPerSample: number
      componentCount: number
      isSigned: boolean
    }
    getDecodedBuffer(): Uint8Array
    delete(): void
  }
  export interface OpenJPEG {
    J2KDecoder: new () => J2KDecoder
  }
  export default function createOpenJPEG(options?: {
    locateFile?: (path: string) => string
    wasmBinary?: Uint8Array
    print?: (...args: unknown[]) => void
  }): Promise<OpenJPEG>
}
