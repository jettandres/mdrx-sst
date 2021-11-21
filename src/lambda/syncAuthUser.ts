import axios from 'axios'

const hasuraAdminSecret = 'myadminsecret'
const url = 'http://localhost:8080/v1/graphql'

//eslint-disable-next-line
export const handler = async (event: any, context: any, callback: any) => {
  console.log('sync user', JSON.stringify(event))

  const gql = process.env.GRAPHQL_URL
  const sec = process.env.HASURA_SECRET
  console.log('GQL env', gql)
  console.log('hasura secret', sec)

  const userId = event.userName
  const contactNumber = event.request.userAttributes.phone_number
  const email = event.request.userAttributes.email

  callback(null, event)
  /*
  const upsertUserQuery = `
    mutation ($employee: employees_insert_input!) {
      insert_employees_one(object: $employee, on_conflict: {constraint: employees_pkey, update_columns: []}) {
        id
        email
        contact_number
      }
    }
  `

  const graphqlReq = {
    query: upsertUserQuery,
    variables: {
      employee: {
        id: userId,
        contact_number: contactNumber,
        email: email,
      },
    },
  }

  request.post(
    {
      headers: {
        'content-type': 'application/json',
        'x-hasura-admin-secret': hasuraAdminSecret,
      },
      url: url,
      body: JSON.stringify(graphqlReq),
    },
    function (error, response, body) {
      console.log(body)
      callback(null, context)
    }
  )
  */
}
