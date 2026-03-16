/* ===== CONFIG ===== */
const BACKEND = "https://flight-backend2-1.onrender.com";

/* ===== STATE ===== */
let allFlights = [];
let currentDep = "";
let currentArr = "";
let currentDate = "";
let activeSortPill = "low";

/* ===== DOM READY ===== */
document.addEventListener("DOMContentLoaded", function(){
    initDropdown("menuToggleBtn", "menuDropdown");
    initDropdown("langToggleBtn", "langDropdown");
    setSortPill("low");
});

function initDropdown(btnId, ddId){
    const btn = document.getElementById(btnId);
    const dd = document.getElementById(ddId);
    if(!btn || !dd) return;
    btn.addEventListener("click", e => {
        e.stopPropagation();
        const open = dd.style.display === "block";
        document.querySelectorAll(".menu-dropdown,.lang-dropdown")
            .forEach(d => d.style.display = "none");
        dd.style.display = open ? "none" : "block";
    });
    dd.addEventListener("click", e => e.stopPropagation());
}

document.addEventListener("click", () => {
    document.querySelectorAll(".menu-dropdown,.lang-dropdown")
        .forEach(d => d.style.display = "none");
});

/* ===== LANGUAGE ===== */
function setLang(label){
    const btn = document.getElementById("langToggleBtn");
    if(btn) btn.textContent = "🌐 " + label;
    document.getElementById("langDropdown").style.display = "none";
    document.querySelectorAll(".lang-dropdown a").forEach(a => a.classList.remove("active"));
    if(event && event.target) event.target.classList.add("active");
}

/* ===== SEARCH TABS ===== */
function setTab(tab){
    document.querySelectorAll(".search-tab").forEach(t => t.classList.remove("active"));
    event.target.classList.add("active");
}

/* ===== SEARCH ===== */
function searchFlights(){
    currentDep = (document.getElementById("dep").value || "").toUpperCase().trim();
    currentArr = (document.getElementById("arr").value || "").toUpperCase().trim();
    currentDate = document.getElementById("dateInput")?.value || "";

    if(!currentDep || !currentArr){
        alert("Please enter departure and destination airport codes (e.g. DEL, BOM)");
        return;
    }

    const resultsEl = document.getElementById("results");
    resultsEl.innerHTML = `
        <div class="skeleton"></div>
        <div class="skeleton"></div>
        <div class="skeleton"></div>
    `;

    // show topbar
    const bar = document.getElementById("summaryBar");
    if(bar){ bar.style.display = "flex"; }
    if(document.getElementById("routeText"))
        document.getElementById("routeText").textContent = "";
    if(document.getElementById("resultCount"))
        document.getElementById("resultCount").textContent = "Searching...";

    let url = `${BACKEND}/flights?dep=${currentDep}&arr=${currentArr}`;
    if(currentDate) url += `&date=${currentDate}`;

    fetch(url)
    .then(r => r.json())
    .then(data => {
        allFlights = Array.isArray(data) ? data : [];

        if(allFlights.length === 0){
            resultsEl.innerHTML = `
                <div class="empty-state">
                    <div style="font-size:52px;margin-bottom:16px">✈️</div>
                    <p style="font-size:18px;font-weight:600;color:#1a1a2e">No flights found</p>
                    <p>Try a different route or date</p>
                </div>`;
            if(document.getElementById("resultCount"))
                document.getElementById("resultCount").textContent = "0 flights";
            return;
        }

        saveRecentFlights(allFlights);
        buildAirlineFilters();
        renderFlights();

        resultsEl.scrollIntoView({ behavior:"smooth", block:"start" });
    })
    .catch(() => {
        resultsEl.innerHTML = `
            <div class="empty-state">
                <div style="font-size:52px;margin-bottom:16px">⚠️</div>
                <p style="font-size:18px;font-weight:600;color:#1a1a2e">Connection error</p>
                <p>Could not reach backend. Please try again.</p>
            </div>`;
    });
}

/* ===== SORT PILLS ===== */
function setSortPill(type){
    activeSortPill = type;
    document.querySelectorAll(".sort-pill").forEach(p => {
        p.classList.toggle("active", p.dataset.sort === type);
    });
    const sf = document.getElementById("sortFilter");
    if(sf) sf.value = type;
    if(allFlights.length > 0) renderFlights();
}

function quickSort(type){ setSortPill(type); }

/* ===== AIRLINE FILTERS ===== */
function buildAirlineFilters(){
    const airlines = [...new Set(allFlights.map(f => f.airline))];
    const c = document.getElementById("airlineContainer");
    if(!c) return;
    c.innerHTML = airlines.map(a =>
        `<div><input type="checkbox" class="airlineFilter" value="${a}"> ${a}</div>`
    ).join("");
}

/* ===== RENDER ===== */
function renderFlights(){
    const priceLimit = parseInt(document.getElementById("priceRange")?.value || 50000);
    const pv = document.getElementById("priceValue");
    if(pv) pv.textContent = "₹" + priceLimit.toLocaleString("en-IN");

    const selected = [...document.querySelectorAll(".airlineFilter:checked")].map(c => c.value);
    const sortType = activeSortPill || "low";

    let filtered = allFlights.filter(f => {
        if(f.price > priceLimit) return false;
        if(selected.length && !selected.includes(f.airline)) return false;
        return true;
    });

    if(sortType === "low") filtered.sort((a,b) => a.price - b.price);
    else filtered.sort((a,b) => b.price - a.price);

    const rt = document.getElementById("routeText");
    const rc = document.getElementById("resultCount");
    if(rt) rt.textContent = `${currentDep} → ${currentArr}`;
    if(rc) rc.innerHTML = `<span>${filtered.length} flights found</span>`;

    const el = document.getElementById("results");
    if(!el) return;

    if(filtered.length === 0){
        el.innerHTML = `
            <div class="empty-state">
                <p style="font-size:17px;font-weight:600">No flights match your filters</p>
                <p>Try moving the price slider up or removing airline filters</p>
            </div>`;
        return;
    }

    el.innerHTML = filtered.map((f, i) => buildCard(f, false, "", i === 0 && sortType === "low")).join("");
}

/* ===== BUILD CARD ===== */
function buildCard(f, showRemove = false, removeType = "", isBest = false){
    const h = Math.floor((f.duration_mins||0) / 60);
    const m = (f.duration_mins||0) % 60;
    const dur = f.duration_mins ? `${h}h ${m}m` : "--";
    const nonstop = f.stops === 0;
    const stopsLabel = nonstop ? "Non-stop" : `${f.stops} stop${f.stops>1?"s":""}`;
    const logo = f.airline_logo || "https://placehold.co/46x46/e4e8ef/5a6070?text=✈";

    const rawPrice = (f.price && f.price > 0) ? f.price : Math.round(Math.random()*5000+3000);
    const estimated = !(f.price && f.price > 0);
    const priceInt = Math.round(rawPrice);
    const priceStr = priceInt.toLocaleString("en-IN");
    const priceNote = estimated ? "<span class='price-note'>* Estimated</span>" : "<span class='price-note'>per person</span>";

    const booking = f.booking_link ||
        `https://www.google.com/travel/flights?q=flights+${f.departure_code||currentDep}+to+${f.arrival_code||currentArr}`;

    const isFav = isFavourite(f.flight_number || f.airline);
    const safeF = JSON.stringify(f).replace(/"/g,"&quot;");

    const removeBtn = showRemove
        ? `<button class="remove-btn" title="Remove" onclick="removeItem('${removeType}','${(f.flight_number||f.airline).replace(/'/g,"")}')">✕</button>`
        : "";

    return `
    <div class="flight-card${isBest ? " best-deal" : ""}">
        ${isBest ? '<div class="best-badge">Best value</div>' : ""}

        <div class="flight-airline">
            <img src="${logo}" class="airline-logo" onerror="this.src='https://placehold.co/46x46/e4e8ef/5a6070?text=✈'">
            <div>
                <div class="airline-name">${f.airline}</div>
                <div class="flight-num">${f.flight_number||""}</div>
                <div style="font-size:12px;color:#9ba3af;margin-top:2px">${f.departure_airport||f.departure_code||""}</div>
            </div>
        </div>

        <div class="flight-timeline">
            <div class="time-block">
                <div class="time">${f.departure_time||"--"}</div>
                <div class="airport-code">${f.departure_code||currentDep}</div>
            </div>
            <div class="route-line">
                <div class="route-duration">${dur}</div>
                <div class="route-line-bar"></div>
                <div class="route-stops ${nonstop?"nonstop":"stops"}">${stopsLabel}</div>
            </div>
            <div class="time-block">
                <div class="time">${f.arrival_time||"--"}</div>
                <div class="airport-code">${f.arrival_code||currentArr}</div>
            </div>
        </div>

        <div class="flight-price-col">
            <div>
                <div class="price-label">from</div>
                <div class="price"><sup>₹</sup>${priceStr}</div>
                ${priceNote}
            </div>
            <div class="btn-row">
                <button class="fav-btn ${isFav?"faved":""}"
                    onclick='toggleFavourite(${safeF}, this)'>${isFav?"❤️":"🤍"}</button>
                ${removeBtn}
                <a href="${booking}" target="_blank" class="deal-btn">View Deal →</a>
            </div>
        </div>
    </div>`;
}

/* ===== FAVOURITES ===== */
function getFavourites(){ return JSON.parse(localStorage.getItem("skyroute_favs")||"[]"); }
function isFavourite(id){ return getFavourites().some(f=>(f.flight_number||f.airline)===id); }

function toggleFavourite(flight, btn){
    let favs = getFavourites();
    const id = flight.flight_number||flight.airline;
    const idx = favs.findIndex(f=>(f.flight_number||f.airline)===id);
    if(idx>=0){ favs.splice(idx,1); btn.innerHTML="🤍"; btn.classList.remove("faved"); }
    else { favs.push(flight); btn.innerHTML="❤️"; btn.classList.add("faved"); }
    localStorage.setItem("skyroute_favs", JSON.stringify(favs));
}

function clearFavourites(){
    if(confirm("Clear all favourites?")){ localStorage.removeItem("skyroute_favs"); renderFavouritesPage(); }
}

/* ===== RECENTLY VIEWED ===== */
function saveRecentFlights(flights){
    let e = JSON.parse(localStorage.getItem("skyroute_recent")||"[]");
    flights.forEach(f=>{
        const id=f.flight_number||f.airline;
        e=e.filter(x=>(x.flight_number||x.airline)!==id);
        e.unshift(f);
    });
    localStorage.setItem("skyroute_recent", JSON.stringify(e.slice(0,20)));
}

function clearRecent(){
    if(confirm("Clear history?")){ localStorage.removeItem("skyroute_recent"); renderRecentPage(); }
}

function removeItem(type, id){
    const key = type==="recent"?"skyroute_recent":"skyroute_favs";
    let items = JSON.parse(localStorage.getItem(key)||"[]");
    items = items.filter(f=>(f.flight_number||f.airline)!==id);
    localStorage.setItem(key, JSON.stringify(items));
    type==="recent"?renderRecentPage():renderFavouritesPage();
}

/* ===== PAGE RENDERS ===== */
function renderFavouritesPage(){
    const c=document.getElementById("favResults"); if(!c) return;
    const favs=getFavourites();
    c.innerHTML = favs.length===0
        ? `<div class="empty-state"><div style="font-size:52px;margin-bottom:16px">🤍</div><p style="font-size:17px;font-weight:600;color:#1a1a2e">No favourites yet</p><p>Search for flights and click ❤️ to save them</p><br><a href="index.html" class="deal-btn" style="display:inline-block">Search Flights</a></div>`
        : favs.map(f=>buildCard(f,true,"fav")).join("");
}

function renderRecentPage(){
    const c=document.getElementById("recentResults"); if(!c) return;
    const recent=JSON.parse(localStorage.getItem("skyroute_recent")||"[]");
    c.innerHTML = recent.length===0
        ? `<div class="empty-state"><div style="font-size:52px;margin-bottom:16px">🕒</div><p style="font-size:17px;font-weight:600;color:#1a1a2e">No history yet</p><p>Flights you search will appear here</p><br><a href="index.html" class="deal-btn" style="display:inline-block">Search Flights</a></div>`
        : recent.map(f=>buildCard(f,true,"recent")).join("");
}

function renderBookingsPage(){
    const c=document.getElementById("bookingResults"); if(!c) return;
    c.innerHTML=`<div class="empty-state"><div style="font-size:52px;margin-bottom:16px">📭</div><p style="font-size:17px;font-weight:600;color:#1a1a2e">No bookings yet</p><p>Flights you book through SkyRoute appear here</p><br><a href="index.html" class="deal-btn" style="display:inline-block">Search Flights</a></div>`;
}

/* ===== FILTER CHANGE ===== */
document.addEventListener("change", e => {
    if(e.target.closest && e.target.closest(".filters")) renderFlights();
});
