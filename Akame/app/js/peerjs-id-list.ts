import _ = require('underscore');

/**
    * PeerJS の ID の一覧を管理するクラス
    */
export class PeerjsIdList {
    private peerIds: { [key: string]: string[] } = {};

    /**
        * Singleton のインスタンス
        */
    private static myIdList: PeerjsIdList = null;

    /**
        * Singleton の実装
        */
    public static getMyIdList() {
        if (!PeerjsIdList.myIdList) {
            PeerjsIdList.myIdList = new PeerjsIdList();
        }

        return PeerjsIdList.myIdList;
    }

    constructor() { }

    /**
        * ID を追加する
        */
    public add(host: string, port: number, id: string): void {
        var key = this.createKey(host, port);

        if (this.peerIds[key]) {
            if (!_.contains(this.peerIds[key], id)) {
                this.peerIds[key].push(id);
            }
        }

        else {
            this.peerIds[key] = [id];
        }
    }

    /**
        * ID が一覧にあるか返す
        */
    public has(host: string, port: number, id: string): boolean {
        var key = this.createKey(host, port);
        return _.contains(this.peerIds[key], id);
    }

    /**
        * ID を一覧から削除する
        */
    public remove(host: string, port: number, id: string): void {
        var key = this.createKey(host, port);
        this.peerIds[key] = _.without(this.peerIds[key], id);
    }

    /**
        * 連想配列で用いるキーを生成する
        */
    private createKey(host: string, port: number): string {
        return host + ':' + port;
    }
}