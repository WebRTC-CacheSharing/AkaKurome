export var MAIN_EXTENSION_ID = 'gjfpooppigdbnojgpjhcbmlphmplomfo';
export var HELPER_EXTENSION_ID = 'chnomchpocolfpeolppjhnhlhlgpkogo';


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
    */
export interface BlackListMessage extends Message {
    url: string;
}

