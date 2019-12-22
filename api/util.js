const crypto = require('crypto');

const util = {};

util.ONE_CLIENT_ONLY_ERROR = 'A client page is already open. Only one client page may be open at a time.';

const AES_KEY_LENGTH = 128;
const AES_ALGORITHM = 'aes192';
const RSA_SIGN_ALGORITHM = 'RSA-SHA256';
const RSA_SIGN_ENCODING = 'base64';

util.resWrapper = async (func) => {
    try {
        const body = (await func());
        return ({
            success: true,
            body
        });
    } catch (error) {
        console.error(error);
        return ({
            success: false,
            error: error.toString()
        });
    }
};

const rsa = {};
rsa.genKeys = (passphrase) => {
    return crypto.generateKeyPairSync('rsa', {
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
};

rsa.sign = (text, key) => {
    const sign = crypto.createSign(RSA_SIGN_ALGORITHM);
    sign.update(text);
    sign.end();
    return sign.sign(key, RSA_SIGN_ENCODING);
};

rsa.verify = (signature, text, key) => {
    const verify = crypto.createVerify(RSA_SIGN_ALGORITHM);
    verify.update(text);
    verify.end();
    return verify.verify(key, signature, RSA_SIGN_ENCODING);
};

util.rsa = rsa;

const aes = {};
aes.genKey = () => {
    return crypto.randomBytes(AES_KEY_LENGTH / 8).toString('base64');
};

aes.encrypt = (key, plaintext) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(AES_ALGORITHM, key, iv);
    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    const plainpack = {
        ciphertext,
        iv: iv.toString('base64')
    };
    const cipherpack = Buffer.from(JSON.stringify(plainpack), 'utf8').toString('base64');
    return cipherpack;
};

aes.decrypt = (key, cipherpack) => {
    const plainpack = JSON.parse(Buffer.from(cipherpack, 'base64').toString('utf8'));
    const decipher = crypto.createDecipheriv(AES_ALGORITHM, key, Buffer.from(plainpack.iv, 'base64'));
    let plaintext = decipher.update(plainpack.ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');
    return plaintext;
};

util.aes = aes;

module.exports = util;