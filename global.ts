export var MAIN_EXTENSION_ID = 'gjfpooppigdbnojgpjhcbmlphmplomfo';
export var HELPER_EXTENSION_ID = 'chnomchpocolfpeolppjhnhlhlgpkogo';


export interface Message {
    type: string;
}

/**
    * P2P Web Proxy �̃z�X�g����\��
    */
export interface HostInfoMessage extends Message {
    host: string;
    port: number;
    enabled: boolean;
}

/**
    * P2P Web Proxy �̃��C���A�v�����I�����Ȃ����߂ɑ��郁�b�Z�[�W
    */
export interface KeepAliveMessage extends Message {
    needHostInfo?: boolean;
}

/**
    * P2P Web Proxy �̃u���b�N���X�g
    */
export interface BlackListMessage extends Message {
    url: string;
}

