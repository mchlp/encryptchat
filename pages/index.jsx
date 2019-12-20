import React from 'react';
import axios from 'axios';
import PageWrapper from '../templates/PageWrapper';
import NewPassphrase from '../components/NewPassphrase';
import EnterPassphrase from '../components/EnterPassphrase';
import ChatPage from '../components/ChatPage';


class Home extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            status: 'loading'
        };
    }

    componentDidMount() {
        this.updateStatus();
    }

    updateStatus = async () => {
        const status = (await axios.get('/api/manage/status')).data.body;
        this.setState({
            status
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
        } else if (this.state.status === 'initialize-keys') {
            Component = (
                <NewPassphrase getNewStatus={this.updateStatus} />
            );
        } else if (this.state.status === 'set-passphrase') {
            Component = (
                <EnterPassphrase getNewStatus={this.updateStatus} />
            );
        } else if (this.state.status === 'ready') {
            Component = (
                <ChatPage />
            );
        } else {
            Component = (
                <div className='m-3'>
                    An unknown error has occured. Please try again later.
                </div>
            );
        }
        return (
            <PageWrapper page='home'>
                <div>
                    {Component}
                </div>
            </PageWrapper>
        );
    }
}

export default Home;
