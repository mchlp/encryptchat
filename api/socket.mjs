import manage from './manage.mjs';
import util from './util.mjs';

let clientConnected = false;

const init = (io) => {
    io.on('connect', async (socket) => {
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
            });

            socket.on('disconnect', () => {
                clientConnected = false;
                console.log('disconnect!');
            });
        }
    });
};

export default { init };