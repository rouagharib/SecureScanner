import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { useToast } from '../components/Toast';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const planKey = searchParams.get('plan_key');

  useEffect(() => {
    // Update local user data
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    user.subscription_plan = planKey;
    localStorage.setItem('user', JSON.stringify(user));
    addToast('Payment successful! Account upgraded.', 'success');
    setTimeout(() => navigate('/dashboard'), 2000);
  }, [planKey, navigate, addToast]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
        <CheckCircle size={48} style={{ margin: '0 auto 24px', color: '#059669' }} />
        <h2>Payment Successful! 🎉</h2>
        <p>Your account has been upgraded. Redirecting...</p>
      </div>
    </div>
  );
}