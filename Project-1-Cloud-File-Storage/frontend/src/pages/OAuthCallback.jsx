import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function OAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const token = params.get('token');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    login(token).then(() => navigate('/', { replace: true }));
  }, [params, login, navigate]);

  return <div className="centered">Signing you in...</div>;
}
