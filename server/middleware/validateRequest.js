export const validateRequest = (schemas) => (req, res, next) => {
    for (const [source, schema] of Object.entries(schemas)) {
        const result = schema.safeParse(req[source]);

        if (!result.success) {
            const errors = result.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message
            }));

            return res.status(400).json({
                success: false,
                message: errors[0]?.message || "Invalid request data",
                errors
            });
        }

        if (source === "params") {
            Object.assign(req.params, result.data);
        } else {
            req[source] = result.data;
        }
    }

    next();
};
