import { NextRequest, NextResponse } from 'next/server';
import { createStyleExamples } from '@/ai/flows/create-style-examples';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { styleId = 'classic', topic = 'Fastoria academy y sus ventajas' } = body;
    
    const result = await createStyleExamples({
      styleId,
      topic,
      designTokens: {
        primary: '#2563EB',
        secondary: '#1E40AF',
        accent: '#F59E0B',
        fontHeading: 'Inter',
        fontBody: 'Inter',
      },
    });
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error creating style examples:', error);
    return NextResponse.json(
      { error: error.message || 'Error creating style examples' },
      { status: 500 }
    );
  }
}
