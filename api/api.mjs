import express from 'express';
import manage from './manage.mjs';
const router = express.Router();

router.get('/', (req, res) => {
    res.send('EncryptChat API');
});

router.use('/manage', manage);

export default router;