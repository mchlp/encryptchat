import express from 'express';
import util from './util.mjs';
import publicServer from './server/publicServer.mjs';

const router = express.Router();

router.get('/', (req, res) => {
    res.send('EncryptChat API - Manage');
});

router.post('/start', async (req, res) => {
    res.send(await util.resWrapper(async () => {await publicServer.start(req.body.port); }));
});

router.post('/stop', async (req, res) => {
    res.send(await util.resWrapper(publicServer.stop));
});

export default router;