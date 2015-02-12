/// <reference path="../../typings.d.ts" />

import _ = require('underscore');
import wurl = require('wurl');
import $ = require('jquery');

interface SignalingResponse {
    file: {
        path: string;
        peers: string[];
    };
}

export class SignalingClient {
    /**
     * シグナリングサーバーのデフォルトポート
     */
    public static DEFAULT_PORT = 80;

    private signalingHost: string;
    private signalingPort: number;

    public constructor(private signalingSetting: string) {
        this.signalingHost = wurl('hostname', signalingSetting);
        this.signalingPort = parseInt(wurl('port', signalingSetting), 10) || SignalingClient.DEFAULT_PORT;

    }

    public sendPeerId(peerId: string, path: string, cb?: (err?: any, peers?: string[]) => void): void {
        console.log(this.createUrl(peerId, path));

        $.ajax(
            this.createUrl(path, peerId),
            {
                type: 'POST'
            })
            .done((data: SignalingResponse, textStatus: any) => {
                if (data && data.file) {
                    if(cb) return cb(null, data.file.peers);
                }

                if (cb) cb('File data not found');
            })
            .fail(() => {
                if (cb) cb('Can\'t send my peer id');
            });
    }

    public sendDeletePeerId(peerId: string, path: string, cb?: () => void): void {
        $.ajax(
            this.createUrl(path, peerId),
            {
                type: 'DELETE'
            })
            .done((data: any, textStatus: string) => {
                if (cb) cb();
            });
    }

    private createUrl(path: string, peerId?: string): string {
        var url = 'http://' + this.signalingHost + ':' + this.signalingPort +
            '/peers?path=' + path

        if (peerId) {
            url += '&peerId=' + peerId;
        }

        return url;
    }
}