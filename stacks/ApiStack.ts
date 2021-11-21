import * as sst from '@serverless-stack/resources'

type Props = sst.StackProps & {
  bucket: sst.Bucket
}

export default class ApiStack extends sst.Stack {
  api: sst.Api

  constructor(scope: sst.App, id: string, props?: Props) {
    super(scope, id, props)

    const computeExpenseReport = new sst.Function(
      this,
      'ComputeExpenseReportLambda',
      {
        handler: 'src/lambda/computeExpenseReport.handler',
        environment: {
          GRAPHQL_URL: process.env.GRAPHQL_URL,
          HASURA_SECRET: process.env.HASURA_SECRET,
        },
      }
    )

    const deleteS3Image = new sst.Function(this, 'DeleteS3ImageLambda', {
      handler: 'src/lambda/deleteS3Image.handler',
      environment: {
        region: this.region,
        bucketName: props.bucket.s3Bucket.bucketName,
        awsAccessKey: process.env.AWS_ACCESS_KEY_ID,
        awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    })

    const verifyToken = new sst.Function(this, 'VerifyToken', {
      handler: 'src/lambda/verifyToken.handler',
      environment: {
        GRAPHQL_URL: process.env.GRAPHQL_URL,
        HASURA_SECRET: process.env.HASURA_SECRET,
      },
    })

    // Create a HTTP API
    this.api = new sst.Api(this, 'Api', {
      routes: {
        'GET /v1/compute-expense-report': computeExpenseReport,
        'POST /v1/delete-s3-image': deleteS3Image,
        'GET /v1/verify-token': verifyToken,
      },
    })

    // Show the endpoint in the output
    this.addOutputs({
      computeExpenseReport: `GET ${this.api.url}/v1/compute-expense-report`,
      deleteS3Image: `POST ${this.api.url}/v1/delete-s3-image`,
      verifyToken: `GET ${this.api.url}/v1/verify-token`,
    })
  }
}
