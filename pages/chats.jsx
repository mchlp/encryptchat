import React from 'react';
import PageWrapper from '../templates/PageWrapper';
import io from 'socket.io-client';

class Chats extends React.Component {
    componentDidMount() {
        this.socket = io();
        this.socket.on('now', data => {
            console.log(data);
        });
    }
    render() {
        return (
            <PageWrapper page='chats'>
                <div>
                    Chat List!!
                </div>
            </PageWrapper>
        );
    }
}

export default Chats;
