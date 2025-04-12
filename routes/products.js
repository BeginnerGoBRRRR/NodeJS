var express = require('express');
var router = express.Router();
let productSchema = require('../schemas/product')
let categorySchema = require('../schemas/category')
let slugify = require('slugify')
let multer = require('multer')
let path = require('path')
let FormData = require('form-data')
let axios = require('axios')
let fs = require('fs')

// Configure multer for local image storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/')
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp and original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
})

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Accept only images
        if (!file.mimetype.match('image')) {
            cb(new Error('Only image files are allowed'));
        } else {
            cb(null, true);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
})

// Serve static files from uploads directory
router.use('/images', express.static('uploads'));

// Upload image to CDN
async function uploadToCDN(filePath) {
    const form = new FormData();
    form.append('image', fs.createReadStream(filePath));
    
    try {
        const response = await axios.post('http://localhost:4000/upload', form, {
            headers: {
                ...form.getHeaders()
            }
        });
        return response.data.url;
    } catch (error) {
        console.error('Error uploading to CDN:', error);
        throw error;
    } finally {
        // Clean up the temporary file
        fs.unlinkSync(filePath);
    }
}

/* GET products listing. */
router.get('/', async function (req, res, next) {
    let query = req.query;
    console.log(query);
    let objQuery = {};
    if (query.name) {
        objQuery.name = new RegExp(query.name, 'i')
    } else {
        objQuery.name = new RegExp("", 'i')
    }
    objQuery.price = {};
    if (query.price) {
        if (query.price.$gte) {
            objQuery.price.$gte = Number(query.price.$gte);
        } else {
            objQuery.price.$gte = 0;
        }
        if (query.price.$lte) {
            objQuery.price.$lte = Number(query.price.$lte);
        } else {
            objQuery.price.$lte = 10000;
        }
    } else {
        objQuery.price.$lte = 10000;
        objQuery.price.$gte = 0;
    }

    let products = await productSchema.find(objQuery).populate(
        { path: 'category', select: 'name' }
    );
    res.send(products);
});

router.get('/:id', async function (req, res, next) {
    try {
        let product = await productSchema.findById(req.params.id);
        res.send({
            success: true,
            data: product
        });
    } catch (error) {
        res.status(404).send({
            success: false,
            message: error.message
        })
    }
});

router.post('/', upload.single('image'), async function (req, res, next) {
    try {
        let body = req.body;
        let category = await categorySchema.findOne({ name: body.category })
        
        if (!category) {
            return res.status(404).send({
                success: false,
                message: "Category not found"
            });
        }

        // Get image URL
        let imageUrl = "https://via.placeholder.com/400"; // Default image
        if (req.file) {
            // Construct the URL for the uploaded image
            imageUrl = `/products/images/${req.file.filename}`;
        }

        let newProduct = new productSchema({
            name: body.name,
            price: body.price ? body.price : 1000,
            quantity: body.quantity ? body.quantity : 10,
            description: body.description || "No description available",
            imageUrl: imageUrl,
            category: category._id,
            slug: slugify(body.name, {
                lower: true
            })
        });

        await newProduct.save();
        res.status(200).send({
            success: true,
            data: newProduct
        });
    } catch (error) {
        res.status(400).send({
            success: false,
            message: error.message
        });
    }
});

router.put('/:id', upload.single('image'), async function (req, res, next) {
    try {
        let body = req.body;
        let updatedObj = {};

        if (body.name) updatedObj.name = body.name;
        if (body.quantity) updatedObj.quantity = body.quantity;
        if (body.price) updatedObj.price = body.price;
        if (body.category) updatedObj.category = body.category;
        if (body.description) updatedObj.description = body.description;

        // Handle image upload if provided
        if (req.file) {
            updatedObj.imageUrl = `/products/images/${req.file.filename}`;
        }

        let updatedProduct = await productSchema.findByIdAndUpdate(
            req.params.id, 
            updatedObj, 
            { new: true }
        );

        res.status(200).send({
            success: true,
            data: updatedProduct
        });
    } catch (error) {
        res.status(400).send({
            success: false,
            message: error.message
        });
    }
});

router.delete('/:id', async function (req, res, next) {
    try {
        let updatedProduct = await productSchema.findByIdAndUpdate(
            req.params.id, 
            { isDeleted: true }, 
            { new: true }
        );
        res.status(200).send({
            success: true,
            data: updatedProduct
        });
    } catch (error) {
        res.status(404).send({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
