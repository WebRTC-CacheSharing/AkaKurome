/// <reference path="../../typings.d.ts" />

// Path   : P2PWebProxy/app/js/downloader-peerjs.ts
// Desc   : PeerJS でダウンロードを行うクラス
// License: MIT License
// Author : pine613<https://github.com/pine613>
// Copyright (C) 2014 Pine Mizune.

import downloader = require('./downloader');
import buffer = require('./http-buffer');
import peerjsSocket = require('./peerjs-socket');

export class DownloaderPeerjs implements downloader.Downloader {
    /**
        * ダウンロードを実行するタイマー間隔
        */
    public static DOWNLOAD_INTERVAL = 500; // ms

    /**
        * ダウンロード中であることを表す
        */
    private downloading = false;


    /**
        * ダウンロードを実行するタイマー
        */
    private timerId: number = -1;

    public constructor(
        public targetUrl: string,
        public httpBuffer: buffer.HttpBuffer,
        public signalingSocket: peerjsSocket.PeerjsSignalingSocket
        ) {
    }

    /**
        * ダウンロードを開始する
        */
    public start(): void {
        console.log('DownloaderPeerjs#start');

        this.downloading = true;

        // ダウンロードメッセージループを開始
        this.timerId = setInterval(
            () => { this.timerMessageLoop(); },
            DownloaderPeerjs.DOWNLOAD_INTERVAL
            );
    }

    public stop(): void {
        console.log('DownloaderPeerjs#stop');

        this.downloading = false;

        // メッセージループを終了
        if (this.timerId >= 0) {
            clearInterval(this.timerId);
            this.timerId = -1;
        }
    }

    /**
        * メッセージループを開始する
        */
    private timerMessageLoop(): void {
        // ダウンロードが終了している場合、処理しない
        if (!this.downloading) {
            return;
        }

        // ダウンロードの完了を調べる
        if (this.httpBuffer.isCompleted()) {
            this.stop();
            return;
        }

        this.signalingSocket.startDownload();
    }

}
