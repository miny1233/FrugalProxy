const sockv5 = require('socksv5')
const socketio = require('socket.io')

const sock_server = sockv5.createServer((info, accept, deny) => {
    // 注意Addr不一定是IP地址，也有可能是域名
    console.log(`连接传入,请求连接位置: ${info.dstAddr} Port: ${info.dstPort}`);
    const sock_client = accept(true);

    sock_client.end();
})

sock_server.listen(1080, 'localhost', function() {
  console.log('SOCKS server listening on port 1080');
});

sock_server.useAuth(sockv5.auth.None());
