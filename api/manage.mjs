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

        crypto.privateEncrypt({
            key: manageData.keyPair.privateKey,
            passphrase: manageData.passphrase
        }, Buffer.from('testdata', 'utf-8'));

        manageData.passphraseSet = true;

        if (fs.existsSync('./api/data/contacts')) {
            manageData.contacts = JSON.parse(fs.readFileSync('./api/data/contacts'));
        } else {
            manageData.contacts = {};
            updateContactsFile();
        }
        if (fs.existsSync('./api/data/history')) {
            const encryptedHistory = fs.readFileSync('./api/data/history', 'utf-8');
            const decipheredtext = crypto.privateDecrypt({
                key: manageData.keyPair.privateKey,
                passphrase: manageData.passphrase
            }, Buffer.from(encryptedHistory, 'base64')).toString('utf-8');
            console.log(decipheredtext);
            manageData.history = JSON.parse(decipheredtext);
        } else {
            manageData.history = {};
            updateHistoryFile();
        }
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
    setPassphrase(passphrase);
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
    const encryptedHistory = crypto.publicEncrypt(
        {
            key: manageData.keyPair.publicKey,
        },
        Buffer.from(JSON.stringify(manageData.history), 'utf-8')
    ).toString('base64');
    console.log(encryptedHistory);
    fs.writeFileSync('./api/data/history', encryptedHistory, {
        encoding: 'utf-8',
        mode: 0o600
    });
};

const encrypt = (plaintext, mykey, passphrase, theirkey) => {
    checkKeysAndPassphraseSet();
    const encrypt1 = crypto.privateEncrypt({
        key: mykey,
        passphrase
    }, plaintext);
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

router.post('/genKeys', async (req, res) => {
    res.send(await util.resWrapper(() => {
        if (!req.body.passphrase) {
            throw Error('No passphrase specified.');
        }
        genKeys(req.body.passphrase);
    }));
});

router.post('/setPassphrase', async (req, res) => {
    res.send(await util.resWrapper(() => {
        if (!req.body.passphrase) {
            throw Error('No passphrase specified.');
        }
        setPassphrase(req.body.passphrase);
    }));
});



export default { init, router };