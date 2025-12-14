import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/models/Booking';

export async function GET(request: NextRequest) {
    try {
        console.log('=== GET /api/analytics START ===');
        await dbConnect();
        console.log('Database connected');

        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'day'; // day, week, month
        const dateParam = searchParams.get('date');

        console.log('Analytics request:', { period, date: dateParam });

        const targetDate = dateParam ? new Date(dateParam) : new Date();

        let startDate: Date;
        let endDate: Date;

        // Calculate date range based on period
        if (period === 'day') {
            startDate = new Date(targetDate);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(targetDate);
            endDate.setHours(23, 59, 59, 999);
        } else if (period === 'week') {
            // Get start of week (Sunday)
            startDate = new Date(targetDate);
            const day = startDate.getDay();
            startDate.setDate(startDate.getDate() - day);
            startDate.setHours(0, 0, 0, 0);

            // Get end of week (Saturday)
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
        } else if (period === 'month') {
            // Get start of month
            startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
            startDate.setHours(0, 0, 0, 0);

            // Get end of month
            endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
            endDate.setHours(23, 59, 59, 999);
        } else {
            return NextResponse.json(
                { success: false, error: 'Invalid period. Use day, week, or month' },
                { status: 400 }
            );
        }

        // Fetch bookings in the date range
        const bookings = await Booking.find({
            startTime: { $gte: startDate, $lte: endDate },
            status: { $in: ['active', 'completed'] }, // Exclude cancelled
        });

        // Calculate analytics
        const totalBookings = bookings.length;
        const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalAmount, 0);
        const paidRevenue = bookings
            .filter(b => b.isPaid)
            .reduce((sum, booking) => sum + booking.totalAmount, 0);
        const unpaidRevenue = totalRevenue - paidRevenue;

        const totalDuration = bookings.reduce((sum, booking) => sum + booking.duration, 0);
        const averageDuration = totalBookings > 0 ? totalDuration / totalBookings : 0;

        // Revenue by console
        const revenueByConsole = [1, 2, 3].map(consoleNum => {
            const consoleBookings = bookings.filter(b => b.consoleNumber === consoleNum);
            const revenue = consoleBookings.reduce((sum, b) => sum + b.totalAmount, 0);
            const count = consoleBookings.length;
            return {
                console: `PS4-${consoleNum}`,
                consoleNumber: consoleNum,
                revenue,
                bookings: count,
            };
        });

        // Payment breakdown
        const paymentBreakdown = {
            paid: {
                count: bookings.filter(b => b.isPaid).length,
                amount: paidRevenue,
            },
            unpaid: {
                count: bookings.filter(b => !b.isPaid).length,
                amount: unpaidRevenue,
            },
        };

        // Daily breakdown for week/month view
        let dailyBreakdown: any[] = [];
        if (period === 'week' || period === 'month') {
            const days: { [key: string]: { revenue: number; bookings: number } } = {};

            bookings.forEach(booking => {
                const dateKey = booking.startTime.toISOString().split('T')[0];
                if (!days[dateKey]) {
                    days[dateKey] = { revenue: 0, bookings: 0 };
                }
                days[dateKey].revenue += booking.totalAmount;
                days[dateKey].bookings += 1;
            });

            dailyBreakdown = Object.entries(days)
                .map(([date, data]) => ({
                    date,
                    revenue: data.revenue,
                    bookings: data.bookings,
                }))
                .sort((a, b) => a.date.localeCompare(b.date));
        }

        return NextResponse.json({
            success: true,
            data: {
                period,
                startDate,
                endDate,
                summary: {
                    totalBookings,
                    totalRevenue,
                    paidRevenue,
                    unpaidRevenue,
                    averageDuration: Math.round(averageDuration * 100) / 100,
                },
                revenueByConsole,
                paymentBreakdown,
                dailyBreakdown: period !== 'day' ? dailyBreakdown : undefined,
            },
        });
    } catch (error: any) {
        console.error('=== GET /api/analytics ERROR ===');
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
