module.exports = {
    CreateSuccessResponse: function (res, status, data) {
        res.status(status).send({
            success: true,
            data: data
        });
    }, CreateErrorResponse: function (res, status, message) {
        res.status(status).send({
            success: false,
            message: message
        });
    },
    CreateCookieResponse: function (res,key,value,exp) {
        res.cookie(key, value, {
            httpOnly: true,
            expires: new Date(exp),
            signed: true
        });
    }

}