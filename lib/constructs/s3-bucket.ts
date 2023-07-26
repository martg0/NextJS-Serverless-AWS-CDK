// create a new construct for aws cdk

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as path from "path";
import { type EnvironmentVars } from "../types/config";

export class S3Bucket extends Construct {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: s3.BucketProps & { environmentVars: EnvironmentVars }) {
    super(scope, id);
    const environmentVars = props.environmentVars;

    // Retrieve access-logs Existing Bucket to add the config
    /*const myExistingLogsBucket = s3.Bucket.fromBucketArn(
      this,
      "myExistingLogsBucket",
      environmentVars.assets.logsBucketArn
    );
*/
    this.bucket = new s3.Bucket(this, "bucket", {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: s3.BucketEncryption.S3_MANAGED,
      autoDeleteObjects: environmentVars.assets.autoDeleteObjects,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      bucketName: environmentVars.assets.bucketName,
      accessControl: s3.BucketAccessControl.PUBLIC_READ,
      //serverAccessLogsBucket: myExistingLogsBucket,
    });

    new s3deploy.BucketDeployment(this, "deploy-assets-on-bucket", {
      sources: [s3deploy.Source.asset(path.join(__dirname, environmentVars.assets.filesPath))],
      destinationBucket: this.bucket,
      destinationKeyPrefix: "",
      prune: true,
      retainOnDelete: false,
    });
  }
}
