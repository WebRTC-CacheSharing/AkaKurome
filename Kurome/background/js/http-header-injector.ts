/// <reference path="../../typings.d.ts" />

// License: MIT License
// Author : pine613<https://github.com/pine613>
// Copyright (C) 2014-2015 Pine Mizune.

import _ = require('underscore');
import wurl = require('wurl');

/**
 * HTTP ヘッダをチェックし、ヘッダを挿入するクラス
 */
export class HttpHeaderInjector {
    public static FILTER: chrome.webRequest.RequestFilter = {
        urls: ['<all_urls>']
    };

    /**
     * ブロックする URL
     * メイン拡張機能側でエラーが発生したため、通常リクエストに切り替えるべき URL
     */
    private blockUrls: { [key: string]: boolean } = {};

    /**
        * 初期化する
        */
    public constructor(
        public host: string,
        public port: number,
        public enabled: boolean = false
        ) {

        this.addHeaderReceiveListener();
        this.addBeforeSendHeadersListener();
    }

    /**
        * ブロックする URL を追加する
        */
    public addBlockUrl(loc: string): void {
        console.log('#addBlockUrl url = ' + loc);

        this.blockUrls[loc] = true;
    }

    /**
        * ブラックリストをクリアする
        */
    public clearBlackList(): void {
        this.blockUrls = {};
    }

    /**
        * ヘッダ受信時に P2P Web Proxy 可能であればリダイレクトする処理
        */
    private addHeaderReceiveListener(): void {
        chrome.webRequest.onHeadersReceived.addListener(
            details => {
                // WebRTC での P2P ダウンロードを行う際のヘッダを取得する
                var webrtcHeader =
                    _.find(details.responseHeaders, header => header.name === 'P2P-WebRTC');

                // ヘッダが存在しない場合
                if (!webrtcHeader) {
                    return null;
                }

                // プロトコルが HTTP 以外の場合
                if (wurl('protocol', details.url) != 'http') {
                    return null;
                }

                // メソッドが GET 以外の場合
                if (details.method != 'GET') {
                    return null;
                }

                // favicon.ico は転送しない
                if (details.url.match(/\/favicon\.ico$/)) {
                    return null;
                }

                // タブ以外からのリクエストの場合
                // (拡張機能内部からのリクエストなどが含まれる)
                // (これを弾かないと、拡張機能内からのリクエストが無限リダイレクトに陥る)
                if (details.tabId < 0) {
                    return null;
                }

                // ブロックリストに存在する場合
                if (this.blockUrls[details.url]) {
                    return null;
                }

                // 転送先の URL を取得
                var redirectUrl = this.getRedirectUrl(details.url, webrtcHeader.value);

                console.log('Redirect: ' + details.url + ' -> ' + redirectUrl);

                // 条件を満たしたら転送
                return {
                    redirectUrl: redirectUrl
                };
            },
            HttpHeaderInjector.FILTER,
            [
            'responseHeaders',
            'blocking'
            ]
            );
    }

    /**
        * ヘッダ送信時に P2P ヘッダを追加する処理
        */
    private addBeforeSendHeadersListener(): void {
        chrome.webRequest.onBeforeSendHeaders.addListener(
            details => {
                // P2P ヘッダが既に存在するか調べる
                var hasP2PHeader =
                    _.find(details.requestHeaders, header => header.name == 'P2P');

                // 存在しない場合、追加する
                if (!hasP2PHeader) {
                    details.requestHeaders.push({
                        name: 'P2P',
                        value: 'on'
                    });
                }

                return { requestHeaders: details.requestHeaders };
            },
            HttpHeaderInjector.FILTER,
            [
                'requestHeaders',
                'blocking'
            ]
            );
    }

    /**
        * リダイレクト先の URL を取得
        */
    private getRedirectUrl(url: string, webrtcHeader: string): string {
        var base = 'http://' + this.host + ':' + this.port + '/';
        var query = '?url=' + encodeURIComponent(url);
        query += '&webrtc=' + encodeURIComponent(webrtcHeader);

        return base + query;
    }
}
