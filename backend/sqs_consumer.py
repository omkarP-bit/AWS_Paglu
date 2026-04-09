import boto3
import json
import logging

logger = logging.getLogger(__name__)

sqs = boto3.client("sqs", region_name="us-east-1")

QUEUE_URL = "https://sqs.us-east-1.amazonaws.com/666090839153/emailNotificationQueue"

def poll_messages():
    response = sqs.receive_message(
        QueueUrl=QUEUE_URL,
        MaxNumberOfMessages=10,
        WaitTimeSeconds=10  # long polling
    )

    messages = response.get("Messages", [])
    logger.info(f"Received {len(messages)} message(s)")

    for msg in messages:
        try:
            body = json.loads(msg["Body"])
            # SNS wraps the actual message — unwrap it
            actual_message = json.loads(body.get("Message", "{}"))
            logger.info(f"Processing allocation event: {actual_message}")

            # TODO: add email/db logic here

            sqs.delete_message(
                QueueUrl=QUEUE_URL,
                ReceiptHandle=msg["ReceiptHandle"]
            )
            logger.info(f"Deleted message: {msg['MessageId']}")
        except Exception as e:
            logger.error(f"Failed to process message {msg.get('MessageId')}: {e}")

    return messages
