# Create layer with node_modules dependencies
resource "aws_lambda_layer_version" "this" {
  layer_name          = "TransactionsChallengeLayer"
  compatible_runtimes = ["nodejs22.x"]
  s3_bucket           = var.bucket_id
  s3_key              = aws_s3_object.layer.key
  source_code_hash = aws_s3_object.layer.source_hash
}
