import React from 'react';
import Link from 'next/link';

const Navbar = (props) => (
    <div>
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
            <a className="navbar-brand" href="/">EncryptChat</a>
            <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarText" aria-controls="navbarText" aria-expanded="false" aria-label="Toggle navigation">
                <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="navbarText">
                <ul className="navbar-nav ml-auto">
                    <li className={'nav-item ' + (props.page === 'chats' ? 'active' : null)}>
                        <Link href="/chats"><a className="nav-link">Chats</a></Link>
                    </li>
                    <li className={'nav-item ' + (props.page === 'manage' ? 'active' : null)}>
                        <Link href="/manage"><a className="nav-link">Manage</a></Link>
                    </li>
                </ul>
            </div>
        </nav>
    </div>
);

export default Navbar;