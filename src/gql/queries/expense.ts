import type Expense from "../../types/Expense"

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

export {
  QUERY_EXPENSE,
  QUERY_EXPENSE_YTD,
  QUERY_EXPENSE_REPORT,
  QueryExpenseResponse,
  QueryExpensePayload,
  QueryExpenseYtdPayload,
  QueryExpenseReportResponse,
}
