import React from 'react';
import LoadingButton from './LoadingButton';
import axios from 'axios';
import router from 'next/router';

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
        const passphrase = document.getElementById('passphrase-input').value;
        if (passphrase !== document.getElementById('confirm-passphrase-input').value) {
            this.setState({
                alert: {
                    show: true,
                    text: 'The passphrases entered do not match.'
                },
                submitBtnLoading: false
            });
        } else {
            const res = await axios.post('/api/manage/genKeys', { passphrase });
            if (res.data.success) {
                this.setState({
                    submitBtnLoading: false
                });
                router.push('/');
            } else {
                this.setState({
                    alert: {
                        show: true,
                        text: 'An unknown error has occured. Please try again later.'
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
                        <LoadingButton type='submit' className='btn btn-primary' loading={this.state.submitBtnLoading ? 1 : undefined}>Generate Keys</LoadingButton>
                    </form>
                </div>
            </div>
        );
    }
}

export default NewPassphrase;