/// <reference path="../../typings.d.ts" />

// Desc   : ダウンロード状態を可視化するアプリケーション
// License: MIT License
// Author : pine613<https://github.com/pine613>
// Copyright (C) 2014-2015 Pine Mizune.

import _ = require('underscore');
import $ = require('jquery');

import server = require('./http-server');
import client = require('./client-socket');
import graph = require('./buffer-graph');

var SERVER_ADDR_SELECTOR = '#server-addr';
var SERVER_PORT_SELECTOR = '#server-port';

var SOCKET_SELECT_SELECTOR = '#sockets';
var POLLING_TIMER_MS = 100;

export interface AppArgs {
    httpServer: server.HttpServer;
}

export interface AppContentWindow extends Window {
    startApp(args: AppArgs): void;
}

/**
 * アプリケーションが開始しているか否か
 */
var isAppStarted = false;

var pollingTimerId: number;
var httpServer: server.HttpServer;
var socketsPrev: client.ClientSocket[] = [];
var bufferGraph: graph.BufferGraph;
var currentSocketId: number;

/**
 * アプリケーションを開始する
 * バックグラウンドからの引数で開始する
 */
function startApp(args: AppArgs): void {
    if (!isAppStarted) {
        isAppStarted = true;

        httpServer = args.httpServer;
        bufferGraph = new graph.BufferGraph('canvas');

        pollingTimerId = setInterval(() => {
            socketsPolling();
        }, POLLING_TIMER_MS);

        $(SOCKET_SELECT_SELECTOR).change(changeSocket);

        $(SERVER_PORT_SELECTOR).text(httpServer.port);
        $(SERVER_ADDR_SELECTOR).text(httpServer.address);
    }
}

/**
 * 情報を更新する
 */
function update(): void {
    console.log('::update');

    var sockets = _.compact(httpServer.getSockets());
    var select = $(SOCKET_SELECT_SELECTOR);

    select.empty();

    _.each(sockets, socket => {
        if (socket.targetUrl) {
            var text = socket.targetUrl;
        }

        else {
            var text = 'SoketId = ' + socket.socketId;
        }

        $('<option />')
            .text(text)
            .val(socket.socketId.toString())
            .appendTo(select);
    });

    // 現在描画しているソケットが終了していないか調べる
    if (currentSocketId) {
        if (!sockets[currentSocketId]) {
            bufferGraph.clearBuffer();
        }
    }
}

/**
 * 選択しているソケットが変更された際の処理
 */
function changeSocket(): void {
    // Socket ID を取得
    var socketId = parseInt($(SOCKET_SELECT_SELECTOR).val(), 10);
    if (!socketId) {
        return;
    }

    currentSocketId = socketId;

    // バッファを設定
    var sockets = httpServer.getSockets();
    if (sockets[socketId]) {
        var buffer = sockets[socketId].getBuffer();

        if (buffer) {
            bufferGraph.setBuffer(buffer);
        }

        else {
            bufferGraph.clearBuffer();
        }
    }
}

/**
 * ソケット情報が更新されていないかポーリングを行う
 */
function socketsPolling(): void {
    var sockets = httpServer.getSockets();
        
    // 変更を検出する
    if (!_.isEqual(socketsPrev, sockets)) {
        // clone しないと、同一インスタンスなため、配列の変更を検出できない
        socketsPrev = _.clone(sockets);
        update();
    }
}

/*
 * バックグラウンドページからアクセスする関数
 * モジュールとしてではなく、グローバル (window) にエクスポートする
 */
(<AppContentWindow>window).startApp = startApp;