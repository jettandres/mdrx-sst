import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from 'aws-lambda'
import client from '../gql/client'
import {
  MutationUpdateKmConsumedPayload,
  MutationUpdateKmConsumedResponse,
  MUTATION_UPDATE_KM_CONSUMED,
  QueryExpensePayload,
  QueryLastTwoKmReadingResponse,
  QUERY_LAST_TWO_KM_READING,
} from '../gql/queries/expense'

export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2
) => {
  const body = JSON.parse(event.body ?? '')
  const expenseReportId = body.event.data.new.expense_report_id as string

  const {
    data: { kmReadings },
  } = await client<QueryLastTwoKmReadingResponse, QueryExpensePayload>(
    QUERY_LAST_TWO_KM_READING,
    {
      expenseReportId,
    }
  )

  console.log('data', kmReadings)

  const currentKmReading = kmReadings[0].kmReading
  const prevKmReading = kmReadings[1].kmReading

  const currentKmConsumed = currentKmReading - prevKmReading
  console.log('currentKmConsumed', currentKmConsumed)

  const currentReceiptId = kmReadings[0].receiptId
  const { data } = await client<
    MutationUpdateKmConsumedResponse,
    MutationUpdateKmConsumedPayload
  >(MUTATION_UPDATE_KM_CONSUMED, {
    receiptId: currentReceiptId,
    kmConsumed: currentKmConsumed,
  })

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({
      message: data,
    }),
  }
}
