
import React from 'react';

const StatusDotCSS = {
    height: '15px',
    width: '15px',
    borderRadius: '50%',
};

const StatusDotColours = {
    'up': {
        'background': '#00cc00'
    },
    'down': {
        'background': '#cc0000'
    },
    'new-message': {
        'background': '#ffffff'
    }
};

class StatusDot extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            newMessageFlash: false
        };
    }

    componentDidMount() {
        setInterval(() => {
            if (this.props.newMessage) {
                if (this.state.newMessageFlash) {
                    this.setState({
                        newMessageFlash: false
                    });
                } else {
                    this.setState({
                        newMessageFlash: true
                    });
                }
            } else if (this.state.newMessageFlash) {
                this.setState({
                    newMessageFlash: false
                });
            }
        }, 500);
    }

    render() {
        let statusColourCSS;
        if (this.state.newMessageFlash) {
            statusColourCSS = StatusDotColours['new-message'];
        } else if (this.props.online) {
            statusColourCSS = StatusDotColours['up'];
        } else {
            statusColourCSS = StatusDotColours['down'];
        }

        return (
            <div title={this.props.online ? 'Online' : 'Offline'}>
                <div style={{ ...StatusDotCSS, ...statusColourCSS }} />
            </div>
        );
    }
}
export default StatusDot;