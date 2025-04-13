var express = require('express');
var router = express.Router();
let categorySchema = require('../schemas/category')
let productSchema = require('../schemas/product')

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});
router.get('/api/:category', async function (req, res, next) {
  let categorySlug = req.params.category;
  let category = await categorySchema.findOne({
    slug: categorySlug
  })
  let products = await productSchema.find({
    category:category._id
  })
  res.send(products)
});
router.get('/api/:category/:product', async function (req, res, next) {
  let categorySlug = req.params.category;
  let productSlug = req.params.product;
  let category = await categorySchema.findOne({
    slug: categorySlug
  })
  let products = await productSchema.find({
    category:category._id,
    slug:productSlug
  })
  res.send(products)
});
router.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find(); // Lấy tất cả đơn hàng
    res.status(200).json(orders); // Trả về danh sách đơn hàng dưới dạng JSON
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving orders', error });
  }
});

module.exports = router;