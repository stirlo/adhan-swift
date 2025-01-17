// Prayer Times Generator with Astronomical Data
const CONFIG = {
    method: 3,  // MWL method
    school: 1,  // Hanafi
    defaultLocation: {
        latitude: -37.000000,  // Melbourne
        longitude: 145.000000
    },
    folderName: "TimeIsland",
    fileName: "yearly_prayer_times.json"
};

let progressAlert;

async function showProgress(title, message) {
    if (!progressAlert) {
        progressAlert = new Alert();
    }
    progressAlert.title = title;
    progressAlert.message = message;
    progressAlert.present();
    console.log(`${title}: ${message}`);
}

function convertToMinutes(timeString) {
    try {
        // Handle ISO8601 format
        if (timeString.includes('T')) {
            // Extract just the time portion and remove timezone info
            timeString = timeString.split('T')[1].split(/[+-]/)[0];
        }

        // Remove seconds if present
        timeString = timeString.split(':').slice(0,2).join(':');

        const [hours, minutes] = timeString.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) {
            console.log(`Invalid time format: ${timeString}`);
            return null;
        }
        return hours * 60 + minutes;
    } catch (error) {
        console.log(`Time conversion error for ${timeString}:`, error);
        return null;
    }
}

function minutesToTime(minutes) {
    if (minutes === null) return "00:00";
    minutes = Math.floor(minutes);
    if (minutes >= 24 * 60) minutes %= (24 * 60);
    if (minutes < 0) minutes += 24 * 60;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function calculateLength(startTime, endTime) {
    if (startTime === null || endTime === null) return { minutes: 0, formatted: "00:00" };
    let lengthInMinutes = endTime - startTime;
    if (lengthInMinutes < 0) {
        lengthInMinutes += 24 * 60;
    }
    return {
        minutes: lengthInMinutes,
        formatted: minutesToTime(lengthInMinutes)
    };
}

function calculateNightPortions(maghribTime, fajrTime) {
    if (maghribTime === null || fajrTime === null) {
        return {
            firstThird: "00:00",
            secondThird: "00:00",
            lastThird: "00:00"
        };
    }

    let nightLength = fajrTime <= maghribTime ? 
        (fajrTime + 24 * 60) - maghribTime : 
        fajrTime - maghribTime;

    return {
        firstThird: minutesToTime((maghribTime + nightLength / 3) % (24 * 60)),
        secondThird: minutesToTime((maghribTime + (2 * nightLength / 3)) % (24 * 60)),
        lastThird: minutesToTime(fajrTime)
    };
}

async function generateYearlyPrayerTimes() {
    const year = new Date().getFullYear();
    const prayerTimes = [];

    await showProgress("Location", "Getting location...");
    const location = await getCurrentLocation();
    console.log("Location details:", JSON.stringify(location));

    for (let month = 1; month <= 12; month++) {
        await showProgress("Generating", `Month ${month} of 12`);

        try {
            const url = `http://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${location.latitude}&longitude=${location.longitude}&method=${CONFIG.method}&school=${CONFIG.school}&iso8601=true`;
            console.log(`Fetching URL: ${url}`);

            const req = new Request(url);
            const response = await req.loadJSON();

            if (!response.data) {
                throw new Error(`Invalid API response for month ${month}`);
            }

            console.log(`Processing ${response.data.length} days for month ${month}`);

            for (const day of response.data) {
                try {
                    const times = day.timings;
                    if (!times) continue;

                    // Extract base times without DST adjustment
                    const fajrTime = convertToMinutes(times.Fajr);
                    const maghribTime = convertToMinutes(times.Maghrib);

                    const dayLength = calculateLength(fajrTime, maghribTime);
                    const nightLength = calculateLength(maghribTime, fajrTime);
                    const nightWatches = calculateNightPortions(maghribTime, fajrTime);

                    const entry = {
                        "beginning": {
                            "sehri": minutesToTime(convertToMinutes(times.Imsak)),
                            "fajarb": minutesToTime(fajrTime),
                            "sunrise": minutesToTime(convertToMinutes(times.Sunrise)),
                            "zoharb": minutesToTime(convertToMinutes(times.Dhuhr)),
                            "asarb": minutesToTime(convertToMinutes(times.Asr)),
                            "maghribb": minutesToTime(maghribTime),
                            "ishab": minutesToTime(convertToMinutes(times.Isha))
                        },
                        "astronomical": {
                            "sunrise": minutesToTime(convertToMinutes(times.Sunrise)),
                            "sunset": minutesToTime(convertToMinutes(times.Sunset)),
                            "midnight": minutesToTime(convertToMinutes(times.Midnight)),
                            "nightWatches": nightWatches,
                            "dayLength": dayLength.formatted,
                            "nightLength": nightLength.formatted,
                            "dayLengthMinutes": dayLength.minutes,
                            "nightLengthMinutes": nightLength.minutes
                        },
                        "_id": `${day.date.gregorian.day.padStart(2, '0')}-${day.date.gregorian.month.number.toString().padStart(2, '0')}`
                    };
                    prayerTimes.push(entry);
                } catch (dayError) {
                    console.log(`Error processing day in month ${month}:`, dayError);
                }
            }
            console.log(`Completed month ${month}`);
        } catch (error) {
            console.error(`Error processing month ${month}:`, error);
            throw error;
        }
    }

    return prayerTimes;
}

async function getCurrentLocation() {
    try {
        await Location.requestAuthorization();
        const location = await Location.current();
        return {
            latitude: location.latitude,
            longitude: location.longitude
        };
    } catch (error) {
        console.log("Location error details:", error);
        console.log("Using default location");
        return CONFIG.defaultLocation;
    }
}

async function ensureFolder(fm, folderPath) {
    if (!fm.fileExists(folderPath)) {
        console.log(`Creating folder: ${folderPath}`);
        fm.createDirectory(folderPath);
    }
}

async function main() {
    try {
        await showProgress("Setup", "Initializing...");

        const fm = FileManager.iCloud();
        const baseDir = fm.documentsDirectory();
        const folderPath = fm.joinPath(baseDir, CONFIG.folderName);

        await ensureFolder(fm, folderPath);
        const filePath = fm.joinPath(folderPath, CONFIG.fileName);
        console.log(`Will save to: ${filePath}`);

        const prayerTimes = await generateYearlyPrayerTimes();

        await showProgress("Saving", "Writing file...");
        fm.writeString(filePath, JSON.stringify(prayerTimes, null, 2));

        await showProgress("Complete", "File saved successfully!");
        await new Promise(r => Timer.schedule(1000, false, r));

        let successAlert = new Alert();
        successAlert.title = "Success!";
        successAlert.message = `Prayer times generated and saved to:\n${filePath}`;
        successAlert.addAction("OK");
        await successAlert.present();

    } catch (error) {
        console.error("Main error:", error);

        let errorAlert = new Alert();
        errorAlert.title = "Error";
        errorAlert.message = `Failed: ${error.message}\n\nCheck console for details.`;
        errorAlert.addAction("OK");
        await errorAlert.present();
    }
}

await main();