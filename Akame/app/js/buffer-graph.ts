/// <reference path="../../typings.d.ts" />

import $ = require('jquery');

import buffer = require('./http-buffer');
import block = require('./data-block');

// JQuery をグローバルへエクスポート
// jCanvas を require する時に window.jQuery が必要
interface JQueryWindow extends Window {
    jQuery: JQueryStatic;
}

(<JQueryWindow>window).jQuery = $;

// import で読み込むと、読み込んだモジュールに対して何らかの操作しないと、
// 最適化で require が消えてしまう。
declare var require: (name: string) => any;
require('jcanvas');

/**
 * バッファを可視化したグラフのクラス
 */
export class BufferGraph {
    public static DRAW_TIMER_MS = 100;
    public static SENT_COLOR = '#8CDDFF';
    public static COMPLETED_COLOR = '#EBE988';
    public static COMPLETED_BY_ORIGIN_COLOR = '#8CFF9D';

    private canvas: JQuery;
    private buffer: buffer.HttpBuffer;
    private width: number;

    /**
     * 縦横の正方形の個数
     */
    private rectLength: number;

    /**
     * 縦横の正方形の大きさ
     */
    private rectWidth: number;

    /**
     * 描画用タイマー
     */
    private drawTimerId: number;

    public constructor(private selector: string) {
        this.canvas = $(selector);
        this.width = this.canvas.width();
        this.drawTimerId = setInterval(() => { this.draw(); }, BufferGraph.DRAW_TIMER_MS);
    }

    /**
     * 描画するバッファーを設定する
     */
    public setBuffer(buffer:buffer.HttpBuffer): void {
        this.buffer = buffer;
        this.rectLength = this.computeRectLength(this.buffer.getBlockLength());
        this.rectWidth = this.computeRectWidth(this.rectLength);
    }

    /**
     * 描画するバッファーをクリア
     */
    public clearBuffer(): void {
        this.buffer = null;
        this.canvas.clearCanvas();
    }

    /**
     * 描画処理
     */
    private draw(): void {
        // バッファが存在しない場合
        if (!this.buffer) {
            return;
        }

        for (var i = 0; i < this.buffer.getBlockLength(); ++i) {
            if (this.buffer.hasBlock(i)) {
                this.canvas.drawRect({
                    fillStyle: this.getColor(this.buffer.getBlock(i)),
                    x: this.getRectX(i),
                    y: this.getRectY(i),
                    width: this.getRectWidthFixLast(i),
                    height: this.rectWidth,
                    fromCenter: false
                });
            }
        }
    }

    /**
     * 描画する正方形の個数を求める
     * n * n <= blockLength を満たす整数 n の中で、最も小さい値を返す
     * 
     * @param blockLength ブロックの総数
     */
    private computeRectLength(blockLength: number): number {
        for (var i = 1; i * i < blockLength; ++i) { }
        return i;
    }

    /**
     * 描画する正方形の大きさを求める
     */
    private computeRectWidth(rectLength: number): number {
        return Math.floor(this.width / rectLength);
    }


    /**
     * 描画する正方形の X 座標を求める
     */
    private getRectX(blockNumber: number): number {
        return (blockNumber % this.rectLength) * this.rectWidth;
    }

    /**
     * 描画する正方形の Y 座標を求める
     */
    private getRectY(blockNumber: number): number {
        var length = (blockNumber - blockNumber % this.rectLength) / this.rectLength;
        return length * this.rectWidth;
    }

    /**
     * 描画色を取得する
     */
    private getColor(dataBlock: block.DataBlock): string {
        if (dataBlock.sent) {
            return BufferGraph.SENT_COLOR;
        }

        else if (dataBlock.completed) {
            if (dataBlock.completedByOrigin) {
                return BufferGraph.COMPLETED_BY_ORIGIN_COLOR;
            }

            else {
                return BufferGraph.COMPLETED_COLOR;
            }
        }
    }

    /**
     * 右端のブロック補正を行った幅を取得する
     * 各ブロック幅を均等にしていると、右端でずれるため、調整する
     */
    private getRectWidthFixLast(blockNumber: number): number {
        // 右端のブロック
        if ((blockNumber + 1) % this.rectLength == 0) {
            return this.width - this.rectWidth * (this.rectLength - 1);
        }

        return this.rectWidth;
    }
}
