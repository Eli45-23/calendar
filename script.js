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

    const paydays = [];
    const payPeriods = getPayPeriods(new Date("2025-08-10"));

    payPeriods.forEach(period => {
        paydays.push({
            start: period.start,
            title: 'start pay period'
        });
        paydays.push({
            start: period.end,
            title: 'end pay period'
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

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        events: paydays,
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
        },
        windowResize: function(arg) {
            // Adjust aspect ratio on resize
            calendar.setOption('aspectRatio', window.innerWidth < 768 ? 1.0 : 1.35);
        }
    });

    calendar.render();

    // Dynamic Flying Objects
    const numObjects = 20;
    const shapes = ['circle', 'square', 'triangle']; // Simple shapes

    for (let i = 0; i < numObjects; i++) {
        const object = document.createElement('div');
        object.classList.add('flying-object');

        // Randomize size
        const size = Math.random() * 30 + 20; // 20px to 50px
        object.style.width = `${size}px`;
        object.style.height = `${size}px`;

        // Randomize shape
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        if (shape === 'circle') {
            object.style.borderRadius = '50%';
        } else if (shape === 'triangle') {
            object.style.width = '0';
            object.style.height = '0';
            object.style.borderLeft = `${size / 2}px solid transparent`;
            object.style.borderRight = `${size / 2}px solid transparent`;
            object.style.borderBottom = `${size}px solid rgba(150, 150, 150, 0.3)`;
            object.style.backgroundColor = 'transparent'; // Clear background for triangle
        }

        // Randomize animation properties
        const duration = Math.random() * 15 + 10; // 10s to 25s
        const delay = Math.random() * 10; // 0s to 10s
        const startX = Math.random() * 100; // 0% to 100%
        const startY = Math.random() * 100; // 0% to 100%

        object.style.animationDuration = `${duration}s`;
        object.style.animationDelay = `${delay}s`;
        object.style.left = `${startX}vw`;
        object.style.top = `${startY}vh`;

        document.body.appendChild(object);
    }
});