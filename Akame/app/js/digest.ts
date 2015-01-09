/// <reference path="../../typings.d.ts" />

// Name   : ハッシュ関数 WebCrypto ラッパークラス
// License: MIT License
// Author : pine613<https://github.com/pine613>
// Copyright (C) 2014 Pine Mizune.

// Web Cryptography API (Draft) を利用
// http://www.w3.org/TR/WebCryptoAPI/
// https://developer.mozilla.org/en-US/docs/Web/API/Window.crypto
// http://msdn.microsoft.com/en-us/library/ie/dn302328(v=vs.85).aspx

import _ = require('underscore');

import converter = require('./utf8-converter');

/**
    * メッセージダイジェスト関係の親クラス
    * 利用する際は、各アルゴリズムの派生クラスを利用すること
    */
export class WebCryptoDigest {
    public constructor(private algorithmName: string) { }
        
    /**
        * ハッシュをバイト配列で生成する
        */
    public digest(data: ArrayBuffer, cb: (hash: ArrayBuffer) => void): void;
    public digest(data: string, cb: (hash: ArrayBuffer) => void): void;
    public digest(data: any, cb: (hash: ArrayBuffer) => void): void {
        if (_.isString(data)) {
            data = converter.Utf8Converter.StringToArrayBuffer(data);
        }

        window.crypto.subtle.digest({ name: this.algorithmName }, data)
            .then(hash => {
                cb(hash);
            });
    }

    /**
        * ハッシュを16進数文字列で生成する
        * 結果はコールバック関数を用いて取得する
        */
    public hexdigest(data: ArrayBuffer, cb: (hash: string) => void): void;
    public hexdigest(data: string, cb: (hash: string) => void): void;
    public hexdigest(data: any, cb: (hash: string) => void): void {
        this.digest(data, hash => {
            cb(converter.Utf8Converter.ArrayBufferToHexString(hash));
        });
    }
}

export class SHA1 extends WebCryptoDigest {
    public constructor() {
        super('SHA-1');
    }
}

export class SHA256 extends WebCryptoDigest {
    public constructor() {
        super('SHA-256');
    }
}

export class SHA384 extends WebCryptoDigest {
    public constructor() {
        super('SHA-384');
    }
}

export class SHA512 extends WebCryptoDigest {
    public constructor() {
        super('SHA-512');
    }
}
