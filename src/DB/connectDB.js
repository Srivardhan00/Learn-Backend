import { mongoose } from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async ()=>{
    try {
        const connectionInstance =  await mongoose.connect(`${process.env.DB_URI}/${DB_NAME}`)
        console.log('DB connected successfully');

        // console.log(connectionInstance);
    } catch (error) {
        console.log('Failed to connect to DB', error);
        process.exit(1)
    }
}

export default connectDB;