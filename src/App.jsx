import { useEffect, useState } from 'react';
import { motion as Motion } from 'framer-motion';
import './App.css';

const TARGET_ICAOS = [
  'OMAA',
  'OMAL',
  'OMAD',
  'OMDW',
  'OMDL',
  'OMDB',
  'OMFJ',
  'OOMS',
  'OMRK',
  'OOSA',
  'OMSJ'
];

const formatTime = (date) => {
  if (!date) return '—';
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC'
  }) + 'z';
};

const normalizeDate = (value, fallback) => {
  if (!value) return fallback;
  const iso = value.includes('T') ? value : value.replace(' ', 'T');
  const parsed = new Date(iso.endsWith('Z') ? iso : `${iso}Z`);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
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
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  if (sameDay) {
    return `${dateFormatter.format(startDate)} • ${timeFormatter.format(startDate)}z - ${timeFormatter.format(endDate)}z`;
  }

  return `${dateFormatter.format(startDate)} → ${dateFormatter.format(endDate)}`;
};

const navGroups = [
  {
    label: 'Getting Started',
    items: [
      { label: 'Become a Controller', href: 'https://library.vatsim-arabian.com/getting_started/starting_atc_training/' },
      { label: 'Library', href: 'https://library.vatsim-arabian.com' }
    ]
  },
  {
    label: 'Pilots',
    items: [
      { label: 'Airports & Charts', href: 'https://library.vatsim-arabian.com/pilots/' },
      { label: 'Pilot Resource Center', href: 'https://library.vatsim-arabian.com/pilots/' }
    ]
  },
  {
    label: 'Controllers',
    items: [
      { label: 'ATC Training', href: 'https://library.vatsim-arabian.com/getting_started/starting_atc_training/' },
      { label: 'Library', href: 'https://library.vatsim-arabian.com' }
    ]
  },
  {
    label: 'About',
    items: [
      { label: 'Staff', href: '/staff' },
      { label: 'Home', href: 'https://vatsim-arabian.com' }
    ]
  }
];

const socialLinks = [
  { name: 'Discord', href: 'https://community.vatsim.net/' },
  { name: 'Instagram', href: 'https://www.instagram.com/arabianvacc/' },
  { name: 'Twitter', href: 'https://x.com/arabianvacc' },
  { name: 'Facebook', href: 'https://www.facebook.com/arabianvacc' },
  { name: 'Twitch', href: 'https://www.twitch.tv/arabianvacc' },
  { name: 'GitHub', href: 'https://github.com/Arabian-vACC/' }
];

const SocialIcon = ({ name }) => {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true };
  switch (name) {
    case 'Discord':
      return (
        <svg {...common}><path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3c-.2.36-.43.845-.588 1.23a18.27 18.27 0 0 0-5.94 0A12.6 12.6 0 0 0 9.44 3 19.74 19.74 0 0 0 5.677 4.37C2.51 9.046 1.71 13.61 2.05 18.11a19.9 19.9 0 0 0 6.073 3.05c.49-.66.927-1.36 1.302-2.095a12.9 12.9 0 0 1-2.05-.99c.172-.126.34-.257.502-.39a14.2 14.2 0 0 0 12.246 0c.164.14.332.27.502.39-.653.386-1.343.72-2.052.99.375.735.812 1.435 1.302 2.095a19.85 19.85 0 0 0 6.075-3.05c.4-5.213-.68-9.735-2.86-13.74ZM8.68 15.33c-1.183 0-2.156-1.085-2.156-2.42s.95-2.42 2.156-2.42c1.216 0 2.18 1.096 2.156 2.42 0 1.335-.95 2.42-2.156 2.42Zm6.64 0c-1.183 0-2.156-1.085-2.156-2.42s.95-2.42 2.156-2.42c1.215 0 2.18 1.096 2.156 2.42 0 1.335-.94 2.42-2.156 2.42Z" /></svg>
      );
    case 'Instagram':
      return (
        <svg {...common}><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16Zm0 3.68A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84Zm0 10.16A4 4 0 1 1 16 12a4 4 0 0 1-4 4Zm6.4-10.4a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44Z" /></svg>
      );
    case 'Twitter':
      return (
        <svg {...common}><path d="M18.9 2.5h3.3l-7.2 8.2 8.5 11.3h-6.7l-5.2-6.9-6 6.9H1.5l7.7-8.8L1.1 2.5h6.8l4.7 6.3 5.3-6.3Zm-1.2 17.8h1.8L7.2 4.3H5.3l12.4 16Z" /></svg>
      );
    case 'Facebook':
      return (
        <svg {...common}><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" /></svg>
      );
    case 'Twitch':
      return (
        <svg {...common}><path d="M4.3 1.7 2 6.2v15.5h5.2V24h3l2.3-2.3h4.2L22 16.4V1.7H4.3Zm15.8 13.8-3 3h-5.2L9.6 20.8v-2.3H5.2V3.6h14.9v11.9ZM17.1 7v5.4h-2V7h2Zm-5.3 0v5.4h-2V7h2Z" /></svg>
      );
    case 'GitHub':
      return (
        <svg {...common}><path d="M12 2A10 10 0 0 0 8.84 21.5c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.26-.45-1.28.1-2.66 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.66.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" /></svg>
      );
    default:
      return null;
  }
};

function TopNav({ mobileOpen, setMobileOpen }) {
  return (
    <header className="site-nav">
      <div className="nav-inner">
        <a href="https://vatsim-arabian.com" className="nav-brand">
          <img src="/logo.png" alt="Arabian vACC" className="nav-logo" />
        </a>

        <nav className={`nav-links${mobileOpen ? ' nav-links-open' : ''}`}>
          {navGroups.map(group => (
            <div className="nav-group" key={group.label}>
              <span className="nav-group-label">
                {group.label}
                <span className="nav-caret" aria-hidden="true">▾</span>
              </span>
              <div className="nav-menu">
                {group.items.map(item => (
                  <a key={item.label} href={item.href} className="nav-menu-item">
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <a
          href="https://library.vatsim-arabian.com/getting_started/starting_atc_training/"
          className="nav-cta"
        >
          Join Now
        </a>

        <button
          className="nav-burger"
          aria-label="Toggle menu"
          onClick={() => setMobileOpen(open => !open)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <a href="https://vatsim-arabian.com">
          <img src="/logo.png" alt="Arabian vACC" className="footer-logo" />
        </a>
        <p className="footer-copy">© {new Date().getFullYear()} ARABIAN VACC • ALL RIGHTS RESERVED</p>
      </div>
      <nav className="footer-social">
        {socialLinks.map(link => (
          <a
            key={link.name}
            href={link.href}
            className="social-link"
            target="_blank"
            rel="noreferrer"
            aria-label={link.name}
          >
            <SocialIcon name={link.name} />
          </a>
        ))}
      </nav>
    </footer>
  );
}

const staff = [
  {
    cid: 964520,
    code: 'ACCARB1',
    title: 'vACC Director',
    name: 'Rohan Sturdy',
    email: 'rohan.sturdy@vatsim.me'
  },
  {
    cid: 1648952,
    code: 'ACCARB2',
    title: 'vACC Deputy Director',
    name: 'Abdulrahman Alamoodi',
    email: 'abdulrahman.alamoodi@vatsim.me'
  },
  {
    cid: 1787520,
    code: 'ACCARB5',
    title: 'Marketing Department Director',
    name: 'Ali Ismail',
    email: 'ali.ismail@vatsim.me'
  },
    {
    cid: 1699621,
    code: 'ARB51',
    title: 'Deputy Events and Marketing',
    name: 'Ibrahim Dave',
    email: 'ibrahim.dave@vatsim-arabian.com'
  },
  {
    cid: 1648952,
    code: 'ARBDPO',
    title: 'Data Protection Officer',
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
  { cid: '—', code: 'ACCARB3', title: 'ATC Training Director', name: 'Vacant - Open', email: 'N/A' },
  { cid: '—', code: 'ACCARB4', title: 'ATC Operations Department Director', name: 'Vacant - Open', email: 'N/A' },
  { cid: '—', code: 'ACCARB44', title: 'U.A.E FIR Director', name: 'Vacant - Open', email: 'N/A' },
  { cid: '—', code: 'ACCARB43', title: 'Muscat FIR Director', name: 'Vacant - Open', email: 'N/A' },
  { cid: '—', code: 'ACCARB6', title: 'Membership Department Director', name: 'Vacant - Open', email: 'N/A' },
  { cid: '—', code: 'ACCARB7', title: 'Technical Department Director', name: 'Vacant - Open', email: 'N/A' }
];

function App() {
  const partnerLogos = [
    { name: 'Qatar', file: 'qatar.png', url: 'https://mynextairline.com/airlines/oryx-virtual', size: 'wide' },
    { name: 'VABY', file: 'vaby.png', url: 'https://abyvirtual.com/', size: 'small' },
    { name: 'iniBuilds', file: 'inibuilds.png', url: 'https://inibuilds.com/' },
    { name: 'VATSIM', file: 'vatsim.png', url: 'https://vatsim.net/' },
    { name: 'Aeronav', file: 'aeronav.png', url: 'https://aero-nav.com/' }
  ];

  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [liveAtc, setLiveAtc] = useState([]);
  const [loadingLiveAtc, setLoadingLiveAtc] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isStaffPage =
    typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('staff');

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
            link: event.link,
            airports: event.airports?.map(a => a.icao).join(', ')
          }))
          .sort((a, b) => new Date(a.start) - new Date(b.start));
        setEvents(filtered);
      } catch (err) {
        if (err.name !== 'AbortError') console.error(err);
      } finally {
        setLoadingEvents(false);
      }
    };

    loadEvents();
    return () => controller.abort();
  }, []);

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
            frequency: ctrl.frequency,
            start: normalizeDate(ctrl.logon_time, null)
          }))
          .sort((a, b) => (b.start || 0) - (a.start || 0));
        setLiveAtc(filtered);
      } catch (err) {
        if (err.name !== 'AbortError') console.error(err);
      } finally {
        setLoadingLiveAtc(false);
      }
    };

    loadLiveAtc();
    return () => controller.abort();
  }, []);

  if (isStaffPage) {
    const visibleStaff = staff.filter(member => member.cid && member.email !== 'N/A');
    const order = ['ACCARB1', 'ACCARB2', 'ACCARB3', 'ACCARB31', 'ACCARB4', 'ACCARB44', 'ACCARB5', 'ACCARB6', 'ACCARB7', 'ARBDPO'];
    const orderedStaff = order
      .map(code => visibleStaff.find(member => member.code === code))
      .filter(Boolean);

    return (
      <div className="page">
        <TopNav mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        <main className="staff-page">
          <div className="staff-heading">
            <span className="eyebrow">The Team</span>
            <h1>Arabian vACC Leadership</h1>
            <p>Meet the team behind Arabian vACC.</p>
          </div>

          <div className="staff-table-wrapper">
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
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="page">
      <TopNav mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <section className="hero">
        <div className="hero-overlay" />
        <Motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <h2 className="hero-welcome">Welcome to the</h2>
          <h1 className="hero-title">Arabian vACC</h1>
          <p className="hero-sub">
            Explore the virtual skies of the U.A.E, Qatar and Oman with Arabian vACC on VATSIM.
            Experience realistic air traffic control and piloting with our community.
          </p>
          <div className="hero-actions">
            <a
              className="btn btn-primary"
              href="https://library.vatsim-arabian.com/getting_started/starting_atc_training/"
            >
              Join Now
            </a>
            <a className="btn btn-ghost" href="https://library.vatsim-arabian.com">
              Explore Library
            </a>
          </div>
        </Motion.div>
      </section>

      <section className="events" id="events">
        <div className="section-head">
          <span className="eyebrow">What&apos;s On</span>
          <h2 className="section-title">Upcoming Events</h2>
        </div>

        <div className="events-grid">
          {loadingEvents && (
            <>
              <div className="event-card skeleton-card" />
              <div className="event-card skeleton-card" />
              <div className="event-card skeleton-card" />
            </>
          )}

          {!loadingEvents && events.length === 0 && (
            <div className="event-card event-empty">
              <div className="event-body">
                <h3 className="event-name">No upcoming events</h3>
                <p className="event-date">Check back soon for the next flyin across the region.</p>
              </div>
            </div>
          )}

          {!loadingEvents && events.map((event, index) => (
            <Motion.article
              className="event-card"
              key={event.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
            >
              <div
                className="event-banner"
                style={{
                  backgroundImage: event.banner
                    ? `url(${event.banner})`
                    : 'linear-gradient(135deg, #0a1628 0%, #1a2942 100%)'
                }}
              />
              <div className="event-body">
                <div className="event-tags">
                  <span className="event-pill">Event</span>
                  {event.airports && <span className="event-airports">{event.airports}</span>}
                </div>
                <h3 className="event-name">{event.name}</h3>
                <p className="event-date">{formatEventRange(event.start, event.end)}</p>
                {event.link && (
                  <a className="event-info" href={event.link} target="_blank" rel="noreferrer">
                    View Info <span aria-hidden="true">→</span>
                  </a>
                )}
              </div>
            </Motion.article>
          ))}
        </div>
      </section>

      <section className="live-atc" id="live-atc">
        <div className="section-head">
          <span className="eyebrow">On Frequency</span>
          <h2 className="section-title">
            Live ATC
            <span className="live-dot" aria-hidden="true" />
          </h2>
        </div>

        <div className="atc-panel">
          {loadingLiveAtc && (
            <>
              <div className="atc-row skeleton-row" />
              <div className="atc-row skeleton-row" />
              <div className="atc-row skeleton-row" />
            </>
          )}

          {!loadingLiveAtc && liveAtc.length === 0 && (
            <div className="atc-row atc-empty">
              <span className="atc-callsign">No controllers online</span>
              <span className="atc-meta">Check back soon</span>
            </div>
          )}

          {!loadingLiveAtc && liveAtc.map(entry => (
            <div className="atc-row" key={entry.id}>
              <span className="atc-callsign">{entry.callsign}</span>
              <span className="atc-meta">
                {entry.frequency && <span className="atc-freq">{entry.frequency}</span>}
                <span className="atc-since">since {formatTime(entry.start)}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="partners">
        <div className="section-head">
          <span className="eyebrow">Working Together</span>
          <h2 className="section-title">Our Partners</h2>
        </div>
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
      </section>

      <SiteFooter />
    </div>
  );
}

export default App;
