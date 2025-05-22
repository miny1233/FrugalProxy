/*
    目前协议总共支持三种操作
    连接，传输，断开
*/

const Method = {
    Connect: 'connect',
    Send: 'send',
    Disconnect: 'disconnect'
}

/*
    服务端和客户端是对等的，他们都是彼此的服务端
    整个数据结构类似这样的
    ++++++++++++++++++++++
    + method + id + data +
    ++++++++++++++++++++++

    data会根据使用的method有所区别
*/
class DataControl {
    constructor(method, id, data)
    {
        this.method = method;
        this.id = id;
        this.data = data;
    }
}

/*
    这里定义不同method方法下的data结构

    连接:
    +++++++++++++++++++++
    + des_ip + des_port +
    +++++++++++++++++++++
*/

class ConnectData {
    constructor(des_ip, des_port)
    {
        this.des_ip = des_ip;
        this.des_port = des_port;
    }
}