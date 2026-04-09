import boto3
import json
import logging

logger = logging.getLogger(__name__)

sns_client = boto3.client("sns", region_name="us-east-1")

TOPIC_ARN = "arn:aws:sns:us-east-1:666090839153:emailNotification"

def publish_allocation_event(data: dict):
    try:
        response = sns_client.publish(
            TopicArn=TOPIC_ARN,
            Message=json.dumps(data),
            Subject="Organ Allocation Alert"
        )
        logger.info(f"SNS published: {response['MessageId']}")
        return response
    except Exception as e:
        logger.error(f"SNS publish failed: {e}")
        # Note: Do not let SNS failure crash the main database transaction in hackathon
        return None
