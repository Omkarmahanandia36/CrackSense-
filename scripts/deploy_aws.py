"""CrackSense AI - Automated AWS App Runner Deployment Utility.

Automates AWS App Runner provisioning for CrackSense AI backend:
- Configures Amazon ECR repository: 'cracksense-api'
- Creates IAM App Runner service role: 'AppRunnerECRAccessRole'
- Creates/Updates AWS App Runner Service with Cloudinary secrets & port 7860
- Retrieves live public HTTPS URL (e.g. https://xxxx.us-east-1.awsapprunner.com)

Usage:
    python scripts/deploy_aws.py --key YOUR_AWS_KEY --secret YOUR_AWS_SECRET --region us-east-1
    Or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.
"""

import os
import sys
import time
import json
import argparse
from typing import Optional

try:
    import boto3
    from botocore.exceptions import ClientError
except ImportError:
    print("[-] boto3 not found. Installing boto3...", flush=True)
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "boto3"])
    import boto3
    from botocore.exceptions import ClientError

# Default Cloudinary Environment Variable Names
DEFAULT_CLOUDINARY = {
    "CLOUDINARY_CLOUD_NAME": os.getenv("CLOUDINARY_CLOUD_NAME", ""),
    "CLOUDINARY_API_KEY": os.getenv("CLOUDINARY_API_KEY", ""),
    "CLOUDINARY_API_SECRET": os.getenv("CLOUDINARY_API_SECRET", ""),
    "APP_ENV": "production",
}


def get_aws_clients(key: Optional[str] = None, secret: Optional[str] = None, region: str = "us-east-1"):
    """Initialize AWS clients using explicit credentials or environment."""
    session = boto3.Session(
        aws_access_key_id=key or os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=secret or os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=region or os.getenv("AWS_DEFAULT_REGION", "us-east-1"),
    )
    # Test credentials with STS
    sts = session.client("sts")
    caller_id = sts.get_caller_identity()
    print(f"[+] Authenticated as AWS Account: {caller_id['Account']} (Arn: {caller_id['Arn']})", flush=True)

    ecr = session.client("ecr")
    iam = session.client("iam")
    apprunner = session.client("apprunner")
    return session, ecr, iam, apprunner, caller_id["Account"]


def ensure_ecr_repository(ecr, repo_name: str = "cracksense-api") -> str:
    """Ensure ECR repository exists and return its URI."""
    print(f"[*] Checking Amazon ECR repository '{repo_name}'...", flush=True)
    try:
        resp = ecr.describe_repositories(repositoryNames=[repo_name])
        uri = resp["repositories"][0]["repositoryUri"]
        print(f"  [+] Found existing ECR repo: {uri}", flush=True)
        return uri
    except ecr.exceptions.RepositoryNotFoundException:
        print(f"  [*] Creating new ECR repository '{repo_name}'...", flush=True)
        resp = ecr.create_repository(
            repositoryName=repo_name,
            imageScanningConfiguration={"scanOnPush": True},
        )
        uri = resp["repository"]["repositoryUri"]
        print(f"  [+] Created ECR repo: {uri}", flush=True)
        return uri


def ensure_apprunner_iam_role(iam) -> str:
    """Ensure AppRunnerECRAccessRole exists with ECR pull permissions."""
    role_name = "AppRunnerECRAccessRole"
    print(f"[*] Checking IAM Role '{role_name}'...", flush=True)

    assume_role_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"Service": "build.apprunner.amazonaws.com"},
                "Action": "sts:AssumeRole",
            }
        ],
    }

    try:
        resp = iam.get_role(RoleName=role_name)
        role_arn = resp["Role"]["Arn"]
        print(f"  [+] Found existing IAM role: {role_arn}", flush=True)
        return role_arn
    except iam.exceptions.NoSuchEntityException:
        print(f"  [*] Creating IAM role '{role_name}'...", flush=True)
        resp = iam.create_role(
            RoleName=role_name,
            AssumeRolePolicyDocument=json.dumps(assume_role_policy),
            Description="Role allowing AWS App Runner to pull images from Amazon ECR",
        )
        role_arn = resp["Role"]["Arn"]

        # Attach managed policy for ECR read access
        iam.attach_role_policy(
            RoleName=role_name,
            PolicyArn="arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess",
        )
        print(f"  [+] Created and attached policies to {role_arn}", flush=True)
        # Give AWS IAM a couple seconds to propagate
        time.sleep(5)
        return role_arn


def create_or_update_apprunner_service(
    apprunner,
    service_name: str,
    image_uri: str,
    role_arn: str,
    env_vars: dict,
    port: str = "7860"
) -> str:
    """Create or update AWS App Runner service."""
    print(f"[*] Checking AWS App Runner service '{service_name}'...", flush=True)

    # Check if service already exists
    existing_arn = None
    existing_url = None
    try:
        paginator = apprunner.get_paginator("list_services")
        for page in paginator.paginate():
            for svc in page.get("ServiceSummaryList", []):
                if svc["ServiceName"] == service_name:
                    existing_arn = svc["ServiceArn"]
                    existing_url = svc.get("ServiceUrl")
                    break
    except Exception as e:
        print(f"  [-] Error listing App Runner services: {e}", flush=True)

    source_config = {
        "AuthenticationConfiguration": {
            "AccessRoleArn": role_arn
        },
        "AutoDeploymentsEnabled": True,
        "ImageRepository": {
            "ImageIdentifier": image_uri,
            "ImageRepositoryType": "ECR",
            "ImageConfiguration": {
                "Port": port,
                "RuntimeEnvironmentVariables": env_vars,
            },
        },
    }

    instance_config = {
        "Cpu": "1 vCPU",
        "Memory": "2 GB",
    }

    if existing_arn:
        print(f"  [*] Updating existing App Runner service: {existing_arn}...", flush=True)
        resp = apprunner.update_service(
            ServiceArn=existing_arn,
            SourceConfiguration=source_config,
            InstanceConfiguration=instance_config,
        )
        url = resp["Service"].get("ServiceUrl") or existing_url
        service_arn = existing_arn
    else:
        print(f"  [*] Creating new App Runner service '{service_name}'...", flush=True)
        resp = apprunner.create_service(
            ServiceName=service_name,
            SourceConfiguration=source_config,
            InstanceConfiguration=instance_config,
        )
        service_arn = resp["Service"]["ServiceArn"]
        url = resp["Service"].get("ServiceUrl")

    full_url = f"https://{url}" if url and not url.startswith("http") else url
    print(f"\n[+] AWS App Runner Service configured successfully!")
    print(f"    Service ARN: {service_arn}")
    print(f"    Public HTTPS URL: {full_url}")
    return full_url


def main():
    parser = argparse.ArgumentParser(description="Deploy CrackSense AI to AWS App Runner")
    parser.add_argument("--key", help="AWS Access Key ID", default=os.getenv("AWS_ACCESS_KEY_ID"))
    parser.add_argument("--secret", help="AWS Secret Access Key", default=os.getenv("AWS_SECRET_ACCESS_KEY"))
    parser.add_argument("--region", help="AWS Region (default: us-east-1)", default=os.getenv("AWS_DEFAULT_REGION", "us-east-1"))
    parser.add_argument("--service-name", help="App Runner service name", default="cracksense-api")
    args = parser.parse_args()

    print("=" * 64)
    print("      CrackSense AI - AWS App Runner Automated Deployer")
    print("=" * 64)

    # Prompt if credentials are not in environment or flags
    aws_key = args.key
    aws_secret = args.secret
    aws_region = args.region

    if not aws_key or not aws_secret:
        print("\n[!] AWS credentials not detected in environment.")
        aws_key = input("Enter your AWS Access Key ID: ").strip()
        aws_secret = input("Enter your AWS Secret Access Key: ").strip()
        reg_input = input("Enter AWS Region [us-east-1]: ").strip()
        if reg_input:
            aws_region = reg_input

    if not aws_key or not aws_secret:
        print("[-] AWS Access Key and Secret Key are required. Exiting.")
        sys.exit(1)

    try:
        session, ecr, iam, apprunner, account_id = get_aws_clients(aws_key, aws_secret, aws_region)
        repo_uri = ensure_ecr_repository(ecr, "cracksense-api")
        role_arn = ensure_apprunner_iam_role(iam)

        print("\n" + "=" * 64)
        print("  AWS INFRASTRUCTURE INITIALIZED SUCCESSFULLY!")
        print("=" * 64)
        print(f"  Amazon ECR URI: {repo_uri}")
        print(f"  IAM Access Role: {role_arn}")
        print(f"  Region: {aws_region}")
        print("=" * 64)

    except Exception as e:
        print(f"\n[-] AWS Setup Error: {e}", flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
