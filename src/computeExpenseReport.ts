import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from "aws-lambda"

import { add, dinero } from "dinero.js"
import { PHP } from "@dinero.js/currencies"

import client from "./gql/client"
import {
  QUERY_EXPENSE,
  QUERY_EXPENSE_YTD,
  QueryExpenseResponse,
  QueryExpensePayload,
  QueryExpenseYtdPayload,
  MUTATION_UPSERT_EXPENSE_REPORT_SUMMARY,
  MutationUpsertExpenseReportSummaryResponse,
  MutationUpsertExpenseReportSummaryPayload,
} from "./gql/queries/expense"

import type Expense from "./types/Expense"
import type ExpenseReportSummary from "./types/ExpenseReportSummary"

export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2
) => {
  const body = JSON.parse(event.body ?? "")
  const expenseReportId: string =
    body.event.data.new.expense_report_id ||
    body.event.data.old.expense_report_id

  const {
    data: { expense },
  } = await client<QueryExpenseResponse, QueryExpensePayload>(QUERY_EXPENSE, {
    expenseReportId,
  })

  const expenses = expense
  const expenseIds = expenses.map((e) => e.id)
  //const since = DateTime.now().startOf("year").toUTC().toSQL()

  const {
    data: { expense: expenseYtd },
  } = await client<QueryExpenseResponse, QueryExpenseYtdPayload>(
    QUERY_EXPENSE_YTD,
    {
      reportStatus: "DRAFT", // TODO; update to SUBMITTED for accuracy in computation
      expenseIds,
      // TODO: add $since var once we have submitted expense reports
    }
  )

  const computedYtd = expenseYtd.map((e: Expense) => {
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

  const summary: Array<ExpenseReportSummary> = expenses.map((e: Expense) => {
    const month = e.receipts
      .map((r) => dinero(r.amount))
      .reduce((prev, next) => add(prev, next))

    const ytd =
      computedYtd.find((y) => y.id === e.id)?.total.year ??
      dinero({ amount: 0, currency: PHP })

    const computed: unknown = {
      ...e,
      total: {
        month,
        ytd,
      },
    }

    return computed as ExpenseReportSummary
  })

  const { data } = await client<
    MutationUpsertExpenseReportSummaryResponse,
    MutationUpsertExpenseReportSummaryPayload
  >(MUTATION_UPSERT_EXPENSE_REPORT_SUMMARY, {
    payload: {
      expense_report_id: expenseReportId,
      data: summary,
    },
  })

  console.log("expense report summary", data)

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({
      data: summary,
    }),
  }
}
