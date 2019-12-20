import React, { Component } from 'react';
import StatusDot from './StatusDot';

export default class ChatComponent extends Component {
    constructor(props) {
        super(props);
    }

    changeURLSubmit = async (e) => {
        e.preventDefault();
        await this.props.handleChangeURL(this.props.user, document.getElementById('change-url-input').value);
        $('#modify-url-modal').modal('hide');
    }

    sendMessage = (e) => {
        e.preventDefault();
        const text = document.getElementById('message-input').value;
        document.getElementById('message-input').value = '';
    }

    render() {
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
                                    </li>
                                </ul>
                            ) : (
                                <h4 className='m-0'>No User Selected</h4>
                            )
                        }
                    </div>
                    <div className='card-body p-3' style={{ wordBreak: 'break-all' }}>
                        <div>
                            User:
                            History: {JSON.stringify(this.props.history)}
                        </div>
                    </div>
                    {this.props.user ?
                        <div className='card-footer'>
                            <form onSubmit={this.sendMessage} autoComplete='off'>
                                <div className='input-group'>
                                    <input type='text' className='form-control' id='message-input' />
                                    <div className='input-group-append'>
                                        <button type='submit' className='btn btn-secondary'>Send</button>
                                    </div>
                                </div>
                            </form>
                        </div>
                        : null
                    }
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
