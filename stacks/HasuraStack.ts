import * as sst from '@serverless-stack/resources'
import {
  InstanceClass,
  InstanceSize,
  InstanceType,
  Vpc,
  Port,
  Protocol,
  SubnetType,
} from '@aws-cdk/aws-ec2'
import { PublicHostedZone } from '@aws-cdk/aws-route53'
import {
  DatabaseInstance,
  DatabaseInstanceEngine,
  DatabaseSecret,
} from '@aws-cdk/aws-rds'
import { RemovalPolicy } from '@aws-cdk/core'
import { ApplicationLoadBalancedFargateService } from '@aws-cdk/aws-ecs-patterns'

import { Certificates } from './CertificatesStack'
import { ContainerImage, Secret as ECSecret } from '@aws-cdk/aws-ecs'
import { Secret } from '@aws-cdk/aws-secretsmanager'

type Props = sst.StackProps & {
  appName: string
  hostedZoneId: string
  hostedZoneName: string
  hasuraHostname: string
  certificates: Certificates
  vpc: Vpc
  multiAz: boolean
}

export default class HasuraStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: Props) {
    super(scope, id, props)

    const hostedZone = PublicHostedZone.fromHostedZoneAttributes(
      this,
      'HasuraHostedZone',
      {
        hostedZoneId: props.hostedZoneId,
        zoneName: props.hostedZoneName,
      }
    )

    const hasuraDatabase = new DatabaseInstance(this, 'HasuraDatabase', {
      instanceIdentifier: props.appName,
      databaseName: 'MdrxHasuraDb',
      engine: DatabaseInstanceEngine.POSTGRES,
      instanceType: InstanceType.of(
        InstanceClass.BURSTABLE3,
        InstanceSize.MICRO
      ),
      //masterUsername: 'syscdk', //can't add
      storageEncrypted: true,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      publiclyAccessible: true,
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC,
      },
      securityGroups: [],
      deletionProtection: false,
      multiAz: props.multiAz,
      removalPolicy: RemovalPolicy.DESTROY,
    })
    console.log('hotdog 1 end')

    const hasuraUsername = 'hasura'
    const hasuraUserSecret = new DatabaseSecret(this, 'HasuraDatabaseUser', {
      username: hasuraUsername,
      masterSecret: hasuraDatabase.secret,
    })

    hasuraUserSecret.attach(hasuraDatabase) // Adds DB connections information in the secret

    const hasuraDatabaseUrlSecret = new Secret(
      this,
      'HasuraDatabaseUrlSecret',
      {
        secretName: `${props.appName}-HasuradatabaseUrl`,
      }
    )

    const hasuraAdminSecret = new Secret(this, 'HasuraAdminSecret', {
      secretName: 'HasuraAdminSecret',
    })

    const fargate = new ApplicationLoadBalancedFargateService(
      this,
      'HasuraFargateService',
      {
        serviceName: props.appName,
        vpc: props.vpc,
        cpu: 256,
        desiredCount: props.multiAz ? 2 : 1,
        taskImageOptions: {
          image: ContainerImage.fromRegistry('hasura/graphql-engine:v1.3.3'),
          containerPort: 8080,
          enableLogging: true,
          environment: {
            // TODO: update envs with auth hooks
            HASURA_GRAPHQL_ENABLE_CONSOLE: 'true',
            HASURA_GRAPHQL_PG_CONNECTIONS: '100',
            HASURA_GRAPHQL_LOG_LEVEL: 'debug',
          },
          secrets: {
            HASURA_GRAPHQL_DATABASE_URL: ECSecret.fromSecretsManager(
              hasuraDatabaseUrlSecret
            ),
            HASURA_GRAPHQL_ADMIN_SECRET:
              ECSecret.fromSecretsManager(hasuraAdminSecret),
          },
        },
        memoryLimitMiB: 512,
        publicLoadBalancer: true,
        certificate: props.certificates.hasura,
        domainName: props.hasuraHostname,
        domainZone: hostedZone,
        assignPublicIp: true,
      }
    )

    fargate.targetGroup.configureHealthCheck({
      enabled: true,
      path: '/healthz',
      healthyHttpCodes: '200',
    })

    console.log('hatdog 4')
    hasuraDatabase.connections.allowFrom(
      fargate.service,
      new Port({
        protocol: Protocol.TCP,
        stringRepresentation: 'Postgres Port',
        fromPort: 5432,
        toPort: 5432,
      })
    )
    console.log('hatdog 4 end')

    this.addOutputs({
      hasuraSecret: hasuraDatabase.secret.secretValue.toString(),
      HasuraDatabaseUserSecretArn: hasuraUserSecret.secretArn,
      HasuraDatabaseMasterSecretArn: hasuraDatabase.secret?.secretArn,
      HasuraDatabaseUrlSecretArn: hasuraDatabaseUrlSecret.secretArn,
      hasuraAdminSecret: hasuraAdminSecret.secretArn,
    })
  }
}
