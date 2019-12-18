import express from 'express';
import util from './util.mjs';
import crypto from 'crypto';
import fs from 'fs';
import uuidv5 from 'uuidv5';
import publicServer from './server/publicServer.mjs';
import axios from 'axios';

const CONTACT_UUID_NAMESPACE = 'ENCRYPT_CHAT_CONTACT_UUID_NAMESPACE';

const router = express.Router();
const manageData = {};

manageData.keysInitialized = false;
manageData.passphraseSet = false;

const init = async () => {
    if (fs.existsSync('./api/data/key') && fs.existsSync('./api/data/key.pub')) {
        manageData.keyPair = {
            publicKey: fs.readFileSync('./api/data/key.pub', {
                encoding: 'utf8'
            }),
            privateKey: fs.readFileSync('./api/data/key', {
                encoding: 'utf8'
            })
        };
        manageData.keysInitialized = true;
    }
};

const setPassphrase = (passphrase) => {
    if (manageData.keysInitialized) {
        manageData.passphrase = passphrase;
        if (fs.existsSync('./api/data/contacts')) {
            manageData.contacts = JSON.parse(fs.readFileSync('./api/data/contacts'));
        } else {
            manageData.contacts = {};
            updateContactsFile();
        }
        if (fs.existsSync('./api/data/history')) {
            const encryptedHistory = JSON.parse(fs.readFileSync('./api/data/history'));
            manageData.history = crypto.privateDecrypt(manageData.keyPair.privateKey, encryptedHistory);
        } else {
            manageData.history = {};
            updateHistoryFile();
        }
        manageData.passphraseSet = true;
    } else {
        throw Error('Public and private keys not initialized.');
    }
};

const genKeys = (passphrase) => {
    const keyPair = crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
            cipher: 'aes-256-cbc',
            passphrase
        }
    });
    manageData.keyPair = keyPair;
    manageData.passphrase = passphrase;
    fs.writeFileSync('./api/data/key.pub', manageData.keyPair.publicKey, {
        encoding: 'utf8',
        mode: 0o600
    });
    fs.writeFileSync('./api/data/key', manageData.keyPair.privateKey, {
        encoding: 'utf8',
        mode: 0o600
    });
    manageData.keysInitialized = true;
    manageData.passphraseSet = true;
};

const checkKeysAndPassphraseSet = () => {
    if (!manageData.passphraseSet) {
        throw Error('Passphrase not set.');
    }
    if (!manageData.keysInitialized) {
        throw Error('Public or private key is not set.');
    }
};

const updateContactsFile = () => {
    fs.writeFileSync('./api/data/contacts', JSON.stringify(manageData.contacts), {
        encoding: 'utf8',
        mode: 0o600
    });
};

const updateHistoryFile = () => {
    checkKeysAndPassphraseSet();
    const encryptedHistory = crypto.privateEncrypt({
        key: manageData.keyPair.privateKey,
        passphrase: manageData.passphrase
    },
    JSON.stringify(manageData.history));
    fs.writeFileSync('./api/data/history', encryptedHistory, {
        encoding: 'utf8',
        mode: 0o600
    });
};

const encrypt = (plaintext, mykey, theirkey) => {
    checkKeysAndPassphraseSet();
    const encrypt1 = crypto.privateEncrypt(mykey, plaintext);
    const encrypt2 = crypto.publicEncrypt(theirkey, encrypt1);
    return encrypt2;
};

const decrypt = (ciphertext, mykey, theirkey) => {
    checkKeysAndPassphraseSet();
    const decrypt1 = crypto.privateDecrypt(mykey, ciphertext);
    const decrypt2 = crypto.publicDecrypt(theirkey, decrypt1);
    return decrypt2;
};

const addContact = (name, key, address) => {
    checkKeysAndPassphraseSet();
    const userId = uuidv5(name + key + address, CONTACT_UUID_NAMESPACE);
    manageData.contacts.userId = {
        name,
        key,
        address
    };
    updateContactsFile();
};

const addToHistory = (userId, event) => {
    checkKeysAndPassphraseSet();
    if (!manageData.history.userId) {
        manageData.history.userId = [];
    }
    manageData.history.userId.push(event);
    updateHistoryFile();
};

const incomingHandler = () => {
    return;
};

router.get('/', (req, res) => {
    res.send('EncryptChat API - Manage');
});

/*
router.post('/sendMessage', async (req, res) => {
    res.send(await util.resWrapper(async () => {
        const cipherText = encrypt(req.body.plaintext, manageData.keyPair.privateKey, manageData.contacts[req.body.receiverId].key);
        axios.
            addToHistory(req.body.receiverId, {
                type: 'message',
                direction: 'outgoing',
                text: req.body.plaintext,
                time: Date.getTime()
            });
    }));
});
*/

router.get('/status', async (req, res) => {
    res.send(await util.resWrapper(() => {
        if (!manageData.keysInitialized) {
            return 'initialize-keys';
        } else if (!manageData.passphraseSet) {
            return 'set-passphrase';
        } else {
            return 'ready';
        }
    }));
});

router.post('/start', async (req, res) => {
    res.send(await util.resWrapper(async () => { return await publicServer.start(req.body.port, incomingHandler); }));
});

router.post('/stop', async (req, res) => {
    res.send(await util.resWrapper(publicServer.stop));
});



export default { init, router };