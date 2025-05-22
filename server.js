const { Server } = require('socket.io');
const http = require('http')
const net = require('net')
const dotenv = require('dotenv')

dotenv.config();

console.log('正在启动服务端')

const port = process.env.port || 80;
const bind_ip = process.env.bind_ip || 'localhost';

const http_server = http.createServer();
const io = new Server(http_server, {path: '/proxy'});
const conn_map = new Map();

io.on("connection", (socket) => {
    console.log(`connect event: from ${socket.id}`)

    socket.on("client-set-conn",(des_ip,des_port) => {
        
        const client = net.createConnection({
            host: des_ip,
            port: des_port,
            timeout: 1000,
        },() => {    
            console.log('成功连接到服务器')
            conn_map[socket.id] = client;
            
            // 监听来自目标服务器的数据
            client.on('data', (data) => {
                // 将目标服务器的数据转发给客户端
                socket.emit('server-data', {
                    clientId: socket.id,
                    data: data.toString('base64') // 转为base64发送
                });
            });
            
            // 监听目标服务器连接关闭
            client.on('end', () => {
                console.log(`目标服务器连接关闭: ${des_ip}:${des_port}`);
                delete conn_map[socket.id];

                client.end();
                // socket.emit('server-end', { message: '目标服务器关闭连接' });
            });
        });

        client.on('error',(err)=> {
            console.log('连接失败！ 正在通知客户端断开');
            console.error(`连接错误: ${err.message}`);
            
            client.end();
            //socket.emit('disconnect', '连接目标服务器失败');
        })
    })

    socket.on("client-data",async (data) => {
        
        // 由于nodejs的单线程异步，那么当有定义时一定完成了连接
        while (conn_map[socket.id] === undefined)
        {   
            console.log('未与目标服务器连接，正在等待连接');
            await new Promise(timer => setTimeout(timer,50));
        }
        
        /* 再次检查连接是否存在
        if(conn_map[socket.id] === undefined) {
            console.log('连接仍不存在，无法发送数据');
            socket.emit('server-error', { message: '未能建立到目标服务器的连接' });
            return;
        } */
        
        const client = conn_map[socket.id];
        client.write(data);
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

http_server.listen(port, bind_ip);
console.log(`正在监听 ${port}`);
