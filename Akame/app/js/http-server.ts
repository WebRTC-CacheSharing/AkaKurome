/// <reference path="../../typings.d.ts" />

import _ = require('underscore');

import socket = require('./client-socket');

export class HttpServer {
    /**
        * サーバーのソケット ID
        */
    private serverSocketId: number;

    /**
        * サーバーのアドレス
        */
    public address: string;

    /**
        * サーバーのポート番号
        */
    public port: number;

    /**
        * クライアントのソケットの配列
        */
    private clientSockets: socket.ClientSocket[] = [];

    public constructor() {
        if (_.isUndefined(chrome.sockets)) {
            console.error("manifest.json に tcpServer の権限が不足しています。");
        }
    }

    /**
        * サーバーのリクエスト待ち受け開始
        * @param address アドレス
        * @param port    ポート番号
        */
    public listen(address: string, port: number): void {
        this.address = address;
        this.port = port;

        chrome.sockets.tcpServer.create({ persistent: true }, (createInfo) => {
            this.serverSocketId = createInfo.socketId;
            console.log("#listen socketId = ", this.serverSocketId);

            chrome.sockets.tcpServer.listen(this.serverSocketId, address, port, (result) => {
                if (result < 0) {
                    console.error("Error: ", chrome.runtime.lastError.message);
                }

                else {
                    console.log('Listen succeed: address = ' + address + ', port = ' + port);
                }
            });
        });

        // 接続された時に発生するイベント
        chrome.sockets.tcpServer.onAccept.addListener(info => {
            this.onAccept(info.socketId, info.clientSocketId);
        });

        // データを受信した時に発生するイベント
        chrome.sockets.tcp.onReceive.addListener(info => {
            this.onReceive(info.socketId, info.data);
        });
    }

    /**
        * クライアントと通信中のソケットの一覧を得る
        */
    public getSockets(): socket.ClientSocket[] {
        return this.clientSockets;
    }

    /**
        * 接続された時に発生するイベントリスナ
        * @param socketId       サーバーのソケット ID
        * @param clientSocketId クライアントのソケット ID
        */
    private onAccept(serverSocketId: number, clientSocketId: number): void {
        console.log('#onAccept socketId = ', serverSocketId, ', clientSocketId = ', clientSocketId);

        if (this.serverSocketId == serverSocketId) {
            console.log('#onAccept accepted');

            // データの受信を開始
            // http://www.eisbahn.jp/yoichiro/2014/07/chrome-sockets-api-setpaused.html
            chrome.sockets.tcp.setPaused(clientSocketId, false);

            // ソケットを保存
            this.clientSockets[clientSocketId] = new socket.ClientSocket(this, clientSocketId);
        } 
    }

    /**
        * クライアントからデータを受信した時に発生するイベントリスナ
        */
    private onReceive(socketId: number, data: ArrayBuffer): void {
        console.log('#onReceive socketId = ', socketId);

        // ソケットが有効な場合
        if (this.clientSockets[socketId]) {
            this.clientSockets[socketId].onReceive(socketId, data);
        }
    }

    /**
     * クライアントの接続を終了する
     * クライアントとの接続を終了する際、クライアントクラスから呼び出される
     */
    public closeClient(soketId: number): void {
        console.log('#closeClient = ' + soketId);

        if (this.clientSockets[soketId]) {
            delete this.clientSockets[soketId];
        }
    }
}