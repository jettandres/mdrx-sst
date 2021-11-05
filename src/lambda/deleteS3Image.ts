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

  console.log('region', process.env.region)
  console.log('bucketName', process.env.bucketName)
  console.log('accessKeyId', process.env.awsAccessKey as string)
  console.log('secretAccessKey', process.env.awsSecretAccessKey as string)

  const hasuraEvent = JSON.parse(event.body as string) as HasuraEvent
  const receipt = hasuraEvent.event.data.old as Receipt

  console.log('imageKey', receipt.image_key)

  const deleteCommand = new DeleteObjectCommand({
    Key: receipt.image_key,
    Bucket: process.env.bucketName,
  })

  try {
    const data = await client.send(deleteCommand)
    console.log('delete res', data)
  } catch (error) {
    console.log('delete error', error)
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: true,
      imageKey: receipt.image_key,
    }),
  }
}
