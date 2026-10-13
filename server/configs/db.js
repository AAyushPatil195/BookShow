import mongoose from "mongoose";
import { isBenchmark } from './environment.js';

const connectDB = async () => {
    try{
        mongoose.connection.on('connected', ()=> console.log('DataBase Connected'))
        if (isBenchmark) {
            await mongoose.connect(process.env.MONGODB_URI, {
                dbName: 'bookshow_benchmark', replicaSet: 'rs0', directConnection: true,
                serverSelectionTimeoutMS: 10000
            });
            const hello = await mongoose.connection.db.admin().command({ hello: 1 });
            if (hello.setName !== 'rs0' || !hello.isWritablePrimary) {
                throw new Error('Benchmark MongoDB must be writable PRIMARY in rs0');
            }
        } else {
            await mongoose.connect(`${process.env.MONGODB_URI}/bookshow`);
        }
    } catch(err) {
        console.log(err.message)
        if (isBenchmark) throw err;
    }
}

export default connectDB;
