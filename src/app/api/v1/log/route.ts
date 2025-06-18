import { NextRequest, NextResponse } from 'next/server';

interface LogRequestBody {
  message: string;
  userId?: string;
  timestamp?: string;
  meta?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    // Check for Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 400 }
      );
    }

    // Extract and validate the Bearer token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return NextResponse.json(
        { error: 'Missing API key' },
        { status: 400 }
      );
    }

    // Validate token starts with test_ or prod_
    if (!token.startsWith('test_') && !token.startsWith('prod_')) {
      return NextResponse.json(
        { error: 'Invalid API key format' },
        { status: 403 }
      );
    }

    // Parse request body
    let body: LogRequestBody;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.message) {
      return NextResponse.json(
        { error: 'Missing required field: message' },
        { status: 400 }
      );
    }

    // Determine key type
    const keyType = token.startsWith('test_') ? 'test' : 'prod';

    // Create log object
    const logData = {
      keyType,
      message: body.message,
      timestamp: body.timestamp || new Date().toISOString(),
      userId: body.userId,
      meta: body.meta,
    };

    // Log to console
    console.warn('[LOG API]', JSON.stringify(logData, null, 2));

    // Return success response
    return NextResponse.json(
      { status: 'logged' },
      { status: 200 }
    );

  } catch (error) {
    console.error('[LOG API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
