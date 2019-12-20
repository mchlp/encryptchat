import manage from './manage.mjs';
import util from './util.mjs';

let clientConnected = false;
let globalSocket;

const updateContacts = async () => {
    globalSocket.emit('update-contacts', await util.resWrapper(async () => {
        return {
            contacts: await manage.func.getData().contacts
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
                let newContactId;
                socket.emit('add-contact-reply', await util.resWrapper(async () => {
                    newContactId = await manage.func.handleAddContact(data);
                    await updateContacts();
                    socket.emit('update-history', await util.resWrapper(async () => {
                        return {
                            history: {
                                [newContactId]: manage.func.getHistory(newContactId, -100, -1)
                            }
                        };
                    }));
                    return newContactId;
                }));
            });

            socket.on('disconnect', () => {
                clientConnected = false;
                console.log('disconnect!');
            });
        }
    });
};

export default { init };