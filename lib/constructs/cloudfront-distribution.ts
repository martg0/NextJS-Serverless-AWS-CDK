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
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import {
  HttpOrigin,
  OriginGroup,
  S3Origin,
} from "aws-cdk-lib/aws-cloudfront-origins";
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
    props: { environmentVars: EnvironmentVars } & { myBucket: Bucket }
  ) {
    super(scope, id);
    const environmentVars = props.environmentVars;
    const myBucket = props.myBucket;
    //const myServerFunction = props.myServerFunction;
    //const myMiddlewareFunction = props.myMiddlewareFunction;
    //const myImageFunction = props.myImageFunction;

    // Create a certificate
    const sslCertArn = environmentVars.cloudfront.sslCertArn || "";
    const certificate = acm.Certificate.fromCertificateArn(
      this,
      "Certificate",
      sslCertArn
    );

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

    const serverBehavior = {
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      origin: myBucket,
      allowedMethods: AllowedMethods.ALLOW_ALL,
      cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
      compress: true,
      cachePolicy: this.createCloudFrontServerCachePolicy(),
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
    const defaultBehavior = {
      origin: origin2,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      compress: true,
      cachePolicy: serverBehavior.cachePolicy,
    };

    const errorNotFoundResponse: cloudfront.ErrorResponse = {
      httpStatus: 404,
      // the properties below are optional
      responseHttpStatus: 404,
      responsePagePath: "/404.html",
      ttl: CdkDuration.minutes(30),
    };

    const errorServerResponse: cloudfront.ErrorResponse = {
      httpStatus: 500,
      // the properties below are optional
      responseHttpStatus: 500,
      responsePagePath: "/500.html",
      ttl: CdkDuration.minutes(30),
    };

    const errorNotAuthorizedResponse: cloudfront.ErrorResponse = {
      httpStatus: 403,
      // the properties below are optional
      responseHttpStatus: 403,
      responsePagePath: "/403.html",
      ttl: CdkDuration.minutes(30),
    };

    this.distribution = new Distribution(this, "MyDistribution", {
      defaultRootObject: "index.html",
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
      errorResponses: [
        errorNotAuthorizedResponse,
        errorNotFoundResponse,
        errorServerResponse,
      ],
      //additionalBehaviors: {},
    });
  }

  protected createCloudFrontServerCachePolicy(): CachePolicy {
    return new CachePolicy(this, "ServerCache", {
      queryStringBehavior: CacheQueryStringBehavior.all(),
      headerBehavior: CacheHeaderBehavior.allowList(
        // required by image optimization request
        "Accept"
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
