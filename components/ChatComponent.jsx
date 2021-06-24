import React, { Component } from 'react';
import StatusDot from './StatusDot';
import constants from '../api/constants';

const timestampOptions = {
    dateStyle: 'full',
    timeStyle: 'long',
    hour12: true
};
export default class ChatComponent extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    componentDidMount() {
        if (!this.state.height) {
            this.setState({
                height: document.getElementById('chat-body-container').clientHeight
            });
        }
    }

    getSnapshotBeforeUpdate() {
        const element = document.getElementById('chat-body-container');
        const scrollAtBottom = Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 10;
        return {
            scrollAtBottom
        };
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (this.props.user) {
            document.getElementById('message-input').focus();
        }
        if (prevProps.user !== this.props.user || snapshot.scrollAtBottom) {
            document.getElementById('chat-body-container').scrollTop = document.getElementById('chat-body-container').scrollHeight;
        }
    }

    changeURLSubmit = async (e) => {
        e.preventDefault();
        await this.props.handleChangeURL(this.props.user, document.getElementById('change-url-input').value);
        $('#modify-url-modal').modal('hide');
    }

    sendMessage = async (e) => {
        e.preventDefault();
        if (this.props.user && this.props.data.online) {
            this.props.sendMessage(document.getElementById('message-input').value);
            document.getElementById('message-input').value = '';
        }
    }

    render() {
        let ChatBody;
        if (this.props.user) {
            const chatEleList = this.props.history.map((historyEle) => {
                switch (historyEle.type) {
                    case constants.eventTypes.INCOMING_MESSAGE: {
                        return (
                            <div key={historyEle.id} className='mt-2 clearfix'>
                                <div className='chat-bubble-left py-2 px-3' title={new Date(historyEle.time).toLocaleString('en-CA', timestampOptions)}>
                                    {historyEle.event.message}
                                </div>
                            </div>
                        );
                    }
                    case constants.eventTypes.OUTGOING_MESSAGE: {
                        return (
                            <div key={historyEle.id} className='mt-2 clearfix'>
                                <div className={'chat-bubble-right py-2 px-3 ' + (historyEle.event.status === constants.messageStatus.SENDING ? 'chat-sending-text' : null)} title={new Date(historyEle.time).toLocaleString('en-CA', timestampOptions) + (historyEle.event.status === constants.messageStatus.SENDING ? ' - Sending' : '')}>
                                    {historyEle.event.message}
                                </div>
                            </div>
                        );
                    }
                    case constants.eventTypes.ADD_CONTACT: {
                        return (
                            <div key={historyEle.id} className='mt-2 py-2 px-3' title={new Date(historyEle.time).toLocaleString('en-CA', timestampOptions)}>
                                <div className='text-center chat-grey-text'>
                                    Added {this.props.data.name} as a contact with address {historyEle.event.address}.
                                </div>
                            </div>
                        );
                    }
                    case constants.eventTypes.UPDATE_ADDRESS: {
                        return (
                            <div key={historyEle.id} className='mt-2 py-2 px-3' title={new Date(historyEle.time).toLocaleString('en-CA', timestampOptions)}>
                                <div className='text-center chat-grey-text'>
                                    Update address of {this.props.data.name} to {historyEle.event.address}.
                                </div>
                            </div>
                        );
                    }
                    default:
                        console.log(historyEle);
                }
            });
            ChatBody = (
                <div className='clearfix'>
                    {chatEleList}
                </div>
            );
        } else {
            ChatBody = null;
        }
        return (
            <div className='p-3 fill-height'>
                <div className='card fill-height'>
                    <div className='card-header'>
                        {
                            this.props.user ? (
                                <ul className='list-inline m-0 align-middle'>
                                    <li className='list-inline-item ml-1 align-middle'>
                                        <StatusDot online={this.props.data.online} />
                                    </li>
                                    <li className='list-inline-item ml-1 align-middle'>
                                        <h4 className='m-0'>{this.props.data.name}</h4>
                                    </li>
                                    <li className='list-inline-item float-right align-middle'>
                                        <button data-toggle='modal' data-target='#modify-url-modal' className='btn btn-link p-0'>Modify URL</button>
                                        <button className='btn btn-link p-0 ml-4' onClick={this.props.removeContact} >Remove Contact</button>
                                    </li>
                                </ul>
                            ) : (
                                <h4 className='m-0'>No User Selected</h4>
                            )
                        }
                    </div>
                    <div className='card-body' id='chat-body-container' style={{ wordBreak: 'break-all', height: this.state.height, overflowY: 'scroll', }}>
                        {ChatBody}
                    </div>
                    <div className='card-footer'>
                        <form onSubmit={this.sendMessage} autoComplete='off'>
                            <div className='input-group'>
                                <input readOnly={!this.props.user || !this.props.data.online} type='text' className='form-control' id='message-input' />
                                <div className='input-group-append'>
                                    <button type='submit' className='btn btn-secondary'>Send</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Modify URL Modal */}
                <div className='modal fade' id='modify-url-modal' tabIndex='-1' role='dialog'>
                    <div className='modal-dialog' role='document'>
                        <div className='modal-content'>
                            <div className='modal-header'>
                                <h5 className='modal-title'>Change Contact URL</h5>
                                <button type='button' className='close' data-dismiss='modal' aria-label='Close'>
                                    <span aria-hidden='true'>&times;</span>
                                </button>
                            </div>
                            <form onSubmit={this.changeURLSubmit}>
                                <div className='modal-body'>
                                    <div className='form-group'>
                                        <label htmlFor='change-url-input'>URL</label>
                                        <input type='text' className='form-control' id='change-url-input' defaultValue={this.props.data ? this.props.data.address : ''} />
                                        <small className='form-text text-muted'>This is the URL with the port where the public server of the other user is listening.</small>
                                    </div>
                                </div>
                                <div className='modal-footer'>
                                    <button type='button' className='btn btn-secondary' data-dismiss='modal'>Close</button>
                                    <button type='submit' className='btn btn-primary'>Change</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
