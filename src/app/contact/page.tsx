import type { Metadata } from "next";
import "./contact.css";

export const metadata: Metadata = {
  title: "Contact · Sai Kireeti Kasula",
  description: "Location and contact details for Sai Kireeti Kasula.",
};

// Single source of truth — edit here to update the whole page.
const CONTACT = {
  location: "Hyderabad, Telangana, India",
  timezone: "IST · UTC+5:30",
  email: "kasulakireeti.40@gmail.com",
  phone: "+91 9573647789",
  phoneHref: "tel:+919573647789",
  linkedin: "https://www.linkedin.com/in/kasula-kireeti-7b1a10190/",
  github: "https://github.com/kirito875",
};

export default function ContactPage() {
  return (
    <section className="contact">
      <header className="contact__head">
        <p className="eyebrow">Get in touch</p>
        <h1>Contact &amp; location</h1>
        <p className="contact__lede">
          Based in {CONTACT.location}, and happy to work remotely. The quickest way to reach me is
          email — I usually reply within a day.
        </p>
      </header>

      <div className="contact__grid">
        <article className="card">
          <h2>Location</h2>
          <p className="contact__place">{CONTACT.location}</p>
          <ul className="contact__bullets">
            <li>{CONTACT.timezone}</li>
            <li>Open to remote and hybrid roles</li>
            <li>Comfortable collaborating across time zones</li>
          </ul>
        </article>

        <article className="card">
          <h2>Details</h2>
          <dl className="contact__list">
            <div className="contact__row">
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
              </dd>
            </div>
            <div className="contact__row">
              <dt>Phone</dt>
              <dd>
                <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>
              </dd>
            </div>
            <div className="contact__row">
              <dt>LinkedIn</dt>
              <dd>
                <a href={CONTACT.linkedin} target="_blank" rel="noreferrer">
                  kasula-kireeti
                </a>
              </dd>
            </div>
            <div className="contact__row">
              <dt>GitHub</dt>
              <dd>
                <a href={CONTACT.github} target="_blank" rel="noreferrer">
                  kirito875
                </a>
              </dd>
            </div>
          </dl>
        </article>
      </div>
    </section>
  );
}
