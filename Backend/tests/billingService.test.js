jest.mock("../src/models/Product", () => ({
    find: jest.fn(),
}));

jest.mock("../src/models/Due", () => ({
    findOne: jest.fn(),
    create: jest.fn(),
}));

const Product = require("../src/models/Product");
const { buildBillCreatePayload } = require("../src/services/billingService");

describe("billingService.buildBillCreatePayload", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("always takes unitPrice from product price", async () => {
        Product.find.mockReturnValue({
            lean: jest.fn().mockResolvedValue([
                {
                    _id: "prod-1",
                    name: "Milk",
                    price: 120,
                    isActive: true,
                },
            ]),
        });

        const payload = await buildBillCreatePayload({
            customerId: "cust-1",
            items: [
                {
                    productId: "prod-1",
                    quantity: 2,
                    unitPrice: 9999,
                },
            ],
            discount: 10,
            tax: 0,
            paidAmount: 50,
            paymentMode: "cash",
        });

        expect(payload.items[0].unitPrice).toBe(120);
        expect(payload.items[0].lineTotal).toBe(240);
        expect(payload.totals.subTotal).toBe(240);
        expect(payload.totals.grandTotal).toBe(230);
        expect(payload.totals.paidAmount).toBe(50);
        expect(payload.totals.dueAmount).toBe(180);
        expect(payload.payment.status).toBe("partial");
    });

    it("throws when any product is missing/inactive", async () => {
        Product.find.mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
        });

        await expect(
            buildBillCreatePayload({
                customerId: "cust-1",
                items: [{ productId: "missing", quantity: 1 }],
            })
        ).rejects.toThrow("One or more products are invalid or inactive.");
    });
});
