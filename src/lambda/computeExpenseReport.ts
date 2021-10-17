import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from 'aws-lambda'

import { add, dinero, toSnapshot } from 'dinero.js'
import type { DineroSnapshot, Dinero } from 'dinero.js'

import client from '../gql/client'
import {
  QUERY_EXPENSE,
  QUERY_EXPENSE_YTD,
  QueryExpenseResponse,
  QueryExpensePayload,
  QueryExpenseYtdPayload,
  QueryExpenseReportResponse,
  QUERY_EXPENSE_REPORT,
  QueryExpenseReportKmReadingResponse,
  QUERY_EXPENSE_REPORT_KM_READING,
} from '../gql/queries/expense'

import type Expense from '../types/Expense'
import { PHP } from '@dinero.js/currencies'

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
  totalKmReadingConsumption: number
  avgKmPerLiter: string
}

type ReportHeader = {
  createdAt: string
}

type Response = {
  reportHeader: ReportHeader
  reportBody: Array<Sections>
  reportFooter: ReportFooter
}

const defaultDinero = dinero({ amount: 0, currency: PHP })

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
    data: { expenses },
  } = await client<QueryExpenseResponse, QueryExpensePayload>(QUERY_EXPENSE, {
    expenseReportId,
  })

  const expenseIds = expenses.map((e) => e.id)
  //const since = DateTime.now().startOf("year").toUTC().toSQL()

  const {
    data: { expenses: expensesYtd },
  } = await client<QueryExpenseResponse, QueryExpenseYtdPayload>(
    QUERY_EXPENSE_YTD,
    {
      reportStatus: 'DRAFT', // TODO; update to SUBMITTED for accuracy in computation
      expenseIds,
      // TODO: add $since var once we have submitted expense reports
    }
  )

  const {
    data: { kmReadings },
  } = await client<QueryExpenseReportKmReadingResponse, QueryExpensePayload>(
    QUERY_EXPENSE_REPORT_KM_READING,
    {
      expenseReportId,
    }
  )

  const computedYtd: Array<YearToDateData> = expensesYtd.map((e: Expense) => {
    const year = e.receipts
      .map((r) => dinero(r.amount))
      .reduce((prev, next) => add(prev, next), defaultDinero)

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
      .reduce((prev, next) => add(prev, next), defaultDinero)

    const data: Array<SectionData> = e.receipts.map((r) => {
      const sectionData: SectionData = {
        id: r.id as string,
        supplierName: r.supplier?.name as string,
        supplierTin: r.supplier?.tin as string,
        netAmount: r.amount,
        kmReading: r.kmReading?.value,
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
    .reduce((prev, next) => add(prev, next), defaultDinero)

  const totalYearToDate: Dinero<number> = computedYtd
    .map((cytd) => dinero(cytd.amount))
    .reduce((prev, next) => add(prev, next), defaultDinero)

  const sortedKmReadings = kmReadings
    .map((v) => v.kmReading)
    .sort((a, b) => a - b)

  const firstKmReading = sortedKmReadings[0]
  const lastKmReading = sortedKmReadings[kmReadings.length - 1]

  const totalKmReadingConsumption = lastKmReading - firstKmReading
  const totalLitersAdded = kmReadings
    .map((o) => o.litersAdded)
    .reduce((prev, next) => prev + next)

  const avgKmPerLiter = `${(
    totalKmReadingConsumption / totalLitersAdded
  ).toFixed(2)}km/liter`

  const reportFooter: ReportFooter = {
    totalReplenishable: toSnapshot(totalReplenishable),
    yearToDate: computedYtd,
    totalYearToDate: toSnapshot(totalYearToDate),
    totalKmReadingConsumption,
    avgKmPerLiter,
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(response),
  }
}
