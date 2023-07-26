import * as cdk from "aws-cdk-lib";
import { type EnvironmentVars } from "./types/config";
import { type Construct } from "constructs";
import { S3Bucket } from "./constructs/s3-bucket";
import { LambdaFunctions } from "./constructs/lambda-functions";
import { CloudfrontDistribution } from "./constructs/cloudfront-distribution";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import * as Route53 from "aws-cdk-lib/aws-route53";

export class NextJsServerlessApp extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: cdk.StackProps & { environmentVars: EnvironmentVars }
  ) {
    super(scope, id, props);

    const environmentVars = props.environmentVars;

    // TODO: Route53 domain setup

    // Create Bucket for assets
    const myBucket = new S3Bucket(
      this,
      `bucket-${environmentVars.environment}`,
      { environmentVars }
    );

    // Create Functions
    const myFunctions = new LambdaFunctions(
      this,
      `functions-${environmentVars.environment}`,
      {
        environmentVars,
        myBucket: myBucket.bucket,
      }
    );

    // Create Distribution
    const myDistribution = new CloudfrontDistribution(
      this,
      `distribution-${environmentVars.environment}`,
      {
        environmentVars,
        myBucket: myBucket.bucket,
        myServerFunction: myFunctions.myServerFunction,
        myMiddlewareFunction: myFunctions.myMiddlewareFunction,
        myImageFunction: myFunctions.myImageFunction,
      }
    );

    // Create the Route53 record
    const myRoute53 = Route53.HostedZone.fromLookup(this, "MyHostedZone", {
      domainName: environmentVars.cloudfront.domain,
    });

    // TODO: create multiple records, accepting more than one subdomain for the same domain.
    new Route53.ARecord(this, "MyRecord", {
      zone: myRoute53,
      recordName: environmentVars.cloudfront.aliases[0],
      target: Route53.RecordTarget.fromAlias(
        new CloudFrontTarget(myDistribution.distribution)
      ),
    });
  }
}
