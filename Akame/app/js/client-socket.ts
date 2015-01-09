/// <reference path="../../typings.d.ts" />

// Name   : HTTP クライアントのソケットを表すクラス
// License: MIT License
// Author : pine613<https://github.com/pine613>
// Copyright (C) 2014 Pine Mizune.

import _ = require('underscore');
import _s = require('underscore.string');
import parser = require('http-string-parser');
import wurl = require('wurl');
import Peer = require('peerjs');

import global = require('../../../global');

import client = require('./http-client');
import server = require('./http-server');
import buffer = require('./http-buffer');
import block = require('./data-block');
import converter = require('./utf8-converter');
import peerjsSocket = require('./peerjs-socket');

import downloader = require('./downloader');
import httpDownloader = require('./downloader-used-http');
import peerjsDownloader = require('./downloader-peerjs');


export class ClientSocket {

    /**
        * サーバーへのリクエスト
        */
    private request: parser.ParseRequestResult;

    /**
        * 取得する URL
        */
    public targetUrl: string;

    /**
        * 取得するデータのバイト数
        */
    private targetBytes: number;

    /**
        * 取得するデータの Content-Type
        */
    private contentType: string;

    /**
        * HTTP クライアント
        */
    private httpClient: client.HttpClient = new client.HttpClient();

    /**
        * HTTP バッファ
        */
    private httpBuffer: buffer.HttpBuffer;

    /**
        * HTTP を用いたダウンローダー
        */
    private downloaders: downloader.Downloader[] = [];
        
    /**
        * 終了していることを表す
        */
    private closed: boolean = false;

    /**
     * PeerJS の設定
     */
    private peerjsSettings: peerjsSocket.PeerjsSettings;

    /**
     * シグナリングサーバーとのコネクション
     */
    private signalingSocket: peerjsSocket.PeerjsSignalingSocket;

    /**
        * クライアントソケットを初期化
        * @param server  元となる HTTP サーバー
        * @param soketId クライアントとのソケット ID
        */
    constructor(
        private server: server.HttpServer,
        public socketId: number
        ) { }

    /**
        * クライアントからデータを受信した時に発生するイベントリスナ
        * HTTP サーバークラスから呼び出される
        */
    public onReceive(socketId: number, data: ArrayBuffer): void {
            
        // リクエストを解析
        this.request = this.parseRequest(data);

        // GET リクエスト以外は弾く
        if (this.request.method != 'GET') {
            this.sendMethodNotAllowed();
            return;
        }

        // 取得する URL
        this.targetUrl = this.parseTargetUrl(this.request.uri);

        // 取得できない場合、エラー
        if (!this.targetUrl) {
            this.sendBadRequest();
            return;
        }

        // WebRTC の設定を取得
        this.peerjsSettings = this.parsePeerjsSettings(this.request.uri);

        this.startDownloading();
    }

    public getBuffer(): buffer.HttpBuffer {
        return this.httpBuffer;
    }

    /**
        * HTTP ヘッダを送信する
        */
    private sendHttpHeaders(cb: (err?: string) => void): void {
        var headers = [
            'HTTP/1.1 200 OK',
            'Content-Type: ' + this.contentType,
            'Content-Length: ' + this.targetBytes,
            'Connection: close',
            'Accept-Ranges: none'
        ];

        this.send(this.createHttpResponse(headers, ''), cb);
    }

    /**
        * データをダウンロードを開始する
        */
    private startDownloading(): void {
        // データサイズを取得
        this.getHeaders((err) => {
            // エラーが発生した場合、リダイレクト
            if (err) {
                console.error(err);
                this.blockAndRedirect(this.targetUrl);
                return;
            }

            // データサイズを保存
            console.log('dataSize = ' + _s.numberFormat(this.targetBytes) + 'bytes');

            // データバッファを作成
            this.httpBuffer = new buffer.HttpBuffer(
                this.targetBytes,
                _.bind(this.receiveDataBlockCallback, this)
                );

            // ダウンロードを開始
            this.sendHttpHeaders((err) => {
                if (err) {
                    console.error(err);
                    this.blockAndRedirect(this.targetUrl);
                    return;
                }

                this.startDownloadingByOrigin();
                this.startDownloadingPeerjs();
//                    this.startDownloadingOtherHostTest();

            });
        });

    }

    /**
        * データサイズを取得する
        */
    private getHeaders(cb: (err: string) => void): void {
        this.httpClient.getHeaders(this.targetUrl, (err, headers) => {
            console.log(headers);

            // エラー発生時
            if (err) {
                return cb(err);
            }

            // 長さを解析
            var length = this.httpClient.getContentLengthFromContentRangeHeader(
                headers['Content-Range']
                );
            this.targetBytes = length;

            var contentType = headers['Content-Type'];
            this.contentType = contentType;

            if (length > 0 && contentType) {
                cb(null);
                return;
            }

            // 長さが存在しない場合
            console.log('Not Found Content-Length header');
            cb('Not Found Content-Length header');
        });
    }

    /**
        * オリジナルソースからのダウンロードを開始する
        */
    private startDownloadingByOrigin(): void {
        var downloader = new httpDownloader.DownloaderByOrigin(
            this.targetUrl,
            this.httpBuffer,
            this.httpClient
            );
        downloader.start();
        this.downloaders.push(downloader);
    }

    /**
        * 同一パスを他のホストから読み込む (並列ダウンロードテスト)
        */
    private startDownloadingOtherHostTest(): void {
        var newPorts = [10082, 10083, 10084];

        _.each(newPorts, newPort => {
            var port = wurl('port', this.targetUrl);
            var newUrl = '' + this.targetUrl;

            newUrl.replace(port, newPort.toString());

            var downloader = new httpDownloader.DownloaderUsedHttp(
                this.targetUrl,
                this.httpBuffer,
                this.httpClient
                );
            downloader.start();
            this.downloaders.push(downloader);
        });
    }

    /**
     * PeerJS からのダウンロードを開始する
     */
    private startDownloadingPeerjs(): void {
        this.signalingSocket = new peerjsSocket.PeerjsSignalingSocket(
            this.targetUrl, this.peerjsSettings,
            this.httpBuffer
            );

        var downloader = new peerjsDownloader.DownloaderPeerjs(
            this.targetUrl,
            this.httpBuffer,
            this.signalingSocket
            );

        downloader.start();
        this.downloaders.push(downloader);
    }

    /**
        * データバッファからのコールバック関数
        */
    private receiveDataBlockCallback(dataBlock: block.DataBlock, cb: (err: string) => void): void {
        //console.log(dataBlock);

        if (dataBlock.isLast) {
            this.send(dataBlock.data, (err) => {
                if (err) {
                    console.error(err);
                    cb(err);
                    return;
                }
                    
                this.close();
            });
        }
        else {
            this.send(dataBlock.data, (err) => {
                //console.log('sended');

                cb(err);
            });
        }
    }

    /**
        * エラー発生のため、P2P Web Proxy を無効化しリダイレクトを行う
        */
    private blockAndRedirect(loc: string): void {
        console.log('#blockAndRedirect url = ' + loc);

        this.addBlackList(loc, () => {
            this.redirect(loc);
        });
    }

    /**
        * リダイレクトを行う
        */
    private redirect(location: string): void {
        this.sendSeeOther(location);
    }

    /**
        * リクエストを解析
        */
    private parseRequest(data: ArrayBuffer): parser.ParseRequestResult {
        var httpRequestString = converter.Utf8Converter.ArrayBufferToString(data);
        console.log(httpRequestString);

        var httpRequest = parser.parseRequest(httpRequestString);
        console.log(httpRequest);

        return httpRequest;
    }

    /**
        * ターゲットとなる URL を取得する
        */
    private parseTargetUrl(originUrl: string): string {
        // サーバー側内部インターフェイスのエンドポイント以外を弾く
        if (wurl('path', originUrl) != '/') {
            return null;
        }

        // 取得する URL
        var targetUrl = wurl('?url', originUrl);
        if (!targetUrl) { return null; }

        // URL エンコードを解除
        targetUrl = decodeURIComponent(targetUrl);
        console.log('targetUrl = ' + targetUrl);

        return targetUrl;
    }

    /**
     * PeerJS の設定をパースする
     */
    
    private parsePeerjsSettings(originUrl: string): peerjsSocket.PeerjsSettings {
        var query = wurl('?webrtc', originUrl);

        if (!query) {
            return null;
        }

        // 形式:
        // PeerJS 0.peerjs.com localhost:1337
        var settings = decodeURIComponent(query).split(' ');

        // 未対応の形式
        if (settings[0] !== 'PeerJS') {
            return null;
        }

        // WebRTC の設定を生成
        var webrtc = {
            host: settings[1],
            signalingHost: settings[2]
        };

        if (webrtc.host && webrtc.signalingHost) {
            return webrtc;
        }

        return null;
    }

    /**
        * メッセージのみのレスポンスを返し、通信を終了する
        */
    private sendMessage(
        status: number,
        statusText: string,
        message: string,
        optionHeaders: string[] = []
        ): void {
        // レスポンス内容
        var body = this.createMessageHtml(message);

        // レスポンスヘッダ
        var headers = [
            'HTTP/1.1 ' + status + ' ' + statusText,
            'Content-Type: text/html; charset=utf-8',
            'Connection: close'
        ].concat(optionHeaders);

        this.sendAndClose(this.createHttpResponse(headers, body));
    }
    /**
        * レスポンスを送信する
        */
    private send(response: ArrayBuffer, cb?: (err?: string) => void): void {
        // ソケットが既に閉じられている場合
        if (this.closed) {
            cb('Socket has been closed!!');
            return;
        }

        // 送信処理
        chrome.sockets.tcp.send(this.socketId, response, info => {
            if (info.resultCode < 0) {
                var err = chrome.runtime.lastError.message;
                console.error('Error: ', err);

                // ソケットが既に閉じられている場合
                if (err == 'net::ERR_SOCKET_NOT_CONNECTED') {
                    this.close();
                }

                if (cb) { cb(err); }
                    
                return;
            }

            if (cb) { cb(); }
        });
    }

    /**
        * レスポンスを送信し、通信を終了する
        */
    private sendAndClose(response: ArrayBuffer): void {
        chrome.sockets.tcp.send(this.socketId, response, info => {
            if (info.resultCode < 0) {
                console.error('Error: ', chrome.runtime.lastError.message);
            }

            this.close();
        });
    }

    /**
        * リクエストを終了する
        * 終了時に必ず呼び出してください
        * 何度呼び出してもエラーが発生しないように設計されています
        */
    private close(): void {
        this.closed = true;

        try {
            chrome.sockets.tcp.disconnect(this.socketId);
            chrome.sockets.tcp.close(this.socketId);
        } catch (e) { }

        if (this.downloaders) {
            for (var i = 0; i < this.downloaders.length; ++i) {
                this.downloaders[i].stop();
                delete this.downloaders[i];
            }

            this.downloaders = undefined;
        }

        if (this.httpBuffer) {
            this.httpBuffer.clear();
            this.httpBuffer = undefined;
        }

        /*
        if (this.signalingSocket) {
            this.signalingSocket.close();
        }*/

        this.server.closeClient(this.socketId);
    }

    /**
        * レスポンスを生成する
        */
    private createHttpResponse(headers: string[], body: string): ArrayBuffer {
        var httpResponseString = headers.join('\r\n') + '\r\n\r\n' + body;
//        console.log(httpResponseString);

        var httpResponse = converter.Utf8Converter.StringToArrayBuffer(httpResponseString);

        return httpResponse;
    }

    /**
     * ブラックリストをヘルパー拡張機能に送信する
     * @param loc ブラックリストに追加する URL
     */
    private addBlackList(loc: string, success?: () => void): void {
        var message: global.BlackListMessage = {
            type: 'blackList',
            url: loc
        };

        chrome.runtime.sendMessage(
            global.HELPER_EXTENSION_ID, message,
            () => {
                if (success) {
                    success();
                }
            });
    }

    /**
        * メッセージのみを含む HTML を生成する (HTML5)
        * 
        * @param message メッセージ
        */
    private createMessageHtml(message: string): string {
        var html = '';

        html += '<!DOCTYPE html>';
        html += '<html>';
        html += '<head>';
        html += '<meta charset="utf-8">';
        html += '<title>' + message + '</title>';
        html += '</head>';
        html += '<body>';
        html += '<p>' + message + '</p>';
        html += '</body>';
        html += '</html>';

        return html;
    }

    /**
     * 303 See Other を返し、転送を行う
     */
    private sendSeeOther(location: string): void {
        this.sendMessage(303, 'See Other', '303 See Other', ['Location: ' + location]);
    }

    /**
     * 400 Bad Request を返し、通信を終了する
     */
    private sendBadRequest(): void {
        this.sendMessage(400, 'Bad Request', '400 Bad Request');
    }

    /**
     * 404 Not Found を返し、通信を終了する
     */
    private sendNotFound(): void {
        this.sendMessage(404, 'Not Found', '404 Not Found');
    }

    /**
     * 405 Method Not Allowed を返し、通信を終了する
     */
    private sendMethodNotAllowed(): void {
        this.sendMessage(405, 'Method Not Allowed', '405 Method Not Allowed');
    }
}
