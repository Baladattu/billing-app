const mongoose = require("mongoose");

const dueSchema = new mongoose.Schema(
    {
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        billId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Bill",
            required: true,
            unique: true,
            index: true,
        },
        amountDue: {
            type: Number,
            required: true,
            min: 0,
        },
        isCollected: {
            type: Boolean,
            default: false,
            index: true,
        },
        status: {
            type: String,
            enum: ["open", "partial", "paid"],
            default: "open",
            index: true,
        },
        collectionMode: {
            type: String,
            enum: ["none", "cash", "online", "partial"],
            default: "none",
        },
        lastCollectedAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        dueDate: Date,
        collectedAt: Date,
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

dueSchema.index({ customerId: 1, isCollected: 1, dueDate: 1 });

module.exports = mongoose.model("Due", dueSchema);
