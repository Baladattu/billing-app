const AppError = require("../utils/AppError");
const Product = require("../models/Product");
const Due = require("../models/Due");

const toMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const toPositiveNumber = (value, fieldName) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new AppError(`${fieldName} must be a valid positive number.`, 400);
    }
    return toMoney(parsed);
};

const getBillPaymentStatus = ({ paidAmount, dueAmount }) => {
    if (dueAmount === 0) {
        return "paid";
    }

    if (paidAmount > 0) {
        return "partial";
    }

    return "unpaid";
};

const getDueStatus = (billStatus) => {
    if (billStatus === "paid") {
        return "paid";
    }

    if (billStatus === "partial") {
        return "partial";
    }

    return "open";
};

const normalizePaymentMode = (mode, paidAmount) => {
    if (!paidAmount) {
        return "none";
    }

    const normalized = String(mode || "").toLowerCase();
    const allowed = ["cash", "online", "partial"];
    if (!allowed.includes(normalized)) {
        throw new AppError("paymentMode must be cash, online or partial when amount is collected.", 400);
    }

    return normalized;
};

const generateBillNumber = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `BILL-${timestamp}-${random}`;
};

const buildBillItems = async (rawItems = []) => {
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
        throw new AppError("At least one item is required.", 400);
    }

    const productIds = [...new Set(rawItems.map((item) => String(item.productId || "")))];
    const products = await Product.find({ _id: { $in: productIds }, isActive: true }).lean();
    const productsById = new Map(products.map((product) => [String(product._id), product]));

    if (products.length !== productIds.length) {
        throw new AppError("One or more products are invalid or inactive.", 400);
    }

    return rawItems.map((item) => {
        const quantity = Number(item.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) {
            throw new AppError("Item quantity must be greater than 0.", 400);
        }

        const product = productsById.get(String(item.productId));
        if (!product) {
            throw new AppError("Product not found for one of the items.", 400);
        }

        const unitPrice = toPositiveNumber(product.price, "unitPrice");
        const lineTotal = toMoney(unitPrice * quantity);

        return {
            product: product._id,
            nameSnapshot: product.name,
            quantity,
            unitPrice,
            lineTotal,
        };
    });
};

const buildBillCreatePayload = async (payload) => {
    const items = await buildBillItems(payload.items);
    const subTotal = toMoney(items.reduce((sum, item) => sum + item.lineTotal, 0));
    const discount = toPositiveNumber(payload.discount || 0, "discount");
    const tax = toPositiveNumber(payload.tax || 0, "tax");
    const grandTotal = toMoney(subTotal - discount + tax);

    if (grandTotal < 0) {
        throw new AppError("grandTotal cannot be negative.", 400);
    }

    const paidAmount = toPositiveNumber(payload.paidAmount || 0, "paidAmount");
    if (paidAmount > grandTotal) {
        throw new AppError("paidAmount cannot exceed grandTotal.", 400);
    }

    const dueAmount = toMoney(grandTotal - paidAmount);
    const billStatus = getBillPaymentStatus({ paidAmount, dueAmount });
    const paymentMode = normalizePaymentMode(payload.paymentMode, paidAmount);
    const now = new Date();

    return {
        billNumber: payload.billNumber || generateBillNumber(),
        customerId: payload.customerId,
        billedBy: payload.billedBy || null,
        billDate: payload.billDate || now,
        items,
        totals: {
            subTotal,
            discount,
            tax,
            grandTotal,
            paidAmount,
            dueAmount,
        },
        payment: {
            isCollected: dueAmount === 0,
            status: billStatus,
            mode: paymentMode,
            transactionRef: payload.transactionRef || null,
            collectedAt: dueAmount === 0 ? now : null,
            lastPaymentAt: paidAmount > 0 ? now : null,
        },
        notes: payload.notes || null,
    };
};

const syncDueForBill = async (bill, options = {}) => {
    const billStatus = bill.payment.status;
    const dueStatus = getDueStatus(billStatus);
    const existingDue = await Due.findOne({ billId: bill._id });
    const basePayload = {
        customerId: bill.customerId,
        billId: bill._id,
        amountDue: bill.totals.dueAmount,
        isCollected: bill.totals.dueAmount === 0,
        status: dueStatus,
        collectionMode: options.paymentMode || bill.payment.mode || "none",
        lastCollectedAmount: options.lastCollectedAmount || 0,
    };

    if (bill.totals.dueAmount === 0) {
        const paidPayload = {
            ...basePayload,
            collectedAt: options.collectedAt || new Date(),
        };

        if (!existingDue) {
            await Due.create(paidPayload);
            return;
        }

        Object.assign(existingDue, paidPayload);
        await existingDue.save();
        return;
    }

    if (!existingDue) {
        await Due.create({
            ...basePayload,
            dueDate: options.dueDate || null,
            notes: options.notes || null,
        });
        return;
    }

    Object.assign(existingDue, {
        ...basePayload,
        dueDate: options.dueDate || existingDue.dueDate || null,
        collectedAt: null,
    });
    await existingDue.save();
};

const applyPaymentToBill = async (bill, paymentInput) => {
    const amount = toPositiveNumber(paymentInput.amount, "amount");
    if (amount <= 0) {
        throw new AppError("amount must be greater than 0.", 400);
    }

    if (amount > bill.totals.dueAmount) {
        throw new AppError("amount cannot exceed pending due amount.", 400);
    }

    const paymentMode = normalizePaymentMode(paymentInput.paymentMode, amount);
    const now = new Date();

    bill.totals.paidAmount = toMoney(bill.totals.paidAmount + amount);
    bill.totals.dueAmount = toMoney(bill.totals.grandTotal - bill.totals.paidAmount);
    bill.payment.status = getBillPaymentStatus({
        paidAmount: bill.totals.paidAmount,
        dueAmount: bill.totals.dueAmount,
    });
    bill.payment.isCollected = bill.totals.dueAmount === 0;
    bill.payment.mode = paymentMode;
    bill.payment.lastPaymentAt = now;
    bill.payment.transactionRef = paymentInput.transactionRef || bill.payment.transactionRef;
    if (bill.totals.dueAmount === 0) {
        bill.payment.collectedAt = now;
    }

    await bill.save();

    await syncDueForBill(bill, {
        paymentMode,
        lastCollectedAmount: amount,
        collectedAt: bill.payment.collectedAt,
    });

    return bill;
};

module.exports = {
    buildBillCreatePayload,
    syncDueForBill,
    applyPaymentToBill,
    toMoney,
};
