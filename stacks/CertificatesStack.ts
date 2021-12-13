import * as sst from '@serverless-stack/resources'
import { DnsValidatedCertificate } from '@aws-cdk/aws-certificatemanager'
import { PublicHostedZone } from '@aws-cdk/aws-route53'

type Props = sst.StackProps & {
  hostedZoneId: string
  hostedZoneName: string
  hasuraHostname: string
  //actionsHostname: string
}

export type Certificates = {
  hasura: DnsValidatedCertificate
  //action: DnsValidatedCertificate
}

export default class CertificatesStack extends sst.Stack {
  readonly certificates: Certificates

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

    const hasura = new DnsValidatedCertificate(this, 'HasuraCertificate', {
      hostedZone,
      domainName: props.hasuraHostname,
    })

    /*
       const actions = new DnsValidatedCertificate(this, 'HasuraCertificate', {
         hostedZone,
         domainName: props.actionsHostname
       })
     */

    this.certificates = {
      hasura,
      //actions
    }
  }
}
