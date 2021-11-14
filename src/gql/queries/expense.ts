import type Expense from '../../types/Expense'
import KmReading from '../../types/KmReading'
import KmReadingConsumed from '../../types/KmReadingConsumed'

const QUERY_EXPENSE = `
  query Expense($expenseReportId:uuid!){
    expenses: expense(where:{receipts: {expense_report_id: {_eq: $expenseReportId}}}) {
      id
      name
      receipts (where: {expense_report_id: {_eq: $expenseReportId }}) {
        id
        supplier
        imageKey: image_key
        amount
        kmReading: expense_report_km_reading{
          value: km_reading
          litersAdded: liters_added
        }
      }
    }
  }
`

const QUERY_EXPENSE_YTD = `
  query ExpenseYearToDate($reportStatus: report_status_enum!, $since: timestamp, $expenseIds: [uuid!]) {
    expenses: expense(where: {id: {_in: $expenseIds}, receipts: {expense_report: {status: {_eq: $reportStatus}, submitted_at: {_gte: $since}}}}) {
      id
      name
      receipts {
	amount
      }
    }
  }
`

const QUERY_EXPENSE_REPORT = `
  query ExpenseReportHeader($expenseReportId: uuid!) {
    expenseReport: expense_report_by_pk(id: $expenseReportId) {
      id
      createdAt: created_at
    }
  }
`

const QUERY_EXPENSE_REPORT_KM_READING = `
  query ReportKmReading($expenseReportId: uuid!) {
    kmReadings: expense_report_km_reading(where: {expense_report_id: {_eq: $expenseReportId}}){
      receiptId: receipt_id
      litersAdded: liters_added
      kmReading: km_reading
    }
  }
`

const QUERY_LAST_TWO_KM_READING = `
  query LastTwoKmReading($expenseReportId: uuid!) {
    kmReadings: expense_report_km_reading(where: {expense_report_id: {_eq: $expenseReportId}}, order_by: {created_at: desc}, limit: 2) {
      receiptId: receipt_id
      createdAt: created_at
      kmReading: km_reading
      kmConsumed: km_consumed
    }
  }
`

const MUTATION_UPDATE_KM_CONSUMED = `
  mutation UpdateKmConsumed($receiptId: uuid!, $kmConsumed: numeric) {
    update_expense_report_km_reading(where: {receipt_id: {_eq: $receiptId}}, _set: {km_consumed: $kmConsumed}) {
      affected_rows
      returning {
        receipt_id
        km_consumed
      }
    }
  }
`

type QueryExpenseResponse = {
  expenses: Array<Expense>
}

type QueryExpensePayload = {
  expenseReportId: string
}

type QueryExpenseYtdPayload = {
  reportStatus: 'DRAFT' | 'SUBMITTED'
  since?: string
  expenseIds: Array<string>
}

type QueryExpenseReportResponse = {
  expenseReport: {
    id: string
    createdAt: string
  }
}

type QueryExpenseReportKmReadingResponse = {
  kmReadings: Array<KmReading>
}

type QueryLastTwoKmReadingResponse = {
  kmReadings: Array<KmReadingConsumed>
}

type MutationUpdateKmConsumedPayload = {
  receiptId: string
  kmConsumed: number
}

type MutationUpdateKmConsumedResponse = {
  update_expense_report_km_reading: {
    affected_rows: number
    returning: {
      receipt_id: string
      km_consumed: string
    }[]
  }
}

export {
  QUERY_EXPENSE,
  QUERY_EXPENSE_YTD,
  QUERY_EXPENSE_REPORT,
  QUERY_EXPENSE_REPORT_KM_READING,
  QUERY_LAST_TWO_KM_READING,
  MUTATION_UPDATE_KM_CONSUMED,
  QueryExpenseResponse,
  QueryExpensePayload,
  QueryExpenseYtdPayload,
  QueryExpenseReportResponse,
  QueryExpenseReportKmReadingResponse,
  QueryLastTwoKmReadingResponse,
  MutationUpdateKmConsumedPayload,
  MutationUpdateKmConsumedResponse,
}
