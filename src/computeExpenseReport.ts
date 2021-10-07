import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from "aws-lambda"

import { DateTime } from "luxon"
import { add, dinero, toUnit } from "dinero.js"
import { PHP } from "@dinero.js/currencies"

import client from "./gql/client"
import {
  QUERY_EXPENSE,
  QUERY_EXPENSE_YTD,
  QueryExpenseResponse,
  QueryExpensePayload,
  QueryExpenseYtdPayload,
} from "./gql/queries/expense"

import type Expense from "./types/expense"

export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2
) => {
  const body = JSON.parse(event.body ?? "")
  const expenseReportId =
    body.event.data.new.expense_report_id ||
    body.event.data.old.expense_report_id

  const {
    data: { expense },
  } = await client<QueryExpenseResponse, QueryExpensePayload>(QUERY_EXPENSE, {
    expenseReportId,
  })

  const expenses = expense
  const expenseIds = expenses.map((e) => e.id)
  const since = DateTime.now().startOf("year").toUTC().toSQL()

  const {
    data: { expense: expenseYtd },
  } = await client<QueryExpenseResponse, QueryExpenseYtdPayload>(
    QUERY_EXPENSE_YTD,
    {
      reportStatus: "DRAFT", // TODO; update to SUBMITTED for accuracy in computation
      expenseIds,
      since,
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
