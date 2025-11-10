// Map and tile layer setup
const map = L.map('map', {
    center: [20, 0],
    zoom: 3,
    dragging: true,
    zoomControl: true,
    tap: true,
    touchZoom: true,
    scrollWheelZoom: true,
});
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CartoDB',
    maxZoom: 18,
    detectRetina: true
}).addTo(map);

// Marker cluster
const markerGroup = L.markerClusterGroup().addTo(map);

let allAlumni = [];
let cityFilterValue = '';
let topicFilterValue = '';
let yearFilterValue = '';
let companyFilterValue = '';
let searchFilterValue = '';



// Data cleaning & validation function
function validateForm() {
    const name = document.getElementById('name').value.trim();
    const year = document.getElementById('year').value.trim();
    const city = document.getElementById('city').value.trim();
    const lat = parseFloat(document.getElementById('lat').value);
    const lng = parseFloat(document.getElementById('lng').value);
    const company = document.getElementById('company').value.trim();
    const role = document.getElementById('role').value.trim();
    const link = document.getElementById('link').value.trim();
    // Required fields
    if (!name || !year || !city || !company || !role || isNaN(lat) || isNaN(lng)) {
        alert("Please fill all the required fields correctly.");
        return false;
    }
    // Latitude/longitude range
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        alert("Latitude and longitude must be valid geo-values.");
        return false;
    }
    // Contact sanity check (LinkedIn/email)
    if (link && !(link.includes('linkedin') || link.includes('@'))) {
        alert("Contact must be a valid email or LinkedIn URL.");
        return false;
    }
    // Prevent only-whitespace entries
    if (/^\s*$/.test(name) || /^\s*$/.test(year) || /^\s*$/.test(city) || /^\s*$/.test(company) || /^\s*$/.test(role)) {
        alert("Fields cannot be just spaces.");
        return false;
    }
    // Optionally: check file size for photo
    const photoInput = document.getElementById('photo');
    if (photoInput && photoInput.files.length > 0 && photoInput.files[0].size > 2 * 1024 * 1024) {
        alert("Photo size must be under 2MB.");
        return false;
    }
    return true;
}

async function loadAlumniData() {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/alumni/');
        const data = await response.json();
        allAlumni = data;
        renderMarkers(getFilteredAlumni());
        populateYearDropdown(data);
        populateCompanyDropdown(data);
        populateTopicDropdown(data);
    } catch (e) {
        console.error('Failed to load alumni data:', e);
    }
}


function getFilteredAlumni() {
    return allAlumni.filter(alum => {
        let cityOk = !cityFilterValue || (alum.city && alum.city.toLowerCase().includes(cityFilterValue.toLowerCase()));
        let topicOk = !topicFilterValue || (alum.role && alum.role.toLowerCase().includes(topicFilterValue.toLowerCase()));
        let yearOk = !yearFilterValue || (alum.year && alum.year.toString().includes(yearFilterValue));
        let companyOk = !companyFilterValue || (alum.company && alum.company.toLowerCase().includes(companyFilterValue.toLowerCase()));
        let searchOk = !searchFilterValue || [
            alum.name,
            alum.company,
            alum.role,
            alum.city,
            alum.year ? String(alum.year) : ''   // <-- **add this line**
        ].filter(Boolean).some(field => field.toLowerCase().includes(searchFilterValue));
        return cityOk && topicOk && yearOk && companyOk && searchOk;
    });
}



function renderMarkers(alumniData) {
    markerGroup.clearLayers();

    // Group alumni by lat/lng
    const groupByLocation = {};
    alumniData.forEach(alum => {
        const lat = parseFloat(alum.lat);
        const lng = parseFloat(alum.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
            const key = `${lat},${lng}`;
            if (!groupByLocation[key]) groupByLocation[key] = [];
            groupByLocation[key].push(alum);
        }
    });

    Object.entries(groupByLocation).forEach(([key, alumnis]) => {
        const [lat, lng] = key.split(',').map(Number);

        // If only one, do regular popup as before:
        if (alumnis.length === 1) {
            const alum = alumnis[0];
            let imgHtml = '';
            if (alum.photo) {
                let photoUrl = alum.photo;
                if (!photoUrl.startsWith('http') && !photoUrl.startsWith('/')) {
                    photoUrl = '/media/' + photoUrl;
                }
                imgHtml = `<div style="width:100%;text-align:center;margin-bottom:8px;">
                    <img src="${photoUrl}" 
                        style="width:70px;height:70px;object-fit:cover;border-radius:50%;display:inline-block;cursor:pointer;"
                        onclick="showBigImage('${photoUrl}')"/>
                </div>`;
            }
            let textHtml =
                `<b>${alum.name}</b> (${alum.year})<br>` +
                `<span style='color:#666'>${alum.city}</span><br>` +
                `<strong>Company:</strong> ${alum.company}<br>` +
                `<strong>Role:</strong> ${alum.role}<br>` +
                `${alum.story ? `<div style='margin-top:6px;'>${alum.story}</div>` : ''}` +
                `${alum.link
                    ? alum.link.startsWith('http')
                        ? `<div style='margin-top:4px;'><strong>Contact:</strong> <a href='${alum.link}' target='_blank' rel='noopener'>${alum.link}</a></div>`
                        : `<div style='margin-top:4px;'><strong>Contact:</strong> <span>${alum.link}</span></div>`
                    : ''
                }`;

            let profilePopup = `${imgHtml}${textHtml}`;

            L.marker([lat, lng])
                .addTo(markerGroup)
                .bindPopup(profilePopup);

        } else {
            // Multiple alumni at same spot: cluster popup
            let listing = alumnis.map((alum, idx) => {
                let photoHtml = alum.photo
                    ? `<img src="${alum.photo.startsWith('http') || alum.photo.startsWith('/') ? alum.photo : '/media/' + alum.photo}" style="width:28px;height:28px;border-radius:50%;vertical-align:middle;margin-right:7px;">`
                    : '';
                return `<div style="margin-bottom:5px;cursor:pointer;" onclick="showAlumDetails('${key}',${idx})">
                    ${photoHtml}<span style="font-weight:600;">${alum.name}</span>
                </div>`;
            }).join('');
            let clusterPopupHtml = `<div style="text-align:left;">
  <div style="font-size:1.08rem;font-weight:bold;margin-bottom:6px;">
    People here (${alumnis.length}):
  </div>
  ${listing}
</div>`;


            L.marker([lat, lng])
                .addTo(markerGroup)
                .bindPopup(clusterPopupHtml);

            // Attach details for JS info box display
            window._alumniGroups = window._alumniGroups || {};
            window._alumniGroups[key] = alumnis;
        }
    });
}

// Helper for cluster listing detail popup
window.showAlumDetails = function (key, idx) {
    const alum = (window._alumniGroups && window._alumniGroups[key] && window._alumniGroups[key][idx]);
    if (!alum) return;

    let imgHtml = '';
    if (alum.photo) {
        let photoUrl = alum.photo.startsWith('http') || alum.photo.startsWith('/') ? alum.photo : '/media/' + alum.photo;
        imgHtml = `<div style="width:100%;text-align:center;margin-bottom:8px;">
            <img src="${photoUrl}" 
                style="width:70px;height:70px;object-fit:cover;border-radius:50%;display:inline-block;cursor:pointer;"
                onclick="showBigImage('${photoUrl}')"/>
        </div>`;
    }
    let textHtml =
        `<b>${alum.name}</b> (${alum.year})<br>` +
        `<span style='color:#666'>${alum.city}</span><br>` +
        `<strong>Company:</strong> ${alum.company}<br>` +
        `<strong>Role:</strong> ${alum.role}<br>` +
        `${alum.story ? `<div style='margin-top:6px;'>${alum.story}</div>` : ''}` +
        `${alum.link
            ? alum.link.startsWith('http')
                ? `<div style='margin-top:4px;'><strong>Contact:</strong> <a href='${alum.link}' target='_blank' rel='noopener'>${alum.link}</a></div>`
                : `<div style='margin-top:4px;'><strong>Contact:</strong> <span>${alum.link}</span></div>`
            : ''
        }`;
    let profilePopup = `${imgHtml}${textHtml}`;

    // Show popup on current map center
    L.popup()
        .setLatLng(map.getCenter())
        .setContent(profilePopup)
        .openOn(map);
};


// Filter bar
if (document.getElementById('cityFilter')) {
    document.getElementById('cityFilter').addEventListener('input', function (e) {
        cityFilterValue = e.target.value;
        renderMarkers(getFilteredAlumni());
    });
}

if (document.getElementById('topicFilter')) {
    document.getElementById('topicFilter').addEventListener('change', function (e) {
        topicFilterValue = e.target.value;
        renderMarkers(getFilteredAlumni());
    });
}
if (document.getElementById('yearFilter')) {
    document.getElementById('yearFilter').addEventListener('change', function (e) {
        yearFilterValue = e.target.value;
        renderMarkers(getFilteredAlumni());
    });
}
if (document.getElementById('companyFilter')) {
    document.getElementById('companyFilter').addEventListener('change', function (e) {
        companyFilterValue = e.target.value;
        renderMarkers(getFilteredAlumni());
    });
}
if (document.getElementById('searchBar')) {
    document.getElementById('searchBar').addEventListener('input', function (e) {
        searchFilterValue = e.target.value.trim().toLowerCase();
        renderMarkers(getFilteredAlumni());
    });
}


window.resetFilters = function () {
    if (document.getElementById('cityFilter')) document.getElementById('cityFilter').value = '';
    if (document.getElementById('topicFilter')) document.getElementById('topicFilter').value = '';
    if (document.getElementById('yearFilter')) document.getElementById('yearFilter').value = '';
    if (document.getElementById('companyFilter')) document.getElementById('companyFilter').value = '';
    if (document.getElementById('searchBar')) document.getElementById('searchBar').value = '';
    cityFilterValue = '';
    topicFilterValue = '';
    yearFilterValue = '';
    companyFilterValue = '';
    searchFilterValue = '';
    renderMarkers(allAlumni);
};

function populateYearDropdown(alumniData) {
    const select = document.getElementById('yearFilter');
    if (!select) return;
    let years = [...new Set(alumniData.map(a => a.year).filter(Boolean))].sort();
    select.innerHTML = '<option value="">All Years</option>' +
        years.map(y => `<option value="${y}">${y}</option>`).join('');
}

function populateCompanyDropdown(alumniData) {
    const select = document.getElementById('companyFilter');
    if (!select) return;
    let companies = [...new Set(alumniData.map(a => a.company).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    select.innerHTML = '<option value="">All Companies</option>' +
        companies.map(c => `<option value="${c}">${c}</option>`).join('');
}

function populateTopicDropdown(alumniData) {
    const select = document.getElementById('topicFilter');
    if (!select) return;
    let roles = [...new Set(alumniData.map(a => a.role).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    select.innerHTML = '<option value="">All Topics</option>' +
        roles.map(t => `<option value="${t}">${t}</option>`).join('');
}


// Form submit with validation call
if (document.getElementById('storyForm')) {
    document.getElementById('storyForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        if (!validateForm()) return;
        const formData = new FormData();
        formData.append('name', document.getElementById('name').value);
        formData.append('year', document.getElementById('year').value);
        formData.append('city', document.getElementById('city').value);
        formData.append('lat', parseFloat(document.getElementById('lat').value));
        formData.append('lng', parseFloat(document.getElementById('lng').value));
        formData.append('company', document.getElementById('company').value);
        formData.append('role', document.getElementById('role').value);
        formData.append('story', document.getElementById('story').value);
        formData.append('link', document.getElementById('link').value);
        const photoInput = document.getElementById('photo');
        if (photoInput && photoInput.files.length > 0) {
            formData.append('photo', photoInput.files[0]);
        }
        await fetch('http://127.0.0.1:8000/api/alumni/', {
            method: 'POST',
            body: formData
        });
        loadAlumniData();
        document.getElementById('successMsg').style.display = "block";
        setTimeout(() => { document.getElementById('successMsg').style.display = "none" }, 2200);
        e.target.reset();
    });
}

loadAlumniData();

// Large label overlays
function addLargeLabel(text, lat, lng, fontSize = 32) {
    L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'custom-label',
            html: `<span style="font-size:${fontSize}px;font-weight:bold;color:#00215b;background:#ffffffc0;padding:5px 14px;border-radius:8px;border: 2px solid #cdf;">${text}</span>`,
            iconAnchor: [fontSize / 2, fontSize / 2]
        }),
        interactive: false
    }).addTo(map);
}

// Modal Image Viewer Functions
window.showBigImage = function (url) {
    const modal = document.getElementById('imgModal');
    const img = document.getElementById('imgModalImg');
    img.src = url;
    modal.style.display = 'flex';
    modal.style.opacity = '0';
    setTimeout(() => { modal.style.opacity = '1'; }, 2);
}

window.closeBigImage = function () {
    const modal = document.getElementById('imgModal');
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.display = 'none';
    }, 200);
}
// --- Alumni Export Modal Logic ---
// Alumni Export Modal Logic - SINGLE VERSION ONLY!
document.getElementById('exportCsvBtn').onclick = function () {
    showAlumniExportModal();
};
let modalListenersAttached = false;
function attachModalListenersOnce() {
    if (modalListenersAttached) return;
    modalListenersAttached = true;
    attachModalListeners();
}


function showAlumniExportModal() {
    const modal = document.getElementById('alumniExportModal');
    modal.style.display = 'flex';

    populateModalFilters(allAlumni);
    renderAlumniSelectList(allAlumni, false);

    // 👇 Move this AFTER rendering and populating
    attachModalListenersOnce();
}





function closeAlumniExportModal() {
    document.getElementById('alumniExportModal').style.display = 'none';
}

function populateModalFilters(alumniList) {
    const years = [...new Set(alumniList.map(a => a.year).filter(Boolean))].sort();
    const companies = [...new Set(alumniList.map(a => a.company).filter(Boolean))].sort();
    const roles = [...new Set(alumniList.map(a => a.role).filter(Boolean))].sort();
    const cities = [...new Set(alumniList.map(a => a.city).filter(Boolean))].sort();
    document.getElementById('modalYearFilter').innerHTML =
        `<option value="">All Years</option>` + years.map(y => `<option value="${y}">${y}</option>`).join('');
    document.getElementById('modalCompanyFilter').innerHTML =
        `<option value="">All Companies</option>` + companies.map(c => `<option value="${c}">${c}</option>`).join('');
    document.getElementById('modalRoleFilter').innerHTML =
        `<option value="">All Roles</option>` + roles.map(r => `<option value="${r}">${r}</option>`).join('');
    document.getElementById('modalCityFilter').innerHTML =
        `<option value="">All Cities</option>` + cities.map(c => `<option value="${c}">${c}</option>`).join('');
}

function getModalFilteredAlumni() {
    const list = allAlumni;

    // Always trim AND lowercase for every filter
    const yearVal = document.getElementById('modalYearFilter').value.trim().toLowerCase();
    const compVal = document.getElementById('modalCompanyFilter').value.trim().toLowerCase();
    const roleVal = document.getElementById('modalRoleFilter').value.trim().toLowerCase();
    const cityVal = document.getElementById('modalCityFilter').value.trim().toLowerCase();
    const searchVal = document.getElementById('alumniModalSearch').value.trim().toLowerCase();

    console.log("🔍 Search triggered:", searchVal);

    return list.filter(a => {
        // Allow substring match for dropdowns (not strict match)
        const matchYear = !yearVal || (a.year && String(a.year).toLowerCase().includes(yearVal));
        const matchComp = !compVal || (a.company && a.company.toLowerCase().includes(compVal));
        const matchRole = !roleVal || (a.role && a.role.toLowerCase().includes(roleVal));
        const matchCity = !cityVal || (a.city && a.city.toLowerCase().includes(cityVal));

        // Combine all possible searchable fields
        const combined = [
            a.name,
            a.company,
            a.role,
            a.city,
            a.year ? String(a.year) : ''
        ].filter(Boolean).join(' ').toLowerCase();

        const matchSearch = !searchVal || combined.includes(searchVal);

        const include = matchYear && matchComp && matchRole && matchCity && matchSearch;

        if (searchVal && include) {
            console.log(`✅ Matched: ${a.name} (${combined})`);
        }

        return include;
    });
}





// FILTERS: fire on 'change'
function attachModalListeners() {
    ['modalYearFilter', 'modalCompanyFilter', 'modalRoleFilter', 'modalCityFilter'].forEach(id => {
        document.getElementById(id).addEventListener('change', function () {
            const filtered = getModalFilteredAlumni();
            const anyActive = (
                document.getElementById('modalYearFilter').value ||
                document.getElementById('modalCompanyFilter').value ||
                document.getElementById('modalRoleFilter').value ||
                document.getElementById('modalCityFilter').value ||
                document.getElementById('alumniModalSearch').value
            );
            renderAlumniSelectList(filtered, anyActive);
        });
    });

    // ✅ React instantly on every keystroke — even 1 letter
    const searchInput = document.getElementById('alumniModalSearch');
    searchInput.addEventListener('input', function (e) {
        // Always trim and lower case
        const val = e.target.value.trim().toLowerCase();
        renderAlumniSelectList(getModalFilteredAlumni(), false);
    });

}






function renderAlumniSelectList(list, autoCheck = false) {
    const alumniDiv = document.getElementById('alumniSelectList');
    const selectAllLabel = `<label><input type="checkbox" id="selectAllAlumni"> Select All</label>`;
    alumniDiv.innerHTML = list.length
        ? selectAllLabel +
        list.map((a, i) =>
            `<div style="margin-bottom:7px;"><label>
                    <input type="checkbox" class="alumniExportCheck" value="${i}" data-name="${a.name}" ${autoCheck ? 'checked' : ''}>
                    <b>${a.name}</b> (${a.year}) — ${a.company}, ${a.role}
                </label></div>`
        ).join('')
        : '<div style="color:#a88;">No alumni found.</div>';
    if (list.length > 0) {
        document.getElementById('selectAllAlumni').onclick = function (e) {
            document.querySelectorAll('.alumniExportCheck').forEach(ch => ch.checked = e.target.checked);
        };
    }
}




function exportSelectedAlumni() {
    const fullList = getModalFilteredAlumni();
    const boxes = Array.from(document.querySelectorAll('.alumniExportCheck'));
    const checkedNames = boxes.filter(cb => cb.checked).map(cb => cb.dataset.name);
    if (!checkedNames.length) return alert("Pick at least one alumni!");
    const selected = fullList.filter(a => checkedNames.includes(a.name));

    const header = ["name", "year", "city", "company", "role", "story", "link", "photo"];
    const csvRows = [
        header.join(','),
        ...selected.map(row => header.map(field => `"${String(row[field] || '').replace(/"/g, '""')}"`).join(','))
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'alumni_export.csv';
    a.click();
    URL.revokeObjectURL(url);

    closeAlumniExportModal();
}


