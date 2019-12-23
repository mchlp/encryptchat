# encryptchat
## About
encryptchat is an end-to-end encrypted chat system for users to communicate with each other by sending encrypted packets directly to the other user's computer.

### Components
It consists of three components:

#### 1. Private Server
This is where the majority of the processing occurs. It connects to the web interface using a web socket for the current and it also runs a public server to receive packets from other users.
#### 2. Public Server
This is an Express server where other users will be sending their packets which are intended for the current user. Every packet received is then passed onto the Private Server for processing. 
#### 3. Web Interface
This is where the current user interacts with the program. Created using Next.js and React, the web interface allows users to add contacts, view their information, as well as chat with other users by opening the page in their browser.

### Encryption
All of the data associated with the program is stored locally in an encrypted format so that the only place where your sensitive data will be in plaintext is within the program itself.

When the program is initialized, an RSA key pair with a passphrase is generated. This keypair will then be used to encrypt other keys that will be used to encrypt the rest of the data using AES.

When establishing a connection with other users, the RSA keypairs of each user are used to verify identities by signing and encrypting each packet. Afterwards, a common AES key is established for quicker encryption of large pieces of data.

### HTTP Tunnel
To allow other users to send packets to the public server running on `localhost` without exposing ports on the user's machine or changing the firewall settings, an HTTP tunnel is set up using `ngrok`. This sets up an public URL that other users can send packets to which will then be tunnelled to the public server running on the users's computer.

## Requirements
- node.js
- npm

## How to Run
1. Clone the repository
2. Run `npm install`
3. Modify `config.json` to change private server port if necessary

**To run development version:**

4. Run `npm run dev` to start server

**To run production version:**

4. Run `npm run build` to generate static files
5. Run `npm start` to start server

## How to Use
1. Start the server by following the steps in [How to Run](##How-to-Run)
2. Navigate to the web interface on your web browser by going to `localhost:3000`, or whichever port your private server is running on.
3. On your first visit, the page will prompt you to enter information used to generate your RSA key pair and your connection string as well as to run the public server.
4. To add other contacts, press the `+ Add` button on the page and enter their information. The other user will then be prompted on their web interface to check over your public key and connection string. Ensure that the public key and connection string displayed on the connect request on their computer matches your public key and connection string (found clicking on the `My Info` button).
5. Your information can be found by clicking on the `My Info` button.
6. If the other user's public server URL changes (which will happen if they restart the program on their computer), you can simply change it by clicking on their user in the chat bar on the side and then clicking `Modify URL`.