// Desc   : 2つの拡張機能に共通する定数とインターフェイスの定義
// License: MIT License
// Author : pine613<https://github.com/pine613>
// Copyright (C) 2014-2015 Pine Mizune.

/**
 * メイン拡張機能 (Akame) の ID
 */
export var MAIN_EXTENSION_ID = 'gjfpooppigdbnojgpjhcbmlphmplomfo';

/**
 * サブ拡張機能 (Kurome) の ID
 */
export var HELPER_EXTENSION_ID = 'chnomchpocolfpeolppjhnhlhlgpkogo';

/**
 * 拡張機能間メッセージの共通フォーマット
 */
export interface Message {
    type: string;
}

/**
 * P2P Web Proxy のホスト情報を表す
 */
export interface HostInfoMessage extends Message {
    host: string;
    port: number;
    enabled: boolean;
}

/**
 * P2P Web Proxy のメインアプリが終了しないために送るメッセージ
 */
export interface KeepAliveMessage extends Message {
    needHostInfo?: boolean;
}

/**
 * P2P Web Proxy のブラックリスト
 * (通信が失敗しため、直接接続でデータを取得する URL)
 */
export interface BlackListMessage extends Message {
    url: string;
}

