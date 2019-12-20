import React from 'react';
import LoadingButton from '../components/LoadingButton';
import Axios from 'axios';

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
        const res = await Axios.post('/api/manage/setPassphrase', { passphrase });
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