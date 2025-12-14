import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IConsole extends Document {
    consoleNumber: number;
    name: string;
    status: 'available' | 'in-use' | 'maintenance';
    currentBookingId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ConsoleSchema: Schema = new Schema(
    {
        consoleNumber: {
            type: Number,
            required: true,
            unique: true,
            min: 1,
        },
        name: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['available', 'in-use', 'maintenance'],
            default: 'available',
        },
        currentBookingId: {
            type: Schema.Types.ObjectId,
            ref: 'Booking',
            required: false,
        },
    },
    {
        timestamps: true,
    }
);

if (mongoose.models.Console) {
    delete mongoose.models.Console;
}

const Console: Model<IConsole> = mongoose.model<IConsole>('Console', ConsoleSchema);

export default Console;
