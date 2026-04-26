const Product = require("../models/Product");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { created, success, updated } = require("../utils/response");

const getPagination = (query) => {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

const createProduct = asyncHandler(async (req, res) => {
    const product = await Product.create(req.body);
    return created(res, { product }, "Product created successfully");
});

const getProducts = asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};

    if (req.query.isActive !== undefined) {
        filter.isActive = req.query.isActive === "true";
    }

    if (req.query.search) {
        filter.name = { $regex: req.query.search.trim(), $options: "i" };
    }

    const [products, total] = await Promise.all([
        Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Product.countDocuments(filter),
    ]);

    return success(res, {
        products,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
        },
    });
});

const getProductById = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id).lean();
    if (!product) {
        throw new AppError("Product not found", 404);
    }
    return success(res, { product });
});

const updateProduct = asyncHandler(async (req, res) => {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    }).lean();

    if (!product) {
        throw new AppError("Product not found", 404);
    }

    return updated(res, { product }, "Product updated successfully");
});

module.exports = {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
};
