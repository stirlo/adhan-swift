// script.js
navigator.geolocation.getCurrentPosition(success, error);

function success(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    fetchPrayerTimes(latitude, longitude);
}

function error() {
    alert('Unable to retrieve your location');
}

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
