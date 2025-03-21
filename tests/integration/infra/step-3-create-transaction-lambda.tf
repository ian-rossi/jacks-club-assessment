resource "aws_iam_role" "create_transaction_lambda_execution_role" {
  name               = "CreateTransactionLambdaExecutionRole"
  assume_role_policy = local.lambda_assume_role_policy
}

# Create execution role and policies for Lambdas
resource "aws_iam_role_policy" "create_transaction_lambda_execution_role_policy" {
  name = "CreateTransactionLambdaExecutionRolePolicy"
  role = aws_iam_role.create_transaction_lambda_execution_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      local.allow_logs_statement,
      local.allow_update_item_on_transactions_aggregate_table_statement,
      local.allow_put_item_on_transactions_table_statement,
      local.allow_create_update_and_delete_schedules,
      local.allow_pass_unlock_transaction_aggregate_by_user_id_lambda_execution_role
    ]
  })
}

# Create Lambda
resource "aws_lambda_function" "create_transaction_lambda" {
  function_name    = "CreateTransactionLambda"
  role             = aws_iam_role.create_transaction_lambda_execution_role.arn
  s3_bucket        = var.bucket_id
  s3_key           = aws_s3_object.code.id
  handler          = "handlers/create-transaction.handler"
  runtime          = "nodejs22.x"
  layers           = [aws_lambda_layer_version.this.arn]
  memory_size      = 128
  source_code_hash = aws_s3_object.code.source_hash
  environment {
    variables = {
      "TEST_SCHEDULER" = "false"
    }
  }
}
