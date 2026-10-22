import { cart, setCartUser } from '../data/cart.js';
import { doc, onSnapshot, setDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { auth, db, onAuthStateChanged, signOut } from './firebase.js';

const profileName = document.querySelector('#profile-name');
const profileEmail = document.querySelector('#profile-email');
const avatarUpload = document.querySelector('#avatar-upload');
const profileAvatar = document.querySelector('#profile-avatar');
const cropperModal = document.querySelector('#cropper-modal');
const cropperImage = document.querySelector('#cropper-image');
const cropApplyButton = document.querySelector('#btn-crop-apply');
const saveButton = document.querySelector('#btn-save-changes');
const saveMessage = document.querySelector('#profile-save-message');
const hamburgerIcon = document.querySelector('#hamburger-icon');
const sidebarMenu = document.querySelector('#sidebar-menu');
const sidebarOverlay = document.querySelector('#sidebar-overlay');
const sidebarClose = document.querySelector('#sidebar-close');
const accountContainer = document.querySelector('#account-container');
const accountToggle = document.querySelector('#account-toggle');
const accountMenu = document.querySelector('#account-menu');
let cropper;
let photoBase64 = '';
let currentUser;
let cropSourceUrl;

function setSidebarOpen(isOpen) {
  sidebarMenu.classList.toggle('active', isOpen);
  sidebarOverlay.classList.toggle('active', isOpen);
  sidebarMenu.setAttribute('aria-hidden', String(!isOpen));
  sidebarOverlay.setAttribute('aria-hidden', String(!isOpen));
  hamburgerIcon.setAttribute('aria-expanded', String(isOpen));
}

function updateCartQuantity() {
  const quantity = cart.reduce((total, item) => total + item.quantity, 0);
  document.querySelector('.js-cart-quantity').textContent = quantity;
}

hamburgerIcon.addEventListener('click', () => setSidebarOpen(true));
hamburgerIcon.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    setSidebarOpen(true);
  }
});

sidebarClose.addEventListener('click', () => setSidebarOpen(false));
sidebarOverlay.addEventListener('click', () => setSidebarOpen(false));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    setSidebarOpen(false);
  }
});

document.addEventListener('click', (event) => {
  if (!accountContainer.contains(event.target)) {
    accountMenu.hidden = true;
    accountToggle.setAttribute('aria-expanded', 'false');
  }
});

document.querySelector('#btn-header-signout').addEventListener('click', async () => {
  try {
    await signOut(auth);
  } catch (error) {
    alert(`Could not sign out: ${error.message}`);
  }
});

document.getElementById('sidebar-logout')?.addEventListener('click', (event) => {
  event.preventDefault();
  signOut(auth).then(() => {
    window.location.href = 'index.html';
  }).catch((error) => console.error('Logout failed:', error));
});

document.querySelector('#avatar-edit').addEventListener('click', () => {
  avatarUpload.click();
});

avatarUpload.addEventListener('change', () => {
  const file = avatarUpload.files?.[0];
  if (!file) {
    return;
  }

  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    avatarUpload.value = '';
    alert('Choose a PNG or JPEG image.');
    return;
  }

  if (cropper) {
    cropper.destroy();
  }

  if (cropSourceUrl) {
    URL.revokeObjectURL(cropSourceUrl);
  }
  cropSourceUrl = URL.createObjectURL(file);
  cropperImage.src = cropSourceUrl;
  cropperModal.hidden = false;
  cropper = new window.Cropper(cropperImage, {
    aspectRatio: 1,
    viewMode: 1,
    dragMode: 'move'
  });
});

function closeCropper() {
  if (cropper) {
    cropper.destroy();
    cropper = undefined;
  }
  if (cropSourceUrl) {
    URL.revokeObjectURL(cropSourceUrl);
    cropSourceUrl = undefined;
  }
  cropperModal.hidden = true;
  avatarUpload.value = '';
}

document.querySelector('#btn-crop-cancel').addEventListener('click', closeCropper);
cropperModal.addEventListener('click', (event) => {
  if (event.target === cropperModal) {
    closeCropper();
  }
});

cropApplyButton.addEventListener('click', () => {
  if (!cropper) {
    return;
  }

  try {
    photoBase64 = cropper
      .getCroppedCanvas({ width: 250, height: 250 })
      .toDataURL('image/jpeg', 0.6);
    profileAvatar.src = photoBase64;
    closeCropper();
  } catch (error) {
    showProfileMessage('Could not crop this image. Please try another photo.', true);
    console.error('Could not crop profile image.', error);
  }
});

function showProfileMessage(message, isError = false) {
  saveMessage.textContent = message;
  saveMessage.classList.toggle('error', isError);
  saveMessage.hidden = false;
}

saveButton.addEventListener('click', async () => {
  if (!currentUser) {
    showProfileMessage('Please sign in again before saving your profile.', true);
    return;
  }

  saveButton.disabled = true;
  saveMessage.hidden = true;

  try {
    const phone = document.querySelector('#profile-phone').value.trim();
    const address = document.querySelector('#profile-address').value.trim();
    const name = profileName.value.trim();
    await setDoc(doc(db, 'users', currentUser.uid), {
      name,
      phone,
      address,
      photoBase64
    }, { merge: true });
    showProfileMessage('Profile Saved!');
  } catch (error) {
    console.error('Could not save profile to Firestore.', error);
    showProfileMessage('Could not save your profile. Please try again.', true);
  } finally {
    saveButton.disabled = false;
  }
});

onAuthStateChanged(auth, (user) => {
  const adminLink = document.getElementById('sidebar-admin-portal');
  if (adminLink) {
    adminLink.style.display =
      user && user.email && user.email.toLowerCase() === 'goodluckbello85@gmail.com'
        ? 'block'
        : 'none';
  }

  if (!user) {
    window.location.replace('index.html');
    return;
  }

  currentUser = user;
  const displayName = user.displayName || user.email?.split('@')[0] || 'User';
  const firstName = (displayName || 'User').trim().split(/\s+/)[0];
  profileName.value = user.displayName || '';
  profileEmail.value = user.email || '';
  updateHeaderGreeting(firstName);
  document.querySelector('#sidebar-name').textContent = `Hello, ${firstName}`;

  setCartUser(user.uid);
  updateCartQuantity();

  onSnapshot(doc(db, 'users', user.uid), (profileSnapshot) => {
    if (!profileSnapshot.exists()) {
      return;
    }

    const profile = profileSnapshot.data();
    const savedName = profile.name || profile.fullName || profile.displayName;
    const displayName = savedName || user.displayName || user.email?.split('@')[0] || 'User';
    const firstName = (displayName || 'User').trim().split(/\s+/)[0];
    if (typeof savedName === 'string' && savedName) {
      profileName.value = savedName;
    }
    updateHeaderGreeting(firstName);
    document.querySelector('#sidebar-name').textContent = `Hello, ${firstName}`;
    document.querySelector('#profile-phone').value = profile.phone || '';
    document.querySelector('#profile-address').value = profile.address || '';
    if (typeof profile.photoBase64 === 'string' && profile.photoBase64) {
      photoBase64 = profile.photoBase64;
      profileAvatar.src = photoBase64;
      const headerAvatar = document.getElementById('header-avatar');
      if (headerAvatar) {
        headerAvatar.src = profile.photoBase64;
      }
    }
  }, (error) => {
    console.error('Could not load profile from Firestore.', error);
    showProfileMessage('Could not load saved profile details.', true);
  });
});

function updateHeaderGreeting(firstName) {
  document.querySelectorAll('.greeting-text').forEach((element) => {
    const helloPrefix = document.createElement('span');
    helloPrefix.className = 'hello-prefix';
    helloPrefix.textContent = 'Hello, ';

    const firstNameElement = document.createElement('span');
    firstNameElement.className = 'first-name-only';
    firstNameElement.textContent = firstName;

    element.replaceChildren(helloPrefix, firstNameElement);
  });
}