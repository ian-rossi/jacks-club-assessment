resource "aws_iam_role" "create_transaction_execution_role" {
  name = "CreateTransactionExecutionRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Create execution role and policies for Lambdas
resource "aws_iam_role_policy" "create_transaction_execution_role_policy" {
  name = "CreateTransactionExecutionRolePolicy"
  role = aws_iam_role.create_transaction_execution_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem"
        ]
        Effect = "Allow"
        Resource = [
          "arn:aws:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/transactions_aggregate"
        ]
      },
      {
        Action = [
          "dynamodb:PutItem"
        ]
        Effect = "Allow"
        Resource = [
          "arn:aws:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/transactions"
        ]
      }
    ]
  })
}

# Create Lambda
resource "aws_lambda_function" "create_transaction_lambda" {
  function_name    = "CreateTransactionLambda"
  role             = aws_iam_role.create_transaction_execution_role.arn
  s3_bucket        = var.bucket_id
  s3_key           = aws_s3_object.code.id
  handler          = "handlers/create-transaction.handler"
  runtime          = "nodejs22.x"
  layers           = [aws_lambda_layer_version.this.arn]
  memory_size      = 128
  source_code_hash = aws_s3_object.code.source_hash
  environment {
    variables = {
      "NODE_OPTIONS" = "--experimental-modules"
    }
  }
}
