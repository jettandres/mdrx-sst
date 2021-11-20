//eslint-disable-next-line
export const handler = (event: any, context: any, callback: any) => {
  event.response = {
    claimsOverrideDetails: {
      claimsToAddOrOverride: {
        'https://hasura.io/jwt/claims': JSON.stringify({
          //'x-hasura-user-id': event.request.userAttributes.sub,
          'x-hasura-default-role': 'employee',
          // do some custom logic to decide allowed roles
          'x-hasura-allowed-roles': ['employee'],
        }),
      },
    },
  }

  callback(null, event)
}
