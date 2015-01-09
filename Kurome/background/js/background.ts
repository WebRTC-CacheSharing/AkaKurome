/// <reference path="../../typings.d.ts" />

// Name   : ヘルパー拡張機能 バックグラウンドページ
// License: MIT License
// Author : pine613<https://github.com/pine613>
// Copyright (C) 2014-2015 Pine Mizune.

import _ = require('underscore');

import headerInjector = require('./http-header-injector');
import global = require('../../../global');

/**
 * メインの拡張機能にメッセージを送る間隔
 */
var KEEP_ALIVE_INTERVAL: number = 1000;

/**
 * HTTP ヘッダを挿入するクラス
 */
var injector: headerInjector.HttpHeaderInjector = null;

/**
    * ホスト情報を受け取っているか
    */
var hasHostInfo: boolean = false;

/**
    * メインの拡張機能 (アプリ) が自動退避しないように、一定間隔でメッセージを送るメソッド
    */
function startSendingKeepAlive(): void {
    console.log('::startSendKeepAlive');

    setInterval(() => {
        var message: global.KeepAliveMessage = {
            type: 'keepAlive',
            needHostInfo: !hasHostInfo
        };

        chrome.runtime.sendMessage(global.MAIN_EXTENSION_ID, message);
    }, KEEP_ALIVE_INTERVAL);
}

/**
    * 他の拡張機能からメッセージを受け取った時の処理
    */
function onMessageExternal(
    message: global.Message,
    sender: chrome.runtime.MessageSender,
    sendResponse: (data: any) => void): void {

    console.log('::onMessageExternal');

    if (message.type == 'hostInfo') {
        var hostInfo = <global.HostInfoMessage>message;
        console.log(hostInfo);

        // ホスト情報を受け取った状態を保存
        hasHostInfo = true;

        // 既にインスタンスが生成されている場合、プロパティを書き換える
        if (injector) {
            injector.host = hostInfo.host;
            injector.port = hostInfo.port;
            injector.enabled = hostInfo.enabled;
        }

        // インスタンスが生成されていない場合、新規に生成
        else {
            injector = new headerInjector.HttpHeaderInjector(
                hostInfo.host, hostInfo.port, hostInfo.enabled);
        }

        // ブラックリストをクリア
        injector.clearBlackList();
    }

    // ブラックリストの受信
    else if (message.type == 'blackList') {
        var blackList = <global.BlackListMessage>message;
        console.log(blackList);

        if (injector) {
            injector.addBlockUrl(blackList.url);
        }

        // メイン拡張機能へ応答を返す
        // 応答確認後、メイン拡張機能でリダイレクト処理を行うため、必須
        sendResponse(null);
    }
}

/**
 * イベントを追加する
 */
function addEvents(): void {
    console.log('::addEvents');
    chrome.runtime.onMessageExternal.addListener(onMessageExternal);
}

startSendingKeepAlive();
addEvents();
