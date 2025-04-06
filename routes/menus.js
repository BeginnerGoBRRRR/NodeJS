var express = require('express');
var router = express.Router();
var menuSchema = require('../schemas/menu')
let slugify = require('slugify')
let { CreateSuccessResponse, CreateErrorResponse } = require('../utils/responseHandler')
/* GET users listing. */
router.get('/', async function (req, res, next) {
  let allmenu = await menuSchema.find({})
  let parents = allmenu.filter(m => !m.parent)
  let result = []
  for (const parent of parents) {
    let QueryChildren = await menuSchema.find({
      parent: parent._id
    })
    let children = [];
    for (const child of QueryChildren) {
      children.push({
        text: child.text,
        url: child.url
      })
    }
    result.push({
      text: parent.text,
      url: parent.url,
      children:children
    })
  }
  CreateSuccessResponse(res, 200, result)
});
router.post('/', async function (req, res, next) {
  try {
    let objInput = {
      text: req.body.text,
      url: '/' + slugify(req.body.text, {
        lower: true
      })
    }
    if (req.body.parent) {
      let parent = await menuSchema.findOne({
        text: req.body.parent
      })
      objInput.parent = parent._id;
    }
    let newMenu = new menuSchema(objInput)
    await newMenu.save();
    CreateSuccessResponse(res, 200, newMenu)
  } catch (error) {
    CreateErrorResponse(res, 404, error.message)
  }
});


module.exports = router;
