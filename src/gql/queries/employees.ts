const MUTATION_UPSERT_EMPLOYEE = `
    mutation ($employee: employees_insert_input!) {
      result: insert_employees_one(object: $employee, on_conflict: {constraint: employees_pkey, update_columns: []}) {
        id
        email
        contact_number
      }
    }
`

type MutationUpsertEmployeePayload = {
  employee: {
    id: string
    email: string
    contact_number: string
  }
}

type MutationUpsertEmployeeResponse = {
  result: {
    id: string
    email: string
    contact_number: string
  }
}

export {
  MUTATION_UPSERT_EMPLOYEE,
  MutationUpsertEmployeePayload,
  MutationUpsertEmployeeResponse,
}
