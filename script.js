
// script.js
function getLocation() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(success, error);
    } else {
        alert('Geolocation is not supported by your browser');
    }
}

function success(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    fetchPrayerTimes(latitude, longitude);
}

function error(err) {
    console.warn(`ERROR(${err.code}): ${err.message}`);
    // Provide a more user-friendly message or alternative here
    alert('Error: Unable to retrieve your location. Please ensure location services are enabled and you have granted permission.');
}

getLocation();

function fetchPrayerTimes(latitude, longitude) {
    const url = `http://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=2`;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            const times = data.data.timings;
            document.getElementById('fajr').textContent += `: ${times.Fajr}`;
            document.getElementById('dhuhr').textContent += `: ${times.Dhuhr}`;
            document.getElementById('asr').textContent += `: ${times.Asr}`;
            document.getElementById('maghrib').textContent += `: ${times.Maghrib}`;
            document.getElementById('isha').textContent += `: ${times.Isha}`;
            // Qiyyam is not directly provided, calculate based on Isha or use a fixed time after Isha
            document.getElementById('islamicDate').textContent = `Islamic Date: ${data.data.date.hijri.date}`;
        })
        .catch(console.error);
}
