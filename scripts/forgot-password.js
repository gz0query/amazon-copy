import {
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { auth } from './firebase.js';

const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_69qsl0v',
  TEMPLATE_ID: 'template_4qtlk7a',
  PUBLIC_KEY: 'l7yMsCN-CSKzyJAm4'
};

const emailInput = document.querySelector('#fp-email');
const otpInput = document.querySelector('#fp-otp');
const message = document.querySelector('#fp-message');
const sendCodeButton = document.querySelector('#btn-send-code');
const verifyCodeButton = document.querySelector('#btn-verify-code');
const resendCodeLink = document.querySelector('#btn-resend-code');
const savePasswordButton = document.querySelector('#btn-save-password');
const steps = {
  email: document.querySelector('#step-email'),
  otp: document.querySelector('#step-otp'),
  newPassword: document.querySelector('#step-new-password')
};

let targetEmail = '';
let otpHash = '';
let otpExpiresAt = 0;
const oobCode = new URLSearchParams(window.location.search).get('oobCode');

sendCodeButton.addEventListener('click', () => sendOtp(emailInput.value.trim()));

verifyCodeButton.addEventListener('click', verifyOtp);

resendCodeLink.addEventListener('click', (event) => {
  event.preventDefault();
  sendOtp(targetEmail);
});

savePasswordButton.addEventListener('click', saveNewPassword);

if (oobCode) {
  verifyResetLink(oobCode);
}

async function sendOtp(email) {
  clearMessage();
  emailInput.value = email;
  if (!emailInput.checkValidity()) {
    emailInput.reportValidity();
    return;
  }

  setBusy(sendCodeButton, true);
  setBusy(resendCodeLink, true);
  try {
    targetEmail = email;
    const otpCode = generateOtp();
    otpHash = await hashOtp(otpCode);
    otpExpiresAt = Date.now() + 10 * 60 * 1000;
    await window.emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID,
      {
        to_email: targetEmail,
        email: targetEmail,
        otp_code: otpCode,
        passcode: otpCode
      },
      EMAILJS_CONFIG.PUBLIC_KEY
    );
    document.querySelector('#fp-display-email').textContent = targetEmail;
    showStep('otp');
    otpInput.value = '';
    showMessage('A 6-digit verification code has been sent to your email.', true);
  } catch (error) {
    console.error('Could not send password recovery verification code.', error);
    showMessage('We could not send the verification code. Please try again.');
  } finally {
    setBusy(sendCodeButton, false);
    setBusy(resendCodeLink, false);
  }
}

async function verifyOtp() {
  clearMessage();
  const enteredCode = otpInput.value.trim();
  if (!/^\d{6}$/.test(enteredCode)) {
    showMessage('Enter the 6-digit code sent to your email.');
    otpInput.focus();
    return;
  }
  if (Date.now() > otpExpiresAt) {
    otpHash = '';
    showMessage('This code has expired. Select Resend Code to get a new one.');
    return;
  }

  setBusy(verifyCodeButton, true);
  try {
    if (await hashOtp(enteredCode) !== otpHash) {
      showMessage('That code is incorrect. Check it and try again.');
      return;
    }

    await sendPasswordResetEmail(auth, targetEmail, {
      url: `${window.location.origin}/forgot-password.html`
    });
    otpHash = '';
    showMessage(
      'Your code is verified. If an account exists for this email, click the secure password reset link sent to your inbox to open the New Password screen.',
      true
    );
  } catch (error) {
    console.error('Could not send Firebase password reset link.', error);
    showMessage('We could not send the secure reset link. Please try again.');
  } finally {
    setBusy(verifyCodeButton, false);
  }
}

async function verifyResetLink(code) {
  try {
    await verifyPasswordResetCode(auth, code);
    showStep('newPassword');
  } catch (error) {
    console.error('Could not verify Firebase password reset code.', error);
    showMessage('This password reset link is invalid or has expired. Request a new code to continue.');
  }
}

async function saveNewPassword() {
  clearMessage();
  const newPassword = document.querySelector('#fp-new-password').value;
  const confirmPassword = document.querySelector('#fp-confirm-password').value;
  if (newPassword.length < 6) {
    showMessage('Your new password must be at least 6 characters long.');
    document.querySelector('#fp-new-password').focus();
    return;
  }
  if (newPassword !== confirmPassword) {
    showMessage('The passwords do not match.');
    document.querySelector('#fp-confirm-password').focus();
    return;
  }

  setBusy(savePasswordButton, true);
  try {
    await confirmPasswordReset(auth, oobCode, newPassword);
    showMessage('Password updated! Redirecting to Sign In...', true);
    window.setTimeout(() => {
      window.location.href = 'index.html';
    }, 1800);
  } catch (error) {
    console.error('Could not update password.', error);
    showMessage('We could not update your password. The reset link may have expired; request a new one and try again.');
  } finally {
    setBusy(savePasswordButton, false);
  }
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

function showStep(activeStep) {
  Object.entries(steps).forEach(([name, step]) => {
    step.hidden = name !== activeStep;
  });
  clearMessage();
}

function showMessage(text, isSuccess = false) {
  message.textContent = text;
  message.classList.toggle('success', isSuccess);
  message.hidden = false;
}

function clearMessage() {
  message.textContent = '';
  message.classList.remove('success');
  message.hidden = true;
}

function setBusy(element, isBusy) {
  if ('disabled' in element) {
    element.disabled = isBusy;
  }
  if (isBusy) {
    element.setAttribute('aria-busy', 'true');
  } else {
    element.removeAttribute('aria-busy');
  }
}
