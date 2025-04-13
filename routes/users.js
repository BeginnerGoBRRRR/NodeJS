var express = require('express');
var router = express.Router();
let userController = require('../controllers/users')
let { CreateSuccessResponse, CreateErrorResponse } = require('../utils/responseHandler')
let{check_authentication,check_authorization} = require('../utils/check_auth');
const constants = require('../utils/constants');
const userSchema = require('../schemas/user');

/* GET users listing. */

router.get('/',check_authentication,check_authorization(constants.MOD_PERMISSION), async function (req, res, next) {
  console.log(req.headers.authorization);
  let users = await userController.GetAllUser();
  CreateSuccessResponse(res, 200, users)
});

// Get single user by ID
router.get('/:id', check_authentication, async function (req, res, next) {
  try {
    const user = await userController.GetUserByID(req.params.id);
    if (!user) {
      return CreateErrorResponse(res, 404, 'User not found');
    }
    CreateSuccessResponse(res, 200, user);
  } catch (error) {
    CreateErrorResponse(res, 500, error.message);
  }
});

// Get user profile
router.get('/profile', check_authentication, async function (req, res, next) {
  try {
    const user = await userController.GetUserByID(req.user._id);
    CreateSuccessResponse(res, 200, user);
  } catch (error) {
    CreateErrorResponse(res, 500, error.message);
  }
});

router.post('/', async function (req, res, next) {
  try {
    let body = req.body;
    let newUser = await userController.CreateAnUser(body.username, body.password, body.email, body.role);
    CreateSuccessResponse(res, 201, newUser)
  } catch (error) {
    CreateErrorResponse(res, 400, error.message)
  }
});

// Update user
router.put('/:id', check_authentication, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Check if user exists
    const user = await userSchema.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check authorization
    if (req.user.role.name !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this user' });
    }

    // Only admin can change roles
    if (role && req.user.role.name !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admin can change user roles' });
    }

    const updatedUser = await userController.UpdateAnUser(id, req.body);
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete user
router.delete('/:id', check_authentication, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await userSchema.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check authorization
    if (req.user.role.name !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this user' });
    }

    await userController.DeleteAnUser(id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
