/// <reference path="../../typings.d.ts" />

// Name   : UTF-8 関係データ変換クラス
// License: MIT License
// Author : pine613<https://github.com/pine613>
// Copyright (C) 2014-2015 Pine Mizune.

// TextEncoder, TextDecoder はネイティブ実装を利用
// https://developer.mozilla.org/ja/docs/Web/API/TextDecoder

import _ = require('underscore');
import _s = require('underscore.string');

export class Utf8Converter {
    /**
     * ArrayBuffer から文字列に変換する
     * 
     * @param data 変換するデータ
     */
    public static ArrayBufferToString(data: ArrayBuffer): string {
        var uint8Array = new Uint8Array(data);
        var text = new TextDecoder('utf-8').decode(uint8Array);
        return text;
    }

    /**
     * 文字列から ArrayBuffer に変換する
     *
     * @param data 変換するデータ
     */
    public static StringToArrayBuffer(data: string): ArrayBuffer {
        var uint8Array = new TextEncoder('utf-8').encode(data);
        return uint8Array.buffer;
    }

    /**
     * ArrayBuffer から16進数文字列に変換する
     * 
     * @param data 変換するデータ
     */
    public static ArrayBufferToHexString(data: ArrayBuffer): string {
        var uint8Array = new Uint8Array(data);
        var hexChars = _.map(uint8Array, val => _s.sprintf('%02X', val));

        return hexChars.join('');
    }
}
