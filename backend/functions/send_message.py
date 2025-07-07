import json
import boto3
import uuid
import os
import random
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
conversations_table = dynamodb.Table(os.environ['DYNAMODB_TABLE_CONVERSATIONS'])
messages_table = dynamodb.Table(os.environ['DYNAMODB_TABLE_MESSAGES'])
offers_table = dynamodb.Table(os.environ['DYNAMODB_TABLE_OFFERS'])

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handle user message and generate AI response with potential offer
    """
    try:
        # Parse request body
        if 'body' not in event:
            return create_response(400, {'error': 'Missing request body'})
            
        body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        
        # Validate required fields
        required_fields = ['conversationId', 'message', 'userId']
        for field in required_fields:
            if field not in body:
                return create_response(400, {'error': f'Missing required field: {field}'})
        
        conversation_id = body['conversationId']
        user_message = body['message']
        user_id = body['userId']
        
        # Verify conversation exists and belongs to user
        conversation = get_conversation(conversation_id, user_id)
        if not conversation:
            return create_response(404, {'error': 'Conversation not found'})
        
        # Generate IDs and timestamp
        user_message_id = str(uuid.uuid4())
        ai_message_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        # Save user message
        user_message_item = {
            'id': user_message_id,
            'conversationId': conversation_id,
            'content': user_message,
            'sender': 'user',
            'timestamp': timestamp
        }
        messages_table.put_item(Item=user_message_item)
        
        # Generate AI response
        ai_response = generate_ai_response(user_message, conversation)
        ai_message_item = {
            'id': ai_message_id,
            'conversationId': conversation_id,
            'content': ai_response,
            'sender': 'ai',
            'timestamp': timestamp
        }
        messages_table.put_item(Item=ai_message_item)
        
        # Check if we should generate an offer
        offer = None
        message_count = get_message_count(conversation_id)
        if should_generate_offer(message_count, user_message):
            offer = generate_retention_offer(conversation_id, conversation)
            if offer:
                offers_table.put_item(Item=offer)
        
        # Update conversation timestamp
        conversations_table.update_item(
            Key={'id': conversation_id},
            UpdateExpression='SET updatedAt = :timestamp',
            ExpressionAttributeValues={':timestamp': timestamp}
        )
        
        response_data = {
            'message': ai_message_item
        }
        
        if offer:
            response_data['offer'] = offer
        
        return create_response(200, {
            'success': True,
            'data': response_data
        })
        
    except json.JSONDecodeError:
        return create_response(400, {'error': 'Invalid JSON in request body'})
    except Exception as e:
        print(f"Error in send_message: {str(e)}")
        return create_response(500, {'error': 'Internal server error'})

def get_conversation(conversation_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    """Get conversation and verify ownership"""
    try:
        response = conversations_table.get_item(Key={'id': conversation_id})
        conversation = response.get('Item')
        
        if conversation and conversation.get('userId') == user_id:
            return conversation
        return None
    except Exception:
        return None

def get_message_count(conversation_id: str) -> int:
    """Get total message count for conversation"""
    try:
        response = messages_table.query(
            IndexName='ConversationIdIndex',
            KeyConditionExpression='conversationId = :conv_id',
            ExpressionAttributeValues={':conv_id': conversation_id}
        )
        return response.get('Count', 0)
    except Exception:
        return 0

def generate_ai_response(user_message: str, conversation: Dict[str, Any]) -> str:
    """Generate AI response based on user message and conversation context"""
    user_message_lower = user_message.lower()
    
    # Response patterns based on user input
    if any(word in user_message_lower for word in ['expensive', 'cost', 'money', 'afford', 'price']):
        responses = [
            "I completely understand that budget is important. Let me see what special pricing options I can offer you.",
            "Cost is definitely a valid concern. I have some exclusive discounts that might help make this more affordable.",
            "I hear you on the pricing. Let me check what promotional offers are available for valued customers like you."
        ]
    elif any(word in user_message_lower for word in ['technical', 'bug', 'error', 'problem', 'issue']):
        responses = [
            "I'm sorry you're experiencing technical difficulties. Let me help resolve those issues and offer you something for the inconvenience.",
            "Technical problems can be really frustrating. I want to make this right for you with both a solution and a special offer.",
            "I apologize for the technical issues. Let me see how we can fix this and provide you with some compensation."
        ]
    elif any(word in user_message_lower for word in ['time', 'busy', 'use', 'using']):
        responses = [
            "I understand that life gets busy and priorities change. Let me show you some flexible options that might work better for your schedule.",
            "That makes perfect sense. Maybe we can find a plan that better fits your current lifestyle and usage patterns.",
            "I totally get that - sometimes our needs change. Let me offer you some alternatives that might be more suitable."
        ]
    elif any(word in user_message_lower for word in ['competitor', 'alternative', 'found', 'better']):
        responses = [
            "I understand you're exploring other options. Before you decide, let me show you some exclusive benefits that our competitors don't offer.",
            "That's completely understandable. I'd love to show you some unique features and offers that might change your perspective.",
            "I appreciate you being upfront about that. Let me present some special advantages that are only available to our existing customers."
        ]
    else:
        responses = [
            "I really appreciate you sharing that with me. Let me see what I can do to address your concerns.",
            "Thank you for explaining your situation. I want to find the best solution for you.",
            "I hear what you're saying, and I want to make sure we find something that works for you.",
            "That's valuable feedback. Let me see what options I have available to help with your situation."
        ]
    
    return random.choice(responses)

def should_generate_offer(message_count: int, user_message: str) -> bool:
    """Determine if we should generate a retention offer"""
    # Generate offer after a few exchanges, but not immediately
    if message_count < 4:
        return False
    
    # Higher chance if user mentions specific pain points
    user_message_lower = user_message.lower()
    trigger_words = ['expensive', 'cost', 'technical', 'problem', 'issue', 'better', 'competitor']
    
    if any(word in user_message_lower for word in trigger_words):
        return random.random() > 0.2  # 80% chance
    
    return random.random() > 0.4  # 60% chance otherwise

def generate_retention_offer(conversation_id: str, conversation: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Generate a retention offer based on conversation context"""
    offer_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat() + 'Z'
    expires_at = (datetime.utcnow() + timedelta(days=7)).isoformat() + 'Z'
    
    # Different offer types based on cancellation reason
    reason = conversation.get('reason', 'other')
    
    if reason == 'too_expensive':
        offer_types = [
            {
                'type': 'discount',
                'title': '50% Off for 3 Months',
                'description': 'Get 50% off your subscription for the next 3 months, then continue at the regular price.',
                'savings': {'monthly': 15, 'total': 45},
                'details': {'originalPrice': 29.99, 'newPrice': 14.99}
            },
            {
                'type': 'discount',
                'title': '2 Months Free',
                'description': 'Get 2 months completely free, then resume your regular billing cycle.',
                'savings': {'monthly': 30, 'total': 60},
                'details': {'originalPrice': 29.99, 'freeMonths': 2}
            }
        ]
    elif reason == 'technical_issues':
        offer_types = [
            {
                'type': 'discount',
                'title': '1 Month Free + Priority Support',
                'description': 'Get 1 month free and priority technical support to resolve any issues.',
                'savings': {'monthly': 30, 'total': 30},
                'details': {'originalPrice': 29.99, 'freeMonths': 1}
            },
            {
                'type': 'pause',
                'title': 'Pause + Technical Resolution',
                'description': 'Pause your subscription while we resolve technical issues, then resume with 1 month free.',
                'savings': {'monthly': 30, 'total': 30},
                'details': {'pauseDuration': 1, 'freeMonths': 1}
            }
        ]
    elif reason == 'not_using':
        offer_types = [
            {
                'type': 'pause',
                'title': 'Pause for 3 Months',
                'description': 'Pause your subscription for up to 3 months and resume whenever you\'re ready.',
                'savings': {'monthly': 30, 'total': 90},
                'details': {'pauseDuration': 3}
            },
            {
                'type': 'discount',
                'title': '70% Off for 6 Months',
                'description': 'Try us again at 70% off for 6 months - perfect for getting back into the habit.',
                'savings': {'monthly': 21, 'total': 126},
                'details': {'originalPrice': 29.99, 'newPrice': 8.99}
            }
        ]
    else:
        offer_types = [
            {
                'type': 'discount',
                'title': '40% Off for 4 Months',
                'description': 'Get 40% off your subscription for the next 4 months.',
                'savings': {'monthly': 12, 'total': 48},
                'details': {'originalPrice': 29.99, 'newPrice': 17.99}
            },
            {
                'type': 'pause',
                'title': 'Flexible Pause Option',
                'description': 'Pause your subscription for up to 2 months and resume when convenient.',
                'savings': {'monthly': 30, 'total': 60},
                'details': {'pauseDuration': 2}
            }
        ]
    
    selected_offer = random.choice(offer_types)
    
    return {
        'id': offer_id,
        'conversationId': conversation_id,
        'type': selected_offer['type'],
        'title': selected_offer['title'],
        'description': selected_offer['description'],
        'savings': selected_offer['savings'],
        'details': selected_offer['details'],
        'terms': [
            'Offer valid for existing customers only',
            'Cannot be combined with other offers',
            'Subscription will auto-renew at regular price after promotional period'
        ],
        'expiresAt': expires_at,
        'createdAt': timestamp,
        'status': 'pending'
    }

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