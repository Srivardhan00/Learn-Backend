import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

//setup cors middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json()) //using json parsing middleware

//for reading data through urls
app.use(express.urlencoded(
    {
        extended:true //for reading nested objects
    }
)) 
//to store assets, files, folders, etc
app.use(express.static("public"))
//to access user's cookies and perform CRUD operations on cookies
app.use(cookieParser())


//setup router
import userRouter from "./Routes/users.route.js";

app.use('/user', userRouter)

export { app };
