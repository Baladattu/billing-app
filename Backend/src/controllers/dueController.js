const Due = require("../models/Due");
const Bill = require("../models/Bill");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { success, updated } = require("../utils/response");
const { applyPaymentToBill } = require("../services/billingService");
const { USER_ROLES } = require("../constants/roles");

const getPagination = (query) => {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

const getDues = asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};

    if (req.user.role === USER_ROLES.CUSTOMER) {
        filter.customerId = req.user.id;
    }

    if (req.query.customerId) {
        if (req.user.role === USER_ROLES.CUSTOMER && req.query.customerId !== req.user.id) {
            throw new AppError("Forbidden. Customers can only access their own dues.", 403);
        }
        filter.customerId = req.query.customerId;
    }
    if (req.query.status) {
        filter.status = req.query.status;
    }
    if (req.query.isCollected !== undefined) {
        filter.isCollected = req.query.isCollected === "true";
    }

    const [dues, total] = await Promise.all([
        Due.find(filter)
            .sort({ isCollected: 1, dueDate: 1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("customerId", "name email phone role")
            .populate("billId", "billNumber billDate totals payment")
            .lean(),
        Due.countDocuments(filter),
    ]);

    return success(res, {
        dues,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
        },
    });
});

const getDueById = asyncHandler(async (req, res) => {
    const due = await Due.findById(req.params.id)
        .populate("customerId", "name email phone role")
        .populate("billId", "billNumber billDate totals payment")
        .lean();

    if (!due) {
        throw new AppError("Due not found", 404);
    }

    if (req.user.role === USER_ROLES.CUSTOMER && String(due.customerId._id) !== req.user.id) {
        throw new AppError("Forbidden. Customers can only access their own dues.", 403);
    }

    return success(res, { due });
});

const collectDue = asyncHandler(async (req, res) => {
    const due = await Due.findById(req.params.id).lean();
    if (!due) {
        throw new AppError("Due not found", 404);
    }

    if (due.isCollected || due.amountDue === 0) {
        throw new AppError("Due is already fully settled.", 400);
    }

    const bill = await Bill.findById(due.billId);
    if (!bill) {
        throw new AppError("Linked bill not found for this due.", 404);
    }

    await applyPaymentToBill(bill, {
        amount: req.body.amount || due.amountDue,
        paymentMode: req.body.paymentMode,
        transactionRef: req.body.transactionRef,
    });

    const updatedDue = await Due.findById(due._id)
        .populate("customerId", "name email phone role")
        .populate("billId", "billNumber billDate totals payment")
        .lean();

    return updated(res, { due: updatedDue }, "Due payment collected successfully");
});

module.exports = {
    getDues,
    getDueById,
    collectDue,
};
