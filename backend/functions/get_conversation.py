import json
import boto3
import os
from typing import Dict, Any, List

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
conversations_table = dynamodb.Table(os.environ['DYNAMODB_TABLE_CONVERSATIONS'])
messages_table = dynamodb.Table(os.environ['DYNAMODB_TABLE_MESSAGES'])
offers_table = dynamodb.Table(os.environ['DYNAMODB_TABLE_OFFERS'])

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Get conversation details with messages and offers
    """
    try:
        # Get conversation ID from path parameters
        conversation_id = event.get('pathParameters', {}).get('id')
        
        if not conversation_id:
            return create_response(400, {'error': 'Missing conversation ID'})
        
        # Get conversation
        conversation_response = conversations_table.get_item(Key={'id': conversation_id})
        conversation = conversation_response.get('Item')
        
        if not conversation:
            return create_response(404, {'error': 'Conversation not found'})
        
        # Get messages for this conversation
        messages_response = messages_table.query(
            IndexName='ConversationIdIndex',
            KeyConditionExpression='conversationId = :conv_id',
            ExpressionAttributeValues={':conv_id': conversation_id},
            ScanIndexForward=True  # Sort by timestamp ascending
        )
        
        messages = messages_response.get('Items', [])
        
        # Get offers for this conversation
        offers_response = offers_table.query(
            IndexName='ConversationIdIndex',
            KeyConditionExpression='conversationId = :conv_id',
            ExpressionAttributeValues={':conv_id': conversation_id}
        )
        
        offers = offers_response.get('Items', [])
        
        # Combine data
        conversation_data = {
            **conversation,
            'messages': messages,
            'offers': offers
        }
        
        return create_response(200, {
            'success': True,
            'data': conversation_data
        })
        
    except Exception as e:
        print(f"Error in get_conversation: {str(e)}")
        return create_response(500, {'error': 'Internal server error'})

def create_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """Create standardized HTTP response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, OPTIONS'
        },
        'body': json.dumps(body)
    }