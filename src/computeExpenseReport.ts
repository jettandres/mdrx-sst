import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from "aws-lambda"
import { add, dinero, toUnit } from "dinero.js"
import { PHP } from "@dinero.js/currencies"

import client from "./utils/gql/client"

import type { DineroOptions } from "dinero.js"

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

const QUERY_EXPENSE_YTD = `
  query ExpenseYearToDate($reportStatus: report_status_enum!, $since: timestamp, $expenseIds: [uuid!]) {
    expense(where: {id: {_in: $expenseIds}, receipts: {expense_report: {status: {_eq: $reportStatus}, submitted_at: {_gte: $since}}}}) {
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
    amount: DineroOptions<number>
  }[]
}

type QueryExpenseResponse = {
  expense: Array<Expense>
}

type QueryExpensePayload = {
  expenseReportId: string
}

type QueryExpenseYtdPayload = {
  reportStatus: "DRAFT" | "SUBMITTED"
  since?: string
  expenseIds: Array<string>
}

export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2
) => {
  const body = JSON.parse(event.body ?? "")
  const expenseReportId =
    body.event.data.new.expense_report_id ||
    body.event.data.old.expense_report_id

  // TODO: refactor axios into gql client that'll accept query and variable as payload with default GRAPHQL_URL and headers
  const {
    data: { expense },
  } = await client<QueryExpenseResponse, QueryExpensePayload>(QUERY_EXPENSE, {
    expenseReportId,
  })

  const expenses = expense
  const expenseIds = expenses.map((e) => e.id)

  console.log("expenseIds", expenseIds)

  const {
    data: { expense: expenseYtd },
  } = await client<QueryExpenseResponse, QueryExpenseYtdPayload>(
    QUERY_EXPENSE_YTD,
    {
      reportStatus: "DRAFT",
      expenseIds,
      // TODO: add $since param
    }
  )

  const expensesYtd = expenseYtd
  const computedYtd = expensesYtd.map((e: Expense) => {
    const year = e.receipts
      .map((r) => dinero(r.amount))
      .reduce((prev, next) => add(prev, next))

    const computed = {
      ...e,
      total: {
        year,
      },
    }
    return computed
  })

  const summary = expenses.map((e: Expense) => {
    const month = e.receipts
      .map((r) => dinero(r.amount))
      .reduce((prev, next) => add(prev, next))

    const ytd =
      computedYtd.find((y) => y.id === e.id)?.total.year ??
      dinero({ amount: 0, currency: PHP })
    const computed = {
      ...e,
      total: {
        month,
        ytd,
      },
    }
    return computed
  })

  console.log("monthly", toUnit(summary[0].total.month))
  console.log("ytd", toUnit(summary[0].total.ytd))

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/plain" },
    body: `Hello, World! Your request was received at ${event.requestContext.time}.`,
  }
}
