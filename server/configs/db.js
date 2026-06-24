import mongoose from "mongoose";

const connectDB = async () => {
    try{
        mongoose.connection.on('connected', ()=> console.log('DataBase Connected'))
        await mongoose.connect(`${process.env.MONGODB_URI}/bookshow`)
    } catch(err) {
        console.log(err.message)
    }
}

export default connectDB;