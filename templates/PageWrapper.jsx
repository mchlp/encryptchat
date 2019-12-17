import DefaultHeader from './DefaultHeader';
import React from 'react';
import Navbar from './Navbar';

const PageWrapper = (props) => (
    <div>
        <DefaultHeader page={props.page} />
        <Navbar page={props.page} />
        {props.children}
    </div>
);

export default PageWrapper;