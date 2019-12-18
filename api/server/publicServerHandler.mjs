import express from 'express';
import util from 'util';
const router = express.Router();

let handlerFunc;

const init = (func) => {
    handlerFunc = func;
};

router.post('/', async (req, res) => {
    await handlerFunc(req);
    res.send(await util.resWrapper(() => {
        return 'received';
    }));
});

export default {init, router};