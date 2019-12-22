const express = require('express');
const util = require('../util.js');
const router = express.Router();

let handlerFunc;

const init = (func) => {
    handlerFunc = func;
};

router.use(express.json());

router.post('/', async (req, res) => {
    res.send(await util.resWrapper(async () => {
        return await handlerFunc(req);
    }));
});

module.exports = { init, router };