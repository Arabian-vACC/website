import { useEffect, useState } from 'react';
import { motion as Motion } from 'framer-motion';
import SectorMap from './SectorMap.jsx';
import { inView } from './mapGeo.js';
import './App.css';

const ARABIAN_PREFIXES = ['OM', 'OO'];
const positionPrefix = (cs) => String(cs || '').trim().slice(0, 2).toUpperCase();
const isArabianEvent = (ev) => {
  const signals = [ev.departure, ev.arrival, ...(ev.atcPositions || [])];
  return signals.some((s) => ARABIAN_PREFIXES.includes(positionPrefix(s)));
};
const absolutizeHqUrl = (u) => {
  if (!u) return null;
  if (/^https?:\/\//.test(u)) return u;
  return `https://hq.vatsim.me${u.startsWith('/') ? '' : '/'}${u}`;
};

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
      { label: 'Become a Controller', href: '/controllers/join' },
      { label: 'ATC Training', href: 'https://library.vatsim-arabian.com/getting_started/starting_atc_training/' },
      { label: 'Library', href: 'https://library.vatsim-arabian.com' }
    ]
  },
  {
    label: 'About',
    items: [
      { label: 'Roster', href: '/roster' },
      { label: 'Staff', href: '/staff' },
      { label: 'Home', href: 'https://vatsim-arabian.com' }
    ]
  }
];

const joinSteps = [
  {
    title: 'New to VATSIM?',
    body: 'When creating your VATSIM account, choose Europe, Middle East, and Africa (EMEA) as your region, and Middle East and North Africa (MENA) as your division when prompted.',
    cta: { label: 'Create VATSIM Account', href: 'https://my.vatsim.net/register' }
  },
  {
    title: 'Already a VATSIM Member in EMEA?',
    body: 'Open a support ticket in the VATMENA HQ Support Tickets system. Fill in the required information fields, submit the ticket, and await a reply with the next steps.',
    cta: { label: 'VATMENA HQ', href: 'https://hq.vatsim.me' }
  },
  {
    title: 'Need to Change Regions?',
    body: 'Log in to your myVATSIM account and locate the Member Help section in the left menu. Under Member Help, select Change Region and complete the form.',
    cta: { label: 'myVATSIM', href: 'https://my.vatsim.net/' }
  }
];

const inductionPlans = [
  {
    key: 'internal',
    tag: 'Within VATMENA',
    title: 'Internal Transfer',
    intro: 'For controllers transferring to Arabian vACC from another vACC within the VATMENA division.',
    url: '/controllers/transfer/internal'
  },
  {
    key: 'external',
    tag: 'From Another Division',
    title: 'External Transfer',
    intro: 'For controllers transferring to Arabian vACC from another VATSIM division.',
    url: '/controllers/transfer/external'
  }
];

const ROSTER_POSITIONS = ['DEL', 'GND', 'TWR', 'APP', 'CTR'];

const hasApproval = (c) => (Array.isArray(c.positions) && c.positions.length > 0) || !!soloLabel(c);

function soloLabel(c) {
  const s = c?.solo;
  if (!s) return null;
  if (Array.isArray(s)) return s.length ? `Solo · ${s.join(', ')}` : null;
  return 'Solo';
}

function RosterTable({ rows }) {
  const sorted = [...rows].sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''), 'en', { sensitivity: 'base' })
  );
  return (
    <table className="staff-table roster-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>CID</th>
          <th>Rating</th>
          <th>Endorsements</th>
        </tr>
      </thead>
      <tbody>
        {sorted.length === 0 ? (
          <tr><td colSpan={4} className="roster-empty">No controllers listed.</td></tr>
        ) : sorted.map(c => (
          <tr key={c.cid}>
            <td>{c.name || '—'}</td>
            <td>{c.cid}</td>
            <td>{c.rating || '—'}</td>
            <td>
              <div className="pos-badges">
                {ROSTER_POSITIONS.map(p => {
                  const approved = c.positions?.includes(p);
                  const solo = Array.isArray(c.solo) && c.solo.includes(p);
                  const cls = approved ? 'pos-badge pos-on' : solo ? 'pos-badge pos-solo' : 'pos-badge';
                  return (
                    <span key={p} className={cls} title={solo ? 'Solo endorsement' : undefined}>
                      {solo ? `${p} Solo` : p}
                    </span>
                  );
                })}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

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
          href="/controllers/join"
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

const staffGroups = [
  {
    department: 'vACC Leadership',
    members: [
      { code: 'ACCARB1', title: 'vACC Director', name: 'Rohan Sturdy', cid: 964520, email: 'rohan.sturdy@vatsim.me' },
      { code: 'ACCARB2', title: 'vACC Deputy Director', name: 'Vacant', cid: null, email: null }
    ]
  },
  {
    department: 'ATC Training',
    members: [
      { code: 'ACCARB3', title: 'ATC Training Director', name: 'Vacant', cid: null, email: null }
    ]
  },
  {
    department: 'Operations',
    members: [
      { code: 'ACCARB4', title: 'ATC Operations Department Director', name: 'Vacant', cid: null, email: null },
      { code: 'ACCARB44', title: 'U.A.E FIR Director', name: 'Vacant', cid: null, email: null },
      { code: 'ACCARB43', title: 'Muscat FIR Director', name: 'Vacant', cid: null, email: null }
    ]
  },
  {
    department: 'Membership',
    members: [
      { code: 'ACCARB6', title: 'Membership Department Director', name: 'Vacant', cid: null, email: null },
      { code: 'ARB61', title: 'Membership Deputy Director', name: 'Vacant', cid: null, email: null },
      { code: 'ARBMEM', title: 'Membership Team Member', name: 'Albarraa Abuelgasim', cid: 1754467, email: 'albarraa.abuelgasim@vatsim-arabian.com' },
      { code: 'ARBMEM', title: 'Membership Team Member', name: 'Christopher Maskine', cid: 1758854, email: 'christopher.maskine@vatsim-arabian.com' },
      { code: 'ARBMEM', title: 'Membership Team Member', name: 'Yahia Farag', cid: 1865447, email: 'yahia.farag@vatsim-arabian.com' }
    ]
  },
  {
    department: 'Events & Marketing',
    members: [
      { code: 'ACCARB5', title: 'Marketing Department Director', name: 'Ali Ismail', cid: 1787520, email: 'ali.ismail@vatsim.me' },
      { code: 'ARB51', title: 'Deputy Events and Marketing', name: 'Ibrahim Dave', cid: 1699621, email: 'ibrahim.dave@vatsim-arabian.com' },
      { code: 'ARBMRKT', title: 'Marketing Team Member', name: 'Omar Ahmed', cid: 2001015, email: 'ali.ismail@vatsin-arabian.com' }
    ]
  },
  {
    department: 'Technical',
    members: [
      { code: 'ACCARB7', title: 'Technical Department Director', name: 'Vacant', cid: null, email: null }
    ]
  }
];

function InternalTransferPlan() {
  return (
    <div className="transfer-detail" id="transfer-internal">
      <h3 className="transfer-detail-title">Internal Transfer — Controller Training Plan</h3>
      <p className="transfer-detail-lead">
        This document sets out the training pathway for controllers transferring to the Arabian vACC from another VATSIM
        division or subdivision. Its purpose is to ensure that every incoming controller is familiar with local
        procedures, Standard Operating Procedures (SOPs) and Letters of Agreement (LOAs) before providing air traffic
        services independently within Arabian vACC airspace.
      </p>
      <p className="transfer-detail-lead">
        Transferring controllers retain the rating they earned in their previous division. This plan is therefore not a
        re-rating programme — it is a structured familiarisation and validation process designed to bring experienced
        controllers up to speed with the Arabian environment as efficiently as possible.
      </p>

      <h4 className="transfer-step-head">Transfer Pathway at a Glance</h4>
      <ol className="transfer-list">
        <li>Open a support ticket on hq.vatsim.me requesting a transfer to Arabian vACC and agree to the Transfer Controller Policy.</li>
        <li>Receive your assigned aerodrome based on your controller rating.</li>
        <li>Complete a familiarisation theory session covering local SOPs and LOAs.</li>
        <li>Control 10–15 hours on your assigned position.</li>
        <li>Request a Transfer Checkout Session via a support ticket when ready.</li>
        <li>Pass the checkout to complete your transfer.</li>
      </ol>

      <h4 className="transfer-step-head">Step 1 — Transfer Request &amp; Policy Agreement</h4>
      <p>Open a support ticket through hq.vatsim.me stating that you wish to transfer to the Arabian vACC. Please include your CID, current rating and current division/subdivision in the ticket.</p>
      <p>Once your ticket has been received, the training team will send you the Arabian vACC Transfer Controller Policy. You must read and formally agree to this policy before your transfer training can begin. The policy sets out your obligations during the transfer period, including activity expectations and the conditions under which a transfer may be discontinued.</p>

      <h4 className="transfer-step-head">Step 2 — Position Assignment</h4>
      <p>Following acceptance of the policy, you will be assigned a training aerodrome appropriate to your controller rating. All familiarisation hours and your final checkout will take place at this aerodrome.</p>
      <div className="staff-table-wrapper">
        <table className="staff-table">
          <thead>
            <tr><th>Rating</th><th>Eligible Aerodromes</th><th>Checkout Position</th></tr>
          </thead>
          <tbody>
            <tr><td>S2</td><td>Abu Dhabi (OMAA), Muscat (OOMS) or Sharjah (OMSJ)</td><td>Tower (TWR) at the assigned aerodrome</td></tr>
            <tr><td>S3</td><td>Abu Dhabi (OMAA) or Muscat (OOMS)</td><td>Approach (APP) at the assigned aerodrome</td></tr>
            <tr><td>C1</td><td>Muscat (OOMS)</td><td>Muscat Control (Area / Enroute)</td></tr>
          </tbody>
        </table>
      </div>
      <p>Where more than one aerodrome is eligible for your rating, the training team will allocate one based on current staffing needs and mentor availability. You may state a preference in your ticket, and it will be accommodated where possible.</p>

      <h4 className="transfer-step-head">Step 3 — Familiarisation Theory Session</h4>
      <p>Before controlling, you will attend a familiarisation theory session with a member of the training team. This session covers the material you need in order to operate safely and in accordance with local procedures, including:</p>
      <ul className="transfer-list">
        <li>Standard Operating Procedures (SOPs) for your assigned aerodrome and position;</li>
        <li>Letters of Agreement (LOAs) with neighbouring sectors and adjacent vACCs;</li>
        <li>Local airspace structure, coordination requirements and handoff procedures;</li>
        <li>Any regional differences in phraseology or procedure you should be aware of.</li>
      </ul>
      <p>Come prepared: review the published SOPs and charts for your assigned aerodrome beforehand so the session can focus on questions and local nuances rather than first principles.</p>

      <h4 className="transfer-step-head">Step 4 — Consolidation: 10 to 15 Hours on Position</h4>
      <p>You will then control your assigned position for a minimum of 10 and up to 15 hours. This consolidation period is where you convert theory into practice: applying the SOPs and LOAs in live traffic, building familiarity with the local flow, and gaining genuine experience on the position.</p>
      <p>These hours are logged automatically through the network. During this period you are encouraged to stay in contact with the training team, ask questions, and request informal feedback — the goal is that by the end of your consolidation you feel fully at home on the position.</p>

      <h4 className="transfer-step-head">Step 5 — Requesting the Transfer Checkout</h4>
      <p>Once you have completed your consolidation hours and are confident that you will pass the Transfer Checkout Session, open a support ticket on hq.vatsim.me requesting a checkout on your allocated position. A mentor or examiner will then coordinate a date and time with you.</p>
      <p>Do not rush this step. The checkout is assessed to the same standard expected of home controllers, so it is in your interest to request it only when you are consistently comfortable on the position.</p>

      <h4 className="transfer-step-head">Step 6 — Checkout Outcome</h4>
      <p><strong>Pass</strong> — your transfer is complete. You become a full home controller of the Arabian vACC, with all the privileges of your rating, and you may work towards further positions and endorsements through the standard training system.</p>
      <p><strong>Fail</strong> — the transfer is unsuccessful and you will return to your previous division or subdivision. The examiner will provide a debrief explaining the outcome, and you may discuss with the training team whether a future transfer attempt is appropriate.</p>

      <h4 className="transfer-step-head">General Notes</h4>
      <ul className="transfer-list">
        <li>All training activity is coordinated through the support ticket system on hq.vatsim.me — please use it for all requests and correspondence.</li>
        <li>Timelines are flexible; this is a hobby and the training team will work around your availability. Equally, extended inactivity during a transfer may result in the process being closed under the Transfer Controller Policy.</li>
        <li>All VATSIM Global Ratings Policy and Transfer &amp; Visiting Controller Policy provisions apply in addition to this plan.</li>
        <li>Questions at any stage are welcome — contact the Arabian vACC training team via ticket or Discord.</li>
      </ul>
      <p className="transfer-signoff">Arabian vACC Training Department — we look forward to welcoming you to Arabian skies.</p>
    </div>
  );
}

function ExternalTransferPlan() {
  return (
    <div className="transfer-detail" id="transfer-external">
      <h3 className="transfer-detail-title">External Transfer — Controller Training Plan</h3>
      <p className="transfer-detail-lead">
        This training plan outlines the process for controllers transferring into the Arabian vACC from another VATSIM
        Region and/or Division. The objective is to ensure all incoming controllers are familiar with local procedures,
        Standard Operating Procedures (SOPs), and Letters of Agreement (LOAs) before operating independently within
        Arabian airspace.
      </p>
      <p className="transfer-detail-lead">
        Controllers keep the rating earned in their previous Region or Division. As such, this programme is not intended
        as a rating course, but rather a structured familiarisation and validation pathway designed to integrate
        experienced controllers into the Arabian environment efficiently and safely.
      </p>
      <p className="transfer-note">
        Throughout the entire transfer period, controllers are not permitted to participate in events. Event
        participation is only available once the transfer has been completed successfully.
      </p>

      <h4 className="transfer-step-head">Transfer Pathway Overview</h4>
      <ol className="transfer-list">
        <li>Submit a support ticket through hq.vatsim.me requesting a transfer to Arabian vACC and accept the Transfer Controller Policy.</li>
        <li>Receive an aerodrome assignment based on your current rating.</li>
        <li>Attend a familiarisation session covering local procedures and agreements.</li>
        <li>Complete a competency check session. On passing, you are granted unrestricted approvals on the assigned position.</li>
        <li>Complete 10 hours on the assigned position.</li>
        <li>Update your support ticket requesting a Transfer Checkout once the hours are complete.</li>
        <li>Successfully complete the checkout to finalise the transfer.</li>
      </ol>

      <h4 className="transfer-step-head">Step 1 — Transfer Request and Policy Acceptance</h4>
      <p>Create a support ticket through hq.vatsim.me stating your intention to transfer to Arabian vACC. Include your CID, current rating, and existing Region and Division.</p>
      <p>Following receipt of the request, the training team will provide the Arabian vACC Transfer Controller Policy. This document must be reviewed and accepted before training can commence. It details activity expectations, responsibilities, the restriction on event participation during the transfer period, and circumstances that may result in the transfer process being discontinued.</p>

      <h4 className="transfer-step-head">Step 2 — Position Assignment</h4>
      <p>Once the policy has been accepted, an aerodrome appropriate to your rating will be assigned. All familiarisation, the competency check, consolidation hours, and the final checkout will take place at this location.</p>
      <div className="staff-table-wrapper">
        <table className="staff-table">
          <thead>
            <tr><th>Rating</th><th>Eligible Aerodromes</th><th>Position</th></tr>
          </thead>
          <tbody>
            <tr><td>S1</td><td>Abu Dhabi (OMAA), Muscat (OOMS) or Sharjah (OMSJ)</td><td>Ground (GND)</td></tr>
            <tr><td>S2</td><td>Abu Dhabi (OMAA), Muscat (OOMS) or Sharjah (OMSJ)</td><td>Tower (TWR)</td></tr>
            <tr><td>S3</td><td>Abu Dhabi (OMAA) or Muscat (OOMS)</td><td>Approach (APP)</td></tr>
            <tr><td>C1</td><td>Muscat (OOMS)</td><td>Area Control</td></tr>
          </tbody>
        </table>
      </div>
      <p>Where multiple aerodromes are available, allocation will be based on operational requirements and mentor availability. Preferences may be indicated and will be considered where practical.</p>

      <h4 className="transfer-step-head">Step 3 — Familiarisation Session</h4>
      <p>Before controlling, you will attend a theory session led by a member of the training team. Topics include:</p>
      <ul className="transfer-list">
        <li>Local SOPs relevant to the assigned position.</li>
        <li>Applicable LOAs with neighbouring sectors and vACCs.</li>
        <li>Airspace structure, coordination practices, and handoff procedures.</li>
        <li>Regional procedural or phraseology differences.</li>
      </ul>
      <p>Controllers are encouraged to review charts and published procedures before the session to maximise its effectiveness.</p>
      <p>Controllers who are confident in the local procedures may elect to self-study the published SOPs and LOAs and proceed directly to the competency check, rather than attending a guided familiarisation session. This should be requested through the support ticket.</p>

      <h4 className="transfer-step-head">Step 4 — Competency Check Session</h4>
      <p>A mentor or examiner will conduct a competency check to confirm that you can safely operate the assigned position to the required standard. This assesses your understanding of local SOPs, LOAs, coordination, and phraseology in a live or simulated environment.</p>
      <p><strong>Pass:</strong> you are granted unrestricted approvals on the assigned position and may begin the consolidation period.</p>
      <p><strong>Fail:</strong> feedback will be provided and a further competency check may be arranged once you have addressed the areas identified. You may not operate the position unrestricted until the competency check is passed.</p>

      <h4 className="transfer-step-head">Step 5 — Consolidation Period (10 hours)</h4>
      <p>Following a successful competency check, controllers must complete 10 hours on the assigned position. This period is intended to reinforce knowledge through practical application in live traffic conditions.</p>
      <p>Hours are recorded automatically through the network. Throughout this stage, controllers are encouraged to seek guidance, ask questions, and obtain feedback from the training team.</p>

      <h4 className="transfer-step-head">Step 6 — Requesting a Checkout</h4>
      <p>Once the 10 hours have been completed, update your existing support ticket to request a Transfer Checkout Session. A mentor or examiner will coordinate a suitable date and time. Controllers should only request a checkout when consistently comfortable operating the position independently.</p>

      <h4 className="transfer-step-head">Step 7 — Checkout Result</h4>
      <p><strong>Pass:</strong> the transfer is completed successfully. You become a home controller within Arabian vACC, are cleared to participate in events, and may continue progressing through the standard training framework.</p>
      <p><strong>Fail:</strong> the transfer request is unsuccessful and the controller returns to their previous Region and/or Division. Feedback will be provided and future transfer opportunities may be discussed with the training team.</p>

      <h4 className="transfer-step-head">Additional Information</h4>
      <ul className="transfer-list">
        <li>Participation in events is not permitted at any stage of the transfer period.</li>
        <li>All transfer-related communication must be conducted through the support ticket system.</li>
        <li>Training timelines remain flexible and will be arranged around controller availability.</li>
        <li>Extended inactivity may result in closure of the transfer process in accordance with the Transfer Controller Policy.</li>
        <li>Relevant provisions of the VATSIM Global Ratings Policy and Transfer &amp; Visiting Controller Policy remain applicable.</li>
        <li>Questions may be directed to the Arabian vACC Training Team through tickets or Discord.</li>
      </ul>
      <p className="transfer-signoff">Arabian vACC Training Department — we look forward to welcoming you to Arabian vACC.</p>
    </div>
  );
}

const FACILITY_ORDER = ['DEL', 'GND', 'TWR', 'APP', 'CTR'];

function fmtHours(h) {
  const n = Number(h) || 0;
  return n >= 100 ? String(Math.round(n)) : n.toFixed(1);
}

function formatMonthLabel(month) {
  if (!month) return '';
  const m = String(month);
  const ym = m.match(/^(\d{4})-(\d{2})$/);
  if (ym) {
    const d = new Date(Date.UTC(Number(ym[1]), Number(ym[2]) - 1, 1));
    return d.toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }
  return m;
}

function StatsStrip({ stats, loading }) {
  if (loading) {
    return (
      <section className="stats-strip" aria-hidden="true">
        <div className="stats-strip-inner">
          <div className="stats-strip-lead">
            <span className="stats-strip-skel stats-strip-skel-lead" />
          </div>
          <div className="stats-chips">
            {FACILITY_ORDER.map(f => <span key={f} className="stats-strip-skel stat-chip-skel" />)}
            <span className="stats-strip-skel stat-chip-skel" />
          </div>
        </div>
      </section>
    );
  }

  if (!stats || !stats.month) return null;

  const byName = {};
  for (const f of stats.facilities || []) byName[String(f.name).toUpperCase()] = f.hours;

  return (
    <section className="stats-strip" aria-label="Monthly controlling hours">
      <div className="stats-strip-inner">
        <div className="stats-strip-lead">
          <span className="stats-strip-eyebrow">Monthly Activity</span>
          <span className="stats-strip-month">{formatMonthLabel(stats.month)}</span>
        </div>
        <div className="stats-chips">
          {FACILITY_ORDER.map(f => (
            <div className="stat-chip" key={f}>
              <span className="stat-chip-label">{f}</span>
              <span className="stat-chip-value">{fmtHours(byName[f])}<i>h</i></span>
            </div>
          ))}
          <div className="stat-chip stat-chip-total">
            <span className="stat-chip-label">Total</span>
            <span className="stat-chip-value">{fmtHours(stats.totalHours)}<i>h</i></span>
          </div>
          {stats.rank && stats.totalVaccs ? (
            <div className="stat-chip stat-chip-rank">
              <span className="stat-chip-label">MENA Rank</span>
              <span className="stat-chip-value">#{stats.rank}<i>/{stats.totalVaccs}</i></span>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

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
  const [aircraft, setAircraft] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openPlan, setOpenPlan] = useState(null);

  const [roster, setRoster] = useState(null);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [rosterError, setRosterError] = useState('');

  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const isStaffPage =
    typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('staff');
  const isRosterPage =
    typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('roster');
  const isJoinPage =
    typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('join');
  const isTransferInternalPage =
    typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('transfer/internal');
  const isTransferExternalPage =
    typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('transfer/external');

  useEffect(() => {
    const controller = new AbortController();
    const loadEvents = async () => {
      try {
        const res = await fetch('/api/events', { signal: controller.signal });
        if (!res.ok) throw new Error(`Events request failed (${res.status})`);
        const payload = await res.json();
        const list = Array.isArray(payload.events) ? payload.events : [];
        const filtered = list
          .filter(isArabianEvent)
          .map(event => ({
            id: event.id,
            name: event.title,
            start: event.startIso || null,
            end: event.endIso || null,
            banner: absolutizeHqUrl(event.imageUrl),
            positions: Array.isArray(event.atcPositions) ? event.atcPositions : [],
            airports: [event.departure, event.arrival].filter(Boolean).join(' → ')
          }))
          .sort((a, b) => new Date(a.start || 0) - new Date(b.start || 0));
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
    const loadStats = async () => {
      try {
        const res = await fetch('/api/stats', { signal: controller.signal });
        if (!res.ok) throw new Error(`Stats request failed (${res.status})`);
        setStats(await res.json());
      } catch (err) {
        if (err.name !== 'AbortError') console.error(err);
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
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
        const callsignMatcher = /^(OM|OO)[A-Z0-9]{2,}_/;
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

        const pilots = payload.pilots || [];
        const inRange = pilots
          .filter(p => typeof p.latitude === 'number' && typeof p.longitude === 'number')
          .filter(p => inView(p.latitude, p.longitude))
          .map(p => ({
            callsign: p.callsign,
            lat: p.latitude,
            lon: p.longitude,
            alt: p.altitude,
            gs: p.groundspeed,
            hdg: p.heading
          }));
        setAircraft(inRange);
      } catch (err) {
        if (err.name !== 'AbortError') console.error(err);
      } finally {
        setLoadingLiveAtc(false);
      }
    };

    loadLiveAtc();
    const interval = setInterval(loadLiveAtc, 60000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!isRosterPage) return;
    const controller = new AbortController();
    const loadRoster = async () => {
      try {
        const res = await fetch('/api/roster', { signal: controller.signal });
        if (!res.ok) throw new Error(`Roster request failed (${res.status})`);
        setRoster(await res.json());
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error(err);
          setRosterError('The roster is temporarily unavailable. Please try again shortly.');
        }
      } finally {
        setLoadingRoster(false);
      }
    };

    loadRoster();
    return () => controller.abort();
  }, [isRosterPage]);

  if (isRosterPage) {
    return (
      <div className="page">
        <TopNav mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        <main className="staff-page">
          <div className="staff-heading">
            <span className="eyebrow">Controllers</span>
            <h1>Arabian vACC Roster</h1>
            <p>Our live controller roster and position endorsements, synced from VATMENA HQ.</p>
          </div>

          <div className="staff-table-wrapper">
            {loadingRoster ? (
              <p className="roster-status">Loading roster…</p>
            ) : rosterError ? (
              <p className="roster-status">{rosterError}</p>
            ) : (
              <>
                <RosterTable rows={(roster?.home || []).filter(hasApproval)} />
                <h2 className="vacancies-heading">Visiting Controllers</h2>
                <RosterTable rows={(roster?.visiting || []).filter(hasApproval)} />
              </>
            )}
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (isStaffPage) {
    return (
      <div className="page">
        <TopNav mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        <main className="staff-page team-page">
          <div className="staff-heading team-heading">
            <span className="eyebrow">The Team</span>
            <h1>Team</h1>
            <p>The staff running Arabian vACC.</p>
          </div>

          <div className="team-list">
            {staffGroups.map(group => (
              <div className="team-group" key={group.department}>
                <h2 className="team-department">{group.department}</h2>
                <div className="team-rows">
                  {group.members.map(member => (
                    <div className={`team-row${member.name === 'Vacant' ? ' team-row-vacant' : ''}`} key={`${member.code}-${member.cid ?? member.name}`}>
                      <div className="team-person">
                        <div className="team-code">{member.code}</div>
                        <div className="team-name">{member.name}</div>
                        <div className="team-title">{member.title}</div>
                      </div>
                      <div className="team-contact">
                        {member.cid && <span className="team-cid">CID {member.cid}</span>}
                        {member.email && (
                          <a className="btn btn-primary team-email" href={`mailto:${member.email}`}>Email</a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (isTransferInternalPage || isTransferExternalPage) {
    return (
      <div className="page">
        <TopNav mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        <main className="staff-page transfer-page">
          <div className="staff-heading">
            <span className="eyebrow">Transfers</span>
            <h1>Transferring to Arabian vACC</h1>
          </div>
          {isTransferInternalPage ? <InternalTransferPlan /> : <ExternalTransferPlan />}
          <p className="transfer-back"><a href="/controllers/join">← Back to Become a Controller</a></p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (isJoinPage) {
    return (
      <div className="page">
        <TopNav mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        <main className="staff-page join-page">
          <div className="staff-heading">
            <span className="eyebrow">Controllers</span>
            <h1>Become a Controller</h1>
            <p>Join the Arabian vACC and control the virtual skies of the U.A.E and Oman on VATSIM.</p>
          </div>

          <section className="join-section">
            <div className="section-head">
              <span className="eyebrow">Getting Started</span>
              <h2 className="section-title">How to Join</h2>
            </div>
            <div className="join-grid">
              {joinSteps.map(step => (
                <div className="join-card" key={step.title}>
                  <h3 className="join-card-title">{step.title}</h3>
                  <p className="join-card-body">{step.body}</p>
                  <a className="btn btn-primary join-card-cta" href={step.cta.href} target="_blank" rel="noreferrer">
                    {step.cta.label}
                  </a>
                </div>
              ))}
            </div>
          </section>

          <section className="join-section">
            <div className="section-head">
              <span className="eyebrow">Transfers</span>
              <h2 className="section-title">Transferring to Arabian vACC</h2>
            </div>
            <div className="induction-grid">
              {inductionPlans.map(plan => (
                <div className={`induction-card${openPlan === plan.key ? ' induction-card-active' : ''}`} key={plan.key}>
                  <span className="induction-tag">{plan.tag}</span>
                  <h3 className="induction-title">{plan.title}</h3>
                  <p className="induction-intro">{plan.intro}</p>
                  <div className="induction-body">
                    <div className="induction-actions">
                      <button
                        type="button"
                        className="btn btn-primary induction-toggle"
                        onClick={() => setOpenPlan(openPlan === plan.key ? null : plan.key)}
                      >
                        {openPlan === plan.key ? 'Hide Plan' : 'Read Full Plan'}
                      </button>
                      <a className="btn btn-ghost" href={plan.url} target="_blank" rel="noreferrer">
                        Open in New Window
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {openPlan === 'internal' && <InternalTransferPlan />}
            {openPlan === 'external' && <ExternalTransferPlan />}
          </section>

          <section className="join-section">
            <div className="section-head">
              <span className="eyebrow">Visiting</span>
              <h2 className="section-title">Visiting Controllers</h2>
            </div>
            <div className="join-card join-card-wide">
              <h3 className="join-card-title">Want to Control in Arabian as a Visitor?</h3>
              <p className="join-card-body">
                Visiting applications are managed centrally by VATMENA HQ. To apply:
              </p>
              <ol className="join-steps-list">
                <li>Go to <a href="https://hq.vatsim.me" target="_blank" rel="noreferrer">hq.vatsim.me</a> and log in</li>
                <li>Open Sub Division &rarr; ATC</li>
                <li>Select Apply for Visiting</li>
                <li>Choose Arabian vACC</li>
                <li>Join the Arabian Discord server through <a href="https://community.vatsim.net/" target="_blank" rel="noreferrer">community.vatsim.net</a></li>
              </ol>
              <p className="join-card-body">
                Eligibility: S3 or above from any VATSIM division, or S2 and above if you are already a VATMENA member.
                You must hold an active rating on your home network.
              </p>
              <a className="btn btn-primary join-card-cta" href="https://hq.vatsim.me" target="_blank" rel="noreferrer">
                VATMENA HQ
              </a>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="page">
      <TopNav mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <StatsStrip stats={stats} loading={loadingStats} />

      <section className="hero">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-inner">
          <Motion.div
            className="hero-content"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <span className="hero-eyebrow">VATSIM · Middle East &amp; North Africa</span>
            <h2 className="hero-welcome">Welcome to the</h2>
            <h1 className="hero-title">Arabian vACC</h1>
            <p className="hero-sub">
              Explore the virtual skies of the U.A.E and Oman with Arabian vACC on VATSIM.
              Experience realistic air traffic control and piloting with our community.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="/controllers/join">
                Join Now
              </a>
              <a className="btn btn-ghost" href="https://library.vatsim-arabian.com">
                Explore Library
              </a>
            </div>
            <div className="hero-stats">
              <span className="stat-live">
                <span className="stat-live-dot" aria-hidden="true" />
                LIVE
              </span>
              <div className="stat">
                <strong>{aircraft.length}</strong>
                <span>{aircraft.length === 1 ? 'aircraft in FIR' : 'aircraft in FIR'}</span>
              </div>
              <div className="stat-divider" aria-hidden="true" />
              <div className="stat">
                <strong>{liveAtc.length}</strong>
                <span>{liveAtc.length === 1 ? 'position online' : 'positions online'}</span>
              </div>
            </div>
          </Motion.div>

          <Motion.div
            className="hero-radar"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, ease: 'easeOut', delay: 0.15 }}
          >
            <SectorMap aircraft={aircraft} />
            <div className="radar-caption">EMIRATES FIR · OMAE · LIVE TRAFFIC</div>
          </Motion.div>
        </div>
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
                {event.positions.length > 0 && (
                  <div className="event-positions">
                    <div className="event-positions-head">
                      <span className="event-positions-label">ATC Positions</span>
                      <span className="event-positions-count">
                        {event.positions.length} {event.positions.length === 1 ? 'position' : 'positions'}
                      </span>
                    </div>
                    <div className="event-positions-list">
                      {event.positions.map(p => (
                        <span key={p} className="event-pos">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
                <a className="event-book" href="https://hq.vatsim.me" target="_blank" rel="noreferrer">
                  Book ATC <span aria-hidden="true">→</span>
                </a>
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

      <section className="feedback" id="feedback">
        <div className="section-head">
          <span className="eyebrow">Tell Us How We Did</span>
          <h2 className="section-title">Submit Feedback</h2>
        </div>
        <form
          className="feedback-form"
          action="https://submit-form.com/vrpmQTfEn"
          method="POST"
        >
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="cid">Your CID</label>
              <input type="text" id="cid" name="cid" placeholder="Enter your VATSIM CID" required />
            </div>
            <div className="form-group">
              <label htmlFor="position">Controller Position</label>
              <input type="text" id="position" name="position" placeholder="e.g., OMDB_APP" required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="feedbackType">Feedback Type</label>
              <select id="feedbackType" name="feedbackType" required defaultValue="">
                <option value="" disabled>Select type</option>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="controllerName">Controller Name</label>
              <input type="text" id="controllerName" name="controllerName" placeholder="e.g., John Doe" required />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="feedback">Feedback</label>
            <textarea id="feedback" name="feedback" rows="5" placeholder="Great controller!" required></textarea>
          </div>
          <input type="hidden" name="_redirect" value="https://vatsim-arabian.com" />
          <button type="submit" className="feedback-submit">Send Feedback</button>
        </form>
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
