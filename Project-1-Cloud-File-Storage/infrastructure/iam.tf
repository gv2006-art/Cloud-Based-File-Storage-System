# Least-privilege policy granting the backend only the S3 actions it needs,
# scoped to just this bucket.
data "aws_iam_policy_document" "backend_s3_access" {
  statement {
    sid    = "ObjectLevelAccess"
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:GetObjectVersion",
      "s3:DeleteObject",
      "s3:DeleteObjectVersion",
      "s3:ListBucketVersions",
    ]
    resources = ["${aws_s3_bucket.file_storage.arn}/*"]
  }

  statement {
    sid    = "BucketLevelAccess"
    effect = "Allow"
    actions = [
      "s3:ListBucket",
      "s3:GetBucketVersioning",
    ]
    resources = [aws_s3_bucket.file_storage.arn]
  }
}

resource "aws_iam_policy" "backend_s3_access" {
  name        = "cloud-file-storage-backend-s3-access-${var.environment}"
  description = "Least-privilege S3 access for the Cloud File Storage backend"
  policy      = data.aws_iam_policy_document.backend_s3_access.json
}

# Role the EC2 instance (or ECS task) running the backend assumes, so no
# long-lived AWS access keys need to be stored in .env in production.
resource "aws_iam_role" "backend_role" {
  name = "cloud-file-storage-backend-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "backend_s3_attach" {
  role       = aws_iam_role.backend_role.name
  policy_arn = aws_iam_policy.backend_s3_access.arn
}

resource "aws_iam_instance_profile" "backend_profile" {
  name = "cloud-file-storage-backend-profile-${var.environment}"
  role = aws_iam_role.backend_role.name
}
