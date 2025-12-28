import { NextRequest, NextResponse } from 'next/server';

/**
 * Runtime configuration endpoint
 * This proxies to the backend API to get the API URL configuration
 */
export async function GET(request: NextRequest) {
  try {
    // In production, try to reach the API on common ports on the same host
    const hostname = request.headers.get('host')?.split(':')[0] || 'localhost';
    
    // Try common API ports
    const apiPorts = [6969, 8000];
    
    for (const port of apiPorts) {
      try {
        const apiUrl = `http://${hostname}:${port}`;
        const response = await fetch(`${apiUrl}/api/runtime-config`, {
          signal: AbortSignal.timeout(2000), // 2 second timeout
        });
        
        if (response.ok) {
          const data = await response.json();
          return NextResponse.json(data);
        }
      } catch (err) {
        // Try next port
        continue;
      }
    }
    
    // If no API found, return the guessed URL
    return NextResponse.json({
      apiUrl: `http://${hostname}:6969`
    });
    
  } catch (error) {
    console.error('Failed to fetch runtime config:', error);
    
    // Return default configuration
    const hostname = request.headers.get('host')?.split(':')[0] || 'localhost';
    return NextResponse.json({
      apiUrl: `http://${hostname}:6969`
    });
  }
}

