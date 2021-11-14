import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from 'aws-lambda'

import { add, dinero, toSnapshot, toUnit, multiply } from 'dinero.js'
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
import dineroFromFloat from '../utils/dineroFromFloat'

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
  amount: DineroSnapshot<number>
}

type ReportFooter = {
  totalReplenishable: {
    netAmount: DineroSnapshot<number>
    grossAmount: DineroSnapshot<number>
    vatAmount: DineroSnapshot<number>
  }
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
      .map((d) => toUnit(d) / 1.12)
      .map((n) => n.toFixed(2))
      .map((s) => parseFloat(s))
      .map((f) => dineroFromFloat({ amount: f, currency: PHP, scale: 2 }))
      .reduce((prev, next) => add(prev, next), defaultDinero)

    const computed: YearToDateData = {
      id: e.id,
      name: e.name,
      amount: toSnapshot(year),
    }
    return computed
  })

  const reportBody: Array<Sections> = expenses.map((e: Expense) => {
    const monthlyGross = e.receipts
      .map((r) => dinero(r.amount))
      .reduce((prev, next) => add(prev, next), defaultDinero)

    const monthlyGrossNonVatable = e.receipts
      .filter((r) => !r.vatable)
      .map((r) => dinero(r.amount))
      .reduce((prev, next) => add(prev, next), defaultDinero)

    const monthlyGrossVatable = e.receipts
      .filter((r) => r.vatable)
      .map((r) => dinero(r.amount))
      .reduce((prev, next) => add(prev, next), defaultDinero)

    const hasMonthlyVatable = e.receipts.find((r) => r.vatable)

    const shortNet = parseFloat((toUnit(monthlyGrossVatable) / 1.12).toFixed(2))
    const netDinero = dineroFromFloat({
      amount: shortNet,
      currency: PHP,
      scale: 2,
    })

    const monthlyNet = add(
      dineroFromFloat({
        amount: shortNet,
        currency: PHP,
        scale: 2,
      }),
      monthlyGrossNonVatable
    )

    const monthlyVat = multiply(netDinero, { amount: 12, scale: 2 })

    const data: Array<SectionData> = e.receipts.map((r) => {
      const net = toUnit(dinero(r.amount)) / 1.12
      const netFloat = parseFloat(net.toFixed(2))

      const netDinero = dineroFromFloat({
        amount: netFloat,
        currency: PHP,
        scale: 2,
      })

      const vatDinero = multiply(netDinero, { amount: 12, scale: 2 })

      const sectionData: SectionData = {
        id: r.id as string,
        supplierName: r.supplier?.name as string,
        supplierTin: r.supplier?.tin as string,
        imageKey: r.imageKey,
        kmReading: r.kmReading?.value,
        litersAdded: r.kmReading?.litersAdded,
        grossAmount: r.amount,
        netAmount: r.vatable ? toSnapshot(netDinero) : r.amount,
        vatAmount: r.vatable
          ? toSnapshot(vatDinero)
          : toSnapshot(defaultDinero),
      }
      return sectionData
    })

    const computed: Sections = {
      title: {
        label: e.name,
        total: {
          grossAmount: toSnapshot(monthlyGross),
          netAmount: hasMonthlyVatable
            ? toSnapshot(monthlyNet)
            : toSnapshot(monthlyGross),
          vatAmount: hasMonthlyVatable
            ? toSnapshot(monthlyVat)
            : toSnapshot(defaultDinero),
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

  const totalYearToDate: Dinero<number> = computedYtd
    .map((cytd) => dinero(cytd.amount))
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
