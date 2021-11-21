import client from '../gql/client'
import {
  MutationUpsertEmployeePayload,
  MutationUpsertEmployeeResponse,
  MUTATION_UPSERT_EMPLOYEE,
} from '../gql/queries/employees'

//eslint-disable-next-line
export const handler = async (event: any, context: any, callback: any) => {
  const userId = event.userName
  const contactNumber = event.request.userAttributes.phone_number
  const email = event.request.userAttributes.email

  const employee = {
    id: userId,
    email: email,
    contact_number: contactNumber,
  }

  const {
    data: { result },
  } = await client<
    MutationUpsertEmployeeResponse,
    MutationUpsertEmployeePayload
  >(MUTATION_UPSERT_EMPLOYEE, {
    employee,
  })

  console.log('upsert employee', result)

  callback(null, event)
}
