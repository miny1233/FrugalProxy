class ConnectReq {
    constructor(des_ip,des_port)
    {
        this.des_ip = des_ip;
        this.des_port = des_port;
    }
}

class ConnectRes {
    constructor(connection_id)
    {
        this.connection_id = connection_id;
    }
}