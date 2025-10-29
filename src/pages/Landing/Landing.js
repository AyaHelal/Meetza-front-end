import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Footer from '../../components/Footer/Footer';

const Landing = () => {
  const navigate = useNavigate();
  const { logoutUser } = useContext(AuthContext);

  const handleLogout = () => {
    logoutUser();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <div style={{ padding: 20 }}>
        <h2>Landing page</h2>
        <button onClick={handleLogout} className="btn btn-outline-danger mt-3">Logout</button>
      </div>

      <Footer/>
    </>
  );
};

export default Landing;
