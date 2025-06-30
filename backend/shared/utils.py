import json
from typing import Dict, Any
from datetime import datetime

def create_response(status_code: int, body: Dict[str, Any], additional_headers: Dict[str, str] = None) -> Dict[str, Any]:
    """Create standardized HTTP response with CORS headers"""
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    }
    
    if additional_headers:
        headers.update(additional_headers)
    
    return {
        'statusCode': status_code,
        'headers': headers,
        'body': json.dumps(body, default=str)  # Handle datetime serialization
    }

def validate_required_fields(data: Dict[str, Any], required_fields: list) -> str:
    """Validate that all required fields are present"""
    for field in required_fields:
        if field not in data or data[field] is None:
            return f'Missing required field: {field}'
    return None

def generate_timestamp() -> str:
    """Generate ISO timestamp string"""
    return datetime.utcnow().isoformat() + 'Z'

def parse_request_body(event: Dict[str, Any]) -> Dict[str, Any]:
    """Parse and validate request body"""
    if 'body' not in event or not event['body']:
        raise ValueError('Missing request body')
    
    if isinstance(event['body'], str):
        return json.loads(event['body'])
    
    return event['body']