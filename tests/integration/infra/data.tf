data "aws_caller_identity" "current" {}

data "aws_iam_policy_document" "allow_only_current_machine_ip" {
  statement {
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = ["*"]
    }

    actions   = ["execute-api:Invoke"]
    resources = ["${aws_api_gateway_rest_api.this.execution_arn}/*"]

    condition {
      test     = "IpAddress"
      variable = "aws:SourceIp"
      values   = ["${var.origin_ip_address}/32"]
    }
  }
}
