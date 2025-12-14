import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';

export async function GET() {
    try {
        await dbConnect();

        return NextResponse.json({
            success: true,
            message: 'Database connected successfully',
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error('DB Test Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message,
                stack: error.stack
            },
            { status: 500 }
        );
    }
}
