export default {
  mnemonic: '',
  derivationPaths: [
    "m/44'/10001'/0'/0/1",
    "m/44'/10001'/0'/0/2",
    "m/44'/10001'/0'/0/3", 
    "m/44'/10001'/0'/0/4",
    "m/44'/10001'/0'/0/5",
    "m/44'/10001'/0'/0/6",
    "m/44'/10001'/0'/0/7",
    "m/44'/10001'/0'/0/8",
    "m/44'/10001'/0'/0/9",
    "m/44'/10001'/0'/0/10"
    ],
  protocolId: '1EhQVrKgCzBGfRmMKRPmd2T9LjnFv4r9Kq', // 协议ID，这里作为节点的host地址
  //1EhQVrKgCzBGfRmMKRPmd2T9LjnFv4r9Kq 另一个节点
  //1FdityKmBAWVrmEm7mavajCGBwj5jHmVDR 
  protocolPaths: {
    post: ':/protocols/simplebuz',
    comment: ':/protocols/paycomment',
    like: ':/protocols/paylike',
    name: '/info/name',
    avatar: '/info/avatar'
  }
}; 

// 链节点与RPC配置信息
export const MVC_STARTING_BLOCK_HEIGHT = 86500;
export const MVC_RPC_HOST = "http://47.242.24.63:9882";
export const MVC_RPC_USER = "showpay";
export const MVC_RPC_PASSWORD = "showpay88..";
export const MVC_ZMQPUBRAWTX  = "tcp://47.242.24.63:15555";
// 广播方式配置，可选 'api' 或 'rpc'
export const MVC_BROADCAST_TYPE = 'rpc';
// 如有BTC等其他链节点配置，也可一并放在此处 