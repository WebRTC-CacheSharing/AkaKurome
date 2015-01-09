/// <reference path="../../typings.d.ts" />

import _ = require('underscore');

import util = require('./peerjs-utility');
import buffer = require('./http-buffer');

interface PeerjsDataConnectionMessage {
    hadBlocks?: boolean[];
    blockNumber?: number;
    blockData?: ArrayBuffer;
}

export class PeerjsDataConnectionWrapper {

    private dataConn: PeerJs.DataConnection;
    private targetHadBlocks: boolean[];
    private buffer: buffer.HttpBuffer;

    public constructor(dataConn: PeerJs.DataConnection, buffer: buffer.HttpBuffer) {
        this.dataConn = dataConn;
        this.buffer = buffer;

        dataConn.on('error', util.onError);
        dataConn.on('data', this.onData.bind(this));
    }

    public startDownload(): void {
        this.sendRequest();
    }

    private onData(data: PeerjsDataConnectionMessage): void {
        console.log('#onData', data);

        if (data.hadBlocks) {
            this.targetHadBlocks = data.hadBlocks;
        }

        // 相手からのブロック送信
        if (data.blockData) {
            console.log('Block received: blockNumber = ' + data.blockNumber);

            if (_.isNumber(data.blockNumber) && data.blockNumber >= 0) {
                this.buffer.receiveBlock(data.blockNumber, data.blockData, false);
            }
        }

        else if (_.isNumber(data.blockNumber)) {
            console.log('Block requested: blockNumber = ' + data.blockNumber);
            this.sendRequest(data.blockNumber);
        }
    }

    private sendRequest(sendBlockNumber?: number): void {
        var message: PeerjsDataConnectionMessage = {
            hadBlocks: this.buffer.getHadBlocksList()
        };

        // ブロック送信
        if (_.isNumber(sendBlockNumber)) {
            message.blockNumber = sendBlockNumber;

            var block = this.buffer.getBlock(sendBlockNumber);

            if (!block.completed) {
                console.error('Block requested, but not completed!');
                return;
            }

            message.blockData = block.data;
        }

        // ブロック要求
        else {
            var blockNumber = this.findNextRequestBlockNumber();
            
            if (blockNumber !== null) {
                console.log('Send request: blockNumber = ' + blockNumber);

                message.blockNumber = blockNumber;
                this.buffer.startDownloadingBlock(blockNumber, false);
            }
        }

        this.dataConn.send(message);
    }

    /**
     * 次にリクエストを送るブロック番号を計算する
     * 存在しない場合は null を返す
     */
    private findNextRequestBlockNumber(): number {
        var hadBlocks = this.buffer.getHadBlocksList();

        console.log(hadBlocks, this.targetHadBlocks);

        // 双方のブロックデータが存在しない場合
        if (!hadBlocks || !this.targetHadBlocks) {
            return null;
        }

        // ブロック数が違う場合
        if (hadBlocks.length !== this.targetHadBlocks.length) {
            return null;
        }

        // 次に取得するブロック番号を計算する
        var blockNumber = this.buffer.findNextBlockNumberLast(this.targetHadBlocks);

        if (blockNumber >= 0) {
            return blockNumber;
        }

        return null;
    }
} 