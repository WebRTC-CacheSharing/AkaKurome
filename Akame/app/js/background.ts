/// <reference path="../../typings.d.ts" />

// Desc   : サーバーの起動処理と、ヘルパー拡張機能との通信処理
// License: MIT License
// Author : pine613<https://github.com/pine613>
// Copyright (C) 2014-2015 Pine Mizune.

import _ = require('underscore');

import global = require('../../../global');

import server = require('./http-server');
import app = require('./app');


var httpServer: server.HttpServer;

var hostInfo: global.HostInfoMessage = {
    type: 'hostInfo',
    host: 'localhost',
    port: getServerPort(),
    enabled: true
};
    
/**
 * サーバーを開始する
 */
function startServer(): void {
    httpServer = new server.HttpServer();
    httpServer.listen('0.0.0.0', hostInfo.port);
}

/**
 * アプリケーションを開始する
 */
function startApp(lanchData: chrome.app.runtime.LaunchData): void {
    chrome.app.window.create('/app/html/app.html', {
        bounds: {
            width: 700,
            height: 600
        }
    }, win => {
            win.contentWindow.addEventListener('DOMContentLoaded', () => {

                var appWin = <app.AppContentWindow>win.contentWindow;
                var appArgs: app.AppArgs = {
                    httpServer: httpServer
                };

                appWin.startApp(appArgs);
            });
        });
}

/**
 * ホスト情報をヘルパー拡張機能へ送信
 */
function sendHostInfo(): void {
    chrome.runtime.sendMessage(global.HELPER_EXTENSION_ID, hostInfo);
}

/**
 * 他の拡張機能からメッセージを受け取った時の処理
 */
function onMessageExternal(
    message: global.Message,
    sender: chrome.runtime.MessageSender,
    sendResponse: (data: any) => void): void {

    if (message.type == 'keepAlive') {
        var keepAlive = <global.KeepAliveMessage>message;
            
        // ホスト情報を要求されている場合
        if (keepAlive.needHostInfo) {
            console.log(keepAlive);
            sendHostInfo();
        }
    }
}

/**
 * イベントを追加する
 */
function addEvents(): void {
    console.log('::addEvents');
    chrome.runtime.onMessageExternal.addListener(onMessageExternal);
    chrome.app.runtime.onLaunched.addListener(startApp);
}

/**
 * サーバーの起動ポートを乱数で決定する
 */
function getServerPort(): number {
    return 11000 + Math.floor(Math.random() * 100);
}

addEvents();
sendHostInfo();
startServer();
