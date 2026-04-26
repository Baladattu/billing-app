const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { ROLE_VALUES, USER_ROLES } = require("../constants/roles");

const addressSchema = new mongoose.Schema(
    {
        line1: { type: String, trim: true, maxlength: 150 },
        line2: { type: String, trim: true, maxlength: 150 },
        city: { type: String, trim: true, maxlength: 80 },
        state: { type: String, trim: true, maxlength: 80 },
        pincode: { type: String, trim: true, maxlength: 20 },
    },
    { _id: false }
);

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            maxlength: 150,
            index: true,
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
            select: false,
        },
        phone: {
            type: String,
            trim: true,
            maxlength: 20,
        },
        role: {
            type: String,
            enum: ROLE_VALUES,
            default: USER_ROLES.CUSTOMER,
            index: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        address: addressSchema,
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

userSchema.index({ role: 1, isActive: 1 });

userSchema.pre("save", async function preSave(next) {
    if (!this.isModified("password")) {
        next();
        return;
    }

    this.password = await bcrypt.hash(this.password, 12);
    next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
