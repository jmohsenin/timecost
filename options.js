document.addEventListener('DOMContentLoaded', function() {
    var hourlyRateInput = document.getElementById('hourly-rate');

    chrome.storage.sync.get(null, function(items) {
        if (items.hourlyRate) {
            hourlyRateInput.value = items.hourlyRate;
        }
    });

    hourlyRateInput.addEventListener('input', function() {
        if (hourlyRateInput.value > 0) {
            chrome.storage.sync.set({
                hourlyRate: hourlyRateInput.value
            });
        }
    });
});
