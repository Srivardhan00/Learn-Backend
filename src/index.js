import "dotenv/config";
import connectDB from "./DB/connectDB.js";
import { app } from "./app.js";

connectDB()
  .then(() => {
    // Set up error handling for the app
    app.on("error", (err) => {
      console.log("Application error", err);
    });

    // Start the server
    app.listen(process.env.PORT, () => {
      console.log("Server is running on port", process.env.PORT);
    });
  })
  .catch((err) => {
    // Handle DB connection error
    console.log("DB connection error", err);
  });
