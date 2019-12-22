const express = require('express');
const manage = require('./manage');
const util = require('./util');

const router = express.Router();

const init = async (socket) => {
    await manage.init(socket);
};

router.get('/', (req, res) => {
    res.send('EncryptChat API');
});

router.get('/manage', (req, res) => {
    res.send('EncryptChat API - Manage');
});

router.get('/manage/status', async (req, res) => {
    res.send(await util.resWrapper(() => {
        if (!manage.func.getKeysInitialized()) {
            return 'initialize-keys';
        } else if (!manage.func.getPassphraseSet()) {
            return 'set-passphrase';
        } else {
            return 'ready';
        }
    }));
});

router.post('/manage/genKeys', async (req, res) => {
    res.send(await util.resWrapper(async () => {
        await manage.func.genKeys(req.body.passphrase, req.body.port, req.body.name);
    }));
});

router.post('/manage/setPassphrase', async (req, res) => {
    res.send(await util.resWrapper(async () => {
        if (!req.body.passphrase) {
            throw Error('No passphrase specified.');
        }
        await manage.func.setPassphrase(req.body.passphrase);
    }));
});

module.exports = { init, router };