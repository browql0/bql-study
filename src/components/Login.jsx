import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContextSupabase';
import { AlertCircle, Eye, EyeOff, Check, X, Loader, GraduationCap } from 'lucide-react';
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
    hasLetter: false,
    hasUpper: false,
    hasLower: false
  });

  const [nameStatus, setNameStatus] = useState(null);
  // null | checking | available | taken | invalid


  // --------------------------------------------------------
  // VALIDATION MOT DE PASSE
  // --------------------------------------------------------
  useEffect(() => {
    if (!isRegister) return;

    const pwd = formData.password;

    const minLength = pwd.length >= 6;
    const hasNumber = /\d/.test(pwd);
    const hasLetter = /[a-zA-Z]/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);

    setValidations({
      minLength,
      hasNumber,
      hasLetter,
      hasUpper,
      hasLower
    });

    let strength = 0;
    if (minLength) strength++;
    if (hasNumber) strength++;
    if (hasLetter) strength++;
    if (hasUpper && hasLower) strength++;

    setPasswordStrength(strength);
  }, [formData.password, isRegister]);


  // --------------------------------------------------------
  // VALIDATION NOM (EMSI)
  // --------------------------------------------------------
  useEffect(() => {
    const checkNameAvailability = async () => {
      if (formData.name && formData.name.trim()) {
        setNameStatus('checking');

        const { isValidName, isNameAlreadyUsed, findExactName } = await import('../services/studentNameService');

        const isValid = isValidName(formData.name);
        if (!isValid) {
          setNameStatus('invalid');
          return;
        }

        const exactName = findExactName(formData.name);
        if (!exactName) {
          setNameStatus('invalid');
          return;
        }

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


  // --------------------------------------------------------
  // SUBMIT
  // --------------------------------------------------------
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

        if (nameStatus === 'taken') {
          setError('Ce nom est déjà utilisé par un autre compte');
          setLoading(false);
          return;
        }

        if (nameStatus === 'invalid') {
          setError("Ce nom n'est pas dans la liste des étudiants autorisés");
          setLoading(false);
          return;
        }

        if (nameStatus === 'checking') {
          setError('Vérification du nom en cours...');
          setLoading(false);
          return;
        }

        if (
          !validations.minLength ||
          !validations.hasNumber ||
          !validations.hasUpper ||
          !validations.hasLower
        ) {
          setError('Le mot de passe ne respecte pas les critères requis.');
          setLoading(false);
          return;
        }

        const result = await register(formData.email, formData.password, formData.name);

        if (!result.success) {
          setError(result.error);
          setLoading(false);
        } else {
          setSuccess(result.message || 'Inscription réussie ! Vérifiez votre email.');
          setLoading(false);

          setTimeout(() => {
            setIsRegister(false);
            setSuccess('');
          }, 3000);
        }
      } else {
        const result = await login(formData.email, formData.password);
        if (!result.success) {
          setError(result.error);
        }
        setLoading(false);
      }
    } catch {
      setError('Une erreur est survenue.');
      setLoading(false);
    }
  };


  // --------------------------------------------------------
  // HANDLERS
  // --------------------------------------------------------
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


  // --------------------------------------------------------
  // RENDER JSX
  // --------------------------------------------------------
  return (
    <div className="login-container">
      <div className="login-background-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
        <div className="shape shape-4"></div>
        <div className="shape shape-5"></div>
        <div className="shape shape-6"></div>
      </div>

      <div className="login-card" key={isRegister ? 'register-card' : 'login-card'}>

        <div className="login-brand">
          <div className="brand-icon">
            <GraduationCap size={40} />
          </div>
          <h2 className="brand-name">Study Space</h2>
          <p className="brand-tagline">Votre espace d'études personnel</p>
        </div>

        <div className="login-animated-content" key={isRegister ? 'register' : 'login'}>
          <div className="login-header">
            <h1>{isRegister ? 'Rejoignez-nous' : 'Bon retour !'}</h1>
            <p>{isRegister ? 'Créez votre espace d’études personnalisé' : 'Continuez votre progression'}</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">

            {/* ------------------------------------------------------ */}
            {/* NOM À L'INSCRIPTION */}
            {/* ------------------------------------------------------ */}
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
                    <div className="name-status checking"><div className="spinner" /></div>
                  )}

                  {nameStatus === 'available' && (
                    <div className="name-status available"><Check size={16} /></div>
                  )}

                  {nameStatus === 'taken' && (
                    <div className="name-status taken"><X size={16} /></div>
                  )}

                  {nameStatus === 'invalid' && (
                    <div className="name-status invalid"><X size={16} /></div>
                  )}
                </div>

                {nameStatus === 'taken' && (
                  <div className="name-error-message">
                    <AlertCircle size={14} />
                    <span>Ce nom est déjà utilisé</span>
                  </div>
                )}

                {nameStatus === 'invalid' && formData.name.trim() && (
                  <div className="name-error-message">
                    <AlertCircle size={14} />
                    <span>Ce nom n'est pas autorisé</span>
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------ */}
            {/* EMAIL */}
            {/* ------------------------------------------------------ */}
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

            {/* ------------------------------------------------------ */}
            {/* MOT DE PASSE */}
            {/* ------------------------------------------------------ */}
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

              {isRegister && (
                <>
                  <div className="password-strength">
                    <div className="strength-bar">
                      <div
                        className={`strength-fill strength-${passwordStrength}`}
                        style={{ width: formData.password ? `${(passwordStrength / 4) * 100}%` : '0%' }}
                      />
                    </div>

                    <span className="strength-text">
                      {!formData.password && 'Entrez un mot de passe'}
                      {formData.password && passwordStrength === 0 && 'Très faible'}
                      {formData.password && passwordStrength === 1 && 'Faible'}
                      {formData.password && passwordStrength === 2 && 'Moyen'}
                      {formData.password && passwordStrength === 3 && 'Fort'}
                      {formData.password && passwordStrength === 4 && 'Très fort'}
                    </span>
                  </div>

                  {/* Règles visibles */}
                  <div className="password-validations">
                    <div className={`validation-item ${validations.minLength ? 'valid' : ''}`}>
                      {validations.minLength ? <Check size={14} /> : <div className="validation-dot" />}
                      <span>Au moins 6 caractères</span>
                    </div>

                    <div className={`validation-item ${validations.hasNumber ? 'valid' : ''}`}>
                      {validations.hasNumber ? <Check size={14} /> : <div className="validation-dot" />}
                      <span>Contient un chiffre</span>
                    </div>

                    <div className={`validation-item ${validations.hasUpper ? 'valid' : ''}`}>
                      {validations.hasUpper ? <Check size={14} /> : <div className="validation-dot" />}
                      <span>Contient une majuscule</span>
                    </div>

                    <div className={`validation-item ${validations.hasLower ? 'valid' : ''}`}>
                      {validations.hasLower ? <Check size={14} /> : <div className="validation-dot" />}
                      <span>Contient une minuscule</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ------------------------------------------------------ */}
            {/* ERREURS / SUCCESS */}
            {/* ------------------------------------------------------ */}
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

            {/* ------------------------------------------------------ */}
            {/* BOUTON SOUMISSION */}
            {/* ------------------------------------------------------ */}
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <Loader size={20} className="spinner" />
                  <span>{isRegister ? 'Inscription en cours...' : 'Connexion en cours...'}</span>
                </>
              ) : (
                <span>{isRegister ? "S'inscrire" : "Se connecter"}</span>
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
                : "Pas encore de compte ? Inscrivez-vous"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;