import DefaultHeader from './DefaultHeader';
import React from 'react';
import Navbar from './Navbar';

const PageWrapper = (props) => (
    <div>
        <DefaultHeader title={props.title} />
        <Navbar />
        {props.children}
    </div>
);

export default PageWrapper;