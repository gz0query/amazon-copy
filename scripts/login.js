import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged
} from './firebase.js';
import { FacebookAuthProvider } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import {
  doc,
  getDoc,
  setDoc
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { setCartUser } from '../data/cart.js';
import { setOrdersUser, syncUserDataFromCloud } from '../data/orders.js';

const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_69qsl0v',
  TEMPLATE_ID: 'template_4qtlk7a',
  PUBLIC_KEY: 'l7yMsCN-CSKzyJAm4'
};

const signInPanel = document.querySelector('#signin-panel');
const signUpPanel = document.querySelector('#signup-panel');
const signupOtpView = document.querySelector('#signup-otp-view');
const errorBanner = document.querySelector('#auth-error');
const authButtons = document.querySelectorAll(
  '#btn-signin, #btn-signup, #btn-google, #btn-facebook, #btn-google-signup, #btn-facebook-signup'
);

let pendingSignup = null;
let signupOtpHash = '';
let signupOtpExpiresAt = 0;
let isAwaitingSignupOtp = false;
let isCompletingSignup = false;
let isCompletingSignIn = false;

onAuthStateChanged(auth, (user) => {
  if (user && !isCompletingSignup && !isCompletingSignIn) {
    window.location.href = 'amazon.html';
  }
});

document.querySelector('#show-signup').addEventListener('click', () => {
  showPanel(signUpPanel);
});

document.querySelector('#show-signin').addEventListener('click', () => {
  showPanel(signInPanel);
});

document.querySelector('#signin-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  clearAuthError();
  const button = event.submitter;
  setBusy(button, true);
  isCompletingSignIn = true;

  let credential;
  try {
    credential = await signInWithEmailAndPassword(
      auth,
      document.querySelector('#signin-email').value.trim(),
      document.querySelector('#signin-password').value
    );
  } catch (error) {
    showAuthError(error);
    isCompletingSignIn = false;
    setBusy(button, false);
    return;
  }

  try {
    setCartUser(credential.user.uid);
    setOrdersUser(credential.user.uid);
    const userReference = doc(db, 'users', credential.user.uid);
    const userSnapshot = await getDoc(userReference);
    if (!userSnapshot.exists()) {
      await setDoc(userReference, {
        name: credential.user.displayName || '',
        email: credential.user.email || ''
      });
    }
    await syncUserDataFromCloud(credential.user);
  } catch (syncErr) {
    console.warn(syncErr);
  }

  isCompletingSignIn = false;
  setBusy(button, false);
  window.location.href = 'amazon.html';
});

document.querySelector('#signup-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  clearAuthError();
  const signupButton = event.submitter;
  const signup = {
    name: document.querySelector('#signup-name').value.trim(),
    email: document.querySelector('#signup-email').value.trim(),
    password: document.querySelector('#signup-password').value
  };

  setBusy(signupButton, true);
  pendingSignup = signup;
  isAwaitingSignupOtp = true;
  try {
    await sendSignupOtp();
    document.querySelector('#signup-otp-email').textContent = signup.email;
    document.querySelector('#signup-otp-input').value = '';
    showSignupOtpView();
  } catch (error) {
    pendingSignup = null;
    signupOtpHash = '';
    isAwaitingSignupOtp = false;
    showAuthError(error);
  } finally {
    setBusy(signupButton, false);
  }
});

document.querySelector('#btn-confirm-signup-otp').addEventListener('click', confirmSignupOtp);

document.querySelector('#btn-resend-signup-otp').addEventListener('click', async (event) => {
  clearAuthError();
  setBusy(event.currentTarget, true);
  try {
    if (!isAwaitingSignupOtp || !pendingSignup) {
      throw new Error('No sign-up verification is currently in progress.');
    }
    await sendSignupOtp();
  } catch (error) {
    showAuthError(error);
  } finally {
    setBusy(event.currentTarget, false);
  }
});

document.querySelector('#signup-change-email').addEventListener('click', () => {
  pendingSignup = null;
  signupOtpHash = '';
  signupOtpExpiresAt = 0;
  isAwaitingSignupOtp = false;
  document.querySelector('#signup-otp-input').value = '';
  showPanel(signUpPanel);
});

document.querySelectorAll('#btn-google, #btn-google-signup').forEach((button) => {
  button.addEventListener('click', () =>
    runAuthAction(button, () => signInWithPopup(auth, googleProvider))
  );
});

document.querySelectorAll('#btn-facebook, #btn-facebook-signup').forEach((button) => {
  button.addEventListener('click', () => runFacebookAuthAction(button));
});

function showPanel(panel) {
  signInPanel.hidden = panel !== signInPanel;
  signUpPanel.hidden = panel !== signUpPanel;
  signupOtpView.hidden = true;
  clearAuthError();
}

function showSignupOtpView() {
  signInPanel.hidden = true;
  signUpPanel.hidden = true;
  signupOtpView.hidden = false;
  clearAuthError();
}

async function sendSignupOtp() {
  const otpCode = generateOtp();
  signupOtpHash = await hashOtp(otpCode);
  signupOtpExpiresAt = Date.now() + 10 * 60 * 1000;
  await window.emailjs.send(
    EMAILJS_CONFIG.SERVICE_ID,
    EMAILJS_CONFIG.TEMPLATE_ID,
    {
      to_email: pendingSignup.email,
      email: pendingSignup.email,
      otp_code: otpCode,
      passcode: otpCode
    },
    EMAILJS_CONFIG.PUBLIC_KEY
  );
}

async function confirmSignupOtp(event) {
  clearAuthError();
  const codeInput = document.querySelector('#signup-otp-input');
  const enteredCode = codeInput.value.trim();
  if (!isAwaitingSignupOtp || !pendingSignup) {
    showAuthError(new Error('Start sign-up again to request a verification code.'));
    return;
  }
  if (!/^\d{6}$/.test(enteredCode)) {
    showAuthError(new Error('Enter the 6-digit code sent to your email.'));
    codeInput.focus();
    return;
  }
  if (Date.now() > signupOtpExpiresAt) {
    signupOtpHash = '';
    showAuthError(new Error('This code has expired. Select Resend Code to get a new one.'));
    return;
  }
  if (await hashOtp(enteredCode) !== signupOtpHash) {
    showAuthError(new Error('That code is incorrect. Check it and try again.'));
    return;
  }

  const confirmButton = event.currentTarget;
  setBusy(confirmButton, true);
  isCompletingSignup = true;
  try {
    const { name, email, password } = pendingSignup;
    const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    try {
      setDoc(doc(db, 'users', userCred.user.uid), {
        fullName: name,
        email: email.trim(),
        emailVerified: true,
        createdAt: new Date().toISOString()
      }).catch((syncErr) => console.warn(syncErr));
    } catch (syncErr) {
      console.warn(syncErr);
    }
    pendingSignup = null;
    signupOtpHash = '';
    isAwaitingSignupOtp = false;
    window.location.href = 'amazon.html';
  } catch (error) {
    isCompletingSignup = false;
    showAuthError(error);
  } finally {
    setBusy(confirmButton, false);
  }
}

async function runFacebookAuthAction(button) {
  clearAuthError();
  authButtons.forEach((authButton) => {
    authButton.disabled = true;
  });
  button.setAttribute('aria-busy', 'true');

  try {
    const fbProvider = new FacebookAuthProvider();
    const userCred = await signInWithPopup(auth, fbProvider);
    try {
      setDoc(
        doc(db, 'users', userCred.user.uid),
        {
          name: userCred.user.displayName || '',
          email: userCred.user.email || ''
        },
        { merge: true }
      ).catch((syncErr) => console.warn(syncErr));
    } catch (syncErr) {
      console.warn(syncErr);
    }
    window.location.href = 'amazon.html';
  } catch (error) {
    errorBanner.textContent =
      'Facebook Login is currently being verified. Please continue with Google or Email.';
    errorBanner.hidden = false;
  } finally {
    authButtons.forEach((authButton) => {
      authButton.disabled = false;
    });
    button.removeAttribute('aria-busy');
  }
}

async function runAuthAction(button, action) {
  clearAuthError();
  authButtons.forEach((authButton) => {
    authButton.disabled = true;
  });
  if (button) {
    button.setAttribute('aria-busy', 'true');
  }

  try {
    await action();
    window.location.href = 'amazon.html';
  } catch (error) {
    showAuthError(error);
  } finally {
    authButtons.forEach((authButton) => {
      authButton.disabled = false;
    });
    if (button) {
      button.removeAttribute('aria-busy');
    }
  }
}

function showAuthError(error) {
  const messages = {
    'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
    'auth/invalid-credential': 'Incorrect email or password. Please try again.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/popup-closed-by-user': 'The sign-in window was closed before sign-in completed.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/user-not-found': 'Incorrect email or password. Please try again.',
    'auth/weak-password': 'Password must be at least 6 characters long.',
    'auth/wrong-password': 'Incorrect email or password. Please try again.'
  };

  errorBanner.textContent =
    messages[error.code] || error.message || 'We could not sign you in. Please try again.';
  errorBanner.hidden = false;
}

function clearAuthError() {
  errorBanner.textContent = '';
  errorBanner.hidden = true;
}

function generateOtp() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(100000 + (values[0] % 900000));
}

async function hashOtp(otp) {
  const encodedOtp = new TextEncoder().encode(otp);
  const digest = await crypto.subtle.digest('SHA-256', encodedOtp);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function setBusy(element, isBusy) {
  if (!element) {
    return;
  }
  if ('disabled' in element) {
    element.disabled = isBusy;
  }
  if (isBusy) {
    element.setAttribute('aria-busy', 'true');
  } else {
    element.removeAttribute('aria-busy');
  }
}
