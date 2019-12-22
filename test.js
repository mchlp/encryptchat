const crypto = require('crypto');

const passphrase = 'test';
const keyPair = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
    },
    privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
        cipher: 'aes-256-cbc',
        passphrase
    }
});

const ciphertext = crypto.publicEncrypt(
    {
        key: keyPair.publicKey,
    },
    Buffer.from(JSON.stringify({ test: 'test' }), 'utf-8')
).toString('base64');

const decipheredtext = crypto.privateDecrypt({
    key: keyPair.privateKey,
    passphrase: passphrase
}, Buffer.from(ciphertext, 'base64')).toString();

console.log(decipheredtext);