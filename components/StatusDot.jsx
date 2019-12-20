
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
};

class StatusDot extends React.Component {

    render() {
        let statusColourCSS;
        if (this.props.online) {
            statusColourCSS = StatusDotColours['up'];
        } else {
            statusColourCSS = StatusDotColours['down'];
        }
        return (
            <div title={this.props.online ? "Online" : "Offline"}>
                <div style={{ ...StatusDotCSS, ...statusColourCSS }} />
            </div>
        );
    }
}
export default StatusDot;