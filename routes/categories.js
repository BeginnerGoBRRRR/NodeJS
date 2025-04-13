var express = require('express');
var router = express.Router();
let categorySchema = require('../schemas/category')
let slugify  = require('slugify')

/* GET users listing. */
router.get('/', async function(req, res, next) {
    // Only return non-deleted categories
    let categories = await categorySchema.find({ isDeleted: { $ne: true } });
    res.send(categories);
});

router.get('/:id', async function(req, res, next) {
    try {
        let category = await categorySchema.findOne({ 
            _id: req.params.id,
            isDeleted: { $ne: true }
        });
        if (!category) {
            return res.status(404).send({
                success: false,
                message: "Category not found"
            });
        }
        res.send({
            success:true,
            data:category
        });
    } catch (error) {
        res.status(404).send({
            success:false,
            message:error.message
        })
    }
});

router.post('/', async function(req, res, next) {
    try {
        let body = req.body;
        let newCategory = categorySchema({
            name:body.name,
            description: body.description || "",
            slug: slugify(body.name, {
                lower: true
            })
        });
        await newCategory.save()
        res.status(200).send({
            success:true,
            data:newCategory
        });
    } catch (error) {
        res.status(404).send({
            success:false,
            message:error.message
        })
    }
});

router.put('/:id', async function(req, res, next) {
    try {
        let body = req.body;
        let updatedObj = {}
        if(body.name){
            updatedObj.name = body.name;
            updatedObj.slug = slugify(body.name, { lower: true });
        }
        if(body.description !== undefined) {
            updatedObj.description = body.description;
        }
        let updatedCategory = await categorySchema.findOneAndUpdate(
            { _id: req.params.id, isDeleted: { $ne: true } },
            updatedObj,
            { new: true }
        );
        if (!updatedCategory) {
            return res.status(404).send({
                success: false,
                message: "Category not found"
            });
        }
        res.status(200).send({
            success:true,
            data:updatedCategory
        });
    } catch (error) {
        res.status(404).send({
            success:false,
            message:error.message
        })
    }
});

router.delete('/:id', async function(req, res, next) {
    try {
        // First check if category exists and is not already deleted
        const category = await categorySchema.findOne({ 
            _id: req.params.id,
            isDeleted: { $ne: true }
        });
        
        if (!category) {
            return res.status(404).send({
                success: false,
                message: "Category not found"
            });
        }

        // Soft delete the category
        let updatedCategory = await categorySchema.findByIdAndUpdate(
            req.params.id,
            { isDeleted: true },
            { new: true }
        );

        res.status(200).send({
            success: true,
            message: "Category deleted successfully",
            data: updatedCategory
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
