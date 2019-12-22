const constants = {};

constants.publicServer = {};
constants.publicServer.types = {
    HEARTBEAT: 'heartbeat',
    MESSAGE: 'message',
    MESSAGE_REPLY: 'message-reply',
    FIRST_CONTACT: 'first-contact',
    ERROR: 'error',
    CONNECT: 'connect',
    CONNECT_REPLY: 'connect-reply'
};

constants.eventTypes = {
    ADD_CONTACT: 'add-contact',
    UPDATE_ADDRESS: 'update-address',
    OUTGOING_MESSAGE: 'outgoing-message',
    INCOMING_MESSAGE: 'incoming-message'
};

constants.messageStatus = {
    SENDING: 'sending',
    SENT: 'sent'
};

constants.text = {
    REQUEST_TO_CONNECT: 'request-to-connect'
};

module.exports = constants;