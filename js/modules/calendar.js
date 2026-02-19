// Calendar module

let calendar = null;

// Initialize calendar
function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl || calendar) return;

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        },
        events: loadCalendarEvents,
        editable: true,
        selectable: true,
        select: function(info) {
            openEventModal(info.startStr, info.endStr);
        },
        eventClick: function(info) {
            showEventDetails(info.event);
        },
        eventDrop: function(info) {
            updateEventDate(info.event);
        },
        eventResize: function(info) {
            updateEventDate(info.event);
        },
        eventDidMount: function(info) {
            // Add custom class based on event type
            info.el.classList.add(`event-${info.event.extendedProps.type}`);
            
            // Add tooltip
            info.el.setAttribute('data-tooltip', info.event.title);
        }
    });
    
    calendar.render();
}

// Load calendar events
async function loadCalendarEvents(fetchInfo, successCallback, failureCallback) {
    try {
        const events = await db.collection('events')
            .where('company', '==', getCurrentCompany())
            .where('start', '>=', fetchInfo.startStr)
            .where('start', '<=', fetchInfo.endStr)
            .get();

        const calendarEvents = [];
        
        events.forEach(doc => {
            const event = doc.data();
            calendarEvents.push({
                id: doc.id,
                title: event.title,
                start: event.start,
                end: event.end,
                backgroundColor: event.color || EVENT_TYPE_COLORS[event.type] || '#6b7280',
                borderColor: 'transparent',
                textColor: '#ffffff',
                extendedProps: {
                    type: event.type,
                    description: event.description,
                    location: event.location,
                    attendees: event.attendees
                }
            });
        });

        successCallback(calendarEvents);
        loadUpcomingEvents();

    } catch (error) {
        console.error('Error loading calendar events:', error);
        failureCallback(error);
    }
}

// Open event modal
function openEventModal(start, end) {
    openModal('eventModal');
    document.getElementById('eventStart').value = start || '';
    document.getElementById('eventEnd').value = end || '';
    
    // Set default end to start + 1 hour if not provided
    if (start && !end) {
        const endDate = new Date(start);
        endDate.setHours(endDate.getHours() + 1);
        document.getElementById('eventEnd').value = endDate.toISOString().slice(0, 16);
    }
    
    // Load attendees
    loadEventAttendees();
}

// Close event modal
function closeEventModal() {
    closeModal('eventModal');
    document.getElementById('eventForm').reset();
}

// Load attendees for event
async function loadEventAttendees() {
    try {
        const users = await queryDocuments('users', []);
        const select = document.getElementById('eventAttendees');
        if (!select) return;
        
        select.innerHTML = '';
        
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name || user.email;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading attendees:', error);
    }
}

// Toggle all day event
function toggleAllDay() {
    const allDay = document.getElementById('eventAllDay').checked;
    const startInput = document.getElementById('eventStart');
    const endInput = document.getElementById('eventEnd');
    
    if (allDay) {
        // Convert datetime-local to date
        if (startInput.value) {
            startInput.type = 'date';
            startInput.value = startInput.value.split('T')[0];
        }
        if (endInput.value) {
            endInput.type = 'date';
            endInput.value = endInput.value.split('T')[0];
        }
    } else {
        // Convert date to datetime-local
        startInput.type = 'datetime-local';
        endInput.type = 'datetime-local';
    }
}

// Add new event
async function addEvent() {
    const title = document.getElementById('eventTitle').value;
    const type = document.getElementById('eventType').value;
    const start = document.getElementById('eventStart').value;
    const end = document.getElementById('eventEnd').value;
    const description = document.getElementById('eventDescription').value;
    const location = document.getElementById('eventLocation').value;
    const color = document.getElementById('eventColor').value;
    const reminder = document.getElementById('eventReminder').value;
    const repeat = document.getElementById('eventRepeat').value;
    const attendees = Array.from(document.getElementById('eventAttendees').selectedOptions).map(opt => opt.value);
    const allDay = document.getElementById('eventAllDay').checked;

    if (!title || !start) {
        showError('Please fill in required fields');
        return;
    }

    try {
        showLoading();

        const eventData = {
            title,
            type,
            start: allDay ? start + 'T00:00:00' : start,
            end: end ? (allDay ? end + 'T23:59:59' : end) : (allDay ? start + 'T23:59:59' : start),
            description,
            location,
            color,
            reminder: parseInt(reminder),
            repeat,
            attendees,
            allDay,
            company: getCurrentCompany(),
            createdBy: getCurrentUser()?.uid,
            createdAt: new Date()
        };

        await createDocument('events', eventData);

        // Set reminder if requested
        if (reminder > 0) {
            scheduleReminder(eventData);
        }

        // Send notifications to attendees
        attendees.forEach(async (userId) => {
            if (userId !== getCurrentUser()?.uid) {
                await createNotification(
                    userId,
                    `You've been invited to: ${title}`,
                    'Calendar Invitation'
                );
            }
        });

        calendar.refetchEvents();
        await logAudit('event_create', `Event created: ${title}`);
        
        hideLoading();
        closeEventModal();
        showSuccess('Event created successfully!');

    } catch (error) {
        hideLoading();
        showError('Error creating event: ' + error.message);
    }
}

// Schedule reminder
function scheduleReminder(event) {
    const eventTime = new Date(event.start).getTime();
    const reminderTime = eventTime - (event.reminder * 60 * 1000);
    const now = new Date().getTime();
    
    if (reminderTime > now) {
        setTimeout(() => {
            createNotification(
                getCurrentUser()?.uid,
                `Reminder: ${event.title} starts in ${event.reminder} minutes`,
                'Event Reminder'
            );
        }, reminderTime - now);
    }
}

// Update event date (from drag & drop)
async function updateEventDate(event) {
    try {
        await db.collection('events').doc(event.id).update({
            start: event.start.toISOString(),
            end: event.end?.toISOString() || event.start.toISOString()
        });
        
        showSuccess('Event updated');
        
    } catch (error) {
        console.error('Error updating event:', error);
        showError('Failed to update event');
    }
}

// Show event details
function showEventDetails(event) {
    const details = `
        <strong>${event.title}</strong><br>
        Type: ${event.extendedProps.type}<br>
        Start: ${formatDateTime(event.start)}<br>
        ${event.extendedProps.location ? 'Location: ' + event.extendedProps.location + '<br>' : ''}
        ${event.extendedProps.description ? 'Description: ' + event.extendedProps.description : ''}
    `;
    
    // Show in a modal or toast
    showInfo(details);
}

// Load upcoming events list
async function loadUpcomingEvents() {
    try {
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const events = await db.collection('events')
            .where('company', '==', getCurrentCompany())
            .where('start', '>=', today.toISOString())
            .where('start', '<=', nextWeek.toISOString())
            .orderBy('start')
            .limit(10)
            .get();

        const list = document.getElementById('upcomingEventsList');
        if (!list) return;

        list.innerHTML = '<h4 style="margin-bottom: 15px;">Upcoming Events</h4>';

        if (events.empty) {
            list.innerHTML += '<div class="empty-state"><p>No upcoming events</p></div>';
            return;
        }

        events.forEach(doc => {
            const event = doc.data();
            const start = formatDateTime(event.start);
            const eventColor = event.color || EVENT_TYPE_COLORS[event.type] || '#6b7280';
            
            list.innerHTML += `
                <div class="event-card" onclick="viewEvent('${doc.id}')" style="border-left-color: ${eventColor}">
                    <div class="event-card-header">
                        <strong>${event.title}</strong>
                        <span class="event-type" style="background: ${eventColor}20; color: ${eventColor}">
                            ${event.type}
                        </span>
                    </div>
                    <div class="event-card-time">
                        <i class="far fa-clock"></i> ${start}
                    </div>
                    ${event.location ? `
                        <div class="event-card-location">
                            <i class="fas fa-map-marker-alt"></i> ${event.location}
                        </div>
                    ` : ''}
                </div>
            `;
        });

    } catch (error) {
        console.error('Error loading upcoming events:', error);
    }
}

// View event details
function viewEvent(eventId) {
    showInfo('Event details - ID: ' + eventId);
}

// Add CSS for calendar
const calendarStyles = document.createElement('style');
calendarStyles.textContent = `
    .event-card {
        background: white;
        border-radius: 12px;
        padding: 15px;
        margin-bottom: 10px;
        border-left: 4px solid transparent;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 5px rgba(0,0,0,0.05);
    }

    .event-card:hover {
        transform: translateX(5px);
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }

    .event-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }

    .event-type {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
    }

    .event-card-time {
        font-size: 12px;
        color: var(--gray);
        margin-bottom: 5px;
    }

    .event-card-location {
        font-size: 12px;
        color: var(--gray);
    }

    .fc-event {
        cursor: pointer;
    }

    .event-meeting {
        background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
    }

    .event-deadline {
        background: linear-gradient(135deg, #ef4444, #f59e0b) !important;
    }

    .event-milestone {
        background: linear-gradient(135deg, #10b981, #34d399) !important;
    }

    .event-review {
        background: linear-gradient(135deg, #f59e0b, #fbbf24) !important;
    }

    .event-holiday {
        background: linear-gradient(135deg, #8b5cf6, #a78bfa) !important;
    }
`;
document.head.appendChild(calendarStyles);

// Export calendar functions
window.initializeCalendar = initializeCalendar;
window.openEventModal = openEventModal;
window.closeEventModal = closeEventModal;
window.toggleAllDay = toggleAllDay;
window.addEvent = addEvent;
window.viewEvent = viewEvent;
