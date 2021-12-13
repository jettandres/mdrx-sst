import { SubnetType, Vpc } from '@aws-cdk/aws-ec2'
import * as sst from '@serverless-stack/resources'

export default class VpcStack extends sst.Stack {
  readonly vpc: Vpc

  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props)

    const vpc = new Vpc(this, 'hasura-vpc', {
      cidr: '10.0.0.0/16',
      enableDnsHostnames: true,
      enableDnsSupport: true,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Database',
          subnetType: SubnetType.ISOLATED,
        },
      ],
      natGateways: 0,
      maxAzs: 2,
    })

    this.vpc = vpc
  }
}
