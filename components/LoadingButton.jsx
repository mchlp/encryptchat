import React from 'react';

const LoadingButton = (props) => (
    <button {...props}>
        {props.loading ?
            <div>
                <span className='spinner-border spinner-border-sm mr-2' role='status'></span>
                {props.children}
            </div>
            :
            <div>
                {props.children}
            </div>
        }
    </button>
);

export default LoadingButton;