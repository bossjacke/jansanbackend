import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret";

export const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ 
            success: false, 
            message: "No token, authorization denied" 
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { id, role }
        next();
    } catch (error) {
        res.status(401).json({ 
            success: false, 
            message: "Token is not valid" 
        });
    }
};
