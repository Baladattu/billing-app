const mongoose = require("mongoose");

const billItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        nameSnapshot: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        unitPrice: {
            type: Number,
            required: true,
            min: 0,
        },
        lineTotal: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    { _id: false }
);

const billSchema = new mongoose.Schema(
    {
        billNumber: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        billedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        billDate: {
            type: Date,
            default: Date.now,
            index: true,
        },
        items: {
            type: [billItemSchema],
            validate: {
                validator: (items) => Array.isArray(items) && items.length > 0,
                message: "At least one item is required in a bill.",
            },
        },
        totals: {
            subTotal: { type: Number, required: true, min: 0 },
            discount: { type: Number, default: 0, min: 0 },
            tax: { type: Number, default: 0, min: 0 },
            grandTotal: { type: Number, required: true, min: 0 },
            paidAmount: { type: Number, default: 0, min: 0 },
            dueAmount: { type: Number, required: true, min: 0 },
        },
        payment: {
            isCollected: { type: Boolean, default: false, index: true },
            status: {
                type: String,
                enum: ["unpaid", "partial", "paid"],
                default: "unpaid",
                index: true,
            },
            mode: {
                type: String,
                enum: ["none", "cash", "online", "partial"],
                default: "none",
            },
            transactionRef: {
                type: String,
                trim: true,
                maxlength: 120,
            },
            collectedAt: Date,
            lastPaymentAt: Date,
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

billSchema.index({ customerId: 1, billDate: -1 });
billSchema.index({ "payment.status": 1, billDate: -1 });

module.exports = mongoose.model("Bill", billSchema);
