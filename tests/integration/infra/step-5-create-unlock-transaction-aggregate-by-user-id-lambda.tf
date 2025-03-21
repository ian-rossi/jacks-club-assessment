resource "aws_iam_role" "unlock_transaction_aggregate_by_user_id_lambda_execution_role" {
  name = "UnlockTransactionAggregateByUserIdLambdaExecutionRole"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      },
      {
        Effect = "Allow"
        Principal = {
          Service = "scheduler.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# IAM Policy for Lambda
resource "aws_iam_role_policy" "unlock_transaction_aggregate_by_user_id_lambda_execution_role_policy" {
  name = "UnlockTransactionAggregateByUserIdLambdaExecutionRolePolicy"
  role = aws_iam_role.unlock_transaction_aggregate_by_user_id_lambda_execution_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "lambda:InvokeFunction"
        ]
        Effect = "Allow"
        Resource = [
          "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:UnlockTransactionAggregateByUserIdLambda:*",
          "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:UnlockTransactionAggregateByUserIdLambda"
        ]
      },
      local.allow_logs_statement,
      local.allow_update_item_on_transactions_aggregate_table_statement,
      local.allow_create_update_and_delete_schedules,
      local.allow_pass_unlock_transaction_aggregate_by_user_id_lambda_execution_role
    ]
  })
}
# Create Lambda
resource "aws_lambda_function" "unlock_transaction_aggregate_by_user_id_lambda" {
  function_name    = "UnlockTransactionAggregateByUserIdLambda"
  role             = aws_iam_role.unlock_transaction_aggregate_by_user_id_lambda_execution_role.arn
  s3_bucket        = var.bucket_id
  s3_key           = aws_s3_object.code.id
  handler          = "handlers/unlock-transaction-aggregate-by-user-id.handler"
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

# Allow EventBridge Scheduler to invoke this function
resource "aws_lambda_permission" "allow_scheduler_to_invoke_unlock_transaction_aggregate_by_user_id_lambda" {
  statement_id  = "AllowSchedulerToInvokeUnlockTransactionAggregateByUserIdLambda"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.unlock_transaction_aggregate_by_user_id_lambda.function_name
  principal     = "scheduler.amazonaws.com"
  source_arn    = "arn:aws:scheduler:${var.aws_region}:${data.aws_caller_identity.current.account_id}:schedule/*/unlock-aggregate-user-id-*"
}
