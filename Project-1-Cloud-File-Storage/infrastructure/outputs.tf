output "bucket_name" {
  value       = aws_s3_bucket.file_storage.bucket
  description = "Name to put in S3_BUCKET_NAME"
}

output "bucket_arn" {
  value = aws_s3_bucket.file_storage.arn
}

output "backend_instance_profile" {
  value       = aws_iam_instance_profile.backend_profile.name
  description = "Attach this instance profile to the EC2 instance running the backend"
}
