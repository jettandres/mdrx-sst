import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'

import HasuraEvent from '../interface/HasuraEvent'
import Receipt from '../interface/Receipt'

export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2
) => {
  const client = new S3Client({
    region: process.env.region,
    credentials: {
      accessKeyId: process.env.awsAccessKey as string,
      secretAccessKey: process.env.awsSecretAccessKey as string,
    },
  })

  const hasuraEvent = JSON.parse(event.body as string) as HasuraEvent
  const receipt = hasuraEvent.event.data.old as Receipt

  const deleteCommand = new DeleteObjectCommand({
    Key: receipt.image_key,
    Bucket: process.env.bucketName,
  })

  try {
    await client.send(deleteCommand)
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        imageKey: receipt.image_key,
      }),
    }
  } catch (error) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        imageKey: receipt.image_key,
        error: JSON.stringify(error),
      }),
    }
  }
}
