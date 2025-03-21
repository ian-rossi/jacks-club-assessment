resource "aws_api_gateway_rest_api" "this" {
  name = "TransactionsChallengeAPI"
}

resource "aws_api_gateway_rest_api_policy" "test" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  policy      = data.aws_iam_policy_document.allow_only_current_machine_ip.json
}

resource "aws_api_gateway_resource" "balance" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_rest_api.this.root_resource_id
  path_part   = "balance"
}

resource "aws_api_gateway_method" "get_balance" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_resource.balance.id
  http_method   = "GET"
  authorization = "NONE"
  request_parameters = {
    "method.request.querystring.userId" = true
  }
}

resource "aws_api_gateway_integration" "get_balance_integration" {
  rest_api_id             = aws_api_gateway_rest_api.this.id
  resource_id             = aws_api_gateway_resource.balance.id
  http_method             = aws_api_gateway_method.get_balance.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.retrieve_balance_by_user_id_lambda.invoke_arn
}

resource "aws_api_gateway_resource" "transactions" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_rest_api.this.root_resource_id
  path_part   = "transactions"
}

resource "aws_api_gateway_method" "post_transactions" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_resource.transactions.id
  http_method   = "POST"
  authorization = "NONE"
  request_parameters = {
    "method.request.header.Idempotent-Key" = true
  }
}

resource "aws_api_gateway_integration" "post_transactions_integration" {
  rest_api_id             = aws_api_gateway_rest_api.this.id
  resource_id             = aws_api_gateway_resource.transactions.id
  http_method             = aws_api_gateway_method.post_transactions.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.create_transaction_lambda.invoke_arn
}

resource "aws_lambda_permission" "allow_api_gateway_get_balance" {
  statement_id  = "AllowAPIGatewayInvokeGetBalance"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.retrieve_balance_by_user_id_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.this.execution_arn}/${aws_api_gateway_stage.this.stage_name}/GET/balance"
}

resource "aws_lambda_permission" "allow_api_gateway_post_transactions" {
  statement_id  = "AllowAPIGatewayInvokePostTransactions"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_transaction_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.this.execution_arn}/${aws_api_gateway_stage.this.stage_name}/POST/transactions"
}

resource "aws_api_gateway_deployment" "this" {
  depends_on  = [aws_api_gateway_integration.post_transactions_integration, aws_api_gateway_integration.get_balance_integration]
  rest_api_id = aws_api_gateway_rest_api.this.id
  triggers = {
    "redeployment" = sha1(jsonencode(aws_api_gateway_rest_api.this.body))
  }
}

resource "aws_api_gateway_stage" "this" {
  deployment_id = aws_api_gateway_deployment.this.id
  rest_api_id   = aws_api_gateway_rest_api.this.id
  stage_name    = "hml"
}
