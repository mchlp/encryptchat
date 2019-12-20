import React from 'react';
import LoadingButton from './LoadingButton';
import Axios from 'axios';

class NewPassphrase extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            alert: {
                show: false,
                text: ''
            },
            submitBtnLoading: false
        };
    }

    onSubmit = async (e) => {
        e.preventDefault();
        this.setState({
            alert: {
                show: false
            },
            submitBtnLoading: true
        });
        const name = document.getElementById('name-input').value;
        const passphrase = document.getElementById('passphrase-input').value;
        const port = Number.parseInt(document.getElementById('port-input').value);
        if (passphrase !== document.getElementById('confirm-passphrase-input').value) {
            this.setState({
                alert: {
                    show: true,
                    text: 'The passphrases entered do not match.'
                },
                submitBtnLoading: false
            });
        } else {
            const res = await Axios.post('/api/manage/genKeys', { passphrase, port, name });
            if (res.data.success) {
                this.setState({
                    submitBtnLoading: false
                });
                this.props.getNewStatus();
            } else {
                this.setState({
                    alert: {
                        show: true,
                        text: res.data.error
                    },
                    submitBtnLoading: false
                });
            }
        }
    }

    render() {
        return (
            <div className='container'>
                <div className='jumbotron m-5'>
                    <form onSubmit={this.onSubmit}>
                        <h1 className='display-4 mb-4'>Welcome to EncryptChat!</h1>
                        <p className='lead'>Please enter the name you like to be displayed to others.</p>
                        <div className='input-group mb-3'>
                            <div className='input-group-prepend'>
                                <span className='input-group-text'>Name</span>
                            </div>
                            <input id='name-input' type='text' className='form-control' placeholder='Name' maxLength='100' required />
                        </div>
                        <p className='lead'>Before you can start chatting, we need to generate your keys to keep your messages secure. Your keys will be locked using a passphrase.</p>
                        <div className='alert alert-danger' id='danger-alert' hidden={!this.state.alert.show}>
                            {this.state.alert.text}
                        </div>
                        <div className='input-group mb-3'>
                            <div className='input-group-prepend'>
                                <span className='input-group-text'>Enter Passphrase</span>
                            </div>
                            <input id='passphrase-input' type='password' className='form-control' placeholder='Passhrase' maxLength='1000' required />
                        </div>
                        <div className='input-group mb-3'>
                            <div className='input-group-prepend'>
                                <span className='input-group-text'>Confirm Passphrase</span>
                            </div>
                            <input id='confirm-passphrase-input' type='password' className='form-control' placeholder='Confirm Passphrase' maxLength='1000' required />
                        </div>
                        <p className='lead'>Please ensure that you remember your passphrase. If you ever forget it, you will not be able to send any more messages using your generated keys.</p>
                        <p className='lead'>Also, please specify which port you would like the public server to run on. This will be the port that will need to be exposed and other users will connect to.</p>
                        <div className='input-group mb-3'>
                            <div className='input-group-prepend'>
                                <span className='input-group-text'>Port</span>
                            </div>
                            <input id='port-input' type='number' className='form-control' placeholder='Port' min='0' required />
                        </div>
                        <LoadingButton type='submit' className='btn btn-primary' loading={this.state.submitBtnLoading ? 1 : undefined}>Generate Keys</LoadingButton>
                    </form>
                </div>
            </div>
        );
    }
}

export default NewPassphrase;