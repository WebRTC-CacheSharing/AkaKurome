/// <reference path="../../typings/es6-promise/es6-promise.d.ts" />

// es6-promise は Promise<T> の定義を借りているだけ
// ライブラリ自体は不要

declare module WebCrypto {
    interface Algorithm {
        name: string;
    }

    interface CryptoStatic {
        subtle: SubtleStatic;
    }

    interface SubtleStatic {
        digest(algorithm: string, data: ArrayBuffer): Promise<any>;
        digest(algorithm: string, data: ArrayBufferView): Promise<any>;
        digest(algorithm: Algorithm, data: ArrayBuffer): Promise<any>;
        digest(algorithm: Algorithm, data: ArrayBufferView): Promise<any>;
    }
}

interface Window {
    crypto: WebCrypto.CryptoStatic;
}