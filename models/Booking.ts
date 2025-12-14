import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBooking extends Document {
    userName: string;
    startTime: Date;
    endTime?: Date;
    duration: number; // in hours
    hourlyRate: number;
    totalAmount: number;
    consoleNumber: number; // 1, 2, or 3
    isPaid: boolean;
    paymentMethod?: string;
    status: 'active' | 'completed' | 'cancelled';
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const BookingSchema: Schema = new Schema(
    {
        userName: {
            type: String,
            required: [true, 'Please provide a user name'],
            trim: true,
            maxlength: [60, 'Name cannot be more than 60 characters'],
        },
        startTime: {
            type: Date,
            required: [true, 'Please provide a start time'],
            default: Date.now,
        },
        endTime: {
            type: Date,
            required: false,
        },
        duration: {
            type: Number,
            required: [true, 'Please provide duration in hours'],
            min: [0.5, 'Minimum duration is 0.5 hours'],
        },
        hourlyRate: {
            type: Number,
            required: true,
            default: 200, // NPR 200 per hour
        },
        totalAmount: {
            type: Number,
            required: true,
        },
        consoleNumber: {
            type: Number,
            required: [true, 'Please assign a console'],
            min: 1,
        },
        isPaid: {
            type: Boolean,
            default: false,
        },
        paymentMethod: {
            type: String,
            enum: ['Cash', 'UPI', 'Card', 'Other'],
            required: false,
        },
        status: {
            type: String,
            enum: ['active', 'completed', 'cancelled'],
            default: 'active',
        },
        notes: {
            type: String,
            required: false,
        },
    },
    {
        timestamps: true,
    }
);

// Note: totalAmount is calculated in the API before saving
// No pre-save hook needed since we set it explicitly

const Booking: Model<IBooking> =
    mongoose.models.Booking ? (delete mongoose.models.Booking, mongoose.model<IBooking>('Booking', BookingSchema)) : mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;
