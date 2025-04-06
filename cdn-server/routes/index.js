var express = require('express');
var router = express.Router();
let multer = require('multer')
let path = require('path')
let { CreateSuccessResponse } = require('../utils/responseHandler')

let avatarDir = path.join(__dirname, "../avatars")
let authURL = "http://localhost:4000/avatars/"
let storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, avatarDir),
    filename: (req, file, cb) => cb(null,
        (new Date(Date.now())).getTime() + "-" + file.originalname
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
router.post("/upload",upload.single('avatar'),async function (req, res, next) {
  let avatarURL = authURL+req.file.filename;
  CreateSuccessResponse(res,200,avatarURL) 
})
router.get("/avatars/:filename",function (req, res, next) {
  let pathAvatar = path.join(avatarDir,req.params.filename)
  res.sendFile(pathAvatar)
})
module.exports = router;
