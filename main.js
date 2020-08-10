const express = require('express');
const next = require('next');
const fs = require('fs');
const api = require('./api/api');
const socket = require('./api/socket');
const socketIO = require('socket.io');

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(async () => {

    const app = express();

    app.use(express.json());

    app.use('/api', api.router);

    app.get('*', (req, res) => {
        return handle(req, res);
    });

    const server = app.listen(config['api-port'], (err) => {
        if (err) throw err;
        console.log('Private API listening on port ' + config['api-port']);
    });

    const io = socketIO(server);
    socket.init(io);
    await api.init(socket);
    
}).catch((err) => {
    console.error(err.stack);
    process.exit(1);
});