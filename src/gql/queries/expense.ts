import type Expense from "../../types/Expense"
import KmReading from "../../types/KmReading"

const QUERY_EXPENSE = `
  query Expense($expenseReportId:uuid!){
    expense(where:{receipts: {expense_report_id: {_eq: $expenseReportId}}}) {
      id
      name
      receipts (where: {expense_report_id: {_eq: $expenseReportId }}) {
        id
        supplier
        imageUrl: image_url
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

type QueryExpenseReportResponse = {
  expenseReport: {
    id: string
    createdAt: string
  }
}

type QueryExpenseReportKmReadingResponse = {
  kmReadings: Array<KmReading>
}

export {
  QUERY_EXPENSE,
  QUERY_EXPENSE_YTD,
  QUERY_EXPENSE_REPORT,
  QUERY_EXPENSE_REPORT_KM_READING,
  QueryExpenseResponse,
  QueryExpensePayload,
  QueryExpenseYtdPayload,
  QueryExpenseReportResponse,
  QueryExpenseReportKmReadingResponse,
}
