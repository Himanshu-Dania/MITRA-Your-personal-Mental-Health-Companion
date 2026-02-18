#!/usr/bin/env python3
"""
Quick test script to verify the API server is working correctly
"""

import requests
import json
import sys
from typing import Generator

API_URL = "http://localhost:5000"

def print_section(title: str):
    """Print a formatted section header"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def test_health_endpoint() -> bool:
    """Test the /health endpoint"""
    print_section("Testing /health endpoint")
    
    try:
        response = requests.get(f"{API_URL}/health", timeout=5)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200 and response.json().get("status") == "healthy":
            print("✓ Health check passed!")
            return True
        else:
            print("✗ Health check failed!")
            return False
    except requests.exceptions.ConnectionError:
        print("✗ Cannot connect to API server!")
        print(f"  Make sure the server is running at {API_URL}")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_root_endpoint() -> bool:
    """Test the / endpoint"""
    print_section("Testing / (root) endpoint")
    
    try:
        response = requests.get(f"{API_URL}/", timeout=5)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        data = response.json()
        if response.status_code == 200 and "endpoints" in data:
            print("✓ Root endpoint working!")
            return True
        else:
            print("✗ Root endpoint failed!")
            return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_chat_endpoint() -> bool:
    """Test the /chat endpoint with a simple message"""
    print_section("Testing /chat endpoint (SSE streaming)")
    
    payload = {
        "message": "Hello, this is a test message",
        "sessionId": "test-session-123",
        "userId": "test-user-456"
    }
    
    print(f"Sending: {json.dumps(payload, indent=2)}")
    print("\nStreaming response:\n")
    
    try:
        response = requests.post(
            f"{API_URL}/chat",
            json=payload,
            headers={"Content-Type": "application/json"},
            stream=True,
            timeout=30
        )
        
        if response.status_code != 200:
            print(f"✗ Error: Status code {response.status_code}")
            return False
        
        # Read the SSE stream
        full_response = ""
        chunk_count = 0
        
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith('data: '):
                    try:
                        data = json.loads(line_str[6:])
                        if 'content' in data:
                            content = data['content']
                            full_response += content
                            print(content, end='', flush=True)
                            chunk_count += 1
                        elif 'error' in data:
                            print(f"\n✗ Error in response: {data['error']}")
                            return False
                    except json.JSONDecodeError:
                        pass
        
        print(f"\n\n✓ Received {chunk_count} chunks")
        print(f"✓ Total response length: {len(full_response)} characters")
        
        if chunk_count > 0:
            print("✓ Chat endpoint working!")
            return True
        else:
            print("✗ No chunks received!")
            return False
            
    except requests.exceptions.Timeout:
        print("✗ Request timed out!")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_cors_headers() -> bool:
    """Test CORS headers are present"""
    print_section("Testing CORS configuration")
    
    try:
        response = requests.options(
            f"{API_URL}/chat",
            headers={
                "Origin": "http://example.com",
                "Access-Control-Request-Method": "POST"
            }
        )
        
        cors_headers = {
            "Access-Control-Allow-Origin": response.headers.get("Access-Control-Allow-Origin"),
            "Access-Control-Allow-Methods": response.headers.get("Access-Control-Allow-Methods"),
            "Access-Control-Allow-Headers": response.headers.get("Access-Control-Allow-Headers"),
        }
        
        print("CORS Headers:")
        for header, value in cors_headers.items():
            print(f"  {header}: {value}")
        
        if cors_headers["Access-Control-Allow-Origin"]:
            print("✓ CORS is configured!")
            return True
        else:
            print("✗ CORS headers missing!")
            return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("  TherapyBot API Server - Test Suite")
    print("="*60)
    print(f"\nTesting API at: {API_URL}")
    
    results = {
        "Health Endpoint": test_health_endpoint(),
        "Root Endpoint": test_root_endpoint(),
        "CORS Configuration": test_cors_headers(),
        "Chat Endpoint (SSE)": test_chat_endpoint(),
    }
    
    # Summary
    print_section("Test Summary")
    
    for test_name, passed in results.items():
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status} - {test_name}")
    
    total_tests = len(results)
    passed_tests = sum(1 for p in results.values() if p)
    
    print(f"\nTotal: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("\n🎉 All tests passed! API is working correctly.")
        return 0
    else:
        print("\n⚠️  Some tests failed. Check the output above for details.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
