import { googleLoginUrl } from '../api/client';

export default function Login() {
  return (
    <div className="login-page">
      <h1>🗂️ NimbusDrive</h1>
      <p>
        Secure cloud file storage with versioning and sharing, built for the CodeTech Cloud
        Computing internship. Sign in with your Google account to continue.
      </p>
      <a className="google-btn" href={googleLoginUrl}>
        <span>G</span> Sign in with Google
      </a>
    </div>
  );
}
