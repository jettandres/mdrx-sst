import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { CognitoJwtVerifier } from 'aws-jwt-verify'
import client from '../gql/client'
import {
  QueryEmployeeDetailsPayload,
  QueryEmployeeDetailsResponse,
  QUERY_EMPLOYEE_DETAILS,
} from '../gql/queries/employees'

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
  try {
    const payload = await verifier.verify(token)
    const userId = payload?.sub as string

    const {
      data: { employee },
    } = await client<QueryEmployeeDetailsResponse, QueryEmployeeDetailsPayload>(
      QUERY_EMPLOYEE_DETAILS,
      { id: userId }
    )

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'X-Hasura-User-Id': userId,
        'X-Hasura-Role': employee.hasuraRole,
      }),
    }
  } catch (e) {
    console.log('token not valid', e)
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: e,
      }),
    }
  }
}
