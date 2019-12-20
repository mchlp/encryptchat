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
            socket.emit('connect-reply', await util.resWrapper(() => {
                return {
                    contacts: manage.func.getData().contacts,
                    connectionString: manage.func.getConnectionString()
                };
            }));

            socket.on('add-contact', async (data) => {
                socket.emit('add-contact-reply', await util.resWrapper(async () => {
                    return {
                        success: await manage.func.handleAddContact(data)
                    };
                }));
                updateContacts();
            });

            socket.on('disconnect', () => {
                clientConnected = false;
                console.log('disconnect!');
            });
        }
    });
};

export default { init };