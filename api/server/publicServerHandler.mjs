import express from 'express';
import util from '../util.mjs';
const router = express.Router();

let handlerFunc;

const init = (func) => {
    handlerFunc = func;
};

router.post('/', async (req, res) => {
    res.send(await util.resWrapper(async () => {
        return await handlerFunc(req);
    }));
});

export default {init, router};