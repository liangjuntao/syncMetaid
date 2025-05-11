module.exports = {
  mnemonic: '', // 单号，用地址
  derivationPaths: [
    "m/44'/10001'/0'/0/1"
    ],
  protocolId: '1EhQVrKgCzBGfRmMKRPmd2T9LjnFv4r9Kq', // 协议ID，这里作为节点的host地址
  //1EhQVrKgCzBGfRmMKRPmd2T9LjnFv4r9Kq 另一个节点
  protocolPaths: {
    post: ':/protocols/simplebuz',
    comment: ':/protocols/paycomment',
    like: ':/protocols/paylike',
    name: '/info/name',
    avatar: '/info/avatar'
  }
};

// 链节点与RPC配置信息
module.exports.MVC_STARTING_BLOCK_HEIGHT = 86500;
module.exports.MVC_RPC_HOST = "http://47.242.24.63:9882";
module.exports.MVC_RPC_USER = "showpay";
module.exports.MVC_RPC_PASSWORD = "showpay88..";
module.exports.MVC_ZMQPUBRAWTX  = "tcp://47.242.24.63:15555";
// 广播方式配置，可选 'api' 或 'rpc'
module.exports.MVC_BROADCAST_TYPE = 'rpc';
// 如有BTC等其他链节点配置，也可一并放在此处 