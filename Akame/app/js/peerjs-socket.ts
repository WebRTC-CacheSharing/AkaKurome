/// <reference path="../../typings.d.ts" />

import _ = require('underscore');
import wurl = require('wurl');
import Peer = require('peerjs');

import util = require('./peerjs-utility');
import digest = require('./digest');
import signaling = require('./signaling-client');
import idList = require('./peerjs-id-list');
import dataConn = require('./peerjs-data-connection');
import buffer = require('./http-buffer');

export interface PeerjsSettings {
    /**
        * PeerJS の中央サーバー
        */
    host: string;

    /**
        * ID 管理用のシグナリングサーバー
        * ポート番号も含む
        * 例: localhost:1337
        */
    signalingHost: string;
}



export class PeerjsSignalingSocket {
    public static PEERJS_DEFAULT_PORT = 9000;

    public peerjsHost: string;
    public peerjsPort: number;
    public peerjsKey: string;
    public peerjsId: string;
    public peerjsConnection: PeerJs.Peer;

    public peerjsDataConnections: { [key: string]: PeerJs.DataConnection } = {};
    public peerjsDataConnWrappers: { [key: string]: dataConn.PeerjsDataConnectionWrapper } = {};

    public signalingSocket: signaling.SignalingClient;

    public targetPeerjsIds: string[] = [];
    public targetHash: string;

    private buffer: buffer.HttpBuffer;

    constructor(public targetUrl: string, settings: PeerjsSettings, buffer: buffer.HttpBuffer) {
        this.peerjsHost = wurl('hostname', settings.host);
        this.peerjsPort = parseInt(wurl('port', settings.host), 10) || PeerjsSignalingSocket.PEERJS_DEFAULT_PORT;
        this.peerjsKey = wurl('user', settings.host);

        this.buffer = buffer;

        this.signalingSocket = new signaling.SignalingClient(settings.signalingHost);
        this.connectPeerjs();
    }


    public startDownload() {
        _.each(this.peerjsDataConnWrappers, conn => {
            conn.startDownload();
        });
    }

    public close() {
        console.log('PeerjsSignalingSocket#close');

        this.targetHashHelper(hash => {
            this.signalingSocket.sendDeletePeerId(this.peerjsId, hash);
        });
    }

    /**
        * URL のハッシュを計算済みな状態にしてコールバックする
        */
    private targetHashHelper(cb: (hash: string) => void) {

        // 既に計算済みな場合
        if (this.targetHash) {
            return cb(this.targetHash);
        }

        new digest.SHA256().hexdigest(this.targetUrl, hash => {
            this.targetHash = hash;
            cb(hash);
        });
    }

    /**
     * PeerJS へ接続する
     */
    private connectPeerjs(): void {
        var peer = this.createPeerjsConnection();

        peer.on('error', util.onError);
        peer.on('open', this.onOpen.bind(this));
        peer.on('connection', this.onConnect.bind(this));

        this.peerjsConnection = peer;
    }
    
    private connectOtherPeers(): void {
        _.each(this.targetPeerjsIds, peerId => {
            var myIdList = idList.PeerjsIdList.getMyIdList();

            // 自分自身には接続しない
            if (myIdList.has(this.peerjsHost, this.peerjsPort, peerId)) {
                return;
            }

            // 既に接続が存在する場合は行わない
            if (this.peerjsDataConnections[peerId]) {
                  return;
            }

            console.log('Connect: id = ' + peerId);

            var conn = this.peerjsConnection.connect(peerId);
            this.peerjsDataConnections[peerId] = conn;
           
            conn.on('open', () => {
                console.log('Opened: id = ' + conn.peer);

                conn.send('HELLO');
                this.peerjsDataConnWrappers[peerId] = new dataConn.PeerjsDataConnectionWrapper(conn, this.buffer);
            });
        });
    }

    /**
        * 他のピアからの接続された時の処理
        */
    private onConnect(conn: PeerJs.DataConnection):void {
        console.log('Connected: ', conn);

        // 既に接続がある場合は、処理しない
//        console.log(this.peerjsDataConnections);
 //       if (this.peerjsDataConnections[conn.peer]) {
//                return;
       // }

//        this.peerjsDataConnections[conn.peer] = conn;

            
        conn.on('data', (data) => {
            console.log(data);
//            console.log(Utf8Converter.ArrayBufferToString(data.foo));
        });

        this.peerjsDataConnections[conn.peer] = conn;
        this.peerjsDataConnWrappers[conn.peer] = new dataConn.PeerjsDataConnectionWrapper(conn, this.buffer);
    }

    /**
     * PeerJS との接続が確立され、ID を取得した時に呼ばれる処理
     */
    private onOpen(id: string): void {
        console.log('Opened: id = ' + id);

        this.peerjsId = id;

        var myIdList = idList.PeerjsIdList.getMyIdList();
        myIdList.add(this.peerjsHost, this.peerjsPort, id);

        this.targetHashHelper(hash => {
            this.signalingSocket.sendPeerId(hash, this.peerjsId, (err, peers) => {
                if (err) {
                    console.error(err);
                    return;
                }

                console.log('Send PeerId: id = ' + this.peerjsId);
                this.targetPeerjsIds = peers;
                this.connectOtherPeers();
            });
        });
    }

    private createPeerjsConnection(): PeerJs.Peer {
        return new Peer({
            host: this.peerjsHost,
            port: this.peerjsPort,
            key: this.peerjsKey
        });
    }
}
