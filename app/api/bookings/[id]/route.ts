import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/models/Booking';
import Console from '@/models/Console';

export async function PUT(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        console.log('=== PUT /api/bookings/[id] START ===');
        await dbConnect();

        const params = await props.params;
        const { id } = params;
        const body = await request.json();

        console.log(`Updating booking ${id}`, body);

        const booking = await Booking.findById(id);

        if (!booking) {
            console.log('Booking not found');
            return NextResponse.json(
                { success: false, error: 'Booking not found' },
                { status: 404 }
            );
        }

        // Handle ending a session
        if (body.action === 'end') {
            console.log('Ending session...');
            const endTime = new Date();

            // Note: We do NOT recalculate price. User pays for the full booked slot regardless of actual usage.

            // Update booking
            booking.endTime = endTime;
            // booking.duration and booking.totalAmount remain unchanged (Fixed Pricing)

            booking.status = 'completed';
            await booking.save();
            console.log(`Booking ${id} marked completed with fixed price: ${booking.totalAmount}`);

            // Free up the console
            console.log(`Freeing console ${booking.consoleNumber}...`);
            const consoleUpdate = await Console.findOneAndUpdate(
                { consoleNumber: booking.consoleNumber },
                { status: 'available', currentBookingId: null }
            );
            console.log('Console updated:', consoleUpdate);

            return NextResponse.json({
                success: true,
                data: booking,
                message: 'Session ended successfully',
            });
        }

        // Handle payment update
        if (body.isPaid !== undefined) {
            console.log(`Updating payment status to ${body.isPaid}`);
            booking.isPaid = body.isPaid;
            if (body.paymentMethod) {
                booking.paymentMethod = body.paymentMethod;
            }
            await booking.save();

            return NextResponse.json({
                success: true,
                data: booking,
                message: 'Payment status updated',
            });
        }

        // General update
        const updatedBooking = await Booking.findByIdAndUpdate(
            id,
            body,
            { new: true, runValidators: true }
        );

        return NextResponse.json({
            success: true,
            data: updatedBooking,
        });
    } catch (error: any) {
        console.error('PUT /api/bookings/[id] error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        console.log('=== DELETE /api/bookings/[id] START ===');
        await dbConnect();

        const params = await props.params;
        const { id } = params;

        const booking = await Booking.findById(id);

        if (!booking) {
            return NextResponse.json(
                { success: false, error: 'Booking not found' },
                { status: 404 }
            );
        }

        // Free up console if booking is active
        if (booking.status === 'active') {
            console.log(`Cancelling active booking, freeing console ${booking.consoleNumber}`);
            await Console.findOneAndUpdate(
                { consoleNumber: booking.consoleNumber },
                { status: 'available', currentBookingId: null }
            );
        }

        // Mark as cancelled instead of deleting
        booking.status = 'cancelled';
        await booking.save();
        console.log(`Booking ${id} cancelled`);

        return NextResponse.json({
            success: true,
            message: 'Booking cancelled successfully',
        });
    } catch (error: any) {
        console.error('DELETE error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
