import {NextRequest, NextResponse} from "next/server";
import fetch from 'node-fetch';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const response = await fetch('http://localhost:9081/api/subtitles/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({
            status: 500,
            message: e.toString()
        });
    }
}