const sockv5 = require('socksv5')
const { io } = require('socket.io-client')
const dotenv = require('dotenv')

dotenv.config();
// 配置部分
const PROXY_SERVER_URL = process.env.PROXY_SERVER || 'http://localhost:80' // 代理服务器地址
const SOCKS_PORT = process.env.SOCKS_PORT || 1080 // 本地SOCKS5服务器端口
const SOCKS_HOST = process.env.SOCKS_HOST || 'localhost' // 本地SOCKS5服务器地址

console.log(`代理服务器: ${PROXY_SERVER_URL}`)
console.log(`SOCKS5服务器: ${SOCKS_HOST}:${SOCKS_PORT}`)

// 连接映射 - 使用对象而不是Map，因为要使用socket.id作为键
const activeConnections = {}

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
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    })
    
    /* 将连接保存到映射中
    activeConnections[clientId] = {
      socket: sockClient,
      socketId: socket.id, // 保存当前socket.id
      target: {
        host: info.dstAddr,
        port: info.dstPort
      }
    }*/

    // 为 Socket.IO 注册事件
    socket.on('connect', () => {
        console.log(`已连接到代理服务器, ID: ${socket.id}`)
    })

    socket.on('disconnect', (reason) => {
        console.log(`与代理服务器连接断开: ${reason || '未知原因'}`)
        
        // 断开 Sock 连接
        sockClient.end();
    })

    // 处理服务器数据
    socket.on('server-data', (data) => {
        try {
            const decodedData = Buffer.from(data.data, 'base64')
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


    // 向代理服务器发起连接请求
    socket.emit('client-set-conn', info.dstAddr, info.dstPort)

    // 监听来自本地客户端的数据
    sockClient.on('data', (data) => {
      // 将数据发送到代理服务器
      socket.emit('client-data', data)
    })

    // 监听连接关闭
    sockClient.on('close', () => {
      console.log(`连接关闭 [${info.dstAddr}:${info.dstPort}]`)
      // delete activeConnections[clientId]
      // 一并关闭socket.io
      socket.disconnect();
    })

    // 监听连接错误
    sockClient.on('error', (err) => {
      console.error(`连接错误 [${info.dstAddr}:${info.dstPort}]:`, err.message)
      socket.disconnect();
    })
})

// 启动SOCKS5服务器
sock_server.listen(SOCKS_PORT, SOCKS_HOST, function() {
  console.log(`SOCKS5服务器监听在 ${SOCKS_HOST}:${SOCKS_PORT}`)
})

// 不需要认证
sock_server.useAuth(sockv5.auth.None())

// 优雅退出处理
process.on('SIGINT', () => {
  console.log('正在关闭...')
  Object.values(activeConnections).forEach(conn => {
    if (conn.socket && !conn.socket.destroyed) {
      conn.socket.end()
    }
  })
  socket.disconnect()
  sock_server.close(() => {
    console.log('SOCKS5服务器已关闭')
    process.exit(0)
  })
})
