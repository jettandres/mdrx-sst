import type Expense from "../../types/Expense"
import type ExpenseReportSummary from "../../types/ExpenseReportSummary"

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
  since?: string
  expenseIds: Array<string>
}

const MUTATION_UPSERT_EXPENSE_REPORT_SUMMARY = `
  mutation UpsertExpenseReportSummary($payload: expense_report_summary_insert_input!) {
    expenseReportSummary: insert_expense_report_summary_one(object: $payload, on_conflict: {constraint: expense_report_summary_pkey, update_columns: [data, updated_at]}) {
      createdAt: created_at
      updatedAt: updated_at
      expenseReportId: expense_report_id
      data
    }
  }
`

type MutationUpsertExpenseReportSummaryResponse = {
  expenseReportSummary: {
    createdAt: string
    updatedAt: string
    expenseReportId: string
    data: Array<ExpenseReportSummary>
  }
}

type MutationUpsertExpenseReportSummaryPayload = {
  payload: {
    expense_report_id: string
    data: Array<ExpenseReportSummary>
  }
}

export {
  QUERY_EXPENSE,
  QUERY_EXPENSE_YTD,
  QueryExpenseResponse,
  QueryExpensePayload,
  QueryExpenseYtdPayload,
  MUTATION_UPSERT_EXPENSE_REPORT_SUMMARY,
  MutationUpsertExpenseReportSummaryResponse,
  MutationUpsertExpenseReportSummaryPayload,
}
