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
    alert('Error: Unable to retrieve your location. Please ensure location services are enabled and you have granted permission.');
}

function fetchPrayerTimes(latitude, longitude) {
    const method = 2; // Change this based on your calculation method
    const url = `http://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=${method}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            const times = data.data.timings;
            updatePrayerTimesButtons(times);
        })
        .catch(error => console.error('Error fetching prayer times:', error));
}

function updatePrayerTimesButtons(times) {
    document.getElementById('fajr').textContent = `Fajr: ${times.Fajr}`;
    document.getElementById('dhuhr').textContent = `Dhuhr: ${times.Dhuhr}`;
    document.getElementById('asr').textContent = `Asr: ${times.Asr}`;
    document.getElementById('maghrib').textContent = `Maghrib: ${times.Maghrib}`;
    document.getElementById('isha').textContent = `Isha: ${times.Isha}`;
    // Qiyyam is not directly provided by Aladhan API, so you might need to calculate it or use Isha for demonstration
    document.getElementById('qiyyam').textContent = `Qiyyam: Not Available`;
}

function fetchIslamicDate(latitude, longitude) {
    const url = `http://api.aladhan.com/v1/gToH?latitude=${latitude}&longitude=${longitude}&adjustment=1`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            const hijriDate = data.data.hijri.date;
            updateIslamicDateFooter(hijriDate);
        })
        .catch(error => console.error('Error fetching Islamic date:', error));
}

function updateIslamicDateFooter(hijriDate) {
    document.getElementById('islamicDate').textContent = `Islamic Date: ${hijriDate}`;
}

// Modify the success function to also fetch the Islamic date
function success(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    fetchPrayerTimes(latitude, longitude);
    fetchIslamicDate(latitude, longitude); // Fetch Islamic date
}


getLocation();
