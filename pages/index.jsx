import React from 'react';
import axios from 'axios';
import PageWrapper from '../templates/PageWrapper';
import NewPassphrase from '../components/NewPassphrase';
import EnterPassphrase from '../components/EnterPassphrase';


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
                    <h3>Loading...</h3>
                </div>
            );
        } else if (this.state.status === 'initialize-keys') {
            Component = (
                <NewPassphrase />
            );
        } else if (this.state.status === 'set-passphrase') {
            Component = (
                <EnterPassphrase />
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
