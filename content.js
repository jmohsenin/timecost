var DEFAULT_COST_PER_HOUR = 10;

// Takes an arbitray string and returns the number of minutes of that event. Formats supported:
// "Tue, December 27, 8pm - 9pm"
// "Tue, December 27, 8:30pm - 9pm"
// "Tue, December 27, 8:30pm - 9:30pm"
// "Tue, Dec 27, 8:30pm - 9:30pm"
// "Tue, Dec 27 2016, 8pm - 9pm"
// "Tue, Dec 27 2016, 8pm - Wed, Dec 27 2016, 12am
// Moment.js strict mode is explicitly set to false to allow for flexible parsing
getLengthInMinutesFromString = function(dateTimeString) {
    var diff = 0,
        // Split the string on the ' - ', but use wildcard because gcal renders a special character
        dates = dateTimeString.split(/\ . /),
		// e.g. "Tue, December 27, 8pm" or "Tue, December 27, 8:30pm" or Tue, December 27 2016, 8pm"
		// or Tue, December 27 2016, 8:30pm"
		formats_with_datetime = ['ddd, MMM D, ha', 'ddd, MMM D, h:mma', 'ddd, MMM D YYYY, ha',
								 'ddd, MMM D YYYY, h:mma'],
		// e.g. "8pm" or "8:30pm"
		formats_with_time = ['ha', 'h:mma'];

    d1 = moment(dates[0], formats_with_datetime, false);
    d2 = moment(dates[1], formats_with_time, true);

    // If d2 is valid here, then we need to set the correct year, month, day
    if (d2.isValid()) {
        d2.year(d1.year()).month(d1.month()).date(d1.date());
    // E.g. "Tue, December 27, 8:00pm"
    } else {
        d2 = moment(dates[1], formats_with_datetime, false);
    }

    diff = d2.diff(d1, 'minute', true);

    return diff;
};

// Parses GCal's event page datepicker and returns the number of minutes
getLengthInMinutesFromDatepicker = function() {
    var diff = 0,
        startDay,
        startTime,
        endDay,
        endTime;

    // Find any instance of a datepicker on the page, and set the correct variable based on the
    // title. Gcal scrambles IDs so we have to rely on classes and titles.
    $.each($('.dr-date'), function() {
        if ($(this).attr('title') == 'From date') {
            startDay = $(this).val();
        } else if ($(this).attr('title') == 'Until date') {
            endDay = $(this).val();
        }
    });

    // Same as a bove, but for timepicker
    $.each($('.dr-time'), function(el) {
        if ($(this).attr('title') == 'From time') {
            startTime = $(this).val();
        } else if ($(this).attr('title') == 'Until time') {
            endTime = $(this).val();
        }
    });

    // Create two different moments, one for the date and one for the hour, and then combine them,
	// for the start datetime and the end datetime
    d1 = moment(startDay, 'M/D/YYYY', false);
    d1h = moment(startTime, 'h:mma', true);
    d1.hours(d1h.hours()).minutes(d1h.minutes());

    d2 = moment(endDay, 'M/D/YYYY', false);
    d2h = moment(endTime, 'h:mma', true);
    d2.hours(d2h.hours()).minutes(d2h.minutes());

    diff = d2.diff(d1, 'minute', true);

    return diff;
};

getNumAttendees = function(el) {
    var attendees = 1; // TOOD(jackson): figure out if we should zero-index this or not
    label = el.find(':contains(Who)');

    if (label.length > 0) {
        wrapper = label.filter('tr');
        // Gcal wraps some names in a <font> tag, filter for those
        attendeeSpans = wrapper.find('span');
        attendees = attendeeSpans.length;
        $.each(attendeeSpans, function() {
            // If the span has a 's' as a parent class, that means it's striked through, indicating
            // the attendee is not attending
            if ($($(this).parent()).is('s')) {
                attendees--;
            // If the span doesn't have a data-email attribute, it's probably a non-attendee entity,
            // like a conference room
            } else if (!$(this).data('email')) {
                attendees--;
            }
        });

        additionalAttendees = parseInt(wrapper.text().split('+')[1]);
        if (additionalAttendees) {
            attendees += additionalAttendees;
        }
    }

    return attendees;
};

getNumAttendeesFromDatepicker = function() {
    var attendeeListItems = $('#\\:1inewBody').children().length,
        attendees = attendeeListItems,
        // A string like "Yes: 63, Maybe: 1, No: 1, Awaiting: 105"
        responseCountString = $('.ep-gl-count').text();

    if (responseCountString.length > 0) {
        // Converts string into ["63", "1", "1", "105"]
        responseCountArray = responseCountString.match(/\d+/g);
        // Removes the 3rd element from the array, which corresponds to the "No" count
        responseCountArray.splice(2, 1);
        // Converts the number strings into ints
        for (var i=0; i<responseCountArray.length; i++) {
            responseCountArray[i] = +responseCountArray[i];
        }
        // Sums the contents of the array
        var responseCount = responseCountArray.reduce(function(a, b) {
            return a + b;
        });

        if (responseCount > attendeeListItems) {
            attendees = responseCount;
        }
    }

    if (attendees === 0) {
        attendees = 1; // TOOD(jackson): figure out if we should zero-index this or not
    }

    return attendees;
};

// TODO: refactor renderCostInEventPreview and renderCostOnEventPage to not use HTML strings
renderCostInEventPreview = function(el, cost) {
    if (!cost) {
		return;
	}

    var tbody = el.find('.neb-data tbody'),
        newRow = '<tr><th>Cost</th><td>~$' + cost + '</td></tr>';

	// For some reason, sometimes gcal doesn't include the <tbody> element.
	if (tbody.length > 0) {
		tbody.append(newRow);
	} else {
		el.find('.neb-data').append('<tbody>' + newRow + '</tbody>');
    }
};

renderCostOnEventPage = function(cost) {
	if (!cost) {
		return;
	}

    if ($('#tc-total-cost').length > 0) {
        $('#tc-total-cost').html(cost);
    } else {
        var newRow = '<div style="margin-bottom: 10px;"><strong>Total Cost:</strong> $' +
					 '<span id="tc-total-cost">' + cost + '</span></div>';
        $('.ep-dp-guests').prepend(newRow);
    }
};

showCostInEventPreview = function (el) {
	var dateTimeString = el.find('.neb-date').text(),
		length = getLengthInMinutesFromString(dateTimeString),
		attendees = getNumAttendees(el);

    chrome.storage.sync.get({
        hourlyRate: DEFAULT_COST_PER_HOUR
    }, function(items) {
        var totalCost = length * (items.hourlyRate / 60) * attendees;
        renderCostInEventPreview(el, totalCost);
    });
};

showCostOnEventPage = function() {
    var dateTimeString = $('.ep-drs .ui-sch-schmedit:first').text(),
        length,
        attendees = getNumAttendeesFromDatepicker();

    if (dateTimeString.length > 0) {
        length = getLengthInMinutesFromString(dateTimeString);
    } else {
        length = getLengthInMinutesFromDatepicker();
    }

    chrome.storage.sync.get({
        hourlyRate: DEFAULT_COST_PER_HOUR
    }, function(items) {
        var totalCost = length * (items.hourlyRate / 60) * attendees;
        renderCostOnEventPage(totalCost);
    });
};

// Adapted from http://stackoverflow.com/a/10415599
var eventPreviewObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.addedNodes && mutation.addedNodes.length > 0) {
            var bubble;
            mutation.addedNodes.forEach(function(el){
                $el = $(el);
                if ($el.hasClass('bubble')) {
                    bubble = $el;
                }
            });

            if (bubble) {
				showCostInEventPreview(bubble);
            }
        }
    });
});

var guestListObserver = new MutationObserver(function(mutations) {
    showCostOnEventPage();
});

var timeControlsObserver = new MutationObserver(function(mutations) {
    showCostOnEventPage();
});

initMutationObserver = function() {
    // Need to check both the URL hash and the actual html contents, because if you refresh the
    // page while viewing an event page, the hash won't change but gcal will show the main cal view
    if (window.location.hash.includes('eventpage') && $('#coverinner').html().length > 0) {
        eventPreviewObserver.disconnect();
        showCostOnEventPage();
        // childList only listens to immediate children, while subtree listens to all children
        guestListObserver.observe($('.ep-gl')[0], {childList: true, subtree: true});
        timeControlsObserver.observe($('.ep-dpc')[0], {childList: true, subtree: true, attributes: true});
    } else {
        guestListObserver.disconnect();
        timeControlsObserver.disconnect();
        // Need to observe document.body, because gcal inserts popover to the body
        eventPreviewObserver.observe(document.body, {childList: true});
    }
};

// Re-initialize when page changes
// TODO: fix case where if you refresh gcal on event page, then click into same event, the mutation
// observer is not properly initialized, e.g. by making this listen to #coverinner style attribute
// change rather than hash
$(window).on('hashchange', function() {
    initMutationObserver();
});

// Initialize on page load
initMutationObserver();
