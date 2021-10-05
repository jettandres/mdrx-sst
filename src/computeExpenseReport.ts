import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from "aws-lambda"
import axios from "axios"

const QUERY_RECEIPTS = `
  query Receipts($expenseReportId: uuid!){
    receipts(where:{expense_report_id: {_eq: $expenseReportId}}){
      id
      amount
      expense {
        name
      }
    }
  }
`

const GRAPHQL_URL = process.env.GRAPHQL_URL as string

export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2
) => {
  const body = JSON.parse(event.body ?? "")
  const expenseReportId =
    body.event.data.new.expense_report_id ||
    body.event.data.old.expense_report_id

  const response = await axios.post(GRAPHQL_URL, {
    query: QUERY_RECEIPTS,
    variables: {
      expenseReportId,
    },
    headers: {
      "x-hasura-admin-secret": process.env.HASURA_SECRET,
    },
  })

  const receipts = response.data.data.receipts
  console.log("receipts", receipts)

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/plain" },
    body: `Hello, World! Your request was received at ${event.requestContext.time}.`,
  }
}
