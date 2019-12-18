import express from 'express';
import manage from './manage.mjs';
const router = express.Router();

const init = async () => {
    await manage.init();
};

router.get('/', (req, res) => {
    res.send('EncryptChat API');
});

router.use('/manage', manage.router);

export default { init, router };