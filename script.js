import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    updateDoc,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ====================================================
   FIREBASE CONFIGURATION
   ==================================================== */
const firebaseConfig = {
    apiKey: "AIzaSyDEPLVXLHQzK9sWxhYmPjc4uMx5Xjeydac",
    authDomain: "dream-progressive-ventures.firebaseapp.com",
    projectId: "dream-progressive-ventures",
    storageBucket: "dream-progressive-ventures.firebasestorage.app",
    messagingSenderId: "316380502448",
    appId: "1:316380502448:web:6b4d9138052e7d5a139e75",
    measurementId: "G-T62FVHSF10"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let activeCategory = 'sites';
let uploadedPhotosBase64 = [];
let editingDocId = null; // null = create mode, string = edit mode

/* ====================================================
   CORE SYSTEM INITIALIZATION
   ==================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = mobileBtn.querySelector('i');
            if (navLinks.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }

    // Smooth Scrolling for Anchors
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            if (navLinks && navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                const icon = mobileBtn.querySelector('i');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                window.scrollTo({ top: offsetPosition, behavior: "smooth" });
            }
        });
    });

    // Scroll Animation Observer
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, observerOptions);

    document.querySelectorAll('.section').forEach(section => observer.observe(section));

    // Form Submission Handler
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerText;
            submitBtn.innerText = 'Sending...';
            submitBtn.disabled = true;

            const formData = new FormData(this);
            fetch("https://formsubmit.co/ajax/vsonu4428@gmail.com", {
                method: "POST",
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    Swal.fire({
                        title: 'Message Sent!',
                        text: 'Thank you for connecting with Dream Progressive Ventures. We will get back to you shortly.',
                        icon: 'success',
                        confirmButtonColor: '#1a3c34',
                        confirmButtonText: 'Great!'
                    });
                    contactForm.reset();
                })
                .catch(error => {
                    console.error('Error:', error);
                    Swal.fire({
                        title: 'Submission Failed',
                        text: 'Something went wrong. Please try again later.',
                        icon: 'error',
                        confirmButtonColor: '#1a3c34'
                    });
                })
                .finally(() => {
                    submitBtn.innerText = originalBtnText;
                    submitBtn.disabled = false;
                });
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
        const dropdowns = document.querySelectorAll('.sites-dropdown');
        const buttons = document.querySelectorAll('.btn-view-sites');
        let clickedInside = false;
        dropdowns.forEach(d => { if (d.contains(e.target)) clickedInside = true; });
        buttons.forEach(b => { if (b.contains(e.target)) clickedInside = true; });
        if (!clickedInside) {
            dropdowns.forEach(d => d.classList.remove('open'));
            buttons.forEach(b => b.classList.remove('open'));
            document.querySelectorAll('.service-card').forEach(c => c.style.zIndex = '');
        }
    });

    // Initialize System
    onAuthStateChanged(auth, (user) => {
        updateAdminUI();
    });

    initSystem();
});

/* ====================================================
   DATA MANAGEMENT (FIRESTORE)
   ==================================================== */

async function initSystem() {
    loadReviews();
}

async function getData(category) {
    try {
        const snapshot = await getDocs(collection(db, category));
        const data = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
        }));
        // Sort locally by timestamp since server-side orderBy requires manual indexes
        return data.sort((a, b) => {
            const timeA = a.timestamp?.seconds || 0;
            const timeB = b.timestamp?.seconds || 0;
            return timeB - timeA;
        });
    } catch (e) {
        console.error("Firestore Read Error:", e);
        return [];
    }
}

async function saveData(category, item) {
    try {
        item.timestamp = serverTimestamp();
        await addDoc(collection(db, category), item);
    } catch (e) {
        console.error("Firestore Write Error:", e);
        alert("Failed to save: " + e.message);
    }
}

async function deleteFromCloud(category, docId) {
    try {
        await deleteDoc(doc(db, category, docId));
    } catch (e) {
        console.error("Firestore Delete Error:", e);
    }
}

async function updateData(category, docId, item) {
    try {
        item.updatedAt = serverTimestamp();
        await updateDoc(doc(db, category, docId), item);
    } catch (e) {
        console.error("Firestore Update Error:", e);
        alert("Failed to update: " + e.message);
    }
}

/* ====================================================
   UI HANDLERS
   ==================================================== */

function handleAdminAuth() {
    if (auth.currentUser) {
        signOut(auth).then(() => {
            updateAdminUI();
            Swal.fire({ title: 'Logged Out', icon: 'success', timer: 1000, showConfirmButton: false });
        });
        return;
    }

    Swal.fire({
        title: 'Admin Login',
        html: `
            <input id="adminEmail" class="swal2-input" placeholder="Email">
            <input id="adminPassword" type="password" class="swal2-input" placeholder="Password">
        `,
        confirmButtonText: 'Login',
        confirmButtonColor: '#1a3c34',
        focusConfirm: false,
        preConfirm: () => {
            const email = document.getElementById('adminEmail').value;
            const password = document.getElementById('adminPassword').value;
            if (!email || !password) {
                Swal.showValidationMessage('Please enter both email and password');
                return false;
            }
            return signInWithEmailAndPassword(auth, email, password)
                .catch(error => {
                    Swal.showValidationMessage('Login Failed: ' + error.message);
                });
        }
    }).then(result => {
        if (result.isConfirmed) {
            updateAdminUI();
        }
    });
}

function updateAdminUI() {
    const isAdmin = !!auth.currentUser;
    const adminBtn = document.getElementById('adminLoginBtn');
    if (adminBtn) {
        if (isAdmin) {
            adminBtn.innerHTML = '<i class="fas fa-unlock"></i> Logout';
            adminBtn.classList.add('admin-logged-in');
        } else {
            adminBtn.innerHTML = '<i class="fas fa-lock"></i> Admin';
            adminBtn.classList.remove('admin-logged-in');
        }
    }
    refreshCategoryButtons(isAdmin);
    loadReviews(); // Refresh reviews to show/hide delete buttons
}

function refreshCategoryButtons(isAdmin) {
    const categories = [
        { id: 'homeBuyingActions', key: 'sites', label: 'Sites', visitorLabel: 'View Sites', visitorType: 'single' },
        { id: 'marketActions', key: 'market', label: 'Market News', visitorLabel: 'Market News', visitorType: 'single' },
        { id: 'plotsActions', key: 'plots', label: 'Plots', visitorLabel: 'View Plots', visitorType: 'single' },
        { id: 'sellingActions', key: 'selling', label: 'Selling', btn1: 'Sell Property', btn2: 'View Listed', visitorType: 'dual-submit', submitFn: "openAddModal('selling')" },
        { id: 'mgmtActions', key: 'management', label: 'Management', btn1: 'Request Management', btn2: 'View Managed', visitorType: 'dual-submit', submitFn: "openServiceModal('management')" },
        { id: 'commercialActions', key: 'commercial', label: 'Commercial', btn1: 'List Property', btn2: 'View Listings', visitorType: 'dual-submit', submitFn: "openServiceModal('commercial')" },
        { id: 'constructionActions', key: 'construction', label: 'Construction', btn1: 'Request Quote', btn2: 'View Projects', visitorType: 'dual-submit', submitFn: "openServiceModal('construction')" },
        { id: 'landActions', key: 'land', label: 'Land Dev', btn1: 'Submit Land', btn2: 'View Projects', visitorType: 'dual-submit', submitFn: "openServiceModal('land')" }
    ];

    categories.forEach(cat => {
        const container = document.getElementById(cat.id);
        if (!container) return;
        if (isAdmin) {
            container.innerHTML = `
                <div class="admin-dropdown-wrapper">
                    <button class="btn-view-sites admin-btn" onclick="toggleAdminMenu(event, '${cat.key}')">
                        Manage ${cat.label} <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="sites-dropdown" id="${cat.key}Dropdown">
                        <button onclick="openAdminAddModal('${cat.key}')"><i class="fas fa-plus-circle"></i> Add New</button>
                        <button onclick="openViewGallery('${cat.key}')"><i class="fas fa-eye"></i> View All</button>
                    </div>
                </div>`;
        } else if (cat.visitorType === 'dual-submit') {
            container.innerHTML = `
                <div class="visitor-actions-grid">
                    <button class="btn-view-sites" onclick="${cat.submitFn}">
                        <span class="btn-text">${cat.btn1}</span>
                    </button>
                    <button class="btn-view-sites btn-secondary-view" onclick="openViewGallery('${cat.key}')">
                        <span class="btn-text">${cat.btn2}</span>
                    </button>
                </div>`;
        } else {
            container.innerHTML = `
                <button class="btn-view-sites" onclick="handleCategoryAction('${cat.key}')">
                    <span class="btn-text">${cat.visitorLabel}</span> <i class="fas fa-chevron-right"></i>
                </button>`;
        }
    });
}

function handleCategoryAction(category) {
    if (category === 'selling' && !auth.currentUser) {
        openAddModal('selling');
    } else {
        openViewGallery(category);
    }
}

function toggleAdminMenu(e, category) {
    e.stopPropagation();
    const dropdown = document.getElementById(`${category}Dropdown`);
    const btn = e.currentTarget;
    const card = btn.closest('.service-card');
    const isOpen = dropdown.classList.contains('open');

    document.querySelectorAll('.sites-dropdown').forEach(d => d.classList.remove('open'));
    document.querySelectorAll('.btn-view-sites').forEach(b => b.classList.remove('open'));
    document.querySelectorAll('.btn-view-sites').forEach(b => b.classList.remove('open'));

    if (!isOpen) {
        dropdown.classList.add('open');
        btn.classList.add('open');
        if (card) card.style.zIndex = '100';
    }
}

// openAdminAddModal — routes to appropriate modal based on category type
function openAdminAddModal(category) {
    const serviceCategories = ['management', 'commercial', 'construction', 'land'];
    if (serviceCategories.includes(category)) {
        openServiceModal(category);
    } else {
        openAddModal(category);
    }
}

function openAddModal(category) {
    activeCategory = category;
    prepareAddForm();
    showModal('addSiteModal');
}

/* ====================================================
   SERVICE MODAL — for 4 new lead-generation categories
   ==================================================== */

const SERVICE_CONFIG = {
    management: {
        title: 'Request Property Management',
        sub: 'Fill in your property details and we will get back to you.',
        icon: 'fa-tasks',
        iconClass: 'mgmt-icon',
        submitLabel: '<i class="fas fa-paper-plane"></i> Submit Request',
        viewLabel: 'Managed Properties',
        fields: [
            { id: 'f_address', label: 'Property Address', type: 'text', placeholder: 'e.g. 12, MG Road, Bhopal', required: true },
            { id: 'f_proptype', label: 'Property Type', type: 'select', options: ['Flat', 'Villa', 'Commercial'], required: true },
            { id: 'f_units', label: 'Number of Units', type: 'text', placeholder: 'e.g. 1, 5, 10', required: false },
            { id: 'f_contact', label: 'Owner Contact Number', type: 'tel', placeholder: '+91 XXXXX XXXXX', required: true },
            { id: 'f_notes', label: 'Additional Notes', type: 'textarea', placeholder: 'Any extra details about the property...', required: false }
        ]
    },
    commercial: {
        title: 'List Commercial Property',
        sub: 'List your shop, office, or warehouse for lease or sale.',
        icon: 'fa-building',
        iconClass: 'commercial-icon',
        submitLabel: '<i class="fas fa-paper-plane"></i> Submit Listing',
        viewLabel: 'Commercial Listings',
        fields: [
            { id: 'f_address', label: 'Property Address', type: 'text', placeholder: 'e.g. Shop 4, Main Bazaar, Sehore', required: true },
            { id: 'f_proptype', label: 'Property Type', type: 'select', options: ['Office', 'Shop', 'Warehouse'], required: true },
            { id: 'f_area', label: 'Area (sqft)', type: 'text', placeholder: 'e.g. 500 sqft', required: true },
            { id: 'f_price', label: 'Expected Rent / Sale Price', type: 'text', placeholder: 'e.g. ₹15,000/mo or ₹50 Lakh', required: true },
            { id: 'f_contact', label: 'Contact Number', type: 'tel', placeholder: '+91 XXXXX XXXXX', required: true }
        ]
    },
    construction: {
        title: 'Request House Construction',
        sub: 'Tell us about your plot and construction requirements.',
        icon: 'fa-hard-hat',
        iconClass: 'construction-icon',
        submitLabel: '<i class="fas fa-hammer"></i> Request Quote',
        viewLabel: 'Construction Projects',
        fields: [
            { id: 'f_address', label: 'Plot Location', type: 'text', placeholder: 'e.g. Sector 5, Sehore Bypass', required: true },
            { id: 'f_area', label: 'Plot Size (sqft)', type: 'text', placeholder: 'e.g. 1200 sqft', required: true },
            { id: 'f_proptype', label: 'Construction Type', type: 'select', options: ['Basic', 'Premium', 'Luxury'], required: true },
            { id: 'f_budget', label: 'Budget Range', type: 'text', placeholder: 'e.g. ₹20–30 Lakh', required: false },
            { id: 'f_contact', label: 'Contact Number', type: 'tel', placeholder: '+91 XXXXX XXXXX', required: true }
        ]
    },
    land: {
        title: 'Land Development Proposal',
        sub: 'Partner with DPV for large-scale land development projects.',
        icon: 'fa-tractor',
        iconClass: 'land-icon',
        submitLabel: '<i class="fas fa-file-signature"></i> Submit Proposal',
        viewLabel: 'Land Projects',
        fields: [
            { id: 'f_address', label: 'Land Location', type: 'text', placeholder: 'e.g. Village Dhankhedi, District Sehore', required: true },
            { id: 'f_area', label: 'Total Land Area', type: 'text', placeholder: 'e.g. 5 Acres / 2 Bigha', required: true },
            { id: 'f_proptype', label: 'Land Type', type: 'select', options: ['Agricultural', 'Residential'], required: true },
            { id: 'f_ownership', label: 'Ownership Status', type: 'text', placeholder: 'e.g. Self-owned, Joint, Partnership', required: false },
            { id: 'f_contact', label: 'Contact Number', type: 'tel', placeholder: '+91 XXXXX XXXXX', required: true }
        ]
    }
};

let serviceUploadedPhotos = [];

function openServiceModal(category) {
    activeCategory = category;
    const config = SERVICE_CONFIG[category];
    if (!config) return;

    const isAdmin = !!auth.currentUser;

    // Set icon, title, subtitle
    const iconEl = document.getElementById('serviceModalIcon');
    iconEl.className = `modal-icon ${config.iconClass}`;
    iconEl.innerHTML = `<i class="fas ${config.icon}"></i>`;
    document.getElementById('serviceModalTitle').textContent = config.title;
    document.getElementById('serviceModalSub').textContent = config.sub;

    // Set submit button label
    document.getElementById('serviceModalSubmitBtn').innerHTML = config.submitLabel;

    // Show / hide My Listings button for admin
    document.getElementById('serviceModalListingsBtn').style.display = isAdmin ? 'flex' : 'none';

    // Render fields
    const container = document.getElementById('serviceModalFields');
    container.innerHTML = config.fields.map(f => {
        const reqMark = f.required ? ' <span class="req-mark">*</span>' : '';
        if (f.type === 'select') {
            return `<div class="modal-form-group">
                <label class="field-label">${f.label}${reqMark}</label>
                <select id="${f.id}" class="modal-select">
                    <option value="">Select...</option>
                    ${f.options.map(o => `<option value="${o}">${o}</option>`).join('')}
                </select>
            </div>`;
        } else if (f.type === 'textarea') {
            return `<div class="modal-form-group">
                <label class="field-label">${f.label}${reqMark}</label>
                <textarea id="${f.id}" placeholder="${f.placeholder}" rows="3"></textarea>
            </div>`;
        } else {
            return `<div class="modal-form-group">
                <label class="field-label">${f.label}${reqMark}</label>
                <input type="${f.type}" id="${f.id}" placeholder="${f.placeholder}">
            </div>`;
        }
    }).join('');

    // Reset photo grid
    document.getElementById('servicePhotoPreviewGrid').innerHTML = '';
    document.getElementById('servicePhotoInput').value = '';
    serviceUploadedPhotos = [];

    showModal('serviceModal');
}

function previewServicePhotos(input) {
    const grid = document.getElementById('servicePhotoPreviewGrid');
    const files = Array.from(input.files);
    const currentCount = serviceUploadedPhotos.filter(p => p !== null).length;
    if (currentCount + files.length > 3) {
        Swal.fire({ title: 'Limit Exceeded', text: 'Maximum 3 photos allowed.', icon: 'warning', confirmButtonColor: '#1a3c34' });
        return;
    }
    files.forEach(file => {
        if (file.size > 5 * 1024 * 1024) {
            Swal.fire({ title: 'File Too Large', text: `${file.name} exceeds 5MB.`, icon: 'error', confirmButtonColor: '#c0392b' });
            return;
        }
        const reader = new FileReader();
        reader.onload = async (e) => {
            const compressed = await compressImage(e.target.result);
            serviceUploadedPhotos.push(compressed);
            const idx = serviceUploadedPhotos.length - 1;
            const thumb = document.createElement('div');
            thumb.classList.add('preview-thumb');
            thumb.innerHTML = `<img src="${compressed}" alt="preview">
                <button class="remove-photo" onclick="removeServicePhoto(this, ${idx})" title="Remove"><i class="fas fa-times"></i></button>`;
            grid.appendChild(thumb);
        };
        reader.readAsDataURL(file);
    });
    input.value = '';
}

function removeServicePhoto(btn, idx) {
    serviceUploadedPhotos[idx] = null;
    btn.closest('.preview-thumb').remove();
}

async function saveServiceEntry() {
    const config = SERVICE_CONFIG[activeCategory];
    if (!config) return;

    const fieldData = {};
    let valid = true;
    config.fields.forEach(f => {
        const el = document.getElementById(f.id);
        if (!el) return;
        const val = el.value.trim();
        if (f.required && !val) {
            Swal.fire({ title: 'Required Field', text: `Please fill in: ${f.label}`, icon: 'warning', confirmButtonColor: '#1a3c34' });
            valid = false;
            return;
        }
        fieldData[f.id.replace('f_', '')] = val;
    });
    if (!valid) return;

    const photos = serviceUploadedPhotos.filter(p => p !== null);
    const title = fieldData.address || fieldData.area || 'Submission';
    const descParts = Object.entries(fieldData)
        .filter(([k]) => k !== 'address')
        .map(([k, v]) => v ? `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}` : null)
        .filter(Boolean);
    const description = descParts.join(' | ');

    const item = {
        title,
        address: fieldData.address || '',
        description,
        photos,
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        rawFields: fieldData
    };

    if (editingDocId) {
        if (photos.length === 0) delete item.photos;
        await updateData(activeCategory, editingDocId, item);
        editingDocId = null;
        closeModal('serviceModal');
        Swal.fire({ title: 'Updated! ✅', icon: 'success', confirmButtonColor: '#1a3c34' }).then(() => openViewGallery(activeCategory));
    } else {
        await saveData(activeCategory, item);
        closeModal('serviceModal');
        Swal.fire({ title: 'Submitted! 🎉', text: 'We will reach out to you shortly.', icon: 'success', confirmButtonColor: '#1a3c34' })
            .then(() => openViewGallery(activeCategory));
    }
}

function prepareAddForm() {
    document.getElementById('siteAddress').value = '';
    document.getElementById('siteTitle').value = '';
    document.getElementById('siteDescription').value = '';
    document.getElementById('photoPreviewGrid').innerHTML = '';
    document.getElementById('photoInput').value = '';
    uploadedPhotosBase64 = [];

    const modalTitle = document.querySelector('#addSiteModal h3');
    const modalSub = document.querySelector('#addSiteModal p');
    const addressField = document.getElementById('siteAddress').parentElement;
    const titleInput = document.getElementById('siteTitle');
    const descInput = document.getElementById('siteDescription');
    const manageBtn = document.querySelector('#addSiteModal .modal-btn-manage');
    const saveBtn = document.querySelector('#addSiteModal .modal-btn-primary');
    const isAdmin = !!auth.currentUser;

    if (manageBtn) manageBtn.style.display = isAdmin ? 'flex' : 'none';

    if (activeCategory === 'selling') {
        modalTitle.textContent = 'Sell Your Property';
        modalSub.textContent = 'Submit your property details for DPV to market it.';
        addressField.style.display = 'block';
        titleInput.placeholder = 'Property / Plot Title';
        descInput.placeholder = 'Your contact number & property details (sqft, price, etc.)';
        saveBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Property';
    } else if (activeCategory === 'market') {
        modalTitle.textContent = 'Add Market Insight';
        modalSub.textContent = 'Share latest real estate news.';
        addressField.style.display = 'none';
        titleInput.placeholder = 'Insight Heading';
        descInput.placeholder = 'Write analysis...';
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Site';
    } else if (activeCategory === 'plots') {
        modalTitle.textContent = 'Add New Plot';
        modalSub.textContent = 'List a new residential plot.';
        addressField.style.display = 'block';
        titleInput.placeholder = 'Plot Title';
        descInput.placeholder = 'Plot details...';
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Site';
    } else {
        modalTitle.textContent = 'Add New Site';
        modalSub.textContent = 'Upload property details.';
        addressField.style.display = 'block';
        titleInput.placeholder = 'Property Title';
        descInput.placeholder = 'Property details...';
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Site';
    }
}

function previewPhotos(input) {
    const grid = document.getElementById('photoPreviewGrid');
    const files = Array.from(input.files);

    const currentPhotosCount = uploadedPhotosBase64.filter(p => p !== null).length;

    // Safety check: Max 3 photos total
    if (currentPhotosCount + files.length > 3) {
        Swal.fire({
            title: "Limit Exceeded",
            text: "To stay within free storage limits, please upload maximum 3 photos per property.",
            icon: "warning",
            confirmButtonColor: "#1a3c34"
        });
        return;
    }

    files.forEach(file => {
        // Safety check: 5MB File size limit
        if (file.size > 5 * 1024 * 1024) {
            Swal.fire({
                title: "File Too Large",
                text: `${file.name} is over 5MB. Please choose a smaller file.`,
                icon: "error",
                confirmButtonColor: "#c0392b"
            });
            return;
        }

        const reader = new FileReader();
        reader.onload = async function (e) {
            const rawBase64 = e.target.result;
            const compressedBase64 = await compressImage(rawBase64);
            uploadedPhotosBase64.push(compressedBase64);
            const idx = uploadedPhotosBase64.length - 1;
            const thumb = document.createElement('div');
            thumb.classList.add('preview-thumb');
            thumb.innerHTML = `
                <img src="${compressedBase64}" alt="preview">
                <button class="remove-photo" onclick="removePreviewPhoto(this, ${idx})" title="Remove">
                    <i class="fas fa-times"></i>
                </button>`;
            grid.appendChild(thumb);
        };
        reader.readAsDataURL(file);
    });
    input.value = '';
}

function compressImage(base64Str, maxWidth = 900, quality = 0.6) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;

        img.onload = () => {
            const canvas = document.createElement('canvas');

            let width = img.width;
            let height = img.height;

            // Resize if larger than maxWidth
            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Force JPEG output (smaller than PNG)
            const compressedBase64 = canvas.toDataURL('image/jpeg', quality);

            resolve(compressedBase64);
        };
    });
}

function removePreviewPhoto(btn, idx) {
    uploadedPhotosBase64[idx] = null;
    btn.closest('.preview-thumb').remove();
}

async function saveSite() {
    const address = document.getElementById('siteAddress').value.trim();
    const title = document.getElementById('siteTitle').value.trim();
    const description = document.getElementById('siteDescription').value.trim();
    const photos = uploadedPhotosBase64.filter(p => p !== null);

    if (activeCategory !== 'market' && !address) { alert('Please enter an address.'); return; }
    if (!title) { alert('Please enter a title.'); return; }
    if (activeCategory !== 'market' && photos.length === 0 && !editingDocId) { alert('Please upload at least one photo.'); return; }

    const item = {
        title,
        address: activeCategory === 'market' ? '' : address,
        description,
        photos,
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    };

    if (editingDocId) {
        // Keep existing photos if no new ones uploaded
        if (photos.length === 0) delete item.photos;
        await updateData(activeCategory, editingDocId, item);
        editingDocId = null;
        closeModal('addSiteModal');
        Swal.fire({ title: 'Updated! ✅', icon: 'success', confirmButtonColor: '#1a3c34' }).then(() => openViewGallery(activeCategory));
    } else {
        await saveData(activeCategory, item);
        closeModal('addSiteModal');
        Swal.fire({ title: 'Published! 🎉', icon: 'success', confirmButtonColor: '#1a3c34' }).then(() => openViewGallery(activeCategory));
    }
}

async function openViewGallery(category) {
    activeCategory = category;
    const isAdmin = !!auth.currentUser;
    await renderGallery(isAdmin, category);
    showModal('viewSitesModal');
}

async function renderGallery(ownerMode, category) {
    const gallery = document.getElementById('sitesGallery');
    const items = await getData(category);
    gallery.innerHTML = '';

    const gTitle = document.getElementById('galleryModeTitle');
    const gSub = document.getElementById('galleryModeSub');

    let titleText = 'Properties';
    if (category === 'plots') titleText = ownerMode ? 'My Plots' : 'Available Plots';
    else if (category === 'market') titleText = ownerMode ? 'Market News' : 'Market Analysis';
    else if (category === 'selling') titleText = ownerMode ? 'Property Submissions' : 'Listed for Sale';
    else if (category === 'management') titleText = ownerMode ? 'Management Requests' : 'Managed Properties';
    else if (category === 'commercial') titleText = ownerMode ? 'Commercial Listings' : 'Commercial Properties';
    else if (category === 'construction') titleText = ownerMode ? 'Construction Requests' : 'Construction Projects';
    else if (category === 'land') titleText = ownerMode ? 'Land Proposals' : 'Land Projects';
    else titleText = ownerMode ? 'My Listings' : 'Available Properties';

    if (gTitle) gTitle.innerHTML = ownerMode ? `${titleText} <span class="owner-mode-badge"><i class="fas fa-shield-alt"></i> Admin</span>` : titleText;
    if (gSub) gSub.textContent = ownerMode ? 'Admin view — manage entries' : 'Browse published listings';

    if (items.length === 0) {
        gallery.innerHTML = `<div class="empty-gallery"><h4>No Items Found</h4><p>Check back later!</p></div>`;
        return;
    }

    items.forEach(item => {
        const photosHTML = item.photos.map(src => `<div class="site-gallery-photo" onclick="openLightbox('${src}')"><img src="${src}" loading="lazy"></div>`).join('');
        const card = document.createElement('div');
        card.classList.add('site-card-gallery');
        if (category === 'market') card.classList.add('market-card');
        card.innerHTML = `
            ${item.photos.length > 0 ? `<div class="site-gallery-photos">${photosHTML}</div>` : ''}
            <div class="site-card-info">
                <h4>${item.title}</h4>
                ${item.address ? `<div class="site-card-address"><i class="fas fa-map-marker-alt"></i> ${item.address}</div>` : ''}
                ${item.description ? `<p class="site-card-desc">${item.description}</p>` : ''}
                <div class="site-card-meta">
                    <span class="site-card-date"><i class="fas fa-calendar-alt"></i> ${item.date}</span>
                    <div class="admin-card-actions">
                        <button class="edit-site-btn ${ownerMode ? 'owner-logged' : ''}" onclick="editItem('${item.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="delete-site-btn ${ownerMode ? 'owner-logged' : ''}" onclick="deleteItem('${item.id}')">
                            <i class="fas fa-trash-alt"></i> Delete
                        </button>
                    </div>
                </div>
            </div>`;
        gallery.appendChild(card);
    });
}

async function deleteItem(id) {
    if (!auth.currentUser) return;
    const result = await Swal.fire({ title: 'Delete entry?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#c0392b' });
    if (result.isConfirmed) {
        await deleteFromCloud(activeCategory, id);
        await renderGallery(true, activeCategory);
        Swal.fire({ title: 'Deleted', icon: 'success', timer: 1000, showConfirmButton: false });
    }
}

async function editItem(id) {
    if (!auth.currentUser) return;
    const items = await getData(activeCategory);
    const item = items.find(i => i.id === id);
    if (!item) return;

    editingDocId = id;
    closeModal('viewSitesModal'); // close gallery first

    const serviceCategories = ['management', 'commercial', 'construction', 'land'];

    if (serviceCategories.includes(activeCategory)) {
        openServiceModal(activeCategory);
        setTimeout(() => {
            const config = SERVICE_CONFIG[activeCategory];
            const raw = item.rawFields || {};
            config.fields.forEach(f => {
                const el = document.getElementById(f.id);
                const key = f.id.replace('f_', '');
                if (el && raw[key] !== undefined) el.value = raw[key];
            });
            const btn = document.getElementById('serviceModalSubmitBtn');
            if (btn) btn.innerHTML = '<i class="fas fa-save"></i> Update Entry';
        }, 50);
    } else {
        openAddModal(activeCategory);
        setTimeout(() => {
            document.getElementById('siteAddress').value = item.address || '';
            document.getElementById('siteTitle').value = item.title || '';
            document.getElementById('siteDescription').value = item.description || '';
            const saveBtn = document.querySelector('#addSiteModal .modal-btn-primary');
            if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-save"></i> Update Entry';
        }, 50);
    }
}

function openLightbox(src) { document.getElementById('lightboxImg').src = src; document.getElementById('lightboxOverlay').classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeLightbox() { document.getElementById('lightboxOverlay').classList.remove('active'); document.body.style.overflow = ''; }
function showModal(id) { document.getElementById(id).classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('active'); document.body.style.overflow = ''; }
function closeAddSiteModal() { editingDocId = null; closeModal('addSiteModal'); }
function closeServiceModal() { editingDocId = null; closeModal('serviceModal'); }
function openOwnerGallery() { closeModal('addSiteModal'); closeModal('serviceModal'); openViewGallery(activeCategory); }
function closeOwnerGallery() { closeModal('viewSitesModal'); }

/* ====================================================
   REVIEWS SYSTEM
   ==================================================== */

let selectedStars = 0;
let reviewPhotos = [];

function openReviewModal() {
    // Reset form
    document.getElementById('reviewName').value = '';
    document.getElementById('reviewService').value = '';
    document.getElementById('reviewLocation').value = '';
    document.getElementById('reviewPropType').value = '';

    // Reset radio buttons
    document.querySelectorAll('input[name="reviewRecommend"]').forEach(r => r.checked = false);

    document.getElementById('reviewText').value = '';
    document.getElementById('reviewPhotoPreviewGrid').innerHTML = '';
    document.getElementById('reviewPhotoInput').value = '';
    reviewPhotos = [];
    setStars(0);
    showModal('reviewModal');
}

function closeReviewModal() { closeModal('reviewModal'); }

function setStars(val) {
    selectedStars = val;
    document.querySelectorAll('#starRating i').forEach(star => {
        star.classList.toggle('active', parseInt(star.dataset.val) <= val);
    });
    updateStarLabel(val);
}

function updateStarLabel(val) {
    const label = document.getElementById('starRatingLabel');
    if (!label) return;
    const texts = ['', 'Poor', 'Average', 'Good', 'Very Good', 'Excellent'];
    label.innerText = val > 0 ? texts[val] : 'Select a rating';
}

// Star hover & click init — runs after DOM ready
document.addEventListener('DOMContentLoaded', () => {
    const stars = document.querySelectorAll('#starRating i');
    stars.forEach(star => {
        star.addEventListener('mouseover', () => {
            const hoverVal = parseInt(star.dataset.val);
            stars.forEach(s => s.classList.toggle('hovered', parseInt(s.dataset.val) <= hoverVal));
            updateStarLabel(hoverVal);
        });
        star.addEventListener('mouseleave', () => {
            stars.forEach(s => s.classList.remove('hovered'));
            updateStarLabel(selectedStars);
        });
        star.addEventListener('click', () => setStars(parseInt(star.dataset.val)));
    });
});

function previewReviewPhotos(input) {
    const grid = document.getElementById('reviewPhotoPreviewGrid');
    const files = Array.from(input.files);
    if (reviewPhotos.filter(p => p !== null).length + files.length > 3) {
        Swal.fire({ title: 'Limit Exceeded', text: 'Maximum 3 photos.', icon: 'warning', confirmButtonColor: '#1a3c34' });
        return;
    }
    files.forEach(file => {
        if (file.size > 5 * 1024 * 1024) {
            Swal.fire({ title: 'File Too Large', text: `${file.name} exceeds 5MB.`, icon: 'error', confirmButtonColor: '#c0392b' });
            return;
        }
        const reader = new FileReader();
        reader.onload = async (e) => {
            const compressed = await compressImage(e.target.result);
            reviewPhotos.push(compressed);
            const idx = reviewPhotos.length - 1;
            const thumb = document.createElement('div');
            thumb.classList.add('preview-thumb');
            thumb.innerHTML = `<img src="${compressed}" alt="preview">
                <button class="remove-photo" onclick="removeReviewPhoto(this,${idx})" title="Remove"><i class="fas fa-times"></i></button>`;
            grid.appendChild(thumb);
        };
        reader.readAsDataURL(file);
    });
    input.value = '';
}

function removeReviewPhoto(btn, idx) {
    reviewPhotos[idx] = null;
    btn.closest('.preview-thumb').remove();
}

async function saveReview() {
    const name = document.getElementById('reviewName').value.trim();
    const service = document.getElementById('reviewService').value;
    const location = document.getElementById('reviewLocation').value.trim();
    const propertyType = document.getElementById('reviewPropType').value;
    const recommendRadio = document.querySelector('input[name="reviewRecommend"]:checked');
    const recommend = recommendRadio ? recommendRadio.value : '';
    const text = document.getElementById('reviewText').value.trim();
    const photos = reviewPhotos.filter(p => p !== null);

    if (!name) { Swal.fire({ title: 'Name required', icon: 'warning', confirmButtonColor: '#1a3c34' }); return; }
    if (!service) { Swal.fire({ title: 'Please select a service', icon: 'warning', confirmButtonColor: '#1a3c34' }); return; }
    if (!location) { Swal.fire({ title: 'Location required', icon: 'warning', confirmButtonColor: '#1a3c34' }); return; }
    if (!propertyType) { Swal.fire({ title: 'Property Type required', icon: 'warning', confirmButtonColor: '#1a3c34' }); return; }
    if (selectedStars === 0) { Swal.fire({ title: 'Please select a rating', icon: 'warning', confirmButtonColor: '#1a3c34' }); return; }
    if (!recommend) { Swal.fire({ title: 'Please select if you recommend DPV', icon: 'warning', confirmButtonColor: '#1a3c34' }); return; }
    if (!text) { Swal.fire({ title: 'Review text required', icon: 'warning', confirmButtonColor: '#1a3c34' }); return; }

    const review = {
        name, service, propertyType, location, rating: selectedStars, text, recommend, photos,
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    };

    await saveData('reviews', review);
    closeReviewModal();
    Swal.fire({ title: 'Thank you! 🙏', text: 'Your review has been submitted.', icon: 'success', confirmButtonColor: '#1a3c34' });
    loadReviews();
}

async function loadReviews() {
    const grid = document.getElementById('reviewsGrid');
    if (!grid) return;
    grid.innerHTML = '<div class="review-loading"><i class="fas fa-spinner fa-spin"></i> Loading reviews...</div>';
    const reviews = await getData('reviews');
    const isAdmin = !!auth.currentUser;
    grid.innerHTML = '';

    if (reviews.length === 0) {
        grid.innerHTML = '<div class="review-empty"><i class="fas fa-comment-slash"></i><p>No reviews yet. Be the first to share!</p></div>';
        return;
    }

    reviews.forEach(r => {
        const stars = Array.from({ length: 5 }, (_, i) =>
            `<i class="fas fa-star ${i < r.rating ? 'star-filled' : 'star-empty'}"></i>`).join('');
        const photoHTML = (r.photos || []).map(src =>
            `<div class="review-photo" onclick="openLightbox('${src}')"><img src="${src}" loading="lazy"></div>`).join('');

        const card = document.createElement('div');
        card.classList.add('review-card');
        card.innerHTML = `
            <div class="review-header" style="justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 0.8rem; flex: 1;">
                    <div class="reviewer-avatar">${r.name.charAt(0).toUpperCase()}</div>
                    <div class="reviewer-info">
                        <strong>${r.name}</strong>
                        <div class="review-badges">
                            <span class="review-service-badge">${r.service}</span>
                            ${r.propertyType ? `<span class="review-type-badge">${r.propertyType}</span>` : ''}
                        </div>
                    </div>
                </div>
                ${isAdmin ? `<button class="delete-review-btn" onclick="deleteReview('${r.id}')" title="Delete"><i class="fas fa-trash-alt"></i></button>` : ''}
            </div>
            
            <div class="review-meta-row">
                <div class="review-stars">${stars}</div>
                ${r.location ? `<div class="review-location"><i class="fas fa-map-marker-alt"></i> ${r.location}</div>` : ''}
            </div>

            <p class="review-text">${r.text}</p>
            ${photoHTML ? `<div class="review-photos">${photoHTML}</div>` : ''}
            
            <div class="review-footer">
                ${r.recommend === 'Yes'
                ? `<div class="review-recommend yes"><i class="fas fa-thumbs-up"></i> Recommends DPV</div>`
                : r.recommend === 'No'
                    ? `<div class="review-recommend no"><i class="fas fa-thumbs-down"></i> Does not recommend</div>`
                    : ''}
                <div class="review-date">${r.date}</div>
            </div>`;
        grid.appendChild(card);
    });
}

async function deleteReview(id) {
    if (!auth.currentUser) return;
    const result = await Swal.fire({ title: 'Delete review?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#c0392b' });
    if (result.isConfirmed) {
        await deleteFromCloud('reviews', id);
        loadReviews();
        Swal.fire({ title: 'Deleted', icon: 'success', timer: 1000, showConfirmButton: false });
    }
}

/* ====================================================
   GLOBAL EXPORTS (For HTML onclick handlers)
   ==================================================== */
window.handleAdminAuth = handleAdminAuth;
window.handleCategoryAction = handleCategoryAction;
window.toggleAdminMenu = toggleAdminMenu;
window.openAddModal = openAddModal;
window.openAdminAddModal = openAdminAddModal;
window.openServiceModal = openServiceModal;
window.saveServiceEntry = saveServiceEntry;
window.previewServicePhotos = previewServicePhotos;
window.removeServicePhoto = removeServicePhoto;
window.openViewGallery = openViewGallery;
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.showModal = showModal;
window.closeModal = closeModal;
window.closeAddSiteModal = closeAddSiteModal;
window.closeServiceModal = closeServiceModal;
window.openOwnerGallery = openOwnerGallery;
window.closeOwnerGallery = closeOwnerGallery;
window.previewPhotos = previewPhotos;
window.removePreviewPhoto = removePreviewPhoto;
window.saveSite = saveSite;
window.deleteItem = deleteItem;
window.editItem = editItem;
window.openReviewModal = openReviewModal;
window.closeReviewModal = closeReviewModal;
window.previewReviewPhotos = previewReviewPhotos;
window.removeReviewPhoto = removeReviewPhoto;
window.saveReview = saveReview;
window.deleteReview = deleteReview;

/* ====================================================
   HERO MOUSE PARALLAX
   ==================================================== */
function initHeroParallax() {
    const heroBg = document.getElementById('heroBg');
    const heroContent = document.getElementById('heroContent');
    if (!heroBg || !heroContent) return;

    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;

    window.addEventListener('mousemove', (e) => {
        targetX = (e.clientX / window.innerWidth) - 0.5;
        targetY = (e.clientY / window.innerHeight) - 0.5;
    });

    function parallaxLoop() {
        currentX += (targetX - currentX) * 0.055;
        currentY += (targetY - currentY) * 0.055;
        
        // Background wrapper moves opposite to mouse
        heroBg.style.transform = `translate(${currentX * -20}px, ${currentY * -20}px)`;
        // Content moves slightly in same direction
        heroContent.style.transform = `translate(${currentX * 5}px, ${currentY * 5}px)`;
        
        requestAnimationFrame(parallaxLoop);
    }
    parallaxLoop();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroParallax);
} else {
    initHeroParallax();
}