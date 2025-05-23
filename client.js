const sockv5 = require('socksv5')
const { io } = require('socket.io-client')
const dotenv = require('dotenv')
const shared = require('./shared_config');

dotenv.config();
// 配置部分
const PROXY_SERVER_URL = process.env.PROXY_SERVER || 'http://localhost:8080' // 代理服务器地址
const SOCKS_PORT = process.env.SOCKS_PORT || 1080 // 本地SOCKS5服务器端口
const SOCKS_HOST = process.env.SOCKS_HOST || 'localhost' // 本地SOCKS5服务器地址

console.log(`代理服务器: ${PROXY_SERVER_URL}`)
console.log(`SOCKS5服务器: ${SOCKS_HOST}:${SOCKS_PORT}`)

// 创建SOCKS5服务器
const sock_server = sockv5.createServer((info, accept, deny) => {
   // const clientId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  console.log(`新连接: ${info.dstAddr}:${info.dstPort}`)
  
    // 接受SOCKS连接
    const sockClient = accept(true)

    // 为新的客户端创建socket.IO 连接
    // 连接到代理服务器
    const socket = io(PROXY_SERVER_URL, {
      path: '/proxy',
    })

    // 为 Socket.IO 注册事件
    socket.on('connect', () => {
        console.log(`已连接到代理服务器, ID: ${socket.id}, 连接模式 ${socket.io.engine.transport.name}`)
    })

    socket.on('disconnect', (reason) => {
        console.log(`与代理服务器连接断开: ${reason || '未知原因'}`)
        
        // 断开 Sock 连接 
        sockClient.end();
    })

    // 处理服务器数据
    socket.on('server-data', (data) => {
        try {
            const decodedData = shared.sio_recv(data)
            sockClient.write(decodedData);
        } catch (err) {
            console.error('处理服务器数据时出错:', err)
        }
    })

    // 处理服务器错误
    socket.on('server-error', (data) => {
        console.error('服务器错误:', data.message)
    })

    // 处理服务器关闭连接
    socket.on('server-end', (data) => {
        console.log('服务器关闭连接:', data.message)
    })

    // 监听来自本地客户端的数据
    sockClient.on('data', (data) => {
      shared.sio_send('client-data', socket, data)
    })

    // 监听连接关闭
    sockClient.on('close', () => {

      console.log(`连接关闭 [${info.dstAddr}:${info.dstPort}]`)
      socket.disconnect();
    })

    // 监听连接错误
    sockClient.on('error', (err) => {
      console.error(`连接错误 [${info.dstAddr}:${info.dstPort}]:`, err.message)
      socket.disconnect();
    })

    // 所有操作已注册 发送请求
    socket.emit('client-set-conn', info.dstAddr, info.dstPort)
})

// 启动SOCKS5服务器
sock_server.listen(SOCKS_PORT, SOCKS_HOST, function() {
  console.log(`SOCKS5服务器监听在 ${SOCKS_HOST}:${SOCKS_PORT}`)
})

// 不需要认证
sock_server.useAuth(sockv5.auth.None())
