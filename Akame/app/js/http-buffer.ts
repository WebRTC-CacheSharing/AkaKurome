/// <reference path="../../typings.d.ts" />

// Name   : 並行ダウロード可能なバッファクラス
// License: MIT License
// Author : pine613<https://github.com/pine613>
// Copyright (C) 2014 Pine Mizune.

import _ = require('underscore');

import block = require('./data-block');

export class HttpBuffer {
    public static BLOCK_SIZE = 1024 * 1024; // bytes
    public static SENDING_INTERVAL = 100; // ms

    /**
     * ダウンロードブロック一覧
     */
    private dataBlocks: block.DataBlock[];

    /**
        * ダウンロードするブロック数
        */
    private dataBlockLength: number;

    /**
        * ダウンロード済みブロック数
        */
    private dataBlockDownloadedLength: number = 0;

    /**
        * クライアントへの送信済みブロック数
        */
    private dataBlockLengthSent: number = 0;

    /**
        * データ送信中
        */
    private sending: boolean = false;

    /**
        * バッファが既にクリアされていることを表す
        */
    private cleared: boolean = false;

    /**
        * データを送信する用のタイマー
        * 途中でデータの送信が止まらないように利用
        */
    private sendingTimerId: number;

    /**
        * バッファの初期化
        * @param bufferSize           バッファのサイズ
        * @param callbackBlockReceive 送信するブロックが完成した時に呼び出されるコールバック関数
        */
    public constructor(
        public bufferSize: number,
        public callbackBlockReceive: (dataBlock: block.DataBlock, cb: (err: string) => void) => void
        ) {

        // データブロックの個数を求める
        this.dataBlockLength = this.computeDataBlockLength(bufferSize);
        console.log('dataBlockLength = ' + this.dataBlockLength);

        // データブロックの配列を初期化
        this.dataBlocks = new Array(this.dataBlockLength);

        // データブロックの内容を初期化
        for (var i = 0; i < this.dataBlockLength; ++i) {
            this.dataBlocks[i] = new block.DataBlock(this.getBlockBytes(i));
        }

        // 最終ブロックの扱い
        if (this.dataBlockLength > 0) {
            this.dataBlocks[this.dataBlockLength - 1].isLast = true;
        }

        // データ送信用タイマー
        this.sendingTimerId = setInterval(() => {
            this.sendDataBlock();
        }, HttpBuffer.SENDING_INTERVAL);
    }

    /**
        * バッファをクリアします
        * クリアしたバッファの再利用は不可です
        * 複数回の呼び出しに対応しています
        */
    public clear(): void {
        this.cleared = true;

        // タイマーを停止
        if (this.sendingTimerId != undefined) {
            clearInterval(this.sendingTimerId);
            this.sendingTimerId = undefined;
        }

        // データを全て解放
        for (var i = 0; i < this.dataBlockLength; ++i) {
            if (this.dataBlocks[i]) {
                delete this.dataBlocks[i];
            }
        }

        // メンバを解放
        if (this.callbackBlockReceive) {
            delete this.callbackBlockReceive;
        }
    }

    /**
        * 指定したブロック番号のブロックが存在するか返す
        */
    public hasBlock(blockNumber: number): boolean {
        return !this.cleared && this.dataBlocks[blockNumber].completed;
    }

    /**
        * 指定したブロック番号のブロックを取得する
        */
    public getBlock(blockNumber: number): block.DataBlock {
        return this.dataBlocks[blockNumber];
    }

    /**
        * 指定したブロックのダウンロードが始まっているか返す
        */
    public isDownloadStarted(blockNumber: number): boolean {
        return this.dataBlocks[blockNumber].started;
    }

    /**
        * 指定したブロックのダウンロードがオリジナルソースにより始まっているか返す
        */
    public isDownloadStartedByOrigin(blockNumber: number): boolean {
        return this.dataBlocks[blockNumber].startedByOrigin;
    }

    /**
        * 転送が完了したかどうかを返す
        */
    public isCompleted(): boolean {
        return this.dataBlockDownloadedLength == this.dataBlockLength;
    }

    /**
        * 転送開始としてマークする
        */
    public startDownloadingBlock(
        blockNumber: number,
        isOrigin: boolean = false
        ): void {

        // ブロック番号を検査
        if (!this.isValidBlockNumber(blockNumber)) {
            return;
        }

        // 既に転送が開始されている
        if (this.isDownloadStarted(blockNumber)) {
            return; // 処理なし
        }

        // 開始として記憶
        this.dataBlocks[blockNumber].started = true;
        this.dataBlocks[blockNumber].startedByOrigin = isOrigin;
    }

    /**
        * ブロック転送完了
        */
    public receiveBlock(
        blockNumber: number,
        data: ArrayBuffer,
        isOrigin: boolean = false
        ): boolean {
//            console.log('receiveBlock blockNumber = ' + blockNumber);

        // ブロック番号を検査
        if (!this.isValidBlockNumber(blockNumber)) {
            return false;
        }

        // ブロックサイズが正しくない場合
        if (this.getBlockBytes(blockNumber) != data.byteLength) {
            return false;
        }

        // 既に転送が終了している場合
        if (this.hasBlock(blockNumber)) {
            return true;
        }

        // 転送が開始されていない場合も対応する
        this.startDownloadingBlock(blockNumber);

        // データをコピー
        this.dataBlocks[blockNumber].data = data;
        this.dataBlocks[blockNumber].completed = true;
        this.dataBlocks[blockNumber].completedByOrigin = isOrigin;
        ++this.dataBlockDownloadedLength;

        // データを送信する
        _.defer(() => { this.sendDataBlock(); });

        return true;
    }

    /*
        * ブロックサイズを取得する
        */
    public getBlockBytes(blockNumber: number): number {

        // 正しいブロック番号でない場合
        if (!this.isValidBlockNumber(blockNumber)) {
            return 0;
        }

        // 最後のブロックな場合
        if (blockNumber + 1 == this.dataBlockLength) {
            // 端数が出ない場合
            if (this.bufferSize % HttpBuffer.BLOCK_SIZE == 0) {
                return HttpBuffer.BLOCK_SIZE; // 偶然
            }

            // 端数がでる場合
            else {
                return this.bufferSize % HttpBuffer.BLOCK_SIZE;
            }
        }

        // 普通のブロック
        return HttpBuffer.BLOCK_SIZE;
    }

    /**
        * データ取得開始位置を取得する
        * 単位はバイト
        * @return 開始バイト、終了バイトを配列で返す
        */
    public getBlockOffset(blockNumber: number){
            
        // 正しいブロック番号か調べる
        if (!this.isValidBlockNumber(blockNumber)) {
            return null; // 範囲なし
        }

        return blockNumber * HttpBuffer.BLOCK_SIZE;
    }

    /**
        * 次にダウンロードすべきブロック番号を先頭から探し取得する
        * ダウンロードするべきものがない時は -1 を返す
        */
    public findNextBlockNumber(): number {
        // ダウンロード完了
        if (this.isCompleted()) {
            return -1;
        }

        // ダウンロード完了していない & 開始されていない番号を返す
        for (var i = 0; i < this.dataBlockLength; ++i) {
            if (!this.hasBlock(i) &&  !this.isDownloadStarted(i)) {
                return i;
            }
        }

        // オリジナルソースにより開始していない番号を返す
        for (var i = 0; i < this.dataBlockLength; ++i) {
            if (!this.hasBlock(i) && !this.isDownloadStartedByOrigin(i)) {
                return i;
            }
        }

        // 鋭意ダウンロード中
        return -1;
    }

    /**
     * 次にダウンロードすべきブロック番号を末尾から探し取得する
     * ダウンロードすべきものがないときは -1 を返す
     * @param targetHadBlocks 通信相手が所有しているブロックの情報
     */
    public findNextBlockNumberLast(targetHadBlocks?: boolean[]): number {
        // ダウンロード完了
        if (this.isCompleted()) {
            return -1;
        }

        // ダウンロード完了していない & 開始されていない番号を返す
        for (var i = this.dataBlockLength -1; i >= 0; --i) {
            if (!this.hasBlock(i) && !this.isDownloadStarted(i)) {
                // 通信相手のブロック番号を見る必要がある場合、確認する
                if (targetHadBlocks) {
                    if (targetHadBlocks[i]) { // 持っている場合
                        return i;
                    }
                }

                else {
                    return i;
                }
            }
        }

        // オリジナルソースにより開始していない番号を返す
        for (var i = this.dataBlockLength - 1; i >= 0; --i) {
            if (!this.hasBlock(i) && !this.isDownloadStartedByOrigin(i)) {
                // 通信相手のブロック番号を見る必要がある場合、確認する
                if (targetHadBlocks) {
                    if (targetHadBlocks[i]) { // 持っている場合
                        return i;
                    }
                }

                else {
                    return i;
                }
            }
        }

        // 鋭意ダウンロード中
        return -1;
    }

    /**
        * 全ブロック数を取得する
        */
    public getBlockLength(): number {
        return this.dataBlockLength;
    }

    /**
     * 所有しているブロックの一覧を返す
     */
    public getHadBlocksList(): boolean[] {
        var hadBlocks: boolean[] = [];

        for (var i = 0; i < this.getBlockLength(); ++i) {
            hadBlocks[i] = this.hasBlock(i);
        }

        return hadBlocks;
    }

    /**
        * ブロック番号が正しいか検査する
        */
    private isValidBlockNumber(blockNumber: number): boolean {
        // 範囲外
        if (blockNumber < 0 || blockNumber >= this.dataBlockLength) {
            console.error('ブロック番号が無効です: blockNumber = ' + blockNumber);
            return false;
        }

        return true;
    }

    /**
        * データブロック数を求める
        */
    private computeDataBlockLength(bufferSize: number): number {
        // データブロックの個数を求める
        // (整数 / 整数) をしても少数になってしまうので、結果が必ず整数になるように調整
        var length = (bufferSize - (bufferSize % HttpBuffer.BLOCK_SIZE)) / HttpBuffer.BLOCK_SIZE;

        // ブロックサイズで丁度割り切れない場合、
        // 最後に規定ブロックサイズよりも小さいブロックをつける
        if (bufferSize % HttpBuffer.BLOCK_SIZE != 0) {
            ++length;
        }

        return length;
    }

    /*
        * 受信したデータブロックで送信できる部分を送信する
        */
    private sendDataBlock(): void {
        // 送信中
        if (this.sending) {
            return;
        }

        // 終了
        if (this.cleared) {
            return;
        }

        // 送信が終わっていない部分からループ開始
        for (var i = this.dataBlockLengthSent; i < this.dataBlockLength; ++i) {

            // データが存在しない場合
            if (!this.hasBlock(i)) {
                return;
            }

            // 念のため送信していないことを確認
            if (!this.dataBlocks[i].sent) {
                // データを送信する
                this.sending = true;

                this.callbackBlockReceive(this.dataBlocks[i], (err) => {
                    this.sending = false;

                    // 送信時にエラー発生
                    if (err) {
                        console.error(err);
                        return;
                    }

                    this.dataBlocks[i].sent = true; // 送信済み
                    ++this.dataBlockLengthSent;

                    // 次のブロックの送信
                    _.defer(() => {
                        this.sendDataBlock();
                    });
                });

                return;
            }
        }
    }
}
