const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../src/app");
const User = require("../src/models/User");

describe("Billing integration flow", () => {
    let mongoServer;
    let superadminToken;
    let adminToken;
    let customerToken;
    let superadminUser;
    let adminUser;
    let customerUser;
    let productId;
    let billId;
    let dueId;

    const login = async (email, password) => {
        const response = await request(app).post("/api/v1/auth/login").send({ email, password });
        expect(response.status).toBe(200);
        return response.body.data.token;
    };

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
    });

    beforeEach(async () => {
        const collections = await mongoose.connection.db.collections();
        await Promise.all(collections.map((collection) => collection.deleteMany({})));

        superadminUser = await User.create({
            name: "Super Admin",
            email: "superadmin@test.com",
            password: "Pass@123",
            role: "superadmin",
            isActive: true,
        });

        adminUser = await User.create({
            name: "Admin User",
            email: "admin@test.com",
            password: "Pass@123",
            role: "admin",
            isActive: true,
        });

        superadminToken = await login("superadmin@test.com", "Pass@123");
        adminToken = await login("admin@test.com", "Pass@123");
    });

    afterAll(async () => {
        await mongoose.disconnect();
        if (mongoServer) {
            await mongoServer.stop();
        }
    });

    it("runs end-to-end billing flow with role restrictions", async () => {
        const createCustomerByAdmin = await request(app)
            .post("/api/v1/users")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                name: "Customer One",
                email: "customer1@test.com",
                password: "Pass@123",
                role: "customer",
                phone: "9999999999",
            });

        expect(createCustomerByAdmin.status).toBe(201);
        expect(createCustomerByAdmin.body.data.user.role).toBe("customer");
        customerUser = createCustomerByAdmin.body.data.user;

        const adminCannotReadSuperadmin = await request(app)
            .get(`/api/v1/users/${superadminUser._id}`)
            .set("Authorization", `Bearer ${adminToken}`);
        expect(adminCannotReadSuperadmin.status).toBe(403);

        const createProduct = await request(app)
            .post("/api/v1/products")
            .set("Authorization", `Bearer ${superadminToken}`)
            .send({
                name: "Milk 1L",
                price: 120,
                unit: "pcs",
            });

        expect(createProduct.status).toBe(201);
        productId = createProduct.body.data.product._id;

        const createBill = await request(app)
            .post("/api/v1/bills")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                customerId: customerUser._id,
                items: [{ productId, quantity: 2, unitPrice: 9999 }],
                discount: 10,
                tax: 0,
                paidAmount: 50,
                paymentMode: "cash",
            });

        expect(createBill.status).toBe(201);
        expect(createBill.body.data.bill.items[0].unitPrice).toBe(120);
        expect(createBill.body.data.bill.totals.grandTotal).toBe(230);
        expect(createBill.body.data.bill.totals.dueAmount).toBe(180);
        billId = createBill.body.data.bill._id;

        customerToken = await login("customer1@test.com", "Pass@123");

        const customerBlockedFromUsersList = await request(app)
            .get("/api/v1/users")
            .set("Authorization", `Bearer ${customerToken}`);
        expect(customerBlockedFromUsersList.status).toBe(403);

        const customerBills = await request(app)
            .get("/api/v1/bills")
            .set("Authorization", `Bearer ${customerToken}`);
        expect(customerBills.status).toBe(200);
        expect(customerBills.body.data.bills).toHaveLength(1);
        expect(customerBills.body.data.bills[0]._id).toBe(billId);

        const dueList = await request(app)
            .get("/api/v1/dues")
            .set("Authorization", `Bearer ${adminToken}`);
        expect(dueList.status).toBe(200);
        expect(dueList.body.data.dues).toHaveLength(1);
        dueId = dueList.body.data.dues[0]._id;

        const customerCannotCollectDue = await request(app)
            .patch(`/api/v1/dues/${dueId}/collect`)
            .set("Authorization", `Bearer ${customerToken}`)
            .send({
                amount: 100,
                paymentMode: "online",
            });
        expect(customerCannotCollectDue.status).toBe(403);

        const adminCollectDue = await request(app)
            .patch(`/api/v1/dues/${dueId}/collect`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                amount: 180,
                paymentMode: "online",
                transactionRef: "txn-1001",
            });
        expect(adminCollectDue.status).toBe(200);
        expect(adminCollectDue.body.data.due.status).toBe("paid");
        expect(adminCollectDue.body.data.due.isCollected).toBe(true);

        const billAfterCollection = await request(app)
            .get(`/api/v1/bills/${billId}`)
            .set("Authorization", `Bearer ${customerToken}`);
        expect(billAfterCollection.status).toBe(200);
        expect(billAfterCollection.body.data.bill.payment.status).toBe("paid");
        expect(billAfterCollection.body.data.bill.totals.dueAmount).toBe(0);
    });
});
