/* ===== CONFIG ===== */
const BACKEND = "https://flight-backend2-1.onrender.com";

/* ===== STATE ===== */
let allFlights = [];
let currentDep = "";
let currentArr = "";
let currentDate = "";

/* ===== MENU TOGGLE ===== */
document.addEventListener("DOMContentLoaded", function(){
    const menuBtn = document.getElementById("menuToggleBtn");
    const menuDropdown = document.getElementById("menuDropdown");
    if(!menuBtn || !menuDropdown) return;

    menuBtn.addEventListener("click", function(e){
        e.stopPropagation();
        const isOpen = menuDropdown.style.display === "block";
        menuDropdown.style.display = isOpen ? "none" : "block";
    });

    menuDropdown.addEventListener("click", function(e){
        e.stopPropagation();
    });

    document.addEventListener("click", function(){
        menuDropdown.style.display = "none";
    });
});

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
            document.getElementById("results").innerHTML =
                "<h3 style='text-align:center;padding:40px;color:#888'>No flights found for this route. Try a different date or route.</h3>";
            return;
        }

        /* save to recently viewed */
        saveRecentFlights(allFlights);

        buildAirlineFilters();
        renderFlights();

        /* update summary bar */
        const bar = document.getElementById("summaryBar");
        if(bar){
            bar.style.display = "flex";
            document.getElementById("routeText").innerText = `${currentDep} → ${currentArr}`;
            document.getElementById("resultCount").innerText = ` • ${allFlights.length} flights found`;
        }

        document.getElementById("results").scrollIntoView({behavior:"smooth"});
    })
    .catch(err => {
        document.getElementById("results").innerHTML =
            "<h3 style='text-align:center;padding:40px;color:red'>Could not connect to backend. Please try again.</h3>";
        console.error(err);
    });
}

/* ===== QUICK SORT (summary bar buttons) ===== */
function quickSort(type){
    const sortFilter = document.getElementById("sortFilter");
    if(sortFilter){ sortFilter.value = type; }
    renderFlights();
}

/* ===== AIRLINE FILTERS ===== */
function buildAirlineFilters(){
    const airlines = [...new Set(allFlights.map(f => f.airline))];
    let html = "";
    airlines.forEach(a => {
        html += `<div><input type="checkbox" class="airlineFilter" value="${a}"> ${a}</div>`;
    });
    const container = document.getElementById("airlineContainer");
    if(container) container.innerHTML = html;
}

/* ===== RENDER FLIGHTS (main page) ===== */
function renderFlights(){
    const priceLimit = parseInt(document.getElementById("priceRange").value);
    document.getElementById("priceValue").innerText = "₹" + priceLimit.toLocaleString("en-IN");

    const selectedAirlines = [];
    document.querySelectorAll(".airlineFilter:checked")
        .forEach(cb => selectedAirlines.push(cb.value));

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
            "<h3 style='text-align:center;padding:40px'>No flights match your filters. Try moving the price slider up.</h3>";
        return;
    }

    document.getElementById("results").innerHTML = filtered.map(f => buildCard(f)).join("");
}

/* ===== BUILD FLIGHT CARD (reused on all pages) ===== */
function buildCard(f, showRemove = false, removeType = ""){
    const durationText = f.duration_mins
        ? Math.floor(f.duration_mins/60) + "h " + (f.duration_mins%60) + "m"
        : "--";
    const stopsText = f.stops === 0 ? "Non-stop" : f.stops + " stop" + (f.stops > 1 ? "s" : "");
    const stopsColor = f.stops === 0 ? "#007bff" : "#e67e22";
    const logoSrc = f.airline_logo || "https://via.placeholder.com/40";
    const priceDisplay = f.price ? "₹" + Math.round(f.price).toLocaleString("en-IN") : "N/A";
    const isFav = isFavourite(f.flight_number || f.airline);

    /* favourite button — heart toggles */
    const favBtn = `
        <button class="fav-btn ${isFav ? 'faved' : ''}"
            onclick="toggleFavourite(${JSON.stringify(f).replace(/"/g, '&quot;')}, this)">
            ${isFav ? '❤️' : '🤍'}
        </button>
    `;

    /* remove button for recently viewed / favourites pages */
    const removeBtn = showRemove ? `
        <button class="remove-btn" onclick="removeItem('${removeType}', '${f.flight_number || f.airline}')">
            ✕ Remove
        </button>
    ` : "";

    return `
    <div class="flight-card" id="card-${f.flight_number || f.airline}">
        <div class="flight-airline">
            <img src="${logoSrc}" class="airline-logo" onerror="this.src='https://via.placeholder.com/40'">
            <div>
                <h3>${f.airline}</h3>
                <p style="font-size:12px;color:#888">${f.flight_number || ""}</p>
                <p>${f.departure_airport || f.departure_code || ""} → ${f.arrival_airport || f.arrival_code || ""}</p>
            </div>
        </div>
        <div class="flight-timeline">
            <div class="time-block">
                <div class="time">${f.departure_time || "--"}</div>
                <div class="airport">${f.departure_code || ""}</div>
            </div>
            <div class="timeline-line">
                <div class="duration">${durationText}</div>
                <div class="line"></div>
                <div class="stops" style="color:${stopsColor}">${stopsText}</div>
            </div>
            <div class="time-block">
                <div class="time">${f.arrival_time || "--"}</div>
                <div class="airport">${f.arrival_code || ""}</div>
            </div>
        </div>
        <div class="flight-price">
            <div class="price">${priceDisplay}</div>
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
                ${favBtn}
                ${removeBtn}
                <a href="${f.booking_link || '#'}" target="_blank" class="deal-btn">View Deal</a>
            </div>
        </div>
    </div>`;
}

/* ===== FAVOURITES LOGIC ===== */
function getFavourites(){
    return JSON.parse(localStorage.getItem("skyroute_favs")) || [];
}

function isFavourite(id){
    return getFavourites().some(f => (f.flight_number || f.airline) === id);
}

function toggleFavourite(flight, btn){
    let favs = getFavourites();
    const id = flight.flight_number || flight.airline;
    const exists = favs.findIndex(f => (f.flight_number || f.airline) === id);

    if(exists >= 0){
        favs.splice(exists, 1);
        btn.innerHTML = "🤍";
        btn.classList.remove("faved");
    } else {
        favs.push(flight);
        btn.innerHTML = "❤️";
        btn.classList.add("faved");
    }
    localStorage.setItem("skyroute_favs", JSON.stringify(favs));
}

function clearFavourites(){
    if(confirm("Clear all favourites?")){
        localStorage.removeItem("skyroute_favs");
        renderFavouritesPage();
    }
}

/* ===== RECENTLY VIEWED LOGIC ===== */
function saveRecentFlights(flights){
    /* save up to 20 most recent flights */
    let existing = JSON.parse(localStorage.getItem("skyroute_recent")) || [];
    /* add new ones at the front, avoid duplicates */
    flights.forEach(f => {
        const id = f.flight_number || f.airline;
        existing = existing.filter(e => (e.flight_number || e.airline) !== id);
        existing.unshift(f);
    });
    localStorage.setItem("skyroute_recent", JSON.stringify(existing.slice(0, 20)));
}

function clearRecent(){
    if(confirm("Clear recently viewed history?")){
        localStorage.removeItem("skyroute_recent");
        renderRecentPage();
    }
}

/* ===== REMOVE SINGLE ITEM ===== */
function removeItem(type, id){
    if(type === "recent"){
        let items = JSON.parse(localStorage.getItem("skyroute_recent")) || [];
        items = items.filter(f => (f.flight_number || f.airline) !== id);
        localStorage.setItem("skyroute_recent", JSON.stringify(items));
        renderRecentPage();
    } else if(type === "fav"){
        let items = getFavourites();
        items = items.filter(f => (f.flight_number || f.airline) !== id);
        localStorage.setItem("skyroute_favs", JSON.stringify(items));
        renderFavouritesPage();
    }
}

/* ===== RENDER FAVOURITES PAGE ===== */
function renderFavouritesPage(){
    const container = document.getElementById("favResults");
    if(!container) return;
    const favs = getFavourites();
    if(favs.length === 0){
        container.innerHTML = `
            <div class="empty-state">
                <p>🤍 No favourites saved yet.</p>
                <p>Search for flights and click the heart button to save them here.</p>
                <a href="index.html" class="deal-btn" style="display:inline-block;margin-top:16px">Search Flights</a>
            </div>`;
    } else {
        container.innerHTML = favs.map(f => buildCard(f, true, "fav")).join("");
    }
}

/* ===== RENDER RECENTLY VIEWED PAGE ===== */
function renderRecentPage(){
    const container = document.getElementById("recentResults");
    if(!container) return;
    const recent = JSON.parse(localStorage.getItem("skyroute_recent")) || [];
    if(recent.length === 0){
        container.innerHTML = `
            <div class="empty-state">
                <p>🕒 No recently viewed flights yet.</p>
                <p>Flights you search for will appear here automatically.</p>
                <a href="index.html" class="deal-btn" style="display:inline-block;margin-top:16px">Search Flights</a>
            </div>`;
    } else {
        container.innerHTML = recent.map(f => buildCard(f, true, "recent")).join("");
    }
}

/* ===== RENDER BOOKINGS PAGE ===== */
function renderBookingsPage(){
    const container = document.getElementById("bookingResults");
    if(!container) return;
    /* bookings would come from a real backend in production */
    /* for now show empty state */
    container.innerHTML = `
        <div class="empty-state">
            <p>📭 No bookings yet.</p>
            <p>Once you book a flight through SkyRoute it will appear here.</p>
            <a href="index.html" class="deal-btn" style="display:inline-block;margin-top:16px">Search Flights</a>
        </div>`;
}

/* ===== FILTER CHANGE ===== */
document.addEventListener("change", function(e){
    if(e.target.closest && e.target.closest(".filters")) renderFlights();
});

/* ===== LOGIN MODAL ===== */
function openLogin(){
    document.getElementById("loginModal").style.display = "flex";
}
function closeLogin(){
    document.getElementById("loginModal").style.display = "none";
}
