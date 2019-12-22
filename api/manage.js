const util = require('./util.js');
const crypto = require('crypto');
const fs = require('fs');
const uuidv5 = require('uuidv5');
const publicServer = require('./server/publicServer.js');
const Axios = require('axios');
const constants = require('./constants');

const CONTACT_UUID_NAMESPACE = uuidv5('null', 'ENCRYPT_CHAT_CONTACT_UUID_NAMESPACE', true);
const publicServerPacketTypes = constants.publicServer.types;

const manage = {};
const manageData = {};
let socket;

manageData.keysInitialized = false;
manageData.passphraseSet = false;
manageData.temp = {};
manageData.data = null;

manage.init = async (s) => {
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
    socket = s;
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
            const connectionObj = {
                publicKey: manageData.keyPair.publicKey,
                name: manageData.temp.name
            };
            const connectionString = Buffer.from(JSON.stringify(connectionObj)).toString('base64');
            const userId = uuidv5(CONTACT_UUID_NAMESPACE, connectionString);
            manageData.data = {
                contacts: {},
                history: {},
                port: manageData.temp.port,
                name: manageData.temp.name,
                userId,
                connectionString
            };
            updateDataFile();
        }
        if (!(publicServer.httpServer && publicServer.httpServer.listening)) {
            await publicServer.start(manageData.data.port, incomingPacketHandler);
        }
        await initializeContacts();
    } else {
        throw Error('Public and private keys not initialized.');
    }
};

const checkKeysAndPassphraseSet = () => {
    if (!manageData.passphraseSet) {
        throw Error('Passphrase not set.'); from;
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
    checkKeysAndPassphraseSet();
    try {
        const res = await sendPacket(contactId, publicServerPacketTypes.HEARTBEAT, null);
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
    checkKeysAndPassphraseSet();
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
    const userId = uuidv5(CONTACT_UUID_NAMESPACE, connectionString);
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
        await addToHistory(userId, constants.eventTypes.ADD_CONTACT, {
            address
        });
    } else {
        manageData.data.contacts[userId].address = address;
        await addToHistory(userId, constants.eventTypes.UPDATE_ADDRESS, {
            address
        });
    }
    const online = await heartbeatToContact(userId);
    manageData.data.contacts[userId].online = online;
    updateDataFile();
    return userId;
};

const getConnectionString = () => {
    checkKeysAndPassphraseSet();
    return manageData.data.connectionString;
};

const addToHistory = (userId, type, event) => {
    checkKeysAndPassphraseSet();
    const historyObj = {
        id: manageData.data.contacts[userId].eventCount,
        type,
        event,
        time: Date.now()
    };
    manageData.data.history[userId].push(historyObj);
    manageData.data.contacts[userId].eventCount++;
    updateDataFile();
    return historyObj;
};

const updateHistory = (userId, eventId, type, event) => {
    checkKeysAndPassphraseSet();
    const historyObj = {
        id: eventId,
        type,
        event,
        time: Date.now()
    };
    manageData.data.history[userId][eventId] = historyObj;
    updateDataFile();
    return historyObj;
};

const sendPacket = async (toUserId, type, body) => {
    checkKeysAndPassphraseSet();
    return await Axios.post(manageData.data.contacts[toUserId].address, {
        type,
        from: manageData.data.userId,
        to: toUserId,
        body
    });
};

const incomingPacketHandler = (req) => {
    // handle incoming messages from other users.
    console.log(req.body);
    processIncomingPacket(req.body.from, req.body.type, req.body.body);
    return;
};

const processIncomingPacket = async (fromUserId, type, body) => {
    switch (type) {
        case publicServerPacketTypes.MESSAGE: {
            const historyEle = await addToHistory(fromUserId, constants.eventTypes.INCOMING_MESSAGE, {
                message: body.message
            });
            await socket.updateHistoryOfContact(fromUserId, historyEle.id, 1);
            await sendPacket(fromUserId, publicServerPacketTypes.MESSAGE_REPLY, body);
            break;
        }
        case publicServerPacketTypes.MESSAGE_REPLY: {
            const historyEle = await updateHistory(fromUserId, body.id, constants.eventTypes.OUTGOING_MESSAGE, {
                status: constants.messageStatus.SENT,
                message: body.message
            });
            await socket.updateHistoryOfContact(fromUserId, historyEle.id, 1);
            break;
        }
        case publicServerPacketTypes.HEARTBEAT:
            return;
        default:
            sendPacket(fromUserId, publicServerPacketTypes.ERROR, {
                error: 'Packet type is not valid.'
            });
            break;
    }
};

const func = {};

func.getKeysInitialized = () => {
    return manageData.keysInitialized;
};

func.getPassphraseSet = () => {
    return manageData.passphraseSet;
};

func.getData = () => {
    checkKeysAndPassphraseSet();
    return manageData.data;
};

func.setPassphrase = setPassphrase;

func.genKeys = async (passphrase, port, name) => {
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

func.getConnectionString = getConnectionString;

func.sendMessage = async (userId, message) => {
    const historyEle = await addToHistory(userId, constants.eventTypes.OUTGOING_MESSAGE, {
        status: constants.messageStatus.SENDING,
        message
    });
    await sendPacket(userId, publicServerPacketTypes.MESSAGE, {
        id: historyEle.id,
        message
    });
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

manage.func = func;

module.exports = manage;