import React, { Component } from 'react';
import io from 'socket.io-client';
import StatusDot from './StatusDot';
import ChatComponent from './ChatComponent';
import LoadingButton from './LoadingButton';
import constants from '../api/constants';

let acceptContactRequest;
let denyContactRequest;

const NOTIFICATION_SOUND_URL = '/ding.mp3';
export default class ChatPage extends Component {

    constructor(props) {
        super(props);
        this.state = {
            status: 'loading',
            alert: {
                show: false,
                text: ''
            },
            addContact: {
                alert: {
                    show: false,
                    text: ''
                },
                loading: false
            },
            chat: {
                selectedUser: null
            },
            data: {},
            contactRequest: {
                name: '',
                connectionString: '',
                serverAddr: '',
                publicKey: ''
            }
        };

        this.audio = new Audio(NOTIFICATION_SOUND_URL);
    }

    updateContacts = (res) => {
        if (res.success) {
            this.setState((prevState) => ({
                data: {
                    ...prevState.data,
                    contacts: res.body.contacts
                }
            }));
        }
    }

    removeContact = () => {
        this.socket.emit('remove-contact', {
            contact: this.state.chat.selectedUser
        });
        this.setState((prevState) => ({
            chat: {
                ...prevState.chat,
                selectedUser: null
            },
            data: {
                ...prevState.data,
                history: {
                    [prevState.chat.selectedUser]: null
                }
            }
        }));
    }

    updateHistory = (res) => {
        let newMessage = false;
        if (res.success) {
            this.setState((prevState) => {
                const newHistory = prevState.data.history;
                for (const contactId of Object.keys(res.body.history)) {
                    if (!newHistory[contactId]) {
                        newHistory[contactId] = [];
                    }
                    for (let i = 0; i < res.body.history[contactId].length; i++) {
                        const newEvent = res.body.history[contactId][i];
                        if (!newHistory[contactId][newEvent.id] && newEvent.type === constants.eventTypes.INCOMING_MESSAGE) {
                            newMessage = true;
                        }
                        newHistory[contactId][newEvent.id] = newEvent;
                    }
                }
                return {
                    data: {
                        ...prevState.data,
                        history: newHistory
                    }
                };
            }, () => {
                if (newMessage) {
                    this.audio.play();
                }
            });
        }
    }

    async componentDidMount() {
        this.socket = io();
        this.socket.on('connect-reply', res => {
            if (res.success) {
                this.setState({
                    status: 'ready',
                    data: res.body,
                    alert: {
                        show: false,
                        text: ''
                    }
                });

                this.socket.on('disconnect', res => {
                    this.setState({
                        alert: {
                            show: true,
                            text: 'Cannot connect to private server. Please restart the private server.'
                        }
                    });
                });

                this.socket.on('update-contacts', res => {
                    this.updateContacts(res);
                });

                this.socket.on('update-history', res => {
                    this.updateHistory(res);
                });

                this.socket.on('contact-request', async (req, callback) => {
                    const accept = await this.showContactRequest(req);
                    console.log(accept);
                    callback({
                        accept
                    });
                });

            } else {
                this.setState({
                    status: 'error',
                    alert: {
                        show: true,
                        text: res.error
                    }
                });
                this.socket.disconnect();
            }
        });
    }

    async componentWillUnmount() {
        this.socket.close();
    }

    showContactRequest = (req) => {
        return new Promise((resolve) => {
            this.setState({
                contactRequest: req.body.contactData
            }, () => {
                acceptContactRequest = () => {
                    $('#contact-request-modal').modal('hide');
                    resolve(true);
                };
                denyContactRequest = () => {
                    $('#contact-request-modal').modal('hide');
                    resolve(false);
                };
                $('#contact-request-modal').modal('show');
            });
        });
    }

    changeContact = (user) => {
        this.setState((prevState) => ({
            chat: {
                ...prevState.chat,
                selectedUser: user
            }
        }));
    }

    changeContactURL = async (contactID, newURL) => {
        const connectionString = this.state.data.contacts[contactID].connectionString;
        const url = newURL;
        return await this.handleAddContact(connectionString, url, false);
    }

    sendMessage = async (message) => {
        this.socket.emit('send-message', {
            receiver: this.state.chat.selectedUser,
            message
        });
    }

    addContact = async (e) => {
        e.preventDefault();
        this.setState(prevState => ({
            addContact: {
                ...prevState.addContact,
                loading: true
            }
        }));
        const connectionString = document.getElementById('connection-string-input').value;
        const url = document.getElementById('url-input').value;
        const serverAddr = document.getElementById('serverAddr-input').value;

        const data = await this.handleAddContact(connectionString, url, serverAddr);

        if (data.success) {
            document.getElementById('connection-string-input').value = '';
            document.getElementById('url-input').value = '';
            this.setState(prevState => ({
                addContact: {
                    ...prevState.addContact,
                    loading: false
                }
            }));
            $('#add-contact-modal').modal('hide');
        } else {
            this.setState({
                addContact: {
                    alert: {
                        show: true,
                        text: 'The contact could not be added. Please ensure that the connection string is correct.'
                    },
                    loading: false
                }
            });
        }
    }

    handleAddContact = async (connectionString, url, serverAddr) => {
        return new Promise((resolve) => {
            this.socket.emit('add-contact', {
                connectionString,
                url,
                serverAddr
            });

            this.socket.on('add-contact-reply', (data) => {
                this.socket.off('add-contact-reply');
                resolve(data);
            });
        });
    }

    render() {
        let Component;
        if (this.state.status === 'loading') {
            Component = (
                <div className='m-3'>
                    <h1>Loading...</h1>
                </div>
            );
        } else if (this.state.status === 'ready') {
            const contactList = Object.entries(this.state.data.contacts).map((contactEntry, index) => {
                return (
                    <div key={index} user={contactEntry[0]} className='border p-2 rounded chat-contact-box' onClick={() => { this.changeContact(contactEntry[0]); }}>
                        <h4 className='mb-1'>
                            <ul className='list-inline m-0 align-middle'>
                                <li className='list-inline-item ml-1 align-middle'>
                                    <StatusDot online={contactEntry[1].online} />
                                </li>
                                <li className='list-inline-item ml-1 align-middle'>
                                    {contactEntry[1].name}
                                </li>
                            </ul>
                        </h4>
                        {contactEntry[1].address}
                    </div >
                );
            });

            const Content = (
                <div style={{ display: 'flex', flexDirection: 'row', height: '100%' }}>
                    <div style={{
                        flexBasis: '350px',
                        flexGrow: 0,
                        flexShrink: 0,
                        height: '100%',
                        backgroundColor: 'white'
                    }} className='p-3'>
                        <div className='card fill-height'>
                            <div className='card-body p-3'>
                                <h1 className='mb-3'>Contacts</h1>
                                <button className='btn btn-primary mb-3' data-toggle='modal' data-target='#add-contact-modal'>+ Add</button>
                                <button className='btn btn-primary ml-2 mb-3' data-toggle='modal' data-target='#info-modal'>My Info</button>
                                <div>
                                    {contactList}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style={{
                        height: '100%',
                        flexGrow: 1
                    }}>
                        <ChatComponent removeContact={this.removeContact} sendMessage={this.sendMessage} handleChangeURL={this.changeContactURL} user={this.state.chat.selectedUser} data={this.state.chat.selectedUser === null ? null : this.state.data.contacts[this.state.chat.selectedUser]} history={this.state.chat.selectedUser === null ? null : this.state.data.history[this.state.chat.selectedUser]} />
                    </div>
                </div>
            );
            Component = (
                <div className='fill-height'>
                    {Content}

                    {/* Add Contact Modal */}
                    <div className='modal fade' id='add-contact-modal' tabIndex='-1' role='dialog'>
                        <div className='modal-dialog' role='document'>
                            <div className='modal-content'>
                                <div className='modal-header'>
                                    <h5 className='modal-title'>Add Contact</h5>
                                    <button type='button' className='close' data-dismiss='modal' aria-label='Close'>
                                        <span aria-hidden='true'>&times;</span>
                                    </button>
                                </div>
                                <form onSubmit={this.addContact}>
                                    <div className='modal-body'>
                                        <div className='alert alert-danger mb-3' id='danger-alert' hidden={!this.state.addContact.alert.show}>
                                            {this.state.addContact.alert.text}
                                        </div>
                                        <div className='form-group'>
                                            <label htmlFor='connection-string-input'>Connection String</label>
                                            <textarea style={{ fontSize: '10px' }} className='form-control' id='connection-string-input' rows='10' required />
                                        </div>
                                        <div className='form-group'>
                                            <label htmlFor='url-input'>URL</label>
                                            <input type='text' className='form-control' id='url-input' required />
                                            <small id='url-help' className='form-text text-muted'>This is the URL with the port where the public server of the other user is listening.</small>
                                        </div>
                                        <div className='form-group'>
                                            <label htmlFor='serverAddr-input'>My Public Server URL</label>
                                            <input type='text' className='form-control' id='serverAddr-input' defaultValue={this.state.data.publicAddr} required />
                                            <small id='serverAddr-help' className='form-text text-muted'>This is the URL with the port where your public server is listening. This should not need to be changed unless you started another tunnel.</small>
                                        </div>
                                    </div>
                                    <div className='modal-footer'>
                                        <button type='button' className='btn btn-secondary' data-dismiss='modal'>Close</button>
                                        <LoadingButton type='submit' className='btn btn-primary' loading={this.state.addContact.loading.toString()}>Add</LoadingButton>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* Info Modal */}
                    <div className='modal fade' id='info-modal' tabIndex='-1' role='dialog' >
                        <div className='modal-dialog' role='document'>
                            <div className='modal-content'>
                                <div className='modal-header'>
                                    <h5 className='modal-title'>My Info</h5>
                                    <button type='button' className='close' data-dismiss='modal' aria-label='Close'>
                                        <span aria-hidden='true'>&times;</span>
                                    </button>
                                </div>
                                <div className='modal-body'>
                                    <div className='form-group'>
                                        <h4>Connection String</h4>
                                        <textarea readOnly value={this.state.data.connectionString} style={{ fontSize: '10px' }} className='form-control' rows='15' />
                                    </div>
                                    <div className='form-group'>
                                        <h4>URL</h4>
                                        <p>Publicly accessible URL (including port) where public server is listening</p>
                                        <input readOnly value={this.state.data.publicAddr} className='form-control' type='text'></input>
                                        <small id='url-help' className='form-text text-muted'>This should be your publicly accessible URL unless you started another tunnel.</small>
                                    </div>
                                </div>
                                <div className='modal-footer'>
                                    <button type='button' className='btn btn-secondary' data-dismiss='modal'>Close</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Request Modal */}
                    <div className='modal fade' id='contact-request-modal' tabIndex='-1' role='dialog' >
                        <div className='modal-dialog' role='document'>
                            <div className='modal-content'>
                                <div className='modal-header'>
                                    <h5 className='modal-title'>Contact Connect Request</h5>
                                    <button type='button' className='close' data-dismiss='modal' aria-label='Close'>
                                        <span aria-hidden='true'>&times;</span>
                                    </button>
                                </div>
                                <div className='modal-body'>
                                    <p>You have received a request from {this.state.contactRequest.name} to connect with you. Please review the details below.</p>
                                    <div className='form-group'>
                                        <h4>Connection String</h4>
                                        <textarea readOnly value={this.state.contactRequest.connectionString} style={{ fontSize: '10px' }} className='form-control' rows='10' />
                                    </div>
                                    <div className='form-group'>
                                        <h4>Public Key</h4>
                                        <textarea readOnly value={this.state.contactRequest.publicKey} style={{ fontSize: '10px' }} className='form-control' rows='10' />
                                    </div>
                                    <div className='form-group'>
                                        <h4>Public Server URL</h4>
                                        <input type='text' readOnly defaultValue={this.state.contactRequest.serverAddr} className='form-control' />
                                    </div>
                                </div>
                                <div className='modal-footer'>
                                    <button type='button' className='btn btn-success' onClick={(e) => { e.preventDefault(); acceptContactRequest(); }}>Accept</button>
                                    <button type='button' className='btn btn-danger' onClick={(e) => { e.preventDefault(); denyContactRequest(); }} >Deny</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        return (
            <div className='full-height-child' >
                <div className='alert alert-danger m-4' id='danger-alert' hidden={!this.state.alert.show}>
                    {this.state.alert.text}
                </div>
                {Component}
            </div>
        );
    }
}
