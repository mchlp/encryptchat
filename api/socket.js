const manage = require('./manage.js');
const util = require('./util.js');

let clientConnected = false;
let globalSocket;

const updateContacts = async () => {
    globalSocket.emit('update-contacts', await util.resWrapper(async () => {
        return {
            contacts: await manage.func.getData().contacts
        };
    }));
};

const updateHistoryOfContact = async (contactId, startEntry, numEntries) => {
    let lastEntry;
    if (!startEntry) {
        startEntry = 0;
        lastEntry = -1;
    } else {
        lastEntry = startEntry + numEntries - 1;
    }
    globalSocket.emit('update-history', await util.resWrapper(async () => {
        return {
            history: {
                [contactId]: manage.func.getHistory(contactId, startEntry, lastEntry)
            }
        };
    }));
};

const getInitialHistory = async () => {
    const allInitialHistory = {};
    for (const contact of Object.keys(manage.func.getData().contacts)) {
        const contactHistory = manage.func.getHistory(contact, -100, -1);
        allInitialHistory[contact] = contactHistory;
    }
    return allInitialHistory;
};

const init = (io) => {
    io.on('connect', async (socket) => {
        globalSocket = socket;
        if (clientConnected) {
            socket.emit('connect-reply', await util.resWrapper(() => {
                throw Error('Only one client may be connected at a time');
            }));
            await socket.disconnect(true);
        } else {
            clientConnected = true;
            socket.emit('connect-reply', await util.resWrapper(async () => {
                const history = await getInitialHistory();
                return {
                    contacts: manage.func.getData().contacts,
                    history,
                    connectionString: manage.func.getConnectionString()
                };
            }));

            socket.on('add-contact', async (data) => {
                socket.emit('add-contact-reply', await util.resWrapper(async () => {
                    const newContactId = await manage.func.handleAddContact(data);
                    await updateContacts();
                    await updateHistoryOfContact(newContactId);
                }));
            });

            socket.on('send-message', async (data) => {
                manage.func.sendMessage(data.receiver, data.message);
                await updateHistoryOfContact(data.receiver, -100, 100);
            });

            socket.on('disconnect', () => {
                clientConnected = false;
                console.log('disconnect!');
            });
        }
    });
};

module.exports = { init, updateHistoryOfContact };