import { NextRequest, NextResponse } from 'next/server';

/**
 * Runtime configuration endpoint
 * This proxies to the backend API to get the API URL configuration
 */
export async function GET(request: NextRequest) {
  try {
    // Try to reach the API - check multiple possible locations
    const hostname = request.headers.get('host')?.split(':')[0] || 'localhost';
    
    // In Docker, try service name first, then localhost
    const apiEndpoints = [
      'http://fiestaboard-api:8000/api/runtime-config',  // Docker service name
      `http://${hostname}:6969/api/runtime-config`,      // External access
      'http://localhost:6969/api/runtime-config',        // Local dev
      'http://localhost:8000/api/runtime-config',        // Alternative port
    ];
    
    for (const endpoint of apiEndpoints) {
      try {
        const response = await fetch(endpoint, {
          signal: AbortSignal.timeout(2000), // 2 second timeout
        });
        
        if (response.ok) {
          const data = await response.json();
          return NextResponse.json(data);
        }
      } catch (err) {
        // Try next endpoint
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



