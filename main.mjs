import express from 'express';
import next from 'next';
import fs from 'fs';
import api from './api/api.mjs';
import socket from './api/socket.mjs';
import socketIO from 'socket.io';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(async () => {

    const app = express();
    await api.init();

    app.use(express.json());

    app.use('/api', api.router);

    app.get('*', (req, res) => {
        return handle(req, res);
    });

    const server = app.listen(config['api-port'], 'localhost', (err) => {
        if (err) throw err;
        console.log('Private API listening on localhost:' + config['api-port']);
    });

    const io = socketIO(server);
    socket.init(io);

}).catch((err) => {
    console.error(err.stack);
    process.exit(1);
});