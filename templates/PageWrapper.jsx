import DefaultHeader from './DefaultHeader';
import React from 'react';
import Navbar from './Navbar';

const PageWrapper = (props) => (
    <div className='full-height'>
        <DefaultHeader page={props.page} />
        <Navbar page={props.page} />
        {props.children}
    </div>
);

export default PageWrapper;