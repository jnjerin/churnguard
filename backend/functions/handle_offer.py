import json
import uuid
import boto3
import os
from datetime import datetime
from typing import Dict, Any

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
conversations_table = dynamodb.Table(os.environ['DYNAMODB_TABLE_CONVERSATIONS'])
offers_table = dynamodb.Table(os.environ['DYNAMODB_TABLE_OFFERS'])
messages_table = dynamodb.Table(os.environ['DYNAMODB_TABLE_MESSAGES'])

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handle user's response to a retention offer (accept/reject)
    """
    try:
        # Parse request body
        if 'body' not in event:
            return create_response(400, {'error': 'Missing request body'})
            
        body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        
        # Validate required fields
        required_fields = ['conversationId', 'offerId', 'action', 'userId']
        for field in required_fields:
            if field not in body:
                return create_response(400, {'error': f'Missing required field: {field}'})
        
        conversation_id = body['conversationId']
        offer_id = body['offerId']
        action = body['action']  # 'accept' or 'reject'
        user_id = body['userId']
        
        if action not in ['accept', 'reject']:
            return create_response(400, {'error': 'Action must be "accept" or "reject"'})
        
        # Verify conversation exists and belongs to user
        conversation_response = conversations_table.get_item(Key={'id': conversation_id})
        conversation = conversation_response.get('Item')
        
        if not conversation or conversation.get('userId') != user_id:
            return create_response(404, {'error': 'Conversation not found'})
        
        # Verify offer exists and belongs to conversation
        offer_response = offers_table.get_item(Key={'id': offer_id})
        offer = offer_response.get('Item')
        
        if not offer or offer.get('conversationId') != conversation_id:
            return create_response(404, {'error': 'Offer not found'})
        
        if offer.get('status') != 'pending':
            return create_response(400, {'error': 'Offer is no longer available'})
        
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        # Update offer status
        offers_table.update_item(
            Key={'id': offer_id},
            UpdateExpression='SET #status = :status, updatedAt = :timestamp',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'accepted' if action == 'accept' else 'rejected',
                ':timestamp': timestamp
            }
        )
        
        # Determine conversation outcome
        outcome = 'retained' if action == 'accept' else 'cancelled'
        
        # Update conversation
        conversations_table.update_item(
            Key={'id': conversation_id},
            UpdateExpression='SET #status = :status, outcome = :outcome, updatedAt = :timestamp',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'completed',
                ':outcome': outcome,
                ':timestamp': timestamp
            }
        )
        
        # Generate final AI message
        final_message = generate_final_message(action, offer)
        message_id = str(uuid.uuid4())
        
        final_message_item = {
            'id': message_id,
            'conversationId': conversation_id,
            'content': final_message,
            'sender': 'ai',
            'timestamp': timestamp
        }
        
        messages_table.put_item(Item=final_message_item)
        
        return create_response(200, {
            'success': True,
            'data': {
                'outcome': outcome,
                'message': final_message_item
            }
        })
        
    except json.JSONDecodeError:
        return create_response(400, {'error': 'Invalid JSON in request body'})
    except Exception as e:
        print(f"Error in handle_offer: {str(e)}")
        return create_response(500, {'error': 'Internal server error'})

def generate_final_message(action: str, offer: Dict[str, Any]) -> str:
    """Generate final AI message based on user's decision"""
    if action == 'accept':
        offer_type = offer.get('type', 'discount')
        offer_title = offer.get('title', 'special offer')
        
        messages = [
            f"Wonderful! I'm so glad we could work this out. Your {offer_title.lower()} is now active on your account. Thank you for staying with us!",
            f"Excellent choice! Your {offer_title.lower()} has been applied to your account. We really appreciate your continued loyalty.",
            f"Perfect! I've activated your {offer_title.lower()}. You should see the changes reflected in your next billing cycle. Thanks for giving us another chance!",
            f"Great news! Your {offer_title.lower()} is now live. We're thrilled to have you continue as part of our community!"
        ]
        
        import random
        return random.choice(messages)
    else:
        messages = [
            "I understand, and I respect your decision. Your cancellation will be processed as requested. We're sorry to see you go, but you're always welcome back.",
            "I completely understand. We'll proceed with your cancellation. Thank you for giving us the opportunity to try to address your concerns.",
            "No problem at all - I appreciate you taking the time to consider our offer. Your cancellation will be processed, and we hope to see you again in the future.",
            "That's perfectly fine. We'll go ahead with the cancellation as you requested. Thank you for being a customer, and we wish you all the best."
        ]
        
        import random
        return random.choice(messages)

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