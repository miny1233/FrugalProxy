const { Server } = require('socket.io');
const net = require('net')

console.log('正在启动服务端')

const port = process.env.port || 80;

const io = new Server({});
const conn_map = new Map();

io.on("connection", (socket) => {
    console.log(`connect event: from ${socket.id}`)

    socket.on("client-set-conn",(des_ip,des_port) => {
        
        const client = net.createConnection({
            host: des_ip,
            port: des_port,
        },() => {    
            console.log('成功连接到服务器')
            conn_map[socket.id] = client;
        });

        client.on('error',()=> {
            console.log('连接失败！ 正在通知客户端断开');

            socket.emit('disconnect', '连接目标服务器失败');
        })
    })

    socket.on("client-data",async (data) => {
        
        // 由于nodejs的单线程异步，那么当有定义时一定完成了连接
        if(conn_map[socket.id] === undefined)
        {   
            await new Promise(timer => setTimeout(timer,50));
        }
        const client = conn_map[socket.id];
        client.write(data);
    })

    socket.on("disconnect", (reson) => {
        socket.disconnect();
    })
})

io.listen(port);
console.log(`正在监听 ${port}`);
