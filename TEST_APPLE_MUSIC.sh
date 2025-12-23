#!/bin/bash
# Quick test script for Apple Music integration

echo "🧪 Testing Apple Music Integration"
echo "===================================="
echo ""

# Test 1: Health check
echo "1. Health Check:"
HEALTH=$(curl -s http://localhost:8080/health)
if echo "$HEALTH" | grep -q '"status".*"ok"'; then
    echo "   ✅ Service is running"
    echo "   Response: $HEALTH"
else
    echo "   ❌ Service not responding"
    echo "   Response: $HEALTH"
    exit 1
fi
echo ""

# Test 2: Now Playing
echo "2. Now Playing Status:"
NOW_PLAYING=$(curl -s http://localhost:8080/now-playing)
echo "$NOW_PLAYING" | python3 -m json.tool 2>/dev/null || echo "$NOW_PLAYING"
echo ""

# Test 3: Network accessibility
echo "3. Network Test:"
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "unknown")
echo "   Mac Studio IP: $IP"
echo "   Service URL: http://$IP:8080"
echo ""

# Test 4: From network (if accessible)
echo "4. Testing from network perspective:"
echo "   Try from Synology: curl http://$IP:8080/now-playing"
echo ""

echo "✅ Basic tests complete!"
echo ""
echo "📝 To test with music:"
echo "   1. Open Music app"
echo "   2. Play a song"
echo "   3. Run: curl http://localhost:8080/now-playing"

