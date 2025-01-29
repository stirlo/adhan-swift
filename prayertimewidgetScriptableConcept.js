// Prayer Times Widget for Scriptable iOS
// Version 8.5.3 - Global System with Precise Lunar Calculations & Focus Mode
// Last updated: 2025-01-18

class PrayerCalculator {
    constructor() {
        this.CONFIG = {
            folderName: "TimeIsland",
            fileName: "yearly_prayer_times.json",
            useICloud: true,
            location: {
                name: "Melbourne",
                latitude: -37.000000,
                longitude: 145.000000
            }
        };

        this.prayerSymbols = {
            fajarb: "sun.haze.fill",
            sunrise: "sunrise.fill",
            zoharb: "sun.max.fill",
            asarb: "sun.and.horizon.fill",
            maghribb: "sunset.fill",
            ishab: "moon.stars.fill",
            duha: "sun.min.fill"
        };

        this.northernMoonPhases = {
            new: "moonphase.new.moon",
            waxingCrescent: "moonphase.waxing.crescent",
            firstQuarter: "moonphase.first.quarter",
            waxingGibbous: "moonphase.waxing.gibbous",
            full: "moonphase.full.moon",
            waningGibbous: "moonphase.waning.gibbous",
            lastQuarter: "moonphase.last.quarter",
            waningCrescent: "moonphase.waning.crescent"
        };

        this.prayerNames = {
            fajarb: "Dawn",
            sunrise: "Sunrise",
            zoharb: "Noon",
            asarb: "Afternoon",
            maghribb: "Sunset",
            ishab: "Night",
            duha: "Brunch"
        };

        this.initializeMoonPhases();
    }

    async triggerFocus(prayerName) {
        const shortcutMap = {
            'fajarb': 'FajrFocus',
            'sunrise': 'SunriseFocus',
            'zoharb': 'DhuhrFocus',
            'asarb': 'AsrFocus',
            'maghribb': 'MaghribFocus',
            'ishab': 'IshaFocus'
        };

        const shortcutName = shortcutMap[prayerName];
        if (shortcutName) {
            let url = `shortcuts://run-shortcut?name=${encodeURIComponent(shortcutName)}`;
            let req = new Request(url);
            try {
                await req.load();
                console.log(`Triggered ${shortcutName}`);
            } catch (e) {
                console.log(`Focus mode shortcut ${shortcutName} not found`);
            }
        }
    }

    initializeMoonPhases() {
        const isSouthernHemisphere = this.CONFIG.location.latitude < 0;
        this.moonPhaseSymbols = {};

        for (const [phase, symbol] of Object.entries(this.northernMoonPhases)) {
            this.moonPhaseSymbols[phase] = isSouthernHemisphere ? 
                `${symbol}.inverse` : symbol;
        }
    }

    calculateMoonPhase() {
        const now = new Date();
        const synmonth = 29.53058867;

        function getJulianDate(date) {
            const time = date.getTime();
            return (time / 86400000) + 2440587.5;
        }

        const jd = getJulianDate(now);
        const knownNewMoon = getJulianDate(new Date(2024, 0, 11, 11, 57));

        const monthsSince = (jd - knownNewMoon) / synmonth;
        let phase = monthsSince % 1;
        if (phase < 0) phase += 1;

        const illumination = Math.round(((1 - Math.cos(phase * 2 * Math.PI)) / 2) * 100);

        return {
            symbol: this.getMoonPhaseSymbol(phase),
            percentage: illumination,
            phase: phase
        };
    }

    getMoonPhaseSymbol(phase) {
        const phases = Object.keys(this.moonPhaseSymbols);
        const index = Math.floor(phase * phases.length) % phases.length;
        return this.moonPhaseSymbols[phases[index]];
    }

    loadPrayerTimes() {
        try {
            const fm = this.CONFIG.useICloud ? FileManager.iCloud() : FileManager.local();
            const baseDir = fm.documentsDirectory();
            const folderPath = fm.joinPath(baseDir, this.CONFIG.folderName);
            const filePath = fm.joinPath(folderPath, this.CONFIG.fileName);

            if (!fm.fileExists(filePath)) {
                throw new Error("Prayer times file not found");
            }

            const jsonString = fm.readString(filePath);
            return JSON.parse(jsonString);
        } catch (error) {
            console.error("Error loading prayer times:", error);
            throw error;
        }
    }

    getTodayId() {
        const now = new Date();
        const day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        return `${day}-${month}`;
    }

    parseTime(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    }

    calculateDuhaTime(sunrise, noon) {
        const sunriseTime = this.parseTime(sunrise);
        const noonTime = this.parseTime(noon);
        const diffMs = noonTime - sunriseTime;
        return new Date(sunriseTime.getTime() + (diffMs / 4));
    }

    async getCurrentPrayerInfo() {
        const times = this.loadPrayerTimes();
        const todayData = times.find(t => t._id === this.getTodayId());

        if (!todayData) {
            throw new Error("Could not find today's data");
        }

        const now = new Date();
        const prayerList = [
            { name: 'fajarb', time: this.parseTime(todayData.beginning.fajarb), symbol: this.prayerSymbols.fajarb },
            { name: 'sunrise', time: this.parseTime(todayData.astronomical.sunrise), symbol: this.prayerSymbols.sunrise },
            { name: 'duha', time: this.calculateDuhaTime(todayData.astronomical.sunrise, todayData.beginning.zoharb), symbol: this.prayerSymbols.duha },
            { name: 'zoharb', time: this.parseTime(todayData.beginning.zoharb), symbol: this.prayerSymbols.zoharb },
            { name: 'asarb', time: this.parseTime(todayData.beginning.asarb), symbol: this.prayerSymbols.asarb },
            { name: 'maghribb', time: this.parseTime(todayData.beginning.maghribb), symbol: this.prayerSymbols.maghribb },
            { name: 'ishab', time: this.parseTime(todayData.beginning.ishab), symbol: this.prayerSymbols.ishab }
        ];

        prayerList.sort((a, b) => a.time - b.time);

        let current = prayerList[prayerList.length - 1];
        let next = prayerList[0];

        for (let i = 0; i < prayerList.length; i++) {
            if (now < prayerList[i].time) {
                current = prayerList[i > 0 ? i - 1 : prayerList.length - 1];
                next = prayerList[i];
                break;
            }
        }

        if (now < next.time && next.time - now < 60000) {
            await this.triggerFocus(next.name);
        }

        return { current, next };
    }

    formatTime(date) {
        if (!date || isNaN(date)) return '--:--';
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    getTimeBasedGradient(currentTime) {
        const todayData = this.loadPrayerTimes().find(t => t._id === this.getTodayId());
        let gradient = new LinearGradient();
        gradient.locations = [0, 1];

        const prayerTimes = {
            fajr: this.parseTime(todayData.beginning.fajarb),
            sunrise: this.parseTime(todayData.astronomical.sunrise),
            dhuhr: this.parseTime(todayData.beginning.zoharb),
            asr: this.parseTime(todayData.beginning.asarb),
            maghrib: this.parseTime(todayData.beginning.maghribb),
            isha: this.parseTime(todayData.beginning.ishab),
            midnight: this.parseTime(todayData.astronomical.midnight)
        };

        if (currentTime >= prayerTimes.isha || currentTime < prayerTimes.midnight) {
            gradient.colors = [
                new Color("800020"),
                new Color("2d0a31")
            ];
        }
        else if (currentTime < prayerTimes.fajr) {
            gradient.colors = [
                new Color("000033"),
                new Color("000000")
            ];
        }
        else if (currentTime < prayerTimes.sunrise) {
            gradient.colors = [
                new Color("1e3799"),
                new Color("4a69bd")
            ];
        }
        else if (currentTime < prayerTimes.dhuhr) {
            gradient.colors = [
                new Color("60a3bc"),
                new Color("82ccdd")
            ];
        }
        else if (currentTime < prayerTimes.asr) {
            gradient.colors = [
                new Color("f6b93b"),
                new Color("fad390")
            ];
        }
        else if (currentTime < prayerTimes.maghrib) {
            gradient.colors = [
                new Color("e55039"),
                new Color("fa983a")
            ];
        }
        else if (currentTime < prayerTimes.isha) {
            gradient.colors = [
                new Color("b71540"),
                new Color("e55039")
            ];
        }

        return gradient;
    }
}

class PrayerWidget {
    constructor() {
        this.widget = new ListWidget();
        this.calculator = new PrayerCalculator();
    }

    createSymbolImage(symbolName, size = 24) {
        const symbol = SFSymbol.named(symbolName);
        return symbol.image;
    }

    async createWidget() {
        try {
            const { current, next } = await this.calculator.getCurrentPrayerInfo();
            const now = new Date();
            const todayData = this.calculator.loadPrayerTimes().find(t => t._id === this.calculator.getTodayId());
            const maghribTime = this.calculator.parseTime(todayData.beginning.maghribb);

            this.widget.backgroundGradient = this.calculator.getTimeBasedGradient(now);

            const mainStack = this.widget.addStack();
            mainStack.layoutHorizontally();
            mainStack.centerAlignContent();

            const leftStack = mainStack.addStack();
            leftStack.layoutVertically();
            leftStack.centerAlignContent();

            const currentSymbol = this.createSymbolImage(current.symbol);
            const currentSymbolElement = leftStack.addImage(currentSymbol);
            currentSymbolElement.imageSize = new Size(30, 30);
            currentSymbolElement.tintColor = Color.white();

            leftStack.addSpacer(4);

            const currentText = leftStack.addText("Current");
            currentText.font = Font.boldSystemFont(12);
            currentText.textColor = Color.white();

            const currentPrayerText = leftStack.addText(this.calculator.prayerNames[current.name]);
            currentPrayerText.font = Font.boldSystemFont(16);
            currentPrayerText.textColor = Color.white();

            mainStack.addSpacer();

            const rightStack = mainStack.addStack();
            rightStack.layoutVertically();
            rightStack.centerAlignContent();

            const nextSymbol = this.createSymbolImage(next.symbol);
            const nextSymbolElement = rightStack.addImage(nextSymbol);
            nextSymbolElement.imageSize = new Size(30, 30);
            nextSymbolElement.tintColor = Color.white();

            rightStack.addSpacer(4);

            const nextText = rightStack.addText("Next");
            nextText.font = Font.boldSystemFont(12);
            nextText.textColor = Color.white();

            const nextPrayerText = rightStack.addText(this.calculator.prayerNames[next.name]);
            nextPrayerText.font = Font.boldSystemFont(16);
            nextPrayerText.textColor = Color.white();

            const nextTimeText = rightStack.addText(this.calculator.formatTime(next.time));
            nextTimeText.font = Font.mediumSystemFont(14);
            nextTimeText.textColor = new Color("#CCCCCC");

            this.widget.addSpacer();

            const bottomStack = this.widget.addStack();
            bottomStack.layoutHorizontally();
            bottomStack.centerAlignContent();

            const calendarSymbol = this.createSymbolImage("calendar.circle.fill", 14);
            const calendarElement = bottomStack.addImage(calendarSymbol);
            calendarElement.imageSize = new Size(14, 14);
            calendarElement.tintColor = Color.white();

            bottomStack.addSpacer(4);

            // Updated lunar date calculation using JSON data
            let hijriDay = todayData.dates.hijri.day;
            let hijriMonth = todayData.dates.hijri.month;

            // Adjust for after Maghrib
            if (now > maghribTime) {
                hijriDay++;
                if (hijriDay > 30) {
                    hijriDay = 1;
                    hijriMonth++;
                    if (hijriMonth > 12) {
                        hijriMonth = 1;
                    }
                }
            }

            const dateText = bottomStack.addText(`${hijriDay}/${hijriMonth}`);
            dateText.font = Font.mediumSystemFont(12);
            dateText.textColor = Color.white();

            bottomStack.addSpacer();

            const moonData = this.calculator.calculateMoonPhase();
            const moonSymbol = this.createSymbolImage(moonData.symbol, 14);
            const moonElement = bottomStack.addImage(moonSymbol);
            moonElement.imageSize = new Size(14, 14);
            moonElement.tintColor = Color.white();

            bottomStack.addSpacer(4);
            const moonText = bottomStack.addText(`${moonData.percentage}%`);
            moonText.font = Font.mediumSystemFont(12);
            moonText.textColor = Color.white();

            return this.widget;
        } catch (error) {
            return this.createErrorWidget(error);
        }
    }

    createErrorWidget(error) {
        const errorWidget = new ListWidget();
        errorWidget.backgroundColor = new Color("#000033");
        const errorText = errorWidget.addText("⚠️ Error: " + error.message);
        errorText.textColor = Color.red();
        return errorWidget;
    }
}

async function main() {
    const widget = new PrayerWidget();
    const widgetContent = await widget.createWidget();

    if (config.runsInWidget) {
        Script.setWidget(widgetContent);
    } else {
        await widgetContent.presentMedium();
    }

    Script.complete();
}

await main();
