/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Construct } from "constructs";
import { type EnvironmentVars } from "../types/config";
import { type Bucket } from "aws-cdk-lib/aws-s3";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Fn, Duration as CdkDuration } from "aws-cdk-lib";
import { HttpOrigin, OriginGroup, S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import {
  Distribution,
  type BehaviorOptions,
  OriginAccessIdentity,
  LambdaEdgeEventType,
  CachedMethods,
  AllowedMethods,
  ViewerProtocolPolicy,
  type IOriginAccessIdentity,
  CachePolicy,
  CacheQueryStringBehavior,
  CacheCookieBehavior,
  CacheHeaderBehavior,
  HttpVersion,
  PriceClass,
  SecurityPolicyProtocol,
  SSLMethod,
  IDistribution,
} from "aws-cdk-lib/aws-cloudfront";

export class CloudfrontDistribution extends Construct {
  public readonly distribution: IDistribution;

  constructor(
    scope: Construct,
    id: string,
    props: { environmentVars: EnvironmentVars } & { myBucket: Bucket } & { myServerFunction: lambda.Function } & {
      myMiddlewareFunction: lambda.Function;
    } & { myImageFunction: lambda.Function }
  ) {
    super(scope, id);
    const environmentVars = props.environmentVars;
    const myBucket = props.myBucket;
    const myServerFunction = props.myServerFunction;
    const myMiddlewareFunction = props.myMiddlewareFunction;
    const myImageFunction = props.myImageFunction;

    // Create a certificate
    const sslCertArn = environmentVars.cloudfront.sslCertArn || "";
    const certificate = acm.Certificate.fromCertificateArn(this, "Certificate", sslCertArn);

    // Create an Origin access control instead of "Allows Cloudfront to reach the bucket" use "CloudFront Origin Access IDentity created to allow serving private S3 content"
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const oai: IOriginAccessIdentity = new OriginAccessIdentity(
      this,
      `${environmentVars.applicationName}-${environmentVars.environment}-OriginID`
    );

    // Grant read access to the bucket objects to the OAI
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    myBucket.grantRead(oai);

    // Change the line below to Origin Access Control
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const origin2 = new S3Origin(myBucket, {
      originId: `${environmentVars.applicationName}-${environmentVars.environment}-OriginID`,
      originAccessIdentity: oai,
    });

    // Create server behavior
    const serverFnUrl = myServerFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    const serverBehavior = {
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      origin: new HttpOrigin(Fn.parseDomainName(serverFnUrl.url)),
      allowedMethods: AllowedMethods.ALLOW_ALL,
      cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
      compress: true,
      cachePolicy: this.createCloudFrontServerCachePolicy(),
      edgeLambdas: [
        {
          eventType: LambdaEdgeEventType.VIEWER_REQUEST,
          functionVersion: myMiddlewareFunction.currentVersion,
        },
      ],
    };

    // Create image optimization behavior
    const imageFnUrl = myImageFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });
    const imageBehavior = {
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      origin: new HttpOrigin(Fn.parseDomainName(imageFnUrl.url)),
      allowedMethods: AllowedMethods.ALLOW_ALL,
      cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
      compress: true,
      cachePolicy: serverBehavior.cachePolicy,
    };

    // Create statics behavior
    const staticFileBehaviour: BehaviorOptions = {
      origin: origin2,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
      compress: true,
      cachePolicy: CachePolicy.CACHING_OPTIMIZED,
    };

    // Create default behavior
    // default handler for requests that don't match any other path:
    //   - try lambda handler first first
    //   - if failed, fall back to S3
    const fallbackOriginGroup = new OriginGroup({
      primaryOrigin: serverBehavior.origin,
      fallbackOrigin: origin2,
      fallbackStatusCodes: [404],
    });
    const defaultBehavior = {
      origin: fallbackOriginGroup,

      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      compress: true,
      cachePolicy: serverBehavior.cachePolicy,
      edgeLambdas: serverBehavior.edgeLambdas,
    };

    this.distribution = new Distribution(this, "MyDistribution", {
      defaultRootObject: "",
      domainNames: environmentVars.cloudfront.aliases, // specify at least one domain name here
      certificate,
      comment: `${environmentVars.applicationName}-${environmentVars.environment} - Distribution`,
      enableIpv6: false,
      enabled: true,
      httpVersion: HttpVersion.HTTP2,
      priceClass: PriceClass.PRICE_CLASS_100,
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
      sslSupportMethod: SSLMethod.SNI,
      defaultBehavior: defaultBehavior,
      additionalBehaviors: {
        "_next/static/*": staticFileBehaviour,
        "_next/image*": imageBehavior,
        "_next/data/*": serverBehavior,
        "api/*": serverBehavior,
      },
    });
  }

  protected createCloudFrontServerCachePolicy(): CachePolicy {
    return new CachePolicy(this, "ServerCache", {
      queryStringBehavior: CacheQueryStringBehavior.all(),
      headerBehavior: CacheHeaderBehavior.allowList(
        // required by image optimization request
        "Accept",
        // required by server request
        "x-op-middleware-request-headers",
        "x-op-middleware-response-headers",
        "x-nextjs-data",
        "x-middleware-prefetch",
        // required by server request (in-place routing)
        "rsc",
        "next-router-prefetch",
        "next-router-state-tree"
      ),
      cookieBehavior: CacheCookieBehavior.all(),
      defaultTtl: CdkDuration.days(0),
      maxTtl: CdkDuration.days(365),
      minTtl: CdkDuration.days(0),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
      comment: "Server response cache policy",
    });
  }
}
