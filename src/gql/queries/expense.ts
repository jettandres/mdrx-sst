import type Expense from "../../types/expense"

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

type QueryExpenseResponse = {
  expense: Array<Expense>
}

type QueryExpensePayload = {
  expenseReportId: string
}

type QueryExpenseYtdPayload = {
  reportStatus: "DRAFT" | "SUBMITTED"
  since: string
  expenseIds: Array<string>
}

export {
  QUERY_EXPENSE,
  QUERY_EXPENSE_YTD,
  QueryExpenseResponse,
  QueryExpensePayload,
  QueryExpenseYtdPayload,
}
