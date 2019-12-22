const constants = {};

constants.publicServer = {};
constants.publicServer.types = {
    HEARTBEAT: 'heartbeat',
    MESSAGE: 'message',
    MESSAGE_REPLY: 'message-reply',
    ERROR: 'error'
};

constants.eventTypes = {
    ADD_CONTACT: 'add-contact',
    UPDATE_ADDRESS: 'update-address',
    CONNECT: 'connect',
    OUTGOING_MESSAGE: 'outgoing-message',
    INCOMING_MESSAGE: 'incoming-message'
};

constants.messageStatus = {
    SENDING: 'sending',
    SENT: 'sent'
};

module.exports = constants;