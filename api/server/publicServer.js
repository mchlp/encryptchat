const express = require('express');
const ngrok = require('ngrok');
const publicServerHandler = require('./publicServerHandler.js');

const publicServer = {};

publicServer.counter = 1;
publicServer.port;
publicServer.publicAddr;
publicServer.start = (port, handlerFunc) => {
    return new Promise((resolve, reject) => {
        if (!port) {
            throw Error('No port specified.');
        }
        if (publicServer.httpServer && publicServer.httpServer.listening) {
            throw Error('Public Server already listening.');
        }
        try {
            publicServerHandler.init(handlerFunc);
            publicServer.app = express();
            publicServer.app.use('/', publicServerHandler.router);
            publicServer.port = port;
            publicServer.httpServer = publicServer.app.listen(port, async (err) => {
                if (err) reject(err);
                console.log('Public Server listening on Port ' + port + '.');
                publicServer.publicAddr = await ngrok.connect(port);
                console.log('Tunnel started from ' + publicServer.publicAddr + ' to http://localhost:' + port + '.');
                resolve();
            }).on('error', (err) => {
                reject(err);
            });
        } catch (err) {
            reject(err);
        }
    });
};

publicServer.stop = () => {
    return new Promise((resolve, reject) => {
        if (!publicServer.httpServer) {
            throw Error('Public Server is not open.');
        }
        if (!publicServer.httpServer.listening) {
            throw Error('Public Server is not listening.');
        }
        publicServer.httpServer.close((err) => {
            if (err) reject(err);
            console.log('Public Server on Port ' + publicServer.port + ' closed.');
            resolve();
        });
    });
};

module.exports = publicServer;