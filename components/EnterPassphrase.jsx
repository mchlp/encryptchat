import React from 'react';
import LoadingButton from '../components/LoadingButton';
import axios from 'axios';
import router from 'next/router';

class EnterPassphrase extends React.Component {

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
        const res = await axios.post('/api/manage/setPassphrase', { passphrase });
        console.log(res.data);
        if (res.data.success) {
            this.setState({
                submitBtnLoading: false
            });
            router.push('/');
        } else {
            this.setState({
                alert: {
                    show: true,
                    text: 'The passphrase you entered does not match the one for your keys.'
                },
                submitBtnLoading: false
            });
        }
    }

    render() {
        return (
            <div className='container'>
                <div className='jumbotron m-5'>
                    <form onSubmit={this.onSubmit}>
                        <h1 className='display-4 mb-4'>Welcome back to EncryptChat!</h1>
                        <p className='lead'>Before you can start chatting, we need your passphrase to encrypt your outgoing messages.</p>
                        <div className='alert alert-danger' id='danger-alert' hidden={!this.state.alert.show}>
                            {this.state.alert.text}
                        </div>
                        <div className='input-group mb-3'>
                            <div className='input-group-prepend'>
                                <span className='input-group-text'>Enter Passphrase</span>
                            </div>
                            <input id='passphrase-input' type='password' className='form-control' placeholder='Passhrase' maxLength='1000' required />
                        </div>
                        <LoadingButton type='submit' className='btn btn-primary' loading={this.state.submitBtnLoading ? 1 : undefined}>Submit</LoadingButton>
                    </form>
                </div>
            </div>
        );
    }
}

export default EnterPassphrase;