const Bill = require("../models/Bill");
const Due = require("../models/Due");
const Product = require("../models/Product");
const User = require("../models/User");
const { USER_ROLES } = require("../constants/roles");
const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/response");

const getDashboardSummary = asyncHandler(async (req, res) => {
    const [customerCount, productCount, billStats, dueStats] = await Promise.all([
        User.countDocuments({ role: USER_ROLES.CUSTOMER, isActive: true }),
        Product.countDocuments({ isActive: true }),
        Bill.aggregate([
            {
                $group: {
                    _id: null,
                    totalBilled: { $sum: "$totals.grandTotal" },
                    totalCollected: { $sum: "$totals.paidAmount" },
                    totalPending: { $sum: "$totals.dueAmount" },
                    billCount: { $sum: 1 },
                },
            },
        ]),
        Due.aggregate([
            {
                $group: {
                    _id: null,
                    openDuesCount: {
                        $sum: {
                            $cond: [{ $eq: ["$isCollected", false] }, 1, 0],
                        },
                    },
                    openDuesAmount: {
                        $sum: {
                            $cond: [{ $eq: ["$isCollected", false] }, "$amountDue", 0],
                        },
                    },
                },
            },
        ]),
    ]);

    const billOverview = billStats[0] || {
        totalBilled: 0,
        totalCollected: 0,
        totalPending: 0,
        billCount: 0,
    };

    const dueOverview = dueStats[0] || {
        openDuesCount: 0,
        openDuesAmount: 0,
    };

    return success(res, {
        customers: customerCount,
        products: productCount,
        bills: billOverview,
        dues: dueOverview,
    });
});

module.exports = {
    getDashboardSummary,
};
