import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true, lowercase: true },
        phone: { type: String, required: true },
        password: { type: String, required: function() { return !this.googleId; } },
        role: { type: String, enum: ["admin", "customer"], default: "customer" },
        location: { 
            type: String, 
            required: function () {
                return this.role === "customer";
            },
        },
        fullName: { type: String },
        city: { type: String },
        postalCode: { type: String },
        country: { type: String, default: "India" },


        // Google OAuth fields
        googleId: { type: String, unique: true, sparse: true },

        // OTP fields for password reset
        otp: { type: String, default: null },
        otpExpires: { type: Date, default: null },
    },
    { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
