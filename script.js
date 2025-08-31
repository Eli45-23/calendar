
document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    const eventModal = document.getElementById('eventModal');
    const closeModalBtn = eventModal.querySelector('.close-button');
    const modalDate = document.getElementById('modalDate');
    const statusInput = document.getElementById('statusInput');
    const saveStatusBtn = document.getElementById('saveStatusBtn');
    const deleteStatusBtn = document.getElementById('deleteStatusBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    let currentClickedDate = null;

    function showModal(date) {
        currentClickedDate = date;
        modalDate.innerText = date.toDateString();
        const storedStatus = localStorage.getItem(date.toISOString().slice(0, 10));
        statusInput.value = storedStatus || '';
        eventModal.style.display = 'flex';
        setTimeout(() => {
            statusInput.focus();
        }, 100);
    }

    function hideModal() {
        eventModal.style.display = 'none';
        statusInput.value = '';
        currentClickedDate = null;
    }

    closeModalBtn.addEventListener('click', hideModal);
    cancelBtn.addEventListener('click', hideModal);

    saveStatusBtn.addEventListener('click', function() {
        if (currentClickedDate) {
            const dateKey = currentClickedDate.toISOString().slice(0, 10);
            const status = statusInput.value;
            if (status) {
                localStorage.setItem(dateKey, status);
            } else {
                localStorage.removeItem(dateKey);
            }
            calendar.refetchEvents();
            hideModal();
        }
    });

    deleteStatusBtn.addEventListener('click', function() {
        if (currentClickedDate) {
            const dateKey = currentClickedDate.toISOString().slice(0, 10);
            localStorage.removeItem(dateKey);
            calendar.refetchEvents();
            hideModal();
        }
    });

    function getPayPeriods(startDate) {
        const payPeriods = [];
        let currentDate = new Date(startDate);
        const endDate = new Date(startDate.getFullYear(), 11, 31);

        while (currentDate <= endDate) {
            const periodEnd = new Date(currentDate);
            periodEnd.setDate(periodEnd.getDate() + 13);

            payPeriods.push({
                start: currentDate.toISOString().slice(0, 10),
                end: periodEnd.toISOString().slice(0, 10)
            });
            currentDate.setDate(currentDate.getDate() + 14);
        }
        return payPeriods;
    }

    function parseHours(statusString) {
        let regular = 0;
        let overtime = 0;
        const lowerStatus = statusString.toLowerCase();

        const otMatch = lowerStatus.match(/(\d+(\.\d+)?)\s*ot/);
        if (otMatch) {
            overtime = parseFloat(otMatch[1]);
        }

        const hrsMatch = lowerStatus.match(/(\d+(\.\d+)?)\s*hrs?/);
        if (hrsMatch && !otMatch) {
            regular = parseFloat(hrsMatch[1]);
        } else if (hrsMatch && otMatch) {
            const totalHours = parseFloat(hrsMatch[1]);
            regular = totalHours - overtime;
        }

        return { regular, overtime };
    }

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        initialDate: new Date(),
        height: 'auto',
        contentHeight: 'auto',
        aspectRatio: 1.5,
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: ''
        },
        datesSet: function(dateInfo) {
            calendar.refetchEvents();
        },
        events: async function(fetchInfo, successCallback, failureCallback) {
            const events = [];
            const payPeriods = getPayPeriods(new Date("2025-08-10"));
            const year = fetchInfo.start.getFullYear();
            
            try {
                const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/US`);
                const holidays = await response.json();

                holidays.forEach(holiday => {
                    events.push({
                        start: holiday.date,
                        title: holiday.name,
                        classNames: ['work-entry', 'entry-holiday']
                    });
                });
            } catch (error) {
                console.error("Error fetching holidays:", error);
                failureCallback(error);
                return;
            }

            payPeriods.forEach(period => {
                events.push({
                    start: period.start,
                    title: 'START PAY',
                    classNames: ['work-entry', 'entry-pay-period']
                });
                events.push({
                    start: period.end,
                    title: 'END PAY',
                    classNames: ['work-entry', 'entry-pay-period']
                });

                const payDate = new Date(period.end);
                payDate.setDate(payDate.getDate() + 5);

                let totalRegularHours = 0;
                let totalOvertimeHours = 0;

                let dayIterator = new Date(period.start);
                while (dayIterator <= new Date(period.end)) {
                    const dateKey = dayIterator.toISOString().slice(0, 10);
                    const status = localStorage.getItem(dateKey);
                    if (status) {
                        const hours = parseHours(status);
                        totalRegularHours += hours.regular;
                        totalOvertimeHours += hours.overtime;

                        let eventClassName = 'entry-8hrs';
                        if (status.toLowerCase().includes('ot')) {
                            eventClassName = 'entry-overtime';
                        } else if (status.toLowerCase().includes('off')) {
                            eventClassName = 'entry-off';
                        } else if (status.toLowerCase().includes('canal')) {
                            eventClassName = 'entry-canal';
                        }

                        events.push({
                            start: dateKey,
                            title: status,
                            classNames: ['work-entry', eventClassName]
                        });
                    }
                    dayIterator.setDate(dayIterator.getDate() + 1);
                }

                events.push({
                    start: payDate.toISOString().slice(0, 10),
                    title: `PAYDAY\n${period.start.slice(5).replace('-', '/')}-${period.end.slice(5).replace('-', '/')}\nREG: ${totalRegularHours} OT: ${totalOvertimeHours}`,
                    classNames: ['work-entry', 'entry-payday']
                });
            });
            successCallback(events);
        },
        eventContent: function(arg) {
            return { html: arg.event.title.replace(/\n/g, '<br>') };
        },
        dayCellDidMount: function(info) {
            info.el.addEventListener('click', function() {
                showModal(info.date);
            });
            
            // Mark past dates
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const cellDate = new Date(info.date);
            cellDate.setHours(0, 0, 0, 0);
            
            if (cellDate < today) {
                info.el.classList.add('past-date');
            }
        },
        viewDidMount: function(view) {
            const headerEl = document.querySelector('.fc-header-toolbar');
            if (headerEl) {
                const marioContainer = document.createElement('div');
                marioContainer.classList.add('mario-container');
                marioContainer.innerHTML = `
                    <div class="mario-runner">
                        <div class="mario-sprite"></div>
                    </div>
                `;
                headerEl.appendChild(marioContainer);
            }
        }
    });

    calendar.render();
    lucide.createIcons();

    const quoteText = document.getElementById('quote-text');
    const quoteAuthor = document.getElementById('quote-author');

    fetch('https://cors-anywhere.herokuapp.com/https://zenquotes.io/api/today')
        .then(response => response.json())
        .then(data => {
            const quote = data[0];
            quoteText.innerText = `"${quote.q}"`;
            quoteAuthor.innerText = `- ${quote.a}`;
        })
        .catch(error => {
            console.error("Error fetching quote:", error);
            quoteText.innerText = "Could not fetch a quote today. Sorry!";
        });
});
