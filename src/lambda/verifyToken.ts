import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { CognitoJwtVerifier } from 'aws-jwt-verify'

export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2
) => {
  const userPoolId = process.env.USER_POOL_ID as string
  const clientId = process.env.CLIENT_ID as string

  const verifier = CognitoJwtVerifier.create({
    userPoolId,
    tokenUse: 'id',
    clientId,
  })

  const token = event.headers.authorization as string
  console.log('headers', event)

  try {
    const payload = await verifier.verify(token)
    console.log('verified!', payload)
  } catch (e) {
    console.log('token not valid', e)
  }

  // TODO: have a column check for custodian_assignment, area, and hasura role
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      'X-Hasura-User-Id': '6969',
      'X-Hasura-Role': 'admin',
    }),
  }
}
