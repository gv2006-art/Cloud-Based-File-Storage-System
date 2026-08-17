variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-south-1"
}

variable "bucket_name" {
  description = "Globally-unique name for the S3 bucket that stores user files"
  type        = string
}

variable "environment" {
  description = "Deployment environment label"
  type        = string
  default     = "dev"
}

variable "allowed_cors_origin" {
  description = "Origin allowed to call the S3 bucket directly (the frontend URL)"
  type        = string
  default     = "http://localhost:5173"
}
