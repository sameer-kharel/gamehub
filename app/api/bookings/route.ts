import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Console from '@/models/Console';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const date = searchParams.get('date');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        let query: any = {};

        // Filter by status
        if (status) {
            query.status = status;
        }

        // Filter by specific date
        if (date) {
            const targetDate = new Date(date);
            const nextDay = new Date(targetDate);
            nextDay.setDate(nextDay.getDate() + 1);

            query.startTime = {
                $gte: targetDate,
                $lt: nextDay,
            };
        }

        // Filter by date range
        if (startDate && endDate) {
            query.startTime = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        const bookings = await Booking.find(query)
            .sort({ startTime: -1 })
            .limit(100);

        return NextResponse.json({
            success: true,
            data: bookings,
        });
    } catch (error: any) {
        console.error('GET /api/bookings error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        console.log('=== POST /api/bookings START ===');
        await dbConnect();
        console.log('Database connected');

        const body = await request.json();
        console.log('Request body:', body);

        const { userName, duration, consoleNumber, paymentMethod, notes } = body;

        // Validate required fields
        if (!userName || !duration || !consoleNumber) {
            console.log('Validation failed: missing fields');
            return NextResponse.json(
                { success: false, error: 'User name, duration, and console number are required' },
                { status: 400 }
            );
        }

        // Ensure consoles exist - initialize if needed
        const consolesCount = await Console.countDocuments();
        console.log('Consoles count:', consolesCount);

        if (consolesCount === 0) {
            console.log('No consoles found, initializing...');
            await Console.insertMany([
                { consoleNumber: 1, name: 'PS4-1', status: 'available' },
                { consoleNumber: 2, name: 'PS4-2', status: 'available' },
                { consoleNumber: 3, name: 'PS4-3', status: 'available' },
            ]);
            console.log('Consoles initialized');
        }

        // Find the console
        const gameConsole = await Console.findOne({ consoleNumber });
        console.log('Console found:', gameConsole ? `${gameConsole.name} - ${gameConsole.status}` : 'null');

        if (!gameConsole) {
            return NextResponse.json(
                { success: false, error: `Console ${consoleNumber} not found` },
                { status: 404 }
            );
        }

        if (gameConsole.status !== 'available') {
            return NextResponse.json(
                { success: false, error: `PS4-${consoleNumber} is currently ${gameConsole.status}` },
                { status: 400 }
            );
        }

        // Create booking
        console.log('Creating booking...');
        const booking = await Booking.create({
            userName,
            duration: Number(duration),
            consoleNumber: Number(consoleNumber),
            hourlyRate: 200,
            totalAmount: Number(duration) * 200,
            paymentMethod: paymentMethod || undefined,
            notes: notes || undefined,
            status: 'active',
            isPaid: false,
        });
        console.log('Booking created:', booking._id);

        // Update console status
        console.log('Updating console status...');
        await Console.findByIdAndUpdate(gameConsole._id, {
            status: 'in-use',
            currentBookingId: booking._id,
        });
        console.log('Console updated');

        console.log('=== POST /api/bookings SUCCESS ===');
        return NextResponse.json({
            success: true,
            data: booking,
            message: 'Booking created successfully',
        }, { status: 201 });

    } catch (error: any) {
        console.error('=== POST /api/bookings ERROR ===');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        return NextResponse.json(
            {
                success: false,
                error: error.message,
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}
