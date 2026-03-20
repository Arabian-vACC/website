import { useEffect, useMemo, useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import './App.css';

const TARGET_ICAOS = [
  'OMAA',
  'OMAL',
  'OMAD',
  'OMDW',
  'OMDL',
  'OTBD',
  'OTHH',
  'OMDB',
  'OMFJ',
  'OOMS',
  'OMRK',
  'OOSA',
  'OMSJ'
];

const formatTime = (date) => {
  if (!date) return '\u2014';
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC'
  }) + 'z';
};

const formatEventRange = (start, end) => {
  if (!start || !end) return 'Date TBC';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const sameDay =
    startDate.getUTCFullYear() === endDate.getUTCFullYear() &&
    startDate.getUTCMonth() === endDate.getUTCMonth() &&
    startDate.getUTCDate() === endDate.getUTCDate();

  const dateFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  if (sameDay) {
    return `${dateFormatter.format(startDate)} \u2022 ${timeFormatter.format(startDate)}z - ${timeFormatter.format(endDate)}z`;
  }

  return `${dateFormatter.format(startDate)} ${timeFormatter.format(startDate)}z \u2192 ${dateFormatter.format(endDate)} ${timeFormatter.format(endDate)}z`;
};

const normalizeDate = (value, fallback) => {
  if (!value) return fallback;
  const iso = value.includes('T') ? value : value.replace(' ', 'T');
  const parsed = new Date(iso.endsWith('Z') ? iso : `${iso}Z`);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
};

const staff = [
  {
    cid: 1111111,
    code: "ACCARB1",
    title: "vACC Director",
    name:  "RESERVED",
    email: "board@vatsim.me",
  },
  {
    cid: 1648952,
    code: "ACCARB2",
    title: "vACC Deputy Director",
    name: "Abdulrahman Alamoodi",
    email: "abdulrahman.alamoodi@vatsim.me",
  },
  {
    cid: 1641650,
    code: 'ACCARB5',
    title: 'Marketing Department Director',
    name: 'Mohammed Osama',
    email: 'mohammed.osama@vatsim.me'
  },
  {
    cid: 1648952,
    code: "ARBDPO",
    title: "Data Protection Officer",
    name: "Abdulrahman Alamoodi",
    email: "abdulrahman.alamoodi@vatsim.me",
  },
  {
    cid: 1699621,
    code: 'ARBMRKT',
    title: 'Marketing Team Member',
    name: 'Ibrahim Dave',
    email: 'mohammed.osama@vatsim.me'
  },
  {
    cid: 1787520,
    code: 'ARBEVT',
    title: 'Events Team Member',
    name: 'Ali Ismail',
    email: 'mohammed.osama@vatsim.me'
  },
];

const vacancies = [
    {
    cid: '\u2014',
    code: 'ACCARB3',
    title: 'ATC Training Director',
    name: 'Vacant - Open',
    email: 'N/A'
  },
  {
    cid: '\u2014',
    code: 'ACCARB4',
    title: 'ATC Operations Department Director',
    name: 'Vacant - Open',
    email: 'N/A'
  },
  {
    cid: '\u2014',
    code: 'ACCARB42',
    title: 'Doha FIR Director',
    name: 'Vacant - Open',
    email: 'N/A'
  },
  {
    cid: '\u2014',
    code: 'ACCARB44',
    title: 'U.A.E FIR Director',
    name: 'Vacant - Open',
    email: 'N/A'
  },
  {
    cid: '\u2014',
    code: 'ACCARB43',
    title: 'Muscat FIR Director',
    name: 'Vacant - Open',
    email: 'N/A'
  },
  {
    cid: '\u2014',
    code: 'ACCARB6',
    title: 'Membership Department Director',
    name: 'Vacant - Open',
    email: 'N/A'
  },
  {
    cid: '\u2014',
    code: 'ACCARB7',
    title: 'Technical Department Director',
    name: 'Vacant - Open',
    email: 'N/A'
  }
];

function App() {
  const partnerLogos = [
    { name: 'Qatar', file: 'qatar.png', url: 'https://mynextairline.com/airlines/oryx-virtual', size: 'wide' },
    { name: 'VABY', file: 'vaby.png', url: 'https://abyvirtual.com/', size: 'small' },
    { name: 'iniBuilds', file: 'inibuilds.png', url: 'https://inibuilds.com/' },
    { name: 'VATSIM', file: 'vatsim.png', url: 'https://vatsim.net/' },
    { name: 'Aeronav', file: 'aeronav.png', url: 'https://aero-nav.com/' }
  ];
  const heroRef = useRef(null);
  const [liveAtc, setLiveAtc] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState({
    liveAtc: true,
    bookings: true,
    events: true
  });
  const pageLoadTime = useMemo(() => new Date(), []);
  const isInitialLoading = loading.liveAtc || loading.bookings || loading.events;

  const isStaffPage = typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('staff');

  const { scrollYProgress } = useScroll({
    target: isStaffPage ? undefined : heroRef,
    offset: ["start start", "end end"]
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 1]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -20]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);
  const line1Opacity = useTransform(scrollYProgress, [0, 0.55, 0.8], [1, 1, 0]);
  const line1Blur = useTransform(scrollYProgress, [0.55, 0.8], [0, 12]);
  const line2Opacity = useTransform(scrollYProgress, [0.5, 0.75, 1], [0, 1, 1]);
  const line2Blur = useTransform(scrollYProgress, [0.5, 0.75], [12, 0]);
  const line1Filter = useTransform(line1Blur, (v) => `blur(${v}px)`);
  const line2Filter = useTransform(line2Blur, (v) => `blur(${v}px)`);


  useEffect(() => {
    const controller = new AbortController();
    const loadLiveAtc = async () => {
      try {
        const res = await fetch('/api/data', { signal: controller.signal });
        if (!res.ok) throw new Error(`Live ATC request failed (${res.status})`);
        const payload = await res.json();
                const controllers = payload.controllers || [];
        const callsignMatcher = /^((OM|OT|OO)[A-Z0-9]{2,}_|DOH)/;
        const filtered = controllers
          .filter(ctrl => callsignMatcher.test(ctrl.callsign || ''))
          .map(ctrl => ({
            id: ctrl.cid,
            callsign: ctrl.callsign,
            rating: typeof ctrl.rating === 'number' ? ctrl.rating : '\u2014',
            start: normalizeDate(ctrl.logon_time, pageLoadTime)
          }))
          .sort((a, b) => (b.start || 0) - (a.start || 0));
        setLiveAtc(filtered);
      } catch (err) {
        if (err.name !== 'AbortError') console.error(err);
      } finally {
        setLoading(prev => ({ ...prev, liveAtc: false }));
      }
    };

    loadLiveAtc();
    return () => controller.abort();
  }, [pageLoadTime]);

  useEffect(() => {
    const controller = new AbortController();
    const loadBookings = async () => {
      try {
        const res = await fetch('/api/bookings', { signal: controller.signal });
        if (!res.ok) throw new Error(`Bookings request failed (${res.status})`);
        const data = await res.json();
        const filtered = data
          .filter(item => TARGET_ICAOS.some(code => item.callsign?.startsWith(code)))
          .map(item => ({
            id: item.id,
            callsign: item.callsign,
            start: normalizeDate(item.start, null),
            end: normalizeDate(item.end, null)
          }))
          .sort((a, b) => (a.start || 0) - (b.start || 0));
        setBookings(filtered);
      } catch (err) {
        if (err.name !== 'AbortError') console.error(err);
      } finally {
        setLoading(prev => ({ ...prev, bookings: false }));
      }
    };

    loadBookings();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const loadEvents = async () => {
      try {
        const res = await fetch('/api/events', { signal: controller.signal });
        if (!res.ok) throw new Error(`Events request failed (${res.status})`);
        const { data } = await res.json();
        const filtered = data
          .filter(event =>
            event.airports?.some(airport => TARGET_ICAOS.includes(airport.icao))
          )
          .map(event => ({
            id: event.id,
            name: event.name,
            start: event.start_time,
            end: event.end_time,
            banner: event.banner,
            airports: event.airports?.map(a => a.icao).join(', ')
          }))
          .sort((a, b) => new Date(a.start) - new Date(b.start));
        setEvents(filtered);
      } catch (err) {
        if (err.name !== 'AbortError') console.error(err);
      } finally {
        setLoading(prev => ({ ...prev, events: false }));
      }
    };

    loadEvents();
    return () => controller.abort();
  }, []);

  const groupedBookings = useMemo(() => {
    const groups = bookings.reduce((acc, booking) => {
      const startDate = booking.start || pageLoadTime;
      const key = startDate.toISOString().split('T')[0];
      if (!acc[key]) acc[key] = [];
      acc[key].push(booking);
      return acc;
    }, {});

    return Object.entries(groups)
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) => (a.start || 0) - (b.start || 0))
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [bookings, pageLoadTime]);

  const eventsOdd = events.length % 2 === 1;

  if (isStaffPage) {
    const visibleStaff = staff.filter(member => member.cid && member.email !== 'N/A');
    const order = ['ACCARB1', 'ACCARB2', 'ACCARB3', 'ACCARB31', 'ACCARB4', 'ACCARB44', 'ACCARB5', 'ACCARB6', 'ACCARB7', 'ARBDPO'];
    const orderedStaff = order
      .map(code => visibleStaff.find(member => member.code === code))
      .filter(Boolean);

    return (
      <div className="staff-page">
        <header className="staff-header">
          <div className="logo-nav">
            <div className="logo-container">
              <img src="/logo.png" alt="Arabian vACC Logo" className="logo-image" />
              <div className="nav-dropdown">
                <a href="https://vatsim-arabian.com" className="nav-item">Home</a>
                <a href="/staff" className="nav-item">Staff</a>
                <a href="https://library.vatsim-arabian.com" className="nav-item">Library</a>
              </div>
            </div>
          </div>
          <h1>Arabian vACC Leadership</h1>
          <p>Meet the team behind Arabian vACC.</p>
        </header>
        <main className="staff-table-wrapper">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Name</th>
                <th>Email</th>
                <th>CID</th>
              </tr>
            </thead>
            <tbody>
              {orderedStaff.map(member => (
                <tr key={member.code}>
                  <td>
                    <div className="staff-code">{member.code}</div>
                    <div className="staff-title indented">{member.title}</div>
                  </td>
                  <td>{member.name}</td>
                  <td><a className="staff-email" href={`mailto:${member.email}`}>{member.email}</a></td>
                  <td>{member.cid}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="vacancies-heading">Vacancies</h2>
          <table className="staff-table">
            <thead>
              <tr>
                <th>Position</th>
              </tr>
            </thead>
            <tbody>
              {vacancies.map(role => (
                <tr key={role.code}>
                  <td>
                    <div className="staff-code">{role.code}</div>
                    <div className="staff-title indented">{role.title}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      {isInitialLoading && (
        <div className="loading-bar-container">
          <div className="loading-bar" />
        </div>
      )}
      {/* Logo Navigation */}
      <div className="logo-nav">
        <div className="logo-container">
          <img src="/logo.png" alt="Arabian vACC Logo" className="logo-image" />
          <div className="nav-dropdown">
            <a href="https://vatsim-arabian.com" className="nav-item">Home</a>
            <a href="/staff" className="nav-item">Staff</a>
            <a href="https://library.vatsim-arabian.com" className="nav-item">Library</a>
          </div>
        </div>
      </div>

      {/* Hero Text (sticky) */}
      <section className="hero-section" ref={heroRef}>
        <motion.div
          className="hero-sticky"
          style={{ opacity: heroOpacity, y: heroY, scale: heroScale }}
        >
          <div className="text-sections">
            <div className="text-section">
              <h1 className="welcome-title">
                <motion.span
                  className="welcome-line"
                  style={{ opacity: line1Opacity, filter: line1Filter }}
                >
                  Welcome to the <span className="accent-inline">Arabian vACC</span>
                </motion.span>
                <motion.span
                  className="welcome-line"
                  style={{ opacity: line2Opacity, filter: line2Filter }}
                >
                  The <span className="accent-inline">leading</span> vACC on the VATSIM Network.
                </motion.span>
              </h1>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Third Section - ATC & Events */}
      <section className="atc-section">
        <div className="atc-container">
          {/* Left Side - Events Grid */}
          <div className="left-content">
            <div className="events-grid">
              {loading.events && <div className="event-card skeleton-card" />}
              {!loading.events && events.length === 0 && (
                <div className="event-card empty-card">
                  <div className="event-overlay">
                    <h3 className="event-name">No featured events</h3>
                    <p className="event-date">Check back soon.</p>
                  </div>
                </div>
              )}
              {!loading.events && events.map((event, index) => (
                <div
                  className={`event-card${eventsOdd && index === events.length - 1 ? ' event-card-wide' : ''}`}
                  key={event.id}
                >
                  <div
                    className="event-banner"
                    style={{
                      backgroundImage: event.banner ? `url(${event.banner})` : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                    }}
                  ></div>
                  <div className="event-overlay">
                    <h3 className="event-name">{event.name}</h3>
                    <p className="event-date">{formatEventRange(event.start, event.end)}</p>
                    {event.airports && <p className="event-airports">{event.airports}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="view-all-container">
              {/* removed temporary CTA */}
            </div>

            {/* Latest Announcements */}
            {/* <div className="announcements-section">
              <h2 className="section-heading">Latest Announcements</h2>
              <div className="announcements-list">
                <div className="announcement-card">
                  <div className="announcement-date">Oct 5, 2025</div>
                  <h3 className="announcement-title">New Training Program Launch</h3>
                  <p className="announcement-excerpt">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam vulputate sit amet nulla vitae rutrum...</p>
                </div>
                <div className="announcement-card">
                  <div className="announcement-date">Oct 3, 2025</div>
                  <h3 className="announcement-title">System Maintenance Scheduled</h3>
                  <p className="announcement-excerpt">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam vulputate sit amet nulla vitae rutrum...</p>
                </div>
                <div className="announcement-card">
                  <div className="announcement-date">Sep 30, 2025</div>
                  <h3 className="announcement-title">September</h3>
                  <p className="announcement-excerpt">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam vulputate sit amet nulla vitae rutrum...</p>
                </div>
              </div>
            </div> */}
          </div>

          {/* Right Side - ATC Bookings & Live ATC */}
          <div className="right-content">
            <div className="atc-combined-card">
              {/* Live ATC */}
              <div className="atc-section-inner">
                <h2 className="section-heading">Live ATC</h2>
                <div className="atc-list">
                  {loading.liveAtc && <div className="live-atc-item skeleton-line" />}
                  {!loading.liveAtc && liveAtc.length === 0 && (
                    <div className="live-atc-item">
                      <span className="atc-position-slim">There are currently no controllers online.</span>
                      <span className="atc-time">—</span>
                    </div>
                  )}
                  {!loading.liveAtc && liveAtc.map(entry => (
                    <div className="live-atc-item" key={entry.id}>
                      <div className="atc-position-container">
                        <span className="atc-position-slim">{entry.callsign}</span>
                      </div>
                      <span className="atc-time">{formatTime(entry.start || pageLoadTime)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ATC Bookings */}
              <div className="atc-section-inner">
                <h2 className="section-heading">ATC Bookings</h2>
                <div className="atc-list">
                  {loading.bookings && <div className="booking-item-slim skeleton-line" />}
                  {!loading.bookings && groupedBookings.length === 0 && (
                    <div className="booking-item-slim">
                      <span className="booking-position-slim">No bookings scheduled</span>
                      <span className="booking-start">—</span>
                      <span className="booking-end">—</span>
                    </div>
                  )}
                  {!loading.bookings && groupedBookings.map(group => {
                    const groupDate = new Date(group.date);
                    const header = groupDate.toLocaleDateString('en-GB', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    });

                    return (
                      <div className="booking-group" key={group.date}>
                        <div className="booking-date-header booking-date-header-first">
                          <span className="booking-date">{header}</span>
                          <span className="booking-time-label">Start</span>
                          <span className="booking-time-label">End</span>
                        </div>
                        {group.items.map(item => (
                          <div className="booking-item-slim" key={`${item.callsign}-${item.start?.toISOString() || Math.random()}`}>
                            <span className="booking-position-slim">{item.callsign}</span>
                            <span className="booking-start">{formatTime(item.start)}</span>
                            <span className="booking-end">{formatTime(item.end)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Feedback Form */}
            <div className="feedback-form-container">
              <h2 className="section-heading">Submit Feedback</h2>
              <form
                className="feedback-form"
                action="https://submit-form.com/vrpmQTfEn"
                method="POST"
              >
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="cid">Your CID</label>
                    <input
                      type="text"
                      id="cid"
                      name="cid"
                      placeholder="Enter your VATSIM CID"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="position">Controller Position</label>
                    <input
                      type="text"
                      id="position"
                      name="position"
                      placeholder="e.g., OMDB_1_APP"
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="feedbackType">Feedback Type</label>
                  <select id="feedbackType" name="feedbackType" required>
                    <option value="">Select type</option>
                    <option value="positive">Positive</option>
                    <option value="negative">Negative</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="controllerName">Controller Name</label>
                  <input
                    type="text"
                    id="controllerName"
                    name="controllerName"
                    placeholder="e.g., John Doe"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="feedback">Feedback</label>
                  <textarea
                    id="feedback"
                    name="feedback"
                    rows="5"
                    placeholder="Great Controller!"
                    required
                  ></textarea>
                </div>
                <button type="submit" className="submit-button">Send</button>
                <input
                  type="hidden"
                  name="_redirect"
                  value="https://vatsim-arabian.com"
                />
              </form>
            </div>
          </div>
        </div>

        {/* Partners Section */}
        <div className="partners-section">
          <h2 className="section-heading-center">Our Partners</h2>
          <div className="partners-grid">
            {partnerLogos.map(partner => (
              <a
                key={partner.name}
                href={partner.url}
                className="partner-link"
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src={`/partners/${partner.file}`}
                  alt={`${partner.name} logo`}
                  className={`partner-img ${partner.size === 'wide' ? 'partner-img-wide' : ''} ${partner.size === 'small' ? 'partner-img-small' : ''}`}
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Arabian vACC</h3>
            <p>Copyright © 2026 Arabian vACC</p>
          </div>
          <div className="footer-section">
            <h4>Pilots</h4>
            <a href="https://library.vatsim-arabian.com/pilots/">Airports & Charts</a>
            <a href="https://library.vatsim-arabian.com/pilots/">Pilot Resource Center</a>
          </div>
          <div className="footer-section">
            <h4>Controllers</h4>
            <a href="https://library.vatsim-arabian.com/getting_started/starting_atc_training/">Become a Controller</a>
            <a href="https://library.vatsim-arabian.com/">Library</a>
            <a href="#atc-roster">ATC Roster</a>
          </div>
          <div className="footer-section">
            <h4>Community</h4>
            <a href="https://community.vatsim.net/">Discord</a>
            <a href="https://github.com/Arabian-vACC/">GitHub</a>
            <a href="https://www.instagram.com/arabianvacc/">Instagram</a>
            <a href="https://x.com/arabianvacc">Twitter / X</a>
            <a href="https://www.facebook.com/arabianvacc">Facebook</a>
            <a href="https://www.twitch.tv/arabianvacc">Twitch</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

















