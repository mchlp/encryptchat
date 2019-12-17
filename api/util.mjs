const util = {};

util.resWrapper =  async (func) => {
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

export default util;