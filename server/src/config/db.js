import mongoose from "mongoose";
import dns from "node:dns";

// Ensure DNS resolvers work for MongoDB Atlas SRV lookups on Windows
try {
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (err) {
    // ignore in environments where custom DNS is restricted
}

const connectDB = async () => {
    try {
        if (mongoose.connection.readyState >= 1) {
            return mongoose.connection;
        }

        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 8000,
        });

        console.log("MongoDB connected successfully");
        return conn;
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        throw error;
    }
};

export default connectDB;
