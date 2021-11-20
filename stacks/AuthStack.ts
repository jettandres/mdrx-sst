import * as iam from '@aws-cdk/aws-iam'
import * as sst from '@serverless-stack/resources'

type Props = sst.StackProps & {
  api: sst.Api
  bucket: sst.Bucket
}

export default class AuthStack extends sst.Stack {
  auth: sst.Auth

  constructor(scope: sst.App, id: string, props?: Props) {
    super(scope, id, props)

    const { api, bucket } = props

    this.auth = new sst.Auth(this, 'Auth', {
      cognito: {
        userPool: {
          signInAliases: { email: true },
        },
        triggers: {
          preTokenGeneration: 'src/lambda/claimJwt.handler',
          //postAuthentication //TODO: connect lambda later
        },
      },
    })

    this.auth.attachPermissionsForAuthUsers([
      api,
      new iam.PolicyStatement({
        actions: ['s3:*'],
        effect: iam.Effect.ALLOW,
        resources: [
          bucket.bucketArn + '/private/${cognito-identity.amazonaws.com:sub}/*',
          bucket.bucketArn + '/public/*',
          bucket.bucketArn +
            '/protected/${cognito-identity.amazonaws.com:sub}/*',
        ],
      }),
    ])

    this.addOutputs({
      Region: scope.region,
      UserPoolId: this.auth.cognitoUserPool.userPoolId,
      IdentityPoolId: this.auth.cognitoCfnIdentityPool.ref,
      UserPoolClientId: this.auth.cognitoUserPoolClient.userPoolClientId,
    })
  }
}
