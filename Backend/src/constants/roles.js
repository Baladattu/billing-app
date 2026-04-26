const USER_ROLES = Object.freeze({
    SUPERADMIN: "superadmin",
    ADMIN: "admin",
    CUSTOMER: "customer",
});

const ROLE_VALUES = Object.freeze(Object.values(USER_ROLES));

module.exports = {
    USER_ROLES,
    ROLE_VALUES,
};
