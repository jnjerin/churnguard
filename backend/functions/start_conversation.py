import json
import boto3
import uuid
import os
from datetime import datetime
from typing import Dict, Any

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
conversations_table = dynamodb.Table(os.environ['DYNAMODB_TABLE_CONVERSATIONS'])
messages_table = dynamodb.Table(os.environ['DYNAMODB_TABLE_MESSAGES'])

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Start a new conversation when user wants to cancel
    """
    try:
        # Parse request body
        if 'body' not in event:
            return create_response(400, {'error': 'Missing request body'})
            
        body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        
        # Validate required fields
        required_fields = ['userId', 'subscriptionId', 'reason', 'reasonText']
        for field in required_fields:
            if field not in body:
                return create_response(400, {'error': f'Missing required field: {field}'})
        
        # Generate IDs
        conversation_id = str(uuid.uuid4())
        message_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        # Create conversation record
        conversation_item = {
            'id': conversation_id,
            'userId': body['userId'],
            'subscriptionId': body['subscriptionId'],
            'status': 'active',
            'outcome': None,
            'reason': body['reason'],
            'reasonText': body['reasonText'],
            'createdAt': timestamp,
            'updatedAt': timestamp
        }
        
        # Create initial AI message
        ai_message = generate_initial_message(body['reason'], body['reasonText'])
        message_item = {
            'id': message_id,
            'conversationId': conversation_id,
            'content': ai_message,
            'sender': 'ai',
            'timestamp': timestamp
        }
        
        # Save to DynamoDB
        conversations_table.put_item(Item=conversation_item)
        messages_table.put_item(Item=message_item)
        
        # Prepare response
        conversation_response = {
            **conversation_item,
            'messages': [message_item]
        }
        
        return create_response(200, {
            'success': True,
            'data': conversation_response
        })
        
    except json.JSONDecodeError:
        return create_response(400, {'error': 'Invalid JSON in request body'})
    except Exception as e:
        print(f"Error in start_conversation: {str(e)}")
        return create_response(500, {'error': 'Internal server error'})

def generate_initial_message(reason: str, reason_text: str) -> str:
    """Generate initial AI response based on cancellation reason"""
    reason_responses = {
        'too_expensive': f"I understand that cost is a concern. Let me see what special offers I can provide to make this more affordable for you.",
        'not_using': f"I hear you - sometimes we sign up for things and don't use them as much as expected. Let me show you some options that might work better.",
        'technical_issues': f"I'm sorry you're experiencing technical difficulties. Let me help resolve those issues and see what we can do to improve your experience.",
        'found_alternative': f"I understand you've found another option. Before you go, let me show you some exclusive benefits that might change your mind.",
        'other': f"Thank you for sharing that with me: {reason_text}. I'd like to understand your concerns better and see how we can address them."
    }
    
    return reason_responses.get(reason, f"I understand your concerns about: {reason_text}. Let me see what I can do to help address this situation.")

def create_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """Create standardized HTTP response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        'body': json.dumps(body)
    }