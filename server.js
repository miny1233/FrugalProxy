const { Server } = require('socket.io');
const http = require('http');
const net = require('net');
const dotenv = require('dotenv')
const shared = require('./shared_config')

dotenv.config();

console.log('正在启动服务端')

const port = process.env.port || 80;
const bind_ip = process.env.bind_ip || 'localhost';

// const http_server = http.createServer();
const io = new Server({
    pingTimeout: 60000,
    pingInterval: 500,
});
const conn_map = new Map();

io.on("connection", (socket) => {
    console.log(`connect event: from ${socket.id}`)

    socket.on("client-set-conn",(des_ip,des_port) => {
        
        console.log(`来自客户端的连接请求 ${des_ip}:${des_port}`)

        const client = net.createConnection({
            host: des_ip,
            port: des_port,
            timeout: 10000,
            noDelay: true,
        },() => {    
            console.log('成功连接到服务器')
            // 不等待延迟输入

            conn_map[socket.id] = client;
            
            // 监听来自目标服务器的数据
            client.on('data', (data) => {
                // 将目标服务器的数据转发给客户端
                shared.sio_send('server-data', socket, data);
            });
            
            // 监听目标服务器连接关闭
            client.on('end', () => {
                console.log(`目标服务器连接关闭: ${des_ip}:${des_port}`);
                delete conn_map[socket.id];

                client.end();
            });
        });

        //client.setNoDelay(true);

        client.on('error',(err)=> {
            console.log('连接失败！ 正在通知客户端断开');
            console.error(`连接错误: ${err.message}`);
            
            client.end();
        })
    })

    socket.on("client-data",async (data) => {
        
        const origin_data = shared.sio_recv(data);

        if (conn_map[socket.id] === undefined)
        {
            console.log(`[${socket.id}] 未与目标服务器连接，正在等待连接`);
        }

        // 由于nodejs的单线程异步，那么当有定义时一定完成了连接
        while (conn_map[socket.id] === undefined)
        {   
            await new Promise(timer => setTimeout(timer,1));
        }
        
        const client = conn_map[socket.id];
        client.write(origin_data);
    })

    socket.on("disconnect", (reason) => {
        console.log(`客户端断开连接: ${socket.id}, 原因: ${reason}`);
        
        // 关闭对应的目标服务器连接
        if(conn_map[socket.id]) {
            conn_map[socket.id].end();
            delete conn_map[socket.id];
        }
    })
})

process.on('uncaughtException', (err) => {
    console.error('未捕获的异常:', err);
});

//http_server.listen(port, bind_ip);
io.listen(port,{path: '/proxy'});
console.log(`正在监听 ${port}`);
