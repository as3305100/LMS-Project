import express from "express";
import dotenv from "dotenv";
import connectDB, { getDBStatus } from "./database/db.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  if (getDBStatus().isConnected) {
    app.listen(PORT, () => {
      console.log(`Server is running on the port ${PORT}`);
    });
  }
});    
