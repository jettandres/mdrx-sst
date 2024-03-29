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
    total: {
      netAmount: DineroSnapshot<number>
      vatAmount: DineroSnapshot<number>
      grossAmount: DineroSnapshot<number>
    }
    itemCount: number
  }
  data: Array<SectionData>
}

type SectionData = {
  id: string
  supplierName: string
  supplierTin: string
  netAmount: DineroSnapshot<number>
  vatAmount: DineroSnapshot<number>
  grossAmount: DineroSnapshot<number>
  imageKey: string
  kmReading?: number
  litersAdded?: number
}

type YearToDateData = {
  id: string
  name: string
  gross: DineroSnapshot<number>
  net: DineroSnapshot<number>
  vat: DineroSnapshot<number>
}

type ReportFooter = {
  totalReplenishable: {
    netAmount: DineroSnapshot<number>
    grossAmount: DineroSnapshot<number>
    vatAmount: DineroSnapshot<number>
  }
  yearToDate: Array<YearToDateData>
  totalYearToDate: {
    netAmount: DineroSnapshot<number>
    grossAmount: DineroSnapshot<number>
    vatAmount: DineroSnapshot<number>
  }
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
    const gross = e.receipts
      .map((r) => dinero(r.amount))
      .reduce((prev, next) => add(prev, next), defaultDinero)

    const net = e.receipts
      .map((r) => dinero(r.net))
      .reduce((prev, next) => add(prev, next), defaultDinero)

    const vat = e.receipts
      .map((r) => dinero(r.vat))
      .reduce((prev, next) => add(prev, next), defaultDinero)

    const computed: YearToDateData = {
      id: e.id,
      name: e.name,
      gross: toSnapshot(gross),
      net: toSnapshot(net),
      vat: toSnapshot(vat),
    }
    return computed
  })

  const reportBody: Array<Sections> = expenses.map((e: Expense) => {
    const monthlyGross = e.receipts
      .map((r) => dinero(r.amount))
      .reduce((prev, next) => add(prev, next), defaultDinero)

    const monthlyNet = e.receipts
      .map((r) => dinero(r.net))
      .reduce((prev, next) => add(prev, next), defaultDinero)

    const monthlyVat = e.receipts
      .map((r) => dinero(r.vat))
      .reduce((prev, next) => add(prev, next), defaultDinero)

    const data: Array<SectionData> = e.receipts.map((r) => {
      const sectionData: SectionData = {
        id: r.id as string,
        supplierName: r.supplier?.name as string,
        supplierTin: r.supplier?.tin as string,
        imageKey: r.imageKey,
        kmReading: r.kmReading?.value,
        litersAdded: r.kmReading?.litersAdded,
        grossAmount: r.amount,
        netAmount: r.net,
        vatAmount: r.vat,
      }
      return sectionData
    })

    const computed: Sections = {
      title: {
        label: e.name,
        total: {
          grossAmount: toSnapshot(monthlyGross),
          netAmount: toSnapshot(monthlyNet),
          vatAmount: toSnapshot(monthlyVat),
        },
        itemCount: data.length,
      },
      data: data,
    }

    return computed
  })

  const totalReplenishableGross: Dinero<number> = reportBody
    .map((s: Sections) => dinero(s.title.total.grossAmount))
    .reduce((prev, next) => add(prev, next), defaultDinero)

  const totalReplenishableNet = reportBody
    .map((s: Sections) => dinero(s.title.total.netAmount))
    .reduce((prev, next) => add(prev, next), defaultDinero)

  const totalReplenishableVat = reportBody
    .map((s: Sections) => dinero(s.title.total.vatAmount))
    .reduce((prev, next) => add(prev, next), defaultDinero)

  const totalYearToDateGross: Dinero<number> = computedYtd
    .map((cytd) => dinero(cytd.gross))
    .reduce((prev, next) => add(prev, next), defaultDinero)

  const totalYearToDateVat: Dinero<number> = computedYtd
    .map((cytd) => dinero(cytd.vat))
    .reduce((prev, next) => add(prev, next), defaultDinero)

  const totalYearToDateNet: Dinero<number> = computedYtd
    .map((cytd) => dinero(cytd.net))
    .reduce((prev, next) => add(prev, next), defaultDinero)

  const sortedKmReadings = kmReadings
    .map((v) => v.kmReading)
    .sort((a, b) => a - b)

  const firstKmReading = sortedKmReadings[0] ?? 0
  const lastKmReading = sortedKmReadings[kmReadings.length - 1] ?? 0

  const totalKmReadingConsumption = lastKmReading - firstKmReading
  const totalLitersAdded = kmReadings
    .map((o) => o.litersAdded)
    .reduce((prev, next) => prev + next, 0)

  const hasTotalKmAndLiters = !!totalKmReadingConsumption && !!totalLitersAdded
  const avgKmPerLiter = `${(hasTotalKmAndLiters
    ? totalKmReadingConsumption / totalLitersAdded
    : 0
  ).toFixed(2)}km/liter`

  const reportFooter: ReportFooter = {
    totalReplenishable: {
      grossAmount: toSnapshot(totalReplenishableGross),
      netAmount: toSnapshot(totalReplenishableNet),
      vatAmount: toSnapshot(totalReplenishableVat),
    },
    yearToDate: computedYtd,
    totalYearToDate: {
      grossAmount: toSnapshot(totalYearToDateGross),
      netAmount: toSnapshot(totalYearToDateNet),
      vatAmount: toSnapshot(totalYearToDateVat),
    },
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
