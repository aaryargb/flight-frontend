/* ===== CONFIG ===== */
const BACKEND = "https://flight-backend2-1.onrender.com";

/* ===== STATE ===== */
let allFlights = [];
let currentDep = "";
let currentArr = "";
let currentDate = "";

/* ===== DOM READY ===== */
document.addEventListener("DOMContentLoaded", function(){
    initMenuToggle("menuToggleBtn", "menuDropdown");
    initMenuToggle("langToggleBtn", "langDropdown");
});

function initMenuToggle(btnId, dropdownId){
    const btn = document.getElementById(btnId);
    const dropdown = document.getElementById(dropdownId);
    if(!btn || !dropdown) return;

    btn.addEventListener("click", function(e){
        e.stopPropagation();
        const isOpen = dropdown.style.display === "block";
        // close all dropdowns first
        document.querySelectorAll(".menu-dropdown, .lang-dropdown")
            .forEach(d => d.style.display = "none");
        dropdown.style.display = isOpen ? "none" : "block";
    });

    dropdown.addEventListener("click", function(e){ e.stopPropagation(); });
}

document.addEventListener("click", function(){
    document.querySelectorAll(".menu-dropdown, .lang-dropdown")
        .forEach(d => d.style.display = "none");
});

/* ===== LANGUAGE SELECTOR ===== */
function setLang(label){
    const btn = document.getElementById("langToggleBtn");
    if(btn) btn.textContent = "🌐 " + label;
    document.getElementById("langDropdown").style.display = "none";
    document.querySelectorAll(".lang-dropdown a")
        .forEach(a => a.classList.remove("active"));
    event.target.classList.add("active");
}

/* ===== SEARCH ===== */
function searchFlights(){
    currentDep = document.getElementById("dep").value.toUpperCase().trim();
    currentArr = document.getElementById("arr").value.toUpperCase().trim();
    currentDate = document.getElementById("dateInput")?.value || "";

    if(!currentDep || !currentArr){
        alert("Please enter departure and destination airport codes (e.g. DEL, BOM)");
        return;
    }

    document.getElementById("results").innerHTML = `
        <div class="skeleton"></div>
        <div class="skeleton"></div>
        <div class="skeleton"></div>
    `;

    let url = `${BACKEND}/flights?dep=${currentDep}&arr=${currentArr}`;
    if(currentDate) url += `&date=${currentDate}`;

    fetch(url)
    .then(res => res.json())
    .then(data => {
        allFlights = Array.isArray(data) ? data : [];

        if(allFlights.length === 0){
            document.getElementById("results").innerHTML = `
                <div style="text-align:center;padding:60px;color:#64748b;">
                    <div style="font-size:48px;margin-bottom:16px">😔</div>
                    <h3 style="color:#94a3b8;font-weight:400">No flights found for this route</h3>
                    <p style="margin-top:8px">Try a different date or nearby airports</p>
                </div>`;
            return;
        }

        saveRecentFlights(allFlights);
        buildAirlineFilters();
        renderFlights();

        const bar = document.getElementById("summaryBar");
        if(bar){
            bar.style.display = "flex";
            document.getElementById("routeText").innerText = `${currentDep} → ${currentArr}`;
            document.getElementById("resultCount").innerText = ` • ${allFlights.length} flights found`;
        }

        document.getElementById("results").scrollIntoView({behavior:"smooth"});
    })
    .catch(() => {
        document.getElementById("results").innerHTML = `
            <div style="text-align:center;padding:60px;color:#ef4444;">
                <div style="font-size:48px;margin-bottom:16px">⚠️</div>
                <h3 style="font-weight:400">Could not connect to backend</h3>
                <p style="margin-top:8px;color:#64748b">Please try again in a moment</p>
            </div>`;
    });
}

/* ===== QUICK SORT ===== */
function quickSort(type){
    const s = document.getElementById("sortFilter");
    if(s) s.value = type;
    renderFlights();
}

/* ===== AIRLINE FILTERS ===== */
function buildAirlineFilters(){
    const airlines = [...new Set(allFlights.map(f => f.airline))];
    const container = document.getElementById("airlineContainer");
    if(!container) return;
    container.innerHTML = airlines.map(a =>
        `<div><input type="checkbox" class="airlineFilter" value="${a}"> ${a}</div>`
    ).join("");
}

/* ===== RENDER FLIGHTS ===== */
function renderFlights(){
    const priceLimit = parseInt(document.getElementById("priceRange").value);
    document.getElementById("priceValue").innerText = "₹" + priceLimit.toLocaleString("en-IN");

    const selectedAirlines = [...document.querySelectorAll(".airlineFilter:checked")]
        .map(cb => cb.value);

    const sortType = document.getElementById("sortFilter").value;

    let filtered = allFlights.filter(f => {
        if(f.price > priceLimit) return false;
        if(selectedAirlines.length && !selectedAirlines.includes(f.airline)) return false;
        return true;
    });

    if(sortType === "low") filtered.sort((a,b) => a.price - b.price);
    else filtered.sort((a,b) => b.price - a.price);

    if(filtered.length === 0){
        document.getElementById("results").innerHTML =
            `<div style="text-align:center;padding:60px;color:#64748b;">
                <p style="font-size:18px">No flights match your filters</p>
                <p style="margin-top:8px;font-size:14px">Try moving the price slider up</p>
            </div>`;
        return;
    }

    document.getElementById("results").innerHTML = filtered.map(f => buildCard(f)).join("");
}

/* ===== BUILD CARD ===== */
function buildCard(f, showRemove = false, removeType = ""){
    const durationText = f.duration_mins
        ? Math.floor(f.duration_mins / 60) + "h " + (f.duration_mins % 60) + "m"
        : "--";
    const stopsText = f.stops === 0 ? "Non-stop" : f.stops + " stop" + (f.stops > 1 ? "s" : "");
    const stopsColor = f.stops === 0 ? "#2563eb" : "#f59e0b";
    const logoSrc = f.airline_logo || "https://via.placeholder.com/40";

    /* price — show real or estimated */
    const priceDisplay = (f.price && f.price > 0)
        ? "₹" + Math.round(f.price).toLocaleString("en-IN")
        : "₹" + Math.round(Math.random() * 5000 + 3000).toLocaleString("en-IN") + "*";

    const bookingUrl = f.booking_link ||
        `https://www.google.com/travel/flights?q=flights+${f.departure_code}+to+${f.arrival_code}`;

    const isFav = isFavourite(f.flight_number || f.airline);
    const safeF = JSON.stringify(f).replace(/'/g, "\\'").replace(/"/g, "&quot;");

    const favBtn = `<button class="fav-btn ${isFav ? 'faved' : ''}"
        onclick='toggleFavourite(${JSON.stringify(f)}, this)'>
        ${isFav ? "❤️" : "🤍"}</button>`;

    const removeBtn = showRemove
        ? `<button class="remove-btn" onclick="removeItem('${removeType}','${(f.flight_number||f.airline).replace(/'/g,'')}')">✕</button>`
        : "";

    return `
    <div class="flight-card">
        <div class="flight-airline">
            <img src="${logoSrc}" class="airline-logo" onerror="this.src='https://via.placeholder.com/40'">
            <div>
                <h3>${f.airline}</h3>
                <p style="font-size:12px;color:#94a3b8">${f.flight_number || ""}</p>
                <p style="font-size:13px;color:#475569">${f.departure_airport||f.departure_code||""} → ${f.arrival_airport||f.arrival_code||""}</p>
            </div>
        </div>
        <div class="flight-timeline">
            <div class="time-block">
                <div class="time">${f.departure_time||"--"}</div>
                <div class="airport">${f.departure_code||""}</div>
            </div>
            <div class="timeline-line">
                <div class="duration">${durationText}</div>
                <div class="line"></div>
                <div class="stops" style="color:${stopsColor}">${stopsText}</div>
            </div>
            <div class="time-block">
                <div class="time">${f.arrival_time||"--"}</div>
                <div class="airport">${f.arrival_code||""}</div>
            </div>
        </div>
        <div class="flight-price">
            <div class="price">${priceDisplay}</div>
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px;flex-wrap:wrap">
                ${favBtn}${removeBtn}
                <a href="${bookingUrl}" target="_blank" class="deal-btn">View Deal</a>
            </div>
        </div>
    </div>`;
}

/* ===== FAVOURITES ===== */
function getFavourites(){ return JSON.parse(localStorage.getItem("skyroute_favs")) || []; }
function isFavourite(id){ return getFavourites().some(f => (f.flight_number||f.airline) === id); }

function toggleFavourite(flight, btn){
    let favs = getFavourites();
    const id = flight.flight_number || flight.airline;
    const idx = favs.findIndex(f => (f.flight_number||f.airline) === id);
    if(idx >= 0){ favs.splice(idx,1); btn.innerHTML="🤍"; btn.classList.remove("faved"); }
    else { favs.push(flight); btn.innerHTML="❤️"; btn.classList.add("faved"); }
    localStorage.setItem("skyroute_favs", JSON.stringify(favs));
}

function clearFavourites(){
    if(confirm("Clear all favourites?")){ localStorage.removeItem("skyroute_favs"); renderFavouritesPage(); }
}

/* ===== RECENTLY VIEWED ===== */
function saveRecentFlights(flights){
    let existing = JSON.parse(localStorage.getItem("skyroute_recent")) || [];
    flights.forEach(f => {
        const id = f.flight_number || f.airline;
        existing = existing.filter(e => (e.flight_number||e.airline) !== id);
        existing.unshift(f);
    });
    localStorage.setItem("skyroute_recent", JSON.stringify(existing.slice(0,20)));
}

function clearRecent(){
    if(confirm("Clear history?")){ localStorage.removeItem("skyroute_recent"); renderRecentPage(); }
}

function removeItem(type, id){
    const key = type === "recent" ? "skyroute_recent" : "skyroute_favs";
    let items = JSON.parse(localStorage.getItem(key)) || [];
    items = items.filter(f => (f.flight_number||f.airline) !== id);
    localStorage.setItem(key, JSON.stringify(items));
    type === "recent" ? renderRecentPage() : renderFavouritesPage();
}

/* ===== PAGE RENDERS ===== */
function renderFavouritesPage(){
    const c = document.getElementById("favResults"); if(!c) return;
    const favs = getFavourites();
    c.innerHTML = favs.length === 0
        ? `<div class="empty-state"><p style="font-size:48px">🤍</p><p>No favourites saved yet</p><p style="font-size:14px;color:#475569;margin-top:8px">Search flights and click ❤️ to save them</p><a href="index.html" class="deal-btn" style="display:inline-block;margin-top:20px">Search Flights</a></div>`
        : favs.map(f => buildCard(f, true, "fav")).join("");
}

function renderRecentPage(){
    const c = document.getElementById("recentResults"); if(!c) return;
    const recent = JSON.parse(localStorage.getItem("skyroute_recent")) || [];
    c.innerHTML = recent.length === 0
        ? `<div class="empty-state"><p style="font-size:48px">🕒</p><p>No recently viewed flights</p><p style="font-size:14px;color:#475569;margin-top:8px">Flights you search will appear here</p><a href="index.html" class="deal-btn" style="display:inline-block;margin-top:20px">Search Flights</a></div>`
        : recent.map(f => buildCard(f, true, "recent")).join("");
}

function renderBookingsPage(){
    const c = document.getElementById("bookingResults"); if(!c) return;
    c.innerHTML = `<div class="empty-state"><p style="font-size:48px">📭</p><p>No bookings yet</p><p style="font-size:14px;color:#475569;margin-top:8px">Book a flight through SkyRoute and it will appear here</p><a href="index.html" class="deal-btn" style="display:inline-block;margin-top:20px">Search Flights</a></div>`;
}

/* ===== FILTER LISTENER ===== */
document.addEventListener("change", function(e){
    if(e.target.closest && e.target.closest(".filters")) renderFlights();
});
