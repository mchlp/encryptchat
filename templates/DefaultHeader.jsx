import Head from 'next/head';
import React from 'react';

const DefaultHeader = (props) => (
    <div>
        <Head>
            <title>{props.title}</title>
            <link rel="icon" href="/favicon.ico" />
            <script src='./bootstrap.bundle.min.js' />
            <link rel='stylesheet' type='text/css' href='./bootstrap.min.css' />
        </Head>
    </div>
);

export default DefaultHeader;