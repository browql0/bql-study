import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContextSupabase';
import { LogIn, UserPlus, AlertCircle, Eye, EyeOff, Check, X, Loader, BookOpen, GraduationCap } from 'lucide-react';
// Import retiré car on n'affiche plus la liste
import './Login.css';

const Login = () => {
  const { login, register } = useApp();
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [validations, setValidations] = useState({
    minLength: false,
    hasNumber: false,
    hasLetter: false
  });
  const [nameStatus, setNameStatus] = useState(null); // null, 'checking', 'available', 'taken', 'invalid'

  useEffect(() => {
    if (isRegister && formData.password) {
      const minLength = formData.password.length >= 6;
      const hasNumber = /\d/.test(formData.password);
      const hasLetter = /[a-zA-Z]/.test(formData.password);
      
      setValidations({ minLength, hasNumber, hasLetter });
      
      let strength = 0;
      if (minLength) strength++;
      if (hasNumber) strength++;
      if (hasLetter) strength++;
      if (formData.password.length >= 10) strength++;
      
      setPasswordStrength(strength);
    }
  }, [formData.password, isRegister]);

  // Vérifier si le nom est valide et disponible
  useEffect(() => {
    const checkNameAvailability = async () => {
      if (formData.name && formData.name.trim()) {
        setNameStatus('checking');
        
        // Importer le service de validation
        const { isValidName, isNameAlreadyUsed, findExactName } = await import('../services/studentNameService');
        
        // Vérifier si le nom est valide (insensible à la casse et à l'ordre)
        const isValid = isValidName(formData.name);
        
        if (!isValid) {
          setNameStatus('invalid');
          return;
        }
        
        // Trouver le nom exact dans le JSON
        const exactName = findExactName(formData.name);
        
        if (!exactName) {
          setNameStatus('invalid');
          return;
        }
        
        // Vérifier si le nom exact est déjà utilisé
        const isUsed = await isNameAlreadyUsed(exactName);
        setNameStatus(isUsed ? 'taken' : 'available');
      } else {
        setNameStatus(null);
      }
    };

    if (isRegister && formData.name) {
      const timeoutId = setTimeout(checkNameAvailability, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [formData.name, isRegister]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!formData.name.trim()) {
          setError('Veuillez entrer votre nom');
          setLoading(false);
          return;
        }
        
        // Vérifier le statut du nom avant de soumettre
        if (nameStatus === 'taken') {
          setError('Ce nom est déjà utilisé par un autre compte');
          setLoading(false);
          return;
        }
        
        if (nameStatus === 'invalid') {
          setError('Ce nom n\'est pas dans la liste des étudiants autorisés');
          setLoading(false);
          return;
        }
        
        // Si le statut est encore en cours de vérification, attendre un peu
        if (nameStatus === 'checking') {
          setError('Vérification du nom en cours, veuillez patienter...');
          setLoading(false);
          return;
        }
        
        // Si le statut n'est pas 'available', forcer une nouvelle vérification
        if (nameStatus !== 'available') {
          // Re-vérifier le nom
          const { isValidName, isNameAlreadyUsed, findExactName } = await import('../services/studentNameService');
          const isValid = isValidName(formData.name);
          
          if (!isValid) {
            setError('Ce nom n\'est pas dans la liste des étudiants autorisés');
            setLoading(false);
            return;
          }
          
          const exactName = findExactName(formData.name);
          if (!exactName) {
            setError('Ce nom n\'est pas dans la liste des étudiants autorisés');
            setLoading(false);
            return;
          }
          
          const isUsed = await isNameAlreadyUsed(exactName);
          if (isUsed) {
            setError('Ce nom est déjà utilisé par un autre compte');
            setLoading(false);
            return;
          }
        }
        
        if (!validations.minLength || !validations.hasNumber || !validations.hasLetter) {
          setError('Le mot de passe ne respecte pas les critères requis');
          setLoading(false);
          return;
        }
        
        const result = await register(formData.email, formData.password, formData.name);
        if (!result.success) {
          setError(result.error);
          setLoading(false);
        } else {
          setSuccess(result.message || 'Inscription réussie! Vérifiez votre email.');
          setLoading(false);
          // Réinitialiser le formulaire
          setTimeout(() => {
            setIsRegister(false);
            setSuccess('');
          }, 3000);
        }
      } else {
        const result = await login(formData.email, formData.password);
        if (!result.success) {
          setError(result.error);
          setLoading(false);
        }
      }
    } catch {
      setError('Une erreur est survenue');
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError('');
    setFormData({ email: '', password: '', name: '' });
  };

  return (
    <div className="login-container">
      <div className="login-background-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-icon">
            <GraduationCap size={40} />
          </div>
          <h2 className="brand-name">Study Space</h2>
          <p className="brand-tagline">Votre espace d'études personnel</p>
        </div>

        <div className="login-header">
          <h1>{isRegister ? 'Rejoignez-nous' : 'Bon retour !'}</h1>
          <p>
            {isRegister 
              ? 'Créez votre espace d’études personnalisé' 
              : 'Continuez votre parcours d’apprentissage'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {isRegister && (
            <div className="form-group">
              <label>Nom complet </label>
              <div className="name-input-wrapper">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Entrez votre nom complet"
                  required
                  autoComplete="off"
                />
                {nameStatus === 'checking' && (
                  <div className="name-status checking">
                    <Loader size={16} className="spinner" />
                  </div>
                )}
                {nameStatus === 'available' && (
                  <div className="name-status available">
                    <Check size={16} />
                  </div>
                )}
                {nameStatus === 'taken' && (
                  <div className="name-status taken">
                    <X size={16} />
                  </div>
                )}
                {nameStatus === 'invalid' && (
                  <div className="name-status invalid">
                    <X size={16} />
                  </div>
                )}
              </div>
              {nameStatus === 'taken' && (
                <div className="name-error-message">
                  <AlertCircle size={14} />
                  <span>Ce nom est déjà utilisé par un autre compte</span>
                </div>
              )}
              {nameStatus === 'invalid' && formData.name.trim() && (
                <div className="name-error-message">
                  <AlertCircle size={14} />
                  <span>Ce nom n'est pas dans l'EMSI ou dans la premiere année preparatoire</span>
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Entrez votre email"
              required
            />
          </div>

          <div className="form-group">
            <label>Mot de passe</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Entrez votre mot de passe"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {isRegister && formData.password && (
              <>
                <div className="password-strength">
                  <div className="strength-bar">
                    <div 
                      className={`strength-fill strength-${passwordStrength}`}
                      style={{ width: `${(passwordStrength / 4) * 100}%` }}
                    />
                  </div>
                  <span className="strength-text">
                    {passwordStrength === 0 && 'Très faible'}
                    {passwordStrength === 1 && 'Faible'}
                    {passwordStrength === 2 && 'Moyen'}
                    {passwordStrength === 3 && 'Fort'}
                    {passwordStrength === 4 && 'Très fort'}
                  </span>
                </div>
                <div className="password-validations">
                  <div className={`validation-item ${validations.minLength ? 'valid' : ''}`}>
                    {validations.minLength ? <Check size={14} /> : <X size={14} />}
                    <span>Au moins 6 caractères</span>
                  </div>
                  <div className={`validation-item ${validations.hasNumber ? 'valid' : ''}`}>
                    {validations.hasNumber ? <Check size={14} /> : <X size={14} />}
                    <span>Contient un chiffre</span>
                  </div>
                  <div className={`validation-item ${validations.hasLetter ? 'valid' : ''}`}>
                    {validations.hasLetter ? <Check size={14} /> : <X size={14} />}
                    <span>Contient une lettre</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="success-message">
              <Check size={18} />
              <span>{success}</span>
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (
              <>
                <Loader size={20} className="spinner" />
                <span>{isRegister ? 'Inscription en cours...' : 'Connexion en cours...'}</span>
              </>
            ) : (
              <span>{isRegister ? 'S\'inscrire' : 'Se connecter'}</span>
            )}
          </button>
          
          {loading && (
            <div className="login-loading-overlay">
              <div className="login-loading-content">
                <div className="login-loading-spinner">
                  <div className="spinner-ring"></div>
                  <div className="spinner-ring"></div>
                  <div className="spinner-ring"></div>
                </div>
                <p className="login-loading-text">
                  {isRegister ? 'Création de votre compte...' : 'Connexion en cours...'}
                </p>
              </div>
            </div>
          )}
        </form>

        <div className="login-footer">
          <button onClick={toggleMode} className="toggle-mode-btn">
            {isRegister 
              ? 'Vous avez déjà un compte ? Connectez-vous' 
              : 'Pas encore de compte ? Inscrivez-vous'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
