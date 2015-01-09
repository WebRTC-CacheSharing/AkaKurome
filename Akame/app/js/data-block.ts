/// <reference path="../../typings.d.ts" />

// Name   : データブロックを表すクラス
// License: MIT License
// Author : pine613<https://github.com/pine613>
// Copyright (C) 2014-2015 Pine Mizune.

/**
 * データブロック
 */
export class DataBlock {
    public constructor(public blockSize: number) { }

    /**
     * 実際のデータ
     */
    public data: ArrayBuffer;

    /**
     * データが既にダウンロード済みであることを表す
     */
    public completed: boolean = false;

    /**
     * データがオリジナルソースからダウンロード済みであることを表す
     */
    public completedByOrigin: boolean = false;

    /**
     * ダウンロードを開始しているか表す
     */
    public started: boolean = false;

    /**
     * オリジナルソースからダウンロードを開始しているか表す
     */
    public startedByOrigin: boolean = false;

    /**
     * データがクライアントに送信済みであることを表す
     */
    public sent: boolean = false;

    /**
     * 最後のデータブロックであることを表す
     */
    public isLast: boolean = false;
}
