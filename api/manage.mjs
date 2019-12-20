import express from 'express';
import util from './util.mjs';
import crypto from 'crypto';
import fs from 'fs';
import uuidv5 from 'uuidv5';
import publicServer from './server/publicServer.mjs';
import Axios from 'axios';
import constants from './constants.mjs';

const CONTACT_UUID_NAMESPACE = uuidv5('null', 'ENCRYPT_CHAT_CONTACT_UUID_NAMESPACE', true);

const router = express.Router();
const manageData = {};

manageData.keysInitialized = false;
manageData.passphraseSet = false;
manageData.temp = {};
manageData.data = null;

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

const setPassphrase = async (passphrase) => {
    if (manageData.keysInitialized) {
        manageData.passphrase = passphrase;

        manageData.passphraseSet = true;

        if (fs.existsSync('./api/data/aes')) {
            const encryptedAESKey = fs.readFileSync('./api/data/aes', 'utf-8');
            try {
                manageData.aesKey = crypto.privateDecrypt({
                    key: manageData.keyPair.privateKey,
                    passphrase: manageData.passphrase
                }, Buffer.from(encryptedAESKey, 'base64')).toString('utf-8');
            } catch (err) {
                throw Error('Passphrase does not match.');
            }
        } else {
            manageData.aesKey = util.aes.genKey();
            const encryptedAESKey = crypto.publicEncrypt(manageData.keyPair.publicKey, Buffer.from(manageData.aesKey, 'utf-8')).toString('base64');
            fs.writeFileSync('./api/data/aes', encryptedAESKey, {
                encoding: 'utf8',
                mode: 0o600
            });
        }

        if (fs.existsSync('./api/data/data')) {
            const encryptedData = fs.readFileSync('./api/data/data', 'utf-8');
            const decipheredtext = util.aes.decrypt(manageData.aesKey, encryptedData);
            console.log(decipheredtext);
            manageData.data = JSON.parse(decipheredtext);
        } else {
            manageData.data = {
                contacts: {},
                history: {},
                port: manageData.temp.port,
                name: manageData.temp.name
            };
            updateDataFile();
        }
        if (!(publicServer.httpServer && publicServer.httpServer.listening)) {
            await publicServer.start(manageData.data.port, incomingHandler);
        }
        await initializeContacts();
    } else {
        throw Error('Public and private keys not initialized.');
    }
};

const genKeys = async (passphrase, port, name) => {
    if (!passphrase) {
        throw Error('No passphrase specified.');
    }
    if (!port) {
        throw Error('Port must be specified.');
    }
    if (!name) {
        throw Error('A name must be provided.');
    }

    const keyPair = util.rsa.genKeys(passphrase);

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
    manageData.temp.port = port;
    manageData.temp.name = name;
    await setPassphrase(passphrase);
};

const checkKeysAndPassphraseSet = () => {
    if (!manageData.passphraseSet) {
        throw Error('Passphrase not set.');
    }
    if (!manageData.keysInitialized) {
        throw Error('Public or private key is not set.');
    }
};

const updateDataFile = () => {
    checkKeysAndPassphraseSet();
    const encryptedData = util.aes.encrypt(manageData.aesKey, JSON.stringify(manageData.data));
    fs.writeFileSync('./api/data/data', encryptedData, {
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

const heartbeatToContact = async (contactId) => {
    try {
        const res = await Axios.post(manageData.data.contacts[contactId].address, {
            type: constants.publicServer.HEARTBEAT
        });
        if (res.data.success) {
            return true;
        } else {
            return false;
        }
    } catch (err) {
        return false;
    }
};

const initializeContacts = async () => {
    for (const contactEntry of Object.entries(manageData.data.contacts)) {
        manageData.data.contacts[contactEntry[0]].online = await heartbeatToContact(contactEntry[0]);
    }
};

const addContact = async (name, key, address, connectionString) => {
    checkKeysAndPassphraseSet();
    if (!name) {
        throw Error('Name of new contact is required');
    }
    if (!key) {
        throw Error('Key of new contact is required');
    }
    if (!address) {
        throw Error('Address of new contact is required');
    }
    const userId = uuidv5(CONTACT_UUID_NAMESPACE, name + key);
    const contactExists = manageData.data.contacts[userId] ? true : false;
    if (!contactExists) {
        manageData.data.contacts[userId] = {
            name,
            key,
            address,
            connectionString,
            eventCount: 0,
        };
        manageData.data.history[userId] = [];
        await func.addToHistory(userId, {
            type: constants.eventTypes.ADD_CONTACT,
            address
        });
    } else {
        manageData.data.contacts[userId].address = address;
        await func.addToHistory(userId, {
            type: constants.eventTypes.UPDATE_ADDRESS,
            address
        });
    }
    const online = await heartbeatToContact(userId);
    manageData.data.contacts[userId].online = online;
    updateDataFile();
    return userId;
};

const incomingHandler = (req) => {
    // handle incoming messages from other users.
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

router.post('/genKeys', async (req, res) => {
    res.send(await util.resWrapper(async () => {
        await genKeys(req.body.passphrase, req.body.port, req.body.name);
    }));
});

router.post('/setPassphrase', async (req, res) => {
    res.send(await util.resWrapper(async () => {
        if (!req.body.passphrase) {
            throw Error('No passphrase specified.');
        }
        await setPassphrase(req.body.passphrase);
    }));
});

const func = {};
func.getData = () => {
    checkKeysAndPassphraseSet();
    return manageData.data;
};

func.getConnectionString = () => {
    checkKeysAndPassphraseSet();
    const connectionObj = {
        publicKey: manageData.keyPair.publicKey,
        name: manageData.data.name
    };
    return Buffer.from(JSON.stringify(connectionObj)).toString('base64');
};

func.handleAddContact = async (data) => {
    if (!data.connectionString) {
        throw Error('Connection string of new contact required.');
    }
    if (!data.url) {
        throw Error('URL of new contact required.');
    }
    const connectionData = JSON.parse(Buffer.from(data.connectionString, 'base64').toString());
    try {
        crypto.publicEncrypt(connectionData.publicKey, Buffer.from('testdata', 'utf-8'));
    } catch (err) {
        console.error(err);
        throw Error('Public key of new contact is not valid.');
    }
    return await addContact(connectionData.name, connectionData.publicKey, data.url, data.connectionString);
};

func.addToHistory = (userId, event) => {
    checkKeysAndPassphraseSet();
    manageData.data.history[userId].push({
        id: manageData.data.contacts[userId].eventCount,
        event,
        time: Date.now()
    });
    manageData.data.contacts[userId].eventCount++;
    updateDataFile();
};

func.getHistory = (userId, start, end) => {
    // if start/end are negative, add eventCount (-100 means last 100 entries)
    // retrives entries from start to end
    const contactHistory = manageData.data.history[userId];
    if (contactHistory.length === 0) {
        return [];
    }
    while (end < 0) {
        if (-end > contactHistory.length) {
            end = 0;
            break;
        }
        end += manageData.data.contacts[userId].eventCount;
    }
    while (start < 0) {
        if (-start > contactHistory.length) {
            start = 0;
            break;
        }
        start += manageData.data.contacts[userId].eventCount;
    }
    console.log(start, end);
    if (start >= contactHistory.length || end >= contactHistory.length) {
        throw Error('Start and end indexes must be less than the length of the array');
    } else {
        const events = [];
        for (let i = start; i <= end; i++) {
            events.push(contactHistory[i]);
        }
        return events;
    }
};

export default {
    init,
    router,
    func
};