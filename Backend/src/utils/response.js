const success = (res, data = {}, message = "Success", statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};

const error = (res, message = "Something went wrong", statusCode = 500, errors = null) => {
    return res.status(statusCode).json({
        success: false,
        message,
        errors,
    });
};

const created = (res, data = {}, message = "Created successfully") => {
    return success(res, data, message, 201);
};

const updated = (res, data = {}, message = "Updated successfully") => {
    return success(res, data, message, 200);
};

const deleted = (res, message = "Deleted successfully") => {
    return success(res, null, message, 200);
};

const notFound = (res, message = "Resource not found") => {
    return error(res, message, 404);
};

module.exports = {
    success,
    error,
    created,
    updated,
    deleted,
    notFound,
};