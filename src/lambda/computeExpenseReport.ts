import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from "aws-lambda"

import { add, dinero, toSnapshot } from "dinero.js"
import type { DineroSnapshot, Dinero } from "dinero.js"

import client from "../gql/client"
import {
  QUERY_EXPENSE,
  QUERY_EXPENSE_YTD,
  QueryExpenseResponse,
  QueryExpensePayload,
  QueryExpenseYtdPayload,
  QueryExpenseReportResponse,
  QUERY_EXPENSE_REPORT,
} from "../gql/queries/expense"

import type Expense from "../types/Expense"

type Sections = {
  title: {
    label: string
    total: DineroSnapshot<number>
  }
  data: Array<SectionData>
}

type SectionData = {
  id: string
  supplierName: string
  supplierTin: string
  netAmount: DineroSnapshot<number>
  kmReading?: number
}

type YearToDateData = {
  id: string
  name: string
  amount: DineroSnapshot<number>
}

type ReportFooter = {
  totalReplenishable: DineroSnapshot<number>
  yearToDate: Array<YearToDateData>
  totalYearToDate: DineroSnapshot<number>
}

type ReportHeader = {
  createdAt: string
}

type Response = {
  reportHeader: ReportHeader
  reportBody: Array<Sections>
  reportFooter: ReportFooter
}

export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2
) => {
  const expenseReportId: string = event.queryStringParameters?.id as string

  const {
    data: {
      expenseReport: { createdAt },
    },
  } = await client<QueryExpenseReportResponse, QueryExpensePayload>(
    QUERY_EXPENSE_REPORT,
    {
      expenseReportId,
    }
  )

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

  const computedYtd: Array<YearToDateData> = expenseYtd.map((e: Expense) => {
    const year = e.receipts
      .map((r) => dinero(r.amount))
      .reduce((prev, next) => add(prev, next))

    const computed: YearToDateData = {
      id: e.id,
      name: e.name,
      amount: toSnapshot(year),
    }
    return computed
  })

  const reportBody: Array<Sections> = expenses.map((e: Expense) => {
    const month = e.receipts
      .map((r) => dinero(r.amount))
      .reduce((prev, next) => add(prev, next))

    const data: Array<SectionData> = e.receipts.map((r) => {
      const sectionData: SectionData = {
        id: r.id as string,
        supplierName: r.supplier?.name as string,
        supplierTin: r.supplier?.tin as string,
        netAmount: r.amount,
      }
      return sectionData
    })

    const computed: Sections = {
      title: {
        label: e.name,
        total: toSnapshot(month),
      },
      data: data,
    }

    return computed
  })

  const totalReplenishable: Dinero<number> = reportBody
    .map((s: Sections) => dinero(s.title.total))
    .reduce((prev, next) => add(prev, next))

  const totalYearToDate: Dinero<number> = computedYtd
    .map((cytd) => dinero(cytd.amount))
    .reduce((prev, next) => add(prev, next))

  const reportFooter: ReportFooter = {
    totalReplenishable: toSnapshot(totalReplenishable),
    yearToDate: computedYtd,
    totalYearToDate: toSnapshot(totalYearToDate),
  }

  const reportHeader: ReportHeader = {
    createdAt,
  }

  const response: Response = {
    reportHeader,
    reportBody,
    reportFooter,
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(response),
  }
}
