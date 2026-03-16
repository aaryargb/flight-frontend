/* ===== GLOBAL STATE ===== */

let allFlights = [];
let currentDep = "";
let currentArr = "";
let currentDate = "";

/* ===== SEARCH FUNCTION ===== */

function searchFlights(){

    currentDep = document.getElementById("dep").value.toUpperCase().trim();
    currentArr = document.getElementById("arr").value.toUpperCase().trim();
    currentDate = document.getElementById("dateInput")?.value || "";

    if(!currentDep || !currentArr){
        alert("Enter departure and destination airport codes");
        return;
    }

    /* loading skeleton */
    document.getElementById("results").innerHTML = `
        <div class="skeleton"></div>
        <div class="skeleton"></div>
        <div class="skeleton"></div>
    `;

    /* BACKEND CONNECTION */
    let url = `https://flight-backend2-1.onrender.com/flights?dep=${currentDep}&arr=${currentArr}`;
    if(currentDate) url += `&date=${currentDate}`;

    fetch(url)
    .then(res => res.json())
    .then(data => {

        /* SerpAPI returns a flat array directly */
        allFlights = Array.isArray(data) ? data : [];

        if(allFlights.length === 0){
            document.getElementById("results").innerHTML =
                "<h3 style='text-align:center'>No flights found for this route. Try a different date or route.</h3>";
            return;
        }

        buildAirlineFilters();
        renderFlights();

        /* smooth scroll */
        document.getElementById("results").scrollIntoView({behavior:"smooth"});

    })
    .catch(err => {
        document.getElementById("results").innerHTML =
            "<h3 style='text-align:center;color:red'>Could not connect to backend. Please try again.</h3>";
        console.error(err);
    });
}

/* ===== AIRLINE FILTER BUILD ===== */

function buildAirlineFilters(){

    let airlines = [...new Set(allFlights.map(f => f.airline))];

    let html = "";
    airlines.forEach(a => {
        html += `
        <div>
            <input type="checkbox" class="airlineFilter" value="${a}"> ${a}
        </div>
        `;
    });

    const container = document.getElementById("airlineContainer");
    if(container) container.innerHTML = html;
}

/* ===== RENDER FLIGHTS ===== */

function renderFlights(){

    let priceLimit = parseInt(document.getElementById("priceRange").value);
    document.getElementById("priceValue").innerText = "₹" + priceLimit.toLocaleString("en-IN");

    let selectedAirlines = [];
    document.querySelectorAll(".airlineFilter:checked")
        .forEach(cb => selectedAirlines.push(cb.value));

    let sortType = document.getElementById("sortFilter").value;

    /* filtering */
    let filtered = allFlights.filter(f => {
        if(f.price > priceLimit) return false;
        if(selectedAirlines.length && !selectedAirlines.includes(f.airline)) return false;
        return true;
    });

    /* sorting */
    if(sortType === "low"){
        filtered.sort((a,b) => a.price - b.price);
    } else {
        filtered.sort((a,b) => b.price - a.price);
    }

    /* empty state */
    if(filtered.length === 0){
        document.getElementById("results").innerHTML =
            "<h3 style='text-align:center'>No flights match your filters. Try moving the price slider up.</h3>";
        return;
    }

    let html = "";

    filtered.forEach(f => {

        /* SerpAPI gives time as "10:30 AM" string directly */
        let depTime = f.departure_time || "--:--";
        let arrTime = f.arrival_time || "--:--";

        /* duration from duration_mins field */
        let durationText = "--";
        if(f.duration_mins){
            let h = Math.floor(f.duration_mins / 60);
            let m = f.duration_mins % 60;
            durationText = h + "h " + m + "m";
        }

        /* stops badge */
        let stopsText = f.stops === 0 ? "Non-stop" : f.stops + " stop" + (f.stops > 1 ? "s" : "");
        let stopsColor = f.stops === 0 ? "#007bff" : "#e67e22";

        /* airline logo — use SerpAPI provided logo, fallback to placeholder */
        let logoSrc = f.airline_logo || "https://via.placeholder.com/40";

        /* price */
        let priceDisplay = f.price ? "₹" + Math.round(f.price).toLocaleString("en-IN") : "N/A";

        html += `
        <div class="flight-card">

            <div class="flight-airline">
                <img src="${logoSrc}" class="airline-logo" onerror="this.src='https://via.placeholder.com/40'">
                <div>
                    <h3>${f.airline}</h3>
                    <p style="font-size:12px;color:#888">${f.flight_number || ""}</p>
                    <p>${f.departure_airport || f.departure_code} → ${f.arrival_airport || f.arrival_code}</p>
                </div>
            </div>

            <div class="flight-timeline">

                <div class="time-block">
                    <div class="time">${depTime}</div>
                    <div class="airport">${f.departure_code || currentDep}</div>
                </div>

                <div class="timeline-line">
                    <div class="duration">${durationText}</div>
                    <div class="line"></div>
                    <div class="stops" style="color:${stopsColor}">${stopsText}</div>
                </div>

                <div class="time-block">
                    <div class="time">${arrTime}</div>
                    <div class="airport">${f.arrival_code || currentArr}</div>
                </div>

            </div>

            <div class="flight-price">
                <div class="price">${priceDisplay}</div>
                <button onclick="saveFavourite('${f.flight_number || f.airline}')">⭐</button>
                <a href="${f.booking_link}" target="_blank" class="deal-btn">View Deal</a>
            </div>

        </div>
        `;
    });

    /* show results */
    document.getElementById("results").innerHTML = html;

    /* save recent */
    localStorage.setItem("recentFlights", JSON.stringify(filtered.slice(0,5)));
}

/* ===== FILTER CHANGE LISTENER ===== */

document.addEventListener("change", function(e){
    if(e.target.closest(".filters")){
        renderFlights();
    }
});

/* ===== LOGIN MODAL ===== */

function openLogin(){
    document.getElementById("loginModal").style.display = "flex";
}

function closeLogin(){
    document.getElementById("loginModal").style.display = "none";
}

/* ===== FAVOURITES ===== */

function saveFavourite(id){
    let fav = JSON.parse(localStorage.getItem("favs")) || [];
    if(!fav.includes(id)){
        fav.push(id);
        localStorage.setItem("favs", JSON.stringify(fav));
        alert("Saved to favourites ⭐");
    } else {
        alert("Already in favourites");
    }
}

/* ===== MENU ACTIONS ===== */

function showFav(){
    let fav = JSON.parse(localStorage.getItem("favs")) || [];
    alert(fav.length ? "Favourite Flights:\n" + fav.join("\n") : "No favourites saved yet");
}

function showRecent(){
    let rec = JSON.parse(localStorage.getItem("recentFlights")) || [];
    alert(rec.length ? "Recently viewed: " + rec.map(f => f.airline).join(", ") : "No recent searches");
}