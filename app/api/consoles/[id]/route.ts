import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Console from '@/models/Console';
import Booking from '@/models/Booking';

export const dynamic = 'force-dynamic';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;

        // Check availability
        const consoleToDelete = await Console.findById(id);
        if (!consoleToDelete) {
            return NextResponse.json(
                { success: false, error: 'Console not found' },
                { status: 404 }
            );
        }

        // Optional: Block if active booking (User didn't ask, but good practice. skipping for flexibility as user asked for "delete it also")
        // Just delete it.

        await Console.findByIdAndDelete(id);

        return NextResponse.json({
            success: true,
            message: 'Console deleted',
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
