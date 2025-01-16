import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();



// Error handling
app.on('Error', (error) => {
    console.error('Error: ', error);
    throw error;
});

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}));
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(express.static('public'));
app.use(cookieParser());

// Routes import
import userRouter from './routes/user.routes.js';

// Routes declaration
app.use('/api/v1/users', userRouter);

export { app };
