const { Server } = require('socket.io');

console.log('正在启动服务端')

const port = process.env.port || 80;

const io = new Server({});

io.on("connection", (socket) => {
    console.log(`connect event ${socket}`)
})

io.listen(port);
console.log(`正在监听 ${port}`);
