const init = (socket) => {
    socket.on('connect', socket => {
        socket.emit('now', {
            message: 'hello'
        });
    });
};

export default { init };