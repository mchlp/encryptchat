import util from './util.mjs';

const aesKey = util.aes.genKey();
const ciphertext = util.aes.encrypt(aesKey, 'this is a test');
console.log(ciphertext);
const plaintext = util.aes.decrypt(aesKey, ciphertext);
console.log(plaintext);