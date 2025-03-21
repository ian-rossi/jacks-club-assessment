# Send zipped dist/ folder to S3 object 
resource "aws_s3_object" "code" {
  bucket      = var.bucket_id
  key         = "dist.zip"
  source      = "../../../dist.zip"
  source_hash = filemd5("../../../dist.zip")
}

# Send zipped nodejs/node_modules/ folder to S3 object
resource "aws_s3_object" "layer" {
  bucket      = var.bucket_id
  key         = "node_modules.zip"
  source      = "../../../node_modules.zip"
  source_hash = filemd5("../../../node_modules.zip")
}

