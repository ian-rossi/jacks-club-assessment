locals {
  lambda_assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
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
  allow_logs_statement = {
    Action = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    Effect   = "Allow"
    Resource = "arn:aws:logs:*:*:*"
  }
  transactions_arn = "arn:aws:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/transactions"
  allow_put_item_on_transactions_table_statement = {
    Action = [
      "dynamodb:PutItem"
    ]
    Effect   = "Allow"
    Resource = [local.transactions_arn]
  }
  transactions_aggregate_arn = format("%s_aggregate", local.transactions_arn)
  allow_update_item_on_transactions_aggregate_table_statement = {
    Action = [
      "dynamodb:UpdateItem"
    ]
    Effect   = "Allow"
    Resource = [local.transactions_aggregate_arn]
  }
  allow_create_update_and_delete_schedules = {
    Action = [
      "scheduler:CreateSchedule",
      "scheduler:UpdateSchedule",
      "scheduler:DeleteSchedule"
    ]
    Effect = "Allow"
    Resource = [
      "arn:aws:scheduler:${var.aws_region}:${data.aws_caller_identity.current.account_id}:schedule/*/unlock-aggregate-user-id-*"
    ]
  }
  allow_pass_unlock_transaction_aggregate_by_user_id_lambda_execution_role = {
    Action = [
      "iam:PassRole"
    ],
    Effect = "Allow"
    Resource = [
      "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/UnlockTransactionAggregateByUserIdLambdaExecutionRole"
    ]
  }
}
