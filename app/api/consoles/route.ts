
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Console from '@/models/Console';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await dbConnect();

        // Get all consoles with current booking info
        const consoles = await Console.find({})
            .populate('currentBookingId')
            .sort({ consoleNumber: 1 });

        // If no consoles exist, initialize them
        if (consoles.length === 0) {
            const initialConsoles = [];
            for (let i = 1; i <= 3; i++) {
                const newConsole = await Console.create({
                    consoleNumber: i,
                    name: `PS4-${i}`,
                    status: 'available',
                });
                initialConsoles.push(newConsole);
            }
            return NextResponse.json({
                success: true,
                data: initialConsoles,
                message: 'Consoles initialized',
            });
        }

        return NextResponse.json({
            success: true,
            data: consoles,
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const body = await request.json();
        const { name } = body;

        if (!name) {
            return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
        }

        // Auto-increment console number
        const lastConsole = await Console.findOne().sort({ consoleNumber: -1 });
        const nextNumber = (lastConsole?.consoleNumber || 0) + 1;

        const newConsole = await Console.create({
            consoleNumber: nextNumber,
            name: name,
            status: 'available',
        });



        return NextResponse.json({ success: true, data: newConsole });

    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        await dbConnect();
        const body = await request.json();
        const { consoleId, status } = body;

        if (!consoleId || !status) {
            return NextResponse.json(
                { success: false, error: 'Console ID and status are required' },
                { status: 400 }
            );
        }

        const console = await Console.findByIdAndUpdate(
            consoleId,
            { status },
            { new: true, runValidators: true }
        );

        if (!console) {
            return NextResponse.json(
                { success: false, error: 'Console not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: console,
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
