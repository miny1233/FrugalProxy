// 这个文件用来共享配置，以免前后端不一致
const crypto = require('crypto');

const secretKey = Buffer.from('f34Adjj7%asi023jsdfse', 'utf-8').slice(0, 16);

function encode(data) {
    const cipher = crypto.createCipheriv('aes-128-ecb', secretKey, null);
    return Buffer.concat([cipher.update(data), cipher.final()]);
}

function decode(ec) {
    const decipher = crypto.createDecipheriv('aes-128-ecb', secretKey, null);
    return Buffer.concat([decipher.update(ec), decipher.final()]);
}

function sio_send(event, socket, data) {
    socket.emit(event, encode(data));
}

function sio_recv(data) {
    return decode(data)
}

function test() {
    const origin = Buffer.from([0x1,0x2,0x3,0x3]);
    const enc = encode(origin);
    const dec = decode(enc)

    console.log(origin,enc,dec)
}

module.exports = {sio_send, sio_recv};


// test

