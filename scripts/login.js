import {
  auth,
  googleProvider,
  facebookProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile
} from './firebase.js';

const signInPanel = document.querySelector('#signin-panel');
const signUpPanel = document.querySelector('#signup-panel');
const errorBanner = document.querySelector('#auth-error');
const authButtons = document.querySelectorAll(
  '#btn-signin, #btn-signup, #btn-google, #btn-facebook, #btn-google-signup, #btn-facebook-signup'
);

onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = 'amazon.html';
  }
});

document.querySelector('#show-signup').addEventListener('click', () => {
  showPanel(signUpPanel);
});

document.querySelector('#show-signin').addEventListener('click', () => {
  showPanel(signInPanel);
});

document.querySelector('#signin-form').addEventListener('submit', (event) => {
  event.preventDefault();
  runAuthAction(event.submitter, async () => {
    await signInWithEmailAndPassword(
      auth,
      document.querySelector('#signin-email').value.trim(),
      document.querySelector('#signin-password').value
    );
  });
});

document.querySelector('#signup-form').addEventListener('submit', (event) => {
  event.preventDefault();
  runAuthAction(event.submitter, async () => {
    const name = document.querySelector('#signup-name').value.trim();
    const email = document.querySelector('#signup-email').value.trim();
    const password = document.querySelector('#signup-password').value;
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    if (name) {
      await updateProfile(credential.user, { displayName: name });
    }
  });
});

document.querySelectorAll('#btn-google, #btn-google-signup').forEach((button) => {
  button.addEventListener('click', () =>
    runAuthAction(button, () => signInWithPopup(auth, googleProvider))
  );
});

document.querySelectorAll('#btn-facebook, #btn-facebook-signup').forEach((button) => {
  button.addEventListener('click', () =>
    runAuthAction(button, () => signInWithPopup(auth, facebookProvider))
  );
});

function showPanel(panel) {
  signInPanel.hidden = panel !== signInPanel;
  signUpPanel.hidden = panel !== signUpPanel;
  errorBanner.hidden = true;
}

async function runAuthAction(button, action) {
  // Clear any previous error message before starting a new auth attempt
  errorBanner.textContent = '';
  errorBanner.hidden = true;

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
    messages[error.code] || 'We could not sign you in. Please try again.';
  errorBanner.hidden = false;
}
