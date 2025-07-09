import requests
import json

# API_BASE = "https://your-api-url.amazonaws.com"
API_BASE = 'https://hfzcqg8aug.execute-api.us-east-1.amazonaws.com'

def test_endpoints():
    # Test health check
    response = requests.get(f"{API_BASE}/hello")
    print(f"Health check: {response.status_code}")
    
    # Test start conversation
    payload = {
        "userId": "test-user-123",
        "subscriptionId": "sub-456", 
        "reason": "too_expensive",
        "reasonText": "Too costly for me"
    }
    
    response = requests.post(f"{API_BASE}/conversations/start", json=payload)
    print(f"Start conversation: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        conversation_id = data['data']['id']
        print(f"Created conversation: {conversation_id}")
        
        # Test send message
        message_payload = {
            "conversationId": conversation_id,
            "message": "I really can't afford this anymore",
            "userId": "test-user-123"
        }
        
        response = requests.post(f"{API_BASE}/conversations/message", json=message_payload)
        print(f"Send message: {response.status_code}")

if __name__ == "__main__":
    test_endpoints()