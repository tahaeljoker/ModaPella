import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// صفحة اتصل بنا اتدمجت مع صفحة تواصل معنا
function ContactPage() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/about', { replace: true }); }, []);
  return null;
}

export default ContactPage;
