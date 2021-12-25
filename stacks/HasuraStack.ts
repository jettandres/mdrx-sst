import * as sst from '@serverless-stack/resources'
import {
  InstanceClass,
  InstanceSize,
  InstanceType,
  Vpc,
  Port,
  Protocol,
  SubnetType,
  SecurityGroup,
  Peer,
} from '@aws-cdk/aws-ec2'
import { PublicHostedZone } from '@aws-cdk/aws-route53'
import {
  Credentials,
  DatabaseInstance,
  DatabaseInstanceEngine,
  PostgresEngineVersion,
} from '@aws-cdk/aws-rds'
import { RemovalPolicy, CfnOutput } from '@aws-cdk/core'
import { ApplicationLoadBalancedFargateService } from '@aws-cdk/aws-ecs-patterns'

import { Certificates } from './CertificatesStack'
import { ContainerImage, Secret as ECSecret } from '@aws-cdk/aws-ecs'
import { CfnSecret, Secret } from '@aws-cdk/aws-secretsmanager'

import { StringParameter } from '@aws-cdk/aws-ssm'

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

    const username = 'postgres'
    const databaseName = 'MdrxHasuraDb'

    const securityGroup = SecurityGroup.fromSecurityGroupId(
      this,
      'SG',
      props.vpc.vpcDefaultSecurityGroup
    )

    const myIp = '155.137.111.23/32'
    securityGroup.addIngressRule(
      Peer.ipv4(myIp),
      Port.tcp(5432),
      'allow 5432 access from my IP'
    )

    const dbCredentials = new Secret(this, 'DBCredentialsSecret', {
      secretName: 'mdrx-db-credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username,
        }),
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: 'password',
      },
    })

    new StringParameter(this, 'DbCredentialsArn', {
      parameterName: 'prod-credentials-arn',
      stringValue: dbCredentials.secretArn,
    })

    const hasuraDatabase = new DatabaseInstance(this, 'HasuraDatabase', {
      instanceIdentifier: props.appName,
      databaseName: databaseName,
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_10_4, //TODO: update engine if possible
      }),
      instanceType: InstanceType.of(
        InstanceClass.BURSTABLE3,
        InstanceSize.MICRO
      ),
      storageEncrypted: true,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      publiclyAccessible: true,
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC,
      },
      deletionProtection: false,
      multiAz: props.multiAz,
      removalPolicy: RemovalPolicy.DESTROY,
      credentials: Credentials.fromSecret(dbCredentials),
      deleteAutomatedBackups: true,
      securityGroups: [securityGroup],
    })

    new CfnOutput(this, 'RDS Endpoint', {
      value: hasuraDatabase.dbInstanceEndpointAddress,
    })

    const passStr = dbCredentials.secretValueFromJson('password').toString()

    // postgres://<username>:<password>@<hostname>:<port>/<database name>
    // postgres connection string
    const connectionString = `postgres://${username}:${passStr}@${hasuraDatabase.dbInstanceEndpointAddress}:${hasuraDatabase.dbInstanceEndpointPort}/${databaseName}`

    // save connection string as a secret
    const connectionSecret = new CfnSecret(this, 'ConnectionSecret', {
      secretString: connectionString,
      description: 'Hasura RDS connection string',
    })

    const hasuraAdminSecret = new CfnSecret(this, 'HasuraAdminSecret', {
      generateSecretString: {
        excludePunctuation: true,
      },
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
              Secret.fromSecretCompleteArn(
                this,
                'EcsSecret',
                connectionSecret.ref
              )
            ),
            HASURA_GRAPHQL_ADMIN_SECRET: ECSecret.fromSecretsManager(
              Secret.fromSecretCompleteArn(
                this,
                'EcsAdminSecret',
                hasuraAdminSecret.ref
              )
            ),
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

    hasuraDatabase.connections.allowFrom(
      fargate.service,
      new Port({
        protocol: Protocol.TCP,
        stringRepresentation: 'Postgres Port',
        fromPort: 5432,
        toPort: 5432,
      })
    )
  }
}
