/// <reference path="../../typings.d.ts" />

// Path   : P2PWebProxy/app/js/downloader-by-origin.ts
// Desc   : HTTP でダウンロードを行うクラス
// License: MIT License
// Author : pine613<https://github.com/pine613>
// Copyright (C) 2014 Pine Mizune.

import _ = require('underscore');

import downloader = require('./downloader');
import buffer = require('./http-buffer');
import client = require('./http-client');

export class DownloaderUsedHttp implements downloader.Downloader {
    /**
     * ダウンロードを実行するタイマー間隔
     */
    public static DOWNLOAD_INTERVAL = 100; // ms

    /**
        * サーバーと張る最大コネクション数
        */
    public static MAX_CONNECTION = 1;

    /**
        * ダウンロードを実行するタイマー
        */
    private timerId: number = -1;

    /**
        * 現在のコネクション数
        */
    private connCount: number = 0;

    /**
        * ダウンロード実行中か示す
        */
    private downloading: boolean = false;

    public constructor(
        public targetUrl: string,
        public httpBuffer: buffer.HttpBuffer,
        public httpClient: client.HttpClient,
        public isOrigin: boolean = false
        ) { }

    /**
        * ダウンロードを開始する
        */
    public start(): void {
        this.downloading = true;

        // ダウンロードメッセージループを開始
        this.timerId = setInterval(
            () => { this.timerMessageLoop(); },
            DownloaderUsedHttp.DOWNLOAD_INTERVAL
            );
    }

    /**
        * ダウンロードを終了する
        * 一度終了したダウンロードは再開できない
        */
    public stop(): void {
        this.downloading = false;

        if (this.timerId > -1) {
            clearInterval(this.timerId);
            this.timerId = -1;
        }

        this.httpBuffer = undefined;
        this.httpClient = undefined;
    }

    /**
        * メッセージループを開始する
        */
    private timerMessageLoop(): void {
        // ダウンロードが終了している場合、処理しない
        if (!this.downloading) {
            return;
        }

        if (this.connCount < DownloaderByOrigin.MAX_CONNECTION) {
            if (this.isOrigin) {
                var blockNumber = this.httpBuffer.findNextBlockNumber();
            }
            else {
                var blockNumber = this.httpBuffer.findNextBlockNumberLast();
            }

            // ダウンロード対象ブロックがある場合
            if (blockNumber >= 0) {
                this.httpBuffer.startDownloadingBlock(blockNumber, this.isOrigin);
                ++this.connCount;

                this.download(blockNumber);
            }
        }
    }

    /**
        * データブロックのダウンロードを実行する
        */
    private download(blockNumber: number): void {
        // ダウンロードが中断されていないか確認
        if (!this.downloading) {
            return;
        }

        var offset = this.httpBuffer.getBlockOffset(blockNumber);
        var bytes = this.httpBuffer.getBlockBytes(blockNumber);
        //console.log('offset = ' + offset + ', bytes = ' + bytes);

        this.httpClient.getRange(this.targetUrl, offset, bytes, (err, data) => {
            if (err) {
                console.error(err);
                return;
            }

            // コレクション数を解放
            --this.connCount;
                
            // ダウンロードが中断していないか確認
            if (this.downloading) {
                // 受信したデータを書き込む
                this.httpBuffer.receiveBlock(blockNumber, data, this.isOrigin);

                // 即座に次のダウンロードに移行
                _.defer(() => {
                    this.timerMessageLoop();
                });
            }
        });
    }
}

/**
 * オリジナルソースからダウンロードを行うクラス
 */
export class DownloaderByOrigin extends DownloaderUsedHttp {
    public constructor(
        targetUrl: string,
        httpBuffer: buffer.HttpBuffer,
        httpClient: client.HttpClient
        ) {
        super(targetUrl, httpBuffer, httpClient, true);
    }
}
