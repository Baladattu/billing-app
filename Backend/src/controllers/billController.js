const Bill = require("../models/Bill");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { created, success, updated } = require("../utils/response");
const { USER_ROLES } = require("../constants/roles");
const { buildBillCreatePayload, syncDueForBill, applyPaymentToBill } = require("../services/billingService");

const getPagination = (query) => {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

const ensureBillingUsers = async ({ customerId, billedBy }) => {
    const customer = await User.findById(customerId).lean();
    if (!customer || customer.role !== USER_ROLES.CUSTOMER || !customer.isActive) {
        throw new AppError("customerId must belong to an active customer user.", 400);
    }

    if (!billedBy) {
        return;
    }

    const billingUser = await User.findById(billedBy).lean();
    const allowedRoles = [USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN];
    if (!billingUser || !billingUser.isActive || !allowedRoles.includes(billingUser.role)) {
        throw new AppError("billedBy must belong to an active admin or superadmin.", 400);
    }
};

const createBill = asyncHandler(async (req, res) => {
    const { customerId } = req.body;
    if (!customerId) {
        throw new AppError("customerId is required.", 400);
    }

    const billedBy = req.body.billedBy || req.user.id;
    await ensureBillingUsers({ customerId, billedBy });
    const billPayload = await buildBillCreatePayload({ ...req.body, billedBy });

    const bill = await Bill.create(billPayload);
    await syncDueForBill(bill, {
        dueDate: req.body.dueDate,
        notes: req.body.dueNotes,
        paymentMode: bill.payment.mode,
    });

    const createdBill = await Bill.findById(bill._id)
        .populate("customerId", "name email role phone")
        .populate("billedBy", "name email role")
        .populate("items.product", "name sku price")
        .lean();

    return created(res, { bill: createdBill }, "Bill created successfully");
});

const getBills = asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};

    if (req.user.role === USER_ROLES.CUSTOMER) {
        filter.customerId = req.user.id;
    }

    if (req.query.customerId) {
        if (req.user.role === USER_ROLES.CUSTOMER && req.query.customerId !== req.user.id) {
            throw new AppError("Forbidden. Customers can only access their own bills.", 403);
        }
        filter.customerId = req.query.customerId;
    }
    if (req.query.status) {
        filter["payment.status"] = req.query.status;
    }
    if (req.query.billNumber) {
        filter.billNumber = req.query.billNumber;
    }

    const [bills, total] = await Promise.all([
        Bill.find(filter)
            .sort({ billDate: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("customerId", "name email role phone")
            .populate("billedBy", "name email role")
            .populate("items.product", "name sku price")
            .lean(),
        Bill.countDocuments(filter),
    ]);

    return success(res, {
        bills,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
        },
    });
});

const getBillById = asyncHandler(async (req, res) => {
    const bill = await Bill.findById(req.params.id)
        .populate("customerId", "name email role phone")
        .populate("billedBy", "name email role")
        .populate("items.product", "name sku price")
        .lean();

    if (!bill) {
        throw new AppError("Bill not found", 404);
    }

    if (req.user.role === USER_ROLES.CUSTOMER && String(bill.customerId._id) !== req.user.id) {
        throw new AppError("Forbidden. Customers can only access their own bills.", 403);
    }

    return success(res, { bill });
});

const collectBillPayment = asyncHandler(async (req, res) => {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
        throw new AppError("Bill not found", 404);
    }

    if (bill.payment.status === "paid") {
        throw new AppError("Bill is already fully paid.", 400);
    }

    await applyPaymentToBill(bill, {
        amount: req.body.amount,
        paymentMode: req.body.paymentMode,
        transactionRef: req.body.transactionRef,
    });

    const updatedBill = await Bill.findById(bill._id)
        .populate("customerId", "name email role phone")
        .populate("billedBy", "name email role")
        .populate("items.product", "name sku price")
        .lean();

    return updated(res, { bill: updatedBill }, "Payment collected successfully");
});

module.exports = {
    createBill,
    getBills,
    getBillById,
    collectBillPayment,
};
