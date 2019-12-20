import React, { Component } from 'react';
import io from 'socket.io-client';
import util from '../api/util.mjs';
import Axios from 'axios';

export default class ChatPage extends Component {

    constructor(props) {
        super(props);
        this.state = {
            status: 'loading',
            alert: {
                show: false,
                text: ''
            }
        };
    }

    async componentDidMount() {
        this.socket = io();
        this.socket.on('connect-reply', res => {
            if (res.success) {
                this.setState({
                    status: 'ready',
                    data: res.body
                });
            } else {
                this.setState({
                    status: 'error',
                    alert: {
                        show: true,
                        text: res.error
                    }
                });
            }
        });
    }

    addContact = (e) => {
        e.preventDefault();
        const connectionString = document.getElementById('connection-string-input').value;
        const url = document.getElementById('url-input').value;

        this.socket.emit('add-contact', {
            connectionString,
            url
        });

        document.getElementById('connection-string-input').value = '';
        document.getElementById('url-input').value = '';
        $('#add-contact-modal').modal('hide');
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
            const contactList = Object.keys(this.state.data.contacts).map((contactId, index) => {
                return (
                    <div key={index}>
                        <p>
                            ID: {contactId}
                        </p>
                        <p>
                            Name: {this.state.data.contacts[contactId].name}
                        </p>
                        <p>
                            Key: {this.state.data.contacts[contactId].key}
                        </p>
                        <p>
                            Address: {this.state.data.contacts[contactId].address}
                        </p>
                    </div>
                );
            });
            Component = (
                <div>
                    Ready!
                    <p style={{ wordBreak: 'break-all' }}>
                        {this.state.data.connectionString}
                    </p>
                    <h1>Contacts</h1>
                    <div>
                        {contactList}
                    </div>
                    <button className='btn btn-primary' data-toggle='modal' data-target='#add-contact-modal'>Add Contact</button>

                    <div className='modal fade' id='add-contact-modal' tabIndex='-1' role='dialog' aria-labelledby='exampleModalLabel' aria-hidden='true'>
                        <div className='modal-dialog' role='document'>
                            <div className='modal-content'>
                                <div className='modal-header'>
                                    <h5 className='modal-title' id='exampleModalLabel'>Add Contact</h5>
                                    <button type='button' className='close' data-dismiss='modal' aria-label='Close'>
                                        <span aria-hidden='true'>&times;</span>
                                    </button>
                                </div>
                                <form onSubmit={this.addContact}>
                                    <div className='modal-body'>
                                        <div className='form-group'>
                                            <label htmlFor='connection-string-input'>Connection String</label>
                                            <textarea className='form-control' id='connection-string-input' row='5' />
                                            <small id='connection-string-help' className='form-text text-muted'>Text Help.</small>
                                        </div>
                                        <div className='form-group'>
                                            <label htmlFor='url-input'>URL</label>
                                            <input type='text' className='form-control' id='url-input' />
                                            <small id='url-help' className='form-text text-muted'>Text Help.</small>
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
                </div>
            );
        }
        return (
            <div>
                <div className='alert alert-danger m-4' id='danger-alert' hidden={!this.state.alert.show}>
                    {this.state.alert.text}
                </div>
                {Component}
            </div>
        );
    }
}
