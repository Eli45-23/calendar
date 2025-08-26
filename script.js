document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    const eventModal = document.getElementById('eventModal');
    const closeModalBtn = eventModal.querySelector('.close-button');
    const modalDate = document.getElementById('modalDate');
    const statusInput = document.getElementById('statusInput');
    const saveStatusBtn = document.getElementById('saveStatusBtn');
    const deleteStatusBtn = document.getElementById('deleteStatusBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    let currentClickedDate = null; // To store the date of the currently clicked cell

    // Function to show the modal
    function showModal(date) {
        currentClickedDate = date;
        modalDate.innerText = date.toDateString();
        const storedStatus = localStorage.getItem(date.toISOString().slice(0, 10));
        statusInput.value = storedStatus || '';
        eventModal.classList.add('show');
        // Prevent body scrolling on mobile when modal is open
        document.body.style.overflow = 'hidden';
        // Focus on input for better mobile UX
        setTimeout(() => {
            statusInput.focus();
        }, 300);
    }

    // Function to hide the modal
    function hideModal() {
        eventModal.classList.remove('show');
        statusInput.value = ''; // Clear input
        currentClickedDate = null;
        // Re-enable body scrolling on mobile
        document.body.style.overflow = '';
    }

    // Event listeners for modal buttons
    closeModalBtn.addEventListener('click', hideModal);
    cancelBtn.addEventListener('click', hideModal);

    saveStatusBtn.addEventListener('click', function() {
        if (currentClickedDate) {
            const dateKey = currentClickedDate.toISOString().slice(0, 10);
            const status = statusInput.value;
            localStorage.setItem(dateKey, status);
            const cellElement = calendar.el.querySelector(`td[data-date="${dateKey}"]`);
            if (cellElement) {
                updateDayCellStatus(cellElement, status);
            }
            calendar.removeAllEvents();
            calendar.addEventSource(calculateEvents());
            hideModal();
        }
    });

    deleteStatusBtn.addEventListener('click', function() {
        if (currentClickedDate) {
            const dateKey = currentClickedDate.toISOString().slice(0, 10);
            localStorage.removeItem(dateKey);
            const cellElement = calendar.el.querySelector(`td[data-date="${dateKey}"]`);
            if (cellElement) {
                updateDayCellStatus(cellElement, null); // Pass null to clear status
            }
            calendar.removeAllEvents();
            calendar.addEventSource(calculateEvents());
            hideModal();
        }
    });

    function getPaydays(startDate) {
        const paydays = [];
        let currentDate = new Date(startDate);
        const endDate = new Date(startDate.getFullYear(), 11, 31);

        while (currentDate <= endDate) {
            paydays.push({
                start: currentDate.toISOString().slice(0, 10),
                display: 'background',
                color: '#4caf50'
            });
            currentDate.setDate(currentDate.getDate() + 14);
        }

        return paydays;
    }

    function getPayPeriods(startDate) {
        const payPeriods = [];
        let currentDate = new Date(startDate);
        const endDate = new Date(startDate.getFullYear(), 11, 31);

        while (currentDate <= endDate) {
            const periodEnd = new Date(currentDate);
            periodEnd.setDate(periodEnd.getDate() + 13); // 14 days inclusive

            payPeriods.push({
                start: currentDate.toISOString().slice(0, 10),
                end: periodEnd.toISOString().slice(0, 10)
            });
            currentDate.setDate(currentDate.getDate() + 14);
        }

        return payPeriods;
    }

    function updateDayCellStatus(cellElement, statusText) {
        // Clear previous status display
        const existingStatusDiv = cellElement.querySelector('.day-status');
        if (existingStatusDiv) {
            existingStatusDiv.remove();
        }
        cellElement.classList.remove('worked-day', 'overtime-day', 'none-day');

        if (statusText) {
            const statusDiv = document.createElement('div');
            statusDiv.classList.add('day-status');
            statusDiv.innerText = statusText;
            cellElement.appendChild(statusDiv);

            // Apply background color based on keywords
            if (statusText.toLowerCase().includes('ot') || statusText.toLowerCase().includes('overtime')) {
                cellElement.classList.add('overtime-day');
            } else if (statusText.toLowerCase().includes('worked') || statusText.toLowerCase().includes('hrs')) {
                cellElement.classList.add('worked-day');
            } else if (statusText.toLowerCase().includes('none')) {
                cellElement.classList.add('none-day');
            }
        }
    }

    function drawPayPeriodBrackets() {
        // Clear existing brackets/labels
        document.querySelectorAll('.pay-bracket, .pay-label').forEach(el => el.remove());

        const payPeriods = getPayPeriods(new Date("2025-08-10")); // Re-calculate or pass in

        payPeriods.forEach(period => {
            const startCell = calendar.getDateElement(period.start);
            const endCell = calendar.getDateElement(period.end);

            if (startCell) {
                createBracketAndLabel(startCell, 'start', period.start);
            }
            if (endCell) {
                createBracketAndLabel(endCell, 'end', period.end);
            }
        });
    }

    function createBracketAndLabel(cellElement, type, date) {
        const cellRect = cellElement.getBoundingClientRect();
        const calendarRect = calendar.el.getBoundingClientRect(); // Rect of the main calendar container

        // Create bracket
        const bracket = document.createElement('div');
        bracket.classList.add('pay-bracket');
        bracket.classList.add(`pay-bracket-${type}`);
        bracket.style.position = 'absolute';
        bracket.style.top = `${cellRect.top - calendarRect.top}px`;
        bracket.style.height = `${cellRect.height}px`;
        bracket.style.width = '8px'; // Fixed width for bracket

        if (type === 'start') {
            bracket.style.left = `${cellRect.left - calendarRect.left}px`;
        } else { // type === 'end'
            bracket.style.left = `${cellRect.right - calendarRect.left - 8}px`; // 8px is bracket width
        }
        bracket.style.pointerEvents = 'none'; // Ensure it doesn't block clicks
        bracket.style.zIndex = '0'; // Below labels and events
        calendar.el.appendChild(bracket);

        // Create label
        const label = document.createElement('div');
        label.classList.add('pay-label');
        label.classList.add(`pay-label-${type}`);
        label.textContent = isMobileView() ? type : `${type} pay period`; // Shorten text
        label.setAttribute('aria-label', `Pay period ${type}`);
        label.style.position = 'absolute';
        label.style.pointerEvents = 'none'; // Ensure it doesn't block clicks
        label.style.zIndex = '2'; // Above brackets, below events

        // Append to DOM temporarily to measure
        calendar.el.appendChild(label);

        const labelRect = label.getBoundingClientRect();

        // Vertical centering
        label.style.top = `${cellRect.top - calendarRect.top + (cellRect.height / 2) - (labelRect.height / 2)}px`;

        // Horizontal positioning and clamping
        const bracketWidth = 8;
        const labelHorizontalPadding = 4; // From .pay-label padding: 2px 4px;

        let desiredLeft;
        if (type === 'start') {
            desiredLeft = cellRect.left - calendarRect.left + bracketWidth + labelHorizontalPadding;
        } else { // type === 'end'
            desiredLeft = cellRect.right - calendarRect.left - bracketWidth - labelRect.width - labelHorizontalPadding;
        }

        // Clamping logic
        const calendarWidth = calendarRect.width;
        const calendarLeft = calendarRect.left;

        let clampedLeft = Math.max(0, desiredLeft); // Clamp to left edge of calendar
        clampedLeft = Math.min(clampedLeft, calendarWidth - labelRect.width); // Clamp to right edge of calendar

        label.style.left = `${clampedLeft}px`;
    }

    // Function to parse status text into hours
    function parseHours(statusString) {
        let regular = 0;
        let overtime = 0;
        const lowerStatus = statusString.toLowerCase();

        const otMatch = lowerStatus.match(/(\d+(\.\d+)?)\s*ot/);
        if (otMatch) {
            overtime = parseFloat(otMatch[1]);
        }

        const hrsMatch = lowerStatus.match(/(\d+(\.\d+)?)\s*hrs?/);
        if (hrsMatch && !otMatch) { // Only count as regular if not already counted as OT
            regular = parseFloat(hrsMatch[1]);
        } else if (hrsMatch && otMatch) { // If both present, assume total hours and subtract OT for regular
            const totalHours = parseFloat(hrsMatch[1]);
            regular = totalHours - overtime;
        }

        return { regular, overtime };
    }

    // Helper function to detect mobile view
    function isMobileView() {
        return window.innerWidth <= 430;
    }

    function calculateEvents() {
        const paydays = [];
        const payPeriods = getPayPeriods(new Date("2025-08-10"));

        payPeriods.forEach(period => {
            paydays.push({
                start: period.start,
                title: isMobileView() ? 'start' : 'start pay period', // Shorten for mobile
                isPayPeriodLabel: true, // Custom property to identify
                type: 'start-period'
            });
            paydays.push({
                start: period.end,
                title: isMobileView() ? 'end' : 'end pay period', // Shorten for mobile
                isPayPeriodLabel: true, // Custom property
                type: 'end-period'
            });

            const payDate = new Date(period.end);
            payDate.setDate(payDate.getDate() + 5);

            let totalRegularHours = 0;
            let totalOvertimeHours = 0;

            // Iterate through days in the pay period to calculate hours
            let dayIterator = new Date(period.start);
            while (dayIterator <= new Date(period.end)) {
                const dateKey = dayIterator.toISOString().slice(0, 10);
                const status = localStorage.getItem(dateKey);
                if (status) {
                    const hours = parseHours(status);
                    totalRegularHours += hours.regular;
                    totalOvertimeHours += hours.overtime;
                }
                dayIterator.setDate(dayIterator.getDate() + 1);
            }

            paydays.push({
                start: payDate.toISOString().slice(0, 10),
                title: `Payday for:<br>${period.start.slice(5).replace('-', '/')}-${period.end.slice(5).replace('-', '/')}<br>Reg: ${totalRegularHours} OT: ${totalOvertimeHours}`,
                color: '#4caf50' // Use the same color as original paydays
            });
        });
        return paydays;
    }

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        dayMaxEvents: true, // automatically stack events and add a "+more" link
        events: calculateEvents(),
        initialDate: new Date(),
        height: 'auto', // Responsive height
        contentHeight: 'auto',
        aspectRatio: window.innerWidth < 768 ? 1.0 : 1.35, // Adjust aspect ratio for mobile
        eventContent: function(arg) {
            if (arg.event.title.startsWith('Payday for:')) {
                return { html: arg.event.title };
            }
            return { html: arg.event.title }; // Default rendering for other events
        },
        dayCellDidMount: function(info) {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Normalize today's date to start of day

            if (info.date < today) {
                info.el.classList.add('past-day');
            }

            // Initialize status from localStorage
            const storedStatus = localStorage.getItem(info.date.toISOString().slice(0, 10));
            if (storedStatus) {
                updateDayCellStatus(info.el, storedStatus);
            }

            // Enhanced mobile touch handling
            let touchTimeout;
            info.el.addEventListener('touchstart', function(e) {
                e.preventDefault(); // Prevent default touch behavior
                touchTimeout = setTimeout(() => {
                    const clickedDate = info.date;
                    showModal(clickedDate);
                }, 100); // Small delay to prevent accidental taps
            });
            
            info.el.addEventListener('touchend', function() {
                clearTimeout(touchTimeout);
            });
            
            info.el.addEventListener('click', function() {
                const clickedDate = info.date;
                showModal(clickedDate);
            });
        },
        datesSet: function(info) {
            drawPayPeriodBrackets(); // Redraw on month navigation
        },
        windowResize: function(arg) {
            // Adjust aspect ratio on resize
            calendar.setOption('aspectRatio', window.innerWidth < 768 ? 1.0 : 1.35);
            drawPayPeriodBrackets(); // Redraw on window resize
        }
    });

    calendar.render();
    drawPayPeriodBrackets(); // Initial draw

    
});