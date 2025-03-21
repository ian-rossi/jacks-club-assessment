resource "aws_iam_role" "retrieve_balance_by_user_id_lambda_execution_role" {
  name               = "RetrieveBalanceByUserIdLambdaExecutionRole"
  assume_role_policy = local.lambda_assume_role_policy
}

# IAM Policy for Lambda
resource "aws_iam_role_policy" "retrieve_balance_by_user_id_lambda_execution_role_policy" {
  name = "RetrieveBalanceByUserIdLambdaExecutionRolePolicy"
  role = aws_iam_role.retrieve_balance_by_user_id_lambda_execution_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "dynamodb:GetItem",
          "dynamodb:UpdateItem"
        ]
        Effect   = "Allow"
        Resource = [local.transactions_aggregate_arn]
      },
      local.allow_logs_statement,
      local.allow_put_item_on_transactions_table_statement,
      local.allow_create_update_and_delete_schedules,
      local.allow_pass_unlock_transaction_aggregate_by_user_id_lambda_execution_role
    ]
  })
}
# Create Lambda
resource "aws_lambda_function" "retrieve_balance_by_user_id_lambda" {
  function_name    = "RetrieveBalanceByUserIdLambda"
  role             = aws_iam_role.retrieve_balance_by_user_id_lambda_execution_role.arn
  s3_bucket        = var.bucket_id
  s3_key           = aws_s3_object.code.id
  handler          = "handlers/retrieve-balance-by-user-id.handler"
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
