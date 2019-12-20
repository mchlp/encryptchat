import React, { Component } from 'react';
import io from 'socket.io-client';
import util from '../api/util.mjs';
import Axios from 'axios';
import StatusDot from './StatusDot';
import ChatComponent from './ChatComponent';

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
                }
            },
            chat: {
                selectedUser: null
            },
            data: {}
        };
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

    updateHistory = (res) => {
        if (res.success) {
            this.setState((prevState) => {
                const newHistory = prevState.data.history;
                for (const contactId of Object.keys(res.body.history)) {
                    for (let i = 0; i < res.body.history[contactId].length; i++) {
                        const newEvent = res.body.history[contactId][i];
                        newHistory[contactId][newEvent.id] = newEvent;
                    }
                }
                return {
                    data: {
                        ...prevState.data,
                        history: newHistory
                    }
                };
            });
        }
    }

    async componentDidMount() {
        this.socket = io();
        this.socket.on('connect-reply', res => {
            if (res.success) {
                this.setState({
                    status: 'ready',
                    data: res.body
                });

                this.socket.on('update-contacts', res => {
                    this.updateContacts(res);
                });

                this.socket.on('update-history', res => {
                    this.updateHistory(res);
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
        return await this.handleAddContact(connectionString, url);
    }

    addContact = async (e) => {
        e.preventDefault();
        const connectionString = document.getElementById('connection-string-input').value;
        const url = document.getElementById('url-input').value;

        const data = await this.handleAddContact(connectionString, url);
        if (data.success) {
            document.getElementById('connection-string-input').value = '';
            document.getElementById('url-input').value = '';
            $('#add-contact-modal').modal('hide');
        } else {
            this.setState({
                addContact: {
                    alert: {
                        show: true,
                        text: 'The contact could not be added. Please ensure that the connection string is correct.'
                    }
                }
            });
        }
    }

    handleAddContact = async (connectionString, url) => {
        return new Promise((resolve) => {
            this.socket.emit('add-contact', {
                connectionString,
                url
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
                        <ChatComponent handleChangeURL={this.changeContactURL} user={this.state.chat.selectedUser} data={this.state.chat.selectedUser === null ? null : this.state.data.contacts[this.state.chat.selectedUser]} history={this.state.chat.selectedUser === null ? null : this.state.data.history[this.state.chat.selectedUser]} />
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
                                            <textarea style={{ fontSize: '10px' }} className='form-control' id='connection-string-input' rows='10' />
                                        </div>
                                        <div className='form-group'>
                                            <label htmlFor='url-input'>URL</label>
                                            <input type='text' className='form-control' id='url-input' />
                                            <small id='url-help' className='form-text text-muted'>This is the URL with the port where the public server of the other user is listening.</small>
                                        </div>
                                    </div>
                                    <div className='modal-footer'>
                                        <button type='button' className='btn btn-secondary' data-dismiss='modal'>Close</button>
                                        <button type='submit' className='btn btn-primary'>Add</button>
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
                                        <small id='url-help' className='form-text text-muted'>EX: http://localhost:3002/</small>
                                    </div>
                                </div>
                                <div className='modal-footer'>
                                    <button type='button' className='btn btn-secondary' data-dismiss='modal'>Close</button>
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
