/// <reference path="../../typings.d.ts" />

// Name   : サーバーからダウンロードする際に用いる HTTP クライアント
// License: MIT License
// Author : pine613<https://github.com/pine613>
// Copyright (C) 2014-2015 Pine Mizune.

import _ = require('underscore');
import parser = require('http-string-parser');

interface HttpRange {
    offset: number;
    length: number;
}

/**
    * HTTP クライアントのクラス
    */
export class HttpClient {
    public constructor() { }

    /**
        * 範囲を指定してデータを取得する
        * 
        * @param url    取得するデータの URL
        * @param offset データの取得開始位置
        * @param bytes  取得するデータ量
        * @param cb     コールバック関数
        */
    public getRange(
        url: string,
        offset: number,
        bytes: number,
        cb: (err: string, data: ArrayBuffer) => void
        ): void {

        //console.log('url = ' + url + ', offset = ' + offset + ', bytes = ' + bytes);

        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.setRequestHeader('P2P', 'off');
        xhr.setRequestHeader('Range', 'bytes=' + offset + '-' + (offset + bytes - 1));
        xhr.responseType = 'arraybuffer';

        xhr.onload = (e) => {
            if (xhr.status == 206) { // Partial Content
                cb(null, xhr.response);
            }

            else {
                cb(xhr.status + ' ' + xhr.statusText, xhr.response);
            }
        };

        xhr.send();
    }

    /**
        * ヘッダを取得
        * 
        * @param url 取得するデータの URL
        * @param cb  コールバック関数
        */
    public getHeaders(
        url: string,
        cb: (err: string, headers: { [key: string]: string }) => void
        ): void {

        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.setRequestHeader('P2P', 'off');
        xhr.setRequestHeader('Range', 'bytes=0-0');

        xhr.onload = (e) => {
            var headersText = xhr.getAllResponseHeaders();
            var headers = parser.parseResponse(headersText).headers;

            if (xhr.status == 206) { // Partial Content
                cb(null, headers);
            }

            else {
                cb(xhr.status + ' ' + xhr.statusText, headers);
            }
        };

        xhr.send();
    }

    /**
        * Content-Range ヘッダーを解析して、Content-Length を取得するメソッド
        */
    public getContentLengthFromContentRangeHeader(
        contentRange: string
        ): number {
        var regex = /bytes \d+\-\d+\/(\d+)/;
        var matches = contentRange.match(regex);

        if (matches) {
            return parseInt(matches[1], 10);
        }

        return -1;
    }
}
