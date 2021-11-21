import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from 'aws-lambda'

export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2
) => {
  // TODO: have a column check for admin-verified
  //console.log('verify lambda', JSON.stringify(event))
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      'X-Hasura-User-Id': '6969',
      'X-Hasura-Role': 'admin',
    }),
  }
}
