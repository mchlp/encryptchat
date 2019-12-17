import express from 'express';
import next from 'next';
import fs from 'fs';
import api from './api/api.mjs';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const server = express();
    server.use(express.json());

    server.use('/api', api);

    server.get('*', (req, res) => {
        return handle(req, res);
    });

    server.listen(config['api-port'], 'localhost', (err) => {
        if (err) throw err;
        console.log('Private API listening on localhost:' + config['api-port']);
    });
}).catch((err) => {
    console.error(err.stack);
    process.exit(1);
});