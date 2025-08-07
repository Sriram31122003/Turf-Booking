// Get current time
const now = new Date();
const currentHour = now.getHours();
const currentMinute = now.getMinutes();

// Generate dates for the next 7 days
const dateScroll = document.getElementById("date-scroll");
const slotContainer = document.getElementById("slots");

const generateDates = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const box = document.createElement("div");
    box.className = "date-box";
    
    // Format date display
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = date.getDate();
    const monthNum = date.getMonth() + 1;
    
    box.innerHTML = `<strong>${dayName}</strong><br>${dayNum}/${monthNum}`;
    box.setAttribute("data-date", date.toISOString().split("T")[0]);

    box.addEventListener("click", () => {
      document.querySelectorAll(".date-box").forEach(b => b.classList.remove("active"));
      box.classList.add("active");
      loadSlotsForDate(date);
    });

    // Automatically select today's date
    if (i === 0) {
      box.click();
    }

    dateScroll.appendChild(box);
  }
};

let selectedDate = null;
let selectedSlots = [];

// Function to clear selected slots
const clearSelectedSlots = () => {
  selectedSlots = [];
  updateSelectedSlotsDisplay();
  
  // Remove 'selected' class from all slot buttons
  document.querySelectorAll('.slot').forEach(btn => {
    btn.classList.remove('selected');
  });
};

// Add event listener for Clear Slots button
document.addEventListener('DOMContentLoaded', () => {
  const clearSlotsBtn = document.getElementById('clear-slots-btn');
  if (clearSlotsBtn) {
    clearSlotsBtn.addEventListener('click', clearSelectedSlots);
  }
});

const updateSelectedSlotsDisplay = () => {
  const selectedSlotsContainer = document.getElementById('selected-slots');
  if (!selectedSlotsContainer) return;
  
  if (selectedSlots.length === 0) {
    selectedSlotsContainer.innerHTML = '<p>No slots selected</p>';
    return;
  }
  
  const totalAmount = selectedSlots.length * 1000;
  
  selectedSlotsContainer.innerHTML = `
    <h4>Selected Slots (₹1000 per slot):</h4>
    <div class="selected-slots-list">
      ${selectedSlots.map(slot => 
        `<div class="selected-slot-item">
          <span>${selectedDate.toDateString()} - ${slot} <span class="text-muted">(₹1000)</span></span>
          <button class="btn btn-sm btn-outline-danger remove-slot" data-slot="${slot}">×</button>
        </div>`
      ).join('')}
    </div>
    <div class="d-flex justify-content-between align-items-center mt-3">
      <h5 class="mb-0">Total: <span class="text-primary">₹${totalAmount}</span></h5>
      <button id="book-selected" class="btn btn-primary">
        <i class="bi bi-calendar-check me-2"></i>Book Now (${selectedSlots.length} Slots)
      </button>
    </div>
  `;
  
  // Add event listeners to remove buttons
  document.querySelectorAll('.remove-slot').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const slotToRemove = e.target.getAttribute('data-slot');
      selectedSlots = selectedSlots.filter(slot => slot !== slotToRemove);
      updateSelectedSlotsDisplay();
      
      // Also update the visual state of the slot buttons
      document.querySelectorAll('.slot').forEach(slotBtn => {
        if (slotBtn.textContent === slotToRemove) {
          slotBtn.classList.remove('selected');
        }
      });
    });
  });
  
  // Add event listener to book button
  const bookButton = document.getElementById('book-selected');
  if (bookButton) {
    bookButton.addEventListener('click', async () => {
      if (selectedSlots.length > 0) {
        // Show email prompt
        const email = prompt('Please enter your email address to receive the booking confirmation:');
        
        if (!email) {
          alert('Booking cancelled. Please enter a valid email address to complete your booking.');
          return;
        }
        
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          alert('Please enter a valid email address.');
          return;
        }
        
        const dateStr = selectedDate.toISOString().split('T')[0];
        const bookedSlots = getStoredBookedSlots();
        
        // Add new bookings to the stored slots
        if (!bookedSlots[dateStr]) {
          bookedSlots[dateStr] = [];
        }
        
        // Store booking with email
        const bookingDetails = {
          email: email,
          date: selectedDate.toDateString(),
          slots: [...selectedSlots],
          totalAmount: selectedSlots.length * 1000, // ₹1000 per slot
          bookingTime: new Date().toISOString()
        };
        
        // Save booking to local storage
        const bookings = JSON.parse(localStorage.getItem('turfBookings') || '[]');
        bookings.push(bookingDetails);
        localStorage.setItem('turfBookings', JSON.stringify(bookings));
        
        // Update UI and mark slots as booked
        selectedSlots.forEach(slotTime => {
          if (!bookedSlots[dateStr].includes(slotTime)) {
            bookedSlots[dateStr].push(slotTime);
          }
          
          document.querySelectorAll('.slot').forEach(slot => {
            if (slot.textContent.includes(slotTime)) {
              slot.classList.remove('selected', 'btn-outline-primary');
              slot.classList.add('booked');
              slot.disabled = true;
              slot.title = 'This slot is already booked';
              const small = slot.querySelector('small');
              if (small) small.textContent = 'Booked';
            }
          });
        });
        
        // Save to localStorage
        saveBookedSlots(bookedSlots);
        
        // Show confirmation with booking details
        const confirmationMessage = `
          🎉 Booking Confirmed! 🎉
          
          Date: ${selectedDate.toDateString()}
          Time Slots:
          ${selectedSlots.join('\n          ')}
          
          Total Amount: ₹${selectedSlots.length * 1000}
          
          A confirmation has been sent to: ${email}
          
          Thank you for your booking!
        `;
        
        alert(confirmationMessage);
        
        // Send email using EmailJS
        try {
          console.log('Attempting to send email...');
          
          // Add debug info
          console.log('EmailJS object:', window.emailjs ? 'Available' : 'Not available');
          
          // EmailJS service and template IDs
          const serviceID = 'service_kz950wd';
          const clientTemplateID = 'template_gwy9a2g';  // Client confirmation template
          const ownerTemplateID = 'template_gwy9a2g';   // Owner notification template (use same for now, but should be different in production)
          
          // Generate a unique booking ID
          const bookingId = `TURF-${Date.now()}`;
          
          // Format date for display
          const formattedDate = selectedDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          
          // Email to Client
          const clientEmailParams = {
            to_email: email.trim(),  // Client's email
            reply_to: 'sriram31122003@gmail.com',
            date: selectedDate.toISOString().split('T')[0],
            slots: selectedSlots.join(', '),
            amount: selectedSlots.length * 1000,
            booking_id: bookingId,
            username: email.split('@')[0],  // Add username as a separate parameter
            email: email.trim(),            // Add email as a separate parameter
            subject: `Your Turf Booking Confirmation #${bookingId}`,
            message: `Username: {{username}}\n` +
                    `Email: {{email}}\n` +
                    `Date: {{date}}\n` +
                    `Slots: {{slots}}\n` +
                    `Amount: ₹{{amount}}\n` +
                    `Booking ID: {{booking_id}}`
          };
          
          // Email to Owner
          const ownerEmailParams = {
            to_email: 'sriram31122003@gmail.com',
            date: selectedDate.toISOString().split('T')[0],
            slots: selectedSlots.join(', '),
            amount: selectedSlots.length * 1000,
            booking_id: bookingId,
            username: email.split('@')[0],
            email: email.trim(),
            subject: `New Booking: ${email.split('@')[0]} - ${selectedDate.toISOString().split('T')[0]}`,
            message: `Username: ${email.split('@')[0]}\n` +
                     `Email: ${email.trim()}\n` +
                     `Date: ${selectedDate.toISOString().split('T')[0]}\n` +
                     `Slots: ${selectedSlots.join(', ')}\n` +
                     `Amount: ₹${selectedSlots.length * 1000}\n` +
                     `Booking ID: ${bookingId}`
          };
          
          console.log('Sending client email to:', email);
          
          // Send email to client
          const clientEmail = emailjs.send(serviceID, clientTemplateID, clientEmailParams);
          
          // Send notification to owner
          console.log('Sending owner notification to: sriram31122003@gmail.com');
          const ownerEmail = emailjs.send(serviceID, ownerTemplateID, ownerEmailParams);
          
          // Wait for both emails to be sent
          await Promise.all([clientEmail, ownerEmail])
            .then((response) => {
              console.log('Email sent successfully!', response.status, response.text);
              alert('Booking confirmed! Check your email for the confirmation.');
            }, (error) => {
              console.error('EmailJS Error Details:', {
                status: error.status,
                text: error.text,
                fullError: error
              });
              alert('Booking confirmed! However, there was an issue sending the confirmation email. Please note down your booking details.');
            });
        } catch (error) {
          console.error('Unexpected Error:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
          alert('Booking confirmed! However, there was an issue with the email service. Please note down your booking details.');
        }
        
        // Clear the selected slots after booking
        selectedSlots = [];
        updateSelectedSlotsDisplay();
      }
    });
  }
};

// Get or initialize booked slots from localStorage
const getStoredBookedSlots = () => {
  const stored = localStorage.getItem('bookedSlots');
  return stored ? JSON.parse(stored) : {};
};

// Save booked slots to localStorage
const saveBookedSlots = (bookedSlots) => {
  localStorage.setItem('bookedSlots', JSON.stringify(bookedSlots));
};

// Get booked slots for a specific date
const getBookedSlots = (date) => {
  const dateStr = date.toISOString().split('T')[0];
  const bookedSlots = getStoredBookedSlots();
  return bookedSlots[dateStr] || [];
};

const loadSlotsForDate = (date) => {
  selectedDate = date;
  slotContainer.innerHTML = "";
  
  // Generate 24 time slots, one for each hour
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    const startHour = hour % 12 || 12; // Convert 0 to 12 for 12-hour format
    const endHour = (hour + 1) % 12 || 12; // Next hour
    const ampm = hour < 12 ? 'AM' : 'PM';
    const nextAmpm = (hour + 1) < 12 ? 'AM' : (hour + 1) === 12 ? 'PM' : ampm;
    
    // Format: "12:00 AM - 1:00 AM"
    const timeString = `${startHour}:00 ${ampm} - ${endHour}:00 ${nextAmpm}`;
    times.push(timeString);
  }
  
  const bookedSlots = getBookedSlots(date);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = date.getTime() === today.getTime();

  times.forEach((time, index) => {
    const isBooked = bookedSlots.includes(time);
    const slot = document.createElement("button");
    slot.type = "button";
    
    // Check if this is a past time slot for today
    const isPastSlot = isToday && index < currentHour;
    const isDisabled = isBooked || isPastSlot;
    
    slot.className = `slot btn d-flex flex-column ${isDisabled ? 'booked' : 'btn-outline-primary'}`;
    
    if (isDisabled) {
      slot.disabled = true;
      slot.title = isBooked ? 'This slot is already booked' : 'This time slot has passed';
    }
    
    if (selectedSlots.includes(time)) {
      slot.classList.add('selected');
    }
    
    slot.innerHTML = `
      <span>${time}</span>
      <small class="mt-1 fw-normal">${isBooked ? 'Booked' : '₹1000'}</small>
    `;
    
    if (isBooked) {
      slot.disabled = true;
      slot.title = 'This slot is already booked';
    }

    if (!isBooked) {
      slot.addEventListener("click", () => {
        slot.classList.toggle('selected');
        
        if (slot.classList.contains('selected')) {
          if (!selectedSlots.includes(time)) {
            selectedSlots.push(time);
          }
        } else {
          selectedSlots = selectedSlots.filter(slot => slot !== time);
        }
        
        updateSelectedSlotsDisplay();
      });
    }

    slotContainer.appendChild(slot);
  });
  
  // Create or update selected slots display
  let selectedSlotsContainer = document.getElementById('selected-slots');
  if (!selectedSlotsContainer) {
    selectedSlotsContainer = document.createElement('div');
    selectedSlotsContainer.id = 'selected-slots';
    selectedSlotsContainer.className = 'selected-slots-container mt-4 p-3 border rounded';
    slotContainer.after(selectedSlotsContainer);
  }
  
  updateSelectedSlotsDisplay();
};

generateDates();
