var express = require('express');
var router = express.Router();
var userController = require('../controllers/users')
let { CreateSuccessResponse, CreateCookieResponse } = require('../utils/responseHandler')
let jwt = require('jsonwebtoken')
let constants = require('../utils/constants')
let { check_authentication } = require('../utils/check_auth')
let crypto = require('crypto')
let mailer = require('../utils/mailer')
let { SignUpValidator, LoginValidator, validate } = require('../utils/validator')
let multer = require('multer')
let path = require('path')
let FormData = require('form-data')
let axios = require('axios')
let fs = require('fs')



router.post('/signup', SignUpValidator, validate, async function (req, res, next) {
    try {
        let newUser = await userController.CreateAnUser(
            req.body.username, req.body.password, req.body.email, 'user'
        )
        CreateSuccessResponse(res, 200, newUser)
    } catch (error) {
        next(error)
    }
});
router.post('/login', LoginValidator, validate, async function (req, res, next) {
    try {
        let user_id = await userController.CheckLogin(
            req.body.username, req.body.password
        )
        let exp = (new Date(Date.now() + 60 * 60 * 1000)).getTime();
        let token = jwt.sign({
            id: user_id,
            exp: exp
        }, constants.SECRET_KEY)
        CreateCookieResponse(res, 'token', token, exp);
        CreateSuccessResponse(res, 200, token)
    } catch (error) {
        next(error)
    }
});
router.get('/logout', function (req, res, next) {
    CreateCookieResponse(res, 'token', "", Date.now());
})
router.get('/me', check_authentication, function (req, res, next) {
    CreateSuccessResponse(res, 200, req.user)
})
router.post('/change_password', check_authentication,
    function (req, res, next) {
        try {
            let oldpassword = req.body.oldpassword;
            let newpassword = req.body.newpassword;
            let result = userController.Change_Password(req.user, oldpassword, newpassword)
            CreateSuccessResponse(res, 200, result)
        } catch (error) {
            next(error)
        }
    })

router.post('/forgotpassword', async function (req, res, next) {
    try {
        let email = req.body.email;
        let user = await userController.GetUserByEmail(email);
        user.resetPasswordToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordTokenExp = (new Date(Date.now() + 10 * 60 * 1000));
        await user.save();
        let url = 'http://localhost:3000/auth/resetpassword/' + user.resetPasswordToken;
        await mailer.sendMailForgotPassword(user.email, url);
        CreateSuccessResponse(res, 200, url)
    } catch (error) {
        next(error)
    }
})
router.post('/resetpassword/:token', async function (req, res, next) {
    try {
        let token = req.params.token;
        let password = req.body.password;
        let user = await userController.GetUserByToken(token);
        user.password = password;
        user.resetPasswordToken = null;
        user.resetPasswordTokenExp = null;
        await user.save();
        CreateSuccessResponse(res, 200, user)
    } catch (error) {
        next(error)
    }
})
//storage
let avatarDir = path.join(__dirname, "../avatars");
let authURL = "http://localhost:3000/auth/avatars/";
let serverCDN = 'http://localhost:4000/upload';
let storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, avatarDir),
    filename: (req, file, cb) => cb(null,
        file.originalname
    )
})
let upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.match('image')) {
            cb(new Error("tao nhan anh? thoi"));
        } else {
            cb(null, true);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024
    }
})

//upload
router.post("/change_avatar", check_authentication, upload.single('avatar'), async function (req, res, next) {
    let imgPath = path.join(avatarDir, req.file.filename);
    let newform = new FormData();
    newform.append('avatar', fs.createReadStream(imgPath))
    let result = await axios.post(serverCDN, newform, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
    fs.unlinkSync(imgPath)
    // let avatarURL = authURL + req.file.filename;
    req.user.avatarUrl = result.data.data;
    await req.user.save()
    CreateSuccessResponse(res, 200,req.user )
})

router.get("/avatars/:filename", function (req, res, next) {
    let pathAvatar = path.join(avatarDir, req.params.filename)
    res.sendFile(pathAvatar)
})

module.exports = router;
