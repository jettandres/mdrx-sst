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

const QUERY_EMPLOYEE_DETAILS = `
  query EmployeeDetails($id: uuid!) {
    employee: employees_by_pk(id: $id) {
      id
      name
      email
      contactNumber: contact_number
      area
      custodianAssignment: custodian_assignment
      hasuraRole: hasura_role
    }
  }
`

type QueryEmployeeDetailsResponse = {
  employee: {
    id: string
    name?: string
    email: string
    contactNumber: string
    area?: string
    custodianAssignment?: string
    hasuraRole: 'employee' | 'admin'
  }
}

type QueryEmployeeDetailsPayload = {
  id: string
}

export {
  MUTATION_UPSERT_EMPLOYEE,
  MutationUpsertEmployeePayload,
  MutationUpsertEmployeeResponse,
  QUERY_EMPLOYEE_DETAILS,
  QueryEmployeeDetailsPayload,
  QueryEmployeeDetailsResponse,
}
