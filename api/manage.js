const util = require('./util.js');
const crypto = require('crypto');
const fs = require('fs');
const uuidv5 = require('uuidv5');
const publicServer = require('./server/publicServer.js');
const Axios = require('axios');
const soundPlayer = require('node-wav-player');
const constants = require('./constants');

const CONTACT_UUID_NAMESPACE = uuidv5('null', 'ENCRYPT_CHAT_CONTACT_UUID_NAMESPACE', true);
const publicServerPacketTypes = constants.publicServer.types;

const manage = {};
const manageData = {};
let socket;

manageData.keysInitialized = false;
manageData.temp = {
    contacts: {}
};
manageData.passphrase = null;
manageData.data = null;
manageData.keyPair = null;

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
    setInterval(pingAllContacts, 1000 * 30);
};

const setPassphrase = async (passphrase) => {
    if (manageData.keysInitialized) {
        manageData.passphrase = passphrase;

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
            manageData.data = JSON.parse(decipheredtext);
            if (!manageData.data.connectionStringFingerprint) {
                manageData.data.connectionStringFingerprint = crypto.createHash('sha256').update(manageData.data.connectionString, 'utf8').digest('base64');
            }
            for (const contactId of Object.keys(manageData.data.contacts)) {
                manageData.temp.contacts[contactId] = {
                    connected: false,
                    connectListener: null,
                    aesKey: null
                };
            }
        } else {
            const connectionObj = {
                publicKey: manageData.keyPair.publicKey,
                name: manageData.temp.name
            };
            const connectionString = Buffer.from(JSON.stringify(connectionObj)).toString('base64');
            const connectionStringFingerprint = crypto.createHash('sha256').update(connectionString, 'utf8').digest('base64');
            const userId = uuidv5(CONTACT_UUID_NAMESPACE, connectionString);
            manageData.data = {
                contacts: {},
                history: {},
                port: manageData.temp.port,
                name: manageData.temp.name,
                userId,
                connectionString,
                connectionStringFingerprint
            };
            updateDataFile();
        }
        if (!(publicServer.httpServer && publicServer.httpServer.listening)) {
            await publicServer.start(manageData.data.port, incomingPacketHandler);
            manageData.temp.publicAddr = publicServer.publicAddr;
        }
        await initializeContacts();
    } else {
        throw Error('Public and private keys not initialized.');
    }
};

const checkKeysAndPassphraseSet = () => {
    if (!manageData.passphrase) {
        throw Error('Passphrase not set.');
    }
    if (!manageData.keysInitialized) {
        throw Error('Public or private key is not set.');
    }
};

const checkUserConnected = (userId) => {
    if (!manageData.temp.contacts[userId].connected) {
        throw Error('User not connected.');
    }
};

const setContactOffline = async (userId) => {
    manageData.temp.contacts[userId].connected = false;
    manageData.temp.contacts[userId].aesKey = null;
    manageData.data.contacts[userId].online = false;
    await socket.updateContacts();
};

const updateDataFile = () => {
    checkKeysAndPassphraseSet();
    const encryptedData = util.aes.encrypt(manageData.aesKey, JSON.stringify(manageData.data));
    fs.writeFileSync('./api/data/data', encryptedData, {
        encoding: 'utf-8',
        mode: 0o600
    });
};

const signAndEncrypt = (plaintext, mykey, passphrase, theirkey) => {
    checkKeysAndPassphraseSet();
    const signature = util.rsa.sign(plaintext, {
        key: mykey,
        passphrase
    });

    const encryptedText = crypto.publicEncrypt(
        theirkey,
        Buffer.from(plaintext, 'utf8')
    ).toString('base64');

    const data = Buffer.from(JSON.stringify({
        encryptedText,
        signature
    }), 'utf8').toString('base64');
    return data;
};

const decryptAndVerify = (ciphertext, mykey, passphrase, theirkey) => {
    checkKeysAndPassphraseSet();
    const dataObj = JSON.parse(Buffer.from(ciphertext, 'base64').toString('utf8'));
    const plaintext = crypto.privateDecrypt({
        key: mykey,
        passphrase
    }, Buffer.from(dataObj.encryptedText, 'base64')).toString('utf8');
    if (util.rsa.verify(dataObj.signature, plaintext, theirkey)) {
        return plaintext;
    } else {
        throw Error('Message signature does not match message.');
    }
};

const connectToContact = async (contactId) => {
    checkKeysAndPassphraseSet();
    const body = {
        text: constants.text.REQUEST_TO_CONNECT,
        publicAddr: manageData.temp.publicAddr
    };
    const packet = signAndEncrypt(
        JSON.stringify(body),
        manageData.keyPair.privateKey,
        manageData.passphrase,
        manageData.data.contacts[contactId].key
    );
    return new Promise((resolve, reject) => {
        try {
            manageData.temp.contacts[contactId].connectListener = (data) => {
                manageData.temp.contacts[contactId].connectListener = null;
                const aesKey = decryptAndVerify(data, manageData.keyPair.privateKey, manageData.passphrase, manageData.data.contacts[contactId].key);
                manageData.temp.contacts[contactId].aesKey = aesKey;
                manageData.temp.contacts[contactId].connected = true;
                resolve(true);
            };
            sendPacketUnencrypted(contactId, publicServerPacketTypes.CONNECT, packet).then((res) => {
                if (res.status != 200) {
                    reject(false);
                }
            }).catch(() => {
                reject(false);
            });
        } catch (err) {
            reject(false);
        }
    });

};

const establishConnectionFromRequest = async (fromUserId, body) => {
    const data = JSON.parse(decryptAndVerify(
        body,
        manageData.keyPair.privateKey,
        manageData.passphrase,
        manageData.data.contacts[fromUserId].key
    ));
    if (data.text === constants.text.REQUEST_TO_CONNECT) {
        manageData.data.contacts[fromUserId].address = data.publicAddr;
        manageData.temp.contacts[fromUserId].aesKey = util.aes.genKey();
        const packet = signAndEncrypt(
            manageData.temp.contacts[fromUserId].aesKey,
            manageData.keyPair.privateKey,
            manageData.passphrase,
            manageData.data.contacts[fromUserId].key
        );
        await sendPacketUnencrypted(fromUserId, publicServerPacketTypes.CONNECT_REPLY, packet);
        manageData.temp.contacts[fromUserId].connected = true;
        manageData.data.contacts[fromUserId].online = true;
    } else {
        throw Error('Connection request does not match key stored.');
    }
};

const heartbeatToContact = async (contactId) => {
    checkKeysAndPassphraseSet();
    try {
        if (!manageData.temp.contacts[contactId].connected) {
            return await connectToContact(contactId);
        }
        const res = await sendPacketEncrypted(contactId, publicServerPacketTypes.HEARTBEAT, null);
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

const addContact = async (name, key, address, connectionString, myServerAddr) => {
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
        let res;
        if (myServerAddr) {
            res = await sendPacketFirst(address, userId, myServerAddr);
        }
        if (!myServerAddr || (res.data.success && res.data.body.accept)) {
            manageData.data.contacts[userId] = {
                name,
                key,
                address,
                connectionString,
                eventCount: 0,
            };
            manageData.data.history[userId] = [];
            manageData.temp.contacts[userId] = {
                connected: false,
                aesKey: null
            };
            await addToHistory(userId, constants.eventTypes.ADD_CONTACT, {
                address
            });
            if (myServerAddr) {
                const online = await heartbeatToContact(userId);
                manageData.data.contacts[userId].online = online;
            }
        } else {
            throw Error('Could not add contact.');
        }
    } else {
        manageData.data.contacts[userId].address = address;
        await addToHistory(userId, constants.eventTypes.UPDATE_ADDRESS, {
            address
        });
        const online = await heartbeatToContact(userId);
        manageData.data.contacts[userId].online = online;
    }
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

const sendPacketFirst = async (toUserAddr, toUserId, serverAddr) => {
    checkKeysAndPassphraseSet();
    return await Axios.post(toUserAddr, {
        type: constants.publicServer.types.FIRST_CONTACT,
        from: manageData.data.userId,
        to: toUserId,
        body: {
            connectionString: getConnectionString(),
            serverAddr
        }
    });
};

const sendPacketUnencrypted = async (toUserId, type, body) => {
    checkKeysAndPassphraseSet();
    const config = {};
    if (type === constants.publicServer.types.CONNECT) {
        config.timeout = 5000;
    }
    return await Axios.post(manageData.data.contacts[toUserId].address, {
        type,
        from: manageData.data.userId,
        to: toUserId,
        body
    }, config);
};

const sendPacketEncrypted = async (toUserId, type, body) => {
    checkKeysAndPassphraseSet();
    checkUserConnected(toUserId);
    const packetBody = {
        type,
        to: toUserId,
        body
    };
    const encryptedPacketBody = util.aes.encrypt(manageData.temp.contacts[toUserId].aesKey, JSON.stringify(packetBody));
    return await Axios.post(manageData.data.contacts[toUserId].address, {
        from: manageData.data.userId,
        eBody: encryptedPacketBody
    });
};

const incomingPacketHandler = (req) => {
    // handle incoming messages from other users.
    let decryptedBody;
    if (req.body.eBody) {
        decryptedBody = JSON.parse(util.aes.decrypt(manageData.temp.contacts[req.body.from].aesKey, req.body.eBody));
    } else {
        decryptedBody = req.body;
    }
    return processIncomingPacket(req.body.from, decryptedBody.type, decryptedBody.body);
};

const processIncomingPacket = async (fromUserId, type, body) => {
    switch (type) {
        case publicServerPacketTypes.MESSAGE: {
            if (!manageData.data.contacts[fromUserId]) {
                throw Error('Contact does not exist.');
            }
            const historyEle = await addToHistory(fromUserId, constants.eventTypes.INCOMING_MESSAGE, {
                message: body.message
            });
            await socket.updateHistoryOfContact(fromUserId, historyEle.id, 1);
            if (!socket.clientConnected) {
                await soundPlayer.play({
                    path: './public/ding.wav',
                    sync: true
                });
            }
            await sendPacketEncrypted(fromUserId, publicServerPacketTypes.MESSAGE_REPLY, body);
            return;
        }
        case publicServerPacketTypes.MESSAGE_REPLY: {
            const historyEle = await updateHistory(fromUserId, body.id, constants.eventTypes.OUTGOING_MESSAGE, {
                status: constants.messageStatus.SENT,
                message: body.message
            });
            await socket.updateHistoryOfContact(fromUserId, historyEle.id, 1);
            return;
        }
        case publicServerPacketTypes.CONNECT:
            await establishConnectionFromRequest(fromUserId, body);
            await socket.updateContacts();
            await socket.updateHistoryOfContact(fromUserId);
            return;
        case publicServerPacketTypes.CONNECT_REPLY:
            manageData.temp.contacts[fromUserId].connectListener(body);
            return;
        case publicServerPacketTypes.FIRST_CONTACT: {
            const connectionData = JSON.parse(Buffer.from(body.connectionString, 'base64').toString());
            try {
                crypto.publicEncrypt(connectionData.publicKey, Buffer.from('testdata', 'utf-8'));
            } catch (err) {
                console.error(err);
                throw Error('Public key of new contact is not valid.');
            }
            const waitForAcceptContact = async () => {
                const res = await socket.showContactRequest({
                    name: connectionData.name,
                    publicKey: connectionData.publicKey,
                    connectionString: body.connectionString,
                    connectionStringFingerprint: crypto.createHash('sha256').update(body.connectionString, 'utf8').digest('base64'),
                    serverAddr: body.serverAddr
                });
                return res.accept;
            };
            if (await waitForAcceptContact()) {
                await addContact(connectionData.name, connectionData.publicKey, body.serverAddr, body.connectionString, false);
                return {
                    accept: true
                };
            }
            return {
                accept: false
            };
        }
        case publicServerPacketTypes.HEARTBEAT:
            return;
        default:
            sendPacketUnencrypted(fromUserId, publicServerPacketTypes.ERROR, {
                error: 'Packet type is not valid.'
            });
            break;
    }
};

const pingAllContacts = async () => {
    await initializeContacts();
    await socket.updateContacts();
};

const func = {};

func.getKeysInitialized = () => {
    return manageData.keysInitialized;
};

func.getPassphraseSet = () => {
    return manageData.passphrase ? true : false;
};

func.getData = () => {
    checkKeysAndPassphraseSet();
    return manageData.data;
};

func.getTemp = () => {
    checkKeysAndPassphraseSet();
    return manageData.temp;
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

func.removeContact = async (userId) => {
    delete manageData.data.contacts[userId];
    delete manageData.data.history[userId];
};

func.sendMessage = async (userId, message) => {
    const historyEle = await addToHistory(userId, constants.eventTypes.OUTGOING_MESSAGE, {
        status: constants.messageStatus.SENDING,
        message
    });
    try {
        const res = await sendPacketEncrypted(userId, publicServerPacketTypes.MESSAGE, {
            id: historyEle.id,
            message
        });
        if (!res.data.success) {
            await setContactOffline(userId);
            await socket.updateContacts();
            return false;
        }
        return true;
    } catch (err) {
        await setContactOffline(userId);
    }

};

func.handleAddContact = async (data) => {
    if (!data.connectionString) {
        throw Error('Connection string of new contact required.');
    }
    if (!data.url) {
        throw Error('URL of new contact required.');
    }
    const connectionData = JSON.parse(Buffer.from(data.connectionString, 'base64').toString().trim());
    try {
        crypto.publicEncrypt(connectionData.publicKey, Buffer.from('testdata', 'utf-8'));
    } catch (err) {
        console.error(err);
        throw Error('Public key of new contact is not valid.');
    }
    return await addContact(connectionData.name, connectionData.publicKey, data.url, data.connectionString, data.serverAddr);
};

func.getHistory = (userId, start, end) => {
    // if start/end are negative, add eventCount (-100 means last 100 entries)
    // retrives entries from start to end
    const contactHistory = manageData.data.history[userId];
    if (!contactHistory || contactHistory.length === 0 || !manageData.data.contacts[userId]) {
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