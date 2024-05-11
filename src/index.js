import 'dotenv/config'
import express from 'express'
import connectDB from './DB/connectDB.js' 

const app = express()

app.listen(process.env.PORT, ()=>{
    console.log(`Server is listening on Port ${process.env.PORT}`);
})

connectDB()