export default {
  mnemonic: '...',
  derivationPaths: [
    "m/44'/10001'/0'/0/5",
    "m/44'/10001'/0'/0/6"
    ],
  protocolId: '1EhQVrKgCzBGfRmMKRPmd2T9LjnFv4r9Kq', // 协议ID，这里作为节点的host地址
  //1EhQVrKgCzBGfRmMKRPmd2T9LjnFv4r9Kq 另一个节点
  //1FdityKmBAWVrmEm7mavajCGBwj5jHmVDR 
  protocolPaths: {
    post: ':/protocols/simplebuz',
    comment: ':/protocols/paycomment',
    like: ':/protocols/paylike'
  }
}; 