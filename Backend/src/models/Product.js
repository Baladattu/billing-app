const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
            unique: true,
        },
        sku: {
            type: String,
            trim: true,
            uppercase: true,
            maxlength: 40,
            unique: true,
            sparse: true,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        unit: {
            type: String,
            trim: true,
            default: "pcs",
            maxlength: 20,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 500,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

productSchema.index({ name: 1, isActive: 1 });

module.exports = mongoose.model("Product", productSchema);
