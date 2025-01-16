import 'dotenv/config'
import connectDB from './db/index.js';
import { app } from './app.js'; // import app after dotenv config



// Connect to the database and start the server
connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`⚙️ Server is running at port ${process.env.PORT || 8000}`);
        });
    })
    .catch((err) => {
        console.error("MongoDB connection failed!!!", err);
    });
    