import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from "aws-lambda"
import axios from "axios"
import { Dinero, add } from "dinero.js"

const QUERY_EXPENSE = `
  query Expense($expenseReportId:uuid!){
    expense(where:{receipts: {expense_report_id: {_eq: $expenseReportId}}}) {
      id
      name
      receipts {
        amount
      }
    }
  }
`

type Expense = {
  id: string
  name: string
  receipts: {
    amount: Dinero<number>
  }[]
}

const GRAPHQL_URL = process.env.GRAPHQL_URL as string

export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2
) => {
  const body = JSON.parse(event.body ?? "")
  const expenseReportId =
    body.event.data.new.expense_report_id ||
    body.event.data.old.expense_report_id

  const response = await axios.post(GRAPHQL_URL, {
    query: QUERY_EXPENSE,
    variables: {
      expenseReportId,
    },
    headers: {
      "x-hasura-admin-secret": process.env.HASURA_SECRET,
    },
  })

  const expenses = response.data.data.expense as Array<Expense>

  const summary = expenses.map((e: Expense) => {
    const month = e.receipts
      .map((r) => r.amount)
      .reduce((prev, next) => add(prev, next))
    const computed = {
      ...e,
      total: {
        month,
      },
    }
    return computed
  })

  console.log("expense", summary[0].total.month)

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/plain" },
    body: `Hello, World! Your request was received at ${event.requestContext.time}.`,
  }
}
