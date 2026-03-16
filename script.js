/* ===== CONFIG ===== */
const BACKEND = "https://flight-backend2-1.onrender.com";

/* ===== STATE ===== */
let allFlights = [];
let currentDep = "";
let currentArr = "";
let currentDate = "";
let activeSortPill = "low";
let activeTab = "oneway";
let activeTravellerForm = "ow";
let activeClassForm = "ow";
let rowCount = 0;

/* traveller counts */
const travellerCounts = { adults: 1, children: 0, infants: 0 };

/* selected class */
let selectedClass = "Economy";

/* class multipliers for price display */
const classMultipliers = {
    "Economy": 1,
    "Premium Economy": 1.4,
    "Business": 2.8,
    "First Class": 5.2
};

/* ===== DOM READY ===== */
document.addEventListener("DOMContentLoaded", function(){
    initDropdown("menuToggleBtn", "menuDropdown");
    initDropdown("langToggleBtn", "langDropdown");
    setSortPill("low");
});

/* ===== DROPDOWNS ===== */
function initDropdown(btnId, ddId){
    const btn = document.getElementById(btnId);
    const dd = document.getElementById(ddId);
    if(!btn || !dd) return;
    btn.addEventListener("click", e => {
        e.stopPropagation();
        const open = dd.style.display === "block";
        document.querySelectorAll(".menu-dropdown,.lang-dropdown").forEach(d => d.style.display = "none");
        dd.style.display = open ? "none" : "block";
    });
    dd.addEventListener("click", e => e.stopPropagation());
}

document.addEventListener("click", () => {
    document.querySelectorAll(".menu-dropdown,.lang-dropdown").forEach(d => d.style.display = "none");
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
    activeTab = tab;
    ["oneway","return","multi"].forEach(t => {
        const btn = document.getElementById("tab-" + t);
        const form = document.getElementById("form-" + t);
        if(btn) btn.classList.toggle("active", t === tab);
        if(form) form.style.display = t === tab ? (t === "multi" ? "block" : "flex") : "none";
    });
    if(tab === "multi"){
        const rows = document.getElementById("multiRows");
        if(rows && rows.children.length === 0){ addMultiRow(); addMultiRow(); }
    }
    const bar = document.getElementById("summaryBar");
    if(bar) bar.style.display = "none";
    document.getElementById("results").innerHTML = "";
    allFlights = [];
}

/* ===== TRAVELLER PICKER ===== */
function openTravellerPicker(form){
    activeTravellerForm = form;
    document.getElementById("travellerPickerOverlay").style.display = "block";
    document.getElementById("travellerPicker").style.display = "block";
    updateCountDisplays();
}

function closeTravellerPicker(){
    document.getElementById("travellerPickerOverlay").style.display = "none";
    document.getElementById("travellerPicker").style.display = "none";
    updateTravellerLabel();
}

function changeCount(type, delta){
    const min = type === "adults" ? 1 : 0;
    travellerCounts[type] = Math.max(min, Math.min(9, travellerCounts[type] + delta));
    updateCountDisplays();
}

function updateCountDisplays(){
    document.getElementById("adults-count").textContent = travellerCounts.adults;
    document.getElementById("children-count").textContent = travellerCounts.children;
    document.getElementById("infants-count").textContent = travellerCounts.infants;
}

function updateTravellerLabel(){
    const total = travellerCounts.adults + travellerCounts.children + travellerCounts.infants;
    let label = `${travellerCounts.adults} Adult${travellerCounts.adults > 1 ? "s" : ""}`;
    if(travellerCounts.children > 0) label += `, ${travellerCounts.children} Child${travellerCounts.children > 1 ? "ren" : ""}`;
    if(travellerCounts.infants > 0) label += `, ${travellerCounts.infants} Infant${travellerCounts.infants > 1 ? "s" : ""}`;

    /* update all traveller displays */
    ["ow","ret","multi"].forEach(f => {
        const el = document.getElementById(f + "-traveller-display");
        if(el) el.textContent = label;
    });
}

function getTotalTravellers(){
    return travellerCounts.adults + travellerCounts.children + travellerCounts.infants;
}

/* ===== CLASS PICKER ===== */
function openClassPicker(form){
    activeClassForm = form;
    document.getElementById("classPickerOverlay").style.display = "block";
    document.getElementById("classPicker").style.display = "block";
}

function closeClassPicker(){
    document.getElementById("classPickerOverlay").style.display = "none";
    document.getElementById("classPicker").style.display = "none";
}

function selectClass(cls){
    selectedClass = cls;
    document.querySelectorAll(".class-option").forEach(o => {
        o.classList.toggle("active", o.querySelector(".class-name").textContent === cls);
    });
    /* update all class displays */
    ["ow","ret","multi"].forEach(f => {
        const el = document.getElementById(f + "-class-display");
        if(el) el.textContent = cls;
    });
    setTimeout(closeClassPicker, 200);
}

/* apply class and traveller multipliers to price */
function applyMultipliers(basePrice){
    const classM = classMultipliers[selectedClass] || 1;
    const travellerCount = getTotalTravellers();
    return Math.round(basePrice * classM * travellerCount);
}

/* ===== MULTI-CITY ROWS ===== */
function addMultiRow(){
    rowCount++;
    const rows = document.getElementById("multiRows");
    const div = document.createElement("div");
    div.className = "multi-row";
    div.id = "multi-row-" + rowCount;
    div.innerHTML = `
        <div class="multi-row-num">${rowCount}</div>
        <div class="search-item">
            <span class="label">From</span>
            <input class="multi-dep" placeholder="e.g. DEL">
        </div>
        <div class="search-item">
            <span class="label">To</span>
            <input class="multi-arr" placeholder="e.g. BOM">
        </div>
        <div class="search-item">
            <span class="label">Date</span>
            <input type="date" class="multi-date">
        </div>
        ${rowCount > 2 ? `<button class="remove-row-btn" onclick="removeMultiRow('multi-row-${rowCount}')">✕</button>` : ""}
    `;
    rows.appendChild(div);
}

function removeMultiRow(id){
    const el = document.getElementById(id);
    if(el) el.remove();
    document.querySelectorAll(".multi-row-num").forEach((n,i) => n.textContent = i+1);
}

/* ===== LOADING ===== */
function setLoading(msg = "Searching..."){
    const bar = document.getElementById("summaryBar");
    if(bar) bar.style.display = "flex";
    if(document.getElementById("resultCount"))
        document.getElementById("resultCount").textContent = msg;
    document.getElementById("results").innerHTML = `
        <div class="skeleton"></div>
        <div class="skeleton"></div>
        <div class="skeleton"></div>`;
}

/* ===== ONE WAY SEARCH ===== */
function searchFlights(){
    currentDep = (document.getElementById("dep").value || "").toUpperCase().trim();
    currentArr = (document.getElementById("arr").value || "").toUpperCase().trim();
    currentDate = document.getElementById("dateInput")?.value || "";

    if(!currentDep || !currentArr){
        alert("Please enter departure and destination airport codes (e.g. DEL, BOM)");
        return;
    }

    setLoading();

    let url = `${BACKEND}/flights?dep=${currentDep}&arr=${currentArr}`;
    if(currentDate) url += `&date=${currentDate}`;

    fetch(url)
    .then(r => r.json())
    .then(data => {
        allFlights = Array.isArray(data) ? data : [];

        if(allFlights.length === 0){
            document.getElementById("results").innerHTML = emptyState("No flights found", "Try a different route or date");
            document.getElementById("resultCount").textContent = "0 flights";
            return;
        }

        saveRecentFlights(allFlights);
        buildAirlineFilters();
        renderFlights();
        document.getElementById("results").scrollIntoView({ behavior:"smooth", block:"start" });
    })
    .catch(() => {
        document.getElementById("results").innerHTML = emptyState("Connection error", "Could not reach backend. Please try again.");
    });
}

/* ===== RETURN SEARCH ===== */
function searchReturn(){
    const dep = (document.getElementById("ret-dep").value || "").toUpperCase().trim();
    const arr = (document.getElementById("ret-arr").value || "").toUpperCase().trim();
    const outDate = document.getElementById("ret-date").value;
    const retDate = document.getElementById("ret-return-date").value;

    if(!dep || !arr){ alert("Please enter departure and destination codes"); return; }
    if(!outDate){ alert("Please select a departure date"); return; }
    if(!retDate){ alert("Please select a return date"); return; }
    if(retDate <= outDate){ alert("Return date must be after departure date"); return; }

    currentDep = dep; currentArr = arr;
    setLoading("Searching outbound & return...");

    Promise.all([
        fetch(`${BACKEND}/flights?dep=${dep}&arr=${arr}&date=${outDate}`).then(r=>r.json()),
        fetch(`${BACKEND}/flights?dep=${arr}&arr=${dep}&date=${retDate}`).then(r=>r.json())
    ])
    .then(([outData, retData]) => {
        const outFlights = Array.isArray(outData) ? outData : [];
        const retFlights = Array.isArray(retData) ? retData : [];

        allFlights = outFlights;
        buildAirlineFilters();

        const total = outFlights.length + retFlights.length;
        if(document.getElementById("resultCount"))
            document.getElementById("resultCount").textContent = `${total} flights found`;
        if(document.getElementById("routeText"))
            document.getElementById("routeText").textContent = `${dep} ⇄ ${arr}`;

        let html = "";

        html += `<div class="return-section">
            <div class="return-section-title">
                Outbound flights
                <span class="direction-badge outward">${dep} → ${arr} · ${formatDate(outDate)}</span>
            </div>`;
        if(outFlights.length === 0){
            html += `<div class="empty-state" style="margin-bottom:16px"><p>No outbound flights found for this date</p></div>`;
        } else {
            outFlights.sort((a,b) => a.price - b.price);
            html += outFlights.map((f,i) => buildCard(f, false, "", i===0)).join("");
        }
        html += `</div>`;

        html += `<div class="return-section">
            <div class="return-section-title">
                Return flights
                <span class="direction-badge returning">${arr} → ${dep} · ${formatDate(retDate)}</span>
            </div>`;
        if(retFlights.length === 0){
            html += `<div class="empty-state"><p>No return flights found for this date</p></div>`;
        } else {
            retFlights.sort((a,b) => a.price - b.price);
            html += retFlights.map((f,i) => buildCard(f, false, "", i===0)).join("");
        }
        html += `</div>`;

        document.getElementById("results").innerHTML = html;
        saveRecentFlights([...outFlights, ...retFlights]);
        document.getElementById("results").scrollIntoView({ behavior:"smooth", block:"start" });
    })
    .catch(() => {
        document.getElementById("results").innerHTML = emptyState("Connection error", "Could not reach backend.");
    });
}

/* ===== MULTI-CITY SEARCH ===== */
function searchMulti(){
    const depInputs = document.querySelectorAll(".multi-dep");
    const arrInputs = document.querySelectorAll(".multi-arr");
    const dateInputs = document.querySelectorAll(".multi-date");

    const legs = [];
    for(let i = 0; i < depInputs.length; i++){
        const dep = (depInputs[i].value || "").toUpperCase().trim();
        const arr = (arrInputs[i].value || "").toUpperCase().trim();
        const date = dateInputs[i].value;
        if(!dep || !arr){ alert(`Please fill From and To for flight ${i+1}`); return; }
        if(!date){ alert(`Please select a date for flight ${i+1}`); return; }
        legs.push({ dep, arr, date, num: i+1 });
    }

    setLoading(`Searching ${legs.length} flights...`);
    if(document.getElementById("routeText"))
        document.getElementById("routeText").textContent = legs.map(l => `${l.dep}→${l.arr}`).join(" · ");

    Promise.all(legs.map(l =>
        fetch(`${BACKEND}/flights?dep=${l.dep}&arr=${l.arr}&date=${l.date}`).then(r=>r.json())
    ))
    .then(results => {
        let total = 0;
        let html = "";

        results.forEach((data, i) => {
            const flights = Array.isArray(data) ? data : [];
            const leg = legs[i];
            total += flights.length;

            html += `<div class="return-section">
                <div class="multi-leg-title">
                    <span class="leg-badge">Flight ${leg.num}</span>
                    ${leg.dep} → ${leg.arr}
                    <span style="font-size:13px;color:#9ba3af;font-family:'DM Sans',sans-serif;font-weight:500">${formatDate(leg.date)}</span>
                </div>`;

            if(flights.length === 0){
                html += `<div class="empty-state" style="padding:32px"><p>No flights found for this leg</p></div>`;
            } else {
                flights.sort((a,b) => a.price - b.price);
                html += flights.slice(0,5).map((f,j) => buildCard(f, false, "", j===0)).join("");
            }
            html += `</div>`;
            if(flights.length > 0) saveRecentFlights(flights);
        });

        if(document.getElementById("resultCount"))
            document.getElementById("resultCount").textContent = `${total} flights across ${legs.length} legs`;

        document.getElementById("results").innerHTML = html;
        document.getElementById("results").scrollIntoView({ behavior:"smooth", block:"start" });
    })
    .catch(() => {
        document.getElementById("results").innerHTML = emptyState("Connection error", "Could not reach backend.");
    });
}

/* ===== QUICK SORT ===== */
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
        const adjustedPrice = applyMultipliers(f.price || 4000);
        if(adjustedPrice > priceLimit) return false;
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
        el.innerHTML = `<div class="empty-state">
            <p style="font-size:17px;font-weight:600">No flights match your filters</p>
            <p>Try moving the price slider up or removing airline filters</p>
        </div>`;
        return;
    }

    el.innerHTML = filtered.map((f,i) => buildCard(f, false, "", i===0 && sortType==="low")).join("");
}

/* ===== BUILD CARD ===== */
function buildCard(f, showRemove = false, removeType = "", isBest = false){
    const h = Math.floor((f.duration_mins||0) / 60);
    const m = (f.duration_mins||0) % 60;
    const dur = f.duration_mins ? `${h}h ${m}m` : "--";
    const nonstop = f.stops === 0;
    const stopsLabel = nonstop ? "Non-stop" : `${f.stops} stop${f.stops>1?"s":""}`;
    const logo = f.airline_logo || "https://placehold.co/46x46/e4e8ef/5a6070?text=✈";

    const basePrice = (f.price && f.price > 0) ? f.price : Math.round(Math.random()*5000+3000);
    const estimated = !(f.price && f.price > 0);
    const finalPrice = applyMultipliers(basePrice);
    const priceStr = finalPrice.toLocaleString("en-IN");

    /* price breakdown tooltip */
    const totalTravellers = getTotalTravellers();
    const classM = classMultipliers[selectedClass] || 1;
    const priceBreakdown = totalTravellers > 1 || selectedClass !== "Economy"
        ? `<div class="price-breakdown">
            ${selectedClass !== "Economy" ? `<span>${selectedClass} class</span>` : ""}
            ${totalTravellers > 1 ? `<span>${totalTravellers} travellers</span>` : ""}
           </div>`
        : "";

    const priceNote = estimated
        ? `<span class="price-note">* Estimated</span>`
        : `<span class="price-note">total fare</span>`;

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
                ${priceBreakdown}
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

/* ===== FILTER LISTENER ===== */
document.addEventListener("change", e => {
    if(e.target.closest && e.target.closest(".filters")) renderFlights();
});

/* ===== HELPERS ===== */
function formatDate(dateStr){
    if(!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
}

function emptyState(title, sub){
    return `<div class="empty-state">
        <div style="font-size:52px;margin-bottom:16px">✈️</div>
        <p style="font-size:18px;font-weight:600;color:#1a1a2e">${title}</p>
        <p style="margin-top:6px">${sub}</p>
    </div>`;
}
