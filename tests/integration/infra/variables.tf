variable "aws_region" {
  description = "AWS region"
  nullable    = false
  type        = string
  validation {
    error_message = <<EOT
    Invalid region name. Valid options:
        - US East (N. Virginia) - us-east-1
        - US East (Ohio) - us-east-2
        - US West (N. California) - us-west-1
        - US West (Oregon) - us-west-2
        - Africa (Cape Town) - af-south-1
        - Asia Pacific (Hong Kong) - ap-east-1
        - Asia Pacific (Hyderabad) - ap-south-2
        - Asia Pacific (Jakarta) - ap-southeast-3
        - Asia Pacific (Melbourne) - ap-southeast-4
        - Asia Pacific (Mumbai) - ap-south-1
        - Asia Pacific (Osaka) - ap-northeast-3
        - Asia Pacific (Seoul) - ap-northeast-2
        - Asia Pacific (Singapore) - ap-southeast-1
        - Asia Pacific (Sydney) - ap-southeast-2
        - Asia Pacific (Tokyo) - ap-northeast-1
        - Canada (Central) - ca-central-1
        - China (Beijing) - cn-north-1
        - China (Ningxia) - cn-northwest-1
        - Europe (Frankfurt) - eu-central-1
        - Europe (Ireland) - eu-west-1
        - Europe (London) - eu-west-2
        - Europe (Milan) - eu-south-1
        - Europe (Paris) - eu-west-3
        - Europe (Spain) - eu-south-2
        - Europe (Stockholm) - eu-north-1
        - Europe (Zurich) - eu-central-2
        - Middle East (Bahrain) - me-south-1
        - Middle East (UAE) - me-central-1
        - South America (São Paulo) - sa-east-1
    EOT
    condition = contains([
      "us-east-1", "us-east-2", "us-west-1", "us-west-2",
      "af-south-1", "ap-east-1", "ap-south-2", "ap-southeast-3",
      "ap-southeast-4", "ap-south-1", "ap-northeast-3", "ap-northeast-2",
      "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ca-central-1",
      "cn-north-1", "cn-northwest-1", "eu-central-1", "eu-west-1",
      "eu-west-2", "eu-south-1", "eu-west-3", "eu-south-2", "eu-north-1",
      "eu-central-2", "me-south-1", "me-central-1", "sa-east-1"
    ], lower(var.aws_region))
  }
}

variable "origin_ip_address" {
  description = "Current machine IP address to authorize API Gateway to only receive inbound requests from this IP"
  type        = string
  nullable    = false
}

variable "bucket_id" {
  description = "S3 bucket ID to store Lambda layers and code"
  type        = string
  nullable    = false
}
