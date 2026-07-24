import { NextRequest, NextResponse } from 'next/server';
import { getStyleExamples } from '@/ai/flows/create-style-examples';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const styleId = searchParams.get('styleId') || 'classic';
    
    const result = await getStyleExamples(styleId);
    
    return NextResponse.json(result || { examples: [] });
  } catch (error: any) {
    console.error('Error getting style examples:', error);
    return NextResponse.json(
      { error: error.message || 'Error getting style examples', examples: [] },
      { status: 500 }
    );
  }
}
